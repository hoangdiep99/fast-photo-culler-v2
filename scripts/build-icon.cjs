const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
async function buildIcon() {
  const projectRoot = path.join(__dirname, '..');
  const buildDir = path.join(projectRoot, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  // Define background gradients and text element
  const bgTemplate = `
    <radialGradient id="bg" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3f3f46"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
  `;

  // Draw camera icon path from public/camera.svg to keep vector quality
  let cameraPaths = '';
  try {
    const cameraSvg = fs.readFileSync(path.join(projectRoot, 'public/camera.svg'), 'utf8');
    // Extract paths from camera.svg
    const pathRegex = /<path[^>]*>/g;
    let match;
    while ((match = pathRegex.exec(cameraSvg)) !== null) {
      // Clean path stroke/fill to apply gold gradient
      let cleanPath = match[0]
        .replace(/stroke="[^"]*"/g, 'stroke="url(#gold)"')
        .replace(/fill="[^"]*"/g, 'fill="none"')
        .replace(/stroke-width="[^"]*"/g, 'stroke-width="8"');
      cameraPaths += cleanPath;
    }
  } catch (err) {
    console.error('Error reading camera.svg:', err);
  }

  // Create composite SVG content
  const compositeSvg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${bgTemplate}
      </defs>
      <!-- Base container -->
      <rect width="256" height="256" rx="60" fill="url(#bg)" stroke="url(#borderGrad)" stroke-width="4"/>
      <!-- Inner glowing gold border -->
      <rect x="10" y="10" width="236" height="236" rx="50" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.3"/>
      
      <!-- Camera Icon Graphic inside the container -->
      <g transform="translate(68, 50) scale(4.8)">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none" stroke="url(#gold)" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="4" fill="none" stroke="url(#gold)" stroke-width="1.5"/>
      </g>

      <!-- Lightning bolt for Speed/Culling concept -->
      <path d="M128 75 L145 115 L125 115 L135 155 L110 110 L130 110 Z" fill="url(#gold)" opacity="0.75" transform="translate(4, -8) scale(0.9)"/>

      <!-- App Title Text -->
      <text x="128" y="215" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="19" fill="url(#gold)" text-anchor="middle" letter-spacing="1.5">FAST CULLER</text>
    </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(compositeSvg))
    .resize(256, 256)
    .png()
    .toBuffer();

  const png512Buffer = await sharp(Buffer.from(compositeSvg))
    .resize(512, 512)
    .png()
    .toBuffer();

  // Create standard ICO file buffer (22 bytes header + png file content)
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);     // Reserved
  icoHeader.writeUInt16LE(1, 2);     // Type (1 = ICO)
  icoHeader.writeUInt16LE(1, 4);     // Number of images (1)
  icoHeader.writeUInt8(0, 6);        // Width (0 means 256)
  icoHeader.writeUInt8(0, 7);        // Height (0 means 256)
  icoHeader.writeUInt8(0, 8);        // Color count (0)
  icoHeader.writeUInt8(0, 9);        // Reserved (0)
  icoHeader.writeUInt16LE(1, 10);    // Color planes (1)
  icoHeader.writeUInt16LE(32, 12);   // Bits per pixel (32)
  icoHeader.writeUInt32LE(pngBuffer.length, 14); // Image size in bytes
  icoHeader.writeUInt32LE(22, 18);   // Offset of image data in file

  const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512Buffer);

  // Copy to public folder too so it can be used on web view if needed
  fs.writeFileSync(path.join(projectRoot, 'public/icon.png'), png512Buffer);

  console.log('✅ Generated professional App Icon (PNG & ICO) in /build folder!');
}

buildIcon().catch(err => {
  console.error('Failed to generate icon:', err);
  process.exit(1);
});
