import performance from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { rawPreviewExtractor } from './extractors/rawPreviewExtractor';

export interface BenchmarkMetrics {
  totalFilesTested: number;
  successfulExtractions: number;
  failedExtractions: number;
  extractionTimeMedianMs: number;
  extractionTimeP95Ms: number;
  extractionTimeP99Ms: number;
  averageJpegSizeMb: number;
}

export async function runRawEngineBenchmark(targetFolder: string): Promise<BenchmarkMetrics | null> {
  try {
    if (!fs.existsSync(targetFolder)) return null;

    const files = fs.readdirSync(targetFolder);
    const rawFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.cr3', '.nef', '.arw', '.raf', '.cr2', '.dng', '.orf', '.rw2'].includes(ext);
    }).map((f) => path.join(targetFolder, f));

    if (rawFiles.length === 0) return null;

    const timings: number[] = [];
    let successes = 0;
    let failures = 0;
    let totalSize = 0;

    for (const file of rawFiles) {
      const start = performance.performance.now();
      const res = await rawPreviewExtractor.extractEmbeddedPreview(file);
      const elapsed = performance.performance.now() - start;

      if (res && res.buffer && res.buffer.length > 10000) {
        successes++;
        timings.push(elapsed);
        totalSize += res.buffer.length;
      } else {
        failures++;
      }
    }

    if (timings.length === 0) return null;

    timings.sort((a, b) => a - b);
    const median = timings[Math.floor(timings.length * 0.5)];
    const p95 = timings[Math.floor(timings.length * 0.95)];
    const p99 = timings[Math.floor(timings.length * 0.99)];

    const avgSizeMb = totalSize / successes / (1024 * 1024);

    const metrics: BenchmarkMetrics = {
      totalFilesTested: rawFiles.length,
      successfulExtractions: successes,
      failedExtractions: failures,
      extractionTimeMedianMs: parseFloat(median.toFixed(2)),
      extractionTimeP95Ms: parseFloat(p95.toFixed(2)),
      extractionTimeP99Ms: parseFloat(p99.toFixed(2)),
      averageJpegSizeMb: parseFloat(avgSizeMb.toFixed(2)),
    };

    console.log('[BENCHMARK RESULT]', metrics);
    return metrics;
  } catch {
    return null;
  }
}
