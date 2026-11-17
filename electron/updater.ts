import { app, shell, BrowserWindow, ipcMain } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const REPO_OWNER = 'hoangdiep99';
const REPO_NAME = 'fast-photo-culler-v2';

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  assetName: string;
  assetSize: number;
  downloadUrl: string;
  htmlUrl: string;
  error?: string;
}

/**
 * So sánh 2 chuỗi phiên bản semver (e.g. "2.8.0" vs "2.7.0")
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cleanCurrent = current.replace(/^v/i, '').trim();
  const cleanLatest = latest.replace(/^v/i, '').trim();

  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const lParts = cleanLatest.split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Kiểm tra bản cập nhật mới nhất từ GitHub Releases
 */
export async function checkForAppUpdates(currentVersion: string): Promise<UpdateInfo> {
  const defaultRes: UpdateInfo = {
    updateAvailable: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseName: '',
    releaseNotes: '',
    publishedAt: '',
    assetName: '',
    assetSize: 0,
    downloadUrl: '',
    htmlUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
  };

  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
    const data = await new Promise<any>((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'FastPhotoCullerAI-AutoUpdater',
              Accept: 'application/vnd.github.v3+json',
            },
          },
          (res) => {
            if (res.statusCode !== 200) {
              return reject(new Error(`GitHub API returned status code ${res.statusCode}`));
            }
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              try {
                resolve(JSON.parse(raw));
              } catch (e) {
                reject(e);
              }
            });
          }
        )
        .on('error', reject);
    });

    const latestTag = data.tag_name || data.name || '';
    const releaseName = data.name || latestTag;
    const releaseNotes = data.body || 'Bản cập nhật tối ưu hóa hiệu năng và sửa lỗi.';
    const publishedAt = data.published_at || '';
    const htmlUrl = data.html_url || defaultRes.htmlUrl;

    const hasNewer = isNewerVersion(currentVersion, latestTag);
    const assets = Array.isArray(data.assets) ? data.assets : [];

    // Chọn asset phù hợp với OS của người dùng
    let matchedAsset: any = null;
    if (process.platform === 'win32') {
      // Ưu tiên bản Setup, nếu không có thì lấy file .exe bất kỳ
      matchedAsset =
        assets.find((a: any) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')) ||
        assets.find((a: any) => a.name.endsWith('.exe'));
    } else if (process.platform === 'darwin') {
      // macOS: ưu tiên DMG theo kiến trúc chip (arm64 cho Apple Silicon, x64 cho Intel)
      const isArm = process.arch === 'arm64';
      matchedAsset =
        assets.find((a: any) => a.name.endsWith('.dmg') && a.name.includes(isArm ? 'arm64' : 'x64')) ||
        assets.find((a: any) => a.name.endsWith('.dmg')) ||
        assets.find((a: any) => a.name.endsWith('.zip'));
    }

    const assetName = matchedAsset?.name || '';
    const assetSize = matchedAsset?.size || 0;
    const downloadUrl = matchedAsset?.browser_download_url || htmlUrl;

    return {
      updateAvailable: hasNewer,
      currentVersion,
      latestVersion: latestTag.replace(/^v/i, ''),
      releaseName,
      releaseNotes,
      publishedAt,
      assetName,
      assetSize,
      downloadUrl,
      htmlUrl,
    };
  } catch (err: any) {
    console.error('Check update error:', err);
    return {
      ...defaultRes,
      error: err.message || String(err),
    };
  }
}

/**
 * Tải file cập nhật từ GitHub với cơ chế xử lý chuyển hướng (Redirects) & Báo cáo tiến độ
 */
function downloadFileWithRedirect(
  fileUrl: string,
  destPath: string,
  onProgress: (percent: number, downloadedMB: number, totalMB: number, speedMBs: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 10) {
        return reject(new Error('Quá nhiều lượt chuyển hướng khi tải file.'));
      }

      https
        .get(
          currentUrl,
          {
            headers: {
              'User-Agent': 'FastPhotoCullerAI-AutoUpdater',
              Accept: '*/*',
            },
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return request(res.headers.location, redirectCount + 1);
            }

            if (res.statusCode !== 200) {
              return reject(new Error(`Tải file thất bại: HTTP ${res.statusCode}`));
            }

            const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
            let downloadedBytes = 0;
            let lastTime = Date.now();
            let lastDownloaded = 0;
            let currentSpeed = 0;

            const fileStream = fs.createWriteStream(destPath);

            res.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              fileStream.write(chunk);

              const now = Date.now();
              if (now - lastTime >= 400) {
                const timeDiffSec = (now - lastTime) / 1000;
                currentSpeed = (downloadedBytes - lastDownloaded) / 1024 / 1024 / timeDiffSec;
                lastTime = now;
                lastDownloaded = downloadedBytes;

                const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
                const downloadedMB = Math.round((downloadedBytes / 1024 / 1024) * 10) / 10;
                const totalMB = Math.round((totalBytes / 1024 / 1024) * 10) / 10;
                const speedMBs = Math.round(currentSpeed * 10) / 10;

                onProgress(percent, downloadedMB, totalMB, speedMBs);
              }
            });

            res.on('end', () => {
              fileStream.end(() => {
                const downloadedMB = Math.round((downloadedBytes / 1024 / 1024) * 10) / 10;
                onProgress(100, downloadedMB, downloadedMB, 0);
                resolve(destPath);
              });
            });

            res.on('error', (err) => {
              fileStream.destroy();
              fs.unlink(destPath, () => {});
              reject(err);
            });
          }
        )
        .on('error', reject);
    };

    request(fileUrl);
  });
}

/**
 * Đăng ký toàn bộ IPC handlers cho cơ chế Auto Update
 */
export function registerUpdaterHandlers(mainWindow: BrowserWindow, currentVersion: string) {
  // 1. Kiểm tra bản cập nhật
  ipcMain.handle('updater:check', async () => {
    return await checkForAppUpdates(currentVersion);
  });

  // 2. Tải và tự động khởi chạy bản cài đặt mới
  ipcMain.handle('updater:downloadAndInstall', async (_, downloadUrl: string) => {
    try {
      if (!downloadUrl) {
        throw new Error('Đường dẫn tải file không hợp lệ.');
      }

      const tempDir = app.getPath('temp');
      const urlFileName = path.basename(new URL(downloadUrl).pathname) || 'update_installer.exe';
      const targetPath = path.join(tempDir, `FastPhotoCullerAI_Update_${Date.now()}_${urlFileName}`);

      await downloadFileWithRedirect(
        downloadUrl,
        targetPath,
        (percent, downloadedMB, totalMB, speedMBs) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:progress', {
              percent,
              downloadedMB,
              totalMB,
              speedMBs,
            });
          }
        }
      );

      // Cài đặt hoặc mở tệp vừa tải
      if (process.platform === 'win32' && targetPath.endsWith('.exe')) {
        // Chạy bộ cài Windows ở chế độ nền độc lập và đóng app cũ
        const child = spawn(targetPath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        setTimeout(() => {
          app.quit();
        }, 1500);

        return { success: true, message: 'Đang khởi chạy bộ cài đặt...' };
      } else if (process.platform === 'darwin') {
        // macOS: mở file DMG để người dùng kéo vào Applications
        shell.openPath(targetPath);
        return { success: true, message: 'Đã mở file DMG cài đặt.' };
      } else {
        shell.showItemInFolder(targetPath);
        return { success: true, message: 'Đã tải thành công tệp cài đặt.' };
      }
    } catch (err: any) {
      console.error('Download update failed:', err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
