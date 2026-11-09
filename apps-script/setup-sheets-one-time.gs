/**
 * Run once from the Apps Script editor (select setupSheets → Run).
 * Creates the Config / Slots / Bookings tabs if missing and the private Drive folder for bills.
 * Existing tabs are left untouched.
 */
function setupSheets() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  // Date cells (slot_start) are read in the spreadsheet's time zone, so it must match the script's.
  spreadsheet.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  createConfigSheet_(spreadsheet);
  createSlotsSheet_(spreadsheet);
  createBookingsSheet_(spreadsheet);
  getOrCreateBillFolder_();
  var defaultSheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.getSheetByName('Trang tính1');
  if (defaultSheet && spreadsheet.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

function createSheetWithHeader_(spreadsheet, name, headers) {
  if (spreadsheet.getSheetByName(name)) return null;
  var sheet = spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8eef2');
  sheet.setFrozenRows(1);
  return sheet;
}

function createConfigSheet_(spreadsheet) {
  var sheet = createSheetWithHeader_(spreadsheet, SHEET_NAMES.config, ['key', 'value', 'ghi chú']);
  if (!sheet) return;
  var rows = [
    ['booking_open', false, 'Tích = đang nhận lịch. Bỏ tích = trang hiện "Mo đang tạm đóng lịch".'],
    ['price', 100000, 'Số tiền chuyển khoản mỗi buổi (đ).'],
    ['slot_minutes', 45, 'Độ dài mỗi buổi (phút).'],
    ['buffer_minutes', 15, 'Khoảng nghỉ giữa 2 buổi (phút).'],
    ['lead_days', 1, 'Phải đặt trước ít nhất bao nhiêu ngày.'],
    ['horizon_days', 14, 'Cho đặt xa nhất bao nhiêu ngày.'],
    ['bank_bin', '', 'Mã BIN ngân hàng nhận tiền, VD 970436 = Vietcombank, 970422 = MB, 970407 = Techcombank.'],
    ['bank_account', '', 'Số tài khoản nhận tiền (chỉ nằm ở Sheet, không public).'],
    ['bank_account_name', '', 'Tên chủ tài khoản, IN HOA KHÔNG DẤU.'],
    ['meeting_link', '', 'Tuỳ chọn: link Google Meet/Zalo cố định, gửi cho khách khi xác nhận.'],
    ['site_url', '', 'Link trang đặt lịch, VD https://bonjourney1011.github.io/book-mo/ (hiện trong email tổng hợp).'],
    ['api_url', '', 'URL /exec sau khi deploy (bước 4). Dùng cho các nút trong email tổng hợp.']
  ];
  sheet.getRange('B2').insertCheckboxes();
  sheet.getRange('B3:B7').setNumberFormat('0');
  sheet.getRange('B8:B13').setNumberFormat('@');
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 520);
}

function createSlotsSheet_(spreadsheet) {
  var sheet = createSheetWithHeader_(spreadsheet, SHEET_NAMES.slots, SLOT_HEADERS);
  if (!sheet) return;
  var rows = [
    ['T7', '09:00', '12:00', true],
    ['CN', '09:00', '12:00', true],
    ['T4', '20:00', '22:00', false]
  ];
  // Text format first so "09:00" stays text instead of becoming a time cell.
  sheet.getRange(2, 2, 50, 2).setNumberFormat('@');
  sheet.getRange(2, 4, 50, 1).insertCheckboxes();
  sheet.getRange(2, 1, rows.length, SLOT_HEADERS.length).setValues(rows);
  sheet.getRange(1, 1).setNote('T2, T3, T4, T5, T6, T7 hoặc CN. Mỗi dòng là một khung rảnh lặp hàng tuần.');
  sheet.getRange(1, 2).setNote('Giờ bắt đầu, dạng 09:00. Các buổi được chia tự động theo slot_minutes + buffer_minutes.');
}

function createBookingsSheet_(spreadsheet) {
  var sheet = createSheetWithHeader_(spreadsheet, SHEET_NAMES.bookings, BOOKING_HEADERS);
  if (!sheet) return;
  var col = function (header) { return BOOKING_HEADERS.indexOf(header) + 1; };
  var maxRows = sheet.getMaxRows() - 1;
  ['created_at', 'slot_start', 'slot_end', 'updated_at'].forEach(function (header) {
    sheet.getRange(2, col(header), maxRows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  });
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(BOOKING_STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, col('status'), maxRows, 1).setDataValidation(rule);
  sheet.hideColumns(col('bill_file_id'));
  sheet.hideColumns(col('action_token'));
  sheet.setColumnWidth(col('purpose'), 320);
  sheet.getRange(1, col('status')).setNote('Đổi tay sang Huỷ cũng trả lại khung giờ, nhưng không xoá event Calendar và không email khách. Dùng link trong email tổng hợp thì đủ cả.');
}
