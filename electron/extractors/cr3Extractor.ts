import fs from 'fs';
import { validateJpegBuffer, ValidatedJpegInfo } from './jpegValidator';
import { ExtractedPreviewResult } from './tiffIfdExtractor';

/**
 * Extractor chuyên dụng cho Canon CR3 (ISOBMFF Container)
 * Đọc cấu trúc Atom Box (ftyp, moov, uuid/prvw) để lấy Byte Offset & Length trong < 1ms
 */
export async function extractCr3Preview(filePath: string): Promise<ExtractedPreviewResult | null> {
  let fd: number | null = null;
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size < 1024) return null;

    fd = fs.openSync(filePath, 'r');

    // ⚡ Read Minimal Header 64KB cho ISOBMFF Atom parsing
    const headerSize = Math.min(stat.size, 64 * 1024);
    const headerBuf = Buffer.alloc(headerSize);
    fs.readSync(fd, headerBuf, 0, headerSize, 0);

    // Verify ISOBMFF ftyp crx
    const ftypMagic = headerBuf.toString('ascii', 4, 8);
    if (ftypMagic !== 'ftyp') {
      fs.closeSync(fd);
      return null;
    }

    let offset = 0;
    let prvwOffset = 0;
    let prvwLength = 0;

    while (offset < headerBuf.length - 8) {
      const boxSize = headerBuf.readUInt32BE(offset);
      const boxType = headerBuf.toString('ascii', offset + 4, offset + 8);

      if (boxSize < 8) break;

      if (boxType === 'moov' || boxType === 'trak' || boxType === 'mdia' || boxType === 'minf' || boxType === 'stbl' || boxType === 'uuid') {
        // If uuid box, check for PRVW atom signature
        if (boxType === 'uuid') {
          // Check UUID header for PRVW (85c0b687-820f-11e0-8111-f4ce46847232)
          const uuidSig = headerBuf.toString('hex', offset + 8, offset + 24);
          if (uuidSig.includes('85c0b687') || uuidSig.includes('PRVW') || headerBuf.toString('ascii', offset + 8, offset + 12) === 'PRVW') {
            // Found PRVW UUID Box
            const dataStart = offset + 24;
            if (dataStart + 8 < headerBuf.length) {
              // Read embedded JPEG offset and length inside PRVW header
              const jpegOffsetInBox = headerBuf.readUInt32BE(dataStart + 4);
              const jpegLen = headerBuf.readUInt32BE(dataStart + 8);
              if (jpegLen > 10000) {
                prvwOffset = offset + jpegOffsetInBox;
                prvwLength = jpegLen;
                break;
              }
            }
          }
        }
        offset += 8; // Step inside container box
      } else {
        offset += boxSize;
      }
    }

    // Fallback: If ISOBMFF tree parsing didn't return PRVW offset, scan 3MB header for 0xFF 0xD8 SOI marker inside CR3
    if (prvwOffset === 0 || prvwLength === 0) {
      const scanSize = Math.min(stat.size, 3 * 1024 * 1024);
      const scanBuf = Buffer.alloc(scanSize);
      fs.readSync(fd, scanBuf, 0, scanSize, 0);

      const jpegHeader = Buffer.from([0xff, 0xd8]);
      let startPos = scanBuf.indexOf(jpegHeader);
      const candidates: { offset: number; length: number }[] = [];

      while (startPos !== -1 && startPos < scanBuf.length - 4) {
        // Find EOI marker (0xFF 0xD9)
        let endPos = scanBuf.indexOf(Buffer.from([0xff, 0xd9]), startPos + 200);
        if (endPos !== -1 && endPos > startPos + 20000) {
          candidates.push({ offset: startPos, length: endPos + 2 - startPos });
        }
        startPos = scanBuf.indexOf(jpegHeader, startPos + 2);
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.length - a.length);
        prvwOffset = candidates[0].offset;
        prvwLength = candidates[0].length;
      }
    }

    if (prvwOffset > 0 && prvwLength > 10000 && prvwOffset + prvwLength <= stat.size) {
      const targetBuf = Buffer.alloc(prvwLength);
      fs.readSync(fd, targetBuf, 0, prvwLength, prvwOffset);
      fs.closeSync(fd);
      fd = null;

      const validated = validateJpegBuffer(targetBuf, 10000);
      if (validated) {
        return {
          buffer: validated.buffer,
          orientation: 1,
          width: validated.width,
          height: validated.height,
          jpegOffset: prvwOffset,
          jpegLength: prvwLength,
        };
      }
    }

    if (fd !== null) {
      fs.closeSync(fd);
      fd = null;
    }
  } catch (err) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
  return null;
}
