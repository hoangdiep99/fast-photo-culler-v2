import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export interface UpdateInfoModalProps {
  updateInfo: {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseName: string;
    releaseNotes: string;
    publishedAt: string;
    assetName: string;
    assetSize: number;
    downloadUrl: string;
    htmlUrl: string;
    error?: string;
  };
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateInfoModalProps> = ({ updateInfo, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [progressData, setProgressData] = useState<{
    percent: number;
    downloadedMB: number;
    totalMB: number;
    speedMBs: number;
  }>({
    percent: 0,
    downloadedMB: 0,
    totalMB: 0,
    speedMBs: 0,
  });
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateDownloadProgress) return;

    const cleanup = window.electronAPI.onUpdateDownloadProgress((data: any) => {
      setProgressData(data);
      if (data.percent >= 100) {
        setDownloadSuccess(true);
      }
    });

    return () => cleanup();
  }, []);

  const handleStartUpdate = async () => {
    if (!window.electronAPI?.downloadAndInstallUpdate || !updateInfo.downloadUrl) {
      if (window.electronAPI?.openExternalUrl) {
        window.electronAPI.openExternalUrl(updateInfo.htmlUrl);
      } else {
        window.open(updateInfo.htmlUrl, '_blank');
      }
      return;
    }

    setDownloading(true);
    setErrorMsg(null);

    try {
      const res = await window.electronAPI.downloadAndInstallUpdate(updateInfo.downloadUrl);
      if (!res.success) {
        setErrorMsg(res.error || 'Có lỗi xảy ra khi tải bản cập nhật.');
        setDownloading(false);
      } else {
        setDownloadSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi tải cập nhật.');
      setDownloading(false);
    }
  };

  const handleOpenGitHub = () => {
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(updateInfo.htmlUrl);
    } else {
      window.open(updateInfo.htmlUrl, '_blank');
    }
  };

  const formattedSize = updateInfo.assetSize
    ? `${(updateInfo.assetSize / 1024 / 1024).toFixed(1)} MB`
    : 'Khoảng 118 MB';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-zinc-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Đã có bản cập nhật mới!
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                  v{updateInfo.latestVersion}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Phiên bản hiện tại của bạn: <span className="font-mono text-zinc-300">v{updateInfo.currentVersion}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={downloading && !downloadSuccess}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Release Notes */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Nội dung cập nhật</span>
            </h4>
            <div className="text-xs text-zinc-300 space-y-1.5 leading-relaxed max-h-40 overflow-y-auto font-mono whitespace-pre-line select-text">
              {updateInfo.releaseNotes || 'Bản cập nhật tối ưu hóa hiệu năng, cải thiện tốc độ và sửa lỗi.'}
            </div>
          </div>

          {/* Download Information */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <div className="flex items-center gap-1.5">
              <HardDrive size={13} className="text-zinc-500" />
              <span>Gói cài đặt: <span className="text-zinc-200 font-medium">{updateInfo.assetName || 'Bản cài đặt tiêu chuẩn'}</span></span>
            </div>
            <span className="font-mono text-zinc-300 font-bold">{formattedSize}</span>
          </div>

          {/* Progress Section */}
          {downloading && (
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-2 text-zinc-200">
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span>Đã tải thành công! Đang khởi chạy bộ cài...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={14} className="animate-spin text-amber-400" />
                      <span>Đang tải bản cập nhật...</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {progressData.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    downloadSuccess ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  }`}
                  style={{ width: `${progressData.percent}%` }}
                />
              </div>

              {/* Stats */}
              {!downloadSuccess && (
                <div className="flex justify-between text-[11px] font-mono text-zinc-500 pt-1">
                  <span>
                    {progressData.downloadedMB} MB / {progressData.totalMB || (updateInfo.assetSize ? (updateInfo.assetSize / 1024 / 1024).toFixed(1) : '...')} MB
                  </span>
                  <span>{progressData.speedMBs} MB/s</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Không thể tự động tải:</p>
                <p className="mt-0.5 text-[11px]">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between gap-3">
          <button
            onClick={handleOpenGitHub}
            className="flex items-center gap-1.5 px-3 py-2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Xem trang Release trên GitHub"
          >
            <ExternalLink size={14} />
            <span>Mở trên GitHub</span>
          </button>

          <div className="flex items-center gap-2">
            {!downloading && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Để sau
              </button>
            )}

            <button
              onClick={handleStartUpdate}
              disabled={downloading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-500 text-black cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {downloading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{downloadSuccess ? 'Đang chuẩn bị...' : 'Đang tải...'}</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Cập nhật ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
