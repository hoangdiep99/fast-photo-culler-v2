import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Keyboard,
  RotateCcw,
  Search,
  Check,
  AlertCircle,
  Star,
  ExternalLink,
  Compass,
  Wrench,
  Sparkles
} from 'lucide-react';
import {
  ShortcutDefinition,
  DEFAULT_SHORTCUTS,
  loadCustomShortcuts,
  saveCustomShortcuts,
  eventToShortcutString,
  formatShortcutDisplay
} from '../utils/shortcutManager';

interface ShortcutsModalProps {
  onClose: () => void;
  onShortcutsUpdated?: (newShortcuts: ShortcutDefinition[]) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  onClose,
  onShortcutsUpdated
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(() => loadCustomShortcuts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'culling' | 'external_app' | 'navigation' | 'tools'>('all');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Lắng nghe sự kiện bàn phím khi người dùng đang bấm phím mới
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Cho phép bấm Escape để hủy chế độ sửa
      if (e.key === 'Escape') {
        setEditingId(null);
        setConflictWarning(null);
        return;
      }

      const shortcutStr = eventToShortcutString(e);
      if (!shortcutStr) return;

      // Kiểm tra trùng lặp phím tắt với action khác
      const existingConflict = shortcuts.find(
        (s) => s.id !== editingId && s.currentKey.toUpperCase() === shortcutStr.toUpperCase()
      );

      if (existingConflict) {
        setConflictWarning(
          `⚠️ Phím "${shortcutStr}" đang được dùng cho "${existingConflict.label}". Hệ thống sẽ hoán đổi.`
        );
      } else {
        setConflictWarning(null);
      }

      // Cập nhật phím mới
      setShortcuts((prev) => {
        const next = prev.map((item) => {
          if (item.id === editingId) {
            return { ...item, currentKey: shortcutStr };
          }
          // Nếu trùng thì hoán đổi hoặc reset
          if (existingConflict && item.id === existingConflict.id) {
            return { ...item, currentKey: '' };
          }
          return item;
        });
        saveCustomShortcuts(next);
        onShortcutsUpdated?.(next);
        return next;
      });

      setEditingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editingId, shortcuts, onShortcutsUpdated]);

  // Khôi phục một phím về mặc định
  const handleResetSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortcuts((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          return { ...item, currentKey: item.defaultKey };
        }
        return item;
      });
      saveCustomShortcuts(next);
      onShortcutsUpdated?.(next);
      return next;
    });
    setConflictWarning(null);
  };

  // Khôi phục tất cả về mặc định
  const handleResetAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục tất cả phím tắt về mặc định ban đầu?')) {
      const resetList = DEFAULT_SHORTCUTS.map((item) => ({ ...item }));
      setShortcuts(resetList);
      saveCustomShortcuts(resetList);
      onShortcutsUpdated?.(resetList);
      setEditingId(null);
      setConflictWarning(null);
    }
  };

  // Lọc theo tìm kiếm và danh mục
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.currentKey.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [shortcuts, activeCategory, searchQuery]);

  const categories = [
    { key: 'all', label: 'Tất cả phím tắt', icon: Sparkles, count: shortcuts.length },
    { key: 'culling', label: 'Đánh giá & Tuyển chọn', icon: Star, count: shortcuts.filter((s) => s.category === 'culling').length },
    { key: 'external_app', label: 'Mở bằng Photoshop / Lightroom / C1', icon: ExternalLink, count: shortcuts.filter((s) => s.category === 'external_app').length },
    { key: 'navigation', label: 'Duyệt ảnh & Điều hướng', icon: Compass, count: shortcuts.filter((s) => s.category === 'navigation').length },
    { key: 'tools', label: 'Công cụ & Tệp', icon: Wrench, count: shortcuts.filter((s) => s.category === 'tools').length },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans"
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Keyboard size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Tùy Biến Phím Tắt (Keyboard Shortcuts)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono font-bold">
                  v2.5
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Nhấp chuột vào ô phím tắt bất kỳ để bấm phím mới theo thói quen của bạn. Tự động lưu tức thì.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="p-4 px-6 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 sidebar-scroll">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-md font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm phím tắt hoặc thao tác..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Warning notification if conflict */}
        {conflictWarning && (
          <div className="p-2.5 px-6 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="shrink-0 text-amber-400" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {/* Shortcuts Table / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 photo-grid-scroll">
          {filteredShortcuts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Search size={28} className="text-zinc-600" />
              <p className="text-sm">Không tìm thấy phím tắt phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item) => {
                const isEditing = editingId === item.id;
                const isModified = item.currentKey !== item.defaultKey;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isEditing
                        ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : isModified
                        ? 'bg-zinc-900/90 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200 truncate">
                          {item.label}
                        </span>
                        {isModified && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-semibold border border-amber-500/30">
                            Đã sửa
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[10.5px] text-zinc-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Shortcut Key Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(isEditing ? null : item.id);
                          setConflictWarning(null);
                        }}
                        className={`min-w-[85px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 border transition-all shadow-sm ${
                          isEditing
                            ? 'bg-amber-400 text-black border-amber-300 animate-pulse'
                            : item.currentKey
                            ? 'bg-zinc-950 text-amber-300 border-zinc-700 hover:border-amber-400 hover:bg-zinc-900'
                            : 'bg-zinc-900 text-zinc-500 border-dashed border-zinc-700 hover:border-zinc-500'
                        }`}
                        title={isEditing ? 'Nhấn phím bất kỳ trên bàn phím để gán' : 'Bấm vào để đổi phím tắt mới'}
                      >
                        {isEditing ? (
                          <span className="text-[11px] font-sans font-bold">Bấm phím...</span>
                        ) : (
                          <span>{formatShortcutDisplay(item.currentKey) || 'Chưa gán'}</span>
                        )}
                      </button>

                      {/* Reset to Default Single Button */}
                      {isModified && (
                        <button
                          onClick={(e) => handleResetSingle(item.id, e)}
                          className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title={`Khôi phục về mặc định (${formatShortcutDisplay(item.defaultKey)})`}
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Khôi phục tất cả về mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
