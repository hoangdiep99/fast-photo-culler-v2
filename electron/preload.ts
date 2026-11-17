const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  scanFolderPhotos: (folderPath: string) => ipcRenderer.invoke('fs:scanFolderPhotos', folderPath),
  readFolderContents: (folderPath: string) => ipcRenderer.invoke('fs:readFolderContents', folderPath),
  getDrivesAndUserFolders: () => ipcRenderer.invoke('fs:getDrivesAndUserFolders'),
  readSubfolders: (dirPath: string) => ipcRenderer.invoke('fs:readSubfolders', dirPath),
  getPhotoPreview: (filePath: string) => ipcRenderer.invoke('photo:getPreview', filePath),
  getBase64Data: (filePath: string) => ipcRenderer.invoke('photo:getBase64Data', filePath),
  getPhotoExif: (filePath: string) => ipcRenderer.invoke('photo:getExif', filePath),

  copySelectedPhotos: (filePaths: string[], targetDir: string, move: boolean) =>
    ipcRenderer.invoke('photo:copySelected', { filePaths, targetDir, move }),
  openFolderPicker: () => ipcRenderer.invoke('dialog:openFolderPicker'),
  openInExplorer: (targetPath: string) => ipcRenderer.invoke('shell:openInExplorer', targetPath),
  openExternalUrl: (url: string) => ipcRenderer.invoke('shell:openExternalUrl', url),
  getCacheInfo: () => ipcRenderer.invoke('cache:getInfo'),

  clearCache: () => ipcRenderer.invoke('cache:clear'),
  openCacheFolder: () => ipcRenderer.invoke('cache:openFolder'),
  createFolder: (parentPath: string, folderName: string) => ipcRenderer.invoke('fs:createFolder', { parentPath, folderName }),
  copyFiles: (sourcePaths: string[], targetFolderPath: string) => ipcRenderer.invoke('fs:copyFiles', { sourcePaths, targetFolderPath }),
  moveFiles: (sourcePaths: string[], targetFolderPath: string) => ipcRenderer.invoke('fs:moveFiles', { sourcePaths, targetFolderPath }),
  deleteFiles: (filePaths: string[]) => ipcRenderer.invoke('fs:deleteFiles', filePaths),
  getSystemClipboardFiles: () => ipcRenderer.invoke('clipboard:getSystemFiles'),
  setSystemClipboardFiles: (filePaths: string[]) => ipcRenderer.invoke('clipboard:setSystemFiles', filePaths),
  batchRenamePhotos: (renameMap: any) => ipcRenderer.invoke('fs:batchRenamePhotos', renameMap),
  statMtime: (filePaths: string[]) => ipcRenderer.invoke('fs:statMtime', filePaths),
  adjustMtime: (params: { filePaths: string[]; offsetSeconds: number }) => ipcRenderer.invoke('fs:adjustMtime', params),
  restoreMtime: (filePaths?: string[]) => ipcRenderer.invoke('fs:restoreMtime', filePaths),

  // ⚡ Fast RAW to JPG Extraction
  extractRawToJpg: (params: { filePaths: string[]; targetDir: string; overwrite?: boolean }) =>
    ipcRenderer.invoke('raw:extractJpgBatch', params),
  onExtractProgress: (callback: (data: { current: number; total: number; fileName: string; percent: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('raw:extractProgress', handler);
    return () => ipcRenderer.removeListener('raw:extractProgress', handler);
  },

  loadAppState: () => ipcRenderer.invoke('appState:load'),
  saveAppState: (data: any) => ipcRenderer.invoke('appState:save', data),
  batchSavePhotoMeta: (updates: any) => ipcRenderer.invoke('photoMeta:batchSave', updates),
  syncXmp: (params: { filePath: string; rating?: number; colorLabel?: string }) => ipcRenderer.invoke('photoMeta:syncXmp', params),
  logAiDebug: (logEntry: any) => ipcRenderer.invoke('ai:logDebug', logEntry),
  diagnose: (testPath: string) => ipcRenderer.invoke('debug:diagnose', testPath),

  // digiKam Integration
  digikamGetStatus: () => ipcRenderer.invoke('digikam:getStatus'),
  digikamConnect: (customPath?: string) => ipcRenderer.invoke('digikam:connect', customPath),
  digikamSetRating: (filename: string, rating: number) => ipcRenderer.invoke('digikam:setRating', { filename, rating }),
  digikamGetImageInfo: (filename: string) => ipcRenderer.invoke('digikam:getImageInfo', filename),
  digikamOpenInShowfoto: (filePath: string) => ipcRenderer.invoke('digikam:openInShowfoto', filePath),
  digikamOpenInDigikam: (filePath: string) => ipcRenderer.invoke('digikam:openInDigikam', filePath),
  digikamReadExif: (filePath: string) => ipcRenderer.invoke('digikam:readExif', filePath),
  digikamWriteExif: (filePath: string, rating?: number, colorLabel?: string) => ipcRenderer.invoke('digikam:writeExif', { filePath, rating, colorLabel }),

  // 🚀 Open With external applications (Photoshop, Lightroom, Capture One...)
  getOpenWithApps: () => ipcRenderer.invoke('photo:getOpenWithApps'),
  openWith: (params: { filePath?: string; filePaths?: string[]; appPath: string } | string, appPathFallback?: string) => {
    if (typeof params === 'string') {
      return ipcRenderer.invoke('photo:openWith', { filePath: params, appPath: appPathFallback });
    }
    return ipcRenderer.invoke('photo:openWith', params);
  },
  openWithShortcut: (params: { filePaths: string[]; targetApp: 'photoshop' | 'lightroom' | 'captureone' }) =>
    ipcRenderer.invoke('photo:openWithShortcut', params),
});


