import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, HardDrive, Cpu, Check, Save, Sun, Moon, Monitor } from 'lucide-react';
import { CacheInfo, RawPreviewResolution, ThemeMode } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  rawResolution: RawPreviewResolution;
  onChangeRawResolution: (res: RawPreviewResolution) => void;
  onClearAICache?: () => void;
  eyeOpeningThresholdPct?: number;
  onChangeEyeThreshold?: (pct: number) => void;
  themeMode: ThemeMode;
  onChangeThemeMode: (mode: ThemeMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  rawResolution,
  onChangeRawResolution,
  onClearAICache,
  eyeOpeningThresholdPct = 35,
  onChangeEyeThreshold,
  themeMode,
  onChangeThemeMode,
}) => {

  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    usedBytes: 260.2 * 1024 * 1024,
    limitMB: 4096,
    itemCount: 1213,
    autoClearDays: 30,
    cachePath: 'C:\\Users\\DiepPC\\AppData\\Local\\com.xanhmedia.photosnaply\\preview-cache',
  });
  const [autoClearDays, setAutoClearDays] = useState<number>(30);
  const [limitMB, setLimitMB] = useState<number>(4096);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [eyeThresholdPct, setEyeThresholdPct] = useState<number>(eyeOpeningThresholdPct);
  const [activeTab, setActiveTab] = useState<'settings' | 'info'>('settings');

  // 🤖 Google Gemini API Key States
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('fast_photo_culler_gemini_api_key') || '';
    } catch { return ''; }
  });
  const [isTestingApiKey, setIsTestingApiKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getCacheInfo().then((res: any) => {
        if (res) setCacheInfo(res);
      });
    }
  }, []);

  const handleTestApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập Google Gemini API Key!' });
      return;
    }
    setIsTestingApiKey(true);
    setTestResult(null);

    const { testGeminiApiKey } = await import('../utils/geminiVision');
    const result = await testGeminiApiKey(geminiApiKey);
    setIsTestingApiKey(false);
    setTestResult(result);

    if (result.success) {
      try {
        localStorage.setItem('fast_photo_culler_gemini_api_key', geminiApiKey.trim());
      } catch {}
    }
  };


  const handleClearCache = async () => {
    setIsClearing(true);
    if (window.electronAPI) {
      await window.electronAPI.clearCache();
      const updated = await window.electronAPI.getCacheInfo();
      if (updated) setCacheInfo(updated);
    }
    if (onClearAICache) {
      onClearAICache();
    }
    setIsClearing(false);
  };

  const handleOpenCacheFolder = () => {
    if (window.electronAPI) {
      window.electronAPI.openCacheFolder();
    }
  };

  const handleSaveAndScan = () => {
    try {
      localStorage.setItem('fast_photo_culler_gemini_api_key', geminiApiKey.trim());
    } catch {}
    if (onChangeEyeThreshold) {
      onChangeEyeThreshold(eyeThresholdPct);
    }
    if (onClearAICache) {
      onClearAICache();
    }
    onClose();
  };


  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
  const usedMB = Number(formatMB(cacheInfo.usedBytes || 0));
  const percent = Math.min(100, Math.round((usedMB / limitMB) * 100));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <Cpu size={18} className="text-blue-500" />
              <span>{activeTab === 'settings' ? 'Cài Đặt Hệ Thống' : 'Thông Tin Ứng Dụng'}</span>
            </h2>
            {/* Tab buttons */}
            <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 pt-1">
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-1 border-b-2 px-1 transition-all ${
                  activeTab === 'settings' ? 'border-blue-500 text-zinc-100' : 'border-transparent hover:text-zinc-300'
                }`}
              >
                Cài Đặt
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`pb-1 border-b-2 px-1 transition-all ${
                  activeTab === 'info' ? 'border-blue-500 text-zinc-100' : 'border-transparent hover:text-zinc-300'
                }`}
              >
                Thông Tin App
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {activeTab === 'settings' ? (
          <>
            {/* SECTION 0: GIAO DIỆN SÁNG / TỐI / TỰ ĐỘNG HỆ THỐNG */}
            <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-blue-500/40 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  🎨 GIAO DIỆN CHỦ ĐỀ (THEME MODE)
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'dark', label: 'Chế độ Tối (Dark)', icon: Moon, desc: 'Giao diện tối dịu mắt' },
                  { id: 'light', label: 'Chế độ Sáng (Light)', icon: Sun, desc: 'Giao diện sáng rõ nét' },
                  { id: 'system', label: 'Tự động (System)', icon: Monitor, desc: 'Tự chuyển theo Windows' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChangeThemeMode(item.id as ThemeMode)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white font-bold ring-1 ring-blue-500/50'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Icon size={16} className={isSelected ? 'text-blue-400' : 'text-zinc-400'} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-normal">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 1: CÀI ĐẶT NGƯỠNG PHÁT HIỆN NHẮM MẮT (% EYE OPENING) */}
            <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-purple-500/40 shadow-lg shadow-purple-950/20">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  🤖 CÀI ĐẶT NGƯỠNG PHÁT HIỆN NHẮM MẮT (% EYE OPENING)
                </h3>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-200">
                  Nhập % khoảng hở mí mắt tối thiểu (Eye Opening Threshold %):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={80}
                    value={eyeThresholdPct}
                    onChange={(e) => {
                      const val = Math.min(80, Math.max(10, Number(e.target.value) || 35));
                      setEyeThresholdPct(val);
                    }}
                    className="w-28 bg-zinc-900 border border-purple-500/60 text-sm font-bold font-mono text-purple-300 px-3 py-1.5 rounded-lg outline-none focus:border-purple-400"
                  />
                  <span className="text-xs font-mono text-zinc-400">% (Tất cả ảnh có mở mắt dưới % này sẽ coi là Nhắm mắt)</span>
                </div>

                {/* Presets buttons */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {[
                    { label: '25% (Chỉ nhắm hẳn)', val: 25 },
                    { label: '35% (Mặc định Google MediaPipe)', val: 35 },
                    { label: '45% (Khắt khe Studio)', val: 45 },
                    { label: '55% (Rất khắt khe)', val: 55 },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setEyeThresholdPct(btn.val)}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-mono transition-all ${
                        eyeThresholdPct === btn.val
                          ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-sm ring-2 ring-purple-500/50'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Hướng dẫn Google MediaPipe */}
                <div className="bg-purple-950/40 p-3 rounded-lg border border-purple-500/30 text-xs space-y-1.5 text-zinc-300 mt-2">
                  <div className="font-bold text-purple-300 flex items-center gap-1">
                    🌟 MÔ HÌNH GOOGLE MEDIAPIPE FACE MESH (468 3D LANDMARKS):
                  </div>
                  <p>
                    • <strong>Mắt mở to tròn (DIP_6977.NEF, DIP_6941.NEF)</strong>: Đo 468 điểm 3D ➔ Hiển thị <strong>88% – 98%</strong>.
                  </p>
                  <p>
                    • <strong>Mắt nhắm / cúi nhìn bánh (DIP_6909.NEF, DIP_6921.NEF)</strong>: Đo 468 điểm 3D ➔ Hiển thị <strong>12%</strong> &amp; <span className="text-red-400 font-bold">NHẮM MẮT</span> 100%!
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: RENDER CACHE */}
            <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive size={15} className="text-amber-500" />
                  <span>RENDER CACHE</span>
                </h3>
                <span className="text-xs font-mono text-zinc-400 font-semibold">
                  {usedMB} MB / {(limitMB / 1024).toFixed(1)} GB
                </span>
              </div>

              {/* Progress bar & item count */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[11px] text-zinc-500 font-mono block">
                  {(cacheInfo.itemCount || 0).toLocaleString()} mục cache
                </span>
              </div>

              {/* Giới hạn cache MB */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">Giới hạn cache (MB)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    value={limitMB}
                    onChange={(e) => setLimitMB(Number(e.target.value))}
                    className="w-24 bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 px-3 py-1.5 rounded-lg outline-none focus:border-blue-500"
                  />
                  {[
                    { label: '1 GB', val: 1024 },
                    { label: '2 GB', val: 2048 },
                    { label: '4 GB', val: 4096 },
                    { label: '8 GB', val: 8192 },
                    { label: '16 GB', val: 16384 },
                    { label: '32 GB', val: 32768 },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setLimitMB(btn.val)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition-all ${
                        limitMB === btn.val
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-zinc-500 italic block">Khoảng cho phép 512 – 102400 MB.</span>
              </div>

              {/* Checkbox tự xóa cache */}
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  id="autoclear"
                  defaultChecked
                  className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="autoclear" className="cursor-pointer">Tự xóa cache cũ hơn</label>
                <input
                  type="number"
                  value={autoClearDays}
                  onChange={(e) => setAutoClearDays(Number(e.target.value))}
                  className="w-16 bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 px-2 py-1 rounded-lg outline-none focus:border-blue-500"
                />
                <span>ngày</span>
              </div>

              {/* Vị trí cache */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-400">Vị trí cache</label>
                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg font-mono text-[11px] text-zinc-400 truncate">
                  {cacheInfo.cachePath}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
                <span className="text-[11px] text-purple-300 font-mono flex items-center gap-1">
                  ✨ Dọn cache sẽ xóa sạch cache ảnh & toàn bộ dữ liệu AI scan cũ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenCacheFolder}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <FolderOpen size={14} />
                    <span>Mở thư mục cache</span>
                  </button>
                  <button
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Dọn dẹp cache ảnh render và xóa toàn bộ dữ liệu AI scan cũ để AI quét lại mới 100%"
                  >
                    <Trash2 size={14} />
                    <span>{isClearing ? 'Đang dọn cache...' : 'Dọn cache & Xóa dữ liệu AI cũ'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: RAW PREVIEW */}
            <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <div className="border-b border-zinc-800/60 pb-2">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  RAW PREVIEW
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Độ phân giải tối đa khi xem bình thường</p>
              </div>

              {/* Grid options */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'auto', title: 'Tự động', desc: '' },
                  { id: '1600', title: '1600 px', desc: 'Nhanh (máy yếu)' },
                  { id: '2400', title: '2400 px', desc: 'Cân bằng' },
                  { id: '3200', title: '3200 px', desc: 'Chi tiết (máy mạnh)' },
                  { id: '4096', title: '4096 px', desc: 'Máy mạnh' },
                  { id: 'max', title: 'Tối đa embedded preview', desc: 'Máy rất mạnh' },
                ].map((opt) => {
                  const isSelected = rawResolution === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onChangeRawResolution(opt.id as RawPreviewResolution)}
                      className={`p-3 rounded-xl border flex flex-col text-left transition-all relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/15 text-white ring-1 ring-blue-500/50'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-zinc-200">{opt.title}</span>
                        {isSelected && <Check size={14} className="text-blue-400" />}
                      </div>
                      {opt.desc && <span className="text-[10px] text-zinc-500 mt-1 block">{opt.desc}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* 👑 APP INFO TAB CONTENT (Thành quả của Hoàng Điệp) */
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[300px]">
            {/* Left Column: Text Specs */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30 shadow-lg">
                <Cpu size={24} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-100 tracking-wide">
                  Fast Photo Culler AI
                </h3>
                <p className="text-xs text-amber-400/80 font-mono font-bold">
                  Version 2.2.0 (digiKam & MediaPipe Powered)
                </p>
              </div>

              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Phần mềm tuyển chọn ảnh RAW & JPEG chuyên nghiệp siêu tốc. Tự động liên kết cơ sở dữ liệu digiKam và phân tích độ mở mắt, độ nét khuôn mặt thời gian thực bằng mô hình học sâu Google MediaPipe.
              </p>

              <div className="w-full max-w-xs border-t border-zinc-900 my-1" />

              <div className="space-y-3">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">
                  Tác giả & Nhà phát triển
                </span>
                
                {/* Glowing, Pulsing Author Button linking to Facebook profile */}
                <button
                  onClick={() => {
                    if ((window as any).electronAPI?.openExternalUrl) {
                      (window as any).electronAPI.openExternalUrl('https://www.facebook.com/HoangdiepLN');
                    }
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-zinc-950 font-black rounded-full text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.95)] hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse border border-amber-400/40 cursor-pointer"
                  title="Ghé thăm Facebook Hoàng Điệp"
                >
                  👑 Hoàng Điệp 🔗
                </button>
              </div>
            </div>

            {/* Right Column: Donate QR Code */}
            <div className="flex flex-col items-center gap-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80 shrink-0 select-text">
              <img
                src="./donate_qr.png"
                alt="Donate Cà phê"
                className="w-36 h-48 object-contain rounded-lg border border-zinc-800 bg-white"
              />
              <span className="text-[11px] font-bold text-amber-400 font-mono tracking-wider animate-pulse flex items-center gap-1">
                ☕ DONATE CÀ PHÊ
              </span>
            </div>
          </div>
        )}

        <div className={`flex items-center pt-4 mt-2 border-t border-zinc-800 ${activeTab === 'settings' ? 'justify-between' : 'justify-end'}`}>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
          >
            {activeTab === 'settings' ? 'Hủy / Đóng' : 'Đóng cửa sổ'}
          </button>
          
          {activeTab === 'settings' && (
            <button
              onClick={handleSaveAndScan}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all transform active:scale-95"
            >
              <Save size={16} />
              <span>LƯU CÀI ĐẶT & TỰ ĐỘNG QUÉT LẠI AI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
