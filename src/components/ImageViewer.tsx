import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Star, Tag, Check, Info,
  RotateCw, RotateCcw, Layers, Calendar, HardDrive, Image as ImageIcon,
  Lock, Unlock, EyeOff, Target, Play
} from 'lucide-react';


import { PhotoItem, ColorLabel, PhotoExif } from '../types';
import { PreviewResult } from '../utils/previewQueue';
import { Histogram } from './Histogram';



interface ImageViewerProps {
  photo: PhotoItem;
  currentIndex: number;
  totalPhotos: number;
  allPhotos: PhotoItem[];
  selectedIndices: Set<number>;
  onSelectPhoto: (index: number, e?: React.MouseEvent) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpDown?: () => void;
  onJumpUp?: () => void;
  onClose: () => void;
  onSetRating: (rating: number) => void;
  onSetColorLabel: (color: ColorLabel) => void;
  onToggleTag: () => void;
  onOpenCompareView: () => void;
  loadPreview: (filePath: string) => Promise<PreviewResult | string>;
}


// In-memory cache for high-resolution images to prevent IPC roundtrip lag on slide transition
const fullResCache: Record<string, string> = {};

const getCachedBase64 = async (filePath: string): Promise<string | null> => {
  if (fullResCache[filePath]) {
    return fullResCache[filePath];
  }
  if ((window as any).electronAPI?.getBase64Data) {
    try {
      const url = await (window as any).electronAPI.getBase64Data(filePath);
      if (url) {
        // Keep cache bounded to 40 items to prevent RAM bloating
        const keys = Object.keys(fullResCache);
        if (keys.length > 40) {
          delete fullResCache[keys[0]];
        }
        fullResCache[filePath] = url;
        return url;
      }
    } catch {}
  }
  return null;
};

export const ImageViewer: React.FC<ImageViewerProps> = ({
  photo,
  currentIndex,
  totalPhotos,
  allPhotos,
  selectedIndices,
  onSelectPhoto,
  onNext,
  onPrev,
  onJumpDown,
  onJumpUp,
  onClose,
  onSetRating,
  onSetColorLabel,
  onToggleTag,
  onOpenCompareView,
  loadPreview,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [orientation, setOrientation] = useState<number>(1);
  const [manualRotation, setManualRotation] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Lock Zoom State
  const [lockZoom, setLockZoom] = useState<boolean>(true);

  // EXIF Metadata State
  const [exifData, setExifData] = useState<PhotoExif | undefined>(photo.exif);

  // Thumbnail previews for the bottom filmstrip
  const [filmstripPreviews, setFilmstripPreviews] = useState<Record<string, { url: string; orientation: number }>>({});

  // Metadata states
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Keyboard shortcuts: L (Lock Zoom), R (Rotate CW), 4 Arrow Keys (Pan when zoomed, Navigate when fit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLockZoom((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        setManualRotation((prev) => (prev + 90) % 360);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (zoomScale > 1.05) {
          // Pan ảnh sang phải
          setPanPosition((prev) => ({ ...prev, x: prev.x - (e.shiftKey ? 140 : 70) }));
        } else {
          onNext();
        }
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (zoomScale > 1.05) {
          // Pan ảnh sang trái
          setPanPosition((prev) => ({ ...prev, x: prev.x + (e.shiftKey ? 140 : 70) }));
        } else {
          onPrev();
        }
      } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (zoomScale > 1.05) {
          // Pan ảnh xuống dưới
          setPanPosition((prev) => ({ ...prev, y: prev.y - (e.shiftKey ? 140 : 70) }));
        } else if (onJumpDown) {
          onJumpDown();
        }
      } else if (e.code === 'ArrowUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (zoomScale > 1.05) {
          // Pan ảnh lên trên
          setPanPosition((prev) => ({ ...prev, y: prev.y + (e.shiftKey ? 140 : 70) }));
        } else if (onJumpUp) {
          onJumpUp();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onJumpDown, onJumpUp, zoomScale]);




  // 🚀 Instant Swap & Ultra-Aggressive Preloading (-3 to +3) for 60 FPS Image Switching
  useEffect(() => {
    let isMounted = true;
    if (!lockZoom) {
      setZoomScale(1.0);
      setPanPosition({ x: 0, y: 0 });
    }
    setManualRotation(0);
    setExifData(photo.exif);
    setOrientation(photo.orientation || 1);

    // 1. ⚡ Hiển thị NGAY LẬP TỨC (0ms latency!) từ previewUrl hoặc filmstrip
    const immediateUrl = photo.previewUrl || filmstripPreviews[photo.id]?.url || '';
    if (immediateUrl) {
      setImageSrc(immediateUrl);
      const immediateOri = filmstripPreviews[photo.id]?.orientation || photo.orientation || 1;
      if (immediateOri) setOrientation(immediateOri);
    } else {
      // ⚡ Nạp nhanh từ bộ nhớ đệm previewQueue (0.01ms cache hit)
      loadPreview(photo.filePath).then((res) => {
        if (!isMounted) return;
        const url = typeof res === 'string' ? res : res?.url;
        const ori = typeof res === 'string' ? photo.orientation || 1 : res?.orientation || photo.orientation || 1;
        if (url) {
          setImageSrc((curr) => curr ? curr : url);
          if (ori) setOrientation(ori);
        }
      });
    }

    // 2. 🎯 Nạp ảnh 4K sắc nét nguyên bản ngầm trong nền và nâng cấp mượt mà
    let preloadTimeoutId: any = null;
    getCachedBase64(photo.filePath).then((fullResUrl: string | null) => {
      if (!isMounted) return;
      if (fullResUrl) {
        setImageSrc(fullResUrl);
      }
    });

    // 🚀 Nạp trước ảnh trước / sau vào cache để lướt ảnh mượt như gió
    preloadTimeoutId = setTimeout(() => {
      const fullResPreloadIndices = [
        currentIndex + 1,
        currentIndex + 2,
        currentIndex - 1,
        currentIndex - 2
      ].filter((idx) => idx >= 0 && idx < allPhotos.length);

      fullResPreloadIndices.forEach((idx) => {
        const adjP = allPhotos[idx];
        if (adjP?.filePath) {
          getCachedBase64(adjP.filePath);
        }
      });
    }, 100);

    // 3. Load EXIF Metadata from ExifTool in main process
    if ((window as any).electronAPI?.getPhotoExif) {
      (window as any).electronAPI.getPhotoExif(photo.filePath).then((exif: any) => {
        if (!isMounted) return;
        if (exif) {
          setExifData(exif);
          photo.exif = exif;
        }
      });
    }

    return () => {
      isMounted = false;
      if (preloadTimeoutId) clearTimeout(preloadTimeoutId);
    };
  }, [photo.id, photo.filePath]); // Strictly ONLY depends on photo.id & photo.filePath to stop infinite rotation loops!



  // Load image dimensions when imageSrc is set
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [imageSrc]);

  // Lazy load filmstrip thumbnail previews with EXIF orientation
  useEffect(() => {
    let isMounted = true;
    const start = Math.max(0, currentIndex - 12);
    const end = Math.min(allPhotos.length, currentIndex + 18);

    for (let i = start; i < end; i++) {
      const p = allPhotos[i];
      if (p && !filmstripPreviews[p.id]) {
        loadPreview(p.filePath).then((res) => {
          if (!isMounted) return;
          const url = typeof res === 'string' ? res : res.url;
          const orientation = typeof res === 'string' ? p.orientation || 1 : res.orientation || p.orientation || 1;
          setFilmstripPreviews((prev) => ({ ...prev, [p.id]: { url, orientation } }));
        });
      }
    }
    return () => { isMounted = false; };
  }, [currentIndex, allPhotos, loadPreview, filmstripPreviews]);

  // Auto-scroll active photo into center of filmstrip
  useEffect(() => {
    if (!filmstripRef.current) return;
    const activeEl = filmstripRef.current.querySelector(`[data-index="${currentIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  // Compute EXIF base rotation angle (degrees)
  const getExifRotationDeg = (ori: number): number => {
    switch (ori) {
      case 6: return 90;
      case 3: return 180;
      case 8: return 270;
      default: return 0;
    }
  };

  const totalRotation = (getExifRotationDeg(orientation) + manualRotation) % 360;

  // Wheel Zoom at Mouse Cursor Position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    setZoomScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale * zoomFactor, 1.0), 10.0);

      if (newScale === 1.0) {
        setPanPosition({ x: 0, y: 0 });
      } else {
        const scaleRatio = newScale / prevScale;
        setPanPosition((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * scaleRatio,
          y: mouseY - (mouseY - prevPan.y) * scaleRatio,
        }));
      }

      return newScale;
    });
  }, []);

  // Smart Click-at-point Zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (zoomScale > 1.1) {
      setZoomScale(1.0);
      setPanPosition({ x: 0, y: 0 });
    } else {
      const newScale = 2.5;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clickOffsetX = e.clientX - centerX;
        const clickOffsetY = e.clientY - centerY;

        const targetPanX = -clickOffsetX * (newScale - 1);
        const targetPanY = -clickOffsetY * (newScale - 1);

        setPanPosition({ x: targetPanX, y: targetPanY });
      }
      setZoomScale(newScale);
    }
  }, [zoomScale]);

  const handleToggleZoomButton = useCallback(() => {
    setZoomScale((prev) => {
      if (prev > 1.1) {
        setPanPosition({ x: 0, y: 0 });
        return 1.0;
      } else {
        setPanPosition({ x: 0, y: 0 });
        return 2.5;
      }
    });
  }, []);

  // Pan / Dragging logic & Loupe tracking
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (zoomScale > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  }, [zoomScale, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      rafRef.current = null;
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Rotate manually
  const rotateCw = () => setManualRotation((prev) => (prev + 90) % 360);
  const rotateCcw = () => setManualRotation((prev) => (prev - 90 + 360) % 360);

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex select-none overflow-hidden"
      onMouseUp={handleMouseUp}
    >
      {/* Left Workspace: Main Image + Bottom Filmstrip (Chuẩn Lightroom UI) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black relative">

        {/* Main Image Viewport Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Top Overlay Controls */}
          <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg transition-colors border border-zinc-800 font-semibold backdrop-blur"
            >
              <X size={15} />
              <span>Đóng (Esc)</span>
            </button>

            {/* Quick Rotate, Zoom Level & Lock Zoom Overlay */}
            <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur p-1 rounded-lg border border-zinc-800 shadow">
              {/* Lock Zoom Toggle Button (Phím L) */}
              <button
                onClick={() => setLockZoom(!lockZoom)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                  lockZoom
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Giữ nguyên mức Zoom & Vị trí khi chuyển ảnh (Phím L)"
              >
                {lockZoom ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                <span>{lockZoom ? 'Khóa Zoom' : 'Reset Zoom'}</span>
              </button>

              <span className="w-px h-4 bg-zinc-700 mx-0.5" />

              <button
                onClick={rotateCcw}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Xoay trái 90°"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={rotateCw}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                title="Xoay phải 90°"
              >
                <RotateCw size={14} />
              </button>

              <span className="w-px h-4 bg-zinc-700 mx-0.5" />

              <button
                onClick={handleToggleZoomButton}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                  zoomScale > 1.0 ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {zoomScale > 1.0 ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
                <span>{Math.round(zoomScale * 100)}%</span>
              </button>
            </div>

          </div>

          {/* Nav Prev */}
          <button
            onClick={onPrev}
            className="absolute left-4 z-30 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 shadow-xl backdrop-blur transition-all active:scale-95"
            title="Ảnh trước (Mũi tên trái)"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Nav Next */}
          <button
            onClick={onNext}
            className="absolute right-4 z-30 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 shadow-xl backdrop-blur transition-all active:scale-95"
            title="Ảnh tiếp theo (Mũi tên phải)"
          >
            <ChevronRight size={24} />
          </button>

          {/* Interactive Image Viewport */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            className={`w-full h-full flex items-center justify-center p-2 relative overflow-hidden select-none ${
              zoomScale > 1.0
                ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
                : 'cursor-zoom-in'
            }`}
          >
            {photo.isVideo ? (
              <div className="w-full h-full flex items-center justify-center p-4 relative bg-black/60 backdrop-blur-sm">
                <video
                  src={imageSrc || (photo.previewUrl?.startsWith('file://') ? photo.previewUrl : `file://${photo.filePath}`)}
                  controls
                  autoPlay
                  className="max-h-[82vh] max-w-[85vw] rounded-xl shadow-2xl border border-zinc-800"
                />
              </div>
            ) : imageSrc ? (
              <div
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale}) rotate(${totalRotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
                  height: totalRotation % 180 !== 0 ? '82vw' : '86vh',
                  width: totalRotation % 180 !== 0 ? '82vh' : '88vw',
                }}
                className="flex items-center justify-center pointer-events-none"
              >
                <img
                  src={imageSrc}
                  alt={photo.fileName}
                  draggable={false}
                  style={{ imageOrientation: 'from-image' }}
                  className="w-full h-full object-contain shadow-2xl rounded-sm"
                />

              </div>

            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-xs font-mono">Đang giải mã RAW preview nét cao...</span>
              </div>
            )}

          </div>

          {/* Bottom Left Info Tag */}
          <div className="absolute bottom-3 left-4 z-30 pointer-events-none text-zinc-400 font-mono text-[11px] bg-black/60 px-2.5 py-1 rounded backdrop-blur border border-zinc-800/60 flex items-center gap-2">
            <span>Preview: Ảnh gốc — {exifData?.width ? `${exifData.width} px` : (imageDimensions.width ? `${imageDimensions.width} px` : 'Đang nạp...')}</span>
            {lockZoom && zoomScale > 1.0 && (
              <span className="text-amber-400 font-bold border-l border-zinc-700 pl-2">
                🔒 Đã khóa Zoom ({Math.round(zoomScale * 100)}%)
              </span>
            )}
          </div>

          {/* Bottom Center File Name Tag */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-zinc-200 font-sans text-xs bg-zinc-900/90 px-3.5 py-1.5 rounded-full backdrop-blur border border-zinc-850 flex items-center gap-2 shadow-2xl">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold tracking-wide">{photo.fileName}</span>
          </div>








        </div>

        {/* Bottom Horizontal Filmstrip Bar */}
        <div className="h-24 bg-zinc-950 border-t border-zinc-800/90 relative flex items-center shrink-0">
          {selectedIndices.size >= 2 && (
            <button
              onClick={onOpenCompareView}
              className="absolute top-[-36px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-full shadow-2xl transition-all border border-amber-300 animate-bounce"
            >
              <Layers size={14} />
              <span>So sánh {selectedIndices.size} ảnh đã chọn (Phím C)</span>
            </button>
          )}

          <div
            ref={filmstripRef}
            onWheel={(e) => {
              if (e.deltaY > 0) {
                onNext();
              } else if (e.deltaY < 0) {
                onPrev();
              }
            }}
            className="flex-1 flex items-center gap-2 px-3 overflow-x-auto h-full filmstrip-scroll py-2 select-none"
          >

            {allPhotos.slice(Math.max(0, currentIndex - 20), currentIndex + 21).map((item, relIdx) => {
              const idx = Math.max(0, currentIndex - 20) + relIdx;
              const isActive = idx === currentIndex;
              const isSelected = selectedIndices.has(idx);
              const prevInfo: any = filmstripPreviews[item.id];
              const thumbUrl = typeof prevInfo === 'string' ? prevInfo : prevInfo?.url || '';
              const ori = typeof prevInfo === 'string' ? item.orientation || 1 : prevInfo?.orientation || item.orientation || 1;
              const rotationDeg = getExifRotationDeg(ori);

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={(e) => onSelectPhoto(idx, e)}
                  className={`h-20 min-w-[58px] max-w-[80px] shrink-0 rounded-lg overflow-hidden relative cursor-pointer border transition-all flex items-center justify-center bg-zinc-900/90 ${
                    isActive
                      ? 'ring-2 ring-blue-500 border-blue-400 scale-105 z-10 shadow-lg'
                      : isSelected
                      ? 'ring-1 ring-amber-400 border-amber-400 opacity-90'
                      : 'border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  }`}
                >
                  {item.isVideo ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black relative">
                      <video
                        src={thumbUrl ? (thumbUrl.includes('#t=') ? thumbUrl : `${thumbUrl}#t=0.5`) : `file://${item.filePath.replace(/\\/g, '/')}#t=0.5`}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                        preload="metadata"
                        muted
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play size={14} className="fill-white text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : thumbUrl ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-zinc-900">
                      <img
                        src={thumbUrl}
                        alt={item.fileName}
                        style={{
                          transform: rotationDeg ? `rotate(${rotationDeg}deg) scale(${rotationDeg % 180 !== 0 ? 1.45 : 1})` : 'none',
                        }}
                        className="max-h-full max-w-full object-contain transition-transform"
                        loading="lazy"
                      />
                    </div>
                  ) : (

                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
                      {item.isRaw ? 'RAW' : 'MEDIA'}
                    </div>
                  )}


                  {item.rating > 0 && (
                    <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 bg-black/80 text-[8px] font-mono text-amber-400 rounded">
                      ★{item.rating}
                    </span>
                  )}
                  {item.isTagged && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar: EXIF Metadata & RGB Histogram (Bảng Thông Số Chuẩn Lightroom) */}
      <aside className="w-80 bg-zinc-950 border-l border-zinc-800/90 flex flex-col h-full overflow-hidden text-xs z-30 shrink-0 shadow-2xl">
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-2 shrink-0">
          <span className="font-mono font-bold text-zinc-100 truncate text-xs flex-1" title={photo.fileName}>
            {photo.fileName}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onSetRating(photo.rating === 5 ? 0 : 5)}
              className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold rounded hover:bg-amber-500/30 transition-colors"
            >
              ★ {photo.rating > 0 ? `${photo.rating} Sao` : 'Gán 5 Sao'}
            </button>
          </div>

        </div>

        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950 shrink-0">
          {imageSrc && <Histogram imageSrc={imageSrc} width={295} height={110} />}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono sidebar-scroll text-[11.5px] text-zinc-300">
          <div className="flex flex-col gap-1 border-b border-zinc-800/60 pb-2">
            <span className="text-zinc-500 text-[10.5px]">Đường dẫn</span>
            <span className="text-zinc-400 text-[10.5px] break-all select-text font-mono leading-tight">
              {photo.filePath}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 border-b border-zinc-800/60 pb-3">
            <div>
              <span className="text-zinc-500 block text-[10px]">Định dạng</span>
              <span className="text-blue-400 font-bold uppercase">{photo.fileType} {photo.isRaw ? '(RAW)' : ''}</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">Dung lượng</span>
              <span className="text-zinc-200 font-semibold">{exifData?.fileSizeFormatted || '—'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">Độ phân giải</span>
              <span className="text-zinc-200 font-bold">
                {exifData?.width ? `${exifData.width} × ${exifData.height}` : (imageDimensions.width ? `${imageDimensions.width} × ${imageDimensions.height}` : '—')}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">Ngày chụp</span>
              <span className="text-zinc-200 text-[10px] font-semibold">{exifData?.dateTaken || '—'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">Sửa đổi</span>
              <span className="text-zinc-400 text-[10px]">{exifData?.dateModified || '—'}</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">Nguồn preview</span>
              <span className="text-amber-400 text-[10px] font-semibold">{photo.isRaw ? 'RAW Embedded HD' : 'Ảnh gốc'}</span>
            </div>
          </div>

          {/* DEEP LEARNING EYE & PHOTO QUALITY ANALYSIS (SECTION 13 & 14) */}
          <div className="space-y-2 border-b border-zinc-800/60 pb-3 bg-purple-950/20 p-2.5 rounded-lg border border-purple-500/20 font-mono">
            <span className="text-purple-300 font-bold uppercase tracking-wider text-[10px] block mb-1">
              🤖 DEEP LEARNING EYE ANALYSIS
            </span>

            {/* Left Eye & Right Eye Status */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Left Eye</span>
              <span className={`font-bold ${
                photo.aiData?.leftEye?.status === 'CLOSED' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {photo.aiData?.leftEye?.status || 'OPEN'}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Right Eye</span>
              <span className={`font-bold ${
                photo.aiData?.rightEye?.status === 'CLOSED' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {photo.aiData?.rightEye?.status || 'OPEN'}
              </span>
            </div>

            <div className="h-px bg-zinc-800/80 my-1" />

            {/* Eye Opening Ratio */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Eye Opening</span>
              <span className="text-amber-300 font-semibold">
                {photo.aiData?.openingRatioAvg !== undefined
                  ? `${(photo.aiData.openingRatioAvg * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            {/* Iris Visibility */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Iris Visibility</span>
              <span className="text-purple-300 font-semibold">
                {photo.aiData?.irisVisibilityAvg !== undefined
                  ? `${(photo.aiData.irisVisibilityAvg * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            {/* EAR */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">EAR</span>
              <span className="text-zinc-300 font-semibold">
                {photo.aiData?.earScore !== undefined ? photo.aiData.earScore : '0.30'}
              </span>
            </div>

            {/* Landmark Confidence */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Landmark</span>
              <span className="text-emerald-400 font-semibold">
                {photo.aiData?.confidenceAvg !== undefined
                  ? `${(photo.aiData.confidenceAvg * 100).toFixed(0)}%`
                  : '95%'}
              </span>
            </div>

            <div className="h-px bg-zinc-800/80 my-1" />

            {/* Eye Open Score */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Eye Open Score</span>
              <span className="text-amber-400 font-bold">
                {photo.aiData?.eyeOpennessScore !== undefined ? `${photo.aiData.eyeOpennessScore} / 100` : '—'}
              </span>
            </div>

            {/* Eye Sharpness (Độ nét mắt) */}
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-zinc-400">Eye Sharpness</span>
              <span className={`font-bold ${
                (photo.aiData?.eyeSharpness ?? photo.aiData?.sharpnessScore ?? 0) >= 50
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {photo.aiData?.eyeSharpness !== undefined
                  ? `${photo.aiData.eyeSharpness} / 100`
                  : photo.aiData?.sharpnessScore !== undefined
                  ? `${photo.aiData.sharpnessScore} / 100`
                  : '—'}
              </span>
            </div>

            {/* Motion Blur Warning (Cảnh báo rung tay) */}
            {photo.aiData?.isMotionBlur && (
              <div className="flex justify-between items-center text-[10.5px] bg-red-500/20 px-2 py-1 rounded border border-red-500/40">
                <span className="text-red-300 font-bold">Cảnh báo chụp</span>
                <span className="text-red-400 font-extrabold animate-pulse">
                  ⚠️ RUNG TAY ({photo.aiData.motionBlurScore}%)
                </span>
              </div>
            )}

            {/* Binary Result Badge */}
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-zinc-300 font-bold">RESULT</span>
              {photo.aiData?.eyeStatus === 'CLOSED' || photo.aiData?.isBlink ? (
                <span className="text-red-400 font-bold flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">
                  <EyeOff size={12} /> NHẮM MẮT (CLOSED)
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  👁️ MỞ MẮT (OPEN)
                </span>
              )}
            </div>


            {/* Photo Quality Score */}
            <div className="flex justify-between items-center text-[10.5px] pt-1 border-t border-purple-500/30 mt-1">
              <span className="text-purple-200 font-semibold">PHOTO QUALITY SCORE</span>
              <span className="text-amber-300 font-extrabold text-[12px]">
                {photo.aiData?.overallPhotoQualityScore !== undefined ? `${photo.aiData.overallPhotoQualityScore} / 100` : '—'}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-b border-zinc-800/60 pb-3">
            <div className="flex justify-between">
              <span className="text-zinc-500">Hãng máy</span>
              <span className="text-zinc-200 font-semibold">{exifData?.make || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Model</span>
              <span className="text-amber-300 font-bold">{exifData?.model || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Ống kính</span>
              <span className="text-zinc-200 font-semibold text-[10.5px] truncate max-w-[170px]" title={exifData?.lens}>{exifData?.lens || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">ISO</span>
              <span className="text-amber-400 font-bold">{exifData?.iso ? `ISO ${exifData.iso}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Khẩu độ</span>
              <span className="text-amber-400 font-bold">{exifData?.fNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tốc độ</span>
              <span className="text-amber-400 font-bold">{exifData?.shutterSpeed || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tiêu cự</span>
              <span className="text-amber-400 font-bold">{exifData?.focalLength || '—'}</span>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-zinc-500 block text-[10px] mb-1.5">Rating</span>
            <div className="flex items-center gap-1.5 bg-zinc-900 p-2 rounded-lg border border-zinc-800 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onSetRating(star === photo.rating ? 0 : star)}
                  className={`p-1 rounded transition-transform hover:scale-125 ${
                    star <= photo.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700 hover:text-amber-300'
                  }`}
                >
                  <Star size={18} className={star <= photo.rating ? 'fill-amber-400' : ''} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
