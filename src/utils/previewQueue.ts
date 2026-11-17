export type PreviewResult = {
  url: string;
  orientation?: number;
  metadata?: any;
};

type QueueItem = {
  filePath: string;
  resolves: ((res: PreviewResult) => void)[];
  rejects: ((err: any) => void)[];
  addedAt: number;
};

// ⚡ Concurrency tối ưu (8 luồng song song - tránh nghẽn I/O ổ cứng rời và bão hòa CPU)
const MAX_CONCURRENT = 8;
// LRU cache 1200 ảnh — khi digiKam DB trả về <0.01ms mỗi ảnh, có thể cache nhiều hơn
const MAX_CACHE_SIZE = 1200;

class PreviewQueue {
  private queue: QueueItem[] = [];
  private activeCount = 0;
  private cache = new Map<string, PreviewResult>();

  public load(filePath: string, isPriority = true): Promise<PreviewResult> {
    // 🚀 Cache hit: LRU update + trả về tức thì (0ms)
    if (this.cache.has(filePath)) {
      const val = this.cache.get(filePath)!;
      this.cache.delete(filePath);
      this.cache.set(filePath, val);
      return Promise.resolve(val);
    }

    return new Promise((resolve, reject) => {
      // Gộp các request trùng lặp
      const existing = this.queue.find((q) => q.filePath === filePath);
      if (existing) {
        existing.resolves.push(resolve);
        existing.rejects.push(reject);
        if (isPriority) {
          const idx = this.queue.indexOf(existing);
          if (idx > 0) {
            this.queue.splice(idx, 1);
            this.queue.unshift(existing);
          }
        }
      } else {
        const item: QueueItem = {
          filePath,
          resolves: [resolve],
          rejects: [reject],
          addedAt: Date.now()
        };
        if (isPriority) {
          this.queue.unshift(item);
        } else {
          this.queue.push(item);
        }
      }
      // Kick off multiple parallel workers immediately
      this.drainQueue();
    });
  }

  public preloadAll(filePaths: string[]) {
    // Preload in batches — không block main thread
    const uncached = filePaths.filter(fp => !this.cache.has(fp));
    uncached.forEach((fp) => {
      this.load(fp, false).catch(() => {});
    });
  }

  /** Khởi động TẤT CẢ worker slots song song ngay lập tức */
  private drainQueue() {
    while (this.activeCount < MAX_CONCURRENT && this.queue.length > 0) {
      this.processNext();
    }
  }

  private async processNext() {
    if (this.queue.length === 0) return;
    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;

    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.getPhotoPreview(item.filePath);
        const url = res?.dataUrl || '';
        const orientation = res?.metadata?.orientation || 1;
        const result: PreviewResult = { url, orientation, metadata: res?.metadata };

        if (url) {
          // LRU eviction
          if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
          }
          this.cache.set(item.filePath, result);
        }
        item.resolves.forEach((r) => r(result));
      } else {
        item.resolves.forEach((r) => r({ url: '', orientation: 1 }));
      }
    } catch (err) {
      item.resolves.forEach((r) => r({ url: '', orientation: 1 }));
    } finally {
      this.activeCount--;
      // Kick off next items
      this.drainQueue();
    }
  }

  public clearQueueOnly() { this.queue = []; }
  public clear() { this.queue = []; }
  public hardClearCache() {
    this.queue = [];
    this.cache.clear();
  }

  public getCacheSize() { return this.cache.size; }
  public getQueueLength() { return this.queue.length; }
  public getActiveCount() { return this.activeCount; }
}

export const previewQueue = new PreviewQueue();
