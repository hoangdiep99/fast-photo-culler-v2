import React, { useEffect, useRef } from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  Edit3,
  Trash2,
  FolderPlus,
  Star,
  Check,
  X,
  Tag,
  FileDown,
  Folder
} from 'lucide-react';
import { PhotoItem, SubfolderItem } from '../types';

export interface ContextMenuPosition {
  x: number;
  y: number;
  targetType: 'photo' | 'subfolder' | 'background';
  targetPhoto?: PhotoItem;
  targetSubfolder?: SubfolderItem;
  selectedPhotos?: PhotoItem[];
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onBatchRename: () => void;
  onExtractJpg?: () => void;
  onDelete: () => void;
  onCreateFolder: () => void;
  onSetRating?: (rating: number) => void;
  onSetPickStatus?: (status: 'tagged' | 'rejected' | 'all') => void;
  onToggleSubfolderFavorite?: () => void;
  isSubfolderFavorited?: boolean;
  onOpenSubfolder?: (path: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  onBatchRename,
  onExtractJpg,
  onDelete,
  onCreateFolder,
  onSetRating,
  onSetPickStatus,
  onToggleSubfolderFavorite,
  isSubfolderFavorited,
  onOpenSubfolder,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openWithApps, setOpenWithApps] = React.useState<{ name: string; path: string }[]>([]);
  const [showOpenWith, setShowOpenWith] = React.useState(false);

  useEffect(() => {
    if (position.targetType === 'photo' && (window as any).electronAPI?.getOpenWithApps) {
      (window as any).electronAPI.getOpenWithApps().then((apps: any) => {
        setOpenWithApps(apps || []);
      });
    }
  }, [position.targetType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Screen boundary check to prevent overflow
  const adjustedX = Math.min(position.x, window.innerWidth - 220);
  const adjustedY = Math.min(position.y, window.innerHeight - 300);

  const selectedCount = position.selectedPhotos?.length || (position.targetPhoto ? 1 : 0);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-52 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl py-1.5 text-xs text-zinc-300 font-sans backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 divide-y divide-zinc-800/60 select-none"
    >
      {/* ── PHOTO TARGET MENU ── */}
      {position.targetType === 'photo' && (
        <>
          {/* Quick Actions Header */}
          <div className="px-1 py-1 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 truncate">
              {selectedCount > 1 ? `Đã chọn (${selectedCount} ảnh)` : position.targetPhoto?.fileName}
            </div>

            {/* Pick / Reject */}
            <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
              <button
                onClick={() => {
                  onSetPickStatus?.('tagged');
                  onClose();
                }}
                className="flex items-center justify-center gap-1 py-1 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all"
              >
                <Tag size={11} />
                <span>Pick (P)</span>
              </button>
              <button
                onClick={() => {
                  onSetPickStatus?.('rejected');
                  onClose();
                }}
                className="flex items-center justify-center gap-1 py-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-bold transition-all"
              >
                <X size={11} />
                <span>Reject (X)</span>
              </button>
            </div>

            {/* Quick Star Rating */}
            <div className="flex items-center justify-around px-2 py-1 bg-zinc-900/60 rounded-md my-1 border border-zinc-800/80">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    onSetRating?.(star);
                    onClose();
                  }}
                  className="p-1 text-zinc-500 hover:text-amber-400 hover:scale-125 transition-all"
                  title={`Đánh giá ${star} Sao`}
                >
                  <Star size={13} />
                </button>
              ))}
            </div>
          </div>

          {/* Copy / Move / Rename / Delete */}
          <div className="px-1 py-1 space-y-0.5">
            <button
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Copy size={13} className="text-blue-400" />
                <span>Sao chép (Copy)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Ctrl+C</span>
            </button>

            <button
              onClick={() => {
                onCut();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scissors size={13} className="text-purple-400" />
                <span>Cắt / Di chuyển (Cut)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Ctrl+X</span>
            </button>

            <button
              onClick={() => {
                onBatchRename();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Edit3 size={13} className="text-amber-400" />
                <span>Đổi tên & Đồng bộ giờ (Fotonix)...</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">F2</span>
            </button>

            {onExtractJpg && (
              <button
                onClick={() => {
                  onExtractJpg();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors text-amber-300 hover:text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <FileDown size={13} className="text-amber-400" />
                  <span className="font-semibold">Trích xuất ảnh JPG (Full Res)...</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+E</span>
              </button>
            )}

            {openWithApps.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setShowOpenWith(true)}
                onMouseLeave={() => setShowOpenWith(false)}
              >
                <button
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus size={13} className="text-emerald-400" />
                    <span>Mở bằng... (Open with)</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">▶</span>
                </button>

                {showOpenWith && (
                  <div className="absolute left-full top-0 ml-1 w-56 bg-zinc-950/98 border border-zinc-800 rounded-xl shadow-2xl py-1 text-xs text-zinc-300 backdrop-blur-md z-50">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800/80 mb-1">
                      Chọn ứng dụng
                    </div>
                    {openWithApps.map((app) => (
                      <button
                        key={app.path}
                        onClick={() => {
                          const targetPath = position.targetPhoto?.filePath;
                          if (targetPath && (window as any).electronAPI?.openWith) {
                            (window as any).electronAPI.openWith(targetPath, app.path);
                          }
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 text-left transition-colors text-zinc-200 truncate"
                        title={app.path}
                      >
                        <span>{app.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800/80 text-red-400 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={13} />
                <span>Xóa ảnh (Delete)</span>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">Del</span>
            </button>
          </div>
        </>
      )}

      {/* ── SUBFOLDER TARGET MENU ── */}
      {position.targetType === 'subfolder' && (
        <div className="px-1 py-1 space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 truncate">
            Thư mục: {position.targetSubfolder?.name || position.targetSubfolder?.path.split(/[\\/]/).filter(Boolean).pop()}
          </div>

          {onOpenSubfolder && position.targetSubfolder && (
            <button
              onClick={() => {
                onOpenSubfolder(position.targetSubfolder!.path);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors text-amber-300 font-semibold"
            >
              <Folder size={13} />
              <span>Mở thư mục này</span>
            </button>
          )}

          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Copy size={13} className="text-blue-400" />
              <span>Sao chép thư mục (Copy)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Ctrl+C</span>
          </button>

          <button
            onClick={() => {
              onCut();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Scissors size={13} className="text-purple-400" />
              <span>Cắt thư mục (Cut)</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Ctrl+X</span>
          </button>

          <button
            onClick={() => {
              onPaste();
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clipboard size={13} className="text-emerald-400" />
              <span>Dán vào thư mục này</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Ctrl+V</span>
          </button>

          <button
            onClick={() => {
              onToggleSubfolderFavorite?.();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
          >
            <Star size={13} className={isSubfolderFavorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'} />
            <span>{isSubfolderFavorited ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích ⭐'}</span>
          </button>

          <div className="h-px bg-zinc-800/80 my-1" />

          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-500/20 text-red-400 text-left transition-colors"
          >
            <Trash2 size={13} />
            <span>Xóa thư mục...</span>
          </button>
        </div>
      )}

      {/* ── BACKGROUND / EMPTY AREA MENU ── */}
      {position.targetType === 'background' && (
        <div className="px-1 py-1 space-y-0.5">
          <button
            onClick={() => {
              onCreateFolder();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors text-amber-300 font-semibold"
          >
            <FolderPlus size={14} />
            <span>Tạo thư mục mới...</span>
          </button>

          <button
            onClick={() => {
              if (canPaste) {
                onPaste();
                onClose();
              }
            }}
            disabled={!canPaste}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
              canPaste ? 'hover:bg-zinc-800 text-zinc-200' : 'opacity-40 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clipboard size={13} className={canPaste ? 'text-emerald-400' : ''} />
              <span>Dán (Paste)</span>
            </div>
            <span className="text-[10px] font-mono">Ctrl+V</span>
          </button>
        </div>
      )}
    </div>
  );
};
