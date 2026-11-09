// English copy for /en/. Keys are the Vietnamese strings used in the code and sent by the Apps Script server,
// so server messages translate here without touching the backend. {n} marks a value filled in by t().
export const EN_TEXT = {
  // Booking flow
  'Đang tải khung giờ trống…': 'Loading free time slots…',
  'Chưa tải được lịch. Bạn tải lại trang hoặc nhắn Mo nhé.': 'Could not load the schedule. Reload the page or message Mo.',
  'Mo đang tạm đóng lịch. Bạn ghé lại sau nhé.': 'Mo has paused bookings for now. Please check back later.',
  'Mỗi buổi {n} phút. Bạn chọn ngày rồi chọn giờ.': 'Each session is {n} minutes. Pick a day, then a time. Times are Vietnam time (GMT+7).',
  'Đang kiểm tra khung giờ…': 'Checking the time slot…',
  'Tiếp tục': 'Continue',
  'Ảnh quá lớn. Bạn chụp màn hình rồi chọn lại nhé.': 'The image is too large. Take a screenshot and choose it again.',
  'Ảnh không đọc được. Bạn chụp màn hình rồi chọn lại nhé.': 'Could not read the image. Take a screenshot and choose it again.',
  'File này không phải ảnh. Bạn chọn ảnh JPG hoặc PNG nhé.': 'This file is not an image. Please choose a JPG or PNG.',
  'Chọn ảnh, kéo thả ảnh vào đây, hoặc dán ảnh bằng Ctrl+V. Trang tự thu nhỏ ảnh trước khi gửi.':
    'Choose an image, drop it here, or paste it with Ctrl+V. The page shrinks it before sending.',
  'Chưa tạo được mã QR. Bạn gửi ảnh qua Zalo hoặc Messenger cho chính mình, rồi dán vào đây bằng Ctrl+V nhé.':
    'Could not create the QR code. Send the image to yourself on Messenger or WhatsApp, then paste it here with Ctrl+V.',
  'Bạn chọn ảnh chụp màn hình chuyển khoản trước nhé.': 'Please choose the transfer screenshot first.',
  'Đang gửi…': 'Sending…',
  'Gửi lịch': 'Send booking',
  'Khung giờ vừa có người đặt. Bạn chọn khung khác, không cần chuyển khoản lại, Mo sẽ đối chiếu.':
    'Someone just took that slot. Pick another one. No need to pay again, Mo will match your transfer.',
  'Đang mở lịch bạn đặt trên máy tính…': 'Opening the booking you started on your computer…',
  'Khung giờ này đã có lịch. Nếu bạn vừa gửi lịch trên máy tính thì lịch đã được giữ, bạn xem email nhé. Nếu chưa, bạn chọn khung khác.':
    'This slot is already booked. If you just sent the booking from your computer, it is saved: check your email. If not, pick another slot.',
  'Bạn viết lại vài dòng về điều muốn trao đổi rồi bấm Tiếp tục nhé.': 'Write a few lines about what you want to discuss, then press Continue.',
  'Trang đặt lịch chưa mở. Bạn nhắn Mo qua Messenger nhé.': 'Booking is not open yet. Please message Mo on Messenger.',
  'Hai tuần tới Mo chưa có khung trống. Bạn ghé lại sau nhé.': 'No free slots in the next two weeks. Please check back later.',
  'Chọn ngày': 'Choose a day',
  'Chọn giờ': 'Choose a time',
  '{n} khung': '{n} slots',
  'Lịch trống gần nhất: {day}, {time} · còn {n} khung trống': 'Next free slot: {day}, {time} (Vietnam time) · {n} slots open',
  // Payment card
  'Mã lịch: ': 'Booking code: ',
  'Bạn đã chuyển khoản với nội dung {code}. Không cần chuyển lại. Mo sẽ đối chiếu theo ảnh bạn gửi.':
    'You already paid with reference {code}. No need to pay again. Mo will match it with your screenshot.',
  'Mo chưa điền tài khoản nhận tiền. Bạn nhắn Mo qua Messenger nhé.': 'Payment details are not set up yet. Please message Mo on Messenger.',
  'Mã VietQR chuyển {amount}, nội dung {code}': 'VietQR code for {amount}, reference {code}',
  'Trên điện thoại: chụp màn hình mã QR, mở app ngân hàng, chọn Quét QR rồi chọn ảnh vừa chụp.':
    'On a phone: screenshot the QR, open your Vietnamese banking app, choose Scan QR and pick the screenshot.',
  'Hoặc chuyển khoản thủ công': 'Or transfer manually',
  'Ngân hàng': 'Bank',
  'Xem tên ngân hàng trên mã QR': 'See the bank name on the QR',
  'Số tài khoản': 'Account number',
  'Chủ tài khoản': 'Account name',
  'Số tiền': 'Amount',
  'Nội dung': 'Reference',
  'Giữ nguyên mã lịch để Mo đối chiếu nhanh.': 'Keep the booking code as the reference so Mo can match it quickly.',
  'Chép': 'Copy',
  'Chép {label}': 'Copy {label}',
  'Đã chép ✓': 'Copied ✓',
  'Chép thủ công nhé': 'Please copy by hand',
  // Done step
  'Mo đã nhận lịch của bạn': 'Mo has received your booking',
  'Mã lịch ': 'Booking code ',
  'Lời mời lịch sẽ tới email ': 'A calendar invite is on its way to ',
  '. Bạn bấm "Có" để lưu vào lịch của mình.': '. Press "Yes" to add it to your calendar.',
  'Mo đối chiếu chuyển khoản và xác nhận trong vòng 24 giờ.': 'Mo checks the transfer and confirms within 24 hours.',
  'Nếu ảnh chuyển khoản không khớp, Mo huỷ lịch và báo qua email. Bạn reply email đó nếu có nhầm lẫn.':
    'If the screenshot does not match a transfer, Mo cancels the booking by email. Reply to that email if it is a mistake.',
  'Cần gấp? Nhắn Mo qua Messenger': 'In a hurry? Message Mo on Messenger',
  // Server and network messages (Apps Script)
  'Mạng chập chờn hoặc hệ thống đang bận. Bạn thử lại sau ít phút nhé.': 'The network is unstable or the system is busy. Please try again in a few minutes.',
  'Hệ thống đang bận, bạn thử lại sau ít phút nhé.': 'The system is busy. Please try again in a few minutes.',
  'Dữ liệu không hợp lệ.': 'Invalid data.',
  'Không gửi được, bạn thử lại nhé.': 'Could not send. Please try again.',
  'Mo đang tạm đóng lịch. Bạn quay lại sau nhé.': 'Mo has paused bookings for now. Please check back later.',
  'Bạn điền tên để Mo biết gọi bạn là gì nhé.': 'Please enter your name so Mo knows what to call you.',
  'Email chưa đúng. Mo gửi lời mời lịch qua email này.': 'That email looks wrong. Mo sends the calendar invite to it.',
  'Bạn chọn một khung giờ trước nhé.': 'Please pick a time slot first.',
  'Khung giờ này vừa có người đặt. Bạn chọn khung khác giúp Mo nhé.': 'Someone just took this slot. Please pick another one.',
  'Bạn ghi vài dòng về điều muốn trao đổi, để Mo chuẩn bị trước nhé.': 'Write a few lines about what you want to discuss so Mo can prepare.',
  'Bạn gửi ảnh chụp màn hình chuyển khoản nhé.': 'Please send the transfer screenshot.',
  'Ảnh quá lớn. Bạn chụp lại màn hình rồi chọn lại nhé.': 'The image is too large. Take a new screenshot and choose it again.',
  'Ảnh không đọc được, bạn chọn lại nhé.': 'Could not read the image. Please choose it again.',
  'Ảnh cần là JPG, PNG hoặc WebP.': 'The image must be JPG, PNG or WebP.',
  'Tệp này không phải ảnh JPG/PNG/WebP. Bạn chụp màn hình rồi chọn lại nhé.': 'This file is not a JPG/PNG/WebP image. Take a screenshot and choose it again.',
  'Không tải được ảnh, bạn thử lại nhé.': 'Could not upload the image. Please try again.',
  'Email này đã có {n} lịch đang chờ. Bạn reply email xác nhận nếu cần đổi.':
    'This email already has {n} pending bookings. Reply to the confirmation email if you need a change.'
};
