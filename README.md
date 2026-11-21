# MIRA Hair Studio POS — ขึ้น GitHub Pages + ล็อกอินด้วยอีเมล

โครงสร้าง: **หน้าเว็บ (GitHub Pages)** ⇄ **Apps Script (API)** ⇄ **Google Sheets เดิม** — ข้อมูล/ชีต/LINE ใช้ของเดิมทั้งหมด

## ขั้นตอน (ทำครั้งเดียว ~15 นาที)

**1) Google Cloud – สร้าง Client ID**
console.cloud.google.com → APIs & Services → Credentials → Create → OAuth client ID → *Web application*
Authorized JavaScript origins: `https://<ชื่อ-github>.github.io` → คัดลอก Client ID

**2) Apps Script (โปรเจกต์เดิม)**
- ใน `Code.gs` เปลี่ยน `function doPost(e)` เป็น `function lineWebhook_(e)` (ที่เดียว)
- สร้างไฟล์ใหม่ `Api.gs` วางเนื้อหาจาก `apps-script/Api.gs`
- Project Settings → Script properties → เพิ่ม `GOOGLE_CLIENT_ID` = ค่าจากข้อ 1
- Deploy → Manage deployments → ✏️ → New version (Execute as: Me, Access: Anyone) → คัดลอกลิงก์ `/exec`
- ครั้งแรกให้รันฟังก์ชันใดก็ได้เพื่ออนุมัติสิทธิ์ `UrlFetchApp`

**3) ตั้งค่าหน้าเว็บ** — แก้ `docs/config.js` ใส่ `API_URL` และ `GOOGLE_CLIENT_ID`

**4) GitHub** — สร้าง repo → อัปโหลดทั้งโฟลเดอร์ → Settings → Pages → Branch `main` / โฟลเดอร์ `/docs`

**5) กำหนดผู้มีสิทธิ์เข้าระบบ** — ชีต `Users` (สร้างอัตโนมัติ พร้อมอีเมลเจ้าของร้าน): คอลัมน์ Email | ชื่อ | สถานะ (ใช้งาน/ระงับ)

## การทำงาน
1. เปิดเว็บ → เข้าสู่ระบบด้วย Google (อีเมลต้องอยู่ในชีต `Users`) — จำการเข้าสู่ระบบได้ ~6 ชม. ต่ออายุเมื่อใช้งาน
2. ฟังก์ชันคิดเงิน/ผู้จัดการ/เงินเดือน/ตั้งค่า ใช้ **PIN พนักงาน และ PIN แอดมิน เหมือนเดิม**
3. หน้าจองคิวของลูกค้ายังเปิดผ่านลิงก์ Apps Script เดิม (ปุ่ม “ลิงก์ลูกค้าจองคิว”)

## หมายเหตุ
- ผู้ที่ไม่มีอีเมลในชีต `Users` จะเรียกข้อมูลใดๆ ไม่ได้เลย (เซิร์ฟเวอร์ตรวจทุกคำขอ)
- แนะนำขั้นต่อไป: ตรวจ PIN ที่ฝั่งเซิร์ฟเวอร์ — ตอนนี้ระบบเดิมส่งรายชื่อ+PIN พนักงานและ PIN แอดมินมาให้เบราว์เซอร์ตรวจเอง (ปลอดภัยขึ้นแล้วเพราะอยู่หลังล็อกอินอีเมล แต่ยังเห็นได้ใน DevTools)
- ฟังก์ชันที่ UI เรียกใช้มี 36 รายการ ถูกอนุญาตไว้ใน `API_FUNCS_` ถ้าเพิ่มฟังก์ชันใหม่ต้องเพิ่มชื่อในลิสต์นี้
