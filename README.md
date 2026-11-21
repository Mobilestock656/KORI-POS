# MIRA Hair Studio POS — คู่มือผู้ขาย (ติดตั้งรายร้าน + อัปเดตทุกร้านพร้อมกัน)

```
GitHub Pages (docs/)  ──ใช้ร่วมกันทุกร้าน── หน้า POS
Apps Script ของแต่ละร้าน (apps-script/)    ── API + ตัวตั้งเวลา + LINE
Google Sheet ของแต่ละร้าน                  ── ข้อมูลร้าน
tools/deploy-all.mjs                        ── ส่งโค้ด Apps Script ไปทุกร้านในคำสั่งเดียว
```

## อัปโหลดอะไรขึ้น GitHub
อัปโหลดทั้งโฟลเดอร์โปรเจกต์ (ไฟล์ที่ถูกเสิร์ฟจริงคือโฟลเดอร์ `docs/` ทั้งหมด):
`index.html`, `app.js`, `icons.js`, `modern.css`, `config.js` (+ `.nojekyll` ถ้ามี)
ส่วน `apps-script/` ไม่ได้ถูกเสิร์ฟ เก็บไว้ใน repo เพื่อเป็นต้นฉบับสำหรับ deploy-all

---
## ส่วน A — ทำครั้งเดียว

**A1. GitHub Pages** — สร้าง repo (Public) → อัปโหลด → Settings → Pages → Branch `main`, Folder `/docs`

**A2. Google Cloud (Client ID ตัวเดียวใช้ทุกร้าน)**
OAuth consent screen → External → **Publish app (In production)** · Credentials → OAuth client ID (Web)
Authorized JavaScript origins = `https://<user>.github.io`

**A3. ใส่ค่ากลาง 2 ไฟล์**
- `apps-script/SellerConfig.gs` → `GOOGLE_CLIENT_ID`, `FRONTEND_URL` (ลิงก์ GitHub Pages)
- `docs/config.js` → `MIRA_GOOGLE_CLIENT_ID`

**A4. สร้างชีตต้นแบบ**
1. ทำสำเนาชีตร้านเดิม → ตั้งชื่อไฟล์ให้มีคำว่า **TEMPLATE** (เช่น `MIRA POS TEMPLATE`)
2. Extensions → Apps Script → ลบไฟล์เดิม (รวม `Index.html`) แล้ววางไฟล์จาก `apps-script/` ทั้งหมด:
   `Code.gs`, `Payroll.gs`, `CommissionCalc.gs`, `Api.gs`, `SellerConfig.gs`, `PrepareTemplate.gs`, `Booking.html`
   (`Code.gs` ชุดนี้ตั้ง `SPREADSHEET_ID` ว่างและเปลี่ยน `doPost`→`lineWebhook_` ให้แล้ว)
3. รีโหลดชีต → เมนู **MIRA → 1) เตรียมชีตต้นแบบ** → พิมพ์ `CLEAR`
   ระบบสำรองไฟล์ให้ก่อน แล้วล้างลูกค้า/ออเดอร์/พนักงาน/บัญชีธนาคาร/โทเคน LINE/ตัวตั้งเวลา และรีเซ็ต Settings
   (รายการสินค้า-บริการคงไว้ ถ้าจะล้างด้วยให้ตั้ง `TEMPLATE_CLEAR_CATALOG_ = true`)
4. ปรับ Stock/Services ให้เป็นรายการมาตรฐานที่จะขาย → ใช้ไฟล์นี้เป็นต้นแบบ

---
## ส่วน B — ติดตั้งร้านใหม่ (~10 นาที)
1. **ทำสำเนาต้นแบบ** — เปลี่ยน `/edit` เป็น `/copy` ในลิงก์ต้นแบบ (ทำด้วยบัญชี Google ของร้าน) แล้วเปลี่ยนชื่อไฟล์ให้ไม่มีคำว่า TEMPLATE
2. **MIRA → 2) ตั้งค่าร้านใหม่** — ใส่รหัสร้าน (เช่น `shopb`) และชื่อร้าน → สร้างชีต Users/Settings + ตัวตั้งเวลาให้เอง
3. **Deploy** — Apps Script → Deploy → New deployment → Web app · Execute as **Me** · Access **Anyone**
   คัดลอก **ลิงก์ /exec** และ **Deployment ID** (Deploy → Manage deployments) และ **Script ID** (Project Settings)
   ครั้งแรกให้รัน `AuthorizeDrive` เพื่ออนุมัติสิทธิ์
4. **ข้อมูลร้าน** — ชีต Settings (ชื่อ, ภาษี, ธนาคาร, LINE, **เปลี่ยน PIN แอดมินจาก 1234**), ชีต Staff (พนักงาน/ตำแหน่ง/PIN), ชีต Users (อีเมลที่เข้าระบบได้)
5. **เพิ่มอีเมลผู้ขายเป็น Editor ของชีต** — เพื่อให้ deploy-all อัปเดตร้านนี้ได้
6. **MIRA → 3) ตรวจความพร้อม** — ต้องเป็น ✅ ครบ
7. **Hub** — เพิ่มแถวร้าน: คอลัมน์ C = ลิงก์ /exec, E = สถานะ, H = วันหมดอายุ
8. **GitHub** — `docs/config.js` เพิ่ม `"shopb": "<ลิงก์ /exec>"` · `tools/shops.json` เพิ่ม `{code, scriptId, deploymentId}`
9. **ส่งลิงก์ให้ร้าน** `https://<user>.github.io/<repo>/?shop=shopb` แล้วทดสอบ: ล็อกอิน → ขาย → ยกเลิกบิล → ปฏิทินคิว → ปิดกะ → ลองอีเมลที่ไม่อยู่ใน Users (ต้องถูกปฏิเสธ)

---
## ส่วน C — อัปเดตทุกร้านพร้อมกัน
| ต้องการแก้ | ทำอย่างไร |
|---|---|
| หน้าตา/ไอคอน/ฟีเจอร์หน้าเว็บ | แก้ใน `docs/` แล้ว push — ทุกร้านเปลี่ยนใน ~1 นาที |
| โค้ด Apps Script (`apps-script/`) | แก้ไฟล์ใน repo → `node tools/deploy-all.mjs --only <ร้านทดสอบ>` → ตรวจ → `node tools/deploy-all.mjs` |

เตรียมครั้งเดียว: ติดตั้ง Node 18+ → `npx @google/clasp login` → เปิด Apps Script API (script.google.com/home/usersettings) → คัดลอก `tools/shops.example.json` เป็น `tools/shops.json`
ลิงก์ /exec ของแต่ละร้านไม่เปลี่ยนหลังอัปเดต (สคริปต์ใช้ Deployment ID เดิม) ใช้ `--dry` เพื่อดูรายการก่อนส่งจริง
**ข้อควรระวัง:** ถ้าร้านแก้โค้ดในสคริปต์ของตัวเอง การอัปเดตจะทับ — ตกลงกับลูกค้าว่าห้ามแก้โค้ด

### ทำไมใช้ clasp แทน Library
Library ของ Apps Script ใช้กับระบบนี้ได้ไม่ปลอดภัย: ตัวตั้งเวลาต้องมีฟังก์ชันห่อในแต่ละร้าน, หน้า HTML (Booking) เสิร์ฟจากไลบรารีไม่ได้, และการอ้างอิงสถานะ/URL ของ Web app ในไลบรารีทำงานต่างจากสคริปต์ปกติ — ทดสอบจริงไม่ได้ในที่นี้ และผิดพลาดแล้วกระทบทุกร้านพร้อมกัน clasp ส่งโค้ดเดียวกันเข้าแต่ละร้านตรงๆ จึงคาดเดาได้และเลือกทดสอบร้านเดียวก่อนได้

## ปัญหาที่พบบ่อย
| อาการ | แก้ |
|---|---|
| ปุ่ม Google ไม่ขึ้น / origin error | ใส่ `https://<user>.github.io` ใน Authorized origins |
| ล็อกอินได้เฉพาะบางอีเมล | OAuth consent screen ยังเป็น Testing → Publish app |
| “อีเมลยังไม่ได้รับสิทธิ์” | เพิ่มอีเมลในชีต Users ของร้านนั้น |
| “ไม่พบรหัสร้าน” | เปิดจากลิงก์ที่ไม่มี `?shop=` ครั้งแรก |
| deploy-all ล้มเหลวบางร้าน | บัญชีที่ login ไม่ได้เป็น Editor ของร้านนั้น / Script ID หรือ Deployment ID ผิด |
| ลิงก์ LINE เดิมเปิดแล้วเจอหน้า “ย้ายไปลิงก์ใหม่” | ปกติ — กดปุ่มเพื่อไปหน้า POS ใหม่ (ต้องตั้ง FRONTEND_URL) |
| ระบบแจ้ง “ถูกระงับ/หมดอายุ” | ตรวจแถวร้านใน Hub (คอลัมน์ C ต้องตรงกับลิงก์ /exec) |

## ช่องโหว่ที่ต้องรู้ (ควรแก้ก่อนขายจำนวนมาก)
หน้าจองคิวของลูกค้า (`?page=booking`) ยังเสิร์ฟจาก Apps Script ตามเดิม หน้าที่เสิร์ฟจาก Apps Script เรียกฟังก์ชันฝั่งเซิร์ฟเวอร์ได้ทุกตัวผ่าน `google.script.run` ดังนั้นคนที่รู้วิธีสามารถข้ามระบบล็อกอินอีเมลได้ (เป็นข้อจำกัดของระบบเดิมที่ยังอยู่) ทางแก้ที่ถูกต้องคือย้ายหน้าจองคิวไปไว้ที่ GitHub เช่นกัน โดยเปิด API สาธารณะเฉพาะ 5–6 ฟังก์ชันที่ตัดข้อมูลลับ (PIN, โทเคน) ออก แล้วเลิกเสิร์ฟ HTML จาก Apps Script ทั้งหมด
ตอนนี้ PIN พนักงาน/แอดมินยังตรวจฝั่งเบราว์เซอร์ตามระบบเดิมด้วย
