import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, AlertTriangle, CheckCircle, Eye, Focus, RefreshCw } from 'lucide-react';
import { PhotoItem } from '../types';

interface FaceZoomPanelProps {
  photo: PhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  width?: number;
}

export const FaceZoomPanel = React.memo<FaceZoomPanelProps>(({
  photo,
  isOpen,
  onClose,
  width = 320
}) => {
  const [highResUrl, setHighResUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!photo || !isOpen) {
      setHighResUrl('');
      return;
    }

    let isMounted = true;

    // 1. ⚡ Hiển thị NGAY LẬP TỨC (0ms) từ previewUrl nếu có, không để màn hình chờ
    if (photo.previewUrl) {
      setHighResUrl(photo.previewUrl);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadHighRes = async () => {
      // 2. Nạp ảnh 4K sắc nét ngầm trong nền
      if ((window as any).electronAPI?.getBase64Data) {
        try {
          const fullRes = await (window as any).electronAPI.getBase64Data(photo.filePath);
          if (isMounted && fullRes) {
            setHighResUrl(fullRes);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // 3. Fallback to normal preview url
      if (isMounted && !photo.previewUrl) {
        setHighResUrl(`app-thumb:///${encodeURIComponent(photo.filePath)}`);
        setLoading(false);
      }
    };

    loadHighRes();

    return () => {
      isMounted = false;
    };
  }, [photo?.id, photo?.filePath, photo?.previewUrl, isOpen]);

  if (!isOpen || !photo) return null;

  const eyeScore = photo.aiData?.eyeOpennessScore || (photo.aiData?.isBlink ? 35 : 92);
  const sharpnessScore = photo.aiData?.sharpnessScore || photo.aiData?.overallPhotoQualityScore || 85;
  const isBlink = photo.aiData?.isBlink || false;

  return (
    <div
      style={{ width: `${width}px` }}
      className="bg-zinc-950 border-l border-zinc-800/90 flex flex-col z-30 select-none shadow-2xl shrink-0"
    >
      {/* Panel Header */}
      <div className="h-11 px-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span>ẢNH ĐANG CHỌN (ĐỘ PHÂN GIẢI CAO)</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
          title="Đóng bảng xem thử"
        >
          ✕
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 sidebar-scroll">
        <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between bg-zinc-900/60 p-2 rounded border border-zinc-800">
          <span className="truncate font-semibold text-zinc-300">Tệp: {photo.fileName}</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-3 space-y-2.5">
          {/* High-res Image Display */}
          <div className="w-full aspect-[3/4] bg-black rounded-lg overflow-hidden border border-zinc-800 relative shadow-inner flex items-center justify-center">
            {highResUrl ? (
              <img
                src={highResUrl}
                alt={photo.fileName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-[10px]">Đang nạp ảnh nét...</span>
              </div>
            )}

            {/* Best Shot Badge Overlay */}
            {photo.isBestShot && (
              <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg border border-yellow-200 flex items-center gap-1">
                  <span>⭐</span> BEST SHOT
                </span>
              </div>
            )}

            {/* Status Badge Overlay */}
            {photo.aiData && (
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                {isBlink ? (
                  <span className="bg-rose-600/90 text-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 border border-rose-400/40">
                    <AlertTriangle className="w-3 h-3" /> NHẮM MẮT
                  </span>
                ) : (
                  <span className="bg-emerald-600/90 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 border border-emerald-400/40">
                    <CheckCircle className="w-3 h-3" /> MỞ MẮT
                  </span>
                )}
              </div>
            )}

            {/* Burst Info Bottom Banner */}
            {photo.burstGroupCount && photo.burstGroupCount > 1 && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm border border-zinc-700/80 rounded-md px-2 py-1 text-[9.5px] font-mono flex items-center justify-between text-zinc-300">
                <span>Loạt chụp: {photo.burstGroupCount} ảnh</span>
                <span className={photo.isBestShot ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                  {photo.isBestShot ? '👑 #1 Đẹp nhất' : `Thứ ${photo.burstGroupIndex || 1}/${photo.burstGroupCount}`}
                </span>
              </div>
            )}
          </div>

          {/* Quality Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-semibold">
            <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Mắt:
              </span>
              <span className={isBlink ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {eyeScore}%
              </span>
            </div>

            <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1">
                <Focus className="w-3.5 h-3.5 text-amber-400" /> Nét:
              </span>
              <span className="text-amber-400 font-bold">
                {sharpnessScore}%
              </span>
            </div>
          </div>

          {photo.aiData?.smileScore !== undefined && (
            <div className="bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">😊 Nụ cười & Biểu cảm:</span>
              <span className={photo.aiData.smileScore > 60 ? 'text-emerald-400 font-bold' : 'text-zinc-300'}>
                {photo.aiData.smileScore}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
