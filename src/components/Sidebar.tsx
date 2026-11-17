import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  HardDrive,
  User,
  Monitor,
  Image as ImageIcon,
  Download,
  FileText,
  Video,
  Music,
  Plus,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Heart,
  EyeOff,
  Loader2,
  Star,
} from 'lucide-react';
import { RecentFolder, TreeNode } from '../types';

interface SidebarProps {
  onOpenFolder: (folderPath: string) => void;
  loadChildren: (folderPath: string) => Promise<TreeNode[]>;
  currentFolder: string | null;
  drives: TreeNode[];
  userFolders: TreeNode[];
  recentFolders: RecentFolder[];
  favoriteFolders: RecentFolder[];
  onToggleFavoriteFolder: (folder: { path: string; name: string }) => void;
  onClearRecentFolders: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ===================================================================
// FolderTreeNode với Nút Dấu Sao Yêu Thích ★
// ===================================================================
const FolderTreeNode = React.memo(({ node, level, currentFolder, favoriteFolders, onToggleFavoriteFolder, onOpenFolder, loadChildren }: {
  node: TreeNode;
  level: number;
  currentFolder: string | null;
  favoriteFolders: RecentFolder[];
  onToggleFavoriteFolder: (folder: { path: string; name: string }) => void;
  onOpenFolder: (path: string) => void;
  loadChildren: (path: string) => Promise<TreeNode[]>;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [children, setChildren] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenFolder(node.path);

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    if (newExpanded && !hasLoaded) {
      setIsLoading(true);
      try {
        const subs = await loadChildren(node.path);
        if (isMountedRef.current) {
          setChildren(subs);
          setHasLoaded(true);
        }
      } catch {
        if (isMountedRef.current) setChildren([]);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    }
  }, [node.path, isExpanded, hasLoaded, onOpenFolder, loadChildren]);

  const isActive = currentFolder === node.path;
  const isFavorited = favoriteFolders.some((f) => f.path === node.path);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavoriteFolder({ path: node.path, name: node.name });
  };

  return (
    <div>
      <div
        onClick={handleToggle}
        style={{ paddingLeft: `${level * 10 + 6}px` }}
        className={`
          group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer
          transition-all duration-100 mb-0.5
          ${isActive
            ? 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
          }
        `}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {node.isDrive ? (
            node.name.toLowerCase().includes('(c:)') ? (
              <Monitor
                size={14}
                className={`shrink-0 ${isActive ? 'text-cyan-300 font-bold' : 'text-cyan-400 group-hover:text-cyan-300'}`}
              />
            ) : (
              <HardDrive
                size={14}
                className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-amber-400'}`}
              />
            )
          ) : (
            <Folder
              size={14}
              className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-500/70 group-hover:text-amber-400'}`}
            />
          )}

          <span className="truncate text-[11.5px] font-medium">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Star favorite toggle */}
          <button
            onClick={handleStarClick}
            className={`p-0.5 rounded transition-all ${
              isFavorited
                ? 'opacity-100 text-amber-400'
                : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-amber-400'
            }`}
            title={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào mục yêu thích'}
          >
            <Star size={12} className={isFavorited ? 'fill-amber-400 text-amber-400' : ''} />
          </button>

          {isLoading ? (
            <Loader2 size={12} className="animate-spin text-amber-400" />
          ) : isExpanded ? (
            <ChevronDown size={12} className="text-zinc-500" />
          ) : (
            <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-zinc-800/50 ml-3">
          {isLoading ? (
            <div
              style={{ paddingLeft: `${(level + 1) * 10 + 6}px` }}
              className="flex items-center gap-1.5 text-[10.5px] text-zinc-600 italic py-1.5"
            >
              <Loader2 size={10} className="animate-spin text-amber-500/60" />
              <span>Đang đọc...</span>
            </div>
          ) : children.length > 0 ? (
            children.map((child) => (
              <FolderTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                currentFolder={currentFolder}
                favoriteFolders={favoriteFolders}
                onToggleFavoriteFolder={onToggleFavoriteFolder}
                onOpenFolder={onOpenFolder}
                loadChildren={loadChildren}
              />
            ))
          ) : hasLoaded ? (
            <div
              style={{ paddingLeft: `${(level + 1) * 10 + 6}px` }}
              className="text-[10px] text-zinc-700 italic py-1"
            >
              (Trống)
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});

export const Sidebar = React.memo<SidebarProps>(({
  onOpenFolder,
  loadChildren,
  currentFolder,
  drives,
  userFolders,
  recentFolders,
  favoriteFolders,
  onToggleFavoriteFolder,
  onClearRecentFolders,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [isThisPcOpen, setIsThisPcOpen] = useState<boolean>(true);

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('bàn làm việc') || lower.includes('desktop'))
      return <Monitor size={15} className="text-sky-400 shrink-0" />;
    if (lower.includes('tải xuống') || lower.includes('downloads'))
      return <Download size={15} className="text-emerald-400 shrink-0" />;
    if (lower.includes('tài liệu') || lower.includes('documents'))
      return <FileText size={15} className="text-blue-400 shrink-0" />;
    if (lower.includes('hình ảnh') || lower.includes('pictures'))
      return <ImageIcon size={15} className="text-cyan-400 shrink-0" />;
    if (lower.includes('nhạc') || lower.includes('music'))
      return <Music size={15} className="text-rose-400 shrink-0" />;
    if (lower.includes('video'))
      return <Video size={15} className="text-purple-400 shrink-0" />;
    if (lower.includes('thùng rác') || lower.includes('recycle'))
      return <Trash2 size={15} className="text-zinc-400 shrink-0" />;
    if (lower === 'dieppc')
      return <User size={15} className="text-amber-400 shrink-0" />;
    return <Folder size={15} className="text-amber-400/90 shrink-0" />;
  };


  if (isCollapsed) {
    return (
      <aside className="w-12 bg-zinc-950 border-r border-zinc-800/60 flex flex-col items-center py-3 z-30 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors"
          title="Mở rộng Sidebar"
        >
          <ChevronsRight size={16} />
        </button>
      </aside>
    );
  }

  const isThisPcActive = !currentFolder || currentFolder === 'THIS_PC';

  return (
    <aside className="w-60 bg-zinc-950/98 border-r border-zinc-800/60 flex flex-col text-xs text-zinc-300 select-none overflow-hidden shrink-0 z-30">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/30 shrink-0">
        <span className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Thư Mục</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 rounded transition-colors"
          title="Thu gọn"
        >
          <ChevronsLeft size={14} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-3 font-sans">

        {/* User Folders */}
        {userFolders.length > 0 && (
          <div className="space-y-0.5">
            {userFolders.map((f) => {
              const isActive = currentFolder === f.path;
              const isFavorited = favoriteFolders.some((fav) => fav.path === f.path);
              return (
                <div
                  key={f.path}
                  onClick={() => onOpenFolder(f.path)}
                  className={`
                    group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-100
                    ${isActive
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {getFolderIcon(f.name)}
                    <span className="truncate text-[11.5px] font-medium">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteFolder({ path: f.path, name: f.name });
                    }}
                    className={`p-0.5 rounded transition-all ${
                      isFavorited
                        ? 'opacity-100 text-amber-400'
                        : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-amber-400'
                    }`}
                    title={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào mục yêu thích'}
                  >
                    <Star size={12} className={isFavorited ? 'fill-amber-400 text-amber-400' : ''} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {userFolders.length > 0 && (
          <div className="border-t border-zinc-800/50 mx-1" />
        )}

        {/* This PC + Drives */}
        <div>
          <div
            onClick={() => {
              onOpenFolder('THIS_PC');
              setIsThisPcOpen((prev) => !prev);
            }}
            className={`
              flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all mb-0.5
              ${isThisPcActive
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Monitor size={13} className={isThisPcActive ? 'text-blue-400' : 'text-zinc-500'} />
              <span className="text-[11.5px] font-medium">This PC</span>
            </div>
            {isThisPcOpen
              ? <ChevronDown size={12} className="text-zinc-600" />
              : <ChevronRight size={12} className="text-zinc-600" />
            }
          </div>

          {isThisPcOpen && (
            <div className="border-l border-zinc-800/40 ml-4 pl-0 space-y-0.5 mt-0.5">
              {drives.map((drive) => (
                <FolderTreeNode
                  key={drive.path}
                  node={drive}
                  level={0}
                  currentFolder={currentFolder}
                  favoriteFolders={favoriteFolders}
                  onToggleFavoriteFolder={onToggleFavoriteFolder}
                  onOpenFolder={onOpenFolder}
                  loadChildren={loadChildren}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/50 mx-1" />

        {/* YÊU THÍCH (Favorites) */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Yêu thích ({favoriteFolders.length})
            </span>
          </div>

          {favoriteFolders.length > 0 ? (
            <div className="space-y-1">
              {favoriteFolders.map((fav) => (
                <div
                  key={fav.path}
                  onClick={() => onOpenFolder(fav.path)}
                  className={`
                    group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border
                    ${currentFolder === fav.path
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-semibold shadow-sm'
                      : 'hover:bg-white/5 border-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Folder size={13} className="text-amber-400 fill-amber-400/20 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[11px] block truncate">{fav.name}</span>
                      <span className="text-[9px] text-zinc-600 font-mono block truncate">{fav.path}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteFolder(fav);
                    }}
                    className="p-1 text-amber-400 hover:text-red-400 rounded transition-colors opacity-70 group-hover:opacity-100"
                    title="Bỏ yêu thích"
                  >
                    <Star size={12} className="fill-amber-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10.5px] text-zinc-700 italic px-1 block">
              Bấm dấu sao ★ bên cạnh bất kỳ thư mục nào để gán yêu thích
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/50 mx-1" />

        {/* Thư mục gần đây */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-zinc-600" />
              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">Gần đây</span>
            </div>
            {recentFolders.length > 0 && (
              <button
                onClick={onClearRecentFolders}
                className="text-[9.5px] text-zinc-700 hover:text-zinc-400 flex items-center gap-0.5 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>

          {recentFolders.length > 0 ? (
            <div className="space-y-1">
              {recentFolders.map((rf) => (
                <div
                  key={rf.path}
                  onClick={() => onOpenFolder(rf.path)}
                  className={`
                    flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all border
                    ${currentFolder === rf.path
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                      : 'hover:bg-white/5 border-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }
                  `}
                >
                  <Folder size={13} className="text-amber-500/70 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-[11px] block truncate">{rf.name}</span>
                    <span className="text-[9.5px] text-zinc-600 font-mono block truncate">{rf.path}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10.5px] text-zinc-700 italic px-1">Chưa có lịch sử</span>
          )}
        </div>

        <div className="h-4" />
      </div>
    </aside>
  );
});
