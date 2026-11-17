const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function prepareWinCache() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
  const cacheDir = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign');
  const targetExtractedDir = path.join(cacheDir, 'winCodeSign-2.6.0');
  const sevenZipExe = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

  console.log('🔍 Checking winCodeSign cache in:', targetExtractedDir);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Find any downloaded 7z file in cacheDir
  let archiveFile = null;
  const files = fs.readdirSync(cacheDir);
  for (const f of files) {
    if (f.endsWith('.7z')) {
      archiveFile = path.join(cacheDir, f);
      break;
    }
  }

  if (archiveFile && fs.existsSync(archiveFile)) {
    console.log('📦 Found cached 7z archive:', archiveFile);
    console.log('⚡ Extracting without symlinks using 7za -snl- ...');
    
    // Extract to targetExtractedDir cleanly
    if (!fs.existsSync(targetExtractedDir)) {
      fs.mkdirSync(targetExtractedDir, { recursive: true });
    }

    try {
      execSync(`"${sevenZipExe}" x -y -snl- -bd "${archiveFile}" "-o${targetExtractedDir}"`, { stdio: 'inherit' });
      
      // Touch .extracted marker
      fs.writeFileSync(path.join(targetExtractedDir, '.extracted'), 'done');
      console.log('✅ Successfully prepared winCodeSign cache!');
    } catch (err) {
      console.error('Extraction warning:', err.message);
    }
  } else {
    console.log('ℹ️ No pre-downloaded 7z found, electron-builder will handle it if needed.');
  }
}

prepareWinCache();
