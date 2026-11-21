const SPREADSHEET_ID = ""; // ว่าง = ใช้ชีตที่สคริปต์นี้ผูกอยู่ (ห้ามใส่ ID ร้านใดร้านหนึ่ง เพราะไฟล์นี้ถูกส่งไปทุกร้าน)

function getActiveSS() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  // 🚨 [ด่านตรวจจับสถานะ และ วันหมดอายุ]
  try {
    const HUB_ID = "17U9kjctQJT1z2m1srdcvtqJGPDMSbya9B7WfLkaxB5k"; 
    const hubSheet = SpreadsheetApp.openById(HUB_ID).getSheetByName("Shops");
    const myUrl = ScriptApp.getService().getUrl(); 
    
    if (hubSheet) {
      const data = hubSheet.getDataRange().getValues(); 
      for (let i = 1; i < data.length; i++) {
        let rowUrl = String(data[i][2]).trim();
        
        if (rowUrl !== "" && myUrl === rowUrl) {
          let status = String(data[i][4]).trim();
          let expireDate = data[i][7];

          // ❌ 1. เช็กว่าโดนระงับ
          if (status === "ระงับ") {
            return HtmlService.createHtmlOutput("<div style='text-align:center; padding:50px; font-family:Prompt, sans-serif; color:#333;'><h2>❌ ระบบถูกระงับการใช้งาน</h2><p>กรุณาติดต่อผู้ให้บริการเพื่อตรวจสอบสถานะ</p></div>")
              .setTitle("ระงับการใช้งาน")
              .addMetaTag('viewport', 'width=device-width, initial-scale=1');
          }

          // ⏳ 2. เช็กวันหมดอายุ
          if (expireDate && expireDate !== "ตลอดชีพ" && expireDate !== "") {
            let today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            let exp = new Date(expireDate);
            exp.setHours(0, 0, 0, 0); 

            if (today > exp) {
               // แปลงวันที่เป็นภาษาไทยสวยๆ
               let thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
               let expYear = exp.getFullYear() > 2500 ? exp.getFullYear() : exp.getFullYear() + 543;
               let displayDate = exp.getDate() + " " + thaiMonths[exp.getMonth()] + " " + expYear;
               
               return HtmlService.createHtmlOutput("<div style='text-align:center; padding:50px; font-family:Prompt, sans-serif; color:#DC2626;'><h2>⚠️ แพ็กเกจหมดอายุแล้ว</h2><p>ระบบของร้านคุณหมดอายุเมื่อวันที่ <b>" + displayDate + "</b></p><p>กรุณาติดต่อแอดมินเพื่อต่ออายุการใช้งานครับ</p></div>")
                .setTitle("หมดอายุการใช้งาน")
                .addMetaTag('viewport', 'width=device-width, initial-scale=1');
            }
          }
          break; // ตรวจผ่านทุกด่าน
        }
      }
    }
  } catch (err) {
    // ดัก Error เผื่อเน็ตหลุด
  }
  // 🚨 [จบด่านตรวจจับ]

  // โค้ดโหลดหน้าจอปกติ --------------------
  let page = (e && e.parameter && e.parameter.page) ? e.parameter.page : "";
  
  if (page === 'booking') {
    return HtmlService.createHtmlOutputFromFile('Booking')
      .setTitle("เช็คคิว-จองคิว")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (page === 'mobile_stock') {
    return HtmlService.createHtmlOutputFromFile('MobileStock')
      .setTitle("Mobile Scanner - Kori Hair salon POS")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return frontendRedirect_(e); // หน้า POS ย้ายไป GitHub Pages แล้ว
}

function getScriptUrl() { return ScriptApp.getService().getUrl(); }

// 🌟 1. ฟังก์ชันดึงข้อมูลการตั้งค่าร้าน (อัปเดตระบบ 3 บอท)
function getShopSettings() {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("Settings");
    
    let defaults = { 
        shopName: "Kori Hair salon POS", phone: "080-0000000", taxAddress: "ที่อยู่ร้านสำหรับออกใบกำกับภาษี", taxId: "0123456789012", 
        qrLink: "", pointRate: 100, adminPin: "1234", lineToken: "", lineAdminId: "", themeColor: "DEFAULT", withdrawLimit: 30,
        depositAmount: 500, promptPayId: "", bankName: "", accountNumber: "", accountName: "", 
        lineReportGroupId: "", lastSeenUpdate: "", lineTokenAdmin: "", lineTokenExec: "", lineExecGroupId: ""
    };

    if (!sheet) {
      sheet = ss.insertSheet("Settings");
      let row = 1;
      for (let key in defaults) {
        sheet.getRange(row, 1).setValue(key);
        sheet.getRange(row, 2).setValue(defaults[key]);
        row++;
      }
      return JSON.stringify(defaults);
    }

    const data = sheet.getDataRange().getValues();
    let settings = {};
    for (let i = 0; i < data.length; i++) {
      let key = String(data[i][0]).trim(); 
      let val = data[i][1];
      if (key) settings[key] = val;
    }
    let result = Object.assign(defaults, settings);
    return JSON.stringify(result);
  } catch (e) { return JSON.stringify({}); }
}

function saveShopSettings(newSettings) {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("Settings");
    if (!sheet) sheet = ss.insertSheet("Settings");

    const data = sheet.getDataRange().getValues();
    let keyRowMap = {};
    
    for (let i = 0; i < data.length; i++) {
      let key = String(data[i][0]).trim();
      if (key !== "") keyRowMap[key] = i + 1; 
    }

    const allowedKeys = [
      "shopName", "phone", "taxId", "taxAddress", "bankName", "accountName", "accountNumber", 
      "promptPayId", "qrLink", "logoUrl", "adminPin", "depositAmount", "pointRate", "withdrawLimit", 
      "themeColor", "lineToken", "lineReportGroupId", "lineAdminId", "lastSeenUpdate",
      "lineTokenAdmin", "lineTokenExec", "lineExecGroupId" // 🌟 อนุญาตให้เซฟคีย์ใหม่
    ];

    for (let i = 0; i < allowedKeys.length; i++) {
      let key = allowedKeys[i];
      if (newSettings[key] !== undefined) {
         let finalVal = newSettings[key];
         if (key === 'phone' || key === 'promptPayId' || key === 'accountNumber' || key === 'taxId') {
            finalVal = "'" + finalVal;
         }
         if (keyRowMap[key]) {
            sheet.getRange(keyRowMap[key], 2).setValue(finalVal);
         } else {
            sheet.appendRow([key, finalVal]);
         }
      }
    }
    return "success";
  } catch (e) { return "error: " + e.message; }
}

// 🌟 ฟังก์ชันใหม่: ดึงเป้าหมายยอดขายตามรายเดือนจากชีต MonthlyTargets
function getTargetForMonth(monthYearStr) {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("MonthlyTargets");
    
    // ถ้ายังไม่มีชีต ให้สร้างขึ้นมาใหม่พร้อมใส่โครงสร้าง
    if (!sheet) {
      sheet = ss.insertSheet("MonthlyTargets");
      sheet.appendRow(["รอบเดือน (MM/YYYY)", "เป้ายอดขายรวม (บาท)"]);
      let currentM = Utilities.formatDate(new Date(), "Asia/Bangkok", "MM/yyyy");
      sheet.appendRow(["'" + currentM, 150000]); // ใส่ตัวอย่างไว้ให้ 1 เดือน
      return monthYearStr === currentM ? 150000 : 0;
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let m = String(data[i][0]).trim();
      if (m === monthYearStr) {
        return parseFloat(data[i][1]) || 0; // คืนค่ายอดของเดือนนั้น
      }
    }
    return 0; // ถ้าหาเดือนนั้นไม่เจอ ให้เป้าเป็น 0
  } catch(e) { return 0; }
}

// ==========================================
// 1. ฟังก์ชันจองคิวแรกเริ่ม (ล็อกเป้ายิงเข้ากลุ่ม B18 เท่านั้น)
// ==========================================
function saveBooking(data) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Bookings");
    if (!sheet) return { status: "error", msg: "no_sheet" }; 

    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      let bDate = existingData[i][2]; 
      let bTime = String(existingData[i][3]).substring(0, 5); 
      let bStylist = existingData[i][7]; 
      let bStatus = existingData[i][8]; 

      if (bStatus !== "ยกเลิก" && bDate === data.date && bTime === data.time) {
        if (data.stylist !== "ไม่ระบุ" && data.stylist !== "-" && bStylist === data.stylist) {
          return { status: "duplicate", msg: "ช่างที่คุณเลือกมีคิวในเวลานี้แล้วครับ กรุณาเลือกเวลาอื่น" };
        }
      }
    }

    let slipUrl = "";
    if (data.slipBase64) {
      try {
        let folderId = "1ibZxx6KWkCyj2kvfliQuD8s7HWyy1F2H"; 
        let folder = DriveApp.getFolderById(folderId);
        let blob = Utilities.newBlob(Utilities.base64Decode(data.slipBase64), data.slipMimeType, "Slip_" + data.phone + "_" + new Date().getTime() + ".png");
        let file = folder.createFile(blob);
        slipUrl = file.getUrl();
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      } catch(e) {
        return { status: "error", msg: "ไม่สามารถบันทึกสลิปได้: " + e.message };
      }
    }

    const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    const id = "BK" + new Date().getTime().toString().slice(-5);
    const settings = JSON.parse(getShopSettings());
    let shopDeposit = parseFloat(settings.depositAmount) || 0;
    let actualDeposit = data.requireDeposit ? shopDeposit : 0;

    sheet.appendRow([ts, id, data.date, data.time, "'" + data.phone, data.name, data.service, data.stylist, "รอรับบริการ", slipUrl, actualDeposit]);
    
    try {
      const memSheet = ss.getSheetByName("Members");
      if (memSheet) {
        const mData = memSheet.getDataRange().getDisplayValues();
        let isMember = false;
        let cleanPhone = String(data.phone).replace(/\D/g, '').replace(/^0/, '');
        for (let i = 1; i < mData.length; i++) {
          if (String(mData[i][0]).replace(/\D/g, '').replace(/^0/, '') === cleanPhone) {
            isMember = true; break;
          }
        }
        if (!isMember && data.phone !== "ลูกค้าทั่วไป") {
          memSheet.appendRow(["'" + data.phone, data.name, "-", "ผมธรรมชาติ", 0, "", "-", "-"]);
        }
      }
    } catch(e) {}

    let calSyncStatus = "success";
    try {
      const calId = settings.calendarId;
      const cal = CalendarApp.getCalendarById(calId);
      if (cal) {
        let dateParts = data.date.split("-"); 
        let timeParts = data.time.split(":");
        let startTime = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2], timeParts[0], timeParts[1]);
        let endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); 
        let title = "จองคิว: คุณ " + data.name + " [" + data.stylist + "]";
        let details = "เบอร์โทร: " + data.phone + "\nบริการ: " + data.service + "\nช่าง: " + data.stylist + (slipUrl !== "" ? "\n\nสลิปมัดจำ: " + slipUrl : "");
        cal.createEvent(title, startTime, endTime, { description: details });
      }
    } catch (e) {}

    try {
      let webAppUrl = ScriptApp.getService().getUrl();
      let dParts = data.date.split("-");
      let lineThaiDate = dParts[2] + "/" + dParts[1] + "/" + (parseInt(dParts[0]) + 543);
      
      let bodyContents = [
        { "type": "text", "text": "• ลูกค้า: " + data.name, "size": "sm", "weight": "bold", "color": "#1E293B" },
        { "type": "text", "text": "• เบอร์โทร: " + data.phone, "size": "sm", "color": "#475569" },
        { "type": "text", "text": "• วันนัดหมาย: " + lineThaiDate, "size": "sm", "color": "#475569", "weight": "bold" },
        { "type": "text", "text": "• เวลาจอง: " + data.time + " น.", "size": "sm", "color": "#475569" },
        { "type": "text", "text": "• บริการ: " + data.service, "size": "sm", "color": "#475569", "wrap": true },
        { "type": "text", "text": "• ช่างที่เลือก: " + data.stylist, "size": "sm", "color": "#475569" }
      ];

      if (actualDeposit > 0) {
          bodyContents.push({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
              { "type": "text", "text": "ยอดมัดจำ", "color": "#aaaaaa", "size": "sm", "flex": 1 },
              { "type": "text", "text": actualDeposit.toLocaleString() + " ฿ (โอนแล้ว)", "wrap": true, "color": "#28a745", "size": "sm", "flex": 3, "weight": "bold" }
            ]
          });
      }

      // 🔴 แจ้งเตือนแอดมิน (Bot 2) -> 🌟 ล็อกเป้าไปที่กลุ่มจองคิว (B18) อย่างเดียว!
      const tokenAdmin = settings.lineTokenAdmin || settings.lineToken || "";
      const groupIdAdmin = settings.lineAdminId || ""; 
      
      if (tokenAdmin && groupIdAdmin) {
        let adminFlex = {
          "type": "bubble",
          "header": { "type": "box", "layout": "vertical", "backgroundColor": "#E0F2F1", "contents": [{ "type": "text", "text": "💇‍♂️ ลูกค้าจองคิวใหม่มาแล้ว!", "weight": "bold", "color": "#00796B", "size": "md" }] },
          "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": bodyContents },
          "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [] }
        };
        if (slipUrl !== "") {
            adminFlex.footer.contents.push({ "type": "button", "style": "primary", "color": "#F59E0B", "height": "sm", "action": { "type": "uri", "label": "🔍 ตรวจสอบสลิปโอนเงิน", "uri": slipUrl } });
        }
        adminFlex.footer.contents.push({ "type": "button", "style": "secondary", "color": "#E2E8F0", "height": "sm", "action": { "type": "uri", "label": "📅 เปิดดูปฏิทินร้าน", "uri": webAppUrl + "?page=calendar" } });

        UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
          "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + tokenAdmin },
          "payload": JSON.stringify({ "to": groupIdAdmin, "messages": [{ "type": "flex", "altText": "📢 ลูกค้าจองคิวใหม่มาแล้ว!", "contents": adminFlex }] }), "muteHttpExceptions": true
        });
      }

      // 🟢 6.2 แจ้งเตือนลูกค้า (Bot 1)
      const tokenShop = settings.lineToken || "";
      if (tokenShop) {
         let userLineId = getLineIdByPhone(data.phone); 
         if (userLineId && userLineId.startsWith("U")) {
             let cusFlex = {
                "type": "bubble",
                "size": "kilo",
                "header": {
                  "type": "box", "layout": "vertical", "backgroundColor": "#F59E0B", "paddingAll": "20px", "alignItems": "center",
                  "contents": [
                    { "type": "text", "text": "⏳ ได้รับคำสั่งจองคิวแล้ว", "color": "#ffffff", "weight": "bold", "size": "md", "margin": "none" },
                    { "type": "text", "text": "BOOKING RECEIVED", "color": "#FEF3C7", "size": "xxs", "margin": "sm", "weight": "bold", "style": "italic" } 
                  ]
                },
                "body": {
                  "type": "box", "layout": "vertical", "paddingAll": "20px",
                  "contents": [
                    { "type": "text", "text": "เรียนคุณ " + data.name + ",", "weight": "bold", "size": "md", "color": "#1E293B" },
                    { "type": "text", "text": "ทางร้านได้รับคำสั่งจองคิวเรียบร้อยแล้วค่ะ กรุณารอแอดมินยืนยันสถานะอีกครั้งนะคะ", "size": "xs", "color": "#64748B", "wrap": true, "margin": "sm" },
                    {
                      "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg", "backgroundColor": "#F8FAFC", "paddingAll": "16px", "cornerRadius": "12px", "borderColor": "#E2E8F0", "borderWidth": "1px",
                      "contents": [
                        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "📅 วันที่:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": lineThaiDate, "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "⏰ เวลา:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": data.time + " น.", "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "💇‍♀️ บริการ:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": data.service, "size": "sm", "color": "#0284C7", "weight": "bold", "align": "end", "flex": 6, "wrap": true }] },
                        { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "✂️ ช่าง:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": data.stylist, "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] }
                      ]
                    }
                  ]
                }
            };

            if (actualDeposit > 0) {
                cusFlex.body.contents[2].contents.push({
                   "type": "box", "layout": "horizontal", "margin": "md", "contents": [
                       { "type": "text", "text": "💰 มัดจำ:", "size": "xs", "color": "#64748B", "flex": 4 }, 
                       { "type": "text", "text": actualDeposit.toLocaleString() + " ฿", "size": "sm", "color": "#059669", "weight": "bold", "align": "end", "flex": 6 }
                   ]
                });
            }

            if (settings.phone && settings.phone !== "-") {
                cusFlex.footer = {
                    "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "15px",
                    "contents": [{
                        "type": "button", "style": "secondary", "color": "#F1F5F9", "height": "sm",
                        "action": { "type": "uri", "label": "📞 โทรติดต่อร้าน", "uri": "tel:" + settings.phone }
                    }]
                };
            }

            UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
              "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + tokenShop },
              "payload": JSON.stringify({ "to": userLineId, "messages": [{ "type": "flex", "altText": "⏳ ได้รับคำสั่งจองคิวแล้ว", "contents": cusFlex }] }), "muteHttpExceptions": true
            });
         }
      }
    } catch(e) { console.log("LINE Send Error: " + e.message); }
    
    return { status: "success", id: id, calendar: calSyncStatus };
  } catch (e) { 
    return { status: "error", msg: e.message }; 
  }
}

// 2. ฟังก์ชันอัปเดตสถานะคิว (อัปเกรดปุ่มรีวิวแบบแพ็คคู่ Google & Facebook)
function updateBookingDetailsExtended(rowStr, status, date, time, stylist) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Bookings");
    if (!sheet) return "Error: ไม่พบหน้าชีต Bookings";

    let rowNum = parseInt(rowStr); 
    if (isNaN(rowNum) || rowNum <= 0) return "Error: หมายเลขบรรทัดไม่ถูกต้อง (" + rowStr + ")";

    let rowData = sheet.getRange(rowNum, 1, 1, 10).getDisplayValues()[0]; 
    let oldStatus = String(rowData[8]).trim();
    let phoneRaw = String(rowData[4] || "").replace(/[^0-9]/g, '').replace(/^0/, '');
    let name = String(rowData[5] || "-");
    let service = String(rowData[6] || "-");
    
    // อัปเดตข้อมูลในตาราง
    sheet.getRange(rowNum, 3).setValue(date);
    sheet.getRange(rowNum, 4).setValue(time);
    sheet.getRange(rowNum, 8).setValue(stylist);
    sheet.getRange(rowNum, 9).setValue(status);

    SpreadsheetApp.flush();

    // 🟢 Bot 1 (หน้าร้าน): ยิงตอบกลับลูกค้าถ้าสถานะเปลี่ยน
    if (status !== oldStatus) {
        let settings = {};
        try { settings = JSON.parse(getShopSettings()); } catch(e){}
        let bot1Token = settings.lineToken || ""; 
        let shopPhone = settings.phone || "";
        
        // 🌟 ใส่ลิงก์รีวิว Google Maps และ Facebook ของร้านคุณลูกค้าที่นี่ 🌟
        let reviewLink = "https://www.google.com/maps"; // ลิงก์ดาวสีทอง (Google Maps)
        let facebookLink = "https://www.facebook.com/"; // ลิงก์เพจร้าน (Facebook)

        if (bot1Token) {
            let userId = getLineIdByPhone(phoneRaw);
            
            if (userId && userId.startsWith("U")) {
                let headerColor = "#64748B"; 
                let headerText = "อัปเดตสถานะคิว";
                let subHeaderText = "STATUS UPDATED";
                let bodyText = "อัปเดตสถานะคิวล่าสุดของคุณค่ะ";

                if (status === "ยืนยันแล้ว") {
                    headerColor = "#10B981"; 
                    headerText = "✅ ยืนยันคิวจองสำเร็จ";
                    subHeaderText = "BOOKING CONFIRMED";
                    bodyText = "ทางร้านได้ล็อกคิวของคุณเรียบร้อยแล้วค่ะ ขอบคุณที่ไว้วางใจใช้บริการนะคะ";
                } else if (status === "เสร็จสิ้น") {
                    headerColor = "#0284C7"; 
                    headerText = "🎉 ให้บริการเสร็จสิ้น";
                    subHeaderText = "SERVICE COMPLETED";
                    bodyText = "ทางร้านให้บริการเสร็จสิ้นเรียบร้อยแล้ว ขอบคุณที่ให้เราดูแลเส้นผมของคุณนะคะ หวังว่าคุณจะประทับใจและกลับมาใช้บริการอีกค่ะ 💖\n\n⭐ หากคุณลูกค้าชื่นชอบผลงาน รบกวนสละเวลาสักนิด ช่วยกดให้คะแนนรีวิวร้าน เพื่อเป็นกำลังใจให้ทีมช่างของเราด้วยนะคะ 🙏";
                } else if (status === "ยกเลิก") {
                    headerColor = "#EF4444"; 
                    headerText = "❌ คิวจองถูกยกเลิก";
                    subHeaderText = "BOOKING CANCELLED";
                    bodyText = "ทางร้านได้ยกเลิกคิวของคุณเรียบร้อยแล้วค่ะ หากมีข้อสงสัยสามารถติดต่อสอบถามร้านได้เลยนะคะ";
                } else if (status === "รอรับบริการ") {
                    headerColor = "#F59E0B"; 
                    headerText = "⏳ รอการยืนยัน";
                    subHeaderText = "PENDING CONFIRMATION";
                    bodyText = "มีการเปลี่ยนแปลงข้อมูลคิว กรุณารอแอดมินยืนยันอีกครั้งนะคะ";
                }

                let flexMsg = {
                  "type": "bubble",
                  "size": "kilo",
                  "header": {
                    "type": "box", "layout": "vertical", "paddingAll": "0px",
                    "contents": [{
                        "type": "box", "layout": "vertical", "backgroundColor": headerColor, "paddingAll": "20px", "alignItems": "center",
                        "contents": [
                          { "type": "text", "text": headerText, "color": "#ffffff", "weight": "bold", "size": "lg", "margin": "none" },
                          { "type": "text", "text": subHeaderText, "color": "#E2E8F0", "size": "xxs", "margin": "sm", "weight": "bold", "style": "italic" }
                        ]
                    }]
                  },
                  "body": {
                    "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px",
                    "contents": [
                      { "type": "text", "text": "เรียนคุณ " + name + ",", "weight": "bold", "size": "md", "color": "#1E293B" },
                      { "type": "text", "text": bodyText, "size": "sm", "color": "#475569", "wrap": true, "margin": "sm" },
                      {
                        "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "backgroundColor": "#F8FAFC", "paddingAll": "16px", "cornerRadius": "12px", "borderColor": "#E2E8F0", "borderWidth": "1px",
                        "contents": [
                          { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "📅 วันที่:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(date), "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "⏰ เวลา:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(time) + " น.", "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "💇‍♀️ บริการ:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(service), "size": "sm", "color": "#0284C7", "weight": "bold", "align": "end", "flex": 6, "wrap": true }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "✂️ ช่าง:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(stylist), "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] }
                        ]
                      }
                    ]
                  }
                };

                flexMsg.footer = {
                    "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "15px",
                    "contents": []
                };

                // 🌟 หากสถานะเป็น "เสร็จสิ้น" โชว์ปุ่มรีวิว 2 ปุ่มแทนปุ่มโทร
                if (status === "เสร็จสิ้น") {
                    if (reviewLink !== "https://g.page/r/CQv05D7ka1ntEBM/review") {
                        flexMsg.footer.contents.push({
                            "type": "button", "style": "primary", "color": "#F59E0B", "height": "md",
                            "action": { "type": "uri", "label": "⭐⭐⭐⭐⭐ ให้คะแนนร้าน", "uri": reviewLink }
                        });
                    }
                    if (facebookLink !== "") {
                        flexMsg.footer.contents.push({
                            "type": "button", "style": "primary", "color": "#1877F2", "height": "md",
                            "margin": "sm",
                            "action": { "type": "uri", "label": "👍 รีวิวบน Facebook", "uri": facebookLink }
                        });
                    }
                } else {
                    // สถานะอื่นโชว์ปุ่มโทรติดต่อร้านปกติ
                    if (shopPhone && shopPhone !== "-") {
                        flexMsg.footer.contents.push({
                            "type": "button", "style": "secondary", "color": "#F1F5F9", "height": "sm",
                            "action": { "type": "uri", "label": "📞 โทรติดต่อร้าน", "uri": "tel:" + shopPhone }
                        });
                    }
                }
                
                let payload = { "to": userId, "messages": [{ "type": "flex", "altText": headerText, "contents": flexMsg }] };
                let options = { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + bot1Token }, "payload": JSON.stringify(payload), "muteHttpExceptions": true };
                UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
            }
        }
    }
    return "success";
  } catch (e) { 
    return "Error (System): " + e.message; 
  }
}

function manageCashDrawer(data) {
  try {
    const s = getActiveSS().getSheetByName("CashDrawer");
    if (!s) return "no_sheet";
    const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    
    // 🟢 เพิ่ม "'" หน้า data.date เพื่อบังคับให้เป็นข้อความ
    s.appendRow(["'" + ts, "'" + data.date, data.type, data.amount, data.note]); 
    return "success";
  } catch (e) { return "error"; }
}

// ฟังก์ชันคิดเงิน (อัปเกรดเรียงคิวส่งใบเสร็จ -> ตามด้วยการ์ดรีวิว)
function checkout(o) {
  const ss = getActiveSS();
  const orderSheet = ss.getSheetByName("Orders");
  const stockSheet = ss.getSheetByName("Stock");
  const courseSheet = ss.getSheetByName("Courses");
  const expenseSheet = ss.getSheetByName("Expenses");
  const memSheet = ss.getSheetByName("Members");
  const mcSheet = ss.getSheetByName("MemberCoupons"); 
  const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
  const id = "INV" + new Date().getTime().toString().slice(-6);

  let summary = o.itemsSummary;
  if (o.discount && o.discount !== "0 ฿" && o.discountValue > 0) summary += " (หักส่วนลด " + o.discount + ")";
  if (o.remark && o.remark.trim() !== "") summary += `\n[หมายเหตุ: ${o.remark}]`;

  orderSheet.appendRow([id, "'" + ts, o.phone, summary, o.netTotal, o.paymentMethod, o.stylist, o.assistant, o.cartJSON, o.discountValue, "ปกติ", o.vatType, o.vatAmount, JSON.stringify(o.taxInfo || {}), o.signature || ""]);

  let hasCourse = false; let fCommSty = 0; let fCommAst = 0; let cNames = [];
  let cartArr = []; try { cartArr = typeof o.cart === 'string' ? JSON.parse(o.cartJSON) : o.cart; } catch (e) { cartArr = o.cart || []; }

  // 🌟 ตัวแปรเก็บคิวที่ถูกคิดเงิน เพื่อนำไปเปลี่ยนสถานะตอนท้ายสุด
  let completedBookings = [];

  cartArr.forEach(item => {
    if (item.type === 'product' && item.row && stockSheet) {
      let r = stockSheet.getRange(item.row, 6); r.setValue((parseFloat(r.getValue()) || 0) - item.qty);
      let itemCostForLog = parseFloat(item.cost) || 0;
             ss.getSheetByName("InventoryLog").appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm"), "'" + item.id, item.name, "ขายออก", item.qty, o.stylist || "-", itemCostForLog * item.qty]);
    } else if (item.type === 'use_course' && item.row && courseSheet) {
      let r = courseSheet.getRange(item.row, 4); let c = parseFloat(r.getValue()) || 0; if (c > 0) r.setValue(c - 1);
    } else if (item.type === 'use_credit_course' && item.row && courseSheet) {
      let r = courseSheet.getRange(item.row, 4); r.setValue((parseFloat(r.getValue()) || 0) - (parseFloat(item.deductAmount) || 0));
    } else if (item.type === 'buy_course' && courseSheet) {
      hasCourse = true; let clean = item.name.replace("ซื้อคอร์ส: ", "").trim(); cNames.push(clean);
      let p = (o.phone === "ลูกค้าทั่วไป" || !o.phone) ? "ไม่ระบุเบอร์" : "'" + o.phone;
      courseSheet.appendRow([p, clean, item.courseTotal, item.courseTotal, item.courseType, item.unitValue || 0]);
      let fComm = parseFloat(item.flatComm) || 0;
      if (o.stylist && o.stylist !== "-" && o.stylist !== "-- ไม่ระบุ --") fCommSty += fComm;
      if (o.assistant && o.assistant !== "-" && o.assistant !== "-- ไม่มี --") fCommAst += fComm;
    } else if (item.type === 'use_coupon' && item.row && mcSheet) {
      mcSheet.getRange(item.row, 4).setValue("ใช้งานแล้ว");
      mcSheet.getRange(item.row, 5).setValue("'" + ts);
    } else if (item.type === 'use_deposit' && item.row) {
      // 🌟 เก็บเลขบรรทัดของคิวจองไว้เปลี่ยนสถานะตอนจบ
      completedBookings.push(item.row);
    }
  });

  if (hasCourse && expenseSheet) {
    let n = cNames.join(", ");
    if (fCommSty > 0) expenseSheet.appendRow([ts, `[Auto] เบิกค่าคอมขายคอร์สให้ช่าง (${n}) - ชื่อ: ${o.stylist}`, id, fCommSty]);
    if (fCommAst > 0) expenseSheet.appendRow([ts, `[Auto] เบิกค่าคอมขายคอร์สให้ผู้ช่วย (${n}) - ชื่อ: ${o.assistant}`, id, fCommAst]);
  }

  // ระบบตัด/บวกแต้ม
  if (o.phone !== "ลูกค้าทั่วไป" && o.phone && memSheet) {
    let pUsed = parseFloat(o.pointsUsed) || 0;
    let pEarned = parseFloat(o.calculatedPoints) || 0; 

    let mData = memSheet.getDataRange().getDisplayValues();
    let pClean = String(o.phone).replace(/\D/g, '').replace(/^0/, '');
    for (let i = 1; i < mData.length; i++) {
      if (String(mData[i][0]).replace(/\D/g, '').replace(/^0/, '') === pClean) {
        let currentPoints = parseFloat(mData[i][4]) || 0;
        let newPoints = currentPoints + pEarned - pUsed;
        memSheet.getRange(i + 1, 5).setValue(newPoints > 0 ? newPoints : 0);
        break;
      }
    }
  }

  // 🌟 ด่านที่ 1: ยิงใบเสร็จเข้า LINE ก่อน
  try {
    if (o.phone && o.phone !== "ลูกค้าทั่วไป") {
      let userLineId = "";
      if (typeof memSheet !== 'undefined' && memSheet !== null) {
        let mData = memSheet.getDataRange().getDisplayValues();
        let pClean = String(o.phone).replace(/\D/g, '').replace(/^0/, '');
        
        for (let i = 1; i < mData.length; i++) {
          let rowPhone = String(mData[i][0]).replace(/\D/g, '').replace(/^0/, '');
          if (rowPhone === pClean) {
            userLineId = String(mData[i][5] || "").trim();
            break;
          }
        }
      }

      let settings = {};
      try { settings = JSON.parse(getShopSettings()); } catch(e) {}
      const adminId = settings.lineAdminId || "";

      if (userLineId !== "" && userLineId.startsWith("U")) {
        sendLineReceipt(id, userLineId, o, o.netTotal);
      } else {
        if(adminId) sendLineReceipt(id, adminId, "❌ แอดมิน: หา LINE ID ของเบอร์ " + o.phone + " ไม่เจอครับ", o.netTotal);
      }
    }
  } catch (e) {
    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(err) {}
    const adminId = settings.lineAdminId || "";
    if(adminId) sendLineReceipt("ERROR", adminId, "🔥 โค้ดสะดุด: " + e.message, 0);
  }

  // 🌟 ด่านที่ 2: ยิงการ์ดรีวิวตามหลัง (หน่วงเวลา 1.5 วินาทีให้เรียงลำดับสวยงาม)
  if (completedBookings.length > 0) {
    Utilities.sleep(1500); 
    let bookingSheet = ss.getSheetByName("Bookings");
    if (bookingSheet) {
       completedBookings.forEach(r => {
          let bData = bookingSheet.getRange(r, 1, 1, 10).getDisplayValues()[0];
          let bDate = bData[2];
          let bTime = String(bData[3]).substring(0, 5); 
          let bStylist = bData[7];
          
          // สั่งอัปเดตและยิงข้อความดาวสีทองตามไปติดๆ
          updateBookingDetailsExtended(r, "เสร็จสิ้น", bDate, bTime, bStylist);
       });
    }
  }

  return id; 
}

function getPayrollData(m) {
  try {
    m = String(m || "").trim();
    const ss = getActiveSS();
    const staffSheet = ss.getSheetByName("Staff");
    const orderSheet = ss.getSheetByName("Orders");
    const recordSheet = ss.getSheetByName("StaffRecords");

    if (!staffSheet || !orderSheet) return "[]";

    let staffData = []; try { staffData = staffSheet.getDataRange().getDisplayValues(); } catch (e) { }
    let orders = []; try { orders = orderSheet.getDataRange().getValues(); } catch (e) { }
    if (staffData.length < 2) return "[]";

    const headers = staffData[0] || [];
    let payroll = {}; let deductions = {};
    // ดึงค่าการหักต้นทุนมาเตรียมไว้
  const costSettings = getCostSettings();

    function extractMonthYear(dateVal) {
      if (!dateVal) return "";
      if (dateVal instanceof Date) return Utilities.formatDate(dateVal, "Asia/Bangkok", "MM/yyyy");
      let s = String(dateVal).trim();
      if (s === "") return "";

      // Handle "DD/MM/YYYY" or "YYYY-MM-DD" or similar
      let parts = s.split(' ')[0].split(/[\/\-]/);
      if (parts.length >= 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD or YYYY/MM/DD
          return parts[1].padStart(2, '0') + "/" + parts[0];
        } else if (parts[2].length === 4) { // DD/MM/YYYY
          return parts[1].padStart(2, '0') + "/" + parts[2];
        }
      }
      // If it's already MM/YYYY
      if (s.includes('/') && s.length === 7) return s;
      return s;
    }

    let altM = "";
    if (m.includes('/')) {
      let p = m.split('/');
      if (p.length === 2) altM = p[1] + "-" + p[0]; // YYYY-MM fallback
    }

    if (recordSheet) {
      let records = []; try { records = recordSheet.getDataRange().getValues(); } catch (e) { }
      for (let i = 1; i < records.length; i++) {
        if (!records[i]) continue;
        let tsMonthStr = extractMonthYear(records[i][0]);
        let recMonthStr = extractMonthYear(records[i][5]);

        if (recMonthStr === m || recMonthStr === altM || tsMonthStr === m || m === "") {
          let name = String(records[i][1] || "").trim();
          let type = String(records[i][2] || "").trim();
          let amt = parseFloat(String(records[i][3] || "0").replace(/,/g, '')) || 0;
          let detail = String(records[i][4] || "").trim();
          if (name) {
            if (!deductions[name]) deductions[name] = { total: 0, items: [] };
            deductions[name].total += amt;
            deductions[name].items.push({ type: type, amount: amt, detail: detail });
          }
        }
      }
    }

    for (let i = 1; i < staffData.length; i++) {
      if (!staffData[i]) continue;
      let n = String(staffData[i][0] || "").trim();
      if (n && !payroll[n]) {
        payroll[n] = { salary: parseFloat(String(staffData[i][1] || "0").replace(/,/g, '')) || 0, rates: {}, commTotal: 0, courseComm: 0, commDetails: {} };
        for (let col = 1; col < headers.length; col++) {
          let h = String(headers[col] || "").trim();
          if (h) payroll[n].rates[h] = (parseFloat(String(staffData[i][col] || "0").replace(/%/g, '').replace(/,/g, '')) || 0) / 100;
        }
      }
    }

    for (let i = 1; i < orders.length; i++) {
      if (!orders[i]) continue;
      if (String(orders[i][10]) === "ยกเลิก") continue;
      let rowMonthStr = extractMonthYear(orders[i][1]);

      if (rowMonthStr === m || m === "") {
        let stylist = String(orders[i][6] || "").trim();
        let assistant = String(orders[i][7] || "").trim();
        let cartJSON = String(orders[i][8] || "");
        let discountVal = parseFloat(String(orders[i][9] || "0").replace(/,/g, '')) || 0;

        if (cartJSON && cartJSON.length > 5) {
          try {
            let items = JSON.parse(cartJSON);

         let totalCommGross = 0;
        items.forEach(item => { 
            if (item.type !== 'buy_course' && item.type !== 'use_deposit') { 
                let v = item.commValue !== undefined ? parseFloat(item.commValue) : parseFloat(item.price); 
                if (v > 0) totalCommGross += v; 
            } 
        });
        let dRatio = (totalCommGross > 0 && discountVal > 0) ? Math.max(0, (totalCommGross - discountVal) / totalCommGross) : 1;

        items.forEach(item => {
            let p = parseFloat(item.price) || 0;
            let cVal = item.commValue !== undefined ? parseFloat(item.commValue) : p;

            // 🟢 ป้องกันไม่ให้ยอดติดลบของมัดจำ วิ่งไปหักยอดขายสินค้าในรายงานหน้าแดชบอร์ด
            if (item.type === 'use_deposit') {
                return; 
            }

            if (item.type === 'buy_course') {

                let fComm = parseFloat(item.flatComm) || 0;
                if (stylist && payroll[stylist]) payroll[stylist].courseComm += fComm;
                if (assistant && payroll[assistant]) payroll[assistant].courseComm += fComm;
              } else {
                let bVal = item.commValue !== undefined ? parseFloat(item.commValue) : parseFloat(item.price);
                if (bVal > 0) {
                 let effVal = bVal * dRatio;
let cat = String(item.category || 'บริการ').trim();

// 🌟 เพิ่มบรรทัดนี้เพื่อคำนวณยอดที่หักต้นทุนแล้ว
let baseForComm = calculateDeductedBase(effVal, cat, costSettings);

if (stylist && payroll[stylist]) {
  let rate = payroll[stylist].rates[cat] || 0;
  // 🌟 เปลี่ยน effVal เป็น baseForComm เพื่อคิดค่าคอมจากยอดหักต้นทุน
  let earned = baseForComm * rate; payroll[stylist].commTotal += earned;
  if (!payroll[stylist].commDetails[cat]) payroll[stylist].commDetails[cat] = { sales: 0, comm: 0, rateText: +(rate * 100).toFixed(2) + "%" };
  payroll[stylist].commDetails[cat].sales += effVal; payroll[stylist].commDetails[cat].comm += earned;
}
if (assistant && payroll[assistant]) {
  let aRate = payroll[assistant].rates[cat] || 0;
  // 🌟 เปลี่ยน effVal เป็น baseForComm สำหรับผู้ช่วยด้วย
  let aEarned = baseForComm * aRate; payroll[assistant].commTotal += aEarned;
  if (!payroll[assistant].commDetails[cat]) payroll[assistant].commDetails[cat] = { sales: 0, comm: 0, rateText: +(aRate * 100).toFixed(2) + "%" };
  payroll[assistant].commDetails[cat].sales += effVal; payroll[assistant].commDetails[cat].comm += aEarned;
}
                }
              }
            });
          } catch (e) { }
        }
      }
    }

    let res = [];
    for (const [n, stats] of Object.entries(payroll)) {
      let dedTotal = deductions[n] ? deductions[n].total : 0;
      let dedItems = deductions[n] ? deductions[n].items : [];
      let gross = stats.salary + stats.commTotal + stats.courseComm; let net = gross - dedTotal;
      res.push({ name: n, baseSalary: stats.salary, commTotal: stats.commTotal, courseComm: stats.courseComm, commDetails: stats.commDetails, deductionTotal: dedTotal, deductionItems: dedItems, grossIncome: gross, totalIncome: net });
    }
    return JSON.stringify(res);
  } catch (e) { return "[]"; }
}

// ====================================================================
// 🟢 อัปเกรด: บันทึกข้อมูลพนักงาน + ส่งเข้าใบรอจ่าย (Payables) อัตโนมัติ
// ====================================================================
function addStaffRecord(d) {
  try { 
    const ss = getActiveSS();
    const s = ss.getSheetByName("StaffRecords"); 
    if (!s) return "no_sheet"; 
    
    const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"); 
    
    // 1. บันทึกลงประวัติพนักงานตามปกติ (เพื่อไปแสดงในสลิปเงินเดือน)
    s.appendRow(["'" +ts, d.name, d.type, d.amount, d.detail, "'" + d.month]); 
    
    // 2. 🌟 ถ้าเป็นการเบิกเงินล่วงหน้า หรือ จ่ายเงินเดือน ให้ส่งเข้า "ใบรอจ่าย"
    if (d.type === "เบิกเงินล่วงหน้า" || d.type === "จ่ายเงินเดือนคงเหลือ (ลงบัญชีรายจ่าย)") {
      let paySheet = ss.getSheetByName("Payables");
      if (!paySheet) {
        paySheet = ss.insertSheet("Payables");
        paySheet.appendRow(["วันที่สแกน", "ผู้เบิก", "คู่ค้า/บริษัท", "เลขที่บิล", "รอบบิล/วันที่", "ยอดเงิน", "เลขบัญชี", "สถานะ", "อ้างอิงภาพ", "วันครบกำหนด", "ช่องทางชำระ"]);
      }
      
      let staffAccount = "-";
      let defaultChannel = "Mobile Banking";
      
      // ดึงบัญชีจากระบบคู่ค้า (ถ้าคุณเพิ่มชื่อพนักงานไว้ในปุ่ม "จัดการคู่ค้า")
      try {
        const vSheet = ss.getSheetByName("Vendors");
        if (vSheet) {
          const vData = vSheet.getDataRange().getValues();
          for(let i=1; i<vData.length; i++) {
            // เช็คชื่อให้ตรงกัน จะดึงเลขบัญชีอัตโนมัติ
            if(vData[i][0] === d.name) {
              staffAccount = vData[i][2]; // เลขบัญชี
              defaultChannel = vData[i][3]; // ช่องทางจ่าย
              break;
            }
          }
        }
      } catch(e) {}

      let docNo = "PR-" + new Date().getTime().toString().slice(-4);
      let dueDate = ts.split(' ')[0]; // วันครบกำหนดคือวันนี้เลย
      let billDate = d.month || Utilities.formatDate(new Date(), "Asia/Bangkok", "MM/yyyy");
      let note = `[${d.type}] ${d.detail}`;
      
      // บันทึกลงชีต Payables เพื่อรออนุมัติจ่าย
      paySheet.appendRow([ts, "ระบบเงินเดือน", d.name, docNo, billDate, d.amount, staffAccount, "รอจ่าย", "ระบบเงินเดือน/เบิก", dueDate, defaultChannel]);
    }

    return "success"; 
  } catch (e) { 
    return "error"; 
  }
}

function getStock() { 
  try { 
    const ss = getActiveSS(); 
    const s1 = ss.getSheetByName("Stock"); 
    const s2 = ss.getSheetByName("Services"); 
    let c = []; 
    if (s1) { 
      const d1 = s1.getDataRange().getDisplayValues(); 
      const r1 = s1.getDataRange().getValues(); 
      // i=1 ข้ามหัวตาราง
      for (let i = 1; i < d1.length; i++) {
        if (d1[i][0]) {
          c.push({ 
            id: String(d1[i][0]), 
            name: String(d1[i][1]), 
            size: String(d1[i][2]), 
            price: parseFloat(String(r1[i][3]).replace(/,/g, '')) || 0, 
            cost: parseFloat(String(r1[i][4]).replace(/,/g, '')) || 0,  
            qty: parseFloat(String(r1[i][5]).replace(/,/g, '')) || 0,   
            category: String(d1[i][6]), 
            row: i + 1, 
            type: 'product', 
            isService: false 
          }); 
        }
      }
    } 
    if (s2) { 
      const d2 = s2.getDataRange().getDisplayValues(); 
      const r2 = s2.getDataRange().getValues(); 
      for (let i = 1; i < d2.length; i++) {
        if (d2[i][0]) c.push({ id: String(d2[i][0]), name: String(d2[i][1]), price: parseFloat(String(r2[i][2]).replace(/,/g, '')) || 0, qty: 9999, category: String(d2[i][3]), row: i + 1, type: 'service', isService: true }); 
      }
    } 
    return JSON.stringify(c); 
  } catch (e) { 
    return "[]"; 
  } 
}

function getBookingServices() {
  try { 
    const sheet = getActiveSS().getSheetByName("BookingMenu"); 
    if (!sheet) return "[]"; 
    const data = sheet.getDataRange().getDisplayValues(); 
    let res = []; 
    for (let i = 1; i < data.length; i++) { 
      let srvName = String(data[i][0]).trim(); 
      let timeEst = String(data[i][1]).trim(); 
      let requireDeposit = String(data[i][2] || "").trim() === "ใช่"; // 🟢 เช็คคอลัมน์ C ว่าใส่ "ใช่" หรือไม่
      
      if (srvName) { 
        let display = timeEst ? srvName + " (ประมาณ " + timeEst + ")" : srvName; 
        res.push({
          name: srvName,
          display: display,
          requireDeposit: requireDeposit
        }); 
      } 
    } 
    return JSON.stringify(res); 
  } catch (e) { return "[]"; }
}

function getReportData(t, f) {
  try {
    const ss = getActiveSS();
    const orderSheet = ss.getSheetByName("Orders");
    if (!orderSheet) return null;
    const o = orderSheet.getDataRange().getValues();
    const ex = ss.getSheetByName("Expenses") ? ss.getSheetByName("Expenses").getDataRange().getValues() : [];
    const staffRec = ss.getSheetByName("StaffRecords") ? ss.getSheetByName("StaffRecords").getDataRange().getValues() : [];
    const drawerSheet = ss.getSheetByName("CashDrawer");
    const drawers = drawerSheet ? drawerSheet.getDataRange().getValues() : [];
    const invLogSheet = ss.getSheetByName("InventoryLog");
    const invLogs = invLogSheet ? invLogSheet.getDataRange().getValues() : [];
    
    // 🌟 1. ดึงข้อมูลพนักงานเตรียมคิดค่าคอม
    const staffSheet = ss.getSheetByName("Staff");
    let staffRates = {};
    if (staffSheet) {
      let sd = staffSheet.getDataRange().getDisplayValues();
      let headers = sd[0] || [];
      for (let i = 1; i < sd.length; i++) {
        let n = String(sd[i][0]).trim();
        if (n) {
          staffRates[n] = {};
          for (let c = 1; c < headers.length; c++) {
            let h = String(headers[c]).trim();
            if (h) {
              let rawVal = String(sd[i][c] || "0").trim();
              let isFlat = rawVal.includes('฿') || rawVal.toLowerCase().includes('b') || rawVal.includes('บาท');
              let numVal = parseFloat(rawVal.replace(/[^0-9.-]+/g, '')) || 0;
              staffRates[n][h] = { val: isFlat ? numVal : numVal / 100, isFlat: isFlat };
            }
          }
        }
      }
    }
    
    let costSettings = {};
    try { costSettings = getCostSettings(); } catch(e) {}

    let s = { count: 0, netTotal: 0, discountTotal: 0, cash: 0, transfer: 0, credit: 0, coursePayment: 0, stylists: {}, assistants: {}, services: {}, serviceCategories: {}, products: {}, courses: {}, expenseTotal: 0, expensesList: [], minIV: null, maxIV: null, dash: { totalService: 0, totalProduct: 0, totalCourse: 0, usedTimes: 0, usedCredit: 0 }, drawer: { floatIn: 0, floatOut: 0, actualCount: 0, isClosed: false }, 
    staffCommissionTotal: 0, staffCommissions: {}, internalUseCost: 0, canceledCount: 0, bankDepositTotal: 0, billDetails: [] };

    function toFmt(val) {
      if (!val) return "";
      if (val instanceof Date) return Utilities.formatDate(val, "Asia/Bangkok", t === 'daily' ? "dd/MM/yyyy" : "MM/yyyy");
      let str = String(val).trim();
      if (str === "") return "";
      const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      for (let mIdx = 0; mIdx < thaiMonths.length; mIdx++) {
        if (str.includes(thaiMonths[mIdx])) {
          let parts = str.split(/\s+/);
          if (parts.length >= 3) {
            let day = parseInt(parts[0]);
            let month = mIdx + 1;
            let year = parseInt(parts[2]);
            if (year > 2500) year -= 543;
            let mmStr = String(month).padStart(2, '0');
            let ddStr = String(day).padStart(2, '0');
            return t === 'daily' ? `${ddStr}/${mmStr}/${year}` : `${mmStr}/${year}`;
          }
        }
      }
      let datePart = str.split(" ")[0];
      let parts = datePart.split(/[\/\-]/);
      if (parts.length >= 3) {
        let day, month, year;
        if (parts[0].length === 4) { year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2]); }
        else { day = parseInt(parts[0]); month = parseInt(parts[1]); year = parseInt(parts[2]); }
        if (year > 2500) year -= 543;
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          let mmStr = String(month).padStart(2, '0');
          let ddStr = String(day).padStart(2, '0');
          return t === 'daily' ? `${ddStr}/${mmStr}/${year}` : `${mmStr}/${year}`;
        }
      }
      return str;
    }

    // 🟢 เพิ่มตัวแปรสำหรับเก็บรายจ่ายที่หยิบเงินสดจากเก๊ะเท่านั้น
s.drawerCashExpenses = 0;

ex.forEach(e => { 
  if (toFmt(e[0]) === f) { 
    let eAmt = parseFloat(e[3]) || 0; 
    s.expenseTotal += eAmt; // รวมเป็นรายจ่ายร้าน (P&L) ตามปกติ
    s.expensesList.push({ name: e[1], amount: eAmt }); 
  } 
});

    staffRec.forEach(r => { if (toFmt(r[0]) === f) { let eAmt = parseFloat(r[3]) || 0; s.expenseTotal += eAmt; s.expensesList.push({ name: `[เบิก] ${r[1]} - ${r[2]}`, amount: eAmt }); } });

 // 🌟 ดึงข้อมูลลิ้นชัก (แยกเงินทอนตั้งต้น กับ เงินเติมระหว่างวัน)
    let firstFloatInFound = false; // ตัวแปรสำหรับจับ "เงินทอนตั้งต้น" ก้อนแรกของวัน
    let addedFloatInTotal = 0;     // ตัวแปรเก็บ "เงินเติมทอนระหว่างวัน"

    drawers.forEach(dr => {
      let dType = String(dr[2]).trim(); 
      let dAmt = parseFloat(dr[3]) || 0;
      let dNote = String(dr[4] || "").trim(); // 🌟 ดึงหมายเหตุมาเช็คด้วย
      
      // เช็คว่าใช่วันที่เรากำลังดูรายงานอยู่ไหม
      if (toFmt(dr[1]) === f) { 
        
        if (dType === 'นำเงินทอนเข้า') {
            if (!firstFloatInFound) {
                s.drawer.floatIn = dAmt;
                firstFloatInFound = true;
            } else if (dNote.indexOf('เปิดกะประจำวัน') === -1) {
                addedFloatInTotal += dAmt;
            }
        }
        
       if (dType === 'เบิกไปซื้อของ') { 
            s.drawer.floatOut += dAmt; 
            s.drawerCashExpenses = (s.drawerCashExpenses || 0) + dAmt; 
            s.expenseTotal += dAmt; 
            s.expensesList.push({ name: `[ลิ้นชัก] ${dr[4]}`, amount: dAmt }); 
        }
        
        if (dType === 'นำส่งเงินฝากธนาคาร') { 
            s.drawer.floatOut += dAmt; 
            s.bankDepositTotal += dAmt; 
        }

        // 🟢 เพิ่มตัวนี้เข้าไปให้บอทรับรู้ว่า "ปิดกะแล้วนะเว้ย!"
        if (dType === 'บันทึกปิดยอด') {
            s.drawer.isClosed = true;
            s.drawer.actualCount = dAmt;
        }
      }
    });

    // แนบยอดเติมเงินระหว่างวัน ส่งไปหน้าเว็บด้วย
    s.drawer.addedFloatIn = addedFloatInTotal;

    invLogs.forEach(log => {
      if (toFmt(log[0]) === f && String(log[3]).trim() === "เบิกใช้") {
        s.internalUseCost += (parseFloat(log[6]) || 0);
      }
    });

    let firstIV = true;
    for (let i = 1; i < o.length; i++) {
      if (toFmt(o[i][1]) === f) {
        let currentIV = o[i][0]; 
        if (firstIV) { s.minIV = currentIV; firstIV = false; } 
        s.maxIV = currentIV;

        // ถ้าบิลถูกยกเลิก
        if (String(o[i][10]) === "ยกเลิก") {
            s.canceledCount++;
            s.billDetails.push({ id: currentIV, time: o[i][1], total: 0, status: "ยกเลิก", method: "-" });
            continue; 
        }

        s.count++;
        // เก็บรายละเอียดบิลเอาไปปริ้นสลิปยาว
        s.billDetails.push({ 
            id: currentIV, 
            time: o[i][1], 
            total: parseFloat(o[i][4]) || 0, 
            status: "ปกติ", 
            method: String(o[i][5]),
            cart: String(o[i][8] || "[]"),
            discount: parseFloat(o[i][9]) || 0,
            stylist: String(o[i][6] || "-"),
            assistant: String(o[i][7] || "-"),
            phone: String(o[i][2] || "-")
        });

        let netAmt = parseFloat(o[i][4]) || 0;
        s.netTotal += netAmt;
        s.discountTotal += parseFloat(o[i][9]) || 0;

        let pM = String(o[i][5]);
        if (pM.includes("เงินสด")) s.cash += netAmt;
        else if (pM.includes("โอน")) s.transfer += netAmt;
        else if (pM.includes("เครดิต")) s.credit += netAmt;

        let staffPerfValue = 0; let courseUsageValue = 0;
        let stylist = String(o[i][6]).trim(); let assistant = String(o[i][7]).trim();
        let cartJSON = String(o[i][8]); let discountVal = parseFloat(o[i][9]) || 0;

        try {
          let items = JSON.parse(cartJSON);
          
          let totalCommGross = 0;
          let depositDeductForBill = 0; // 🟢 ตัวแปรดักจับมัดจำในบิลนี้
          
          items.forEach(item => { 
              if (item.type === 'use_deposit') {
                  depositDeductForBill += Math.abs(item.price);
              }
              if (item.type !== 'buy_course' && item.type !== 'use_deposit') { 
                  let v = item.commValue !== undefined ? parseFloat(item.commValue) : parseFloat(item.price); 
                  if (v > 0) totalCommGross += v; 
              } 
          });
          
          // 🟢 รวมยอดมัดจำเข้าส่วนกลางของรายงาน
          s.depositDeductionTotal = (s.depositDeductionTotal || 0) + depositDeductForBill;

          let dRatio = (totalCommGross > 0 && discountVal > 0) ? Math.max(0, (totalCommGross - discountVal) / totalCommGross) : 1;

          items.forEach(item => {
            let p = parseFloat(item.price) || 0;
            let cVal = item.commValue !== undefined ? parseFloat(item.commValue) : p;

            // 🟢 ป้องกันไม่ให้ยอดติดลบของมัดจำ วิ่งไปหักยอดขายสินค้าในรายงานหน้าแดชบอร์ด
            if (item.type === 'use_deposit') {
              return;
            }

            if (item.type === 'buy_course') {
              s.dash.totalCourse += p;
              let cName = item.name.replace("ซื้อคอร์ส: ", "");
              s.courses[cName] = (s.courses[cName] || 0) + p;
              staffPerfValue += p;
            } else {
              let bVal = item.commValue !== undefined ? parseFloat(item.commValue) : parseFloat(item.price);
              let qty = parseFloat(item.qty) || 1;
              if (bVal > 0) {
                let effVal = bVal * dRatio;
                let cat = String(item.category || 'บริการทั่วไป').trim();
                let baseForComm = effVal;
                try { baseForComm = calculateDeductedBase(effVal, cat, costSettings); } catch(e){}

                if (stylist && stylist !== "-" && stylist !== "-- ไม่ระบุ --" && staffRates[stylist]) {
                  let rObj = staffRates[stylist][cat] || {val:0, isFlat:false};
                  let earned = rObj.isFlat ? (rObj.val * qty) : (baseForComm * rObj.val);
                  s.staffCommissionTotal += earned;
                  s.staffCommissions[stylist] = (s.staffCommissions[stylist] || 0) + earned;
                }
                if (assistant && assistant !== "-" && assistant !== "-- ไม่มี --" && staffRates[assistant]) {
                  let rObj = staffRates[assistant][cat] || {val:0, isFlat:false};
                  let earned = rObj.isFlat ? (rObj.val * qty) : (baseForComm * rObj.val);
                  s.staffCommissionTotal += earned;
                  s.staffCommissions[assistant] = (s.staffCommissions[assistant] || 0) + earned;
                }
              }

              if (item.type === 'use_course') {
                s.dash.usedTimes++; courseUsageValue += cVal; staffPerfValue += cVal;
                let sName = "[ตัดคอร์ส] " + (item.category || item.name);
                s.services[sName] = (s.services[sName] || 0) + cVal; s.dash.totalService += cVal;
                let cat = String(item.category || 'บริการทั่วไป').trim();
                s.serviceCategories[cat] = (s.serviceCategories[cat] || 0) + cVal;
              }
              else if (item.type === 'use_credit_course') {
                let deduct = parseFloat(item.deductAmount) || 0;
                s.dash.usedCredit += deduct; courseUsageValue += deduct;
              }
              else if (item.isService) {
                s.dash.totalService += p; s.services[item.name] = (s.services[item.name] || 0) + p;
                staffPerfValue += p; let cat = String(item.category || 'บริการทั่วไป').trim();
                s.serviceCategories[cat] = (s.serviceCategories[cat] || 0) + p;
              }
              else {
                let itemCost = parseFloat(item.cost) || 0;
                let itemQty = parseFloat(item.qty) || 1;
                let cat = String(item.category || "").toLowerCase();

                if (cat.includes('เบิก') || cat.includes('หลังร้าน') || cat.includes('ใช้ในร้าน')) {
                  s.internalUseCost = (s.internalUseCost || 0) + (itemCost * itemQty);
                } else {
                  s.dash.totalProduct += p; 
                  s.products[item.name] = (s.products[item.name] || 0) + p;
                  staffPerfValue += cVal;
                  s.dash.totalProductCost = (s.dash.totalProductCost || 0) + (itemCost * itemQty);
                }
              }
            }
          });
        } catch (e) { }

        if (pM.includes("ตัดคอร์ส") || courseUsageValue > 0) { s.coursePayment += courseUsageValue; }

        if (stylist && stylist !== "-" && stylist !== "-- ไม่ระบุ --") s.stylists[stylist] = (s.stylists[stylist] || 0) + staffPerfValue;
        if (assistant && assistant !== "-" && assistant !== "-- ไม่มี --") s.assistants[assistant] = (s.assistants[assistant] || 0) + staffPerfValue;
      }
    } 
    return JSON.stringify(s);
  } catch (e) { return null; }
}

function getStaffList() {
  try {
    const sheet = getActiveSS().getSheetByName("Staff");
    if (!sheet) return "[]";
    const d = sheet.getDataRange().getDisplayValues();
    if (d.length < 2) return "[]";
    const headers = d[0];
    let roleCol = -1, pinCol = -1;
    for (let c = 0; c < headers.length; c++) {
      let h = String(headers[c]).trim().toLowerCase();
      if (h === 'role') roleCol = c;
      if (h === 'pin') pinCol = c;
    }
    let s = [];
    for (let i = 1; i < d.length; i++) {
      let name = String(d[i][0] || "").trim();
      if (name) {
        let role = roleCol >= 0 ? String(d[i][roleCol] || "").trim() : "";
        let pin = pinCol >= 0 ? String(d[i][pinCol] || "").trim() : "";
        if (!role) role = "Staff";
        if (!pin) pin = "0000";
        s.push({ name: name, role: role, pin: pin });
      }
    }
    return JSON.stringify(s);
  } catch (e) { return "[]"; }
}

function setStaffPin(data) {
  try {
    const sheet = getActiveSS().getSheetByName("Staff");
    if (!sheet) return "no_sheet";
    const d = sheet.getDataRange().getDisplayValues();
    const headers = d[0];
    let pinCol = -1;
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c]).trim().toLowerCase() === 'pin') { pinCol = c; break; }
    }
    if (pinCol < 0) {
      pinCol = headers.length;
      sheet.getRange(1, pinCol + 1).setValue('PIN');
    }
    for (let i = 1; i < d.length; i++) {
      if (String(d[i][0]).trim() === String(data.name).trim()) {
        sheet.getRange(i + 1, pinCol + 1).setValue(String(data.newPin));
        return "success";
      }
    }
    return "not_found";
  } catch (e) { return "error"; }
}
function searchCustomer(p) { 
  try { 
    const ss = getActiveSS(); 
    const m = ss.getSheetByName("Members").getDataRange().getDisplayValues(); 
    const c = ss.getSheetByName("Courses").getDataRange().getDisplayValues(); 
    let res = { found: false, member: null, courses: [], coupons: [], bookings: [], stats: null }; 
    let iP = String(p).replace(/\D/g, '').replace(/^0/, ''); 
    
    // หาข้อมูลลูกค้าจากหน้า Members
    for (let i = 1; i < m.length; i++) { 
      if (String(m[i][0]).replace(/\D/g, '').replace(/^0/, '') === iP) { 
        res.found = true; 
        res.member = { 
            name: m[i][1], nickname: m[i][2], condition: m[i][3], 
            points: parseFloat(m[i][4]) || 0, dob: m[i][6] || "-", tags: m[i][7] || ""      
        }; 
        break; 
      } 
    }
    
    if (res.found) { 
      // 1. หาคอร์สที่คงเหลือ
      for (let i = 1; i < c.length; i++) { 
        if (String(c[i][0]).replace(/\D/g, '').replace(/^0/, '') === iP && parseFloat(c[i][3]) > 0) { 
          res.courses.push({ name: c[i][1], total: c[i][2], remain: parseFloat(c[i][3]), type: c[i][4], row: i + 1, unitValue: parseFloat(c[i][5]) || 0 }); 
        } 
      }

      // 2. หาคูปองที่ยังไม่ได้ใช้
      let mcSheet = ss.getSheetByName("MemberCoupons");
      let cpSheet = ss.getSheetByName("Coupons");
      if (mcSheet && cpSheet) {
        let mcData = mcSheet.getDataRange().getDisplayValues();
        let cpData = cpSheet.getDataRange().getDisplayValues();
        let cpMaster = {};
        for(let i=1; i<cpData.length; i++) cpMaster[String(cpData[i][0]).trim()] = { name: String(cpData[i][1]).trim() };
        for(let i=1; i<mcData.length; i++) {
           let rowPhone = String(mcData[i][1]).replace(/\D/g, '').replace(/^0/, '');
           if (rowPhone === iP && String(mcData[i][3]).trim() === "ยังไม่ได้ใช้") {
              res.coupons.push({ id: String(mcData[i][2]).trim(), name: cpMaster[String(mcData[i][2]).trim()] ? cpMaster[String(mcData[i][2]).trim()].name : String(mcData[i][2]).trim(), row: i + 1 });
           }
        }
      }

      // 🌟 3. หาคิวจองที่รอรับบริการ (อ่านยอดมัดจำจริงจากคอลัมน์ K / Index 10)
      let bSheet = ss.getSheetByName("Bookings");
      if (bSheet) {
        let bData = bSheet.getDataRange().getDisplayValues();

        for (let i = 1; i < bData.length; i++) {
            let rowPhone = String(bData[i][4]).replace(/\D/g, '').replace(/^0/, '');
            let status = String(bData[i][8]).trim();
            
            // ถ้าเบอร์ตรงกัน และสถานะคิวเป็น "รอรับบริการ" หรือ "ยืนยันแล้ว" ให้ดึงมาโชว์
            if (rowPhone === iP && (status === "รอรับบริการ" || status === "ยืนยันแล้ว")) {
                // 🟢 อ่านยอดมัดจำจริงจากคอลัมน์ K (Index 10) หากเป็นค่าว่างให้เป็น 0
                let actualDeposit = parseFloat(bData[i][10]) || 0;

                res.bookings.push({
                    row: i + 1, 
                    id: bData[i][1], 
                    date: bData[i][2], 
                    time: String(bData[i][3]).substring(0, 5),
                    service: bData[i][6], 
                    deposit: actualDeposit // 🟢 ส่งยอดมัดจำจริงของคิวนั้นๆ กลับไปหน้าบ้าน
                });
            }
        }
      }
      
      // 4. ดึงประวัติจากบิล (Orders) มาคำนวณความถี่ (โค้ดเดิม)
      const orderSheet = ss.getSheetByName("Orders");
      if (orderSheet) {
        const oData = orderSheet.getDataRange().getDisplayValues();
        let visitDates = [];
        for (let i = 1; i < oData.length; i++) {
          if (String(oData[i][2]).replace(/\D/g, '').replace(/^0/, '') === iP && oData[i][10] !== "ยกเลิก") {
            let dateStr = String(oData[i][1]).trim(); 
            let dParts = dateStr.split(' ')[0].split('/');
            if(dParts.length === 3) {
               let pDate = new Date(dParts[2], parseInt(dParts[1])-1, dParts[0]);
               if(!isNaN(pDate.getTime())) visitDates.push(pDate);
            }
          }
        }
        if (visitDates.length > 0) {
          visitDates.sort((a,b) => a.getTime() - b.getTime());
          let totalVisits = visitDates.length;
          let lastDate = visitDates[totalVisits - 1];
          let firstDate = visitDates[0];
          let lastVisitStr = Utilities.formatDate(lastDate, "Asia/Bangkok", "dd/MM/yyyy");
          let daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
          let freqText = "";
          if (totalVisits === 1) { freqText = "มาใช้บริการครั้งแรก"; } 
          else if (daysDiff <= 30) { freqText = `${totalVisits} ครั้งในเดือนนี้`; } 
          else { let avg = (totalVisits / (daysDiff / 30)).toFixed(1); freqText = `เฉลี่ย ${avg} ครั้ง/เดือน`; }
          res.stats = { total: totalVisits, lastVisit: lastVisitStr, freqText: freqText };
        } else {
           res.stats = { total: 0, lastVisit: "-", freqText: "ยังไม่มีประวัติในระบบบิล" };
        }
      }
    } 
    return JSON.stringify(res); 
  } catch (e) { return JSON.stringify({ found: false }); } 
}
function getCustomerHistory(p) { try { const d = getActiveSS().getSheetByName("Orders").getDataRange().getDisplayValues(); let h = []; let iP = String(p).replace(/\D/g, '').replace(/^0/, ''); for (let i = d.length - 1; i >= 1; i--) { if (String(d[i][2]).replace(/\D/g, '').replace(/^0/, '') === iP && d[i][10] !== "ยกเลิก") h.push({ date: d[i][1], summary: d[i][3], total: d[i][4], stylist: d[i][6] }); } return JSON.stringify(h); } catch (e) { return "[]"; } }
function manageInventory(d) { 
  try { 
    const ss = getActiveSS(); 
    const s = ss.getSheetByName("Stock"); 
    const l = ss.getSheetByName("InventoryLog"); 
    const sd = s.getDataRange().getValues(); 
    let r = -1; let q = 0; let n = ""; let cost = 0;
    
    for (let i = 1; i < sd.length; i++) { 
      if (sd[i][0].toString() === d.barcode.toString()) { 
        r = i + 1; 
        n = sd[i][1]; 
        cost = parseFloat(sd[i][4]) || 0; // ดึงต้นทุนจากคอลัมน์ E (Index 4)
        q = parseFloat(sd[i][5]) || 0; // ดึงคงเหลือจากคอลัมน์ F (Index 5)
        break; 
      } 
    } 
    if (r === -1) return { status: "not_found", msg: "ไม่พบสินค้า" }; 
    
    let nq = d.action === "IN" ? q + parseFloat(d.qty) : q - parseFloat(d.qty); 
    s.getRange(r, 6).setValue(nq); // อัปเดตคงเหลือ
    
    let totalActionCost = cost * parseFloat(d.qty); // คำนวณมูลค่าต้นทุนที่เบิก/รับเข้า
    
    // บันทึกประวัติพร้อมมูลค่าต้นทุนลงในคอลัมน์ G (Index 6)
    l.appendRow(["'" +Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm"), "'" + d.barcode, n, d.action === "IN" ? "รับเข้า" : "เบิกใช้", d.qty, d.staff, totalActionCost]); 
    return { status: "success", msg: "บันทึกสำเร็จ" }; 
  } catch (e) { return { status: "error", msg: e.message }; } 
}
// 🟢 ฟังก์ชันสำหรับโอนสินค้า (เปลี่ยนประเภทหมวดหมู่ หรือแค่บันทึกตัดสต๊อกพร้อมหมายเหตุ)
function transferToInternalUse(d) {
  try {
    const ss = getActiveSS();
    const s = ss.getSheetByName("Stock");
    const l = ss.getSheetByName("InventoryLog");
    
    if (!s || !l) return "no_sheet";

    const sd = s.getDataRange().getValues();
    let r = -1; 
    let q = 0; 
    let n = ""; 
    let cost = 0;
    
    // ค้นหาสินค้าจากบาร์โค้ด
    for (let i = 1; i < sd.length; i++) {
      if (sd[i][0].toString() === d.barcode.toString()) {
        r = i + 1;
        n = sd[i][1];
        cost = parseFloat(sd[i][4]) || 0; // คอลัมน์ E: ต้นทุน
        q = parseFloat(sd[i][5]) || 0;    // คอลัมน์ F: คงเหลือ
        break;
      }
    }
    
    if (r === -1) return "not_found";
    
    // ตัดสต๊อกตามจำนวนที่โอน
    let nq = q - parseFloat(d.qty);
    s.getRange(r, 6).setValue(nq); // อัปเดตช่องจำนวนคงเหลือ
    
    // บันทึกลง Log (ใช้คำว่า "โอนของใช้" จะได้แยกออกจากการเบิกปกติ)
    let totalActionCost = cost * parseFloat(d.qty);
    l.appendRow(["'" + Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm"), "'" + d.barcode, n, "โอนของใช้", d.qty, d.staff + " (" + d.note + ")", totalActionCost]);
    
    return "success";
  } catch (e) {
    return e.message;
  }
}
function getAdminBookings(date) { 
  try { 
    const sheet = getActiveSS().getSheetByName("Bookings"); 
    if (!sheet) return "[]"; 
    const d = sheet.getDataRange().getDisplayValues(); 
    let res = []; 
    for (let i = 1; i < d.length; i++) { 
      if (d[i][8] === "ยกเลิก") continue; 
      if (date === "PENDING" ? d[i][8] === "รอรับบริการ" : d[i][2] === date) {
        res.push({ 
          date: d[i][2], time: d[i][3].substring(0, 5), name: d[i][5], phone: d[i][4], 
          service: d[i][6], stylist: d[i][7], status: d[i][8], 
          slipUrl: d[i][9] || "", // 🌟 ดึงลิงก์สลิปมาจากคอลัมน์ J
          row: i + 1 
        }); 
      } 
    } 
    return JSON.stringify(res); 
  } catch (e) { return "[]"; } 
}

function getMonthlyBookingsUI(month, year) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Bookings");
    if (!sheet) return "[]";
    
    let results = [];
    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(e) {}
    const calId = settings.calendarId;
    
    if (calId) {
      try {
        const cal = CalendarApp.getCalendarById(calId);
        if (cal) {
          let startDate = new Date(year, month - 1, 1);
          let endDate = new Date(year, month, 0); 
          let events = cal.getEvents(startDate, endDate);
          for (let i = 0; i < events.length; i++) {
            let title = events[i].getTitle().toLowerCase();
            if (title.includes('หยุด') || title.includes('ปิดร้าน') || title.includes('closed') || title.includes('holiday') || title.includes('ธุระ')) {
              let eStart = events[i].getStartTime();
              let eEnd = events[i].getEndTime();
              let currentDate = new Date(eStart.getTime());
              while (currentDate < eEnd) {
                if (currentDate.getMonth() === (month - 1)) {
                  let formattedDate = currentDate.getDate() + "/" + String(currentDate.getMonth() + 1).padStart(2, '0') + "/" + currentDate.getFullYear();
                  results.push({ row: 0, date: formattedDate, time: "ตลอดวัน", phone: "-", name: events[i].getTitle(), service: "วันหยุดร้าน", stylist: "-", status: "วันหยุด", slipUrl: "" });
                }
                currentDate.setDate(currentDate.getDate() + 1); 
              }
            }
          }
        }
      } catch(calErr) { console.log("Calendar Error: " + calErr.message); }
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      let rowDateStr = data[i][2]; 
      if (!rowDateStr || data[i][8] === "ยกเลิก") continue;
      let d, m, y;
      if (rowDateStr.includes("/")) {
        let parts = rowDateStr.split("/");
        d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
      } else if (rowDateStr.includes("-")) {
        let parts = rowDateStr.split("-");
        d = parseInt(parts[2]); m = parseInt(parts[1]); y = parseInt(parts[0]);
      } else continue;
      if (y > 2500) y -= 543;
      
      if (m === parseInt(month) && y === parseInt(year)) {
        let formattedDate = d + "/" + String(m).padStart(2, '0') + "/" + y;
        results.push({
          row: i + 1, date: formattedDate, time: data[i][3].substring(0, 5), 
          phone: data[i][4], name: data[i][5], service: data[i][6], 
          stylist: data[i][7], status: data[i][8], 
          slipUrl: data[i][9] || "" // 🌟 ดึงลิงก์สลิปมาจากคอลัมน์ J
        });
      }
    }
    return JSON.stringify(results);
  } catch (e) { return "[]"; }
}
function updateBookingStatus(r, s) { try { getActiveSS().getSheetByName("Bookings").getRange(r, 9).setValue(s); return "success"; } catch (e) { return "error"; } }
function getPendingBookingsCount() { try { const sheet = getActiveSS().getSheetByName("Bookings"); if (!sheet) return 0; const d = sheet.getDataRange().getValues(); let c = 0; for (let i = 1; i < d.length; i++) if (d[i][8] === "รอรับบริการ") c++; return c; } catch (e) { return 0; } }
function getInventoryLog() {
  try {
    const ss = getActiveSS();
    const s = ss.getSheetByName("InventoryLog");
    if (!s) return "[]";
    
    const d = s.getDataRange().getDisplayValues();
    const v = s.getDataRange().getValues();
    let logs = [];
    
    for (let i = 1; i < d.length; i++) {
      if (d[i][0]) {
        logs.push({
          date: String(d[i][0]),
          barcode: String(d[i][1]).replace(/'/g, ''),
          name: String(d[i][2]),
          action: String(d[i][3]),
          qty: parseFloat(v[i][4]) || 0,
          staff: String(d[i][5]),
          cost: parseFloat(v[i][6]) || 0  // 🌟 หยิบข้อมูลต้นทุนจากคอลัมน์ G มาด้วย
        });
      }
    }
    return JSON.stringify(logs.reverse()); // ส่งกลับไปหน้าเว็บโดยเรียงจากใหม่ไปเก่า
  } catch (e) {
    return "[]";
  }
}
function cancelOrder(id) { 
    try { 
        const s = getActiveSS().getSheetByName("Orders"); 
        if (!s) return "not_found";
        const d = s.getDataRange().getValues(); 
        
        // 🌟 ปรับให้หาบิลเจอเสมอ แม้จะพิมพ์ตัวเล็ก หรือเผลอเว้นวรรค
        let targetId = String(id).trim().toUpperCase(); 
        
        for (let i = 1; i < d.length; i++) { 
            let rowId = String(d[i][0]).trim().toUpperCase();
            if (rowId === targetId) { 
                if (String(d[i][10]) === "ยกเลิก") return "already_cancelled"; 
                s.getRange(i + 1, 11).setValue("ยกเลิก"); 
                return "success"; 
            } 
        } 
        return "not_found"; 
    } catch (e) { 
        return "error"; 
    } 
}
function addMemberPOS(d) {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("Members");
    if (!sheet) {
      sheet = ss.insertSheet("Members");
      sheet.appendRow(["เบอร์โทร", "ชื่อ-นามสกุล", "ชื่อเล่น", "สภาพผม", "แต้มสะสม", "LINE ID", "วันเกิด", "แท็ก/ประเภท"]);
    }
    const data = sheet.getDataRange().getDisplayValues();
    let inputPhone = String(d.phone).replace(/\D/g, '').replace(/^0/, '');
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).replace(/\D/g, '').replace(/^0/, '') === inputPhone) {
            return "duplicate";
        }
    }
    // 🌟 เพิ่มการบันทึก วันเกิด (d.dob) และ แท็ก (d.tags) ลงในคอลัมน์ G และ H (เว้นคอลัมน์ F ไว้ให้ LINE ID)
    sheet.appendRow(["'" + d.phone, d.name, d.nickname, d.condition, 0, "", d.dob || "-", d.tags || "-"]);
    return "success";
  } catch (e) {
    return "error";
  }
}
function addExpense(d) { try { getActiveSS().getSheetByName("Expenses").appendRow(["'" +Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss"), d.item, d.ref, d.amount]); return "success"; } catch (e) { return "error"; } }
function getBillHistory() { 
  try { 
    const ss = getActiveSS(); 
    const ordersSheet = ss.getSheetByName("Orders"); 
    if (!ordersSheet) return "[]"; 
    const orders = ordersSheet.getDataRange().getValues(); 
    const memSheet = ss.getSheetByName("Members"); 
    let memMap = {}; 
    if (memSheet) { 
      let mData = memSheet.getDataRange().getValues(); 
      for (let i = 1; i < mData.length; i++) { 
        let p = String(mData[i][0]).replace(/\D/g, '').replace(/^0/, ''); 
        memMap[p] = mData[i][1]; 
      } 
    } 
    let history = []; 
    for (let i = orders.length - 1; i >= 1; i--) { 
      let rawPhone = String(orders[i][2]); 
      let cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, ''); 
      let cName = memMap[cleanPhone] || rawPhone; 
      let cartData = []; 
      try { 
        cartData = JSON.parse(orders[i][8]); 
      } catch (e) { } 
      // ตรวจสอบว่ามีคอลัมน์ลายเซ็น (index 14) หรือไม่ และจัดการกรณีข้อมูลเก่า 
      let signature = ""; 
      if (orders[i].length > 14) { 
        signature = orders[i][14] || ""; 
      } 
      history.push({ 
        id: orders[i][0], 
        date: (orders[i][1] instanceof Date) ? Utilities.formatDate(orders[i][1], "Asia/Bangkok", "dd/MM/yyyy HH:mm") : orders[i][1], 
        phone: rawPhone, 
        customerName: cName, 
        netTotal: parseFloat(orders[i][4]) || 0, 
        paymentMethod: orders[i][5], 
        stylist: orders[i][6], 
        assistant: orders[i][7], 
        cart: cartData, 
        discountValue: parseFloat(orders[i][9]) || 0, 
        status: orders[i][10], 
        vatType: orders[i][11], 
        vatAmount: parseFloat(orders[i][12]) || 0, 
        taxInfo: orders[i][13], 
        signature: signature 
      }); 
    } 
    return JSON.stringify(history); 
  } catch (e) { 
    return "[]"; 
  } 
}

function getBookedSlots(dateStr) { 
  try { 
    const ss = getActiveSS(); 
    
    // 🌟 1. วิ่งเช็ควันหยุดจาก Google Calendar ก่อน
    let settings = {};
    try { 
      settings = JSON.parse(getShopSettings()); 
    } catch(errSettings) {
      settings = {};
    }
    
    const calId = settings.calendarId; // ดึง ID ปฏิทินจากหน้า Settings
    
    if (calId) {
      try {
        const cal = CalendarApp.getCalendarById(calId);
        if (cal) {
          // แปลงวันที่ YYYY-MM-DD เป็น Date Object
          let dParts = dateStr.split('-');
          let checkDate = new Date(dParts[0], parseInt(dParts[1]) - 1, dParts[2]);
          
          // ดึง Event ทั้งหมดในวันนั้น
          let events = cal.getEventsForDay(checkDate);
          for (let i = 0; i < events.length; i++) {
            let title = events[i].getTitle().toLowerCase();
            // 🛑 เช็คคีย์เวิร์ดวันหยุด
            if (title.includes('หยุด') || title.includes('ปิดร้าน') || title.includes('closed') || title.includes('holiday') || title.includes('ธุระ')) {
              return JSON.stringify([{ isHoliday: true, reason: events[i].getTitle() }]);
            }
          }
        }
      } catch(calErr) {
        console.log("Calendar Check Error: " + calErr.message);
      }
    }

    // 🌟 2. ถ้าไม่ใช่วันหยุด ให้ดึงข้อมูลคิวที่ถูกจองไว้ตามปกติ
    const sheet = ss.getSheetByName("Bookings"); 
    if (!sheet) return "[]"; 
    
    const d = sheet.getDataRange().getDisplayValues(); 
    let booked = []; 
    for (let i = 1; i < d.length; i++) { 
      if (d[i][8] === "ยกเลิก") continue; 
      if (d[i][2] === dateStr) { 
        booked.push({ 
          time: d[i][3].substring(0, 5), 
          stylist: d[i][7], 
          service: d[i][6] 
        }); 
      } 
    } 
    return JSON.stringify(booked); 
  } catch (errorOuter) { 
    return "[]"; 
  } 
}

// 1. ฟังก์ชันหา LINE ID จากเบอร์โทร (แบบติดเรดาร์ขั้นสุดยอด ดึงข้อมูลแม่นยำ 100%)
function getLineIdByPhone(phone) {
  try {
    const ss = getActiveSS(); // 🌟 จุดสำคัญ: ต้องใช้ getActiveSS() เพื่อให้ล็อกไฟล์ได้ 100%
    let sheet = ss.getSheetByName("Members") || ss.getSheetByName("Member");
    if (!sheet) return "ERROR_NO_SHEET"; 

    const data = sheet.getDataRange().getDisplayValues(); 
    
    // ล้างเบอร์โทรฝั่งที่ค้นหา (ลบขยะ และลบ 0 ตัวหน้าทิ้ง)
    let pClean = String(phone).replace(/[^0-9]/g, '').replace(/^0/, '');

    for (let i = 1; i < data.length; i++) {
      let rowPhone = String(data[i][0]).replace(/[^0-9]/g, '').replace(/^0/, ''); 
      
      if (rowPhone === pClean && pClean !== "") { 
        let lineId = String(data[i][5] || "").trim(); // ดึงคอลัมน์ F
        return lineId !== "" ? lineId : "ERROR_EMPTY_ID"; 
      }
    }
    return "ERROR_NOT_FOUND"; 
  } catch(e) {
    return "ERROR: " + e.message;
  }
}

// 🔴 ฟังก์ชันส่ง LINE (เวอร์ชันอัปเดต โชว์แต้มได้รับ + แต้มสะสมคงเหลือทั้งหมด)
function sendLineReceipt(invoiceId, userId, messageOrData, netTotal) {
  
  // 🟢 1. ใส่ TOKEN ของคุณตรงนี้ 
 // 🟢 1. ดึง TOKEN จากระบบตั้งค่าของร้าน
  let settings = {};
  try { settings = JSON.parse(getShopSettings()); } catch(e) {}
  const LINE_ACCESS_TOKEN = settings.lineToken || "";
  const ADMIN_ID = settings.lineAdminId || ""; 
  
  if (!LINE_ACCESS_TOKEN) return; // ถ้าไม่มี Token ไม่ต้องส่งเพื่อป้องกัน Error
  let storeLogoUrl = settings.logoUrl || "https://img2.pic.in.th/Studio-1.png";

  let messagesArray = [];

  if (typeof messageOrData === "object" && messageOrData !== null) {
    let o = messageOrData; 
    if (o.logoUrl) storeLogoUrl = o.logoUrl; 
    
    // 🌟 ดึงข้อมูลชื่อร้านและเบอร์โทรจากการตั้งค่า
    let shopName = "Kori Hair salon POS";
    let shopPhone = "-";
    try {
      let settings = JSON.parse(getShopSettings());
      if (settings.shopName) shopName = settings.shopName;
      if (settings.phone) shopPhone = settings.phone;
    } catch(e) {}
    
    // 🔍 1. ค้นหาชื่อและ "แต้มสะสมล่าสุด" จากเบอร์โทร
    let rawPhone = String(o.phone || o.customerPhone || o.tel || "");
    let cName = String(o.foundName || o.name || o.customerName || "");
    let totalPoints = ""; // เตรียมตัวแปรรับแต้มคงเหลือ
    
    if (rawPhone !== "" && rawPhone !== "ลูกค้าทั่วไป") {
      try {
        const memSheet = getActiveSS().getSheetByName("Members");
        if (memSheet) {
          const mData = memSheet.getDataRange().getDisplayValues();
          let pClean = rawPhone.replace(/\D/g, '').replace(/^0/, '');
          for (let i = 1; i < mData.length; i++) {
            let rowPhone = String(mData[i][0]).replace(/\D/g, '').replace(/^0/, '');
            if (rowPhone === pClean) {
              cName = mData[i][1]; // ชื่อ
              let nName = mData[i][2]; // ชื่อเล่น
              if (nName) cName += " (" + nName + ")";
              
              // 🌟 ดึงแต้มสะสมล่าสุดจากคอลัมน์ E (Index 4)
              totalPoints = String(mData[i][4] || "0"); 
              break;
            }
          }
        }
      } catch(e) { console.log("Error finding member: " + e.message); }
      if (cName === "" || cName === "undefined" || cName === "ลูกค้าทั่วไป") cName = "ไม่มีชื่อในระบบ";
    } else {
      cName = "ลูกค้าทั่วไป";
    }

    let displayCustomer = cName;
    let displayPhone = (rawPhone !== "" && rawPhone !== "ลูกค้าทั่วไป") ? rawPhone : "-";

    const formatMoney = (amount) => {
        let num = parseFloat(amount);
        if (isNaN(num)) return String(amount || "0.00");
        return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    };

    // 🛒 2. แกะรายการ cartJSON (ดักจับโชว์ส่วนลดรายชิ้น)
    let itemFlex = [];
    let parsedItems = [];
    try {
        if (o.cartJSON) parsedItems = typeof o.cartJSON === 'string' ? JSON.parse(o.cartJSON) : o.cartJSON;
        else if (o.items) parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    } catch(e) {}

    let hasCourseInItems = false;
    if (parsedItems && Array.isArray(parsedItems) && parsedItems.length > 0) {
      parsedItems.forEach(function(item) {
        let itemName = String(item.name || item.itemName || item.text || "-");
        if (item.qty && item.qty > 1) itemName += " x" + item.qty;
        
        let itemDiscount = item.itemDiscount ? parseFloat(item.itemDiscount) : 0;
        if (itemDiscount > 0) itemName += ` (ลด ${itemDiscount.toLocaleString()})`;

        let itemPrice = formatMoney(item.price || item.amount || item.total || 0);

        if (itemName.includes("วงเงิน") || itemName.includes("คอร์ส") || itemName.includes("เหลือ")) hasCourseInItems = true; 

        itemFlex.push({
          "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": itemName, "size": "xs", "color": itemDiscount > 0 ? "#D32F2F" : "#333333", "flex": 2, "wrap": true },
            { "type": "text", "text": itemPrice, "size": "xs", "color": "#111111", "align": "end", "flex": 1 }
          ]
        });
      });
    }

    if (!hasCourseInItems && (o.courseName || o.usedCourseName || o.courseText)) {
        let cText = String(o.courseText || ("ใช้วงเงิน: " + (o.courseName || o.usedCourseName)));
        if (o.courseBalance || o.remainingCourse) cText += " (เหลือ " + (o.courseBalance || o.remainingCourse) + ")";
        let cAmount = String(o.courseDeduct || o.usedCourseAmount || o.coursePrice || "0");
        if (!cAmount.startsWith("-") && cAmount !== "0") cAmount = "-" + cAmount;

        itemFlex.push({
          "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": cText, "size": "xs", "color": "#333333", "flex": 2, "wrap": true },
            { "type": "text", "text": cAmount, "size": "xs", "color": "#111111", "align": "end", "flex": 1 }
          ]
        });
    }

    if (itemFlex.length === 0 && (o.itemsSummary || o.summary)) {
        itemFlex.push({
          "type": "box", "layout": "horizontal", "contents": [
            { "type": "text", "text": String(o.itemsSummary || o.summary), "size": "xs", "color": "#333333", "flex": 2, "wrap": true },
            { "type": "text", "text": formatMoney(o.netTotal || 0), "size": "xs", "color": "#111111", "align": "end", "flex": 1 }
          ]
        });
    }

    // 🎁 3. ระบบแต้มสะสม (ปรับให้โชว์ครบถ้วน)
    let pointsStr = "";
    let earned = parseFloat(o.earnedPoints || o.calculatedPoints || "0");
    let used = parseFloat(o.pointsUsed || o.usedPoints || o.redeemPoints || "0");

    if (earned > 0 || used > 0 || (totalPoints !== "" && totalPoints !== "0")) {
        let pArr = [];
        if (earned > 0) pArr.push("ได้รับ " + earned + " แต้ม");
        if (used > 0) pArr.push("ใช้ไป " + used + " แต้ม");
        
        pointsStr = pArr.join(" | ");
        
        // นำยอดสะสมรวมมาต่อท้าย
        if (totalPoints !== "" && totalPoints !== "0") {
            if (pointsStr !== "") pointsStr += " | ";
            pointsStr += "สะสมรวม " + parseFloat(totalPoints.replace(/,/g,'')).toLocaleString() + " แต้ม"; 
        }
    } else if (o.pointsSummaryText || o.pointsText) {
        pointsStr = String(o.pointsSummaryText || o.pointsText);
    }

    const techName = String(o.stylist || "-");
    const asstName = String(o.assistant || "-");
    const subTotal = formatMoney(o.subTotal || o.total || o.netTotal || 0);
    const discount = formatMoney(o.discountValue || o.discount || 0);
    const finalTotal = formatMoney(o.netTotal || 0);
    const paymentMethod = String(o.paymentMethod || "เงินสด");
    const dateStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm");
    const invIdStr = String(invoiceId || "ไม่มีเลขที่");

    let signatureImgUrl = "";
    if (o.signature && String(o.signature).length > 100 && String(o.signature).startsWith("data:image")) {
      try {
        let base64 = String(o.signature).split(",")[1] || String(o.signature);
        let blob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', 'sign_' + invIdStr + '.png');
        let file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        signatureImgUrl = "https://drive.google.com/uc?export=view&id=" + file.getId() + "&ext=.png";
      } catch(e) { }
    }

    messagesArray = [{
      "type": "flex",
      "altText": "ใบเสร็จรับเงินจาก " + shopName,
      "contents": {
        "type": "bubble",
        "size": "kilo",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "image", "url": storeLogoUrl, "size": "sm", "aspectMode": "fit" },
            { "type": "text", "text": shopName, "weight": "bold", "color": "#111111", "size": "lg", "align": "center", "margin": "md" },
            { "type": "text", "text": "โทร. " + shopPhone, "size": "xxs", "color": "#aaaaaa", "align": "center", "margin": "xs" },
            
            { "type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": [{ "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "ใบเสร็จรับเงิน", "align": "center", "size": "xs", "weight": "bold", "color": "#333333" }], "backgroundColor": "#f4f4f4", "paddingAll": "sm", "cornerRadius": "md" }] },
            { "type": "separator", "margin": "md", "color": "#dddddd" },
            { "type": "box", "layout": "vertical", "margin": "md", "contents": [{ "type": "text", "text": "เลขที่เอกสาร: " + invIdStr, "size": "xs", "weight": "bold", "align": "center" }, { "type": "text", "text": dateStr, "size": "xxs", "color": "#aaaaaa", "align": "center" }] },
            
            // 🟢 4. โซนแสดงชื่อลูกค้า + เบอร์โทร
            { "type": "box", "layout": "vertical", "margin": "md", "contents": [
              { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ลูกค้า:", "size": "xs", "weight": "bold", "color": "#111111", "flex": 1 }, { "type": "text", "text": displayCustomer, "size": "xs", "align": "end", "weight": "bold", "flex": 3, "wrap": true }] }, 
              { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [{ "type": "text", "text": "เบอร์โทร:", "size": "xs", "weight": "bold", "color": "#111111", "flex": 1 }, { "type": "text", "text": displayPhone, "size": "xs", "align": "end", "weight": "bold", "color": "#555555", "flex": 2 }] },
              { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [{ "type": "text", "text": "ช่าง: " + techName, "size": "xxs", "color": "#888888" }, { "type": "text", "text": "ผู้ช่วย: " + asstName, "size": "xxs", "color": "#888888", "align": "end" }] }
            ]},
            
            { "type": "box", "layout": "vertical", "margin": "md", "contents": [{ "type": "text", "text": "รายการสินค้า/บริการ:", "size": "xs", "weight": "bold" }, { "type": "separator", "margin": "sm", "color": "#dddddd" }, { "type": "box", "layout": "vertical", "margin": "sm", "spacing": "sm", "contents": itemFlex }, { "type": "separator", "margin": "sm", "color": "#dddddd" }] },
            { "type": "box", "layout": "vertical", "margin": "sm", "spacing": "sm", "contents": [{ "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "รวมเป็นเงิน", "size": "xs", "color": "#555555" }, { "type": "text", "text": subTotal, "size": "xs", "align": "end" }] }, { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ส่วนลด", "size": "xs", "color": "#555555" }, { "type": "text", "text": "- " + discount, "size": "xs", "align": "end" }] }, { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ชำระโดย:", "size": "xs", "weight": "bold", "color": "#111111" }, { "type": "text", "text": paymentMethod, "size": "xs", "align": "end", "weight": "bold", "color": "#111111" }] }] },
            
            { "type": "separator", "margin": "md", "color": "#111111" },
            { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "ยอดชำระสุทธิ", "weight": "bold", "size": "sm" }, { "type": "text", "text": finalTotal, "weight": "bold", "size": "sm", "align": "end", "color": "#00B900" }] },
            { "type": "separator", "margin": "md", "color": "#dddddd" },
            
            ...(pointsStr !== "" ? [
              { "type": "text", "text": pointsStr, "weight": "bold", "color": "#008855", "size": "xs", "align": "center", "margin": "sm", "wrap": true },
              { "type": "separator", "margin": "md", "color": "#dddddd" }
            ] : []),

            ...(signatureImgUrl !== "" ? [
              { "type": "box", "layout": "vertical", "margin": "md", "alignItems": "center", "contents": [
                { "type": "text", "text": "ลายเซ็นลูกค้า", "size": "xxs", "color": "#aaaaaa", "margin": "sm" },
                { "type": "image", "url": signatureImgUrl, "size": "sm", "aspectRatio": "2:1", "aspectMode": "fit" }
              ]}
            ] : []),
            { "type": "box", "layout": "vertical", "margin": "md", "alignItems": "center", "contents": [
              { "type": "text", "text": "ขอบคุณที่ใช้บริการ", "size": "xs", "color": "#555555", "weight": "bold" }
            ]}
          ]
        }
      }
    }];
  } else {
    messagesArray = [{ "type": "text", "text": "บิลพัง!" }];
  }

  const payload = { "to": userId, "messages": messagesArray };
  const options = { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LINE_ACCESS_TOKEN }, "payload": JSON.stringify(payload), "muteHttpExceptions": true };
  try { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options); } catch(e) {}
}
// ==========================================
// ฟังก์ชันสำหรับแอบผูก LINE ID เข้ากับเบอร์โทรลูกค้า (กรณีช่องว่าง)
// ==========================================
function autoUpdateLineId(phone, userId) {
  if (!userId) return;
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Members");
    const data = sheet.getDataRange().getDisplayValues();
    let inputPhone = String(phone).replace(/\D/g, '').replace(/^0/, '');
    for (let i = 1; i < data.length; i++) {
      let rowPhone = String(data[i][0]).replace(/\D/g, '').replace(/^0/, '');
      if (rowPhone === inputPhone) {
        if (data[i][5] === "") {
          sheet.getRange(i + 1, 6).setValue(userId);
        }
        break;
      }
    }
  } catch (e) { }
}

function getStockStatistics() {
  const sheet = getActiveSS().getSheetByName("InventoryLog");
  if (!sheet) return JSON.stringify({totalIn:0, totalOut:0, top5:[]});
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let totalIn = 0;
  let totalOut = 0;
  let itemUsage = {};
  for (let i = 1; i < data.length; i++) {
    let dateStr = data[i][0];
    if (!dateStr) continue;
    let parts = dateStr.split(' ')[0].split('/');
    let logDate = new Date(parts[2], parts[1] - 1, parts[0]);
    if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
      let action = String(data[i][3]);
      let qty = parseFloat(data[i][4]) || 0;
      let costTotal = parseFloat(data[i][6]) || 0;
      let name = String(data[i][2]);
      if (action === "รับเข้า") {
        totalIn += costTotal;
      } else if (action === "เบิกใช้" || action === "ขายออก") {
        totalOut += costTotal;
        itemUsage[name] = (itemUsage[name] || 0) + qty;
      }
    }
  }
  let top5 = Object.keys(itemUsage).map(name => ({ name: name, qty: itemUsage[name] })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  return JSON.stringify({ totalIn: totalIn, totalOut: totalOut, top5: top5 });
}

function lineWebhook_(e) {
  try {
    let settings = JSON.parse(getShopSettings());
    let event = JSON.parse(e.postData.contents).events[0];
    if (!event) return ContentService.createTextOutput("OK");
    let replyToken = event.replyToken;
    
    // 🆔 ระบบดักจับกลุ่มไลน์ + ให้บอทพิมพ์รหัสบอก (ปิดการเขียนทับอัตโนมัติ)
    if (event.source && event.source.type === "group") {
      let groupId = event.source.groupId;
      if (event.type === "message" && event.message.type === "text") {
        let userMessage = event.message.text.trim();
        
        if (userMessage.startsWith("เช็คไอดี") || userMessage.toLowerCase().startsWith("check id")) {
          
          let activeToken = settings.lineToken || "";
          let replyText = "🛎️ [ระบบหน้าร้าน]\nรหัสกลุ่มจองคิวของคุณคือ:\n" + groupId + "\n\n(นำรหัสนี้ไปก๊อปปี้วางในตารางช่อง B18 ได้เลยครับ)";

          if (userMessage.includes("ผู้บริหาร")) {
            activeToken = settings.lineTokenExec || settings.lineToken || "";
            replyText = "👑 [ระบบผู้บริหาร]\nรหัสกลุ่มผู้บริหารของคุณคือ:\n" + groupId + "\n\n(นำรหัสนี้ไปก๊อปปี้วางในตารางช่อง B22 ได้เลยครับ)";
          } else if (userMessage.includes("แอดมิน") || userMessage.includes("สรุปยอด")) {
            activeToken = settings.lineTokenAdmin || settings.lineToken || "";
            replyText = "📊 [ระบบแอดมิน/ปิดกะ]\nรหัสกลุ่มแอดมินของคุณคือ:\n" + groupId + "\n\n(นำรหัสนี้ไปก๊อปปี้วางในตารางช่อง B17 ได้เลยครับ)";
          }

          // ส่งข้อความบอกรหัสกลุ่มกลับไปที่แชท
          replyToLine(replyToken, replyText, activeToken);
          return ContentService.createTextOutput("OK");
        }
      }
    }
    
    // 👤 ระบบผูกเบอร์โทรลูกค้า (Bot 1)
    let userId = event.source.userId;
    if (event.type === "message" && event.message.type === "text") {
      let userMessage = event.message.text.trim();
      let cleanPhone = userMessage.replace(/[\s-]/g, '');
      let phoneRegex = /^[0-9]{10}$/;
      if (phoneRegex.test(cleanPhone)) {
        let updateStatus = linkLineIdToMember(cleanPhone, userId);
        let replyMsg = "";
        if (updateStatus === "success") {
          replyMsg = "✅ ผูกเบอร์โทรศัพท์ " + cleanPhone + " สำเร็จ!\nระบบใบเสร็จเชื่อมต่อแล้วครับ";
        } else if (updateStatus === "not_found") {
          replyMsg = "❌ ไม่พบเบอร์นี้ในระบบสมาชิกร้านครับ";
        } else if (updateStatus === "already_linked") {
          replyMsg = "⚠️ เบอร์โทรศัพท์นี้ถูกผูกกับไลน์เรียบร้อยแล้วครับ";
        }
        replyToLine(replyToken, replyMsg, settings.lineToken || "");
      }
    }
    return ContentService.createTextOutput("OK");
  } catch (error) {
    return ContentService.createTextOutput("Error");
  }
}

function testSendToGroup() {
  const settings = JSON.parse(getShopSettings());
  const token = settings.lineToken;
  const groupId = settings.lineAdminId;
  
  Logger.log("=== เริ่มการตรวจสอบท่อส่งข้อมูล ===");
  Logger.log("1. ค่า Token ที่ระบบอ่านได้: " + (token ? "พบรหัสโทเคนแล้ว" : "❌ ว่างเปล่า"));
  Logger.log("2. ค่า Group ID (ช่อง B6): " + (groupId ? groupId : "❌ ว่างเปล่า"));
  
  if (!token || !groupId) {
    Logger.log("❌ ผลตรวจ: ตรวจสอบหน้า Google Sheet อีกครั้ง มีช่องว่างเปล่ารันต่อไม่ได้ครับ");
    return;
  }
  
  let payload = {
    "to": groupId,
    "messages": [{ "type": "text", "text": "🔔 ข้อความทดสอบ: สัญญาณระบบจองคิวจาก Google Sheets เชื่อมต่อถึงกลุ่มไลน์สำเร็จแล้วซินะ!" }]
  };
  
  let options = {
    "method": "post",
    "headers": { 
      "Content-Type": "application/json", 
      "Authorization": "Bearer " + token 
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    let response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
    Logger.log("3. รหัสตอบรับจาก LINE Server: " + response.getResponseCode());
    Logger.log("4. ข้อความรายงานจาก LINE: " + response.getContentText());
  } catch(e) {
    Logger.log("🔥 เกิดข้อผิดพลาดรุนแรง: " + e.message);
  }
}
  
// ==========================================
// 🟢 อัปเดต: ยืนยันการจ่ายเงิน (และบันทึกข้อมูลการโอน + สลิป ลง Payables)
// ==========================================
function confirmPayablePayment(row, method, fromAccount, location, slipBase64, slipMimeType) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Payables");
    if (!sheet) return "error_no_sheet";
    
    // 1. เปลี่ยนสถานะเป็น จ่ายแล้ว ในคอลัมน์ H (Index 8)
    sheet.getRange(row, 8).setValue("จ่ายแล้ว");
    
    // 🌟 2. บันทึกข้อมูลการจ่าย (วันเวลา, วิธี, บัญชีที่ตัด, สถานที่จ่าย) เพิ่มในคอลัมน์ L, M, N, O
    let payDate = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    sheet.getRange(row, 12).setValue(payDate);      // คอลัมน์ L: วันที่จ่ายจริง
    sheet.getRange(row, 13).setValue(method);       // คอลัมน์ M: วิธีการจ่าย
    sheet.getRange(row, 14).setValue(fromAccount);  // คอลัมน์ N: บัญชีที่ใช้จ่าย (ของร้าน)
    sheet.getRange(row, 15).setValue(location || "-"); // คอลัมน์ O: สถานที่จ่าย

    // 📸 3. อัปโหลดสลิปโอนเงิน (ถ้ามีการแนบมา) ลงในคอลัมน์ P (Index 16)
    let slipUrl = "-";
    if (slipBase64 && slipMimeType) {
      try {
        const folderId = "1xnUqQsVHt9XSAte6mCD6PaLIXw-Em1cI"; // ใช้โฟลเดอร์เดียวกับบิล
        const folder = DriveApp.getFolderById(folderId);
        const blob = Utilities.newBlob(Utilities.base64Decode(slipBase64), slipMimeType, "SLIP_" + new Date().getTime() + ".png");
        const file = folder.createFile(blob);
        slipUrl = file.getUrl();
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
        sheet.getRange(row, 16).setValue(slipUrl); // คอลัมน์ P: ลิงก์สลิปโอนเงิน
      } catch(uploadErr) {
        console.log("Upload Slip Error:", uploadErr.message);
      }
    }
    
    const data = sheet.getDataRange().getValues();
    const vendor = data[row-1][2];
    const docNo = data[row-1][3];
    const amount = data[row-1][5];
    const refImage = data[row-1][8]; // ลิงก์ใบแจ้งหนี้เดิม
    
    // 4. บันทึกลงรายจ่าย (Expenses) โดยดักไม่ให้ระบบเงินเดือนไปลงซ้ำ
    if (String(refImage) !== "ระบบเงินเดือน/เบิก") {
      const expSheet = ss.getSheetByName("Expenses");
      if (expSheet) {
         let detail = `[จ่ายบิล] ${vendor} (เลขที่: ${docNo}) (ผ่าน: ${method} - ${fromAccount})`;
         // โครงสร้าง Expenses: วัน-เวลา, หมวดหมู่, รายละเอียด, จำนวนเงิน, หลักฐาน (สลิป), ผู้บันทึก
         expSheet.appendRow(["'" + payDate, "รายจ่ายทั่วไป (ใบรอจ่าย)", detail, amount, slipUrl, "ผู้บริหาร (Payables)"]);
      }
    }
    return "success";
  } catch(e) { return "error: " + e.message; }
}

// ==========================================
// 🟢 ดึงประวัติรายการที่จ่ายแล้วทั้งหมด (อัปเดตดึงลิงก์รูปภาพ)
// ==========================================
function getPaidPayables() {
  try {
    const sheet = getActiveSS().getSheetByName("Payables");
    if (!sheet) return "[]";
    const data = sheet.getDataRange().getDisplayValues();
    let list = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === "จ่ายแล้ว") { 
        list.push({
          row: i + 1,
          vendor: data[i][2],
          docNo: data[i][3],
          amount: parseFloat(String(data[i][5]).replace(/,/g, '')) || 0,
          account: data[i][6],
          invoiceUrl: data[i][8] || "-",      // I: ลิงก์บิลใบแจ้งหนี้ต้นทาง
          payDate: data[i][11] || "-",        // L: วันที่จ่าย
          payMethod: data[i][12] || "-",      // M: วิธีจ่าย
          payFromAccount: data[i][13] || "-", // N: ตัดจากบัญชี
          payLocation: data[i][14] || "-",    // O: สถานที่จ่าย
          slipUrl: data[i][15] || "-"         // P: ลิงก์สลิปโอนเงิน (เพิ่มใหม่)
        });
      }
    }
    return JSON.stringify(list.reverse());
  } catch(e) { return "[]"; }
}

// --- 🟢 ส่วนที่ 1: ดึงและบันทึกข้อมูลคู่ค้า (Vendors) ---
function getVendorsData() {
  try {
    const sheet = getActiveSS().getSheetByName("Vendors");
    if (!sheet) return "[]";
    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) return "[]";
    
    let list = [];
    for (let i = 1; i < values.length; i++) {
      list.push({
        name: values[i][0],
        bank: values[i][1],
        account: values[i][2],
        defaultMethod: values[i][3], // QR / 7-11 / Counter
        note: values[i][4]
      });
    }
    return JSON.stringify(list);
  } catch(e) { return "[]"; }
}

function saveNewVendor(v) {
  try {
    const sheet = getActiveSS().getSheetByName("Vendors");
    if (!sheet) return "no_sheet";
    sheet.appendRow([v.name, v.bank, v.account, v.method, v.note]);
    return "success";
  } catch(e) { return "error"; }
}
// --- 🟢 ส่วนที่ 1: จัดการข้อมูลคู่ค้า (Vendors) ---

// ดึงรายชื่อคู่ค้าทั้งหมด
function getVendors() {
  try {
    const sheet = getActiveSS().getSheetByName("Vendors");
    if (!sheet) return "[]";
    return JSON.stringify(sheet.getDataRange().getDisplayValues());
  } catch(e) { return "[]"; }
}

// บันทึกคู่ค้าใหม่หรือแก้ไข
function saveVendor(data) {
  try {
    const sheet = getActiveSS().getSheetByName("Vendors");
    sheet.appendRow([data.name, data.bank, data.account, data.method, data.note]);
    return "success";
  } catch(e) { return "error"; }
}

// --- 🟢 ส่วนที่ 2: ระบบแจ้งเตือนอัตโนมัติ (LINE Notification) ---
// แนะนำให้ตั้ง Trigger ให้รันฟังก์ชันนี้ทุกเช้า (เช่น 08:00 น.)
function checkDueDatesAndNotify() {
  const ss = getActiveSS();
  const sheet = ss.getSheetByName("Payables");
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let msg = "📢 รายงานบิลค้างชำระ\n";
  let hasPending = false;
  
  for (let i = 1; i < data.length; i++) {
    let dueDate = new Date(data[i][9]); // คอลัมน์ J: วันครบกำหนด
    let status = data[i][7]; // คอลัมน์ H: สถานะ
    
    if (status === "รอจ่าย" && !isNaN(dueDate.getTime())) {
      dueDate.setHours(0,0,0,0);
      let diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        msg += `⚠️ ครบกำหนดวันนี้: ${data[i][2]} (${data[i][5]} ฿)\n`;
        hasPending = true;
      } else if (diffDays < 0) {
        msg += `🚨 เลยกำหนดมาแล้ว ${Math.abs(diffDays)} วัน: ${data[i][2]} (${data[i][5]} ฿)\n`;
        hasPending = true;
      } else if (diffDays <= 3) {
        msg += `🗓️ อีก ${diffDays} วันต้องจ่าย: ${data[i][2]} (${data[i][5]} ฿)\n`;
        hasPending = true;
      }
    }
  }
  
  if (hasPending) {
    let settings = JSON.parse(getShopSettings());
    const adminId = settings.lineAdminId;
    const token = settings.lineToken;
    if (adminId && token) pushMessageToLine(adminId, msg, token);
  }
}
// --- 🟢 ส่วนที่ 2: ปรับปรุงการบันทึก Payables (รองรับคอลัมน์ J, K) ---
// แก้ไขฟังก์ชัน savePayableRecord เดิมของคุณให้เป็นแบบนี้
function savePayableRecord(billData, creator) {
  const ss = getActiveSS();
  let sheet = ss.getSheetByName("Payables");
  if (!sheet) {
    sheet = ss.insertSheet("Payables");
    sheet.appendRow(["วันที่สแกน", "ผู้เบิก", "คู่ค้า/บริษัท", "เลขที่บิล", "รอบบิล/วันที่", "ยอดเงิน", "เลขบัญชี", "สถานะ", "อ้างอิงภาพ", "วันครบกำหนด", "ช่องทางชำระ"]);
  }
  let ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
  
  // ลองหาข้อมูลคู่ค้าจากชื่อ เพื่อดึง "ช่องทางชำระ" อัตโนมัติ
  let defaultChannel = "-";
  try {
    const vSheet = ss.getSheetByName("Vendors");
    if (vSheet) {
      const vData = vSheet.getDataRange().getValues();
      for(let i=1; i<vData.length; i++) {
        if(vData[i][0] == billData.vendorName) {
          defaultChannel = vData[i][3]; // คอลัมน์ D
          if(!billData.bankAccount || billData.bankAccount == "-") billData.bankAccount = vData[i][2]; // ถ้าในบิลไม่มีเลขบัญชี ให้ดึงจากฐานข้อมูลคู่ค้า
          break;
        }
      }
    }
  } catch(e) {}

  // บันทึก J: วันครบกำหนด (ดึงจากบิลถ้ามี), K: ช่องทางชำระ
  sheet.appendRow([ts, creator, billData.vendorName, billData.docNo, billData.billDate, billData.amount, billData.bankAccount, "รอจ่าย", "สแกนจาก LINE", billData.dueDate || "-", defaultChannel]);return "success"; // 🟢 เพิ่มบรรทัดนี้เพื่อให้หน้าเว็บรู้ว่าบันทึกเสร็จแล้ว
}
// --- 🟢 ส่วนที่ 3: ดึงข้อมูลบัญชีธนาคารของร้าน (Company Bank) ---
function getCompanyBanks() {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("CompanyBank");
    
    // ถ้ายังไม่มี Sheet ให้สร้างใหม่พร้อมใส่ข้อมูลตั้งต้น
    if (!sheet) {
      sheet = ss.insertSheet("CompanyBank");
      sheet.appendRow(["ชื่อบัญชีร้าน (สำหรับให้แอดมินเลือกตอนจ่ายเงิน)"]);
      sheet.appendRow(["เงินสดลิ้นชัก"]);
      sheet.appendRow(["KBank ร้าน (กสิกร)"]);
      sheet.appendRow(["SCB ร้าน (ไทยพาณิชย์)"]);
    }
    
    const data = sheet.getDataRange().getValues();
    let banks = [];
    
    // ดึงข้อมูลตั้งแต่บรรทัดที่ 2 (ข้ามหัวตาราง)
    for (let i = 1; i < data.length; i++) {
      let b = String(data[i][0]).trim();
      if (b !== "") banks.push(b);
    }
    
    return JSON.stringify(banks);
  } catch(e) { 
    return "[]"; 
  }
}

// 2. ฟังก์ชันอัปเดตสถานะคิว (อัปเกรดข้อความขอบคุณและปุ่มรีวิว Google Maps)
function updateBookingDetailsExtended(rowStr, status, date, time, stylist) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Bookings");
    if (!sheet) return "Error: ไม่พบหน้าชีต Bookings";

    let rowNum = parseInt(rowStr); 
    if (isNaN(rowNum) || rowNum <= 0) return "Error: หมายเลขบรรทัดไม่ถูกต้อง (" + rowStr + ")";

    let rowData = sheet.getRange(rowNum, 1, 1, 10).getDisplayValues()[0]; 
    let oldStatus = String(rowData[8]).trim();
    let phoneRaw = String(rowData[4] || "").replace(/[^0-9]/g, '').replace(/^0/, '');
    let name = String(rowData[5] || "-");
    let service = String(rowData[6] || "-");
    
    // อัปเดตข้อมูลในตาราง
    sheet.getRange(rowNum, 3).setValue(date);
    sheet.getRange(rowNum, 4).setValue(time);
    sheet.getRange(rowNum, 8).setValue(stylist);
    sheet.getRange(rowNum, 9).setValue(status);

    SpreadsheetApp.flush();

    // 🟢 Bot 1 (หน้าร้าน): ยิงตอบกลับลูกค้าถ้าสถานะเปลี่ยน
    if (status !== oldStatus) {
        let settings = {};
        try { settings = JSON.parse(getShopSettings()); } catch(e){}
        let bot1Token = settings.lineToken || ""; 
        let shopPhone = settings.phone || "";
        
        // 🌟 ใส่ลิงก์รีวิว Google Maps ของร้านคุณลูกค้าที่นี่ 🌟
        // (ตอนนี้ผมใส่ลิงก์ไปหน้าแรกของ Google ไว้ก่อน คุณลูกค้าสามารถเอาลิงก์ร้านตัวเองมาเปลี่ยนแทนที่ได้เลยครับ)
        let reviewLink = "https://g.page/r/CQv05D7ka1ntEBM/review"; 

        if (bot1Token) {
            let userId = getLineIdByPhone(phoneRaw);
            
            if (userId && userId.startsWith("U")) {
                let headerColor = "#64748B"; 
                let headerText = "อัปเดตสถานะคิว";
                let subHeaderText = "STATUS UPDATED";
                let bodyText = "อัปเดตสถานะคิวล่าสุดของคุณค่ะ";

                if (status === "ยืนยันแล้ว") {
                    headerColor = "#10B981"; 
                    headerText = "✅ ยืนยันคิวจองสำเร็จ";
                    subHeaderText = "BOOKING CONFIRMED";
                    bodyText = "ทางร้านได้ล็อกคิวของคุณเรียบร้อยแล้วค่ะ ขอบคุณที่ไว้วางใจใช้บริการนะคะ";
                } else if (status === "เสร็จสิ้น") {
                    headerColor = "#0284C7"; 
                    headerText = "🎉 ให้บริการเสร็จสิ้น";
                    subHeaderText = "SERVICE COMPLETED";
                    // 🌟 ข้อความขอรีวิวแบบน่ารักๆ
                    bodyText = "ทางร้านให้บริการเสร็จสิ้นเรียบร้อยแล้ว ขอบคุณที่ให้เราดูแลเส้นผมของคุณนะคะ หวังว่าคุณจะประทับใจและกลับมาใช้บริการอีกค่ะ 💖\n\n⭐ หากคุณลูกค้าชื่นชอบผลงาน รบกวนสละเวลาสักนิด ช่วยกดให้คะแนนรีวิวร้าน เพื่อเป็นกำลังใจให้ทีมช่างของเราด้วยนะคะ 🙏";
                } else if (status === "ยกเลิก") {
                    headerColor = "#EF4444"; 
                    headerText = "❌ คิวจองถูกยกเลิก";
                    subHeaderText = "BOOKING CANCELLED";
                    bodyText = "ทางร้านได้ยกเลิกคิวของคุณเรียบร้อยแล้วค่ะ หากมีข้อสงสัยสามารถติดต่อสอบถามร้านได้เลยนะคะ";
                } else if (status === "รอรับบริการ") {
                    headerColor = "#F59E0B"; 
                    headerText = "⏳ รอการยืนยัน";
                    subHeaderText = "PENDING CONFIRMATION";
                    bodyText = "มีการเปลี่ยนแปลงข้อมูลคิว กรุณารอแอดมินยืนยันอีกครั้งนะคะ";
                }

                let flexMsg = {
                  "type": "bubble",
                  "size": "kilo",
                  "header": {
                    "type": "box", "layout": "vertical", "paddingAll": "0px",
                    "contents": [{
                        "type": "box", "layout": "vertical", "backgroundColor": headerColor, "paddingAll": "20px", "alignItems": "center",
                        "contents": [
                          { "type": "text", "text": headerText, "color": "#ffffff", "weight": "bold", "size": "lg", "margin": "none" },
                          { "type": "text", "text": subHeaderText, "color": "#E2E8F0", "size": "xxs", "margin": "sm", "weight": "bold", "style": "italic" }
                        ]
                    }]
                  },
                  "body": {
                    "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px",
                    "contents": [
                      { "type": "text", "text": "เรียนคุณ " + name + ",", "weight": "bold", "size": "md", "color": "#1E293B" },
                      { "type": "text", "text": bodyText, "size": "sm", "color": "#475569", "wrap": true, "margin": "sm" },
                      {
                        "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "backgroundColor": "#F8FAFC", "paddingAll": "16px", "cornerRadius": "12px", "borderColor": "#E2E8F0", "borderWidth": "1px",
                        "contents": [
                          { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "📅 วันที่:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(date), "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "⏰ เวลา:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(time) + " น.", "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "💇‍♀️ บริการ:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(service), "size": "sm", "color": "#0284C7", "weight": "bold", "align": "end", "flex": 6, "wrap": true }] },
                          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "text", "text": "✂️ ช่าง:", "size": "xs", "color": "#64748B", "flex": 4 }, { "type": "text", "text": String(stylist), "size": "sm", "color": "#1E293B", "weight": "bold", "align": "end", "flex": 6 }] }
                        ]
                      }
                    ]
                  }
                };

                flexMsg.footer = {
                    "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "15px",
                    "contents": []
                };

                // 🌟 หากสถานะเป็น "เสร็จสิ้น" โชว์ปุ่มรีวิวดาวสีทองเด่นๆ
                if (status === "เสร็จสิ้น") {
                    flexMsg.footer.contents.push({
                        "type": "button", "style": "primary", "color": "#F59E0B", "height": "md",
                        "action": { "type": "uri", "label": "⭐⭐⭐⭐⭐ ให้คะแนนร้าน", "uri": reviewLink }
                    });
                }

                // ปุ่มโทรติดต่อร้าน
                if (shopPhone && shopPhone !== "-") {
                    flexMsg.footer.contents.push({
                        "type": "button", "style": "secondary", "color": "#F1F5F9", "height": "sm",
                        "action": { "type": "uri", "label": "📞 โทรติดต่อร้าน", "uri": "tel:" + shopPhone }
                    });
                }
                
                let payload = { "to": userId, "messages": [{ "type": "flex", "altText": headerText, "contents": flexMsg }] };
                let options = { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + bot1Token }, "payload": JSON.stringify(payload), "muteHttpExceptions": true };
                UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
            }
        }
    }
    return "success";
  } catch (e) { 
    return "Error (System): " + e.message; 
  }
}

// 📅 ฟังก์ชันลับดึงข้อมูลคิวงานรายเดือน (เชื่อมต่อหน้าปฏิทินร้าน Kori Hair salon POS)
// 📅 ฟังก์ชันดึงข้อมูลคิวงานรายเดือน (รองรับการดึงวันหยุดยาวแบบหลายวันจาก Calendar)
function getMonthlyBookingsUI(month, year) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Bookings");
    if (!sheet) return "[]";
    
    let results = [];
    
    // 🌟 1. ดึงข้อมูลวันหยุดจาก Google Calendar ตลอดทั้งเดือน
    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(e) {}
    const calId = settings.calendarId;
    
    if (calId) {
      try {
        const cal = CalendarApp.getCalendarById(calId);
        if (cal) {
          // ดึงตั้งแต่วันแรกของเดือน ถึง วันสุดท้ายของเดือน
          let startDate = new Date(year, month - 1, 1);
          let endDate = new Date(year, month, 0); 
          let events = cal.getEvents(startDate, endDate);
          
          for (let i = 0; i < events.length; i++) {
            let title = events[i].getTitle().toLowerCase();
            if (title.includes('หยุด') || title.includes('ปิดร้าน') || title.includes('closed') || title.includes('holiday') || title.includes('ธุระ')) {
              
              let eStart = events[i].getStartTime();
              let eEnd = events[i].getEndTime();
              
              // 🌟 ลูปวาดป้ายวันหยุดตั้งแต่วันเริ่ม ไปจนถึงวันสิ้นสุด
              let currentDate = new Date(eStart.getTime());
              while (currentDate < eEnd) {
                // เช็คว่าต้องเป็นเดือนที่กำลังเปิดดูอยู่เท่านั้น ถึงจะวาดป้าย
                if (currentDate.getMonth() === (month - 1)) {
                  let formattedDate = currentDate.getDate() + "/" + String(currentDate.getMonth() + 1).padStart(2, '0') + "/" + currentDate.getFullYear();
                  
                  results.push({
                    row: 0, 
                    date: formattedDate, 
                    time: "ตลอดวัน", 
                    phone: "-",
                    name: events[i].getTitle(), 
                    service: "วันหยุดร้าน", 
                    stylist: "-", 
                    status: "วันหยุด" 
                  });
                }
                // บวกวันเพิ่มทีละ 1 วัน เลื่อนไปเช็ควันถัดไป
                currentDate.setDate(currentDate.getDate() + 1); 
              }
            }
          }
        }
      } catch(calErr) { 
        console.log("Calendar Error: " + calErr.message); 
      }
    }
    
    // 🌟 2. ดึงข้อมูลคิวลูกค้าปกติมาเรียงต่อ
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      let rowDateStr = data[i][2]; // คอลัมน์ C: วันที่นัดหมาย
      if (!rowDateStr || data[i][8] === "ยกเลิก") continue;
      
      let d, m, y;
      if (rowDateStr.includes("/")) {
        let parts = rowDateStr.split("/");
        d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
      } else if (rowDateStr.includes("-")) {
        let parts = rowDateStr.split("-");
        d = parseInt(parts[2]); m = parseInt(parts[1]); y = parseInt(parts[0]);
      } else {
        continue;
      }
      
      if (y > 2500) y -= 543;
      
      if (m === parseInt(month) && y === parseInt(year)) {
        let formattedDate = d + "/" + String(m).padStart(2, '0') + "/" + y;
        
        results.push({
          row: i + 1,
          date: formattedDate,
          time: data[i][3].substring(0, 5), 
          phone: data[i][4],                
          name: data[i][5],                 
          service: data[i][6],              
          stylist: data[i][7],              
          status: data[i][8]                
        });
      }
    }
    return JSON.stringify(results);
  } catch (e) {
    return "[]";
  }
}
// =========================================================
// 🎂 ระบบอัตโนมัติ: เช็กวันเกิดและส่งโปรโมชัน (รันทุกเช้า)
// =========================================================
function checkBirthdaysAndNotify() {
  try {
    const ss = getActiveSS();
    const memSheet = ss.getSheetByName("Members");
    if (!memSheet) return;

    // ดึงค่า Token ของร้าน
    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(e) {}
    const LINE_ACCESS_TOKEN = settings.lineToken || "";
    const shopName = settings.shopName || "Kori Hair salon POS";
    if (!LINE_ACCESS_TOKEN) return; // ถ้าไม่มี Token ระบบจะไม่ทำงาน

    const data = memSheet.getDataRange().getValues();
    const today = new Date();
    // ดึงวันที่และเดือนปัจจุบันมาเทียบ (รูปแบบ 01 ถึง 12)
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');

    // วนลูปเช็กข้อมูลสมาชิกทุกคน
    for (let i = 1; i < data.length; i++) {
      let name = data[i][1];
      let lineId = String(data[i][5] || "").trim(); // คอลัมน์ F (LINE ID)
      let dob = String(data[i][6] || "").trim();    // คอลัมน์ G (วันเกิด)

      // เช็กว่ามี LINE ID (ต้องขึ้นต้นด้วย U) และมีการกรอกวันเกิดไว้
      if (lineId && lineId.startsWith("U") && dob && dob !== "-") {
        // วันเกิดจากระบบจะมาเป็นรูปแบบ YYYY-MM-DD (เช่น 2026-05-20)
        let dobParts = dob.split("-");
        if (dobParts.length === 3) {
          let dobMonth = dobParts[1];
          let dobDay = dobParts[2];

          // ถ้า "เดือน" และ "วัน" ตรงกับวันนี้ ให้ส่งข้อความ
          if (dobMonth === currentMonth && dobDay === currentDay) {
            sendBirthdayFlexMessage(lineId, name, shopName, LINE_ACCESS_TOKEN);
          }
        }
      }
    }
  } catch (e) {
    console.log("Birthday Trigger Error: " + e.message);
  }
}

// 🎁 ฟังก์ชันส่งการ์ดวันเกิด (Flex Message)
function sendBirthdayFlexMessage(userId, customerName, shopName, token) {
  let flexContents = {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#F472B6", // สีชมพูวันเกิด
      "contents": [
        { "type": "text", "text": "🎉 Happy Birthday! 🎂", "weight": "bold", "color": "#ffffff", "size": "xl", "align": "center" }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        { "type": "text", "text": "สุขสันต์วันเกิดคุณ " + customerName, "weight": "bold", "size": "md", "color": "#1E293B", "wrap": true },
        { "type": "text", "text": "ขอให้มีความสุขมากๆ สุขภาพแข็งแรงนะคะ ทางร้าน " + shopName + " ขอมอบของขวัญสุดพิเศษสำหรับคุณโดยเฉพาะ 💖", "size": "sm", "color": "#475569", "wrap": true, "margin": "md" },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#FDF2F8",
          "paddingAll": "md",
          "cornerRadius": "md",
          "margin": "lg",
          "borderWidth": "1px",
          "borderColor": "#FBCFE8",
          "contents": [
            { "type": "text", "text": "🎁 รับส่วนลด 20%", "weight": "bold", "color": "#E11D48", "size": "lg" },
            { "type": "text", "text": "สำหรับบริการทำผมทุกประเภท ภายในเดือนเกิดนี้ เพียงแสดงข้อความนี้ให้ช่างดูตอนคิดเงินค่ะ", "size": "xs", "color": "#64748B", "wrap": true, "margin": "sm" }
          ]
        }
      ]
    }
  };

  let payload = {
    "to": userId,
    "messages": [{ "type": "flex", "altText": "🎁 สุขสันต์วันเกิดจาก " + shopName, "contents": flexContents }]
  };

  let options = {
    "method": "post",
    "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options); } catch(e) { console.log(e); }
}
// 🟢 1. ฟังก์ชันผูก LINE ID เข้ากับเบอร์โทรลูกค้าในหน้า Members อัตโนมัติ
function linkLineIdToMember(phone, userId) {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Members");
    if (!sheet) return "error";

    const data = sheet.getDataRange().getValues();
    let inputPhone = String(phone).replace(/\D/g, '').replace(/^0/, '');

    for (let i = 1; i < data.length; i++) {
      let rowPhone = String(data[i][0]).replace(/\D/g, '').replace(/^0/, '');
      if (rowPhone === inputPhone) {
        let currentId = String(data[i][5] || "").trim();
        
        // ถ้าเคยผูกไว้แล้วและมี U นำหน้าสมบูรณ์
        if (currentId !== "" && currentId.startsWith("U")) {
          return "already_linked";
        } else {
          // บันทึก User ID สดๆ จาก LINE (ซึ่งจะมีตัว U นำหน้าเสมอ) ลงคอลัมน์ F
          sheet.getRange(i + 1, 6).setValue(userId);
          return "success";
        }
      }
    }
    return "not_found";
  } catch (e) {
    return "error";
  }
}

// 🟢 2. ฟังก์ชันให้บอท LINE ตอบกลับลูกค้าว่าผูกเบอร์สำเร็จหรือไม่
function replyToLine(replyToken, textMsg, token) {
  try {
    let payload = {
      "replyToken": replyToken,
      "messages": [{ "type": "text", "text": textMsg }]
    };
    let options = {
      "method": "post",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);
  } catch(e) {}
}
// ==========================================
// 🟢 ระบบดึงข้อมูลและสร้างใบรอจ่าย (Payables) จากหน้าเว็บ
// ==========================================

function getPayablesList() {
  try {
    const ss = getActiveSS();
    const sheet = ss.getSheetByName("Payables");
    if (!sheet) return "[]";
    const data = sheet.getDataRange().getDisplayValues();

    // 🌟 1. ดึงข้อมูล Vendors สดๆ แบบ Real-time มาเตรียมไว้
    const vSheet = ss.getSheetByName("Vendors");
    let vendorMap = {};
    if (vSheet) {
      const vData = vSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < vData.length; i++) {
        let vName = String(vData[i][0] || "").trim();
        if (vName) {
          // แปลงชื่อให้เป็น Key มาตรฐาน (ตัดช่องว่าง การเว้นบรรทัดออกทั้งหมด)
          let cleanKey = vName.replace(/[\s\n\r\t]+/g, '').toLowerCase();
          vendorMap[cleanKey] = {
            name: vName, // เก็บชื่อเต็มที่จัดฟอร์แมตถูกต้องไว้ด้วย
            bank: String(vData[i][1] || "").trim(),
            account: String(vData[i][2] || "").trim(),
            method: String(vData[i][3] || "").trim(),
            note: String(vData[i][4] || "").trim()
          };
        }
      }
    }

    let list = [];
    // 🌟 2. วนลูปบิลใน Payables
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === "รอจ่าย") {
        let originalVendorName = String(data[i][2] || "-").trim();
        let cleanSearch = originalVendorName.replace(/[\s\n\r\t]+/g, '').toLowerCase();

        let displayVendorName = originalVendorName;
        let bankInfo = "";
        let methodInfo = "";
        let noteInfo = "";
        let defaultPayMethod = ""; 

        // 🌟 3. ถ้าเจอในฐานข้อมูล Vendors (ดึงข้อมูลล่าสุดมาทับของเก่าเลย)
        if (vendorMap[cleanSearch]) {
            displayVendorName = vendorMap[cleanSearch].name; // ใช้ชื่อสวยๆ จากตารางคู่ค้า
            if (vendorMap[cleanSearch].account && vendorMap[cleanSearch].account !== "-") {
                bankInfo = (vendorMap[cleanSearch].bank ? vendorMap[cleanSearch].bank + " " : "") + vendorMap[cleanSearch].account;
            }
            methodInfo = vendorMap[cleanSearch].method || "-";
            noteInfo = vendorMap[cleanSearch].note || "";

            // ตั้งค่า Dropdown อัตโนมัติให้หน้าเว็บ
            let m = methodInfo.toLowerCase();
            if(m.includes('mobile') || m.includes('โอน') || m.includes('app') || m.includes('qr')) defaultPayMethod = 'เงินโอน';
            else if(m.includes('cash') || m.includes('เงินสด') || m.includes('counter') || m.includes('7-11')) defaultPayMethod = 'เงินสด';
            else if(m.includes('credit') || m.includes('บัตร')) defaultPayMethod = 'บัตรเครดิต';

        } else {
            // 4. ถ้าไม่เจอ (เช่น คู่ค้าถูกลบไปแล้ว) ใช้ข้อมูลเดิมที่บันทึกไว้ในบิล
            bankInfo = data[i][6] && data[i][6] !== "-" ? data[i][6] : "-";
            methodInfo = data[i][10] || "-"; 
            noteInfo = "";
        }

        list.push({
          row: i + 1,
          date: data[i][0] || "-",        
          vendor: displayVendorName,             
          docNo: data[i][3] || "-",       
          billDate: data[i][4] || "-",    
          amount: parseFloat(String(data[i][5]).replace(/,/g, '')) || 0, 
          account: data[i][6] || "-",     
          vendorBankInfo: bankInfo,       
          vendorMethod: methodInfo,       
          vendorNote: noteInfo,           
          dueDate: data[i][9] || "-",
          defaultPayMethod: defaultPayMethod || "เงินโอน" // ส่งไป Auto-select หน้าเว็บ
        });
      }
    }
    return JSON.stringify(list.reverse());
  } catch(e) { 
    return "[]"; 
  }
}

function getShiftStatus() {
  try {
    const ss = getActiveSS();
    const drawerSheet = ss.getSheetByName("CashDrawer");
    
    let now = new Date();
    let todayStr = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy");

    if (!drawerSheet) return JSON.stringify({ status: "NO_SHEET", today: todayStr });

    const data = drawerSheet.getDataRange().getValues();
    
    let lastStatus = "CLOSED"; 
    let pendingDate = null;
    let lastClosingAmount = 0; 
    let lastCloseDateStr = null; 

    // สแกนจากล่างขึ้นบน (ข้อมูลล่าสุด)
    for (let i = data.length - 1; i >= 1; i--) {
      let type = String(data[i][2]).trim();
      
      let bDateRaw = data[i][1];
      let bDate = "";
      if (bDateRaw instanceof Date) {
          bDate = Utilities.formatDate(bDateRaw, "Asia/Bangkok", "dd/MM/yyyy");
      } else {
          bDate = String(bDateRaw).trim();
          if (bDate.length > 15 && isNaN(bDate.charAt(0))) {
              try {
                  let d = new Date(bDate);
                  if (!isNaN(d.getTime())) bDate = Utilities.formatDate(d, "Asia/Bangkok", "dd/MM/yyyy");
              } catch(e) {}
          }
      }

      let amount = parseFloat(data[i][3]) || 0; 

      if (type === "นำเงินทอนเข้า") {
        lastStatus = "OPEN";
        pendingDate = bDate;
        break; 
      } else if (type === "บันทึกปิดยอด") {
        lastStatus = "CLOSED";
        lastClosingAmount = amount; 
        lastCloseDateStr = bDate; 
        break; 
      }
    }

    if (lastStatus === "OPEN") {
      // ถ้าเก๊ะเปิดอยู่ และ ไม่ใช่วันนี้ = ลืมปิดกะ
      if (pendingDate !== todayStr) {
        return JSON.stringify({ status: "FORGOT_TO_CLOSE", pendingDate: pendingDate, today: todayStr });
      } else {
        // ถ้าเก๊ะเปิดอยู่ และ เป็นของวันนี้ = ใช้งานได้ปกติ
        return JSON.stringify({ status: "OPEN_TODAY" });
      }
    } else {
      // 🌟 ถ้าระบบปิดกะไปแล้ว บังคับส่งสถานะให้ "ล็อกหน้าจอ" เพื่อรอเปิดกะใหม่เสมอ
      return JSON.stringify({ status: "CLOSED_PROPERLY", today: todayStr, lastAmount: lastClosingAmount });
    }
  } catch (e) {
    return JSON.stringify({ status: "ERROR", msg: e.message });
  }
}

// 🟢 ฟังก์ชันสำหรับตรวจสอบ PIN ของพนักงาน (หน้ามือถือ)
function verifyMobilePin(pin) {
  try {
    const sheet = getActiveSS().getSheetByName("Staff");
    if (!sheet) return { success: false, msg: "ไม่พบชีต Staff" };
    
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0];
    let pinCol = -1;
    
    // หาว่าคอลัมน์ PIN อยู่ช่องไหน
    for(let i=0; i<headers.length; i++) {
      if(headers[i].toString().toUpperCase() === 'PIN') { pinCol = i; break; }
    }
    if(pinCol === -1) pinCol = 9; // ถ้าหาไม่เจอ ให้ใช้คอลัมน์ J (Index 9) อ้างอิงจากรูป
    
    for(let i=1; i<data.length; i++) {
      if(String(data[i][pinCol]) === String(pin)) {
        return { success: true, name: data[i][0] }; // ส่งชื่อพนักงานกลับไป
      }
    }
    return { success: false, msg: "รหัส PIN ไม่ถูกต้อง!" };
  } catch(e) { 
    return { success: false, msg: e.message }; 
  }
}
// 🟢 ฟังก์ชันสำหรับบันทึกใบรอจ่ายจากการคีย์มือ (หน้าเว็บ)
function addManualPayable(data) {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("Payables");
    if (!sheet) {
      sheet = ss.insertSheet("Payables");
      sheet.appendRow(["วันที่สแกน", "ผู้เบิก", "คู่ค้า/บริษัท", "เลขที่บิล", "รอบบิล/วันที่", "ยอดเงิน", "เลขบัญชี", "สถานะ", "อ้างอิงภาพ", "วันครบกำหนด", "ช่องทางชำระ"]);
    }
    
    let ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    
    // ลองหาเลขบัญชีและช่องทางชำระจากฐานข้อมูลคู่ค้า (Vendors) อัตโนมัติ
    let bankAccount = "-";
    let defaultChannel = "-";
    try {
      const vSheet = ss.getSheetByName("Vendors");
      if (vSheet) {
        const vData = vSheet.getDataRange().getValues();
        // 🌟 ลบช่องว่างและเว้นบรรทัดออกทั้งหมด เพื่อเทียบชื่อให้ตรงกัน 100%
        let inputVendorKey = String(data.vendor).replace(/\s+/g, '').toLowerCase();
        
        for(let i=1; i<vData.length; i++) {
          let sheetVendorKey = String(vData[i][0]).replace(/\s+/g, '').toLowerCase();
          if(sheetVendorKey === inputVendorKey) {
            bankAccount = String(vData[i][2] || "-").trim(); // ดึงเลขบัญชี
            defaultChannel = String(vData[i][3] || "-").trim(); // ดึงช่องทางชำระ
            break;
          }
        }
      }
    } catch(e) {}

    // บันทึกลง Sheet Payables
    sheet.appendRow([
      ts, 
      "ระบบเว็บ (คีย์มือ)", 
      data.vendor, 
      data.docNo || "-", 
      data.billDate || "-", 
      data.amount, 
      bankAccount, 
      "รอจ่าย", 
      "คีย์มือจากหน้าเว็บ", 
      data.dueDate || "-", 
      defaultChannel
    ]);
    
    return "success";
  } catch (e) {
    return "error";
  }
}
// 🌟 ฟังก์ชันพิเศษสำหรับบังคับขอสิทธิ์ Google Drive
function AuthorizeDrive() {
  let files = DriveApp.getFiles();
  console.log("✅ ยืนยันสิทธิ์ Google Drive สำเร็จแล้ว!");
}

// ==========================================
// 2. ฟังก์ชันปิดยอดรายวัน (ล็อกเป้ายิงเข้ากลุ่มสรุปยอด B17 + ล้างบั๊ก LINE)
// ==========================================
function closeShiftAndNotify(d) {
  try {
    const ss = getActiveSS();
    const s = ss.getSheetByName("CashDrawer");
    if (!s) return "no_sheet";
    
    const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    let closerName = d.staffName || "ไม่ระบุ"; 

    let drawerNote = "ปิดกะประจำวัน (โดย: " + closerName + ")";
    if (d.closeNote && d.closeNote.trim() !== "") {
        drawerNote += " [หมายเหตุ: " + d.closeNote + "]";
    }

    s.appendRow(["'" + ts, "'" + d.date, "บันทึกปิดยอด", d.actualCash, drawerNote]);

    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(e){}
    
    // 🚨 ล็อกเป้าหมาย: บังคับดึง Token ของ Bot 2 และ Group ID ของกลุ่มสรุปยอด (คอลัมน์ B17) 🚨
    const token = String(settings.lineTokenAdmin || settings.lineToken || "").trim();
    const groupId = String(settings.lineReportGroupId || "").trim(); 
    
    if (!token || !groupId) return "Error: ไม่พบข้อมูล Token หรือ Group ID สรุปยอด (B17)"; 

    let report;
    try { report = JSON.parse(d.reportDataStr); } catch(e) { report = { netTotal: 0 }; }

    let shopName = settings.shopName || "KORI POS";
    
    let dParts = d.date.split("/"); 
    let currentMonthStr = dParts[1] + "/" + dParts[2];
    let target = getTargetForMonth(currentMonthStr);
    
    let monthlyDataStr = getReportData('monthly', currentMonthStr);
    let monthlyData = (monthlyDataStr && monthlyDataStr !== "null") ? JSON.parse(monthlyDataStr) : { netTotal: 0 };
    let currentMonthlySales = monthlyData.netTotal || 0;
    
    let targetContents = [];
    if (target > 0) {
        let progressPct = ((currentMonthlySales / target) * 100).toFixed(1);
        let isHit = currentMonthlySales >= target;
        let progressText = isHit ? "🎉 ทะลุเป้าหมายแล้ว!" : "⏳ ขาดอีก " + (target - currentMonthlySales).toLocaleString() + " ฿";
        
        targetContents = [
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "🎯 ความคืบหน้าเป้ายอดขายเดือนนี้", "weight": "bold", "color": "#1E293B", "size": "sm", "margin": "md" },
          { "type": "box", "layout": "vertical", "backgroundColor": isHit ? "#ECFDF5" : "#FFFBEB", "paddingAll": "12px", "cornerRadius": "8px", "borderColor": isHit ? "#A7F3D0" : "#FDE68A", "borderWidth": "1px", "margin": "sm",
            "contents": [
              { "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "ยอดสะสมปัจจุบัน", "size": "xs", "color": "#64748B" },
                { "type": "text", "text": currentMonthlySales.toLocaleString() + " / " + target.toLocaleString() + " ฿", "size": "xs", "align": "end", "weight": "bold", "color": "#1E293B" }
              ]},
              { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                { "type": "text", "text": "สถานะ:", "size": "sm", "color": "#64748B", "weight": "bold" },
                { "type": "text", "text": progressPct + "%", "size": "md", "align": "end", "weight": "bold", "color": isHit ? "#059669" : "#D97706" }
              ]},
              { "type": "text", "text": progressText, "size": "xs", "align": "end", "color": isHit ? "#059669" : "#D97706", "margin": "xs", "weight": "bold" }
            ]
          }
        ];
    }

    let catContents = []; let hasCategory = false;
    if (report.serviceCategories && Object.keys(report.serviceCategories).length > 0) {
      let catArr = Object.entries(report.serviceCategories).sort((a,b) => b[1] - a[1]);
      catArr.forEach(x => { catContents.push({ "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "🔸 " + x[0], "size": "sm", "color": "#475569", "flex": 2 }, { "type": "text", "text": x[1].toLocaleString() + " ฿", "size": "sm", "color": "#0284C7", "align": "end", "weight": "bold", "flex": 1 } ] }); });
      hasCategory = true;
    }
    let totalProduct = (report.dash && report.dash.totalProduct) ? report.dash.totalProduct : 0;
    if (totalProduct > 0) { catContents.push({ "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "📦 สินค้าหน้าร้าน", "size": "sm", "color": "#475569", "flex": 2 }, { "type": "text", "text": totalProduct.toLocaleString() + " ฿", "size": "sm", "color": "#D97706", "align": "end", "weight": "bold", "flex": 1 } ] }); hasCategory = true; }
    let totalCourse = (report.dash && report.dash.totalCourse) ? report.dash.totalCourse : 0;
    if (totalCourse > 0) { catContents.push({ "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "🎟️ ขายคอร์ส", "size": "sm", "color": "#475569", "flex": 2 }, { "type": "text", "text": totalCourse.toLocaleString() + " ฿", "size": "sm", "color": "#059669", "align": "end", "weight": "bold", "flex": 1 } ] }); hasCategory = true; }
    if (!hasCategory) { catContents.push({ "type": "text", "text": "- ไม่มีรายการขายในวันนี้ -", "size": "sm", "color": "#94A3B8", "margin": "xs" }); }

    let expContents = [];
    if (report.expensesList && report.expensesList.length > 0) {
       report.expensesList.forEach(e => { expContents.push({ "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "- " + e.name, "size": "xs", "color": "#64748B", "flex": 2, "wrap": true }, { "type": "text", "text": e.amount.toLocaleString() + " ฿", "size": "xs", "align": "end", "color": "#EF4444", "flex": 1 } ] }); });
       expContents.push({ "type": "separator", "margin": "sm", "color": "#E2E8F0" });
       expContents.push({ "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "รวมเบิกรายจ่ายทั้งหมด:", "size": "sm", "weight": "bold", "color": "#1E293B" }, { "type": "text", "text": report.expenseTotal.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#EF4444" } ] });
    } else {
       expContents.push({ "type": "text", "text": "- ไม่มีการเบิกจ่าย -", "size": "sm", "color": "#94A3B8", "margin": "xs" });
    }

    let diff = d.actualCash - d.expectedCash;
    let diffColor = diff > 0 ? "#10B981" : (diff < 0 ? "#EF4444" : "#64748B");
    let diffText = diff > 0 ? "+" + diff.toLocaleString() + " (เกิน)" : (diff < 0 ? diff.toLocaleString() + " (ขาด)" : "0 (พอดี)");

    let noteBox = [];
    if (d.closeNote && d.closeNote.trim() !== "") {
        noteBox = [
            { "type": "box", "layout": "horizontal", "margin": "sm", "backgroundColor": "#FEF2F2", "paddingAll": "8px", "cornerRadius": "6px", "contents": [
                { "type": "text", "text": "หมายเหตุ:", "size": "sm", "weight": "bold", "color": "#B91C1C", "flex": 1 },
                { "type": "text", "text": d.closeNote, "size": "sm", "weight": "bold", "color": "#B91C1C", "flex": 3, "wrap": true }
            ]}
        ];
    }

    let grossTotal = report.netTotal + report.discountTotal + (report.depositDeductionTotal || 0);

    let floatIn = report.drawer ? (report.drawer.floatIn || 0) : 0;
    let addedFloatIn = (report.drawer && report.drawer.addedFloatIn) ? report.drawer.addedFloatIn : 0;
    let cashSales = report.cash || 0;
    let bankDep = report.bankDepositTotal || 0;
    let cashExp = report.drawerCashExpenses || 0; 

    let flexContents = {
      "type": "bubble", "size": "kilo",
      "header": {
        "type": "box", "layout": "vertical", "backgroundColor": "#1E293B",
        "contents": [
          { "type": "text", "text": "📊 สรุปยอดปิดกะประจำวัน", "weight": "bold", "color": "#FFFFFF", "size": "lg" },
          { "type": "text", "text": "ร้าน: " + shopName + " (" + d.date + ")", "color": "#94A3B8", "size": "xs", "margin": "xs" },
          { "type": "text", "text": "ผู้ทำรายการ: " + closerName, "color": "#34D399", "size": "xs", "weight": "bold" } 
        ]
      },
      "body": {
        "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px",
        "contents": [
          { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDF4", "paddingAll": "12px", "cornerRadius": "8px", "borderColor": "#BBF7D0", "borderWidth": "1px", "margin": "none",
            "contents": [
              { "type": "text", "text": "ยอดขายรวมทั้งหมด (Gross)", "size": "xs", "color": "#166534", "weight": "bold" },
              { "type": "text", "text": grossTotal.toLocaleString() + " ฿", "size": "md", "weight": "bold", "color": "#15803D" },
              { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "หักส่วนลด", "size": "xs", "color": "#DC2626" }, { "type": "text", "text": "-" + report.discountTotal.toLocaleString(), "size": "xs", "align": "end", "color": "#DC2626" }]},
              { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "หักมัดจำ", "size": "xs", "color": "#DC2626" }, { "type": "text", "text": "-" + (report.depositDeductionTotal || 0).toLocaleString(), "size": "xs", "align": "end", "color": "#DC2626" }]},
              { "type": "separator", "margin": "sm", "color": "#BBF7D0" },
              { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "รับเงินจริงสุทธิ", "size": "sm", "weight": "bold", "color": "#15803D" }, { "type": "text", "text": report.netTotal.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#15803D" }]}
            ]
          },
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "📈 แยกตามหมวดหมู่", "weight": "bold", "color": "#1E293B", "size": "sm" },
          { "type": "box", "layout": "vertical", "margin": "sm", "contents": catContents },
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "💳 สรุปรายรับทั้งหมด", "weight": "bold", "color": "#1E293B", "size": "sm" },
          { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "เงินโอน", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.transfer.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#1E293B" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "เงินสด", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.cash.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#1E293B" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "บัตรเครดิต", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.credit.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#1E293B" }]},
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "💸 สรุปรายจ่ายร้าน", "weight": "bold", "color": "#1E293B", "size": "sm" },
          { "type": "box", "layout": "vertical", "margin": "sm", "contents": expContents },
          
          // 🌟 โซนรายงานเงินเก๊ะ (แก้บั๊กเส้นคั่นที่ทำให้ LINE ส่งไม่ผ่าน)
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "💵 สรุปเงินสดในลิ้นชัก", "weight": "bold", "color": "#1E293B", "size": "sm" },
          { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "เงินทอน/ยอดยกมา", "size": "xs", "color": "#64748B" }, { "type": "text", "text": (floatIn + addedFloatIn).toLocaleString() + " ฿", "size": "xs", "align": "end" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "รับเงินสด (+)", "size": "xs", "color": "#10B981" }, { "type": "text", "text": cashSales.toLocaleString() + " ฿", "size": "xs", "align": "end", "color": "#10B981" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "รายจ่ายเงินสด (-)", "size": "xs", "color": "#EF4444" }, { "type": "text", "text": cashExp.toLocaleString() + " ฿", "size": "xs", "align": "end", "color": "#EF4444" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "นำฝากธนาคาร (-)", "size": "xs", "color": "#3B82F6" }, { "type": "text", "text": bankDep.toLocaleString() + " ฿", "size": "xs", "align": "end", "color": "#3B82F6" }]},
          { "type": "separator", "margin": "sm", "color": "#CBD5E1" },
          { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "ยอดที่ควรมีสุทธิ:", "size": "sm", "color": "#1E293B", "weight": "bold" }, { "type": "text", "text": d.expectedCash.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "นับได้จริง:", "size": "sm", "weight": "bold", "color": "#1E293B" }, { "type": "text", "text": d.actualCash.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#1E293B" }]},
          { "type": "box", "layout": "horizontal", "margin": "sm", "backgroundColor": "#F1F5F9", "paddingAll": "8px", "cornerRadius": "6px", "contents": [ { "type": "text", "text": "ส่วนต่าง:", "size": "sm", "weight": "bold", "color": "#475569" }, { "type": "text", "text": diffText, "size": "sm", "align": "end", "weight": "bold", "color": diffColor }]},
          
          ...noteBox,
          ...targetContents
        ]
      }
    };

    let payload = { "to": groupId, "messages": [{ "type": "flex", "altText": "📊 สรุปยอดปิดกะร้าน " + shopName, "contents": flexContents }] };
    let options = { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + token }, "payload": JSON.stringify(payload), "muteHttpExceptions": true };
    
    let response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
    
    // ดัก Error ว่าบรรทัดไหนพิมพ์ผิด จะได้ฟ้องที่หน้าจอ
    if (response.getResponseCode() !== 200) {
        return "LINE API Error: " + response.getContentText();
    }
    
    return "success";
  } catch(e) { return "System Error: " + e.message; }
}


// ====================================================================
// 🟢 ฟังก์ชันใหม่: ส่งสรุปรายเดือน สิ้นเดือน และ โบนัส (Z-Reading Monthly)
// ====================================================================
function sendMonthlySummaryToLine(monthYearStr) {
  try {
    let settings = {};
    try { settings = JSON.parse(getShopSettings()); } catch(e){}
    const token = settings.lineToken || "";
    const groupId = settings.lineReportGroupId || settings.lineAdminId || "";
    if (!token || !groupId) return "success"; 

    let shopName = settings.shopName || "KORI POS";
    
    // 🌟 ดึงเป้าหมายจากชีต MonthlyTargets (แทนการตั้งค่ารวม)
    let target = getTargetForMonth(monthYearStr);
    
    let monthlyDataStr = getReportData('monthly', monthYearStr);
    if (!monthlyDataStr) return "no_data";
    let report = JSON.parse(monthlyDataStr);
    
    let currentMonthlySales = report.netTotal || 0;
    let progressPct = target > 0 ? ((currentMonthlySales / target) * 100).toFixed(1) : 0;
    let isHit = currentMonthlySales >= target;
    
    let bonusContents = [];
    if (target > 0) {
        let text1 = isHit ? "🎉 ยินดีด้วย! ยอดขายทะลุเป้าหมาย" : "⚠️ น่าเสียดาย! ยอดขายยังไม่ถึงเป้า";
        let text2 = isHit ? `ทำได้ ${progressPct}% เข้าเงื่อนไขพิจารณาโบนัส` : `ทำได้ ${progressPct}% (ขาดอีก ${(target - currentMonthlySales).toLocaleString()} ฿)`;
        
        bonusContents = [
          { "type": "box", "layout": "vertical", "backgroundColor": isHit ? "#ECFDF5" : "#FFFBEB", "paddingAll": "15px", "cornerRadius": "8px", "borderColor": isHit ? "#A7F3D0" : "#FDE68A", "borderWidth": "2px", "margin": "md",
            "contents": [
              { "type": "text", "text": "🎯 ประเมินผลเป้าหมายโบนัส", "weight": "bold", "color": isHit ? "#065F46" : "#92400E", "size": "sm", "margin": "none" },
              { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                { "type": "text", "text": "เป้าหมาย", "size": "sm", "color": "#64748B" },
                { "type": "text", "text": target.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold" }
              ]},
              { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [
                { "type": "text", "text": "ยอดขายจริง", "size": "sm", "color": "#64748B" },
                { "type": "text", "text": currentMonthlySales.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": isHit ? "#059669" : "#D97706" }
              ]},
              { "type": "separator", "margin": "sm", "color": isHit ? "#A7F3D0" : "#FDE68A" },
              { "type": "text", "text": text1, "size": "sm", "color": isHit ? "#059669" : "#D97706", "weight": "bold", "margin": "sm" },
              { "type": "text", "text": text2, "size": "xs", "color": isHit ? "#059669" : "#D97706", "margin": "xs" }
            ]
          }
        ];
    } else {
        bonusContents = [
          { "type": "box", "layout": "vertical", "backgroundColor": "#F1F5F9", "paddingAll": "12px", "cornerRadius": "8px", "margin": "md", "contents": [
            { "type": "text", "text": "ไม่มีการตั้งเป้าหมายยอดขายในเดือนนี้", "size": "xs", "color": "#64748B", "align": "center" }
          ]}
        ];
    }

    let internalUseCost = report.internalUseCost || 0;
    let totalProdCost = (report.dash && report.dash.totalProductCost) ? report.dash.totalProductCost : 0;
    let staffComm = report.staffCommissionTotal || 0;
    let trueNetProfit = report.netTotal - report.expenseTotal - staffComm - totalProdCost - internalUseCost;

    let flexContents = {
      "type": "bubble", "size": "kilo",
      "header": {
        "type": "box", "layout": "vertical", "backgroundColor": "#6D28D9",
        "contents": [
          { "type": "text", "text": "🏆 สรุปยอดขายประจำเดือน", "weight": "bold", "color": "#FFFFFF", "size": "xl" },
          { "type": "text", "text": "ร้าน: " + shopName + " (ประจำเดือน " + monthYearStr + ")", "color": "#C4B5FD", "size": "xs", "margin": "xs" }
        ]
      },
      "body": {
        "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px",
        "contents": [
          ...bonusContents,
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          
          { "type": "text", "text": "📈 สรุปผลประกอบการ (P&L)", "weight": "bold", "color": "#1E293B", "size": "sm", "margin": "md" },
          { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "(+) รายรับจริง (Net Sales)", "size": "sm", "color": "#10B981" }, { "type": "text", "text": report.netTotal.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#10B981" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "(-) ต้นทุนสินค้าขาย", "size": "xs", "color": "#EF4444" }, { "type": "text", "text": "- " + totalProdCost.toLocaleString(), "size": "xs", "align": "end", "color": "#EF4444" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "(-) รายจ่ายจิปาถะ", "size": "xs", "color": "#EF4444" }, { "type": "text", "text": "- " + report.expenseTotal.toLocaleString(), "size": "xs", "align": "end", "color": "#EF4444" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "(-) ค่าคอมมิชชันช่าง", "size": "xs", "color": "#EF4444" }, { "type": "text", "text": "- " + staffComm.toLocaleString(), "size": "xs", "align": "end", "color": "#EF4444" }]},
          
          { "type": "box", "layout": "horizontal", "margin": "md", "backgroundColor": trueNetProfit >= 0 ? "#ECFDF5" : "#FEF2F2", "paddingAll": "8px", "cornerRadius": "6px", "contents": [
            { "type": "text", "text": "กำไรสุทธิเดือนนี้", "size": "sm", "weight": "bold", "color": "#1E293B" },
            { "type": "text", "text": trueNetProfit.toLocaleString() + " ฿", "size": "md", "align": "end", "weight": "bold", "color": trueNetProfit >= 0 ? "#059669" : "#DC2626" }
          ]},
          
          { "type": "separator", "margin": "lg", "color": "#E2E8F0" },
          { "type": "text", "text": "💳 สรุปช่องทางรับเงิน", "weight": "bold", "color": "#1E293B", "size": "sm", "margin": "md" },
          { "type": "box", "layout": "horizontal", "margin": "sm", "contents": [ { "type": "text", "text": "เงินโอน", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.transfer.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "เงินสด", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.cash.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold" }]},
          { "type": "box", "layout": "horizontal", "margin": "xs", "contents": [ { "type": "text", "text": "บัตรเครดิต", "size": "sm", "color": "#475569" }, { "type": "text", "text": report.credit.toLocaleString() + " ฿", "size": "sm", "align": "end", "weight": "bold" }]}
        ]
      }
    };



    // 🟣 ยิงผ่าน Bot 3 (ส่งตรงให้กลุ่มผู้บริหาร)
    const tokenExec = settings.lineTokenExec || settings.lineToken || "";
    const groupIdExec = settings.lineExecGroupId || "";
    if (tokenExec && groupIdExec) {
        // แอบเปลี่ยนข้อความ Header นิดนึงให้รู้ว่าเป็นของระดับผู้บริหาร
        let execFlex = JSON.parse(JSON.stringify(flexContents));
        execFlex.header.contents[0].text = "👑 สรุปยอดขาย (ผู้บริหาร)";
        
        let payloadExec = { "to": groupIdExec, "messages": [{ "type": "flex", "altText": "👑 สรุปยอดขายระดับผู้บริหารประจำเดือน " + monthYearStr, "contents": execFlex }] };
        let optionsExec = { "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + tokenExec }, "payload": JSON.stringify(payloadExec), "muteHttpExceptions": true };
        UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", optionsExec);
    }

    return "success";
  } catch(e) { return e.message; }
}

// ====================================================================
// 🤖 ระบบหุ่นยนต์อัตโนมัติ (Auto-Triggers) สำหรับปิดยอดตอนตี 3
// ====================================================================

// 🌟 1. หุ่นยนต์ปิดกะรายวัน (เช็คของเมื่อวาน)
function autoCloseDaily() {
  try {
    // หาวันที่ของ "เมื่อวาน" (ถอยหลังไป 24 ชั่วโมง)
    let today = new Date();
    let yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    let yStr = Utilities.formatDate(yesterday, "Asia/Bangkok", "dd/MM/yyyy");

    // ดึงรายงานของเมื่อวานมาตรวจสอบ
    let reportStr = getReportData('daily', yStr);
    if (!reportStr) return;
    let report = JSON.parse(reportStr);

    // เช็คว่าเมื่อวาน "ปิดกะไปหรือยัง" (ถ้าปิดแล้ว ให้หยุดทำงาน)
    if (report.drawer && report.drawer.isClosed) {
      console.log("วันที่ " + yStr + " ปิดกะไปแล้ว ไม่ต้องทำซ้ำ");
      return; 
    }

    // ถ้ายอดขายเป็น 0 และไม่มีเงินทอนเลย ก็ไม่ต้องปิดกะ (แสดงว่าร้านหยุด)
    if (report.netTotal === 0 && (!report.drawer || report.drawer.floatIn === 0)) {
       return;
    }

    // ถ้ายังไม่ปิดกะ -> คำนวณยอดที่ควรมี
    let floatIn = report.drawer ? (report.drawer.floatIn || 0) : 0;
    let addedFloatIn = (report.drawer && report.drawer.addedFloatIn) ? report.drawer.addedFloatIn : 0;
    let cashSales = report.cash || 0;
    let expense = report.expenseTotal || 0;
    
    let bankDep = report.bankDepositTotal || 0;
    // 🟢 หักเฉพาะเงินสดที่เบิกจากลิ้นชัก (drawerCashExpenses)
    let cashExp = report.drawerCashExpenses || 0;
    let expected = floatIn + addedFloatIn + cashSales - cashExp - bankDep;

    // สั่งปิดยอดและส่ง LINE
    let payload = {
      date: yStr,
      actualCash: expected, // ระบบจะถือว่าเงินอยู่ครบ (เพราะไม่มีคนนับจริง)
      expectedCash: expected,
      reportDataStr: reportStr,
      staffName: "Auto System (หุ่นยนต์อัตโนมัติ)",
      closeNote: "ระบบปิดยอดให้อัตโนมัติ (พนักงานลืมปิดกะ)"
    };

    closeShiftAndNotify(payload);
    console.log("ปิดยอดอัตโนมัติของวันที่ " + yStr + " สำเร็จ");
  } catch(e) {
    console.log("Auto Daily Error: " + e.message);
  }
}

// 🌟 2. หุ่นยนต์ส่งสรุปรายเดือน (ดึงของเดือนที่แล้ว)
function autoCloseMonthly() {
  try {
    let today = new Date();
    // ถอยไป 15 วัน เพื่อให้มั่นใจว่าตกไปอยู่ "เดือนที่แล้ว" แน่นอน (เพราะระบบจะรันในวันที่ 1 ของเดือนใหม่)
    let lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    let mStr = Utilities.formatDate(lastMonthDate, "Asia/Bangkok", "MM/yyyy");

    sendMonthlySummaryToLine(mStr);
    console.log("ส่งสรุปรายเดือน " + mStr + " สำเร็จ");
  } catch(e) {
    console.log("Auto Monthly Error: " + e.message);
  }
}

// 🌟 3. ฟังก์ชันสำหรับ "เปิดสวิตช์" หุ่นยนต์ (รันแค่ครั้งเดียวพอ)
function setupAutoTriggers() {
  // ลบทริกเกอร์เก่าทิ้งก่อน ป้องกันการตั้งเวลาซ้ำซ้อน
  let triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    let handlerName = triggers[i].getHandlerFunction();
    if (handlerName === 'autoCloseDaily' || handlerName === 'autoCloseMonthly') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // ตั้งเวลา: รันรายวัน ทุกๆ ตี 3 (03:00 - 04:00)
  ScriptApp.newTrigger('autoCloseDaily')
           .timeBased()
           .everyDays(1)
           .atHour(3)
           .create();

  // ตั้งเวลา: รันรายเดือน เฉพาะวันที่ 1 ของทุกเดือน ตอนตี 3 (03:00 - 04:00)
  ScriptApp.newTrigger('autoCloseMonthly')
           .timeBased()
           .onMonthDay(1)
           .atHour(3)
           .create();
           
  return "เปิดสวิตช์หุ่นยนต์ตั้งเวลาตี 3 สำเร็จแล้วครับ!";
}

// ==========================================
// 💸 ระบบจัดการรายจ่ายใหม่ (Expense Management)
// ==========================================

// 1. ดึงหมวดหมู่รายจ่ายจากชีต ExpenseCategories พร้อมยอดเงินประเมิน
function getExpenseCategories() {
  try {
    const ss = getActiveSS();
    let sheet = ss.getSheetByName("ExpenseCategories");
    if (!sheet) {
      sheet = ss.insertSheet("ExpenseCategories");
      sheet.appendRow(["หมวดหมู่รายจ่าย", "ยอดเงินที่ตั้งไว้ (ถ้ามี)"]);
      sheet.appendRow(["ค่าเช่า", "6000"]);
      sheet.appendRow(["ค่าน้ำ", ""]);
      sheet.appendRow(["ค่าไฟ", ""]);
    }
    const data = sheet.getDataRange().getValues(); // ใช้ getValues เพื่อเอาตัวเลขด้วย
    let categories = [];
    for (let i = 1; i < data.length; i++) {
      let cat = String(data[i][0]).trim();
      let amt = parseFloat(data[i][1]) || 0; // ดึงยอดเงินจากคอลัมน์ B
      if (cat !== "") {
        categories.push({ name: cat, amount: amt });
      }
    }
    return JSON.stringify(categories);
  } catch (e) {
    return "[]";
  }
}

// 2. บันทึกรายจ่ายแบบใหม่ (อัปโหลดรูป + แยกลงชีต)
function saveNewExpense(d) {
  try {
    const ss = getActiveSS();
    const ts = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    
    // 📸 จัดการอัปโหลดรูป (ถ้ามี)
    let imageUrl = "-";
    if (d.imageBase64 && d.imageMimeType) {
      try {
        const folderId = "1xnUqQsVHt9XSAte6mCD6PaLIXw-Em1cI"; 
        const folder = DriveApp.getFolderById(folderId);
        const blob = Utilities.newBlob(Utilities.base64Decode(d.imageBase64), d.imageMimeType, "EXP_" + new Date().getTime() + ".png");
        const file = folder.createFile(blob);
        imageUrl = file.getUrl();
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      } catch (uploadErr) {
        console.log("Upload Error:", uploadErr.message);
      }
    }

    if (d.status === "PAID") {
      // 🟢 กรณี "จ่ายแล้ว" -> ลงชีต Expenses ทันที
      let expSheet = ss.getSheetByName("Expenses");
      if (!expSheet) expSheet = ss.insertSheet("Expenses");
      
      let expNote = `[จ่ายให้: ${d.vendorName}] ${d.detail}`;
      // โครงสร้างชีต Expenses: วัน-เวลา, หมวดหมู่รายจ่าย, รายละเอียด, จำนวนเงิน, หลักฐาน, ผู้บันทึก
      expSheet.appendRow(["'" + ts, d.category, expNote, d.amount, imageUrl, d.staffName]); 
    } else {
      // 🟠 กรณี "ยังไม่จ่าย" -> ลงชีต Payables (ใบรอจ่าย)
      let paySheet = ss.getSheetByName("Payables");
      if (!paySheet) return "error_no_payables_sheet";
      
      let docNo = "EXP-" + new Date().getTime().toString().slice(-4);
      
      // 🌟 ค้นหาบัญชีธนาคารจากชื่อ "คู่ค้า/ผู้รับเงิน" (Vendors)
      let bankAccount = "-";
      let defaultChannel = "-";
      try {
        const vSheet = ss.getSheetByName("Vendors");
        if (vSheet) {
          const vData = vSheet.getDataRange().getValues();
          let inputVendor = String(d.vendorName).replace(/\s+/g, '').toLowerCase();
          for(let i=1; i<vData.length; i++) {
            let sheetVendor = String(vData[i][0]).replace(/\s+/g, '').toLowerCase();
            if(sheetVendor === inputVendor) {
              bankAccount = String(vData[i][2] || "-").trim();
              defaultChannel = String(vData[i][3] || "-").trim();
              break;
            }
          }
        }
      } catch(e) {}

      // นำหมวดหมู่ (Category) ไปรวมอยู่ในช่องรายละเอียดเลย จะได้เห็นชัดๆ
      let payDetail = `[หมวดหมู่: ${d.category}] ${d.detail}`;
      
      // โครงสร้าง Payables: วันที่, ผู้เบิก, คู่ค้า/บริษัท, เลขที่บิล, รอบบิล/รายละเอียด, ยอดเงิน, เลขบัญชี, สถานะ, อ้างอิงภาพ, วันครบกำหนด, ช่องทาง
      paySheet.appendRow([ts, d.staffName, d.vendorName, docNo, payDetail, d.amount, bankAccount, "รอจ่าย", imageUrl, d.dueDate, defaultChannel]);
    }
    
    return "success";
  } catch (e) {
    return "error: " + e.message;
  }
}
// ==========================================
// 📢 ระบบดึงข้อมูลข่าวสารอัปเดต + ข้อมูลติดต่อ (Real-time)
// ==========================================
function getSystemUpdates() {
  try {
    const ssId = "1eiKzw8L9aMqqfZFr4d_nGUqlDiI4n8nmfHOze6L6esE";
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName("Updates");
    
    if (!sheet) {
      sheet = ss.insertSheet("Updates");
      sheet.appendRow(["วันที่อัปเดต", "รายละเอียด (กด Alt+Enter เพื่อขึ้นบรรทัดใหม่)", "ชื่อผู้ดูแลระบบ", "เบอร์โทรศัพท์", "ลิงก์ LINE", "ลิงก์รูปภาพ QR Code (ถ้ามี)"]);
      sheet.appendRow(["05/09/2026", "ปุ่มข่าวสาร: เพิ่มปุ่มแจ้งเตือนข่าวสาร\nระบบเงินทอน: เพิ่มฟังก์ชัน นำเงินฝากเข้าธนาคาร\nลิ้นชักเงินสด: ป้องกันยอดเบิ้ล", "Admin ผู้พัฒนาระบบ", "08X-XXX-XXXX", "https://line.me/ti/p/~admin_id", ""]);
      sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#E0F2F1");
      sheet.setColumnWidth(2, 400);
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    let updates = [];
    let supportInfo = { name: "-", phone: "-", line: "-", qr: "-" };

    // 🌟 ดึงข้อมูลติดต่อ (ดักจับ Error กรณีไม่มีคอลัมน์)
    if (data.length > 1) {
      supportInfo.name = data[1][2] ? String(data[1][2]).trim() : "-";
      supportInfo.phone = data[1][3] ? String(data[1][3]).trim() : "-";
      supportInfo.line = data[1][4] ? String(data[1][4]).trim() : "-";
      supportInfo.qr = data[1][5] ? String(data[1][5]).trim() : "-";
    }
    
    // ดึงข้อมูลอัปเดต (เรียงจากใหม่ไปเก่า)
    for (let i = data.length - 1; i >= 1; i--) {
      let date = String(data[i][0]).trim();
      let detailText = String(data[i][1]).trim();
      if (date !== "" && detailText !== "") {
        let detailsList = detailText.split('\n').map(item => item.trim()).filter(item => item !== "");
        updates.push({ date: date, details: detailsList });
      }
    }
    
    return JSON.stringify({ updates: updates, support: supportInfo });
  } catch (e) {
    return JSON.stringify({ updates: [], support: null }); 
  }
}
// ==========================================
// 🔐 ระบบจัดการสาขา / Multi-Branch (SaaS)
// ==========================================
// นำ ID ของไฟล์ "ศูนย์บัญชาการ" (Hub) ที่เพิ่งสร้างในสเต็ปที่ 1 มาใส่ตรงนี้ครับ
const HUB_SPREADSHEET_ID = "17U9kjctQJT1z2m1srdcvtqJGPDMSbya9B7WfLkaxB5k"; 

function verifyShopLogin(shopCode, password) {
  try {
    const hubSs = SpreadsheetApp.openById(HUB_SPREADSHEET_ID);
    const sheet = hubSs.getSheetByName("Shops");
    if (!sheet) return { status: "error", msg: "ไม่พบฐานข้อมูลศูนย์บัญชาการ" };

    const data = sheet.getDataRange().getDisplayValues();
    
    // วนลูปค้นหารหัสร้านค้าและรหัสผ่าน
    for (let i = 1; i < data.length; i++) {
      let rowCode = String(data[i][0]).trim();
      let rowPass = String(data[i][1]).trim();
      let rowSheetId = String(data[i][2]).trim();
      let rowName = String(data[i][3]).trim();
      let rowStatus = String(data[i][4]).trim();

      if (rowCode === shopCode && rowPass === password) {
        if (rowStatus === "ระงับ") {
          return { status: "error", msg: "ร้านค้านี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" };
        }
        // ล็อกอินสำเร็จ ส่ง Sheet ID กลับไปให้หน้าเว็บ
        return { 
          status: "success", 
          sheetId: rowSheetId, 
          shopName: rowName 
        };
      }
    }
    
    return { status: "error", msg: "รหัสร้านค้า หรือ รหัสผ่าน ไม่ถูกต้อง!" };
  } catch (e) {
    return { status: "error", msg: "เกิดข้อผิดพลาด: " + e.message };
  }
}