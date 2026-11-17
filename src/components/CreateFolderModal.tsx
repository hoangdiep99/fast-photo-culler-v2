import React, { useState } from 'react';
import { FolderPlus, X, Check } from 'lucide-react';

interface CreateFolderModalProps {
  parentPath: string;
  onClose: () => void;
  onCreateSuccess: (folderPath: string) => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  parentPath,
  onClose,
  onCreateSuccess,
}) => {
  const [folderName, setFolderName] = useState<string>('Thư mục mới');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !window.electronAPI) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await (window.electronAPI as any).createFolder(parentPath, folderName.trim());
      if (res?.success) {
        onCreateSuccess(res.folderPath);
        onClose();
      } else {
        setErrorMessage(res?.error || 'Không thể tạo thư mục');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo thư mục');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <FolderPlus size={18} className="text-amber-400" />
            <h2 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
              Tạo thư mục mới
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Tên thư mục con:
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="VD: NgaVit_Fix..."
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl text-zinc-100 text-xs outline-none font-mono"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-red-400 font-mono bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              {errorMessage}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isProcessing || !folderName.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Check size={14} />
              <span>Tạo thư mục</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
