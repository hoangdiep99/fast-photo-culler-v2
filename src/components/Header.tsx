import React from 'react';
import { Settings, Zap, Grid, Maximize2, X, FolderOpen, Search, CheckSquare, Layers, Edit3, Cpu, Sun, Moon, Monitor, ExternalLink, PanelRight, FileDown, Keyboard } from 'lucide-react';
import { FilterState, CullingStats, RatingFilter, PickStatus, AIFilter, ThemeMode } from '../types';

interface HeaderProps {
  currentFolder: string | null;
  onSelectFolder: () => void;
  stats: CullingStats;
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  onOpenSettingsModal: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenBatchRenameModal: () => void;
  onOpenExtractJpgModal?: () => void;
  onOpenCompareView: () => void;
  onTagAllFiltered: () => void;
  selectedCount: number;
  viewMode: 'grid' | 'viewer' | 'compare';
  onToggleViewMode: () => void;
  isAIScanning: boolean;
  onToggleAIScan: () => void;
  aiScanProgress: { processed: number; total: number };
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenInDigikam?: () => void;
  isFacePanelOpen?: boolean;
  onToggleFacePanel?: () => void;
}

export const Header = React.memo<HeaderProps>(({
  currentFolder,
  onSelectFolder,
  stats,
  filter,
  onFilterChange,
  autoAdvance,
  onToggleAutoAdvance,
  onOpenSettingsModal,
  onOpenShortcutsModal,
  onOpenBatchRenameModal,
  onOpenExtractJpgModal,
  onOpenCompareView,
  onTagAllFiltered,
  selectedCount,
  viewMode,
  onToggleViewMode,
  isAIScanning,
  onToggleAIScan,
  aiScanProgress,
  themeMode,
  onThemeChange,
  onOpenInDigikam,
  isFacePanelOpen = true,
  onToggleFacePanel,
}) => {

  const percent =
    aiScanProgress.total > 0
      ? Math.round((aiScanProgress.processed / aiScanProgress.total) * 100)
      : 0;

  return (
    <header className="h-11 bg-zinc-950 border-b border-zinc-800/90 px-3 flex items-center justify-between shrink-0 select-none z-40 text-xs shadow-md">
      {/* LEFT SECTION */}
      <div className="flex items-center gap-2 shrink-0 font-bold text-amber-400 font-mono text-xs">
        <img src="./icon.png" alt="Fast Photo Culler AI" className="w-5 h-5 rounded object-contain shadow-sm border border-amber-500/30" />
        <span className="tracking-wide">FAST PHOTO CULLER</span>
        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold border border-amber-500/30">
          v2.6
        </span>
      </div>

      {/* CENTER FIXED FILTERS SECTION */}
      <div className="flex items-center gap-1.5 overflow-x-auto sidebar-scroll py-0.5 max-w-full">
        {/* Star Rating Buttons */}
        <div className="flex items-center gap-0.5 bg-zinc-900/90 px-1 py-0.5 rounded-lg border border-zinc-800">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unrated', label: 'Chưa' },
            { id: 1, label: '★1' },
            { id: 2, label: '★2' },
            { id: 3, label: '★3' },
            { id: 4, label: '★4' },
            { id: 5, label: '★5' },
            { id: 'gte3', label: '≥3' },
          ].map((item) => {
            const isSelected = filter.rating === item.id;
            return (
              <button
                key={String(item.id)}
                onClick={() => onFilterChange({ rating: item.id as RatingFilter })}
                className={`px-1.5 py-0.5 text-[11px] font-medium rounded transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>



        {/* AI Blink, Sharpness & Best Shot Filter Buttons */}
        <div className="flex items-center gap-0.5 bg-zinc-900/90 px-1 py-0.5 rounded-lg border border-zinc-800">
          {[
            { id: 'all', label: 'AI: Tất cả' },
            { id: 'best', label: '⭐ Best Shot' },
            { id: 'open', label: '👁️ Mở' },
            { id: 'blink', label: '👁️ Nhắm' },
            { id: 'blurry', label: '🎯 Nhòe' },
            { id: 'sharp', label: '✨ Nét' },
          ].map((item) => {
            const isSelected = (filter.aiFilter || 'all') === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange({ aiFilter: item.id as AIFilter })}
                className={`px-1.5 py-0.5 text-[11px] font-medium rounded transition-all ${
                  isSelected
                    ? item.id === 'best'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold shadow-sm'
                      : item.id === 'blink' || item.id === 'blurry'
                      ? 'bg-red-600 text-white font-bold'
                      : item.id === 'open' || item.id === 'sharp'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-purple-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* RIGHT SECTION: AI Scan & Search Box */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 🤖 AI Scan Control */}
        <button
          onClick={onToggleAIScan}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
            isAIScanning
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 shadow-sm animate-pulse'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Tự động quét AI nhận diện nhắm mắt & độ nét ngầm"
        >
          <Cpu size={12} className={isAIScanning ? 'text-purple-400 animate-spin' : ''} />
          <span className="hidden sm:inline font-mono">
            {isAIScanning ? `Quét (${percent}%)` : 'AI Quét'}
          </span>
        </button>

        {/* Multi-Number Search Bar (Nổi bật & Dễ nhìn) */}
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-amber-400 pointer-events-none font-bold" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="🔍 Tìm số ảnh (VD: 6888 6891)..."
            className="w-44 sm:w-56 pl-7 pr-6 py-1 bg-zinc-900/90 border-2 border-amber-500/70 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 text-amber-200 font-semibold placeholder-zinc-400 rounded-lg text-xs outline-none transition-all shadow-md shadow-amber-500/10 font-mono"
          />
          {filter.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2 text-zinc-400 hover:text-white p-0.5 bg-zinc-800 rounded-full"
              title="Xóa tìm kiếm"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tag all filtered button */}
        {filter.searchQuery.trim().length > 0 && stats.filtered > 0 && (
          <button
            onClick={onTagAllFiltered}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg transition-all shrink-0"
            title="Gán nhãn Tag (Pick) tất cả các ảnh khớp với danh sách số đã tìm"
          >
            <CheckSquare size={12} />
            <span>Tag {stats.filtered}</span>
          </button>
        )}

        {/* Compare Button */}
        {selectedCount >= 2 && (
          <button
            onClick={onOpenCompareView}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg transition-all"
            title="So sánh 2-4 ảnh đồng bộ (Phím C)"
          >
            <Layers size={13} />
            <span>So sánh ({selectedCount})</span>
          </button>
        )}



        {/* Batch Rename Button */}
        {selectedCount >= 1 && (
          <button
            onClick={onOpenBatchRenameModal}
            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-medium rounded-lg transition-colors"
            title="Đổi tên hàng loạt & Đồng bộ giờ máy chụp Time Sync (Phím F2)"
          >
            <Edit3 size={12} className="text-amber-400" />
            <span className="hidden lg:inline">Đổi tên & Giờ</span>
          </button>
        )}

        {/* Fast RAW to JPG Extraction Button */}
        {onOpenExtractJpgModal && (
          <button
            onClick={onOpenExtractJpgModal}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium rounded-lg transition-all"
            title="Trích xuất ảnh JPG siêu tốc từ file RAW (Ctrl + E)"
          >
            <FileDown size={12} className="text-amber-400" />
            <span className="hidden lg:inline">Trích xuất JPG</span>
          </button>
        )}

        {/* Total Count Display */}
        <span className="font-mono text-[11px] text-zinc-400 font-semibold hidden xl:inline">
          {stats.filtered}/{stats.total}
        </span>

        {/* Auto Advance Toggle */}
        <button
          onClick={onToggleAutoAdvance}
          title="Tự động nhảy sang ảnh tiếp theo sau khi gán nhãn (Phím A)"
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${
            autoAdvance
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap size={12} className={autoAdvance ? 'fill-amber-400 text-amber-400' : ''} />
          <span className="hidden md:inline">Auto</span>
        </button>

        {/* View mode toggle */}
        <button
          onClick={onToggleViewMode}
          className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs rounded-lg transition-colors"
          title="Đổi giao diện Grid / Lightbox (Phím Enter)"
        >
          {viewMode === 'grid' ? <Maximize2 size={13} /> : <Grid size={13} />}
        </button>

        {/* Toggle Right Detail / FaceZoom Panel */}
        {onToggleFacePanel && (
          <button
            onClick={onToggleFacePanel}
            className={`p-1 border text-xs rounded-lg transition-colors ${
              isFacePanelOpen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Bật/Tắt Bảng xem thử ảnh nét & chi tiết khuôn mặt bên phải (Phím Z)"
          >
            <PanelRight size={13} />
          </button>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={() => {
            const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark';
            onThemeChange(nextMode);
          }}
          className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1 px-1.5"
          title={`Giao diện: ${themeMode === 'dark' ? 'Chế độ Tối (Dark)' : themeMode === 'light' ? 'Chế độ Sáng (Light)' : 'Tự động theo Windows (System)'}`}
        >
          {themeMode === 'dark' ? (
            <Moon size={13} className="text-blue-400" />
          ) : themeMode === 'light' ? (
            <Sun size={13} className="text-amber-400" />
          ) : (
            <Monitor size={13} className="text-purple-400" />
          )}
          <span className="text-[10px] font-mono capitalize hidden lg:inline">
            {themeMode === 'system' ? 'Auto' : themeMode}
          </span>
        </button>

        {/* Shortcuts Button */}
        {onOpenShortcutsModal && (
          <button
            onClick={onOpenShortcutsModal}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 rounded-lg text-xs font-semibold transition-colors"
            title="Bảng Tùy Biến Phím Tắt (F1)"
          >
            <Keyboard size={13} className="text-amber-400" />
            <span className="text-[11px] font-mono hidden md:inline">Phím tắt</span>
          </button>
        )}

        {/* Settings Gear Button */}
        <button
          onClick={onOpenSettingsModal}
          className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors"
          title="Cài đặt hệ thống"
        >
          <Settings size={14} />
        </button>

      </div>
    </header>
  );
});
