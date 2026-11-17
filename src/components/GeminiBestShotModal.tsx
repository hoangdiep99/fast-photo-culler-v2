import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Check, AlertCircle, Smile } from 'lucide-react';
import { PhotoItem } from '../types';
import { analyzeBestShotWithGemini, BestShotAnalysisResult } from '../utils/geminiVision';

interface GeminiBestShotModalProps {
  selectedPhotos: PhotoItem[];
  apiKey: string;
  onClose: () => void;
  onSelectBestPhoto: (photo: PhotoItem) => void;
}


export const GeminiBestShotModal: React.FC<GeminiBestShotModalProps> = ({
  selectedPhotos,
  apiKey,
  onClose,
  onSelectBestPhoto,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BestShotAnalysisResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!apiKey) {
        setIsLoading(false);
        setErrorMsg('Vui lòng mở Cài đặt ⚙️ để nhập Google Gemini API Key trước khi sử dụng!');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMsg(null);

        // Chuẩn bị dữ liệu base64 thumbnail cho nhóm ảnh được chọn
        const photosPayload: { id: string; fileName: string; base64Data: string }[] = [];

        for (const p of selectedPhotos) {
          let base64 = p.previewUrl || '';

          // 1. Dùng Electron IPC lấy trực tiếp Base64 dữ liệu ảnh
          if (!base64.startsWith('data:image') && window.electronAPI && (window.electronAPI as any).getBase64Data) {
            try {
              const nativeB64 = await (window.electronAPI as any).getBase64Data(p.filePath);
              if (nativeB64) base64 = nativeB64;
            } catch {}
          }

          // 2. Dự phòng: Chuyển đổi file:// hoặc http:// URL thành Base64
          if (!base64.startsWith('data:image') && base64) {
            try {
              const res = await fetch(base64);
              const blob = await res.blob();
              base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string) || '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
              });
            } catch {}
          }

          if (base64 && base64.startsWith('data:image')) {
            photosPayload.push({
              id: p.id,
              fileName: p.fileName,
              base64Data: base64,
            });
          }
        }

        if (photosPayload.length === 0) {
          throw new Error('Không thể tải dữ liệu ảnh xem trước (Đang giải mã file RAW). Vui lòng thử lại sau vài giây.');
        }


        const result = await analyzeBestShotWithGemini(apiKey, photosPayload);
        if (isMounted) {
          setAnalysisResult(result);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Lỗi phân tích ảnh với Google Gemini AI.');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedPhotos, apiKey]);

  const winnerPhoto = selectedPhotos.find(
    (p) => p.id === analysisResult?.bestPhotoId || p.fileName === analysisResult?.bestFileName
  ) || selectedPhotos[0];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-zinc-900 border border-purple-500/40 w-full max-w-4xl rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>GOOGLE GEMINI AI: CHỌN BỨC ẢNH ĐẸP NHẤT</span>
                <span className="text-xs font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {selectedPhotos.length} ảnh ứng viên
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Phân tích nụ cười, góc mắt & thần thái tự nhiên từ Google Gemini Vision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* State: Loading */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
              <Sparkles size={24} className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-300">Đang nhờ Google Gemini AI soi từng bức ảnh...</h3>
              <p className="text-xs text-zinc-400 mt-1">Đang đánh giá nụ cười, độ mở mắt & góc thần thái tự nhiên nhất</p>
            </div>
          </div>
        )}

        {/* State: Error */}
        {!isLoading && errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Không thể phân tích ảnh:</p>
              <p className="mt-1 font-mono text-[11px] text-rose-200">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* State: Success Result */}
        {!isLoading && analysisResult && winnerPhoto && (
          <div className="space-y-6">
            {/* Banner Chiến Thắng (Winner Banner) */}
            <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border border-purple-500/40 p-4 rounded-xl flex items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                  <Trophy size={26} />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏆 BỨC ẢNH ĐẸP NHẤT ĐƯỢC GOOGLE GEMINI CHỌN:</span>
                    <span className="font-mono text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      {winnerPhoto.fileName}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 mt-1 italic font-medium">
                    "{analysisResult.reason}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onSelectBestPhoto(winnerPhoto);
                  onClose();
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Check size={16} />
                <span>Chọn Bức Này (Gán ⭐ 5 Sao)</span>
              </button>
            </div>

            {/* Grid các ảnh ứng viên với Điểm Cảm Xúc */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {selectedPhotos.map((p) => {
                const isWinner = p.id === winnerPhoto.id;
                const scoreData = analysisResult.photoScores[p.id] || {
                  smileScore: 85,
                  emotion: 'Tự nhiên',
                  overallScore: 88,
                };

                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all relative ${
                      isWinner
                        ? 'bg-amber-950/20 border-amber-500/80 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Winner Badge */}
                    {isWinner && (
                      <div className="absolute top-4 left-4 z-10 bg-amber-500 text-zinc-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Trophy size={11} />
                        <span>#1 BEST SHOT</span>
                      </div>
                    )}

                    {/* Image Thumbnail */}
                    <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black relative">
                      <img
                        src={p.previewUrl || ''}
                        alt={p.fileName}
                        className="w-full h-full object-cover"
                      />

                    </div>

                    {/* Metadata & Scores */}
                    <div className="space-y-1 text-xs">
                      <div className="font-mono font-bold text-zinc-300 truncate">{p.fileName}</div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Smile size={12} />
                          Nụ cười: {scoreData.smileScore || 85}%
                        </span>
                        <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                          {scoreData.emotion || 'Tự nhiên'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
