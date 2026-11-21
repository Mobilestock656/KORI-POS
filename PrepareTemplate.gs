/**
 * PrepareTemplate.gs — เครื่องมือผู้ขาย
 *  เมนู MIRA (เปิดชีตแล้วจะขึ้นเอง):
 *   1) เตรียมชีตต้นแบบ  → ล้างข้อมูลร้านเดิม (ทำเฉพาะไฟล์ที่ชื่อมีคำว่า TEMPLATE และสำรองให้ก่อน)
 *   2) ตั้งค่าร้านใหม่   → ใส่รหัสร้าน, ตั้งตัวตั้งเวลา, สร้างชีตที่จำเป็น
 *   3) ตรวจความพร้อม    → เช็กลิสต์ก่อนส่งมอบ
 */
const TEMPLATE_CLEAR_ = ['Bookings','Members','Member','Orders','Payables','Expenses','InventoryLog','StaffRecords','CashDrawer','Courses','MemberCoupons','Vendors','CompanyBank','Staff','Users'];
const TEMPLATE_CLEAR_CATALOG_ = false;                       // true = ล้างรายการสินค้า/บริการด้วย
const TEMPLATE_CATALOG_ = ['Stock','Services','BookingMenu'];
const TEMPLATE_SETTINGS_RESET_ = { shopName:'ชื่อร้านของคุณ', phone:'', taxId:'', taxAddress:'', qrLink:'', logoUrl:'', promptPayId:'', bankName:'', accountNumber:'', accountName:'',
  lineToken:'', lineAdminId:'', lineReportGroupId:'', lineTokenAdmin:'', lineTokenExec:'', lineExecGroupId:'', lastSeenUpdate:'', adminPin:'1234', themeColor:'DEFAULT' };
const REQUIRED_SHEETS_ = ['Settings','Staff','Orders','Members','Bookings','Stock','Expenses','CashDrawer','Payables','Users'];

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('MIRA')
      .addItem('1) เตรียมชีตต้นแบบ (ล้างข้อมูล)', 'prepareTemplate')
      .addItem('2) ตั้งค่าร้านใหม่', 'setupNewShop')
      .addItem('3) ตรวจความพร้อม', 'checkShopSetup')
      .addToUi();
  } catch (e) {}
}

function ask_(title, msg) { const ui = SpreadsheetApp.getUi(); return ui.prompt(title, msg, ui.ButtonSet.OK_CANCEL); }
function say_(t, m) { try { SpreadsheetApp.getUi().alert(t, m, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(t + '\n' + m); } }

function prepareTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getName().indexOf('TEMPLATE') < 0) return say_('ยกเลิก', 'ชื่อไฟล์ต้องมีคำว่า TEMPLATE (กันกดผิดในชีตร้านจริง)\nเปลี่ยนชื่อไฟล์เป็น เช่น "MIRA POS TEMPLATE" แล้วลองใหม่');
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) return say_('ยกเลิก', 'ใน Code.gs ต้องตั้ง SPREADSHEET_ID = "" ก่อน (ไม่งั้นจะล้างชีตผิดไฟล์)');
  const r = ask_('ยืนยันล้างข้อมูล', 'จะล้างข้อมูลร้านเดิมในไฟล์นี้ทั้งหมด (สำรองไฟล์ให้อัตโนมัติก่อน)\nพิมพ์คำว่า CLEAR เพื่อยืนยัน');
  if (r.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK || r.getResponseText().trim() !== 'CLEAR') return;

  DriveApp.getFileById(ss.getId()).makeCopy('BACKUP ก่อนเตรียมต้นแบบ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HHmm'));
  const log = [], list = TEMPLATE_CLEAR_.concat(TEMPLATE_CLEAR_CATALOG_ ? TEMPLATE_CATALOG_ : []);
  list.forEach(n => {
    const sh = ss.getSheetByName(n); if (!sh) return log.push('ข้าม (ไม่มีชีต): ' + n);
    const last = sh.getLastRow();
    if (last > 1) { sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), 1)).clearContent(); }
    log.push('ล้างแล้ว: ' + n + ' (' + Math.max(last - 1, 0) + ' แถว)');
  });
  // Settings: รีเซ็ตเฉพาะคีย์ที่ระบุ คีย์อื่นคงไว้
  const st = ss.getSheetByName('Settings');
  if (st) {
    const d = st.getDataRange().getValues();
    for (let i = 0; i < d.length; i++) { const k = String(d[i][0]).trim(); if (k in TEMPLATE_SETTINGS_RESET_) st.getRange(i + 1, 2).setValue(TEMPLATE_SETTINGS_RESET_[k]); }
    log.push('รีเซ็ต Settings (โทเคน LINE, บัญชีธนาคาร, ข้อมูลภาษี, PIN=1234)');
  }
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  log.push('ลบตัวตั้งเวลาเดิมแล้ว');
  say_('เสร็จแล้ว', log.join('\n') + '\n\nถัดไป: ตรวจชีตสินค้า/บริการ (Stock, Services) ให้เป็นค่ามาตรฐานที่ต้องการ แล้วใช้ไฟล์นี้เป็นต้นแบบ (ลิงก์ /copy)');
}

function setupNewShop() {
  const r = ask_('ตั้งค่าร้านใหม่', 'รหัสร้าน (อังกฤษพิมพ์เล็ก/ตัวเลข เช่น shopb) — ต้องตรงกับใน docs/config.js');
  if (r.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK) return;
  const code = r.getResponseText().trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,30}$/.test(code)) return say_('รหัสไม่ถูกต้อง', 'ใช้ a-z 0-9 _ - ความยาว 2–30 ตัว');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SHOP_CODE', code);
  const rn = ask_('ชื่อร้าน', 'ชื่อร้านที่จะแสดงในระบบ (เว้นว่างเพื่อใช้ค่าเดิม)');
  if (rn.getSelectedButton() === SpreadsheetApp.getUi().Button.OK && rn.getResponseText().trim()) saveShopSettings({ shopName: rn.getResponseText().trim() });
  getShopSettings();                                   // สร้างชีต Settings ถ้ายังไม่มี
  findAllowedUser_('init@init');                       // สร้างชีต Users + ใส่อีเมลบัญชีนี้เป็นเจ้าของ
  setupAutoTriggers();                                 // ปิดยอดอัตโนมัติ
  say_('ตั้งค่าแล้ว', 'รหัสร้าน: ' + code + '\nสร้างชีต/ตัวตั้งเวลาเรียบร้อย\n\nขั้นต่อไป: Deploy เป็น Web app แล้วรัน “ตรวจความพร้อม”');
}

function checkShopSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), props = PropertiesService.getScriptProperties(), out = [];
  const ok = (c, t) => out.push((c ? '✅ ' : '❌ ') + t);
  ok(!!(props.getProperty('GOOGLE_CLIENT_ID') || SELLER_CONFIG.GOOGLE_CLIENT_ID), 'GOOGLE_CLIENT_ID');
  ok(!!(props.getProperty('FRONTEND_URL') || SELLER_CONFIG.FRONTEND_URL), 'FRONTEND_URL');
  ok(!!props.getProperty('SHOP_CODE'), 'รหัสร้าน SHOP_CODE (เมนู 2)');
  ok(!SPREADSHEET_ID, 'SPREADSHEET_ID ว่าง (ใช้ชีตที่ผูก)');
  const url = ScriptApp.getService().getUrl();
  ok(!!url && /\/exec$/.test(url), 'Deploy เป็น Web app แล้ว: ' + (url || '-'));
  REQUIRED_SHEETS_.forEach(n => ok(!!ss.getSheetByName(n), 'ชีต ' + n));
  let s = {}; try { s = JSON.parse(getShopSettings()); } catch (e) {}
  ok(s.shopName && s.shopName !== 'ชื่อร้านของคุณ' && s.shopName !== 'Kori Hair salon POS', 'ตั้งชื่อร้านแล้ว');
  ok(String(s.adminPin) !== '1234', 'เปลี่ยน PIN แอดมินจาก 1234 แล้ว');
  const staff = ss.getSheetByName('Staff'); ok(!!staff && staff.getLastRow() > 1, 'มีพนักงานในชีต Staff');
  const users = ss.getSheetByName('Users'); ok(!!users && users.getLastRow() > 1, 'มีอีเมลในชีต Users');
  ok(ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'autoCloseDaily'), 'ตัวตั้งเวลาปิดยอดรายวัน');
  ok(!!(s.lineToken), 'ตั้ง LINE token (ถ้าร้านใช้ LINE)');
  say_('ผลตรวจ', out.join('\n') + '\n\nเหลือ: เพิ่มรหัสร้าน+ลิงก์ /exec ใน docs/config.js และแถวร้านใน Hub');
}
