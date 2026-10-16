# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG TẠO KEY KINXSUB LÊN VERCEL

Thư mục **`kinxsub-keygen-web`** là một hệ thống web độc lập hoàn chỉnh, bao gồm cả **Cổng người dùng tự nhận key dùng thử (không cần mật khẩu)** và **Trang quản trị viên cấp cao (bảo mật bằng mã PIN)**, tối ưu 100% để triển khai miễn phí lên [Vercel](https://vercel.com/).

---

## 🏛️ 1. CẤU TRÚC 2 TRANG WEB TRONG DỰ ÁN

| Đường dẫn | Đối tượng | Yêu cầu Mật khẩu | Tính năng chính |
| :--- | :--- | :--- | :--- |
| **`/`** hoặc **`/claim`** (`index.html`) | **Khách hàng / Người dùng** | ❌ **Không cần mật khẩu** | Tự động nhận key dùng thử **cố định 1 tháng (30 ngày)**. **Mỗi máy chỉ được tạo 1 lần duy nhất** (tự động phát hiện và khóa nếu tạo lại). |
| **`/admin`** (`admin.html`) | **Chủ sở hữu / Quản trị viên** | 🔒 **Mã PIN bảo mật** (`888888`) | Tự do chọn thời hạn: **Theo Ngày (3, 7, 14, 30 hoặc gõ số ngày bất kỳ)**, **Theo Tháng**, **Theo Năm**, **Vĩnh Viễn (Lifetime tới 2099)**, hoặc **Chọn lịch**. Quản lý lịch sử và mở khóa danh sách máy dùng thử. |

---

## 🌟 2. HƯỚNG DẪN TRIỂN KHAI LÊN VERCEL (30 GIÂY)

### Cách 1: Triển khai bằng lệnh Vercel CLI (Nhanh nhất)
1. Mở cửa sổ **Terminal / PowerShell** tại thư mục `kinxsub-keygen-web`:
   ```powershell
   cd "kinxsub-keygen-web"
   ```
2. Chạy lệnh:
   ```powershell
   npx vercel
   ```
3. Nhấn **Enter** chọn giá trị mặc định cho các câu hỏi của Vercel:
   - `Set up and deploy?` ➜ Gõ `y` rồi Enter.
   - `Which scope?` ➜ Bấm Enter.
   - `Link to existing project?` ➜ Gõ `n` rồi Enter.
   - `Project’s name?` ➜ Đặt tên (VD: `kinxsub-license`) rồi Enter.
   - `Directory located?` ➜ Bấm Enter (`./`).
4. Vercel sẽ cấp ngay cho bạn một link web (VD: `https://kinxsub-license.vercel.app`).
5. Cập nhật bản chính thức Production:
   ```powershell
   npx vercel --prod
   ```

### Cách 2: Triển khai qua GitHub & Vercel Dashboard
1. Đưa mã nguồn thư mục `kinxsub-keygen-web` lên repository GitHub của bạn.
2. Truy cập [https://vercel.com/new](https://vercel.com/new) và đăng nhập bằng GitHub.
3. Chọn Repository vừa đưa lên và bấm **Import**.
4. Bấm nút **Deploy**. Chờ 20 giây là web của bạn đã online toàn cầu!

---

## 🔒 3. THÔNG TIN BẢO MẬT & MÃ PIN QUẢN TRỊ VIÊN

- **Mã PIN quản trị viên mặc định:** `888888`
- **Cách vào trang quản trị:** 
  - Truy cập đường dẫn: `https://your-domain.vercel.app/admin` (hoặc `admin.html`).
  - Hoặc bấm vào nút **"🔐 Quản Trị Viên"** ở góc trên bên phải trang người dùng.
- **Đổi mã PIN:** Vào tab **⚙️ Cài Đặt** trong trang Quản trị để đổi mã PIN riêng của bạn bất kỳ lúc nào.

---

## 🛡️ 4. CƠ CHẾ CHỐNG GIAN LẬN (CHỈ TẠO 1 LẦN DÙNG THỬ)

- Trên trang người dùng (`/`), hệ thống tự động kiểm tra mã máy (HWID) và định danh trình duyệt:
  - Nếu máy đó **chưa từng nhận key**: Hệ thống ký số RSA-2048 cấp ngay key 30 ngày và lưu vết vào hệ thống.
  - Nếu máy đó **đã nhận key trước đó**: Hệ thống chặn không cho tạo thêm key mới, hiện cảnh báo và hiển thị lại mã key cũ đã cấp kèm ngày hết hạn để khách dùng lại.
- **Quyền Quản Trị Viên:** Trong trang Quản trị, tab **"🛡️ Quản Lý Dùng Thử"** sẽ liệt kê tất cả các máy đã nhận key. Admin có nút **"🔓 Mở Khóa Nhận Lại"** nếu muốn tặng thêm 1 tháng cho một khách hàng quen.
