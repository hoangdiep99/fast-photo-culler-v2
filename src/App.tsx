import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GridView } from './components/GridView';
import { ImageViewer } from './components/ImageViewer';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { CompareView } from './components/CompareView';
import { BatchRenameModal } from './components/BatchRenameModal';
import { ExtractJpgModal } from './components/ExtractJpgModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ContextMenu, ContextMenuPosition } from './components/ContextMenu';
import { CreateFolderModal } from './components/CreateFolderModal';
import { FaceZoomPanel } from './components/FaceZoomPanel';
import { analyzeBurstGroups } from './utils/burstGroupEngine';






import { PhotoItem, SubfolderItem, FilterState, CullingStats, TreeNode, ColorLabel, RecentFolder, RawPreviewResolution, SortOptions, LayoutMode, ThemeMode } from './types';


import { previewQueue, PreviewResult } from './utils/previewQueue';
import { analyzeImageQuality } from './utils/aiDetection';

const filenameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const RECENT_KEY = 'fast_photo_culler_recent_folders';
const FAVORITES_KEY = 'fast_photo_culler_favorites';
const LAST_FOLDER_KEY = 'fast_photo_culler_last_folder';

const DEFAULT_DRIVES: TreeNode[] = [
  { name: 'win 11 (C:)', path: 'C:\\', isDrive: true },
  { name: 'tai nguyen (E:)', path: 'E:\\', isDrive: true },
  { name: 'anh goc (F:)', path: 'F:\\', isDrive: true },
  { name: 'mac (G:)', path: 'G:\\', isDrive: true },
  { name: 'hoc (H:)', path: 'H:\\', isDrive: true },
  { name: 'Studio (I:)', path: 'I:\\', isDrive: true },
  { name: 'Du lieu anh (J:)', path: 'J:\\', isDrive: true },
];

export const App: React.FC = () => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_FOLDER_KEY) || 'THIS_PC';
    } catch { return 'THIS_PC'; }
  });
  const [userFolders, setUserFolders] = useState<TreeNode[]>([]);
  const [drives, setDrives] = useState<TreeNode[]>(DEFAULT_DRIVES);
  const [subfolders, setSubfolders] = useState<SubfolderItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selection states
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set([0]));
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number>(0);
  const pendingSelectPathRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'viewer' | 'compare'>('grid');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isBatchRenameModalOpen, setIsBatchRenameModalOpen] = useState<boolean>(false);
  const [isExtractJpgModalOpen, setIsExtractJpgModalOpen] = useState<boolean>(false);


  const [rawResolution, setRawResolution] = useState<RawPreviewResolution>('max');
  const [eyeThresholdPct, setEyeThresholdPctState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fast_photo_culler_eye_threshold');
      return saved ? Number(saved) : 35;
    } catch { return 35; }
  });

  const setEyeThresholdPct = useCallback((val: number) => {
    setEyeThresholdPctState(val);
    try {
      localStorage.setItem('fast_photo_culler_eye_threshold', val.toString());
    } catch {}
  }, []);

  const [isFacePanelOpen, setIsFacePanelOpen] = useState<boolean>(true);

  // Thư mục yêu thích (Bookmarks)
  const [favoriteFolders, setFavoriteFolders] = useState<RecentFolder[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleFavoriteFolder = useCallback((folder: { path: string; name: string }) => {
    setFavoriteFolders((prev) => {
      const exists = prev.some((item) => item.path === folder.path);
      let updated: RecentFolder[];
      if (exists) {
        updated = prev.filter((item) => item.path !== folder.path);
      } else {
        updated = [{ path: folder.path, name: folder.name, lastOpened: Date.now() }, ...prev];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Thư mục gần đây
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addRecentFolder = (folderPath: string) => {
    if (folderPath === 'THIS_PC') return;
    const name = folderPath.split(/[\\\/]/).filter(Boolean).pop() || folderPath;
    setRecentFolders((prev) => {
      const filtered = prev.filter((item) => item.path !== folderPath);
      const updated = [{ path: folderPath, name, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearRecentFolders = () => {
    setRecentFolders([]);
    localStorage.removeItem(RECENT_KEY);
  };

  // Theme Mode State ('dark' | 'light' | 'system')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('app_theme_mode') as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const effectiveTheme = useMemo(() => {
    if (themeMode === 'system') return systemIsDark ? 'dark' : 'light';
    return themeMode;
  }, [themeMode, systemIsDark]);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('app_theme_mode', mode);
    } catch {}
  }, []);


  // Khởi tải danh sách ổ đĩa & Tự động khôi phục thư mục cuối cùng khi khởi động
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDrivesAndUserFolders().then((res: any) => {
        if (res) {
          if (res.userFolders?.length > 0) setUserFolders(res.userFolders);
          if (res.drives?.length > 0) setDrives(res.drives);
        }
      }).catch(() => {});
    }

    const savedLastFolder = localStorage.getItem(LAST_FOLDER_KEY);
    if (savedLastFolder && savedLastFolder !== 'THIS_PC') {
      openFolderByPath(savedLastFolder);
    }
  }, []);

  const loadChildren = useCallback(async (folderPath: string): Promise<TreeNode[]> => {
    if (!window.electronAPI) return [];
    try {
      const subs = await window.electronAPI.readSubfolders(folderPath);
      return subs || [];
    } catch {
      return [];
    }
  }, []);

  // Bộ lọc & Sắp xếp chuẩn Windows 11
  const [filter, setFilter] = useState<FilterState>({
    rating: 'all',
    pickStatus: 'all',
    colorLabel: 'all',
    hideRejected: false,
    rawOnly: false,
    searchQuery: '',
    aiFilter: 'all',
  });

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    order: 'asc',
    foldersFirst: true,
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [cardSize, setCardSize] = useState<number>(180);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Context Menu, Clipboard & Create Folder Modal State
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [clipboard, setClipboard] = useState<{ files: string[]; action: 'copy' | 'cut' } | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState<boolean>(false);
  const [targetFolderForAction, setTargetFolderForAction] = useState<string | null>(null);

  // 🚀 Resizable Preview Panel Sidebar layout states & handlers
  const [facePanelWidth, setFacePanelWidth] = useState<number>(() => {
    try {
      const savedWidth = localStorage.getItem('fast_photo_culler_face_panel_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (parsed > 200 && parsed < window.innerWidth * 0.6) {
          return parsed;
        }
      }
    } catch {}
    return 320;
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    // Limit width between 200px and 60% of viewport width
    if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
      setFacePanelWidth(newWidth);
      try {
        localStorage.setItem('fast_photo_culler_face_panel_width', newWidth.toString());
      } catch {}
    }
  }, [isResizing]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, resize, stopResize]);





  // 🤖 AI Scanning State & Progress (Mặc định chạy khi người dùng bấm, không nghẽn luồng mở thư mục)
  const [isAIScanning, setIsAIScanning] = useState<boolean>(false);
  const [aiScanProgress, setAIScanProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const isScanningRef = useRef<boolean>(false);

  // AI Background Scan Loop (Tối ưu Non-blocking Multi-threaded GPU Yield)
  useEffect(() => {
    if (!isAIScanning || photos.length === 0 || isScanningRef.current) return;

    const unscanned = photos.filter((p) => !p.aiData);
    if (unscanned.length === 0) {
      setIsAIScanning(false);
      return;
    }

    isScanningRef.current = true;
    let isCancelled = false;

    (async () => {
      const CONCURRENCY = 6;
      let accumulatedUpdates: { id: string; filePath: string; fileName: string; aiRes: any }[] = [];

      for (let i = 0; i < photos.length; i += CONCURRENCY) {
        if (isCancelled || !isAIScanning) break;

        const batch = photos.slice(i, i + CONCURRENCY).filter((p) => !p.aiData);
        if (batch.length === 0) {
          setAIScanProgress({ processed: Math.min(i + CONCURRENCY, photos.length), total: photos.length });
          continue;
        }

        const batchResults = await Promise.all(
          batch.map(async (p) => {
            try {
              const previewRes = await previewQueue.load(p.filePath);
              const url = typeof previewRes === 'string' ? previewRes : previewRes.url;
              if (url) {
                const aiRes = await analyzeImageQuality(url, p.exif?.width, p.exif?.height, eyeThresholdPct);
                return { id: p.id, filePath: p.filePath, fileName: p.fileName, aiRes };
              }
            } catch (e) {}
            return null;
          })
        );

        if (isCancelled) break;

        const validResults = batchResults.filter(Boolean) as { id: string; filePath: string; fileName: string; aiRes: any }[];
        if (validResults.length > 0) {
          accumulatedUpdates.push(...validResults);

          // Cập nhật State React theo cụm 18 ảnh/lần và tự động xếp hạng lại Best Shot
          if (accumulatedUpdates.length >= 18 || i + CONCURRENCY >= photos.length) {
            const resMap = new Map(accumulatedUpdates.map((r) => [r.id, r.aiRes]));
            setPhotos((prev) => {
              const merged = prev.map((item) => (resMap.has(item.id) ? { ...item, aiData: resMap.get(item.id) } : item));
              const { photos: reAnalyzed } = analyzeBurstGroups(merged);
              return reAnalyzed;
            });

            // 💾 Lưu kết quả AI vào đĩa
            if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
              const aiUpdates: Record<string, any> = {};
              accumulatedUpdates.forEach((r) => {
                aiUpdates[r.filePath] = { aiData: r.aiRes };
              });
              (window.electronAPI as any).batchSavePhotoMeta(aiUpdates);
            }
            accumulatedUpdates = [];
          }
        }

        setAIScanProgress({ processed: Math.min(i + CONCURRENCY, photos.length), total: photos.length });
        // Nhường luồng cho GPU & UI xử lý phím tắt mượt mà
        await new Promise((r) => setTimeout(r, 16));
      }

      if (accumulatedUpdates.length > 0) {
        const resMap = new Map(accumulatedUpdates.map((r) => [r.id, r.aiRes]));
        setPhotos((prev) => {
          const merged = prev.map((item) => (resMap.has(item.id) ? { ...item, aiData: resMap.get(item.id) } : item));
          const { photos: reAnalyzed } = analyzeBurstGroups(merged);
          return reAnalyzed;
        });
      }

      isScanningRef.current = false;
    })();

    return () => {
      isCancelled = true;
      isScanningRef.current = false;
    };
  }, [isAIScanning, photos.length, eyeThresholdPct]);


  // Lọc & Sắp xếp danh sách ảnh theo chuẩn Windows 11
  const filteredPhotos = useMemo(() => {
    const query = filter.searchQuery.trim().toLowerCase();
    const searchTokens = query ? query.split(/[\s,;\r\n]+/).filter(Boolean) : [];
    
    const list = photos.filter((p) => {
      if (searchTokens.length > 0) {
        const fileNameLower = p.fileName.toLowerCase();
        const matchAny = searchTokens.some((token) => fileNameLower.includes(token));
        if (!matchAny) return false;
      }

      if (filter.aiFilter && filter.aiFilter !== 'all') {
        if (filter.aiFilter === 'best' && !p.isBestShot) return false;
        if (filter.aiFilter === 'blink' && !p.aiData?.isBlink && p.aiData?.eyeStatus !== 'CLOSED') return false;
        if (filter.aiFilter === 'open' && (p.aiData?.isBlink || p.aiData?.eyeStatus === 'CLOSED')) return false;
        if (filter.aiFilter === 'blurry' && !p.aiData?.isBlurry) return false;
        if (filter.aiFilter === 'sharp' && (p.aiData?.isBlink || (p.aiData?.sharpnessScore || 0) < 70)) return false;
      }

      if (filter.rating !== 'all') {
        if (filter.rating === 'unrated' && p.rating !== 0) return false;
        if (filter.rating === 'gte3' && p.rating < 3) return false;
        if (typeof filter.rating === 'number' && p.rating !== filter.rating) return false;
      }
      if (filter.pickStatus === 'pick' && !p.isTagged) return false;
      if (filter.pickStatus === 'reject' && !p.isRejected) return false;
      if (filter.pickStatus === 'unpicked' && (p.isTagged || p.isRejected)) return false;
      if (filter.colorLabel !== 'all' && p.colorLabel !== filter.colorLabel) return false;
      if (filter.hideRejected && p.isRejected) return false;
      if (filter.rawOnly && !p.isRaw) return false;
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortOptions.field === 'name') {
        cmp = filenameCollator.compare(a.fileName, b.fileName);
      } else if (sortOptions.field === 'date') {
        cmp = (a.dateModified || '').localeCompare(b.dateModified || '');
      } else if (sortOptions.field === 'size') {
        cmp = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortOptions.field === 'type') {
        cmp = a.fileType.localeCompare(b.fileType);
      } else if (sortOptions.field === 'rating') {
        cmp = a.rating - b.rating;
      }
      return sortOptions.order === 'asc' ? cmp : -cmp;
    });
  }, [photos, filter, sortOptions]);

  // Sắp xếp thư mục con theo sortOptions (Tên A-Z / Z-A, Ngày sửa đổi,...)
  const sortedSubfolders = useMemo(() => {
    if (!subfolders || subfolders.length === 0) return [];
    const list = [...subfolders];

    list.sort((a, b) => {
      let cmp = 0;
      if (sortOptions.field === 'date') {
        const timeA = (a as any).dateModified || 0;
        const timeB = (b as any).dateModified || 0;
        cmp = timeA - timeB;
      } else {
        cmp = filenameCollator.compare(a.name, b.name);
      }

      if (sortOptions.order === 'desc') {
        cmp = -cmp;
      }
      return cmp;
    });

    return list;
  }, [subfolders, sortOptions]);



  // Thống kê
  const stats: CullingStats = useMemo(() => {
    const total = photos.length;
    const filtered = filteredPhotos.length;
    const tagged = photos.filter((p) => p.isTagged).length;
    const rated = photos.filter((p) => p.rating > 0).length;
    const rejected = photos.filter((p) => p.isRejected).length;
    return { total, filtered, tagged, rated, rejected };
  }, [photos, filteredPhotos]);

  const openFolderByPath = useCallback(async (folderPath: string) => {
    previewQueue.clear();
    setCurrentFolder(folderPath);
    try { localStorage.setItem(LAST_FOLDER_KEY, folderPath); } catch {}

    if (folderPath === 'THIS_PC') {
      setSubfolders([]);
      setPhotos([]);
      setSelectedIndices(new Set());
      return;
    }

    setIsLoading(true);
    addRecentFolder(folderPath);

    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.readFolderContents(folderPath);
        if (res) {
          setSubfolders(res.subfolders || []);

          const savedMeta = (res as any).photoMeta || {};

          const photoItems: PhotoItem[] = (res.files || []).map((filePath: string, index: number) => {
            const fileName = filePath.split(/[\\\/]/).pop() || filePath;
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const isRaw = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'dng', 'raf', 'orf', 'rw2', 'pef'].includes(ext);
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', 'mts', 'm2ts', '3gp', 'flv'].includes(ext);
            const isDesign = ['psd', 'psb', 'ai', 'eps', 'pdf', 'svg'].includes(ext);
            const meta = savedMeta[filePath] || {};

            return {
              id: `${filePath}_${index}`,
              filePath,
              fileName,
              isRaw,
              isVideo,
              isDesign,
              fileType: ext.toUpperCase(),

              rating: meta.rating || 0,
              colorLabel: meta.colorLabel || 'none',
              isTagged: !!meta.isTagged,
              isRejected: !!meta.isRejected,
              dateModified: meta.dateModified,
              aiData: meta.aiData || undefined,
            };

          });


          // 🧠 Tự động phân tích nhóm ảnh liên thanh (Burst Shots) & Gợi ý Best Shot 👑
          const { photos: analyzedItems } = analyzeBurstGroups(photoItems);

          setPhotos(analyzedItems);
          
          let selectIdx = 0;
          if (pendingSelectPathRef.current) {
            const foundIdx = analyzedItems.findIndex((p) => p.filePath === pendingSelectPathRef.current);
            if (foundIdx !== -1) {
              selectIdx = foundIdx;
            }
            pendingSelectPathRef.current = null;
          }
          
          setSelectedIndex(analyzedItems.length > 0 ? selectIdx : 0);
          setSelectedIndices(new Set(analyzedItems.length > 0 ? [selectIdx] : []));
          setLastSelectedIdx(selectIdx);

          // 🚀 TỰ ĐỘNG NẠP TRƯỚC 60 ẢNH ĐẦU TIÊN (Mượt mà tức thì, không làm nghẽn hàng đợi ổ cứng)
          const filePaths = analyzedItems.map((p) => p.filePath);
          previewQueue.preloadAll(filePaths.slice(0, 60));

        }
      }
    } catch {
      setSubfolders([]);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ⚡ Turbo RAM Preloader: Nạp trước 60 ảnh đầu tiên khi chuyển thư mục
  useEffect(() => {
    if (photos.length > 0) {
      const filePaths = photos.map((p) => p.filePath);
      previewQueue.preloadAll(filePaths.slice(0, 60));
    }
  }, [currentFolder]);

  const handleSelectFolderDialog = async () => {

    const res: any = await window.electronAPI.selectFolder();
    const targetFolder = typeof res === 'string' ? res : res?.folderPath;
    if (targetFolder) {
      openFolderByPath(targetFolder);
    }
  };

  const loadPreview = useCallback(async (filePath: string): Promise<PreviewResult | string> => {
    return previewQueue.load(filePath);
  }, []);

  // Multi-select photo handler (Click, Ctrl+Click, Shift+Click)
  const handleSelectPhoto = useCallback((index: number, e?: React.MouseEvent) => {
    setIsFacePanelOpen(true);
    const clampedIndex = Math.max(0, Math.min(filteredPhotos.length - 1, index));
    setSelectedIndex(clampedIndex);

    if (e?.shiftKey) {
      const start = Math.min(lastSelectedIdx, clampedIndex);
      const end = Math.max(lastSelectedIdx, clampedIndex);
      const newSet = new Set(selectedIndices);
      for (let i = start; i <= end; i++) newSet.add(i);
      setSelectedIndices(newSet);
    } else if (e?.ctrlKey || e?.metaKey) {
      const newSet = new Set(selectedIndices);
      if (newSet.has(clampedIndex)) newSet.delete(clampedIndex);
      else newSet.add(clampedIndex);
      setSelectedIndices(newSet);
      setLastSelectedIdx(clampedIndex);
    } else {
      setSelectedIndices(new Set([clampedIndex]));
      setLastSelectedIdx(clampedIndex);
    }
  }, [lastSelectedIdx, selectedIndices, filteredPhotos.length]);

  const currentPhoto = filteredPhotos[selectedIndex] || null;

  // Tự động giữ selection và đồng bộ FaceZoomPanel khi bộ lọc thay đổi (ví dụ bấm ⭐ Best Shot)
  const selectedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentPhoto) {
      selectedPathRef.current = currentPhoto.filePath;
    }
  }, [currentPhoto]);

  useEffect(() => {
    if (filteredPhotos.length === 0) {
      setSelectedIndex(0);
      setSelectedIndices(new Set());
      return;
    }

    // 1. Nếu ảnh đang chọn vẫn có trong danh sách đã lọc, chuyển selection tới vị trí mới
    if (selectedPathRef.current) {
      const foundIdx = filteredPhotos.findIndex((p) => p.filePath === selectedPathRef.current);
      if (foundIdx !== -1) {
        setSelectedIndex(foundIdx);
        setSelectedIndices(new Set([foundIdx]));
        return;
      }
    }

    // 2. Nếu ảnh trước đó không nằm trong bộ lọc mới hoặc selectedIndex vượt quá giới hạn
    if (selectedIndex >= filteredPhotos.length || selectedIndex < 0 || !filteredPhotos[selectedIndex]) {
      setSelectedIndex(0);
      setSelectedIndices(new Set([0]));
      selectedPathRef.current = filteredPhotos[0]?.filePath || null;
    }
  }, [filteredPhotos]);

  // Selected photo items for Compare & Rename
  const selectedPhotosList = useMemo(() => {
    return Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean);
  }, [selectedIndices, filteredPhotos]);

  const advanceToNext = useCallback(() => {
    if (selectedIndex < filteredPhotos.length - 1) {
      const nextIdx = selectedIndex + 1;
      setSelectedIndex(nextIdx);
      setSelectedIndices(new Set([nextIdx]));
    }
  }, [selectedIndex, filteredPhotos.length]);

  const setRating = useCallback((rating: number) => {
    const targetPhotos = selectedIndices.size > 1
      ? Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean)
      : currentPhoto ? [currentPhoto] : [];

    const updates: Record<string, any> = {};
    const targetFilePaths = new Set<string>();

    targetPhotos.forEach((p) => {
      targetFilePaths.add(p.filePath);
      updates[p.filePath] = {
        rating,
        colorLabel: p.colorLabel,
        isTagged: p.isTagged,
        isRejected: p.isRejected,
      };
    });

    setPhotos((prev) => prev.map((p) =>
      targetFilePaths.has(p.filePath) ? { ...p, rating } : p
    ));

    if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
      (window.electronAPI as any).batchSavePhotoMeta(updates);
    }

    // Tự động đồng bộ file .xmp Sidecar chuẩn Adobe Lightroom & Capture One
    if (window.electronAPI && (window.electronAPI as any).syncXmp) {
      targetPhotos.forEach((p) => {
        (window.electronAPI as any).syncXmp({ filePath: p.filePath, rating, colorLabel: p.colorLabel });
      });
    }

    // 🗄️ Tự động đồng bộ Rating trực tiếp vào cơ sở dữ liệu digiKam (digikam4.db)
    if (window.electronAPI && window.electronAPI.digikamSetRating) {
      targetPhotos.forEach((p) => {
        window.electronAPI.digikamSetRating(p.fileName, rating);
      });
    }

    if (autoAdvance) advanceToNext();
  }, [selectedIndices, filteredPhotos, currentPhoto, autoAdvance, advanceToNext]);

  const setColorLabel = useCallback((colorLabel: ColorLabel) => {
    const targetPhotos = selectedIndices.size > 1
      ? Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean)
      : currentPhoto ? [currentPhoto] : [];

    const updates: Record<string, any> = {};
    const targetFilePaths = new Set<string>();

    targetPhotos.forEach((p) => {
      const nextColor = p.colorLabel === colorLabel ? 'none' : colorLabel;
      targetFilePaths.add(p.filePath);
      updates[p.filePath] = {
        rating: p.rating,
        colorLabel: nextColor,
        isTagged: p.isTagged,
        isRejected: p.isRejected,
      };
    });

    setPhotos((prev) => prev.map((p) =>
      targetFilePaths.has(p.filePath) ? { ...p, colorLabel: p.colorLabel === colorLabel ? 'none' : colorLabel } : p
    ));

    if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
      (window.electronAPI as any).batchSavePhotoMeta(updates);
    }

    // Tự động đồng bộ file .xmp Sidecar chuẩn Adobe Lightroom & Capture One
    if (window.electronAPI && (window.electronAPI as any).syncXmp) {
      targetPhotos.forEach((p) => {
        const nextColor = p.colorLabel === colorLabel ? 'none' : colorLabel;
        (window.electronAPI as any).syncXmp({ filePath: p.filePath, rating: p.rating, colorLabel: nextColor });
      });
    }

    if (autoAdvance) advanceToNext();
  }, [selectedIndices, filteredPhotos, currentPhoto, autoAdvance, advanceToNext]);

  const toggleTag = useCallback(() => {
    const targetPhotos = selectedIndices.size > 1
      ? Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean)
      : currentPhoto ? [currentPhoto] : [];

    const updates: Record<string, any> = {};
    const targetFilePaths = new Set<string>();

    targetPhotos.forEach((p) => {
      const nextTagged = !p.isTagged;
      targetFilePaths.add(p.filePath);
      updates[p.filePath] = {
        rating: p.rating,
        colorLabel: p.colorLabel,
        isTagged: nextTagged,
        isRejected: false,
      };
    });

    setPhotos((prev) => prev.map((p) =>
      targetFilePaths.has(p.filePath) ? { ...p, isTagged: !p.isTagged, isRejected: false } : p
    ));

    if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
      (window.electronAPI as any).batchSavePhotoMeta(updates);
    }

    if (autoAdvance) advanceToNext();
  }, [selectedIndices, filteredPhotos, currentPhoto, autoAdvance, advanceToNext]);

  // Tag tất cả ảnh khớp với bộ tìm kiếm dãy số khách chọn & Lưu vào app_state.json
  const handleTagAllFiltered = useCallback(() => {
    const updates: Record<string, any> = {};
    const targetFilePaths = new Set<string>();

    filteredPhotos.forEach((p) => {
      targetFilePaths.add(p.filePath);
      updates[p.filePath] = {
        rating: p.rating,
        colorLabel: p.colorLabel,
        isTagged: true,
        isRejected: false,
      };
    });

    setPhotos((prev) => prev.map((p) =>
      targetFilePaths.has(p.filePath) ? { ...p, isTagged: true, isRejected: false } : p
    ));

    if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
      (window.electronAPI as any).batchSavePhotoMeta(updates);
    }
  }, [filteredPhotos]);

  const setPickStatusForSelected = useCallback((status: 'tagged' | 'rejected') => {
    const targetPhotos = selectedIndices.size > 1
      ? Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean)
      : currentPhoto ? [currentPhoto] : [];

    const updates: Record<string, any> = {};
    const targetFilePaths = new Set<string>();

    targetPhotos.forEach((p) => {
      targetFilePaths.add(p.filePath);
      updates[p.filePath] = {
        rating: p.rating,
        colorLabel: p.colorLabel,
        isTagged: status === 'tagged',
        isRejected: status === 'rejected',
      };
    });

    setPhotos((prev) => prev.map((p) =>
      targetFilePaths.has(p.filePath)
        ? { ...p, isTagged: status === 'tagged', isRejected: status === 'rejected' }
        : p
    ));

    if (window.electronAPI && (window.electronAPI as any).batchSavePhotoMeta) {
      (window.electronAPI as any).batchSavePhotoMeta(updates);
    }
  }, [selectedIndices, filteredPhotos, currentPhoto]);


  // Cập nhật tên file sau khi đổi tên hàng loạt thành công
  const handleRenameSuccess = useCallback((renamedMap: Record<string, string>) => {
    setPhotos((prev) => prev.map((p) => {
      if (renamedMap[p.id]) {
        const newPath = renamedMap[p.id];
        const newName = newPath.split(/[\\\/]/).pop() || p.fileName;
        return {
          ...p,
          filePath: newPath,
          fileName: newName,
        };
      }
      return p;
    }));
  }, []);

  // Copy files / subfolder to clipboard
  const handleCopyFiles = useCallback(() => {
    const selectedPaths = Array.from(selectedIndices).map((idx) => filteredPhotos[idx]?.filePath).filter(Boolean);
    const paths =
      contextMenuPos?.targetType === 'subfolder' && contextMenuPos.targetSubfolder
        ? [contextMenuPos.targetSubfolder.path]
        : selectedPaths.length > 0
        ? selectedPaths
        : contextMenuPos?.targetPhoto
        ? [contextMenuPos.targetPhoto.filePath]
        : [];

    if (paths.length > 0) {
      setClipboard({ files: paths, action: 'copy' });
      if (window.electronAPI?.setSystemClipboardFiles) {
        window.electronAPI.setSystemClipboardFiles(paths);
      }
      addToast('info', `📋 Đã sao chép ${paths.length} mục vào bộ nhớ tạm`);
    }
  }, [selectedIndices, filteredPhotos, contextMenuPos, addToast]);

  // Cut files / subfolder to clipboard
  const handleCutFiles = useCallback(() => {
    const selectedPaths = Array.from(selectedIndices).map((idx) => filteredPhotos[idx]?.filePath).filter(Boolean);
    const paths =
      contextMenuPos?.targetType === 'subfolder' && contextMenuPos.targetSubfolder
        ? [contextMenuPos.targetSubfolder.path]
        : selectedPaths.length > 0
        ? selectedPaths
        : contextMenuPos?.targetPhoto
        ? [contextMenuPos.targetPhoto.filePath]
        : [];

    if (paths.length > 0) {
      setClipboard({ files: paths, action: 'cut' });
      if (window.electronAPI?.setSystemClipboardFiles) {
        window.electronAPI.setSystemClipboardFiles(paths);
      }
      addToast('info', `✂️ Đã cắt ${paths.length} mục vào bộ nhớ tạm`);
    }
  }, [selectedIndices, filteredPhotos, contextMenuPos, addToast]);

  // Paste files into current folder or target subfolder (App Clipboard + Windows Explorer Clipboard)
  const handlePasteFiles = useCallback(async () => {
    if (!window.electronAPI) return;
    const destFolder = targetFolderForAction || currentFolder;
    if (!destFolder || destFolder === 'THIS_PC') {
      addToast('info', 'Vui lòng mở một thư mục để dán');
      return;
    }

    try {
      // 1. Kiểm tra App Internal Clipboard
      if (clipboard && clipboard.files.length > 0) {
        if (clipboard.action === 'copy') {
          const res = await (window.electronAPI as any).copyFiles(clipboard.files, destFolder);
          if (res?.success) {
            const count = Object.keys(res.copiedMap || {}).length;
            addToast('success', `✓ Đã dán ${count} mục thành công vào thư mục`);
            if (currentFolder) openFolderByPath(currentFolder);
          } else {
            addToast('error', `Lỗi sao chép: ${res?.error || 'Không thể dán'}`);
          }
        } else if (clipboard.action === 'cut') {
          const res = await (window.electronAPI as any).moveFiles(clipboard.files, destFolder);
          if (res?.success) {
            const count = Object.keys(res.movedMap || {}).length;
            addToast('success', `✓ Đã di chuyển ${count} mục thành công`);
            setClipboard(null);
            if (currentFolder) openFolderByPath(currentFolder);
          } else {
            addToast('error', `Lỗi di chuyển: ${res?.error || 'Không thể di chuyển'}`);
          }
        }
        setTargetFolderForAction(null);
        return;
      }

      // 2. Kiểm tra Windows System Clipboard (Copied from Windows File Explorer / Desktop)
      const systemFiles: string[] = await (window.electronAPI as any).getSystemClipboardFiles();
      if (systemFiles && systemFiles.length > 0) {
        const res = await (window.electronAPI as any).copyFiles(systemFiles, destFolder);
        if (res?.success) {
          const count = Object.keys(res.copiedMap || {}).length;
          addToast('success', `✓ Đã dán ${count} file từ Windows Explorer vào thư mục`);
          if (currentFolder) openFolderByPath(currentFolder);
        } else {
          addToast('error', `Lỗi dán file: ${res?.error || 'Không thể dán'}`);
        }
      } else {
        addToast('info', 'Bộ nhớ tạm không có file nào để dán (Ctrl+C trước khi Paste)');
      }
      setTargetFolderForAction(null);
    } catch (err: any) {
      addToast('error', `Lỗi khi dán file: ${err?.message || err}`);
      setTargetFolderForAction(null);
    }
  }, [clipboard, targetFolderForAction, currentFolder, openFolderByPath, addToast]);

  // Drag & Drop Handler (Kéo thả file/thư mục từ Windows File Explorer)
  const handleDropFiles = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.electronAPI || !e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const paths = droppedFiles.map((f: any) => f.path).filter(Boolean);

    if (paths.length === 0) return;

    // Check if user dropped a Folder
    if (droppedFiles.length === 1 && (droppedFiles[0].type === '' || !droppedFiles[0].type)) {
      // It's a folder, open it directly!
      openFolderByPath(paths[0]);
      addToast('info', `📂 Đã mở thư mục: ${droppedFiles[0].name}`);
      return;
    }

    // Otherwise, copy dropped files to current folder!
    if (currentFolder && currentFolder !== 'THIS_PC') {
      try {
        const res = await (window.electronAPI as any).copyFiles(paths, currentFolder);
        if (res?.success) {
          const count = Object.keys(res.copiedMap || {}).length;
          addToast('success', `✓ Đã thả & dán ${count} file vào thư mục`);
          openFolderByPath(currentFolder);
        }
      } catch (err) {
        addToast('error', 'Lỗi khi thả file vào ứng dụng');
      }
    }
  }, [currentFolder, openFolderByPath, addToast]);


  // Delete selected files or subfolder
  const handleDeleteFiles = useCallback(async () => {
    if (contextMenuPos?.targetType === 'subfolder' && contextMenuPos.targetSubfolder) {
      const subPath = contextMenuPos.targetSubfolder.path;
      const subName = contextMenuPos.targetSubfolder.name || subPath.split(/[\\/]/).filter(Boolean).pop();
      if (window.confirm(`Bạn có chắc chắn muốn xóa thư mục "${subName}" vào Thùng Rác (Recycle Bin)?`)) {
        try {
          const res = await (window.electronAPI as any).deleteFiles([subPath]);
          if (res?.success) {
            addToast('success', `🗑️ Đã chuyển thư mục "${subName}" vào Thùng Rác`);
            if (currentFolder) openFolderByPath(currentFolder);
          }
        } catch {
          addToast('error', 'Lỗi khi xóa thư mục');
        }
      }
      return;
    }

    const selectedPaths = Array.from(selectedIndices).map((idx) => filteredPhotos[idx]?.filePath).filter(Boolean);
    const targetPaths = selectedPaths.length > 0
      ? selectedPaths
      : contextMenuPos?.targetPhoto
      ? [contextMenuPos.targetPhoto.filePath]
      : [];

    if (targetPaths.length === 0 || !window.electronAPI) return;

    if (window.confirm(`Bạn có chắc chắn muốn xóa ${targetPaths.length} ảnh đã chọn vào Thùng Rác (Recycle Bin)?`)) {
      try {
        let nextSelectedPath: string | null = null;
        const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
        const lastDeletedIndex = sortedIndices.length > 0 ? sortedIndices[sortedIndices.length - 1] : selectedIndex;

        for (let i = lastDeletedIndex + 1; i < filteredPhotos.length; i++) {
          if (!targetPaths.includes(filteredPhotos[i].filePath)) {
            nextSelectedPath = filteredPhotos[i].filePath;
            break;
          }
        }

        if (!nextSelectedPath && sortedIndices.length > 0) {
          for (let i = sortedIndices[0] - 1; i >= 0; i--) {
            if (!targetPaths.includes(filteredPhotos[i].filePath)) {
              nextSelectedPath = filteredPhotos[i].filePath;
              break;
            }
          }
        }

        const res = await (window.electronAPI as any).deleteFiles(targetPaths);
        if (res?.success) {
          addToast('success', `🗑️ Đã chuyển ${targetPaths.length} file vào Thùng Rác`);
          pendingSelectPathRef.current = nextSelectedPath;
          if (currentFolder) openFolderByPath(currentFolder);
        }
      } catch (err) {
        addToast('error', 'Lỗi khi xóa file');
      }
    }
  }, [selectedIndices, selectedIndex, filteredPhotos, contextMenuPos, currentFolder, openFolderByPath, addToast]);


  // Handle right-click context menu trigger
  const handleContextMenuTrigger = useCallback((
    e: React.MouseEvent,
    type: 'photo' | 'subfolder' | 'background',
    item?: PhotoItem | SubfolderItem,
    index?: number
  ) => {
    e.preventDefault();
    if (type === 'photo' && item && index !== undefined) {
      if (!selectedIndices.has(index)) {
        setSelectedIndices(new Set([index]));
        setSelectedIndex(index);
      }
      setTargetFolderForAction(null);
      setContextMenuPos({
        x: e.clientX,
        y: e.clientY,
        targetType: 'photo',
        targetPhoto: item as PhotoItem,
        selectedPhotos: Array.from(selectedIndices).map((i) => filteredPhotos[i]).filter(Boolean),
      });
    } else if (type === 'subfolder' && item) {
      const sub = item as SubfolderItem;
      setTargetFolderForAction(sub.path);
      setContextMenuPos({
        x: e.clientX,
        y: e.clientY,
        targetType: 'subfolder',
        targetSubfolder: sub,
      });
    } else if (type === 'background') {
      setTargetFolderForAction(currentFolder);
      setContextMenuPos({
        x: e.clientX,
        y: e.clientY,
        targetType: 'background',
      });
    }
  }, [selectedIndices, filteredPhotos, currentFolder]);

  // Phím tắt bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Select All: Ctrl + A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIndices = new Set<number>();
        for (let i = 0; i < filteredPhotos.length; i++) allIndices.add(i);
        setSelectedIndices(allIndices);
        return;
      }

      // Copy: Ctrl + C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyFiles();
        return;
      }

      // Cut: Ctrl + X
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCutFiles();
        return;
      }

      // Paste: Ctrl + V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteFiles();
        return;
      }

      // Extract JPG from RAW: Ctrl + E
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsExtractJpgModalOpen(true);
        return;
      }

      // Open in Photoshop: Ctrl + P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleOpenWithApp('photoshop');
        return;
      }

      // Open in Lightroom Classic: Ctrl + L
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleOpenWithApp('lightroom');
        return;
      }

      // Open in Capture One: Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenWithApp('captureone');
        return;
      }

      // Delete: Del / Delete
      if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteFiles();
        return;
      }

      // Batch Rename: F2
      if (e.key === 'F2' && selectedIndices.size >= 1) {
        e.preventDefault();
        setIsBatchRenameModalOpen(true);
        return;
      }

      // Compare View: C
      if ((e.key === 'c' || e.key === 'C') && selectedIndices.size >= 2) {
        e.preventDefault();
        setViewMode('compare');
        return;
      }


      if (!currentPhoto) return;

      switch (e.key) {
        case '1': setRating(1); break;
        case '2': setRating(2); break;
        case '3': setRating(3); break;
        case '4': setRating(4); break;
        case '5': setRating(5); break;
        case '0': setRating(0); break;
        case '6': setColorLabel('red'); break;
        case '7': setColorLabel('yellow'); break;
        case '8': setColorLabel('green'); break;
        case '9': setColorLabel('blue'); break;
        case 't': case 'T': toggleTag(); break;
        case 'b': case 'B':
          setFilter((prev) => ({ ...prev, aiFilter: prev.aiFilter === 'best' ? 'all' : 'best' }));
          break;
        case 'z': case 'Z':
          setIsFacePanelOpen((prev) => !prev);
          break;
        case 'a': case 'A': setAutoAdvance((prev) => !prev); break;
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const nextIdx = Math.max(0, prev - 1);
            setSelectedIndices(new Set([nextIdx]));
            return nextIdx;
          });
          break;
        case 'ArrowRight': case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const nextIdx = Math.min(filteredPhotos.length - 1, prev + 1);
            setSelectedIndices(new Set([nextIdx]));
            return nextIdx;
          });
          break;
        case 'Enter':
          e.preventDefault();
          setViewMode((prev) => (prev === 'grid' ? 'viewer' : 'grid'));
          break;
        case 'Escape':
          if (viewMode === 'viewer' || viewMode === 'compare') setViewMode('grid');
          if (isExportModalOpen) setIsExportModalOpen(false);
          if (isSettingsModalOpen) setIsSettingsModalOpen(false);
          if (isBatchRenameModalOpen) setIsBatchRenameModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhoto, filteredPhotos.length, setRating, setColorLabel, toggleTag, viewMode, isExportModalOpen, isSettingsModalOpen, isBatchRenameModalOpen, selectedIndices.size]);

  // Mở ảnh nhanh bằng ứng dụng đồ họa chuyên nghiệp (Photoshop, Lightroom, Capture One)
  const handleOpenWithApp = useCallback(async (targetApp: 'photoshop' | 'lightroom' | 'captureone') => {
    if (!window.electronAPI?.openWithShortcut) return;
    const selectedPaths = Array.from(selectedIndices).map((idx) => filteredPhotos[idx]?.filePath).filter(Boolean);
    const paths = selectedPaths.length > 0 ? selectedPaths : (currentPhoto ? [currentPhoto.filePath] : []);
    if (paths.length === 0) {
      addToast('info', 'Vui lòng chọn ảnh để mở');
      return;
    }

    try {
      const res = await window.electronAPI.openWithShortcut({ filePaths: paths, targetApp });
      if (res?.success) {
        addToast('success', `✓ Đang mở ${res.count} ảnh bằng ${res.appDisplayName || res.appName}...`);
      } else {
        addToast('error', res?.error || `Không thể mở bằng ${targetApp}`);
      }
    } catch (err: any) {
      addToast('error', `Lỗi khi mở ứng dụng: ${err.message || err}`);
    }
  }, [selectedIndices, filteredPhotos, currentPhoto, addToast]);

  // Export photos handler
  const handleExportSelectedPhotos = async (targetDir: string, move: boolean) => {
    if (!window.electronAPI) return { success: false, copiedCount: 0, errors: ['No electron API'] };
    const filePaths = photosForExportModal.map((p) => p.filePath);
    return await window.electronAPI.copySelectedPhotos(filePaths, targetDir, move);
  };

  const photosForExportModal = useMemo(() => {
    if (selectedIndices.size > 1) {
      return Array.from(selectedIndices).map((idx) => filteredPhotos[idx]).filter(Boolean);
    }
    const tagged = photos.filter((p) => p.isTagged || p.rating > 0);
    return tagged.length > 0 ? tagged : (currentPhoto ? [currentPhoto] : []);
  }, [selectedIndices, filteredPhotos, photos, currentPhoto]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFiles}
      className={`h-screen w-screen flex flex-col ${
        effectiveTheme === 'light' ? 'theme-light bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-zinc-100'
      } overflow-hidden select-none font-sans transition-colors duration-200`}
    >

      <Header
        currentFolder={currentFolder}
        onSelectFolder={handleSelectFolderDialog}
        stats={stats}
        filter={filter}
        onFilterChange={(newF) => setFilter((prev) => ({ ...prev, ...newF }))}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={() => setAutoAdvance(!autoAdvance)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenBatchRenameModal={() => setIsBatchRenameModalOpen(true)}
        onOpenExtractJpgModal={() => setIsExtractJpgModalOpen(true)}
        onOpenCompareView={() => setViewMode('compare')}
        onTagAllFiltered={handleTagAllFiltered}
        selectedCount={selectedIndices.size}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === 'grid' ? 'viewer' : 'grid'))}
        isAIScanning={isAIScanning}
        onToggleAIScan={() => setIsAIScanning(!isAIScanning)}
        aiScanProgress={aiScanProgress}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
        isFacePanelOpen={isFacePanelOpen}
        onToggleFacePanel={() => setIsFacePanelOpen((prev) => !prev)}
        onOpenInDigikam={() => {
          if (currentPhoto && window.electronAPI && window.electronAPI.digikamOpenInShowfoto) {
            window.electronAPI.digikamOpenInShowfoto(currentPhoto.filePath);
          }
        }}
      />



      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          onOpenFolder={openFolderByPath}
          loadChildren={loadChildren}
          currentFolder={currentFolder}
          drives={drives}
          userFolders={userFolders}
          recentFolders={recentFolders}
          favoriteFolders={favoriteFolders}
          onToggleFavoriteFolder={toggleFavoriteFolder}
          onClearRecentFolders={handleClearRecentFolders}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 flex overflow-hidden bg-zinc-950">
          <GridView
            currentFolder={currentFolder}
            drives={drives}
            userFolders={userFolders}
            subfolders={sortedSubfolders}

            photos={filteredPhotos}
            selectedIndex={selectedIndex}
            selectedIndices={selectedIndices}
            onSelectPhoto={handleSelectPhoto}
            onDoubleClickPhoto={(idx) => {
              const clampedIdx = Math.max(0, Math.min(filteredPhotos.length - 1, idx));
              setSelectedIndex(clampedIdx);
              setSelectedIndices(new Set([clampedIdx]));
              setViewMode('viewer');
            }}
            onOpenFolder={openFolderByPath}
            loadPreview={loadPreview}
            isLoading={isLoading}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            cardSize={cardSize}
            onCardSizeChange={setCardSize}
            sortOptions={sortOptions}
            onSortOptionsChange={(newSort: Partial<SortOptions>) => setSortOptions((prev: SortOptions) => ({ ...prev, ...newSort }))}
            favoriteFolders={favoriteFolders}
            onToggleFavoriteFolder={toggleFavoriteFolder}
            onContextMenu={handleContextMenuTrigger}
          />

          {/* 🤖 Draggable Resize Handle & Selected Photo Preview Panel */}
          {isFacePanelOpen && (
            <>
              <div
                onMouseDown={startResize}
                className="w-2 hover:w-3.5 bg-zinc-800 hover:bg-amber-500/90 cursor-col-resize transition-all duration-150 shrink-0 z-40 border-l border-r border-zinc-950 flex items-center justify-center"
                style={{ cursor: 'col-resize', userSelect: 'none' }}
              >
                {/* Visual center grip line */}
                <div className="w-[1px] h-8 bg-zinc-600 group-hover:bg-zinc-400 rounded" />
              </div>
              <FaceZoomPanel
                photo={currentPhoto}
                isOpen={isFacePanelOpen}
                onClose={() => setIsFacePanelOpen(false)}
                width={facePanelWidth}
              />
            </>
          )}
        </main>
      </div>

      {/* Lightbox Single Viewer (Chuẩn Lightroom UI với Thanh Filmstrip ở đáy & Inspector EXIF bên phải) */}
      {viewMode === 'viewer' && currentPhoto && (
        <ImageViewer
          photo={currentPhoto}
          currentIndex={selectedIndex}
          totalPhotos={filteredPhotos.length}
          allPhotos={filteredPhotos}
          selectedIndices={selectedIndices}
          onSelectPhoto={handleSelectPhoto}
          onNext={() => {
            if (selectedIndex < filteredPhotos.length - 1) {
              const nextIdx = selectedIndex + 1;
              setSelectedIndex(nextIdx);
              setSelectedIndices(new Set([nextIdx]));
            }
          }}
          onPrev={() => {
            if (selectedIndex > 0) {
              const prevIdx = selectedIndex - 1;
              setSelectedIndex(prevIdx);
              setSelectedIndices(new Set([prevIdx]));
            }
          }}
          onClose={() => setViewMode('grid')}
          onSetRating={(rating) => setRating(rating)}
          onSetColorLabel={(color) => setColorLabel(color)}
          onToggleTag={toggleTag}
          onOpenCompareView={() => setViewMode('compare')}
          loadPreview={loadPreview}
        />
      )}

      {/* Side-by-Side 2-4 Photo Comparison View */}
      {viewMode === 'compare' && selectedPhotosList.length >= 2 && (
        <CompareView
          photos={selectedPhotosList.slice(0, 4)}
          onClose={() => setViewMode('grid')}
          onRatingChange={(id: string, rating: number) => setRating(rating)}
          onColorLabelChange={(id: string, label: string) => setColorLabel(label as any)}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          selectedPhotos={photosForExportModal}
          currentFolder={currentFolder}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExportSelectedPhotos}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          rawResolution={rawResolution}
          onChangeRawResolution={setRawResolution}
          eyeOpeningThresholdPct={eyeThresholdPct}
          onChangeEyeThreshold={setEyeThresholdPct}
          themeMode={themeMode}
          onChangeThemeMode={handleThemeChange}
          onClearAICache={() => {
            setPhotos((prev) => prev.map((p) => ({ ...p, aiData: undefined })));
            setIsAIScanning(true);
          }}
        />
      )}


      {/* Batch Rename Modal */}
      {isBatchRenameModalOpen && selectedPhotosList.length >= 1 && (
        <BatchRenameModal
          selectedPhotos={selectedPhotosList}
          onClose={() => setIsBatchRenameModalOpen(false)}
          onRenameSuccess={handleRenameSuccess}
        />
      )}

      {/* Fast RAW to JPG Extractor Modal */}
      {isExtractJpgModalOpen && (
        <ExtractJpgModal
          selectedPhotos={selectedPhotosList}
          allPhotos={photos}
          currentFolder={currentFolder}
          onClose={() => setIsExtractJpgModalOpen(false)}
        />
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (currentFolder || targetFolderForAction) && (
        <CreateFolderModal
          parentPath={targetFolderForAction || currentFolder || 'C:\\'}
          onClose={() => setIsCreateFolderModalOpen(false)}
          onCreateSuccess={(folderPath) => {
            if (currentFolder) openFolderByPath(currentFolder);
          }}
        />
      )}

      {/* Custom Context Menu */}
      {contextMenuPos && (
        <ContextMenu
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          onCopy={handleCopyFiles}
          onCut={handleCutFiles}
          onPaste={handlePasteFiles}
          canPaste={true}
          onOpenSubfolder={(subPath) => openFolderByPath(subPath)}
          onBatchRename={() => setIsBatchRenameModalOpen(true)}
          onExtractJpg={() => setIsExtractJpgModalOpen(true)}
          onDelete={handleDeleteFiles}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
          onSetRating={(r) => setRating(r)}
          onSetPickStatus={(st) => {
            if (st === 'tagged' || st === 'rejected') {
              setPickStatusForSelected(st);
            }
          }}

          onToggleSubfolderFavorite={() => {
            if (contextMenuPos.targetSubfolder) {
              toggleFavoriteFolder({
                path: contextMenuPos.targetSubfolder.path,
                name: contextMenuPos.targetSubfolder.name,
              });
            }
          }}
          isSubfolderFavorited={
            contextMenuPos.targetSubfolder
              ? favoriteFolders.some((f) => f.path === contextMenuPos.targetSubfolder?.path)
              : false
          }
        />
      )}

      {/* Toast Notifications System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );




};
