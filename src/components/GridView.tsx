import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Star, Check, X, Image as ImageIcon, Folder, ChevronRight, Home,
  HardDrive, Monitor, Loader2, FolderOpen, EyeOff, Target, Play, Video,
  ArrowUpDown, SlidersHorizontal, List, LayoutGrid, Copy, Edit2
} from 'lucide-react';

import { PhotoItem, SubfolderItem, TreeNode, LayoutMode, SortOptions, SortField, RecentFolder } from '../types';
import { PreviewResult } from '../utils/previewQueue';



interface GridViewProps {
  currentFolder: string | null;
  drives: TreeNode[];
  userFolders: TreeNode[];
  subfolders: SubfolderItem[];
  photos: PhotoItem[];
  selectedIndex: number;
  selectedIndices?: Set<number>;
  onSelectPhoto: (index: number, e?: React.MouseEvent) => void;
  onDoubleClickPhoto: (index: number) => void;
  onOpenFolder: (folderPath: string) => void;
  loadPreview: (filePath: string) => Promise<PreviewResult | string>;
  isLoading: boolean;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  cardSize?: number;
  onCardSizeChange?: (size: number) => void;
  sortOptions?: SortOptions;
  onSortOptionsChange?: (newSort: Partial<SortOptions>) => void;
  favoriteFolders?: RecentFolder[];
  onToggleFavoriteFolder?: (folder: { path: string; name: string }) => void;
  onContextMenu?: (e: React.MouseEvent, type: 'photo' | 'subfolder' | 'background', item?: PhotoItem | SubfolderItem, index?: number) => void;
}

// ─── Grid Columns Helper ───────────────────────────────────────────────────
export function getGridColumnsCount(): number {
  const container = document.getElementById('photos-grid-container');
  if (!container) return 5;
  const cards = container.querySelectorAll<HTMLElement>('[data-photo-card="true"]');
  if (cards.length >= 2) {
    const firstTop = cards[0].offsetTop;
    let cols = 0;
    for (let i = 0; i < cards.length; i++) {
      if (Math.abs(cards[i].offsetTop - firstTop) < 6) {
        cols++;
      } else {
        break;
      }
    }
    if (cols > 0) return cols;
  }
  const w = container.clientWidth || 1000;
  return Math.max(1, Math.floor((w + 12) / (180 + 12)));
}

// ─── Photo Card ────────────────────────────────────────────────────────────
const PhotoCard = React.memo(({
  photo,
  index,
  isSelected,
  onSelectPhoto,
  onDoubleClickPhoto,
  loadPreview,
  onContextMenu
}: {
  photo: PhotoItem;
  index: number;
  isSelected: boolean;
  onSelectPhoto: (index: number, e: React.MouseEvent) => void;
  onDoubleClickPhoto: (index: number) => void;
  loadPreview: (filePath: string) => Promise<PreviewResult | string>;
  onContextMenu?: (e: React.MouseEvent, photo: PhotoItem, index: number) => void;
}) => {

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [orientation, setOrientation] = useState<number>(1);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(index < 24); // 24 ảnh đầu tiên hiển thị tức thì
  const cardRef = useRef<HTMLDivElement>(null);

  // 🚀 IntersectionObserver: Chỉ nạp ảnh khi thẻ xuất hiện gần màn hình (loại bỏ 100% xoay tròn chờ đợi)
  useEffect(() => {
    if (isVisible) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let isMounted = true;

    loadPreview(photo.filePath).then((res) => {
      if (!isMounted) return;
      const url = typeof res === 'string' ? res : res?.url;
      const ori = typeof res === 'string' ? photo.orientation || 1 : res?.orientation || photo.orientation || 1;

      if (url) {
        setPreviewUrl(url);
        setOrientation(ori);
        photo.previewUrl = url;
      } else if (window.electronAPI) {
        // Fallback: Tự động lấy Base64 trực tiếp nếu xem trước rỗng
        window.electronAPI.getBase64Data(photo.filePath).then((b64: string | null) => {
          if (isMounted && b64) {
            setPreviewUrl(b64);
            setOrientation(ori);
            photo.previewUrl = b64;
          }
        });
      }
    });
    return () => { isMounted = false; };
  }, [photo.filePath, loadPreview, photo.orientation, isVisible]);




  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  }, [isSelected]);

  const colorBarClass: Record<string, string> = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  const getRotationDeg = (ori: number) => {
    switch (ori) {
      case 6: return 90;
      case 3: return 180;
      case 8: return 270;
      default: return 0;
    }
  };

  const rotationDeg = getRotationDeg(orientation);

  return (
    <div
      ref={cardRef}
      data-photo-card="true"
      data-photo-index={index}
      onClick={(e) => onSelectPhoto(index, e)}
      onDoubleClick={() => onDoubleClickPhoto(index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, photo, index);
      }}

      className={`
        group relative rounded-xl overflow-hidden cursor-pointer flex flex-col
        transition-all duration-150 h-[180px]
        ${isSelected
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.25)] scale-[1.02] z-10'
          : 'border border-zinc-800/80 hover:border-zinc-700 hover:scale-[1.01] hover:shadow-lg hover:shadow-black/30'
        }
      `}
      style={{ contain: 'layout paint', willChange: 'transform' }}
    >
      {/* Image container */}
      <div className="relative flex-1 bg-zinc-900 overflow-hidden flex items-center justify-center">
        {photo.colorLabel !== 'none' && (
          <div className={`absolute top-0 left-0 right-0 h-1 z-20 ${colorBarClass[photo.colorLabel] || ''}`} />
        )}

        {photo.isVideo ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-1 relative bg-black">
            {isHovered || isSelected ? (
              <video
                src={previewUrl ? (previewUrl.includes('#t=') ? previewUrl : `${previewUrl}#t=0.5`) : `file://${photo.filePath.replace(/\\/g, '/')}#t=0.5`}
                className="w-full h-full object-cover pointer-events-none"
                preload="metadata"
                muted
              />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={photo.fileName}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover pointer-events-none opacity-80"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <Video size={24} className="text-purple-400/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-all">
              <div className="w-9 h-9 rounded-full bg-purple-600/90 border border-purple-400/80 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                <Play size={18} className="fill-white ml-0.5" />
              </div>
            </div>
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-purple-600/90 backdrop-blur-sm text-white font-mono text-[9px] font-extrabold rounded border border-purple-400/40 flex items-center gap-1 shadow-md">
              <Play size={9} className="fill-white" />
              <span>VIDEO ({photo.fileType})</span>
            </span>
          </div>
        ) : previewUrl ? (

          <div className="w-full h-full flex items-center justify-center overflow-hidden p-1">
            <img
              src={previewUrl}
              alt={photo.fileName}
              style={{
                imageOrientation: 'none',
                transform: rotationDeg ? `rotate(${rotationDeg}deg)` : 'none',
                maxWidth: rotationDeg % 180 !== 0 ? '75%' : '100%',
                maxHeight: rotationDeg % 180 !== 0 ? '75%' : '100%',
              }}

              className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </div>
        ) : (

          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Loader2 size={20} className="animate-spin text-zinc-700" />
          </div>
        )}


        {/* Best Shot Badge ⭐ */}
        {photo.isBestShot && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 px-2 py-0.5 rounded-md text-[9.5px] font-black tracking-wide shadow-xl z-20 flex items-center gap-1 border border-yellow-200">
            <span>⭐</span>
            <span>BEST SHOT</span>
            {photo.burstGroupCount && photo.burstGroupCount > 1 && (
              <span className="text-[8.5px] bg-black/25 px-1 py-0.2 rounded font-bold text-zinc-950">
                1/{photo.burstGroupCount}
              </span>
            )}
          </div>
        )}

        {/* Burst Series Indicator 📸 */}
        {photo.burstGroupCount && photo.burstGroupCount > 1 && !photo.isBestShot && (
          <div
            className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-zinc-200 px-1.5 py-0.5 rounded text-[9px] font-mono border border-zinc-700/70 z-10 flex items-center gap-1 shadow-md"
            title={`Loạt chụp liên tục: ${photo.burstGroupIndex || 1}/${photo.burstGroupCount}`}
          >
            <span>📸</span>
            <span>{photo.burstGroupIndex || 1}/{photo.burstGroupCount}</span>
          </div>
        )}

        {/* Overlays */}
        {photo.isTagged && !photo.isBestShot && (
          <div className="absolute top-2 left-2 bg-amber-400 text-black p-1 rounded-md shadow-lg z-10">
            <Check size={11} strokeWidth={3} />
          </div>
        )}
        {photo.isRejected && (
          <div className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-md shadow-lg z-10">
            <X size={11} strokeWidth={3} />
          </div>
        )}

        {/* AI Blink Warning Badge */}
        {photo.aiData?.isBlink && (
          <div className="absolute top-2 right-2 bg-red-600/90 text-white px-1.5 py-0.5 rounded-md text-[9.5px] font-bold shadow-lg z-10 flex items-center gap-1 border border-red-400/50 animate-pulse" title="Cảnh báo: AI phát hiện nhắm mắt!">
            <EyeOff size={11} />
            <span>Nhắm mắt</span>
          </div>
        )}

        {/* AI Sharpness / Focus Score Badge */}
        {photo.aiData?.sharpnessScore !== undefined && !photo.aiData?.isBlink && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold shadow-md z-10 flex items-center gap-0.5 border ${
            photo.aiData.isMotionBlur
              ? 'bg-amber-500/30 border-amber-500/60 text-amber-300'
              : photo.aiData.isBlurry
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : photo.aiData.sharpnessScore > 75
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
          }`}>
            <Target size={10} />
            <span>{photo.aiData.sharpnessScore}% {photo.aiData.isMotionBlur ? 'Rung tay' : photo.aiData.isBlurry ? 'Mờ' : 'Nét'}</span>
          </div>
        )}

        {photo.isRaw && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/75 backdrop-blur-sm text-blue-300 font-mono text-[9px] font-bold rounded border border-blue-500/30">
            {photo.fileType}
          </span>
        )}

        {photo.isDesign && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-purple-950/85 backdrop-blur-sm text-purple-300 font-mono text-[9px] font-bold rounded border border-purple-500/40 flex items-center gap-1">
            <span>🎨</span>
            <span>{photo.fileType}</span>
          </span>
        )}


        {/* Multi-select overlay indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />
        )}
      </div>

      {/* Footer */}
      <div className="photo-card-footer px-2 py-1.5 bg-zinc-900/95 border-t border-zinc-800/60 flex items-center justify-between gap-1 shrink-0 transition-colors">
        <span className="photo-card-filename font-mono text-[10px] text-zinc-400 truncate flex-1 font-semibold" title={photo.fileName}>
          {photo.fileName}
        </span>
        {photo.rating > 0 && (
          <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
            <Star size={10} className="fill-amber-400" />
            <span className="text-[10px] font-bold">{photo.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.photo.id === nextProps.photo.id &&
         prevProps.index === nextProps.index &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.photo.isBestShot === nextProps.photo.isBestShot &&
         prevProps.photo.burstGroupId === nextProps.photo.burstGroupId &&
         prevProps.photo.burstGroupCount === nextProps.photo.burstGroupCount &&
         prevProps.photo.burstGroupIndex === nextProps.photo.burstGroupIndex &&
         prevProps.photo.rating === nextProps.photo.rating &&
         prevProps.photo.colorLabel === nextProps.photo.colorLabel &&
         prevProps.photo.isTagged === nextProps.photo.isTagged &&
         prevProps.photo.isRejected === nextProps.photo.isRejected &&
         prevProps.photo.aiData === nextProps.photo.aiData &&
         prevProps.photo.orientation === nextProps.photo.orientation;
});

// ─── Subfolder Card ────────────────────────────────────────────────────────
// Double click to open folder as requested by user
const SubfolderCard = React.memo(({ sub, onOpen, isFavorited, onToggleFavorite, onContextMenu }: {
  sub: SubfolderItem;
  onOpen: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, sub: SubfolderItem) => void;
}) => {
  const displayName = (sub.name && sub.name.trim())
    || (sub.path ? sub.path.split(/[\\/]/).filter(Boolean).pop() : '')
    || 'Thư mục';

  return (
    <div
      onDoubleClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, sub);
      }}
      title={`${displayName}\nĐường dẫn: ${sub.path}\nClick đúp để mở`}
      className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none border min-w-0 ${
        isFavorited
          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/5'
          : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800/60 hover:border-amber-500/40 hover:shadow-md'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">
        <Folder size={17} className="text-amber-400 fill-amber-400/20" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[12px] font-bold text-zinc-100 group-hover:text-amber-300 truncate transition-colors leading-tight">
          {displayName}
        </p>
        <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate leading-none">Click đúp để mở</p>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className={`p-1 rounded-md transition-all ${
              isFavorited
                ? 'text-amber-400 bg-amber-500/25 border border-amber-500/40 shadow-sm'
                : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 border border-transparent'
            }`}
            title={isFavorited ? 'Bỏ thư mục yêu thích ⭐' : 'Đánh dấu thư mục yêu thích ⭐'}
          >
            <Star
              size={13}
              className={isFavorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-500 hover:text-amber-400'}
            />
          </button>
        )}
        <ChevronRight size={13} className="text-zinc-600 group-hover:text-amber-400 transition-colors" />
      </div>
    </div>
  );
});

// ─── Drive Card (This PC view) ─────────────────────────────────────────────
const DriveCard = React.memo(({ drive, onOpen }: { drive: TreeNode; onOpen: () => void }) => (
  <div
    onDoubleClick={onOpen}
    className="group flex items-center gap-4 p-4 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md hover:shadow-amber-500/5 select-none"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:from-amber-500/30 transition-all">
      <HardDrive size={22} className="text-amber-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 truncate transition-colors">
        {drive.name}
      </p>
      <p className="text-[11px] text-zinc-600 font-mono mt-0.5 truncate">{drive.path}</p>
      <p className="text-[9.5px] text-zinc-500 mt-1">Click đúp để mở ổ đĩa</p>
    </div>
  </div>
));

// ─── Loading Skeleton ──────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
    {Array.from({ length: 18 }).map((_, i) => (
      <div key={i} className="rounded-xl overflow-hidden h-[180px] bg-zinc-900 border border-zinc-800/60 animate-pulse">
        <div className="flex-1 bg-zinc-800/60 h-[140px]" />
        <div className="px-2 py-1.5 bg-zinc-900 h-10">
          <div className="h-2 bg-zinc-800 rounded w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Main GridView ─────────────────────────────────────────────────────────
export const GridView: React.FC<GridViewProps> = ({
  currentFolder,
  drives,
  userFolders,
  subfolders,
  photos,
  selectedIndex,
  selectedIndices,
  onSelectPhoto,
  onDoubleClickPhoto,
  onOpenFolder,
  loadPreview,
  isLoading,
  layoutMode = 'grid',
  onLayoutModeChange,
  cardSize = 180,
  onCardSizeChange,
  sortOptions,
  onSortOptionsChange,
  favoriteFolders,
  onToggleFavoriteFolder,
  onContextMenu,
}) => {




  // Tự động nạp toàn bộ danh sách ảnh trong thư mục (Auto-load all photos)
  const [displayCount, setDisplayCount] = useState<number>(() => photos.length || 500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayCount(photos.length);
  }, [photos.length, currentFolder]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 800) {
      setDisplayCount((prev) => Math.min(photos.length, prev + 300));
    }
  }, [photos.length]);


  const breadcrumbs = React.useMemo(() => {
    if (!currentFolder || currentFolder === 'THIS_PC') return [];
    const parts = currentFolder.split(/[\\\/]/).filter(Boolean);
    const crumbs: { name: string; path: string }[] = [];
    let accPath = '';
    parts.forEach((part, idx) => {
      if (idx === 0 && part.includes(':')) {
        accPath = `${part}\\`;
      } else {
        accPath = accPath ? (accPath.endsWith('\\') ? accPath + part : accPath + '\\' + part) : part;
      }
      crumbs.push({ name: part, path: accPath });
    });
    return crumbs;
  }, [currentFolder]);


  // ── THIS PC View ─────────────────────────────────────────────────────────
  if (!currentFolder || currentFolder === 'THIS_PC') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        <BreadcrumbBar
          currentFolder={currentFolder}
          breadcrumbs={[]}
          onOpenFolder={onOpenFolder}
          sortOptions={sortOptions}
          onSortOptionsChange={onSortOptionsChange}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          cardSize={cardSize}
          onCardSizeChange={onCardSizeChange}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HardDrive size={18} className="text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Ổ đĩa lưu trữ ({drives.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {drives.map((drive) => (
                <DriveCard key={drive.path} drive={drive} onOpen={() => onOpenFolder(drive.path)} />
              ))}
            </div>
          </div>

          {userFolders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pt-4 border-t border-zinc-800/60">
                <Monitor size={18} className="text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Thư mục người dùng
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {userFolders.map((uf) => (
                  <div
                    key={uf.path}
                    onDoubleClick={() => onOpenFolder(uf.path)}
                    className="group flex flex-col items-center gap-2 p-3 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-blue-500/30 rounded-xl cursor-pointer transition-all text-center select-none"
                  >
                    <Folder size={24} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                    <span className="text-[11px] font-medium text-zinc-300 group-hover:text-zinc-100 truncate w-full transition-colors">
                      {uf.name}
                    </span>
                    <span className="text-[9px] text-zinc-600">Click đúp để mở</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <BreadcrumbBar
          currentFolder={currentFolder}
          breadcrumbs={breadcrumbs}
          onOpenFolder={onOpenFolder}
          sortOptions={sortOptions}
          onSortOptionsChange={onSortOptionsChange}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          cardSize={cardSize}
          onCardSizeChange={onCardSizeChange}
        />
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-medium">Đang đọc thư mục...</span>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const visiblePhotos = photos.slice(0, displayCount);
  const hasSubfolders = subfolders.length > 0;
  const hasPhotos = photos.length > 0;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!hasSubfolders && !hasPhotos) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <BreadcrumbBar
          currentFolder={currentFolder}
          breadcrumbs={breadcrumbs}
          onOpenFolder={onOpenFolder}
          sortOptions={sortOptions}
          onSortOptionsChange={onSortOptionsChange}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          cardSize={cardSize}
          onCardSizeChange={onCardSizeChange}
        />

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mb-5">
            <FolderOpen size={36} className="text-zinc-700" />
          </div>
          <p className="text-base font-semibold text-zinc-400 mb-1">Thư mục này trống</p>
          <p className="text-xs text-zinc-600">Không có ảnh hoặc thư mục con được hỗ trợ</p>
          <p className="text-[11px] text-zinc-700 mt-1">
            Hỗ trợ: JPG, PNG, HEIC, CR2, CR3, NEF, ARW, DNG, RAF và các định dạng RAW khác
          </p>
        </div>
      </div>
    );
  }

  // ── Normal view ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <BreadcrumbBar
        currentFolder={currentFolder}
        breadcrumbs={breadcrumbs}
        onOpenFolder={onOpenFolder}
        sortOptions={sortOptions}
        onSortOptionsChange={onSortOptionsChange}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        cardSize={cardSize}
        onCardSizeChange={onCardSizeChange}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e, 'background');
        }}
        className="flex-1 overflow-y-auto p-4 space-y-5 photo-grid-scroll"
      >
        {/* Subfolders */}
        {hasSubfolders && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Folder size={14} className="text-amber-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Thư mục con ({subfolders.length}) <span className="font-normal text-zinc-600 lowercase">— click đúp để mở</span>
              </h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
              {subfolders.map((sub) => {
                const isFavorited = favoriteFolders?.some((fav) => fav.path === sub.path);
                return (
                  <SubfolderCard
                    key={sub.path}
                    sub={sub}
                    onOpen={() => onOpenFolder(sub.path)}
                    isFavorited={isFavorited}
                    onToggleFavorite={() =>
                      onToggleFavoriteFolder &&
                      onToggleFavoriteFolder({ path: sub.path, name: sub.name })
                    }
                    onContextMenu={(e, subItem) => onContextMenu?.(e, 'subfolder', subItem)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Photos */}
        {hasPhotos && (
          <div>
            {hasSubfolders && (
              <div className="flex items-center gap-2 mb-3 pt-3 border-t border-zinc-800/50">
                <ImageIcon size={14} className="text-blue-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Hình ảnh ({photos.length})
                </h3>
              </div>
            )}
            {!hasSubfolders && (
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={14} className="text-blue-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Hình ảnh ({photos.length})
                </h3>
              </div>
            )}

            <div
              id="photos-grid-container"
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize || 180}px, 1fr))`,
              }}
            >
              {visiblePhotos.map((photo, index) => {
                const isSelected = selectedIndices
                  ? selectedIndices.has(index)
                  : index === selectedIndex;
                return (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={index}
                    isSelected={isSelected}
                    onSelectPhoto={onSelectPhoto}
                    onDoubleClickPhoto={onDoubleClickPhoto}
                    loadPreview={loadPreview}
                    onContextMenu={(e, pItem, idx) => onContextMenu?.(e, 'photo', pItem, idx)}
                  />
                );
              })}
            </div>



            {displayCount < photos.length && (
              <div className="py-6 flex justify-center">
                <button
                  onClick={() => setDisplayCount(photos.length)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  ⚡ Nạp ngay toàn bộ ({photos.length - displayCount} ảnh còn lại)
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

// ─── Breadcrumb Bar ────────────────────────────────────────────────────────
const BreadcrumbBar: React.FC<{
  currentFolder: string | null;
  breadcrumbs: { name: string; path: string }[];
  onOpenFolder: (path: string) => void;
  sortOptions?: SortOptions;
  onSortOptionsChange?: (newSort: Partial<SortOptions>) => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  cardSize?: number;
  onCardSizeChange?: (size: number) => void;
}> = ({
  currentFolder,
  breadcrumbs,
  onOpenFolder,
  sortOptions,
  onSortOptionsChange,
  layoutMode = 'grid',
  onLayoutModeChange,
  cardSize = 180,
  onCardSizeChange,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [copied, setCopied] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentFolder && currentFolder !== 'THIS_PC') {
      setPathInput(currentFolder);
    } else {
      setPathInput('This PC');
    }
  }, [currentFolder]);

  useEffect(() => {
    if (isEditingPath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingPath]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentFolder && currentFolder !== 'THIS_PC') {
      navigator.clipboard.writeText(currentFolder);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      onOpenFolder(pathInput.trim());
      setIsEditingPath(false);
    }
  };

  return (
    <div className="px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between gap-2 text-xs text-zinc-400 shrink-0 select-none">
      {/* Path Bar (Windows Explorer Editable & Copyable Style) */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0 mr-2">
        {isEditingPath ? (
          <form onSubmit={handlePathSubmit} className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingPath(false);
              }}
              onBlur={() => setIsEditingPath(false)}
              className="flex-1 px-2.5 py-1 bg-zinc-950 border border-amber-500/80 text-zinc-100 rounded-lg text-xs font-mono outline-none shadow-inner"
              placeholder="Nhập đường dẫn thư mục..."
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              Đi
            </button>
          </form>
        ) : (
          <div
            onClick={() => setIsEditingPath(true)}
            className="flex-1 flex items-center gap-1 overflow-x-auto sidebar-scroll whitespace-nowrap py-1 px-2 rounded-lg hover:bg-zinc-800/40 cursor-text transition-colors border border-transparent hover:border-zinc-800 group"
            title="Click để chỉnh sửa hoặc dán đường dẫn (Ctrl+C / Ctrl+V)"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFolder('THIS_PC');
              }}
              className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors shrink-0 font-medium"
            >
              <Home size={13} />
              <span>This PC</span>
            </button>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                <ChevronRight size={11} className="text-zinc-600 shrink-0" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFolder(crumb.path);
                  }}
                  className={`hover:text-amber-400 transition-colors shrink-0 ${
                    i === breadcrumbs.length - 1 ? 'font-bold text-zinc-100' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}

            {/* Quick Edit Pencil Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingPath(true);
              }}
              className="ml-2 opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-amber-400 transition-all"
              title="Chỉnh sửa đường dẫn"
            >
              <Edit2 size={11} />
            </button>

            {/* Copy Path Button */}
            {currentFolder && currentFolder !== 'THIS_PC' && (
              <button
                onClick={handleCopyPath}
                className="ml-auto p-1 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 rounded transition-all shrink-0 flex items-center gap-1 text-[10.5px]"
                title="Sao chép đường dẫn (Copy path)"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* SẮP XẾP & BỐ CỤC shifted FAR RIGHT */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
        {/* SẮP XẾP Dropdown */}
        {sortOptions && onSortOptionsChange && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowLayoutMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition-all ${
                showSortMenu
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Sắp xếp danh sách (Tên, Ngày, Dung lượng, Sao...)"
            >
              <ArrowUpDown size={13} className="text-amber-400" />
              <span>Sắp xếp</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-1.5 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 text-[11.5px] text-zinc-300 divide-y divide-zinc-800/60 font-sans">
                <div className="px-1 py-1">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500">Sắp xếp theo</div>
                  {[
                    { id: 'name', label: 'Tên' },
                    { id: 'date', label: 'Ngày sửa đổi' },
                    { id: 'size', label: 'Kích cỡ (Dung lượng)' },
                    { id: 'type', label: 'Loại (Định dạng)' },
                    { id: 'rating', label: 'Số Sao (Rating ⭐)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSortOptionsChange({ field: item.id as SortField });
                        setShowSortMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
                    >
                      <span>{item.label}</span>
                      {sortOptions.field === item.id && <Check size={13} className="text-amber-400" />}
                    </button>
                  ))}
                </div>

                <div className="px-1 py-1">
                  <button
                    onClick={() => {
                      onSortOptionsChange({ order: 'asc' });
                      setShowSortMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
                  >
                    <span>Tăng dần (A-Z, 0-9)</span>
                    {sortOptions.order === 'asc' && <Check size={13} className="text-amber-400" />}
                  </button>
                  <button
                    onClick={() => {
                      onSortOptionsChange({ order: 'desc' });
                      setShowSortMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
                  >
                    <span>Giảm dần (Z-A, 9-0)</span>
                    {sortOptions.order === 'desc' && <Check size={13} className="text-amber-400" />}
                  </button>
                </div>

                <div className="px-1 py-1">
                  <button
                    onClick={() => {
                      onSortOptionsChange({ foldersFirst: !sortOptions.foldersFirst });
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors"
                  >
                    <span>Sắp xếp thư mục lên đầu</span>
                    {sortOptions.foldersFirst && <Check size={13} className="text-amber-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BỐ CỤC Dropdown (Tối giản theo yêu cầu: chỉ có thanh trượt kích cỡ thumbnail) */}
        {onCardSizeChange && (
          <div className="relative" ref={layoutRef}>
            <button
              onClick={() => {
                setShowLayoutMenu(!showLayoutMenu);
                setShowSortMenu(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition-all ${
                showLayoutMenu
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Điều chỉnh kích cỡ ảnh Thumbnail"
            >
              <SlidersHorizontal size={13} className="text-amber-400" />
              <span>Bố cục</span>
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 text-[11.5px] text-zinc-300 font-sans">
                <div>
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400 mb-2">
                    <span>Kích cỡ Thumbnail</span>
                    <span className="font-mono text-amber-400 font-bold">{cardSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={120}
                    max={320}
                    step={10}
                    value={cardSize}
                    onChange={(e) => onCardSizeChange(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9.5px] text-zinc-500 mt-2 font-mono">
                    <span>Nhỏ (120px)</span>
                    <span>Vừa (180px)</span>
                    <span>Lớn (320px)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


