import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let readPsd: any;
let initializeCanvas: any;
try {
  const agPsd = require('ag-psd');
  readPsd = agPsd.readPsd;
  initializeCanvas = agPsd.initializeCanvas;
  const canvasPkg = require('canvas');
  if (initializeCanvas && canvasPkg.createCanvas && canvasPkg.createImageData) {
    initializeCanvas(canvasPkg.createCanvas, canvasPkg.createImageData);
  }
} catch (e) {}

let sharp: any;
try {
  sharp = require('sharp');
} catch (e) {}





export interface ImageMetadata {
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  isRaw: boolean;
  isVideo?: boolean;
  dateModified: string;
  orientation?: number; // 1: 0deg, 3: 180deg, 6: 90deg CW, 8: 270deg CW
  width?: number;
  height?: number;
}

const RAW_EXTENSIONS = new Set([
  '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2', '.dng', '.raf',
  '.orf', '.rw2', '.pef', '.ptx', '.x3f', '.raw', '.rwl', '.dcr', '.srw', '.3fr',
  '.fff', '.iiq', '.bay', '.cap', '.erf', '.mef', '.mos', '.mrw', '.pxn', '.rwz', '.ari'
]);


const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg', '.mts', '.m2ts', '.3gp', '.flv'
]);

const DESIGN_EXTENSIONS = new Set([
  '.psd', '.psb', '.ai', '.eps', '.pdf', '.svg'
]);

const IMAGE_EXTENSIONS = new Set([
  ...RAW_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...DESIGN_EXTENSIONS,
  '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.hif', '.avif', '.bmp'
]);

export function isSupportedImage(filePath: string): boolean {
  const fileName = path.basename(filePath);
  if (fileName.startsWith('.') || fileName.startsWith('._') || fileName.startsWith('_$')) {
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}




export function isRawFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

export function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

export function isDesignFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return DESIGN_EXTENSIONS.has(ext);
}



/**
 * Đọc Tag 0x0112 (Orientation) trực tiếp từ TIFF IFD0, SubIFD và ExifIFD Header ở đầu file RAW
 */
export function getRawFileOrientation(buffer: Buffer): number {
  try {
    if (buffer.length < 32) return 1;
    const endianSig = buffer.readUInt16BE(0);
    const isLittleEndian = endianSig === 0x4949; // 'II'
    const isBigEndian = endianSig === 0x4d4d; // 'MM'
    if (!isLittleEndian && !isBigEndian) return 1;

    const read16 = (o: number) => isLittleEndian ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o);
    const read32 = (o: number) => isLittleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);

    const magic = read16(2);
    if (magic !== 42 && magic !== 0x4352 && magic !== 0x5243) return 1;

    const firstIfdOffset = read32(4);
    const ifdOffsets: number[] = [firstIfdOffset];
    const visited = new Set<number>();

    while (ifdOffsets.length > 0) {
      const dirOffset = ifdOffsets.shift()!;
      if (dirOffset <= 0 || dirOffset >= buffer.length - 2 || visited.has(dirOffset)) continue;
      visited.add(dirOffset);

      const numEntries = read16(dirOffset);
      for (let i = 0; i < numEntries; i++) {
        const entryPos = dirOffset + 2 + i * 12;
        if (entryPos + 10 >= buffer.length) break;
        const tag = read16(entryPos);
        if (tag === 0x0112) { // Orientation tag
          const val = read16(entryPos + 8);
          if ([1, 3, 6, 8].includes(val)) {
            return val;
          }
        } else if (tag === 0x014A || tag === 0x8769) {
          const val = read32(entryPos + 8);
          if (val > 0 && val < buffer.length - 2) ifdOffsets.push(val);
        }
      }
    }
  } catch (e) {}
  return 1;
}

/**
 * Đọc chính xác Byte Offset & Length của Embedded JPEG Preview từ TIFF IFD Header (Chuẩn Byte-Range Photo Mechanic < 0.05ms)
 */
export function parseTiffEmbeddedJpegOffset(buffer: Buffer): { offset: number; length: number; orientation: number } | null {

  try {
    if (buffer.length < 32) return null;
    const endianSig = buffer.readUInt16BE(0);
    const isLittleEndian = endianSig === 0x4949; // 'II'
    const isBigEndian = endianSig === 0x4d4d; // 'MM'
    if (!isLittleEndian && !isBigEndian) return null;

    const read16 = (o: number) => isLittleEndian ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o);
    const read32 = (o: number) => isLittleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);

    const magic = read16(2);
    if (magic !== 42 && magic !== 0x4352 && magic !== 0x5243) return null;

    const firstIfdOffset = read32(4);
    const ifdOffsets: number[] = [firstIfdOffset];
    const visited = new Set<number>();
    const candidates: { offset: number; length: number; isJpegInterchangeTag: boolean }[] = [];
    let tiffOrientation = 1;

    while (ifdOffsets.length > 0) {
      const dirOffset = ifdOffsets.shift()!;
      if (dirOffset <= 0 || dirOffset >= buffer.length - 2 || visited.has(dirOffset)) continue;
      visited.add(dirOffset);

      const numEntries = read16(dirOffset);
      let jpegOffset = 0;
      let jpegLength = 0;
      let isJpegInterchangeTag = false;

      for (let i = 0; i < numEntries; i++) {
        const entryPos = dirOffset + 2 + i * 12;
        if (entryPos + 10 >= buffer.length) break;

        const tag = read16(entryPos);
        if (tag === 0x0112) { // TIFF Orientation Tag
          const val = read16(entryPos + 8);
          if ([1, 3, 6, 8].includes(val)) {
            tiffOrientation = val;
          }
        } else if (tag === 0x0201) { // JPEGInterchangeFormat (Chuẩn 100% của JPEG Preview)
          jpegOffset = read32(entryPos + 8);
          isJpegInterchangeTag = true;
        } else if (tag === 0x0202) { // JPEGInterchangeFormatLength
          jpegLength = read32(entryPos + 8);
        } else if (tag === 0x0111 && !jpegOffset) { // StripOffsets (Dự phòng)
          jpegOffset = read32(entryPos + 8);
        } else if (tag === 0x0117 && !jpegLength) { // StripByteCounts (Dự phòng)
          jpegLength = read32(entryPos + 8);
        } else if (tag === 0x014A || tag === 0x8769) { // SubIFD & ExifIFD
          const count = read32(entryPos + 4);
          if (count === 1) {
            ifdOffsets.push(read32(entryPos + 8));
          } else if (count > 1) {
            const arrOffset = read32(entryPos + 8);
            if (arrOffset > 0 && arrOffset < buffer.length - 4 * count) {
              for (let k = 0; k < count; k++) {
                const subOff = read32(arrOffset + k * 4);
                if (subOff > 0) ifdOffsets.push(subOff);
              }
            }
          }
        }
      }

      // Chọn lọc các bản preview JPEG thực thụ từ 300KB đến 35MB
      if (jpegOffset > 0 && jpegLength >= 50000 && jpegLength <= 35000000) {
        candidates.push({ offset: jpegOffset, length: jpegLength, isJpegInterchangeTag });
      }
    }

    if (candidates.length > 0) {
      // Ưu tiên Tag JPEGInterchangeFormat (0x0201) trước, sau đó sắp xếp theo dung lượng
      candidates.sort((a, b) => {
        if (a.isJpegInterchangeTag && !b.isJpegInterchangeTag) return -1;
        if (!a.isJpegInterchangeTag && b.isJpegInterchangeTag) return 1;
        return b.length - a.length;
      });
      return { ...candidates[0], orientation: tiffOrientation };
    }
  } catch (e) {}

  return null;
}



/**
 * Đọc Tag Orientation từ EXIF Header của buffer JPEG
 */
export function getExifOrientation(buffer: Buffer): number {
  try {
    if (buffer.length < 14) return 1;
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return 1;

    let offset = 2;
    while (offset < buffer.length - 4) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xe1) { // APP1 Marker
        const length = buffer.readUInt16BE(offset + 2);
        const exifHeaderOffset = offset + 4;
        if (buffer.toString('utf8', exifHeaderOffset, exifHeaderOffset + 4) === 'Exif') {
          const tiffOffset = exifHeaderOffset + 6;
          const endianSig = buffer.readUInt16BE(tiffOffset);
          const isLittleEndian = endianSig === 0x4949; // 'II'

          const read16 = (o: number) => isLittleEndian ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o);
          const read32 = (o: number) => isLittleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);

          const firstIfdOffset = read32(tiffOffset + 4);
          let dirOffset = tiffOffset + firstIfdOffset;

          if (dirOffset < buffer.length - 2) {
            const entriesCount = read16(dirOffset);
            dirOffset += 2;

            for (let i = 0; i < entriesCount; i++) {
              const entryPos = dirOffset + i * 12;
              if (entryPos + 10 >= buffer.length) break;
              const tag = read16(entryPos);
              if (tag === 0x0112) { // Orientation Tag
                const val = read16(entryPos + 8);
                if ([1, 3, 6, 8].includes(val)) {
                  return val;
                }
              }
            }
          }
        }
        offset += 2 + length;
      } else if (marker === 0xd9 || marker === 0xda) {
        break;
      } else {
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch (e) {}
  return 1;
}

/**
 * Tìm điểm kết thúc EOI (0xFF 0xD9) chuẩn xác tuyệt đối theo chuẩn ISO/IEC 10918-1 JPEG Specification.
 * Nhảy qua từng Marker (EXIF, DQT, DHT, SOF0), tới SOS (0xFFDA) thì quét luồng Entropy data bỏ qua byte-stuffing (0xFF 0x00).
 */
function findExactJpegEnd(buffer: Buffer, start: number): number {
  if (start < 0 || start >= buffer.length - 4) return -1;
  if (buffer[start] !== 0xff || buffer[start + 1] !== 0xd8) return -1;

  let pos = start + 2;
  const maxSearch = Math.min(buffer.length - 2, start + 35 * 1024 * 1024);

  while (pos < maxSearch - 4) {
    if (buffer[pos] !== 0xff) {
      pos++;
      continue;
    }

    const marker = buffer[pos + 1];

    if (marker === 0xff || marker === 0x00) {
      pos++;
      continue;
    }

    // EOI Marker (End of Image 0xFF 0xD9)
    if (marker === 0xd9) {
      return pos + 2;
    }

    // SOS Marker (Start of Scan 0xFF 0xDA) -> Quét luồng entropy
    if (marker === 0xda) {
      if (pos + 4 >= maxSearch) break;
      const sosLen = buffer.readUInt16BE(pos + 2);
      let scanPos = pos + 2 + sosLen;

      for (; scanPos < maxSearch - 1; scanPos++) {
        if (buffer[scanPos] === 0xff) {
          const nextByte = buffer[scanPos + 1];
          if (nextByte === 0xd9) {
            return scanPos + 2;
          } else if (nextByte === 0x00) {
            scanPos++;
          }
        }
      }
      return -1;
    }

    // Chỉ đọc length cho các Marker chuẩn ISO/IEC 10918-1
    const isValidMarkerWithLength =
      (marker >= 0xe0 && marker <= 0xef) ||
      (marker >= 0xc0 && marker <= 0xcf) ||
      marker === 0xdb || marker === 0xc4 || marker === 0xdd || marker === 0xfe;

    if (isValidMarkerWithLength) {
      if (pos + 3 < maxSearch) {
        const len = buffer.readUInt16BE(pos + 2);
        if (len >= 2 && pos + 2 + len < maxSearch) {
          pos += 2 + len;
          continue;
        }
      }
    }

    pos++;
  }

  // Dự phòng tìm kiếm EOI (0xFF 0xD9) cho các file RAW đặc thù
  for (let scan = start + 2; scan < Math.min(buffer.length - 1, start + 30 * 1024 * 1024); scan++) {
    if (buffer[scan] === 0xff && buffer[scan + 1] === 0xd9) {
      return scan + 2;
    }
  }

  return -1;
}

export function normalizeJpegExifOrientation(buffer: Buffer): Buffer {
  try {
    if (buffer.length < 14 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
    const buf = Buffer.from(buffer);

    let offset = 2;
    while (offset < buf.length - 4) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      if (marker === 0xe1) {
        const length = buf.readUInt16BE(offset + 2);
        const exifHeaderOffset = offset + 4;
        if (buf.toString('utf8', exifHeaderOffset, exifHeaderOffset + 4) === 'Exif') {
          const tiffOffset = exifHeaderOffset + 6;
          const endianSig = buf.readUInt16BE(tiffOffset);
          const isLittleEndian = endianSig === 0x4949;

          const read16 = (o: number) => isLittleEndian ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
          const write16 = (o: number, val: number) => isLittleEndian ? buf.writeUInt16LE(val, o) : buf.writeUInt16BE(val, o);
          const read32 = (o: number) => isLittleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

          const firstIfdOffset = read32(tiffOffset + 4);
          let dirOffset = tiffOffset + firstIfdOffset;

          if (dirOffset < buf.length - 2) {
            const entriesCount = read16(dirOffset);
            dirOffset += 2;

            for (let i = 0; i < entriesCount; i++) {
              const entryPos = dirOffset + i * 12;
              if (entryPos + 10 >= buf.length) break;
              const tag = read16(entryPos);
              if (tag === 0x0112) {
                write16(entryPos + 8, 1);
                break;
              }
            }
          }
        }
        break;
      } else if (marker === 0xd9 || marker === 0xda) {
        break;
      } else {
        const length = buf.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
    return buf;
  } catch {
    return buffer;
  }
}

import { rawPreviewExtractor } from './extractors/rawPreviewExtractor';

/**
 * Trích xuất ảnh Preview JPEG cho file RAW bằng RawPreviewExtractor Engine phân tầng theo container máy ảnh.
 */
export async function extractPreviewFromRaw(filePath: string): Promise<{ buffer: Buffer; orientation: number; width: number; height: number } | null> {
  try {
    const extracted = await rawPreviewExtractor.extractEmbeddedPreview(filePath);
    if (extracted && extracted.buffer && extracted.buffer.length > 10000) {
      return {
        buffer: extracted.buffer,
        orientation: extracted.orientation || 1,
        width: extracted.width || 3840,
        height: extracted.height || 2560,
      };
    }
  } catch (e) {}
  return null;
}






export function rgbaToBmp(width: number, height: number, rgba: Uint8Array): Buffer {
  const rowSize = Math.floor((3 * width + 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // BMP Header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);

  // DIB Header (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22); // Top-down
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);

  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const r = rgba[srcOffset];
      const g = rgba[srcOffset + 1];
      const b = rgba[srcOffset + 2];

      buf[rowOffset + x * 3] = b;
      buf[rowOffset + x * 3 + 1] = g;
      buf[rowOffset + x * 3 + 2] = r;
      srcOffset += 4;
    }
  }

  return buf;
}

export async function extractPsdPreview(filePath: string): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const fileBuf = await fs.promises.readFile(filePath);

    // 1. Dùng module ag-psd giải mã file PSD chuyên nghiệp với Node Canvas
    try {
      const psd: any = readPsd(fileBuf, {
        skipLayerData: false,
        skipCompositeImageData: false,
        skipThumbnail: false,
      } as any);

      if (psd.canvas) {
        const jpegBuf = psd.canvas.toBuffer('image/jpeg', { quality: 0.85 });
        if (jpegBuf && jpegBuf.length > 500) {
          return { buffer: jpegBuf, ext: 'jpg' };
        }
      }

      if (psd.thumbnail && psd.thumbnail.width > 0 && psd.thumbnail.height > 0 && psd.thumbnail.data) {
        const bmpBuf = rgbaToBmp(psd.thumbnail.width, psd.thumbnail.height, psd.thumbnail.data);
        return { buffer: bmpBuf, ext: 'bmp' };
      }

      if (psd.imageResources && psd.imageResources.thumbnail) {
        const thumb = psd.imageResources.thumbnail;
        if (thumb.data) {
          return { buffer: Buffer.from(thumb.data), ext: 'jpg' };
        }
      }
    } catch (agErr: any) {
      console.log(`[ag-psd] info for "${filePath}":`, agErr?.message);
    }



    // 2. Fallback: Quét JPEG/PNG SOI ngầm trong buffer
    const validImages: { buffer: Buffer; size: number; ext: string }[] = [];

    // Scan for JPEG (0xFFD8...0xFFD9)
    for (let i = 0; i < Math.min(fileBuf.length - 4, 128 * 1024 * 1024); i++) {
      if (fileBuf[i] === 0xff && fileBuf[i + 1] === 0xd8) {
        const start = i;
        const end = findExactJpegEnd(fileBuf, start);

        if (end > start + 1000) {
          const size = end - start;
          const jpegBuf = fileBuf.subarray(start, end);
          validImages.push({ buffer: jpegBuf, size, ext: 'jpg' });
        }
      }
    }

    // Scan for PNG (0x89504E47)
    for (let i = 0; i < Math.min(fileBuf.length - 8, 128 * 1024 * 1024); i++) {
      if (
        fileBuf[i] === 0x89 &&
        fileBuf[i + 1] === 0x50 &&
        fileBuf[i + 2] === 0x4e &&
        fileBuf[i + 3] === 0x47
      ) {
        const start = i;
        for (let j = start + 8; j < Math.min(fileBuf.length - 8, start + 10 * 1024 * 1024); j++) {
          if (
            fileBuf[j] === 0x49 &&
            fileBuf[j + 1] === 0x45 &&
            fileBuf[j + 2] === 0x4e &&
            fileBuf[j + 3] === 0x44
          ) {
            const end = j + 8;
            const size = end - start;
            if (size > 1000) {
              const pngBuf = fileBuf.subarray(start, end);
              validImages.push({ buffer: pngBuf, size, ext: 'png' });
            }
            break;
          }
        }
      }
    }

    if (validImages.length > 0) {
      validImages.sort((a, b) => b.size - a.size);
      return { buffer: validImages[0].buffer, ext: validImages[0].ext };
    }

    return null;
  } catch (err) {
    return null;
  }
}




export async function getMetadata(filePath: string): Promise<ImageMetadata> {
  const stat = await fs.promises.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isRaw = isRawFile(filePath);
  const isVideo = isVideoFile(filePath);

  let orientation = 1;
  if (!isVideo) {
    try {
      const handle = await fs.promises.open(filePath, 'r');
      const headerBuf = Buffer.alloc(Math.min(stat.size, 128 * 1024));
      await handle.read(headerBuf, 0, headerBuf.length, 0);
      await handle.close();

      if (isRaw) {
        orientation = getRawFileOrientation(headerBuf);
      } else {
        orientation = getExifOrientation(headerBuf);
      }
    } catch {}
  }

  return {
    fileName: path.basename(filePath),
    filePath,
    fileSize: stat.size,
    fileType: ext.replace('.', '').toUpperCase(),
    isRaw,
    isVideo,
    orientation,
    dateModified: stat.mtime.toISOString(),
  };
}

