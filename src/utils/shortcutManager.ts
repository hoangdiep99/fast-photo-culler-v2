export interface ShortcutDefinition {
  id: string;
  label: string;
  category: 'culling' | 'external_app' | 'navigation' | 'tools';
  defaultKey: string;
  currentKey: string;
  description?: string;
}

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // ── ĐÁNH GIÁ & TUYỂN CHỌN (CULLING & RATING) ──
  { id: 'rating_0', label: 'Bỏ đánh giá (0 Sao)', category: 'culling', defaultKey: '0', currentKey: '0' },
  { id: 'rating_1', label: 'Gán 1 Sao (★)', category: 'culling', defaultKey: '1', currentKey: '1' },
  { id: 'rating_2', label: 'Gán 2 Sao (★★)', category: 'culling', defaultKey: '2', currentKey: '2' },
  { id: 'rating_3', label: 'Gán 3 Sao (★★★)', category: 'culling', defaultKey: '3', currentKey: '3' },
  { id: 'rating_4', label: 'Gán 4 Sao (★★★★)', category: 'culling', defaultKey: '4', currentKey: '4' },
  { id: 'rating_5', label: 'Gán 5 Sao (★★★★★)', category: 'culling', defaultKey: '5', currentKey: '5' },
  { id: 'tag_photo', label: 'Chọn ảnh (Pick / Tag)', category: 'culling', defaultKey: 'T', currentKey: 'T', description: 'Gắn cờ ảnh được chọn' },
  { id: 'reject_photo', label: 'Loại bỏ ảnh (Reject)', category: 'culling', defaultKey: 'X', currentKey: 'X', description: 'Đánh dấu loại bỏ ảnh' },
  { id: 'color_red', label: 'Gán nhãn Đỏ (Red Label)', category: 'culling', defaultKey: '6', currentKey: '6' },
  { id: 'color_yellow', label: 'Gán nhãn Vàng (Yellow Label)', category: 'culling', defaultKey: '7', currentKey: '7' },
  { id: 'color_green', label: 'Gán nhãn Xanh lá (Green Label)', category: 'culling', defaultKey: '8', currentKey: '8' },
  { id: 'color_blue', label: 'Gán nhãn Xanh dương (Blue Label)', category: 'culling', defaultKey: '9', currentKey: '9' },
  { id: 'auto_advance', label: 'Bật/Tắt Tự động nhảy ảnh tiếp theo', category: 'culling', defaultKey: 'A', currentKey: 'A', description: 'Sau khi chấm sao tự động chuyển sang ảnh kế tiếp' },

  // ── MỞ BẰNG PHẦN MỀM NGOÀI (EXTERNAL APPS) ──
  { id: 'open_photoshop', label: 'Mở bằng Adobe Photoshop', category: 'external_app', defaultKey: 'Ctrl+P', currentKey: 'Ctrl+P', description: 'Mở ngay các ảnh đã chọn sang Photoshop' },
  { id: 'open_lightroom', label: 'Mở bằng Adobe Lightroom Classic', category: 'external_app', defaultKey: 'Ctrl+L', currentKey: 'Ctrl+L', description: 'Gửi ảnh sang Lightroom Classic để Blend màu' },
  { id: 'open_captureone', label: 'Mở bằng Capture One Pro', category: 'external_app', defaultKey: 'Ctrl+K', currentKey: 'Ctrl+K', description: 'Mở ảnh trong Capture One Pro' },

  // ── DUYỆT ẢNH & ĐIỀU HƯỚNG (NAVIGATION & VIEW) ──
  { id: 'next_photo', label: 'Ảnh tiếp theo (Next)', category: 'navigation', defaultKey: 'ArrowRight', currentKey: 'ArrowRight' },
  { id: 'prev_photo', label: 'Ảnh trước đó (Previous)', category: 'navigation', defaultKey: 'ArrowLeft', currentKey: 'ArrowLeft' },
  { id: 'toggle_view', label: 'Chuyển đổi Lưới / Phóng to (Viewer)', category: 'navigation', defaultKey: 'Enter', currentKey: 'Enter' },
  { id: 'compare_view', label: 'So sánh các ảnh đã chọn (Compare)', category: 'navigation', defaultKey: 'C', currentKey: 'C' },
  { id: 'toggle_face_zoom', label: 'Bật/Tắt Bảng soi mắt & mặt AI', category: 'navigation', defaultKey: 'Z', currentKey: 'Z' },
  { id: 'toggle_lock_zoom', label: 'Khóa tỷ lệ phóng to (Lock Zoom)', category: 'navigation', defaultKey: 'L', currentKey: 'L' },
  { id: 'rotate_cw', label: 'Xoay ảnh 90° cùng chiều kim đồng hồ', category: 'navigation', defaultKey: 'R', currentKey: 'R' },

  // ── THAO TÁC TỆP & CÔNG CỤ (TOOLS & FILES) ──
  { id: 'extract_jpg', label: 'Trích xuất ảnh JPG siêu tốc từ RAW', category: 'tools', defaultKey: 'Ctrl+E', currentKey: 'Ctrl+E' },
  { id: 'batch_rename', label: 'Đổi tên hàng loạt & Đồng bộ giờ', category: 'tools', defaultKey: 'F2', currentKey: 'F2' },
  { id: 'copy_files', label: 'Sao chép ảnh vào bộ nhớ tạm (Copy)', category: 'tools', defaultKey: 'Ctrl+C', currentKey: 'Ctrl+C' },
  { id: 'cut_files', label: 'Cắt ảnh vào bộ nhớ tạm (Cut)', category: 'tools', defaultKey: 'Ctrl+X', currentKey: 'Ctrl+X' },
  { id: 'paste_files', label: 'Dán ảnh từ bộ nhớ tạm (Paste)', category: 'tools', defaultKey: 'Ctrl+V', currentKey: 'Ctrl+V' },
  { id: 'select_all', label: 'Chọn tất cả ảnh (Select All)', category: 'tools', defaultKey: 'Ctrl+A', currentKey: 'Ctrl+A' },
  { id: 'delete_files', label: 'Xóa ảnh đã chọn vào Thùng Rác', category: 'tools', defaultKey: 'Delete', currentKey: 'Delete' },
  { id: 'shortcuts_modal', label: 'Mở Bảng Tùy Biến Phím Tắt', category: 'tools', defaultKey: 'F1', currentKey: 'F1' },
];

const STORAGE_KEY = 'fast_photo_culler_custom_shortcuts_v2';

/**
 * Tải danh sách phím tắt tùy biến từ localStorage (tự động đồng bộ với mặc định nếu có phím mới)
 */
export function loadCustomShortcuts(): ShortcutDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const saved: Record<string, string> = JSON.parse(raw);

    return DEFAULT_SHORTCUTS.map((item) => {
      if (saved[item.id] !== undefined) {
        return { ...item, currentKey: saved[item.id] };
      }
      return item;
    });
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

/**
 * Lưu cấu hình phím tắt tùy biến vào localStorage
 */
export function saveCustomShortcuts(shortcuts: ShortcutDefinition[]): void {
  try {
    const saved: Record<string, string> = {};
    shortcuts.forEach((item) => {
      saved[item.id] = item.currentKey;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (err) {
    console.error('Failed to save shortcuts:', err);
  }
}

/**
 * Chuyển đổi sự kiện bàn phím (KeyboardEvent) thành chuỗi phím tắt chuẩn
 */
export function eventToShortcutString(e: KeyboardEvent): string | null {
  // Bỏ qua các phím điều khiển đơn lẻ
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;

  // Chuẩn hóa tên phím
  if (e.code === 'Space' || key === ' ') key = 'Space';
  else if (e.code === 'Enter' || key === 'Enter') key = 'Enter';
  else if (e.code === 'Escape' || key === 'Escape') key = 'Escape';
  else if (e.code === 'Delete' || key === 'Delete') key = 'Delete';
  else if (e.code === 'Backspace' || key === 'Backspace') key = 'Backspace';
  else if (e.code === 'ArrowRight' || key === 'ArrowRight') key = 'ArrowRight';
  else if (e.code === 'ArrowLeft' || key === 'ArrowLeft') key = 'ArrowLeft';
  else if (e.code === 'ArrowUp' || key === 'ArrowUp') key = 'ArrowUp';
  else if (e.code === 'ArrowDown' || key === 'ArrowDown') key = 'ArrowDown';
  else if (key.length === 1) {
    key = key.toUpperCase();
  }

  parts.push(key);
  return parts.join('+');
}

/**
 * Kiểm tra xem một sự kiện bàn phím có khớp với chuỗi phím tắt được chỉ định hay không
 */
export function matchesShortcut(e: KeyboardEvent, shortcutString: string): boolean {
  if (!shortcutString) return false;

  const parts = shortcutString.split('+').map((p) => p.trim());
  const hasCtrl = parts.includes('Ctrl');
  const hasAlt = parts.includes('Alt');
  const hasShift = parts.includes('Shift');

  const mainKey = parts.filter((p) => !['Ctrl', 'Alt', 'Shift'].includes(p)).pop() || '';

  // Kiểm tra modifier keys
  if ((e.ctrlKey || e.metaKey) !== hasCtrl) return false;
  if (e.altKey !== hasAlt) return false;
  if (e.shiftKey !== hasShift) return false;

  // Kiểm tra main key
  const eventKeyUpper = e.key.toUpperCase();
  const mainKeyUpper = mainKey.toUpperCase();

  if (mainKeyUpper === 'SPACE') {
    return e.code === 'Space' || e.key === ' ';
  }
  if (mainKeyUpper === 'ENTER') {
    return e.key === 'Enter' || e.code === 'Enter';
  }
  if (mainKeyUpper === 'ESCAPE') {
    return e.key === 'Escape' || e.code === 'Escape';
  }
  if (mainKeyUpper === 'DELETE') {
    return e.key === 'Delete' || e.code === 'Delete';
  }
  if (mainKeyUpper === 'ARROWRIGHT') {
    return e.key === 'ArrowRight' || e.code === 'ArrowRight';
  }
  if (mainKeyUpper === 'ARROWLEFT') {
    return e.key === 'ArrowLeft' || e.code === 'ArrowLeft';
  }
  if (mainKeyUpper === 'ARROWUP') {
    return e.key === 'ArrowUp' || e.code === 'ArrowUp';
  }
  if (mainKeyUpper === 'ARROWDOWN') {
    return e.key === 'ArrowDown' || e.code === 'ArrowDown';
  }

  return eventKeyUpper === mainKeyUpper;
}

/**
 * Định dạng hiển thị phím tắt đẹp mắt
 */
export function formatShortcutDisplay(shortcutString: string): string {
  if (!shortcutString) return 'Chưa gán';
  return shortcutString
    .replace(/Ctrl/g, 'Ctrl')
    .replace(/ArrowRight/g, '→')
    .replace(/ArrowLeft/g, '←')
    .replace(/ArrowUp/g, '↑')
    .replace(/ArrowDown/g, '↓');
}
