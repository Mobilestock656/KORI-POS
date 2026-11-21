#!/usr/bin/env node
// อัปเดตโค้ด Apps Script ทุกร้านในคำสั่งเดียว
//   node tools/deploy-all.mjs                 → ทุกร้าน
//   node tools/deploy-all.mjs --only mira     → ทดสอบร้านเดียวก่อน (canary)
//   node tools/deploy-all.mjs --dry           → แสดงรายการ ไม่ส่งจริง
// ต้องมี: Node 18+, `npx @google/clasp login`, เปิด Apps Script API ที่ script.google.com/home/usersettings
// และบัญชีที่ login ต้องเป็น Editor ของชีต/สคริปต์ของทุกร้าน
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const file = path.join(here, 'shops.json');
if (!existsSync(file)) { console.error('ไม่พบ tools/shops.json (คัดลอกจาก shops.example.json)'); process.exit(1); }
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dry = args.includes('--dry');
const shops = JSON.parse(readFileSync(file, 'utf8')).filter(s => !only || s.code === only);
if (!shops.length) { console.error('ไม่พบร้านที่เลือก'); process.exit(1); }
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}
const run = c => execSync(c, { cwd: here, stdio: 'pipe' }).toString();
const results = [];
for (const s of shops) {
  process.stdout.write(`• ${s.code} … `);
  if (dry) { console.log('(dry-run)'); continue; }
  try {
    writeFileSync(path.join(here, '.clasp.json'), JSON.stringify({ scriptId: s.scriptId, rootDir: '../apps-script' }));
    run('npx --yes @google/clasp push --force');
    run(`npx --yes @google/clasp deploy --deploymentId ${s.deploymentId} --description "${stamp} ${commit}"`);
    console.log('OK'); results.push([s.code, 'OK']);
  } catch (e) {
    const msg = String(e.stderr || e.message).split('\n').slice(0, 3).join(' ');
    console.log('FAIL — ' + msg); results.push([s.code, 'FAIL']);
  }
}
if (existsSync(path.join(here, '.clasp.json'))) rmSync(path.join(here, '.clasp.json'));
const bad = results.filter(r => r[1] !== 'OK');
console.log(`\nสำเร็จ ${results.length - bad.length}/${results.length}` + (bad.length ? ` | ล้มเหลว: ${bad.map(r => r[0]).join(', ')}` : ''));
process.exit(bad.length ? 1 : 0);
