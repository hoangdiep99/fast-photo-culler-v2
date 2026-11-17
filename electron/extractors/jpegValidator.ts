import fs from 'fs';

export interface ValidatedJpegInfo {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  offset?: number;
  orientation?: number;
}

/**
 * Kiểm tra xem buffer có phải là JPEG hợp lệ với SOI marker (0xFF 0xD8)
 */
export function isValidJpegHeader(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return buffer[0] === 0xff && buffer[1] === 0xd8;
}

/**
 * Kiểm tra xem buffer có kết thúc bằng EOI marker (0xFF 0xD9) không
 */
export function isValidJpegFooter(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  const len = buffer.length;
  return buffer[len - 2] === 0xff && buffer[len - 1] === 0xd9;
}

/**
 * Đọc kích thước chiều rộng/cao (Width/Height) từ JPEG SOF0/SOF2 marker
 */
export function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (!isValidJpegHeader(buffer)) return null;

    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];
      // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }

      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  } catch {}
  return null;
}

/**
 * Validate toàn diện một buffer JPEG
 */
export function validateJpegBuffer(
  buffer: Buffer,
  minSize = 10000
): ValidatedJpegInfo | null {
  if (!buffer || buffer.length < minSize) return null;
  if (!isValidJpegHeader(buffer)) return null;

  const dims = getJpegDimensions(buffer);
  const width = dims?.width || 3840;
  const height = dims?.height || 2560;

  return {
    buffer,
    width,
    height,
    size: buffer.length,
  };
}
