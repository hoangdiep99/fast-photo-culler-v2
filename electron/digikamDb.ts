import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ──────────────────────────────────────────────────────────────────────────────
// sql.js: Pure-JavaScript SQLite — zero native bindings, works in ANY Electron!
// ──────────────────────────────────────────────────────────────────────────────
let SqlJs: any = null;
try {
  SqlJs = require('sql.js');
} catch {}

export interface DigikamImageRecord {
  id: number;
  albumId: number;
  filename: string;
  rating: number;
  orientation?: number;
  width?: number;
  height?: number;
}

export class DigikamDbManager {
  private db: any = null;            // digikam4.db
  private thumbDb: any = null;       // thumbnails-digikam.db
  private dbPath: string = '';
  private thumbDbPath: string = '';

  // In-memory thumbnail path → {data, orientation} cache
  private thumbCache = new Map<string, { data: Buffer; orientation: number } | null>();

  constructor(customPath?: string) {
    this.initAsync(customPath);
  }

  /** Load both databases asynchronously so startup never blocks the main thread */
  public async initAsync(customPath?: string): Promise<boolean> {
    try {
      if (!SqlJs) {
        console.warn('[digiKam] sql.js not available — running without DB');
        return false;
      }

      // sql.js needs a locateFile callback to find the WASM binary
      const sqlJsDir = path.dirname(require.resolve('sql.js'));
      const sqlJsWasm = path.join(sqlJsDir, 'sql-wasm.wasm');
      const SQL = await SqlJs({
        locateFile: () => sqlJsWasm
      });

      const userHome = os.homedir();
      const targetPath = customPath || path.join(userHome, 'Pictures', 'digikam4.db');
      if (fs.existsSync(targetPath)) {
        const fileBuffer = fs.readFileSync(targetPath);
        this.db = new SQL.Database(fileBuffer);
        this.dbPath = targetPath;
        console.log(`[digiKam] ✅ Main DB connected: ${targetPath}`);
      }

      const thumbPath = path.join(userHome, 'Pictures', 'thumbnails-digikam.db');
      if (fs.existsSync(thumbPath)) {
        const thumbBuffer = fs.readFileSync(thumbPath);
        this.thumbDb = new SQL.Database(thumbBuffer);
        this.thumbDbPath = thumbPath;
        console.log(`[digiKam] ✅ Thumbnail DB connected: ${thumbPath} (${(thumbBuffer.length / 1024 / 1024).toFixed(1)} MB, all thumbnails in RAM!)`);
      }

      return !!(this.db || this.thumbDb);
    } catch (err) {
      console.error('[digiKam] Init error:', err);
      return false;
    }
  }

  public isConnected(): boolean { return !!(this.db || this.thumbDb); }
  public getDbPath(): string { return this.dbPath; }

  /**
   * ⚡⚡⚡ SIÊU NHANH: Đọc thumbnail từ digiKam DB trong RAM
   * - 0ms I/O (toàn bộ DB đã nạp vào RAM khi khởi động)
   * - 0% CPU (không giải mã RAW, không chạy Sharp)
   * - digiKam đã render sẵn tất cả ảnh trong thư viện
   */
  public getThumbnailByFilePath(filePath: string): { data: Buffer; orientation: number } | null {
    if (!this.thumbDb) return null;

    // Kiểm tra cache RAM trước (< 0.001ms)
    const normalizedPath = filePath.replace(/\\/g, '/');
    const winPath = filePath.replace(/\//g, '\\');
    const cacheKey = normalizedPath;

    if (this.thumbCache.has(cacheKey)) {
      return this.thumbCache.get(cacheKey) ?? null;
    }

    try {
      const stmt = this.thumbDb.prepare(`
        SELECT t.data, t.orientationHint
        FROM FilePaths fp
        JOIN Thumbnails t ON fp.thumbId = t.id
        WHERE fp.path = ? OR fp.path = ?
        LIMIT 1
      `);
      stmt.bind([normalizedPath, winPath]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        if (row && row.data) {
          const buf = Buffer.isBuffer(row.data)
            ? row.data as Buffer
            : Buffer.from(row.data as Uint8Array);

          if (buf.length > 500) {
            const result = { data: buf, orientation: (row.orientationHint as number) || 1 };
            this.thumbCache.set(cacheKey, result);
            return result;
          }
        }
      } else {
        stmt.free();
      }
    } catch {}

    this.thumbCache.set(cacheKey, null);
    return null;
  }

  public getImageRecordByFilename(filename: string): DigikamImageRecord | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(`
        SELECT i.id, i.album as albumId, i.name as filename,
               ii.rating, ii.orientation, ii.width, ii.height
        FROM Images i
        LEFT JOIN ImageInformation ii ON i.id = ii.imageid
        WHERE i.name = ?
        LIMIT 1
      `);
      stmt.bind([filename]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return {
          id: row.id as number,
          albumId: row.albumId as number,
          filename: row.filename as string,
          rating: (row.rating as number) || 0,
          orientation: (row.orientation as number) || 1,
          width: (row.width as number) || 0,
          height: (row.height as number) || 0
        };
      }
      stmt.free();
    } catch (err) {
      console.error(`[digiKam] Error fetching record for ${filename}:`, err);
    }
    return null;
  }

  public setRating(filename: string, rating: number): boolean {
    if (!this.db) return false;
    try {
      const record = this.getImageRecordByFilename(filename);
      if (!record) return false;
      this.db.run('UPDATE ImageInformation SET rating = ? WHERE imageid = ?', [rating, record.id]);
      console.log(`[digiKam] Updated rating=${rating} for ${filename}`);
      return true;
    } catch (err) {
      console.error(`[digiKam] Error updating rating for ${filename}:`, err);
      return false;
    }
  }

  public getRatedImages(): DigikamImageRecord[] {
    if (!this.db) return [];
    try {
      const results = this.db.exec(`
        SELECT i.id, i.album as albumId, i.name as filename, ii.rating
        FROM Images i
        JOIN ImageInformation ii ON i.id = ii.imageid
        WHERE ii.rating > 0
      `);
      if (!results.length) return [];
      const { columns, values } = results[0];
      return values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, idx: number) => { obj[col] = row[idx]; });
        return { id: obj.id, albumId: obj.albumId, filename: obj.filename, rating: obj.rating };
      });
    } catch (err) {
      console.error('[digiKam] Error fetching rated images:', err);
      return [];
    }
  }
}

export const digikamDbManager = new DigikamDbManager();
