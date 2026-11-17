import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { PhotoItem } from '../types';

interface BatchRenameModalProps {
  selectedPhotos: PhotoItem[];
  onClose: () => void;
  onRenameSuccess: (renamedMap: Record<string, string>) => void;
}

type TabType = 'rename' | 'timesync' | 'filter';

interface MtimeStatItem {
  filePath: string;
  fileName: string;
  mtimeMs: number;
  mtimeIso: string;
  size: number;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  selectedPhotos,
  onClose,
  onRenameSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('rename');
  const [workingPhotos, setWorkingPhotos] = useState<PhotoItem[]>(selectedPhotos);

  // Tab 1: Rename states
  const [prefix, setPrefix] = useState<string>('Wedding_Studio');
  const [startNum, setStartNum] = useState<number>(1);
  const [padding, setPadding] = useState<number>(3);
  const [suffix, setSuffix] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Tab 2: Time Sync states (Fotonix-inspired)
  const [mtimeStats, setMtimeStats] = useState<Record<string, MtimeStatItem>>({});
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isApplyingTime, setIsApplyingTime] = useState<boolean>(false);
  const [hasBackup, setHasBackup] = useState<boolean>(false);

  // Tab 3: Quick Filter states
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterPickOnly, setFilterPickOnly] = useState<boolean>(false);
  const [filterOpenEyesOnly, setFilterOpenEyesOnly] = useState<boolean>(false);

  // Fetch disk mtime when entering or photos change
  useEffect(() => {
    let isMounted = true;
    const fetchMtimes = async () => {
      if (!window.electronAPI?.statMtime) return;
      try {
        const paths = workingPhotos.map((p) => p.filePath);
        const res = await window.electronAPI.statMtime(paths);
        if (res?.success && isMounted) {
          const map: Record<string, MtimeStatItem> = {};
          res.items.forEach((item) => {
            map[item.filePath] = item;
          });
          setMtimeStats(map);
        }
      } catch (e) {
        console.error('Failed to stat mtime:', e);
      }
    };
    fetchMtimes();
    return () => {
      isMounted = false;
    };
  }, [workingPhotos]);

  // Total offset in seconds
  const totalOffsetSeconds = useMemo(() => {
    const raw = hours * 3600 + minutes * 60 + seconds;
    return sign === '+' ? raw : -raw;
  }, [sign, hours, minutes, seconds]);

  // Format counter string (e.g. 1 -> "001")
  const formatCounter = (num: number, padLen: number) => {
    return String(num).padStart(padLen, '0');
  };

  // Format date helper
  const formatDateDisplay = (ms: number) => {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  // Preview rename items
  const previewItems = useMemo(() => {
    return workingPhotos.map((photo, index) => {
      const ext = photo.fileName.slice(photo.fileName.lastIndexOf('.'));
      const counterStr = formatCounter(startNum + index, padding);
      const newBase = `${prefix.trim()}${prefix.trim() ? '_' : ''}${counterStr}${suffix.trim() ? '_' : ''}${suffix.trim()}`;
      const newName = `${newBase}${ext}`;
      return {
        photo,
        oldName: photo.fileName,
        newName,
      };
    });
  }, [workingPhotos, prefix, startNum, padding, suffix]);

  // Preview time sync items
  const timePreviewItems = useMemo(() => {
    return workingPhotos.map((p) => {
      const stat = mtimeStats[p.filePath];
      const origMs = stat ? stat.mtimeMs : p.dateModified ? new Date(p.dateModified).getTime() : Date.now();
      const newMs = origMs + totalOffsetSeconds * 1000;
      return {
        photo: p,
        origMs,
        newMs,
      };
    });
  }, [workingPhotos, mtimeStats, totalOffsetSeconds]);

  // Handle execute rename
  const handleExecuteRename = async () => {
    if (!window.electronAPI) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessToast('');

    try {
      const renameMap: Record<string, { oldPath: string; newName: string }> = {};
      previewItems.forEach((item) => {
        renameMap[item.photo.id] = {
          oldPath: item.photo.filePath,
          newName: item.newName,
        };
      });

      const res = await window.electronAPI.batchRenamePhotos(renameMap);
      if (res?.success) {
        onRenameSuccess(res.renamedMap || {});
        onClose();
      } else {
        setErrorMessage(res?.error || 'Có lỗi xảy ra khi đổi tên file trên đĩa');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi đổi tên');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Apply Mtime Shift (Fotonix feature)
  const handleApplyTimeShift = async () => {
    if (!window.electronAPI?.adjustMtime) return;
    if (totalOffsetSeconds === 0) {
      setErrorMessage('Độ lệch thời gian đang bằng 0. Vui lòng nhập số giờ, phút hoặc giây.');
      return;
    }

    setIsApplyingTime(true);
    setErrorMessage('');
    setSuccessToast('');

    try {
      const filePaths = workingPhotos.map((p) => p.filePath);
      const res = await window.electronAPI.adjustMtime({
        filePaths,
        offsetSeconds: totalOffsetSeconds,
      });

      if (res?.success) {
        setSuccessToast(`Đã đồng bộ thời gian thành công cho ${res.updatedCount} ảnh!`);
        setHasBackup(true);

        // Update local stat state
        setMtimeStats((prev) => {
          const next = { ...prev };
          filePaths.forEach((fp) => {
            if (next[fp]) {
              next[fp] = {
                ...next[fp],
                mtimeMs: next[fp].mtimeMs + totalOffsetSeconds * 1000,
              };
            }
          });
          return next;
        });
      } else {
        setErrorMessage(res?.error || 'Không thể cập nhật mtime trên đĩa');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật thời gian file');
    } finally {
      setIsApplyingTime(false);
    }
  };

  // Handle Sort by Adjusted Time
  const handleSortByAdjustedTime = () => {
    const sorted = [...workingPhotos].sort((a, b) => {
      const statA = mtimeStats[a.filePath];
      const statB = mtimeStats[b.filePath];
      const timeA = statA ? statA.mtimeMs : a.dateModified ? new Date(a.dateModified).getTime() : 0;
      const timeB = statB ? statB.mtimeMs : b.dateModified ? new Date(b.dateModified).getTime() : 0;
      return timeA - timeB;
    });
    setWorkingPhotos(sorted);
    setSuccessToast('Đã sắp xếp lại toàn bộ danh sách theo thứ tự thời gian chuẩn!');
  };

  // Handle Restore Original Mtime
  const handleRestoreMtime = async () => {
    if (!window.electronAPI?.restoreMtime) return;
    setIsApplyingTime(true);
    setErrorMessage('');
    setSuccessToast('');

    try {
      const filePaths = workingPhotos.map((p) => p.filePath);
      const res = await window.electronAPI.restoreMtime(filePaths);
      if (res?.success) {
        setSuccessToast(`Đã hoàn tác giờ gốc thành công cho ${res.restoredCount} ảnh!`);
        setHasBackup(false);
        // Refresh mtime
        const statRes = await window.electronAPI.statMtime(filePaths);
        if (statRes?.success) {
          const map: Record<string, MtimeStatItem> = {};
          statRes.items.forEach((item) => {
            map[item.filePath] = item;
          });
          setMtimeStats(map);
        }
      } else {
        setErrorMessage(res?.error || 'Không tìm thấy dữ liệu sao lưu mtime để hoàn tác');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi phục hồi thời gian gốc');
    } finally {
      setIsApplyingTime(false);
    }
  };

  // Apply Quick Filter
  const handleApplyFilter = () => {
    let filtered = [...selectedPhotos];
    if (filterMinRating > 0) {
      filtered = filtered.filter((p) => p.rating >= filterMinRating);
    }
    if (filterPickOnly) {
      filtered = filtered.filter((p) => p.isTagged);
    }
    if (filterOpenEyesOnly) {
      filtered = filtered.filter((p) => p.aiData?.eyeStatus === 'OPEN');
    }
    setWorkingPhotos(filtered);
    setSuccessToast(`Đã lọc còn ${filtered.length} / ${selectedPhotos.length} ảnh!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header with Navigation Tabs */}
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rename')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'rename'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Edit3 size={15} />
              <span>Đổi Tên Hàng Loạt</span>
            </button>

            <button
              onClick={() => setActiveTab('timesync')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'timesync'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Clock size={15} />
              <span>Đồng Bộ Giờ & Mtime</span>
              {totalOffsetSeconds !== 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('filter')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'filter'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Filter size={15} />
              <span>Lọc Nhanh ({workingPhotos.length})</span>
            </button>
          </div>

          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* TAB 1: RENAME CONTENT */}
        {activeTab === 'rename' && (
          <>
            <div className="p-5 space-y-3.5 border-b border-zinc-800/80 bg-zinc-900/30 shrink-0 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Tiền tố (Prefix):
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="VD: Wedding_NgaVit"
                    className="w-full h-8 px-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg text-zinc-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Số bắt đầu:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startNum}
                    onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-8 px-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg text-zinc-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Độ dài số (Padding):
                  </label>
                  <select
                    value={padding}
                    onChange={(e) => setPadding(parseInt(e.target.value))}
                    className="w-full h-8 px-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg text-zinc-200 outline-none font-mono"
                  >
                    <option value={2}>2 số (01, 02...)</option>
                    <option value={3}>3 số (001, 002...)</option>
                    <option value={4}>4 số (0001, 0002...)</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-zinc-500">Mẫu nhanh:</span>
                {['Wedding', 'Event_Sukiên', 'KyYeu_Lop', 'TiecCuoi', 'ChupStudio'].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => setPrefix(sample)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/90 rounded text-[11px] text-zinc-300 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 sidebar-scroll font-mono text-xs">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Xem trước tên mới ({previewItems.length} file)
                </span>
                <span className="text-[11px] text-amber-400/90 font-medium">
                  Mẫu: {previewItems[0]?.newName}
                </span>
              </div>

              {previewItems.map((item) => (
                <div
                  key={item.photo.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg transition-colors"
                >
                  <span className="text-zinc-400 truncate flex-1">{item.oldName}</span>
                  <span className="text-zinc-600 px-3 shrink-0">➔</span>
                  <span className="text-amber-300 font-bold truncate flex-1 text-right">
                    {item.newName}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: TIME SYNC (FOTONIX MTIME SHIFT) */}
        {activeTab === 'timesync' && (
          <>
            <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/30 shrink-0 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-1.5">
                    <Clock size={16} />
                    <span>Đồng Bộ Mtime Máy Chụp (Multi-Camera Time Shift)</span>
                  </h3>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Giải quyết vấn đề 2–3 máy chụp (Sony, Canon, Nikon) lệch giờ nhau. Đồng bộ giờ
                    chính xác từng giây trên đĩa.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSortByAdjustedTime}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition-colors"
                    title="Sắp xếp danh sách theo giờ chụp đã bù trừ để khi đổi tên sẽ đúng thứ tự sự kiện"
                  >
                    <ArrowUpDown size={14} className="text-cyan-400" />
                    <span>Sắp xếp theo giờ mới</span>
                  </button>

                  <button
                    onClick={handleRestoreMtime}
                    disabled={isApplyingTime}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-800 transition-colors"
                    title="Khôi phục lại mtime ban đầu trước khi chỉnh sửa"
                  >
                    <RotateCcw size={14} />
                    <span>Hoàn tác giờ gốc</span>
                  </button>
                </div>
              </div>

              {/* Offset Input Controls */}
              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setSign('+')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      sign === '+' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    + (Cộng giờ)
                  </button>
                  <button
                    onClick={() => setSign('-')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      sign === '-' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    - (Trừ giờ)
                  </button>
                </div>

                {/* Hours / Minutes / Seconds */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 h-8 px-2 bg-zinc-950 border border-zinc-800 rounded text-center text-zinc-100 font-mono font-bold"
                    />
                    <span className="text-zinc-400 text-xs">Giờ</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 h-8 px-2 bg-zinc-950 border border-zinc-800 rounded text-center text-zinc-100 font-mono font-bold"
                    />
                    <span className="text-zinc-400 text-xs">Phút</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={seconds}
                      onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 h-8 px-2 bg-zinc-950 border border-zinc-800 rounded text-center text-zinc-100 font-mono font-bold"
                    />
                    <span className="text-zinc-400 text-xs">Giây</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-zinc-500">Mẫu:</span>
                  {[
                    { label: '+1m', h: 0, m: 1, s: 0, sgn: '+' as const },
                    { label: '+2m', h: 0, m: 2, s: 0, sgn: '+' as const },
                    { label: '+5m', h: 0, m: 5, s: 0, sgn: '+' as const },
                    { label: '+1h', h: 1, m: 0, s: 0, sgn: '+' as const },
                    { label: '-1m', h: 0, m: 1, s: 0, sgn: '-' as const },
                    { label: '-5m', h: 0, m: 5, s: 0, sgn: '-' as const },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setSign(p.sgn);
                        setHours(p.h);
                        setMinutes(p.m);
                        setSeconds(p.s);
                      }}
                      className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] text-zinc-300 font-mono"
                    >
                      {p.label}
                    </button>
                  ))}
                  {(hours > 0 || minutes > 0 || seconds > 0) && (
                    <button
                      onClick={() => {
                        setHours(0);
                        setMinutes(0);
                        setSeconds(0);
                      }}
                      className="px-2 py-0.5 text-zinc-500 hover:text-zinc-300 text-[11px]"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Time Comparison List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 sidebar-scroll font-mono text-xs">
              <div className="grid grid-cols-12 gap-2 text-[11px] text-zinc-500 font-semibold px-2 uppercase tracking-wider mb-2">
                <span className="col-span-5">Tên file</span>
                <span className="col-span-3">Thời gian gốc</span>
                <span className="col-span-4 text-right">
                  Thời gian mới ({sign}
                  {hours}h{minutes}m{seconds}s)
                </span>
              </div>

              {timePreviewItems.map((item) => (
                <div
                  key={item.photo.id}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg"
                >
                  <span className="col-span-5 text-zinc-300 truncate">{item.photo.fileName}</span>
                  <span className="col-span-3 text-zinc-500 text-[11px]">
                    {formatDateDisplay(item.origMs)}
                  </span>
                  <span className="col-span-4 text-right font-bold text-cyan-300 text-[11px]">
                    {formatDateDisplay(item.newMs)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 3: QUICK FILTER CONTENT */}
        {activeTab === 'filter' && (
          <div className="p-6 space-y-5 flex-1 overflow-y-auto text-xs">
            <div>
              <h3 className="font-bold text-sm text-purple-400 flex items-center gap-1.5">
                <Filter size={16} />
                <span>Bộ Lọc Nhanh Trước Khi Đổi Tên / Đồng Bộ</span>
              </h3>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Lọc nhóm ảnh bạn muốn xử lý để không tác động vào toàn bộ ảnh trong thư mục.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-semibold text-zinc-300 block">⭐ Đánh giá (Rating):</span>
                <select
                  value={filterMinRating}
                  onChange={(e) => setFilterMinRating(parseInt(e.target.value))}
                  className="w-full h-8 px-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 outline-none"
                >
                  <option value={0}>Tất cả ảnh</option>
                  <option value={1}>Từ 1 sao trở lên (≥ 1★)</option>
                  <option value={3}>Từ 3 sao trở lên (≥ 3★)</option>
                  <option value={5}>Chỉ ảnh 5 sao (5★)</option>
                </select>
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-semibold text-zinc-300 block">🚩 Cờ Chọn (Pick Status):</span>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={filterPickOnly}
                    onChange={(e) => setFilterPickOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className="text-zinc-300">Chỉ chọn ảnh đã gắn cờ Pick</span>
                </label>
              </div>

              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-semibold text-zinc-300 block">👁️ Trạng Thái AI:</span>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={filterOpenEyesOnly}
                    onChange={(e) => setFilterOpenEyesOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className="text-zinc-300">Chỉ ảnh AI nhận diện Mắt Mở</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <span className="text-zinc-400">
                Ảnh sau khi lọc:{' '}
                <strong className="text-purple-300">{workingPhotos.length} ảnh</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilterMinRating(0);
                    setFilterPickOnly(false);
                    setFilterOpenEyesOnly(false);
                    setWorkingPhotos(selectedPhotos);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg font-semibold border border-zinc-800"
                >
                  Bỏ lọc
                </button>
                <button
                  onClick={handleApplyFilter}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-md"
                >
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status / Alerts */}
        {errorMessage && (
          <div className="px-6 py-2 bg-red-500/20 border-t border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-mono shrink-0">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="px-6 py-2 bg-emerald-500/20 border-t border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono shrink-0">
            <CheckCircle2 size={14} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="h-16 px-6 border-t border-zinc-800 bg-zinc-900/70 flex items-center justify-between shrink-0">
          <span className="text-xs text-zinc-500 font-mono">
            {activeTab === 'rename' && (
              <>
                Số lượng: <strong className="text-zinc-200">{workingPhotos.length} ảnh</strong>
              </>
            )}
            {activeTab === 'timesync' && (
              <>
                Độ lệch:{' '}
                <strong className="text-cyan-400">
                  {sign}
                  {hours}h {minutes}m {seconds}s ({totalOffsetSeconds}s)
                </strong>
              </>
            )}
            {activeTab === 'filter' && (
              <>
                Đã chọn: <strong className="text-purple-400">{workingPhotos.length} ảnh</strong>
              </>
            )}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing || isApplyingTime}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-800 transition-colors"
            >
              Đóng
            </button>

            {activeTab === 'rename' && (
              <button
                onClick={handleExecuteRename}
                disabled={isProcessing || workingPhotos.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang đổi tên...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Đổi tên {workingPhotos.length} ảnh</span>
                  </>
                )}
              </button>
            )}

            {activeTab === 'timesync' && (
              <button
                onClick={handleApplyTimeShift}
                disabled={isApplyingTime || totalOffsetSeconds === 0}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isApplyingTime ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang ghi đĩa...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Áp dụng giờ mới ({workingPhotos.length} ảnh)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
