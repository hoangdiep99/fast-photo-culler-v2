# 📸 Fast Photo Culler AI

<div align="center">

<p align="center">
  <img src="./public/icon.png" alt="Fast Photo Culler AI Logo" width="120" style="border-radius: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);" />
</p>

### **Phần mềm tuyển chọn & lọc ảnh chuyên nghiệp siêu tốc thế hệ mới tích hợp Trí tuệ Nhân tạo AI (MediaPipe Face & Eye Mesh)**

[![Release Version](https://img.shields.io/badge/version-v2.11.0-amber.svg?style=for-the-badge)](https://github.com/hoangdiep99/fast-photo-culler-v2/releases)
[![Total Downloads](https://img.shields.io/github/downloads/hoangdiep99/fast-photo-culler-v2/total.svg?style=for-the-badge&logo=github&label=TỔNG%20LƯỢT%20TẢI&color=10b981)](https://github.com/hoangdiep99/fast-photo-culler-v2/releases)
[![Platform Windows](https://img.shields.io/badge/platform-Windows-blue.svg?style=for-the-badge&logo=windows)](https://github.com/hoangdiep99/fast-photo-culler-v2/releases)
[![Platform macOS](https://img.shields.io/badge/platform-macOS-black.svg?style=for-the-badge&logo=apple)](https://github.com/hoangdiep99/fast-photo-culler-v2/releases)
[![License MIT](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Author](https://img.shields.io/badge/author-Hoàng%20Điệp-orange.svg?style=for-the-badge&logo=facebook)](https://www.facebook.com/HoangdiepLN)

</div>

---

### 📥 Tải về trực tiếp các bộ cài đặt (Direct Download Links)

| Hệ điều hành | Phiên bản | Định dạng | Tải về trực tiếp |
| :--- | :--- | :---: | :--- |
| **🪟 Windows (Khuyên dùng)** | **v2.11.0 Setup** (Bản cài đặt tiêu chuẩn) | `.exe` | [**⬇️ Tải Setup (.exe)**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases/latest) |
| **🪟 Windows (Chạy ngay)** | **v2.11.0 Portable** (Không cần cài đặt) | `.exe` | [**⬇️ Tải Portable (.exe)**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases/latest) |
| **🍎 macOS (Apple Silicon)** | **Chip M1 / M2 / M3 / M4** | `.dmg` | [**⬇️ Tải cho Apple Silicon (.dmg)**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases/latest) |
| **🍎 macOS (Intel)** | **Chip Intel (Core i5/i7/i9)** | `.dmg` | [**⬇️ Tải cho Mac Intel (.dmg)**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases/latest) |

> 💡 *Bạn có thể xem toàn bộ lịch sử phát hành và tải các bản build tại mục [**GitHub Releases**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases).*

---

### 📊 Thống kê lượt tải phần mềm (Download Analytics)

<p align="center">
  <a href="https://github.com/hoangdiep99/fast-photo-culler-v2/releases">
    <img src="https://img.shields.io/github/downloads/hoangdiep99/fast-photo-culler-v2/total?style=for-the-badge&logo=github&label=T%E1%BB%95ng%20l%C6%B0%E1%BB%A3t%20t%E1%BA%A3i%20to%C3%A0n%20c%E1%BA%A7u&color=10b981" alt="Tổng lượt tải toàn cầu" />
  </a>
  <a href="https://github.com/hoangdiep99/fast-photo-culler-v2/releases/latest">
    <img src="https://img.shields.io/github/downloads/hoangdiep99/fast-photo-culler-v2/latest/total?style=for-the-badge&logo=github&label=B%E1%BA%A3n%20m%E1%BB%9Bi%20nh%E1%BA%A5t&color=0284c7" alt="Lượt tải bản mới nhất" />
  </a>
  <a href="https://github.com/hoangdiep99/fast-photo-culler-v2/stargazers">
    <img src="https://img.shields.io/github/stars/hoangdiep99/fast-photo-culler-v2?style=for-the-badge&logo=github&label=Stars%20y%C3%AAu%20th%C3%ADch&color=f59e0b" alt="Stars yêu thích" />
  </a>
</p>

---

## 🌟 Giới thiệu

**Fast Photo Culler AI** là ứng dụng chuyên dụng dành cho Nhiếp ảnh gia (Photographer), Studio ảnh cưới, sự kiện, kỷ yếu và báo chí. Ứng dụng giải quyết triệt để vấn đề "nút thắt cổ chai" lớn nhất trong quy trình nhiếp ảnh: **Tốc độ duyệt và chọn lọc hàng nghìn bức ảnh RAW cồng kềnh**.

Với công nghệ render trực tiếp stream C++ Native cùng mô hình trí tuệ nhân tạo **Google MediaPipe**, bạn có thể lướt qua hàng nghìn bức ảnh với độ trễ **0ms**, tự động phát hiện mắt nhắm/mắt mở và khuôn mặt nét nhất trong chớp mắt.

---

## ✨ Tính năng nổi bật

### ⚡ 1. Duyệt ảnh RAW siêu tốc với độ trễ 0ms (Zero-Latency)
- Tự động trích xuất và hiển thị tức thời bản Preview độ phân giải cao được nhúng sẵn bên trong file RAW.
- Không cần chờ phần mềm convert hay import tốn thời gian như Lightroom.
- Cơ chế Cache thông minh tự dọn dẹp, tải trước (preloading) 3 ảnh trước/sau giúp chuyển ảnh mượt mà ở tốc độ 60–120 FPS.

### 🤖 2. Trí tuệ Nhân tạo AI MediaPipe (Face & Eye Analysis)
- **Tự động soi độ nét khuôn mặt (Sharpness)**: Chấm điểm % độ nét từng khuôn mặt trong khung hình.
- **Phát hiện độ mở mắt (Eye Openness %)**: Báo động mắt nhắm, mắt ti hí, mắt chớp.
- **Nhận diện nhóm chụp liên tiếp (Burst Groups)**: Tự động gom các ảnh chụp cùng khoảnh khắc và chấm điểm gắn nhãn **`BEST SHOT ⭐`** cho bức ảnh đẹp nhất.

### 👁️ 3. Bảng soi mắt & mặt thời gian thực (Face Zoom Panel)
- Tự động nhận diện và crop phóng to toàn bộ khuôn mặt trong ảnh hiển thị ngay bên cạnh màn hình.
- Nhiếp ảnh gia có thể kiểm tra nét và mắt của cả nhóm đông người chỉ trong 0.1 giây mà không cần zoom/pan thủ công.

### ⌨️ 4. Bảng Tùy Biến Phím Tắt trực quan (Shortcuts Manager — `F1`)
- Cho phép người dùng tùy ý thay đổi **tất cả phím tắt** trong phần mềm theo thói quen cá nhân.
- Nhận diện tổ hợp phím bấm trực tiếp, tự động phát hiện trùng lặp và lưu trữ cấu hình bền vững vào bộ nhớ máy.

### 🚀 5. Mở ảnh tức thì bằng Photoshop, Lightroom Classic & Capture One
- Tự động quét các phần mềm đồ họa chuyên nghiệp đã cài trên máy tính.
- Phím tắt siêu tốc:
  - **`Ctrl + P`**: Mở ngay ảnh đã chọn sang **Adobe Photoshop**.
  - **`Ctrl + L`**: Gửi ảnh sang **Adobe Lightroom Classic**.
  - **`Ctrl + K`**: Mở ảnh trong **Capture One Pro**.
- Hỗ trợ menu chuột phải *Mở bằng ứng dụng khác...*

### 📁 6. Quản lý tệp tin chuyên nghiệp & Đồng bộ Windows Explorer
- Hỗ trợ **Copy (`Ctrl+C`)**, **Cut (`Ctrl+X`)**, **Paste (`Ctrl+V`)** đồng bộ 2 chiều với Windows Explorer.
- Đổi tên hàng loạt thông minh (**Batch Rename — `F2`**): Đổi tên theo mẫu, đồng bộ và dịch chuyển thời gian chụp (EXIF DateTime shift) khi chụp nhiều máy lệch giờ.
- Xóa an toàn đưa file vào **Thùng Rác (Recycle Bin)**.
- Thư mục yêu thích (Bookmarks) và Thư mục mở gần đây.

### ⚡ 7. Trích xuất ảnh JPG siêu tốc từ RAW
- Trích xuất ảnh JPG chất lượng cao từ các file RAW chỉ mất **~0.05 giây/ảnh**.
- Cho phép chọn trích xuất riêng các ảnh đã chọn hoặc trích xuất toàn bộ thư mục.

### 🔄 8. Cơ chế Tự Động Cập Nhật (In-App Auto-Updater)
- Tự động kiểm tra bản phát hành mới từ GitHub Releases khi khởi động app.
- Tải về và tự động cài đặt bản mới chỉ với **1 cú click chuột**, kèm thanh tiến trình đo tốc độ tải thời gian thực.

### 🌓 9. Giao diện Dark / Light / System Mode
- Tối ưu hóa cho môi trường phòng tối của Studio và màn hình chuyên đồ họa.

---

## 📷 Định dạng tệp được hỗ trợ

| Loại | Định dạng mở rộng |
| :--- | :--- |
| **Máy ảnh Canon** | `.CR2`, `.CR3` |
| **Máy ảnh Nikon** | `.NEF`, `.NRW` |
| **Máy ảnh Sony** | `.ARW`, `.SRF`, `.SR2` |
| **Máy ảnh Fujifilm** | `.RAF` |
| **Máy ảnh Panasonic / Lumix** | `.RW2` |
| **Máy ảnh Olympus / OM System** | `.ORF` |
| **Định dạng RAW chuẩn Adobe** | `.DNG` |
| **Ảnh Raster & Đồ họa** | `.JPG`, `.JPEG`, `.PNG`, `.TIFF`, `.TIF`, `.PSD`, `.WEBP` |
| **Video** | `.MP4`, `.MOV` (có trình phát preview trực tiếp) |

---

## ⌨️ Bảng phím tắt tiêu chuẩn

*(Bạn có thể bấm **`F1`** trong app để sửa bất kỳ phím nào tùy thích)*

### Đánh giá & Tuyển chọn (Culling & Rating)
| Phím | Chức năng |
| :---: | :--- |
| `1` – `5` | Gán đánh giá từ **1 Sao (★)** đến **5 Sao (★★★★★)** |
| `0` | Bỏ đánh giá (0 Sao) |
| `6` – `9` | Gán nhãn màu: **Đỏ (6)**, **Vàng (7)**, **Xanh lá (8)**, **Xanh dương (9)** |
| `T` | Chọn ảnh (Pick / Tag) |
| `X` | Loại bỏ ảnh (Reject) |
| `A` | Bật/Tắt chế độ tự động nhảy sang ảnh kế tiếp sau khi chấm điểm |

### Duyệt ảnh & Điều hướng
| Phím | Chức năng |
| :---: | :--- |
| `→` | Di chuyển sang ảnh bên phải (Ảnh tiếp theo) |
| `←` | Di chuyển sang ảnh bên trái (Ảnh trước đó) |
| `↓` | Di chuyển xuống hàng ảnh phía dưới (trong lưới) |
| `↑` | Di chuyển lên hàng ảnh phía trên (trong lưới) |
| `Enter` | Chuyển đổi giữa chế độ xem Lưới (Grid) và Phóng to toàn màn hình (Viewer) |
| `C` | Chế độ So sánh đồng bộ 2–4 ảnh (Compare View) |
| `Z` | Bật/Tắt Bảng soi nét mắt & khuôn mặt AI (Face Zoom Panel) |
| `L` | Khóa tỷ lệ phóng to khi duyệt ảnh (Lock Zoom) |
| `R` | Xoay ảnh 90° cùng chiều kim đồng hồ |
| `Esc` | Thoát chế độ xem ảnh toàn màn hình hoặc đóng các cửa sổ Modal |

### Phần mềm ngoài & Thao tác tệp
| Phím | Chức năng |
| :---: | :--- |
| `Ctrl + P` | Mở ngay các ảnh đã chọn bằng **Adobe Photoshop** |
| `Ctrl + L` | Mở các ảnh đã chọn bằng **Adobe Lightroom Classic** |
| `Ctrl + K` | Mở các ảnh đã chọn bằng **Capture One Pro** |
| `Ctrl + E` | Trích xuất ảnh JPG siêu tốc từ RAW |
| `Ctrl + C` | Sao chép ảnh (Copy) |
| `Ctrl + X` | Cắt ảnh (Cut) |
| `Ctrl + V` | Dán ảnh vào thư mục hiện tại (Paste) |
| `Ctrl + A` | Chọn tất cả ảnh trong thư mục |
| `Delete` | Xóa các ảnh đã chọn vào Thùng Rác |
| `F2` | Đổi tên hàng loạt & Đồng bộ giờ chụp (Batch Rename) |
| `F1` | Mở Bảng Quản lý Tùy Biến Phím Tắt |

---

## 🛠️ Hướng dẫn cài đặt & Sử dụng

### Dành cho Windows:
1. Truy cập mục [**Releases**](https://github.com/hoangdiep99/fast-photo-culler-v2/releases).
2. Tải về file:
   - **`Fast Photo Culler AI Setup v2.11.0.exe`**: Bộ cài đặt tự động tạo biểu tượng trên Desktop và Start Menu.
   - Hoặc **`Fast Photo Culler AI Portable v2.11.0.exe`**: Bản chạy trực tiếp không cần cài đặt.
3. Mở phần mềm, chọn thư mục chứa ảnh (hoặc kéo thả thư mục vào app) và bắt đầu tuyển chọn ảnh siêu tốc!

### Dành cho macOS (Apple Silicon & Intel):
1. Tải về file **`Fast Photo Culler AI v2.11.0-arm64.dmg`** (cho chip M1/M2/M3/M4) hoặc **`Fast Photo Culler AI v2.11.0-x64.dmg`** (cho chip Intel).
2. Mở file `.dmg` và kéo biểu tượng **Fast Photo Culler AI** vào thư mục **Applications**.

---

## 💻 Dành cho Lập trình viên (Developer Guide)

### Yêu cầu môi trường:
- [Node.js](https://nodejs.org/) phiên bản 18 hoặc 20 LTS.
- Trình quản lý gói `npm`.

### Cài đặt và chạy thử nghiệm:
```bash
# Clone repository về máy
git clone https://github.com/hoangdiep99/fast-photo-culler-v2.git
cd fast-photo-culler-v2

# Cài đặt các thư viện phụ thuộc
npm install

# Khởi chạy môi trường phát triển (Dev Mode)
npm run dev
```

### Đóng gói ứng dụng:
```bash
# Biên dịch mã nguồn Web & Electron
npm run build

# Đóng gói bộ cài đặt Windows (NSIS Setup & Portable)
npm run dist:win

# Đóng gói bộ cài đặt macOS (.dmg & .zip)
npm run dist:mac
```

---

## 👑 Tác giả & Đóng góp

- **Tác giả & Nhà phát triển**: **Hoàng Điệp**
- **Facebook**: [facebook.com/HoangdiepLN](https://www.facebook.com/HoangdiepLN)
- **Email / Liên hệ**: Đóng góp ý kiến và báo lỗi thông qua mục [Issues](https://github.com/hoangdiep99/fast-photo-culler-v2/issues) trên GitHub.

---

## 📄 Giấy phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE).
Mọi quyền sở hữu trí tuệ và thương hiệu thuộc về **Hoàng Điệp** và **Fast Photo Culler AI**.
