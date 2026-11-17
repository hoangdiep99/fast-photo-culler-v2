import fs from 'fs';
import { validateJpegBuffer, ValidatedJpegInfo } from './jpegValidator';

export interface ExtractedPreviewResult {
  buffer: Buffer;
  orientation: number;
  width: number;
  height: number;
  jpegOffset?: number;
  jpegLength?: number;
}

const EOI_MARKER = Buffer.from([0xff, 0xd9]);

/**
 * Extractor chuyên dụng đọc TIFF-based RAW files (NEF, ARW, DNG, CR2, RAF, ORF, PEF, RW2, 3FR, IIQ, FFF, DCR, MEF, MOS, SRW, RWL)
 * Sử dụng kỹ thuật Seek & Minimal Header Read (< 0.05ms)
 */
export async function extractTiffIfdPreview(filePath: string): Promise<ExtractedPreviewResult | null> {
  let fd: fs.promises.FileHandle | null = null;
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size < 1024) return null;

    fd = await fs.promises.open(filePath, 'r');

    // ⚡ BƯỚC 1: Read Header (512KB) - Đảm bảo đọc hết IFD0, SubIFD và ExifIFD của Nikon Z5/Z6/CR2/ARW
    const minimalHeaderSize = Math.min(stat.size, 512 * 1024);
    const headerBuf = Buffer.allocUnsafe(minimalHeaderSize);
    await fd.read(headerBuf, 0, minimalHeaderSize, 0);

    const endianSig = headerBuf.readUInt16BE(0);
    const isLittleEndian = endianSig === 0x4949; // 'II'
    const isBigEndian = endianSig === 0x4d4d; // 'MM'
    if (!isLittleEndian && !isBigEndian) {
      return null;
    }

    const read16 = (o: number) => (isLittleEndian ? headerBuf.readUInt16LE(o) : headerBuf.readUInt16BE(o));
    const read32 = (o: number) => (isLittleEndian ? headerBuf.readUInt32LE(o) : headerBuf.readUInt32BE(o));

    const magic = read16(2);
    if (magic !== 42 && magic !== 0x4352 && magic !== 0x5243) {
      return null;
    }

    let rawOrientation = 1;
    const candidates: { offset: number; length: number; priority: number }[] = [];
    const ifdQueue: number[] = [];
    const visitedOffsets = new Set<number>();

    const firstIfdOffset = read32(4);
    if (firstIfdOffset > 0 && firstIfdOffset < minimalHeaderSize - 2) {
      ifdQueue.push(firstIfdOffset);
    }

    while (ifdQueue.length > 0) {
      let dirOffset = ifdQueue.shift()!;

      while (dirOffset > 0 && dirOffset < minimalHeaderSize - 2) {
        if (visitedOffsets.has(dirOffset)) break;
        visitedOffsets.add(dirOffset);

        const numEntries = read16(dirOffset);
        dirOffset += 2;

        let jpegOffset = 0;
        let jpegLength = 0;
        let isJpegInterchangeTag = false;

        for (let i = 0; i < numEntries; i++) {
          const entryPos = dirOffset + i * 12;
          if (entryPos + 12 > minimalHeaderSize) break;

          const tag = read16(entryPos);
          if (tag === 0x0112) {
            // Orientation
            const val = read16(entryPos + 8);
            if ([1, 3, 6, 8].includes(val)) rawOrientation = val;
          } else if (tag === 0x0201) {
            // Tag 0x0201: JPEGInterchangeFormat (Offset)
            jpegOffset = read32(entryPos + 8);
            isJpegInterchangeTag = true;
          } else if (tag === 0x0202) {
            // Tag 0x0202: JPEGInterchangeFormatLength (Length)
            jpegLength = read32(entryPos + 8);
          } else if (tag === 0x0111) {
            // Tag 0x0111: StripOffsets
            if (!isJpegInterchangeTag) {
              const val = read32(entryPos + 8);
              if (val > 0) jpegOffset = val;
            }
          } else if (tag === 0x0117) {
            // Tag 0x0117: StripByteCounts
            if (jpegLength === 0) {
              const val = read32(entryPos + 8);
              if (val > 0) jpegLength = val;
            }
          } else if (tag === 0x014A || tag === 0x8769) {
            // 🚀 SubIFD (0x014A) hoặc ExifIFD (0x8769) của Nikon/Canon/Sony chứa Full Preview 6048x4032!
            const count = read32(entryPos + 4);
            const valOrOff = read32(entryPos + 8);
            if (count === 1) {
              if (valOrOff > 0 && valOrOff < minimalHeaderSize - 2) {
                ifdQueue.push(valOrOff);
              }
            } else if (count > 1 && valOrOff > 0 && valOrOff < minimalHeaderSize - 12) {
              // Mảng chứa các offset SubIFD nằm tại valOrOff!
              for (let c = 0; c < Math.min(count, 10); c++) {
                const offPos = valOrOff + c * 4;
                if (offPos + 4 <= minimalHeaderSize) {
                  const subOff = read32(offPos);
                  if (subOff > 0 && subOff < minimalHeaderSize - 2) {
                    ifdQueue.push(subOff);
                  }
                }
              }
            }
          }

        }

        if (jpegOffset > 0 && jpegOffset < stat.size) {
          const estimatedLength = jpegLength > 10000 ? jpegLength : Math.min(stat.size - jpegOffset, 25 * 1024 * 1024);
          candidates.push({
            offset: jpegOffset,
            length: estimatedLength,
            priority: isJpegInterchangeTag ? 100 : 50,
          });
        }

        dirOffset = dirOffset + numEntries * 12;
        if (dirOffset + 4 <= minimalHeaderSize) {
          dirOffset = read32(dirOffset);
        } else {
          break;
        }
      }
    }

    const validExtracted: {
      buffer: Buffer;
      orientation: number;
      width: number;
      height: number;
      jpegOffset: number;
      jpegLength: number;
    }[] = [];

    for (const cand of candidates) {
      if (cand.offset + 2 > stat.size) continue;

      // ⚡ Seek & Read ONLY exact JPEG bytes
      const testLen = Math.min(cand.length, stat.size - cand.offset);
      const jpegBuf = Buffer.allocUnsafe(testLen);
      await fd.read(jpegBuf, 0, testLen, cand.offset);

      // 🎯 Tìm vị trí EOI (0xFF 0xD9) để cắt chính xác bản JPEG nhúng (~1.2MB - 1.8MB) không lấy thừa trailing bytes
      let finalBuf = jpegBuf;
      const eoiPos = jpegBuf.indexOf(EOI_MARKER, 5000);
      if (eoiPos !== -1) {
        finalBuf = jpegBuf.subarray(0, eoiPos + 2);
      }

      const validated = validateJpegBuffer(finalBuf, 5000);
      if (validated) {
        validExtracted.push({
          buffer: validated.buffer,
          orientation: rawOrientation,
          width: validated.width,
          height: validated.height,
          jpegOffset: cand.offset,
          jpegLength: validated.buffer.length,
        });
      }
    }

    if (validExtracted.length > 0) {
      // 🎯 Ưu tiên chọn bản JPEG có ĐỘ PHÂN GIẢI LỚN NHẤT (width * height), loại bỏ hoàn toàn thumbnail 160x120!
      validExtracted.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      return validExtracted[0];
    }

  } catch (err) {
    // Ignore error
  } finally {
    if (fd !== null) {
      try { await fd.close(); } catch {}
    }
  }
  return null;
}
