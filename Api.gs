/**
 * Api.gs — ประตู API สำหรับหน้าเว็บบน GitHub Pages
 * (Code.gs ในโฟลเดอร์นี้แก้ doPost เป็น lineWebhook_ ให้แล้ว)
 * ค่า GOOGLE_CLIENT_ID / FRONTEND_URL อยู่ใน SellerConfig.gs, รหัสร้านอยู่ใน Script property SHOP_CODE
 */
const SESSION_TTL_ = 21600; // 6 ชม. (ต่ออายุอัตโนมัติทุกครั้งที่ใช้งาน)
const API_FUNCS_ = ["addManualPayable", "addMemberPOS", "addStaffRecord", "cancelOrder", "checkout", "closeShiftAndNotify", "confirmPayablePayment", "getAdminBookings", "getBillHistory", "getCompanyBanks", "getCustomerHistory", "getExpenseCategories", "getInventoryLog", "getMonthlyBookingsUI", "getPaidPayables", "getPayablesList", "getPayrollData", "getPendingBookingsCount", "getReportData", "getScriptUrl", "getShiftStatus", "getShopSettings", "getStaffList", "getStock", "getStockStatistics", "getSystemUpdates", "getVendorsData", "manageCashDrawer", "manageInventory", "saveNewExpense", "saveNewVendor", "saveShopSettings", "searchCustomer", "sendMonthlySummaryToLine", "setStaffPin", "updateBookingDetailsExtended"];

function doPost(e) {
  let body = null;
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  if (body && body.fn) return apiHandle_(body);
  return lineWebhook_(e); // webhook ของ LINE เหมือนเดิม
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function apiHandle_(b) {
  try {
    const blocked = hubBlocked_();
    if (blocked) return json_({ ok: false, msg: blocked });
    if (b.fn === 'authLogin') return json_(authLogin_(b.idToken));
    const cache = CacheService.getScriptCache();
    const raw = b.session ? cache.get('sess_' + b.session) : null;
    if (!raw) return json_({ ok: false, code: 'auth', msg: 'กรุณาเข้าสู่ระบบใหม่' });
    cache.put('sess_' + b.session, raw, SESSION_TTL_);
    const u = JSON.parse(raw);
    if (b.fn === 'authCheck') return json_({ ok: true, data: u });
    if (b.fn === 'authLogout') { cache.remove('sess_' + b.session); return json_({ ok: true, data: 'bye' }); }
    if (API_FUNCS_.indexOf(b.fn) < 0) return json_({ ok: false, msg: 'ไม่อนุญาตฟังก์ชัน: ' + b.fn });
    const out = globalThis[b.fn].apply(null, b.args || []);
    return json_({ ok: true, data: out === undefined ? null : out });
  } catch (err) { return json_({ ok: false, msg: String(err && err.message || err) }); }
}

function authLogin_(idToken) {
  const cid = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || SELLER_CONFIG.GOOGLE_CLIENT_ID;
  if (!cid) return { ok: false, msg: 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID (SellerConfig.gs)' };
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return { ok: false, msg: 'โทเคนไม่ถูกต้องหรือหมดอายุ' };
  const t = JSON.parse(r.getContentText());
  if (t.aud !== cid || String(t.email_verified) !== 'true') return { ok: false, msg: 'บัญชี Google ไม่ผ่านการตรวจสอบ' };
  const email = String(t.email).toLowerCase();
  const user = findAllowedUser_(email);
  if (!user) return { ok: false, msg: 'อีเมล ' + email + ' ยังไม่ได้รับสิทธิ์ — ให้เจ้าของร้านเพิ่มในชีต Users' };
  const session = Utilities.getUuid() + Utilities.getUuid();
  const info = { email: email, name: user.name || t.name || email };
  CacheService.getScriptCache().put('sess_' + session, JSON.stringify(info), SESSION_TTL_);
  return { ok: true, session: session, data: info };
}

// ชีต "Users": A=Email  B=ชื่อ  C=สถานะ (ใช้งาน/ระงับ) — สร้างให้อัตโนมัติ พร้อมใส่อีเมลเจ้าของ
function findAllowedUser_(email) {
  const ss = getActiveSS();
  let sh = ss.getSheetByName('Users');
  if (!sh) {
    sh = ss.insertSheet('Users');
    sh.appendRow(['Email', 'ชื่อ', 'สถานะ']);
    const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
    if (owner) sh.appendRow([owner, 'เจ้าของร้าน', 'ใช้งาน']);
  }
  const d = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]).trim().toLowerCase() === email && String(d[i][2] || 'ใช้งาน').trim() !== 'ระงับ') return { name: d[i][1] };
  }
  return null;
}

// ด่านเดิมของ doGet (ระงับ/หมดอายุ) ใช้กับ API ด้วย
function hubBlocked_() {
  try {
    const sh = SpreadsheetApp.openById("17U9kjctQJT1z2m1srdcvtqJGPDMSbya9B7WfLkaxB5k").getSheetByName("Shops");
    const myUrl = ScriptApp.getService().getUrl();
    if (!sh) return null;
    const d = sh.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (String(d[i][2]).trim() !== myUrl || !myUrl) continue;
      if (String(d[i][4]).trim() === 'ระงับ') return 'ระบบถูกระงับการใช้งาน';
      const ex = d[i][7];
      if (ex && ex !== 'ตลอดชีพ') { const t = new Date(); t.setHours(0,0,0,0); const x = new Date(ex); x.setHours(0,0,0,0); if (t > x) return 'แพ็กเกจหมดอายุแล้ว'; }
      return null;
    }
  } catch (e) {}
  return null;
}

// ลิงก์เก่า (เช่น จาก LINE ?page=calendar) → ส่งต่อไปหน้า POS บน GitHub พร้อมรหัสร้าน
function frontendRedirect_(e) {
  const props = PropertiesService.getScriptProperties();
  const base = props.getProperty('FRONTEND_URL') || SELLER_CONFIG.FRONTEND_URL;
  if (!base) return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:40px">ยังไม่ได้ตั้งค่า FRONTEND_URL</p>');
  const params = Object.assign({}, (e && e.parameter) || {});
  const shop = props.getProperty('SHOP_CODE'); if (shop) params.shop = shop;
  const qs = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const url = base + (base.indexOf('?') < 0 ? '?' : '&') + qs;
  return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;text-align:center;padding:60px"><h3>ระบบ POS ย้ายไปที่ลิงก์ใหม่แล้ว</h3><a href="' + url + '" target="_top" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#00796B;color:#fff;border-radius:10px;text-decoration:none">เปิดระบบ POS</a></div><script>try{window.top.location.replace("' + url + '")}catch(e){}</script>')
    .setTitle('POS').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
