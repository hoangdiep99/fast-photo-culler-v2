import fs from 'fs';
import path from 'path';

export interface XmpData {
  rating?: number; // 0-5, or -1 for rejected
  colorLabel?: string; // red, yellow, green, blue, purple
  isRejected?: boolean;
}

/**
 * Generate standard Adobe XMP Sidecar XML string
 */
export function createXmpXml(fileName: string, data: XmpData): string {
  const rating = data.rating !== undefined ? data.rating : 0;
  const label = data.colorLabel && data.colorLabel !== 'none'
    ? data.colorLabel.charAt(0).toUpperCase() + data.colorLabel.slice(1).toLowerCase()
    : '';

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="FastPhotoCullerAI v2.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   xmp:Rating="${rating}"
   ${label ? `xmp:Label="${label}"` : ''}
   crs:RawFileName="${fileName}">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Save XMP sidecar file [imageFilename].xmp directly next to the photo
 */
export async function syncXmpSidecar(filePath: string, data: XmpData): Promise<boolean> {
  try {
    const ext = path.extname(filePath);
    const xmpPath = filePath.slice(0, filePath.length - ext.length) + '.xmp';
    const fileName = path.basename(filePath);

    let content: string | null = null;
    try {
      content = await fs.promises.readFile(xmpPath, 'utf8');
    } catch {}

    // If file exists, update rating/label tags; else create new
    if (content !== null) {
      // Update xmp:Rating
      if (data.rating !== undefined) {
        if (/xmp:Rating=["']?-?\d+["']?/i.test(content)) {
          content = content.replace(/xmp:Rating=["']?-?\d+["']?/gi, `xmp:Rating="${data.rating}"`);
        } else if (/<xmp:Rating>-?\d+<\/xmp:Rating>/i.test(content)) {
          content = content.replace(/<xmp:Rating>-?\d+<\/xmp:Rating>/gi, `<xmp:Rating>${data.rating}</xmp:Rating>`);
        } else {
          content = content.replace(/<rdf:Description/i, `<rdf:Description xmp:Rating="${data.rating}"`);
        }
      }

      // Update xmp:Label
      if (data.colorLabel !== undefined) {
        const labelVal = data.colorLabel && data.colorLabel !== 'none'
          ? data.colorLabel.charAt(0).toUpperCase() + data.colorLabel.slice(1).toLowerCase()
          : '';
        if (/xmp:Label=["']?[^"'\s>]+["']?/i.test(content)) {
          content = content.replace(/xmp:Label=["']?[^"'\s>]+["']?/gi, `xmp:Label="${labelVal}"`);
        } else if (labelVal) {
          content = content.replace(/<rdf:Description/i, `<rdf:Description xmp:Label="${labelVal}"`);
        }
      }

      await fs.promises.writeFile(xmpPath, content, 'utf8');
    } else {
      const xml = createXmpXml(fileName, data);
      await fs.promises.writeFile(xmpPath, xml, 'utf8');
    }

    console.log(`[XMP Engine] Synced Adobe XMP Sidecar: ${xmpPath}`);
    return true;
  } catch (err) {
    console.error(`[XMP Engine] Failed to write sidecar for ${filePath}:`, err);
    return false;
  }
}

