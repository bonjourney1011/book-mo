# Book Mo

Trang để người khác đặt 45 phút nói chuyện với Mo: chọn giờ → chuyển khoản 100k qua VietQR → gửi ảnh chuyển khoản + mục đích → lịch được lưu, có lời mời Google Calendar và email. Mỗi sáng 8h Mo nhận một email tổng hợp để duyệt hoặc huỷ.

- **Trang:** HTML/CSS/JS thuần, chạy trên GitHub Pages, không cần build.
- **Lịch:** Google Apps Script ghi vào Google Sheet, lưu ảnh bill vào Drive riêng, tạo event Calendar, gửi Gmail.
- **Chi phí:** 0đ.

```
index.html                 trang chính (giới thiệu + 5 bước đặt lịch)
assets/js/site-config.js   ← chỗ duy nhất cần sửa phía trang (URL API, link portfolio, Mo Beauty, Messenger)
apps-script/               code dán vào Google Apps Script
tests/                     test logic chia khung giờ + kiểm tra form (npm test)
```

**Thứ tự làm lần đầu (khoảng 30 phút):** 1 Sheet + script → 2 Khung giờ + tài khoản → 3 Cấp quyền → 4 Deploy → 5 Bật email 8h → 6 GitHub Pages → 7 Đặt thử.

## 1. Tạo Google Sheet + script

1. Vào [sheets.new](https://sheets.new), đặt tên ví dụ `Book Mo – Lịch`.
2. Trong Sheet, mở **Tiện ích mở rộng → Apps Script**.
3. Tạo 10 file script (nút **+** cạnh "Tệp" → **Tập lệnh**), đặt tên và dán nội dung từ thư mục `apps-script/`. Không cần gõ đuôi `.gs`.
   - `main-web-app-handlers`
   - `sheet-repository`
   - `text-helpers`
   - `slot-generation`
   - `booking-validation`
   - `bill-upload-drive`
   - `calendar-and-booker-email`
   - `daily-digest-and-actions`
   - `booking-action-page`
   - `setup-sheets-one-time`

   Xoá file `Code.gs` mặc định, bấm 💾 **Lưu**.
4. **Cài đặt dự án** (bánh răng) → tích *Hiển thị tệp kê khai "appsscript.json"* → mở `appsscript.json`, thay bằng nội dung `apps-script/appsscript.json`, Lưu.
5. Mở `setup-sheets-one-time`, chọn hàm `setupSheets` → **Chạy**. Google hỏi quyền: chọn tài khoản → *Nâng cao* → *Đi tới…* → *Cho phép*.
6. Tải lại Sheet (F5). Sẽ có 3 tab **Config / Slots / Bookings**, menu **Book Mo**, và một thư mục Drive `Book Mo – Bills` (chỉ bạn mở được).

## 2. Điền khung giờ và tài khoản nhận tiền

**Tab Slots** – mỗi dòng là một khung rảnh lặp hàng tuần:

| weekday | start | end | active |
|---|---|---|---|
| T7 | 09:00 | 12:00 | ☑ |
| CN | 09:00 | 12:00 | ☑ |

Script tự chia khung thành các buổi 45 phút, nghỉ 15 phút (sửa ở Config `slot_minutes`, `buffer_minutes`). Khung 09:00–12:00 ra 3 buổi: 09:00, 10:00, 11:00.

**Tab Config:**
- `bank_bin`, `bank_account`, `bank_account_name` (IN HOA KHÔNG DẤU). BIN: `970436` Vietcombank, `970422` MB, `970407` Techcombank, `970418` BIDV, `970415` VietinBank. Ngân hàng khác tra [api.vietqr.io/v2/banks](https://api.vietqr.io/v2/banks).
- `price` 100000, `lead_days` 1 (đặt trước ít nhất 1 ngày), `horizon_days` 14.
- `meeting_link`: link Google Meet cố định (tạo một lần ở meet.google.com → "Tạo cuộc họp để dùng sau"). Để trống thì email xác nhận ghi "Mo sẽ gửi link trước giờ hẹn".
- `booking_open`: tích khi sẵn sàng nhận lịch.

STK chỉ nằm trong Sheet, không bao giờ xuất hiện trên GitHub.

## 3. Cấp quyền Calendar + Gmail

Menu **Book Mo → 📅 Test lịch + email**. Google hỏi thêm quyền Calendar và Gmail → *Cho phép*. Script tạo một event thử rồi xoá ngay, và gửi một email thử tới Gmail của bạn.

## 4. Deploy để có URL API

1. **Triển khai → Tác vụ triển khai mới** → loại **Ứng dụng web** → *Thực thi với tư cách*: **Tôi** → *Người có quyền truy cập*: **Bất kỳ ai** → Triển khai.
2. Copy URL dạng `https://script.google.com/macros/s/…/exec`. Dán vào trình duyệt phải thấy `{"ok":true,"open":false,…}`.
3. Dán URL vào `apiUrl` trong `assets/js/site-config.js` **và** vào ô `api_url` ở Config (các nút trong email tổng hợp dùng URL này). Ô `site_url` dán link trang (bước 6).
4. **Sửa code về sau:** *Triển khai → Quản lý các lần triển khai → ✏️ → Phiên bản: Mới* để giữ nguyên URL.

Đổi khung giờ, giá, bật/tắt trong Sheet thì không cần deploy lại; trang cập nhật sau tối đa 30 giây.

## 5. Bật email tổng hợp 8h sáng

Menu **Book Mo → ⏰ Bật email tổng hợp 8h sáng**. Từ đó mỗi sáng, nếu có lịch *Chờ duyệt*, bạn nhận một email liệt kê từng lịch: giờ, tên, email, mục đích, link ảnh chuyển khoản, và hai nút:

- **✅ Xác nhận** → trạng thái *Đã xác nhận*, khách nhận email kèm `meeting_link`.
- **❌ Huỷ (bill không hợp lệ)** → trạng thái *Huỷ*, event Calendar bị xoá (khách nhận thông báo huỷ của Google), khách nhận email, khung giờ mở lại.

Mỗi nút mở một trang nhỏ hỏi lại trước khi làm, và chỉ dùng được một lần. Mỗi email chỉ được giữ tối đa 2 lịch đang chờ. Không có lịch chờ thì không có email. Muốn email về địa chỉ khác: *Cài đặt dự án → Thuộc tính tập lệnh* thêm `NOTIFY_EMAIL`.

Muốn xem ngay: **Book Mo → 📨 Gửi email tổng hợp ngay**.

## 6. Đưa lên GitHub Pages

1. Tạo repo **public** `book-mo` trên tài khoản `bonjourney1011`, push toàn bộ thư mục này.
2. Repo → **Settings → Pages → Deploy from a branch → `main` / `/ (root)`** → Save.
3. Sau 1–2 phút trang chạy ở `https://bonjourney1011.github.io/book-mo/`. Dán link này vào Config `site_url`.
4. Gắn link vào portfolio: thêm `{ label: 'Book a talk', href: 'https://bonjourney1011.github.io/book-mo/' }` vào `navLinks` trong `src/config/site-profile.ts` của repo portfolio.

Khi đăng link, thêm `?src=fb`, `?src=zalo`… để cột `source` ghi lại kênh.

## 7. Đặt thử một lịch

1. Config: tích `booking_open`.
2. Mở trang trên điện thoại, đặt một khung bằng email của bạn, gửi một ảnh bất kỳ làm bill.
3. Kiểm tra: tab **Bookings** có dòng *Chờ duyệt*; thư mục Drive có ảnh; Google Calendar có event với bạn là khách; Gmail có lời mời + email "Mo đã nhận lịch".
4. **Book Mo → 📨 Gửi email tổng hợp ngay** → bấm **❌ Huỷ** trong email → dòng chuyển *Huỷ*, event biến mất, khung giờ hiện lại trên trang.

## Vận hành

| Việc | Làm ở đâu |
|---|---|
| Tạm đóng lịch | Config: bỏ tích `booking_open` |
| Đổi khung rảnh | Tab Slots: thêm/sửa dòng, bỏ tích `active` để tạm tắt |
| Nghỉ một ngày cụ thể | Chưa hỗ trợ theo ngày. Tạm bỏ tích khung đó trong tuần, hoặc tự đặt một lịch giả bằng email của bạn rồi Huỷ khi cần mở lại |
| Duyệt/huỷ | Link trong email 8h sáng. Sửa tay cột `status` cũng trả lại khung giờ nhưng **không** xoá event và **không** email khách |
| Khách chuyển khoản nhưng khung bị người khác lấy trước | Trang tự cho chọn khung khác, giữ ảnh bill; cột `paid_code` ghi mã đã chuyển, email tổng hợp cảnh báo lệch mã |

- **Không đổi tên tab, không chèn cột vào giữa.** Cột mới chỉ thêm ở cuối tab Bookings.
- Mã lịch = `MO` + ngày tháng + giờ của buổi (VD `MO1511-0930`). Lịch Huỷ rồi được đặt lại sẽ trùng mã với dòng cũ; đối chiếu theo ảnh bill và `paid_code`.
- Gmail cá nhân giới hạn khoảng 100 email/ngày, đủ dùng.

## Phát triển

```bash
npm test        # chạy đúng file .gs thật bằng Node
npm run serve   # xem trang ở http://localhost:4173
```

**Server tự kiểm tra lại mọi thứ, không tin dữ liệu từ trình duyệt:**
- tính lại khung trống từ Sheet ngay trong lúc khoá ghi (`LockService`), nên hai người không thể đặt cùng một buổi;
- ảnh bill lên Drive trước, ghi Sheet sau: ảnh lỗi thì không có dòng rác;
- chống spam: ô bẫy, chặn gửi quá nhanh, tối đa 10 lịch/10 phút cho cả trang;
- gửi lại cùng một form (mạng chậm) không tạo lịch trùng;
- link duyệt/huỷ có token riêng từng lịch, chỉ tác dụng khi lịch còn *Chờ duyệt*;
- chống chèn công thức vào Sheet;
- API public chỉ trả khung giờ trống và giá, không có tên, email hay số tài khoản.
