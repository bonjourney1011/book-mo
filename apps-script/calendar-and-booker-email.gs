/**
 * Google Calendar event on Mo's default calendar (booker added as guest, so it lands on their
 * calendar too) and the three emails the booker can receive. Nothing here throws: a failed
 * event or email must never lose a booking that is already saved in the Sheet.
 */
function createBookingEvent_(booking, config) {
  try {
    var lines = [
      'Mã lịch: ' + booking.code,
      'Mục đích: ' + booking.purpose,
      config.meeting_link ? 'Link gặp: ' + String(config.meeting_link).trim() : 'Mo sẽ gửi link gặp khi xác nhận.',
      '',
      'Mo xác nhận trong vòng 24 giờ sau khi đối chiếu chuyển khoản.'
    ];
    var event = CalendarApp.getDefaultCalendar().createEvent(
      'Trò chuyện với Mo · ' + booking.name + ' (' + booking.code + ')',
      booking.slotStart, booking.slotEnd,
      { description: lines.join('\n'), guests: booking.email, sendInvites: true }
    );
    return event.getId();
  } catch (err) {
    console.error('Calendar event failed for ' + booking.code, err);
    return '';
  }
}

/** Deleting the event makes Google send the guest a cancellation on its own. */
function deleteBookingEvent_(eventId) {
  if (!eventId) return;
  try {
    var event = CalendarApp.getDefaultCalendar().getEventById(eventId);
    if (event) event.deleteEvent();
  } catch (err) {
    console.error('Calendar delete failed for ' + eventId, err);
  }
}

function bookerEmailContent_(kind, booking, config) {
  var slot = booking.slotLabel;
  var meeting = config.meeting_link ? String(config.meeting_link).trim() : '';
  if (kind === 'received') {
    return {
      subject: 'Mo đã nhận lịch ' + booking.code + ' · ' + slot,
      body: [
        'Chào ' + booking.name + ',',
        '',
        'Mo đã nhận lịch của bạn: ' + slot + ' (45 phút).',
        'Bạn sẽ thấy lời mời trên Google Calendar của email này.',
        'Mo đối chiếu chuyển khoản và xác nhận trong vòng 24 giờ.',
        '',
        'Mo'
      ].join('\n')
    };
  }
  if (kind === 'confirmed') {
    return {
      subject: 'Xác nhận lịch ' + booking.code + ' · ' + slot,
      body: [
        'Chào ' + booking.name + ',',
        '',
        'Lịch ' + slot + ' đã được xác nhận.',
        meeting ? 'Đến giờ, bạn vào link này: ' + meeting : 'Mo sẽ gửi link gặp trước giờ hẹn.',
        'Nếu bạn cần đổi giờ, reply email này.',
        '',
        'Hẹn gặp bạn,',
        'Mo'
      ].join('\n')
    };
  }
  return {
    subject: 'Lịch ' + booking.code + ' chưa được xác nhận',
    body: [
      'Chào ' + booking.name + ',',
      '',
      'Mo chưa đối chiếu được chuyển khoản cho lịch ' + slot + ', nên lịch này đã được huỷ và khung giờ mở lại cho người khác.',
      'Nếu bạn đã chuyển khoản, reply email này kèm ảnh chuyển khoản, Mo sẽ xếp lại lịch cho bạn.',
      '',
      'Mo'
    ].join('\n')
  };
}

/** kind: 'received' | 'confirmed' | 'cancelled'. Replies go to Mo's own Gmail. */
function emailBooker_(kind, booking, config) {
  try {
    var content = bookerEmailContent_(kind, booking, config);
    MailApp.sendEmail({ to: booking.email, subject: content.subject, body: content.body, name: 'Mo' });
  } catch (err) {
    console.error('Booker email failed (' + kind + ') for ' + booking.code, err);
  }
}

/** Menu "Book Mo → Test lịch + email": grants Calendar + Gmail scopes once, then cleans up. */
function testCalendarAndEmail() {
  var start = new Date();
  start.setDate(start.getDate() + 30);
  start.setHours(9, 0, 0, 0);
  var me = Session.getEffectiveUser().getEmail();
  var booking = {
    code: 'MO-TEST', name: 'Test', email: me, purpose: 'Kiểm tra quyền Calendar và Gmail.',
    slotStart: start, slotEnd: addMinutes(start, 45), slotLabel: formatSlotLabel(start, addMinutes(start, 45))
  };
  var eventId = createBookingEvent_(booking, readConfig_());
  emailBooker_('received', booking, readConfig_());
  deleteBookingEvent_(eventId);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    eventId ? 'Đã tạo + xoá 1 event thử và gửi 1 email tới ' + me + '. Quyền đã cấp xong.' : 'Chưa tạo được event. Xem Executions trong Apps Script.',
    'Book Mo', 8
  );
}
