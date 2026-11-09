// The only file you need to edit on the page side.
export const SITE_CONFIG = {
  // Apps Script web app URL ending in /exec (see README, step 5). Empty = booking section shows "chưa mở".
  apiUrl: 'https://script.google.com/macros/s/AKfycbzjZYis9g5J08bjD29UHfimOcgnYV29U6W_5GUxyF2-muvbdJC02xUKSrWKPQsPzDBk/exec',
  // Portfolio link shown in the intro
  portfolioUrl: 'https://bonjourney1011.github.io/',
  // Facebook username for https://m.me/<username>; empty = no Messenger button
  messengerUsername: 'thuanbon.mo'
};

export const messengerUrl = () =>
  SITE_CONFIG.messengerUsername ? `https://m.me/${encodeURIComponent(SITE_CONFIG.messengerUsername)}` : '';
