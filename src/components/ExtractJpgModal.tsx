import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FileDown,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Zap,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PhotoItem } from '../types';

interface ExtractJpgModalProps {
  selectedPhotos: PhotoItem[];
  allPhotos: PhotoItem[];
  currentFolder: string | null;
  onClose: () => void;
}

export const ExtractJpgModal: React.FC<ExtractJpgModalProps> = ({
  selectedPhotos,
  allPhotos,
  currentFolder,
  onClose,
}) => {
  // Lọc chỉ lấy các file RAW
  const selectedRaw = useMemo(() => selectedPhotos.filter((p) => p.isRaw), [selectedPhotos]);
  const allRaw = useMemo(() => allPhotos.filter((p) => p.isRaw), [allPhotos]);

  // Scope: 'selected' hoặc 'all'
  const [scope, setScope] = useState<'selected' | 'all'>(selectedRaw.length > 0 ? 'selected' : 'all');

  // Target directory
  const defaultDir = useMemo(() => {
    if (!currentFolder || currentFolder === 'THIS_PC') return 'C:\\Extracted_JPG';
    return `${currentFolder}\\Extracted_JPG`;
  }, [currentFolder]);

  const [targetDir, setTargetDir] = useState<string>(defaultDir);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(true);

  // Execution states
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    percent: number;
  }>({ current: 0, total: 0, fileName: '', percent: 0 });

  const [result, setResult] = useState<{
    success: boolean;
    extractedCount: number;
    total: number;
    errors: string[];
    targetDir: string;
  } | null>(null);

  const [startTime, setStartTime] = useState<number>(0);

  // Target photos according to scope
  const targetPhotos = useMemo(() => {
    return scope === 'selected' ? selectedRaw : allRaw;
  }, [scope, selectedRaw, allRaw]);

  // Listen to IPC progress
  useEffect(() => {
    if (!window.electronAPI?.onExtractProgress) return;
    const unsub = window.electronAPI.onExtractProgress((data) => {
      setProgress(data);
    });
    return () => {
      unsub();
    };
  }, []);

  const handlePickFolder = async () => {
    if (!window.electronAPI) return;
    const picked = await window.electronAPI.openFolderPicker();
    if (picked) {
      setTargetDir(picked);
    }
  };

  const handleStartExtraction = async () => {
    if (!window.electronAPI?.extractRawToJpg || targetPhotos.length === 0) return;
    setIsExtracting(true);
    setResult(null);
    setStartTime(Date.now());
    setProgress({ current: 0, total: targetPhotos.length, fileName: '', percent: 0 });

    try {
      const filePaths = targetPhotos.map((p) => p.filePath);
      const res = await window.electronAPI.extractRawToJpg({
        filePaths,
        targetDir,
        overwrite,
      });

      setResult(res);

      if (autoOpenFolder && res?.success && window.electronAPI?.openInExplorer) {
        window.electronAPI.openInExplorer(targetDir);
      }
    } catch (e: any) {
      setResult({
        success: false,
        extractedCount: 0,
        total: targetPhotos.length,
        errors: [e.message || 'Lỗi trích xuất'],
        targetDir,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const elapsedSeconds = useMemo(() => {
    if (!startTime || progress.current === 0) return 0;
    return Math.max(1, Math.round((Date.now() - startTime) / 1000));
  }, [startTime, progress.current]);

  const speed = useMemo(() => {
    if (elapsedSeconds === 0 || progress.current === 0) return 0;
    return Math.round(progress.current / elapsedSeconds);
  }, [progress.current, elapsedSeconds]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileDown size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <span>Trích Xuất Ảnh JPG Siêu Tốc Từ RAW</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-black font-extrabold">
                  FULL RES
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Xuất trực tiếp JPEG 4K/6048x4032 gốc từ container RAW trong 1–2ms/ảnh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExtracting}
            className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto sidebar-scroll text-xs">
          {/* Result view */}
          {result ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              {result.success ? (
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-in zoom-in-75">
                  <CheckCircle2 size={32} />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertCircle size={32} />
                </div>
              )}

              <h3 className="text-base font-bold text-zinc-100">
                {result.success
                  ? `Đã trích xuất thành công ${result.extractedCount} / ${result.total} ảnh JPG!`
                  : 'Trích xuất ảnh có cảnh báo'}
              </h3>

              <p className="text-zinc-400 text-xs max-w-md">
                Tất cả ảnh JPG nguyên bản độ nét cao đã được lưu vào:
              </p>

              <div className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-[11px] text-amber-300 truncate">
                {result.targetDir}
              </div>

              {result.errors.length > 0 && (
                <div className="w-full max-h-28 overflow-y-auto text-left p-2.5 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-[11px] space-y-1">
                  {result.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => {
                    if (window.electronAPI?.openInExplorer) {
                      window.electronAPI.openInExplorer(result.targetDir);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors shadow-md"
                >
                  <FolderOpen size={15} />
                  <span>Mở thư mục JPG</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : isExtracting ? (
            /* Progress view */
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                  <span>Đang trích xuất ảnh JPG...</span>
                </span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>
                  Đã xuất: <strong className="text-zinc-100">{progress.current}</strong> / {progress.total} ảnh
                </span>
                {speed > 0 && (
                  <span className="text-amber-300">
                    Tốc độ: <strong>~{speed} ảnh/giây</strong>
                  </span>
                )}
              </div>

              <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-400 truncate">
                Đang xử lý: <span className="text-zinc-200">{progress.fileName || 'Khởi động...'}</span>
              </div>
            </div>
          ) : (
            /* Settings Form */
            <>
              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="block text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                  Phạm vi trích xuất:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setScope('selected')}
                    disabled={selectedRaw.length === 0}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      scope === 'selected'
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    } ${selectedRaw.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Chỉ ảnh đang chọn</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        {selectedRaw.length} ảnh RAW
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Chỉ trích xuất các file RAW bạn đã bôi đen chọn
                    </span>
                  </button>

                  <button
                    onClick={() => setScope('all')}
                    disabled={allRaw.length === 0}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      scope === 'all'
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Toàn bộ thư mục</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        {allRaw.length} ảnh RAW
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Trích xuất toàn bộ tất cả file RAW trong thư mục
                    </span>
                  </button>
                </div>
              </div>

              {/* Target Directory */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                    Thư mục lưu ảnh JPG:
                  </label>
                  <button
                    onClick={handlePickFolder}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <FolderOpen size={13} />
                    <span>Chọn thư mục khác</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetDir}
                    onChange={(e) => setTargetDir(e.target.value)}
                    className="flex-1 h-9 px-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg text-zinc-200 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOpenFolder}
                    onChange={(e) => setAutoOpenFolder(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-zinc-300">Tự động mở thư mục chứa ảnh sau khi hoàn tất</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-zinc-300">Ghi đè nếu file JPG đích đã tồn tại</span>
                </label>
              </div>

              {/* Preview sample */}
              {targetPhotos.length > 0 && (
                <div className="p-3 bg-zinc-900/20 border border-zinc-800/60 rounded-xl space-y-1.5 font-mono text-[11px]">
                  <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">
                    Mẫu file xuất ra:
                  </span>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-zinc-400 truncate">{targetPhotos[0]?.fileName}</span>
                    <span className="text-amber-400 font-bold">➔</span>
                    <span className="text-emerald-400 font-bold truncate">
                      {targetPhotos[0]?.fileName.replace(/\.[^/.]+$/, '.jpg')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="h-16 px-6 border-t border-zinc-800 bg-zinc-900/70 flex items-center justify-between shrink-0">
            <span className="text-xs text-zinc-400 font-mono">
              Tổng số:{' '}
              <strong className="text-amber-400 font-bold">{targetPhotos.length} ảnh RAW</strong>
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isExtracting}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleStartExtraction}
                disabled={isExtracting || targetPhotos.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang trích xuất...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Bắt đầu trích xuất ({targetPhotos.length} ảnh)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
