/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface Window {
  electronAPI: {
    selectFolder: () => Promise<string | null>;
    scanFolderPhotos: (folderPath: string) => Promise<any[]>;
    readFolderContents: (folderPath: string) => Promise<any>;
    getDrivesAndUserFolders: () => Promise<any>;
    readSubfolders: (dirPath: string) => Promise<any[]>;
    getPhotoPreview: (filePath: string) => Promise<any>;
    getBase64Data: (filePath: string) => Promise<string | null>;
    copySelectedPhotos: (filePaths: string[], targetDir: string, move: boolean) => Promise<any>;
    openFolderPicker: () => Promise<string | null>;
    openInExplorer: (targetPath: string) => Promise<void>;
    openExternalUrl: (url: string) => Promise<void>;
    getCacheInfo: () => Promise<any>;
    clearCache: () => Promise<any>;
    openCacheFolder: () => Promise<void>;
    createFolder: (parentPath: string, folderName: string) => Promise<any>;
    copyFiles: (sourcePaths: string[], targetFolderPath: string) => Promise<any>;
    moveFiles: (sourcePaths: string[], targetFolderPath: string) => Promise<any>;
    deleteFiles: (filePaths: string[]) => Promise<any>;
    getSystemClipboardFiles: () => Promise<string[]>;
    setSystemClipboardFiles: (filePaths: string[]) => Promise<{ success: boolean; error?: string }>;
    batchRenamePhotos: (renameMap: any) => Promise<any>;
    statMtime: (filePaths: string[]) => Promise<{ success: boolean; items: Array<{ filePath: string; fileName: string; mtimeMs: number; mtimeIso: string; size: number }>; error?: string }>;
    adjustMtime: (params: { filePaths: string[]; offsetSeconds: number }) => Promise<{ success: boolean; updatedCount: number; backupTime: string; error?: string }>;
    restoreMtime: (filePaths?: string[]) => Promise<{ success: boolean; restoredCount: number; error?: string }>;
    extractRawToJpg: (params: { filePaths: string[]; targetDir: string; overwrite?: boolean }) => Promise<{
      success: boolean;
      extractedCount: number;
      total: number;
      errors: string[];
      targetDir: string;
      results: any[];
    }>;
    onExtractProgress: (callback: (data: { current: number; total: number; fileName: string; percent: number }) => void) => () => void;
    loadAppState: () => Promise<any>;
    saveAppState: (data: any) => Promise<any>;
    batchSavePhotoMeta: (updates: any) => Promise<any>;
    syncXmp: (params: { filePath: string; rating?: number; colorLabel?: string }) => Promise<any>;
    logAiDebug: (logEntry: any) => Promise<any>;
    diagnose: (testPath: string) => Promise<any>;

    // digiKam Integration & Core Engine
    digikamGetStatus: () => Promise<{ connected: boolean; dbPath: string; binaries?: any }>;
    digikamConnect: (customPath?: string) => Promise<{ success: boolean; connected: boolean; dbPath: string; binaries?: any }>;
    digikamSetRating: (filename: string, rating: number) => Promise<{ success: boolean }>;
    digikamGetImageInfo: (filename: string) => Promise<any>;
    digikamOpenInShowfoto: (filePath: string) => Promise<{ success: boolean }>;
    digikamOpenInDigikam: (filePath: string) => Promise<{ success: boolean }>;
    digikamReadExif: (filePath: string) => Promise<any>;
    digikamWriteExif: (filePath: string, rating?: number, colorLabel?: string) => Promise<{ success: boolean }>;
    getOpenWithApps: () => Promise<Array<{ name: string; path: string; shortcut?: string }>>;
    openWith: (params: { filePath?: string; filePaths?: string[]; appPath: string } | string, appPathFallback?: string) => Promise<{ success: boolean; error?: string }>;
    openWithShortcut: (params: { filePaths: string[]; targetApp: 'photoshop' | 'lightroom' | 'captureone' }) => Promise<{ success: boolean; appName?: string; appDisplayName?: string; appPath?: string; count?: number; error?: string }>;
  };
}
