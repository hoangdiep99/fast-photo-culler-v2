import React, { useState } from 'react';
import { X, FolderOpen, Copy, Move, CheckCircle2, AlertCircle, FolderPlus } from 'lucide-react';
import { PhotoItem } from '../types';

interface ExportModalProps {
  selectedPhotos: PhotoItem[];
  currentFolder: string | null;
  onClose: () => void;
  onExport: (targetDir: string, move: boolean) => Promise<{ success: boolean; copiedCount: number; errors: string[] }>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  selectedPhotos,
  currentFolder,
  onClose,
  onExport,
}) => {
  const defaultTargetDir = currentFolder ? `${currentFolder}\\Selected` : '';
  const [targetDir, setTargetDir] = useState<string>(defaultTargetDir);
  const [moveFiles, setMoveFiles] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; copiedCount: number; errors: string[] } | null>(null);

  // Quick Create New Folder inside currentFolder
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('Ảnh Chọn Lọc');

  const handlePickTargetFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.openFolderPicker();
      if (folder) setTargetDir(folder);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!currentFolder || !newFolderName.trim() || !window.electronAPI) return;
    try {
      const res = await window.electronAPI.createFolder(currentFolder, newFolderName.trim());
      if (res.success && res.folderPath) {
        setTargetDir(res.folderPath);
        setIsCreatingFolder(false);
      } else {
        alert('Không thể tạo thư mục: ' + (res.error || 'Lỗi không xác định'));
      }
    } catch (e: any) {
      alert('Lỗi tạo thư mục: ' + e.message);
    }
  };

  const handleStartExport = async () => {
    if (!targetDir) return;
    setIsExporting(true);
    const res = await onExport(targetDir, moveFiles);
    setIsExporting(false);
    setExportResult(res);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Sao Chép / Di Chuyển Ảnh ({selectedPhotos.length})</span>
            <span className="bg-blue-600/20 text-blue-400 text-xs px-2.5 py-0.5 rounded-full border border-blue-500/30 font-semibold">
              {selectedPhotos.length} ảnh
            </span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {exportResult ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            {exportResult.success ? (
              <CheckCircle2 size={48} className="text-emerald-500" />
            ) : (
              <AlertCircle size={48} className="text-amber-500" />
            )}
            <h3 className="text-sm font-semibold text-zinc-100">
              {exportResult.success ? 'Xuất ảnh hoàn tất thành công!' : 'Xuất ảnh có một số cảnh báo'}
            </h3>
            <p className="text-xs text-zinc-400">
              Đã {moveFiles ? 'di chuyển' : 'sao chép'} <strong>{exportResult.copiedCount}</strong> file RAW/JPG sang:
            </p>
            <div className="bg-zinc-950 px-3 py-2 rounded border border-zinc-800 font-mono text-xs text-zinc-300 w-full truncate">
              {targetDir}
            </div>
            {exportResult.errors.length > 0 && (
              <div className="text-xs text-red-400 text-left bg-red-950/30 p-2 rounded border border-red-800/40 w-full max-h-24 overflow-y-auto">
                {exportResult.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Hoàn Thành
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Target Folder Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-400">Thư mục đích (Destination Folder)</label>
                {currentFolder && currentFolder !== 'THIS_PC' && (
                  <button
                    onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <FolderPlus size={13} />
                    <span>+ Tạo thư mục mới</span>
                  </button>
                )}
              </div>

              {/* Inline Create Folder UI */}
              {isCreatingFolder && (
                <div className="mb-2.5 p-3 bg-zinc-950 border border-amber-500/30 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] text-amber-300 font-medium">Tạo thư mục mới trong thư mục hiện tại:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Tên thư mục mới..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 px-3 py-1.5 rounded-lg outline-none focus:border-amber-400 font-sans"
                    />
                    <button
                      onClick={handleCreateNewFolder}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs rounded-lg font-bold transition-all"
                    >
                      Tạo & Chọn
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetDir}
                  onChange={(e) => setTargetDir(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-2 rounded-lg outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handlePickTargetFolder}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors font-medium"
                >
                  <FolderOpen size={14} />
                  <span>Duyệt...</span>
                </button>
              </div>
            </div>

            {/* Action Option (Copy vs Move) */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Hành động</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMoveFiles(false)}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-left ${
                    !moveFiles
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Copy size={14} />
                    <span>Sao Chép (Copy)</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-normal">Giữ nguyên file RAW ở thư mục gốc</span>
                </button>

                <button
                  onClick={() => setMoveFiles(true)}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-left ${
                    moveFiles
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Move size={14} />
                    <span>Di Chuyển (Move)</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-normal">Chuyển hẳn file RAW sang thư mục mới</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleStartExport}
                disabled={isExporting || !targetDir}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                {isExporting ? 'Đang thực hiện...' : 'Bắt Đầu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
