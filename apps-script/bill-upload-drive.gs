/**
 * Stores the transfer screenshot in a private Drive folder owned by the deploying account.
 * Nobody else can open the file: the digest link only works for Mo.
 */
var BILL_FOLDER_PROPERTY = 'BILL_FOLDER_ID';
var BILL_FOLDER_NAME = 'Book Mo – Bills';

function getOrCreateBillFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(BILL_FOLDER_PROPERTY);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { console.warn('Bill folder missing, recreating', err); }
  }
  var folder = DriveApp.createFolder(BILL_FOLDER_NAME);
  props.setProperty(BILL_FOLDER_PROPERTY, folder.getId());
  return folder;
}

/** Throws on failure so the caller can refuse the booking before anything is written. */
function saveBillImage_(base64, mime, bookingCode) {
  var ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  var stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss');
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, bookingCode + '-' + stamp + '.' + ext);
  var file = getOrCreateBillFolder_().createFile(blob);
  return { url: file.getUrl(), fileId: file.getId() };
}
