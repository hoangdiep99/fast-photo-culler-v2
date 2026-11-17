import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Star, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { PhotoItem } from '../types';

interface CompareViewProps {
  photos: PhotoItem[];
  onClose: () => void;
  onRatingChange: (id: string, rating: number) => void;
  onColorLabelChange: (id: string, label: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  photos,
  onClose,
  onRatingChange,
  onColorLabelChange
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Limit compare to max 4 photos
  const comparePhotos = photos.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col text-white backdrop-blur-md">
      {/* Top Toolbar */}
      <div className="h-14 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sky-400 flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5" /> SO SÁNH ẢNH DẠNG SPLIT-SCREEN ({comparePhotos.length} ẢNH)
          </span>
          <span className="text-xs text-slate-400">Zoom & Pan đồng bộ 100%</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Thu nhỏ Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 min-w-[50px] text-center font-bold text-sky-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.25))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Phóng to Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-white font-medium text-sm flex items-center gap-1.5 transition"
          >
            <X className="w-4 h-4" /> Đóng So Sánh [Esc]
          </button>
        </div>
      </div>

      {/* Compare Grid Panels */}
      <div className={`flex-1 p-4 grid gap-4 ${comparePhotos.length > 2 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-1'}`}>
        {comparePhotos.map((photo, index) => (
          <div key={photo.id} className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col group shadow-xl">
            {/* Header overlay info */}
            <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="bg-sky-600 text-white font-bold text-xs px-2 py-0.5 rounded shadow">
                  #{index + 1}
                </span>
                <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[200px]">
                  {photo.fileName}
                </span>
              </div>

              {photo.aiData?.overallPhotoQualityScore !== undefined && (
                <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-bold ${photo.aiData.overallPhotoQualityScore > 75 ? 'bg-emerald-600/80 text-emerald-100' : 'bg-amber-600/80 text-amber-100'}`}>
                  {photo.aiData.isBlink ? <AlertTriangle className="w-3 h-3 text-rose-300" /> : <CheckCircle className="w-3 h-3 text-emerald-300" />}
                  Nét: {photo.aiData.overallPhotoQualityScore}đ
                </div>
              )}
            </div>

            {/* Photo Image Container */}
            <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-black">
              <img
                src={photo.previewUrl || photo.filePath}
                alt={photo.fileName}
                className="max-h-full max-w-full object-contain transition-transform duration-100 ease-out"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            {/* Bottom Rating Bar overlay */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => onRatingChange(photo.id, star === photo.rating ? 0 : star)}
                    className="p-1 hover:scale-125 transition"
                  >
                    <Star
                      className={`w-4 h-4 ${star <= (photo.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-amber-300'}`}
                    />
                  </button>
                ))}
              </div>

              {/* Color Labels */}
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'red', color: 'bg-rose-500' },
                  { name: 'yellow', color: 'bg-amber-500' },
                  { name: 'green', color: 'bg-emerald-500' },
                  { name: 'blue', color: 'bg-sky-500' },
                ].map(lbl => (
                  <button
                    key={lbl.name}
                    onClick={() => onColorLabelChange(photo.id, lbl.name)}
                    className={`w-3.5 h-3.5 rounded-full ${lbl.color} hover:ring-2 ring-white transition ${photo.colorLabel === lbl.name ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
