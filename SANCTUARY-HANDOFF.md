# Puffling Brigade — Sanctuary handoff

ส่งมอบวันที่ 11 ตุลาคม 2026: หน้าแรก 3D ใช้งานได้ในเครื่องแล้ว ยังไม่ได้ commit, push หรือเผยแพร่แทนเว็บจริง

อัปเดต 12 ตุลาคม: เพิ่มลานปุยนุ่น ตัวละคร โต๊ะผู้สร้าง และเสื้อ 3D ตาม `COURTYARD-HANDOFF.md` ซึ่งมีผลตรวจและขนาดล่าสุด ตัวเลขด้านล่างบันทึกเวอร์ชันวิหารก่อนต่อเติม

## สิ่งที่ทำ

- วิหารลอยฟ้าที่สร้างขึ้นใหม่ใน Blender 5.2.2: สะพาน ประตูที่เปิดตามการเลื่อน โถงเสาและกระจกสี แท่นพันธสัญญา และโลกเบื้องหน้า
- Three.js r180 แบบ self-hosted, vanilla JavaScript/CSS, WebGL canvas เดียว และเส้นทางกล้องต่อเนื่อง 5 บทตาม native scroll ไปข้างหน้าและย้อนกลับได้
- ข้อความ HTML ภาษาไทย โลโก้และภาพเกมเดิม ปุ่มเข้าเกม `/game/` ในแท็บเดิม เมนูบท ปุ่มหยุดภาพเคลื่อนไหว และลิงก์ผู้สร้าง/กฎหมาย
- มือถือใช้ DPR ไม่เกิน 1.25 ลดอนุภาคและปิดเงา; เดสก์ท็อปจำกัด DPR 1.65 พร้อมลดคุณภาพเมื่อเฟรมช้า
- Reduced motion แสดงมุมวิหารนิ่ง; เมื่อ WebGL/โมเดล/โมดูลโหลดไม่ได้ใช้ภาพสำรอง; ปิด JavaScript แล้วยังอ่านเนื้อหาและใช้ลิงก์ได้

ไฟล์หน้าเว็บใหม่: `index.html`, `sanctuary.css`, `sanctuary.js`, `sanctuary-scene.js`, `assets/sanctuary/`, `assets/vendor/` และเอกสารนี้ ไม่มี build step เพิ่มเติมสำหรับ GitHub Pages

## ผลตรวจ

ทดสอบ Chrome headless ที่ `http://127.0.0.1:8770/` หลังปรับภาพและกล้องครั้งสุดท้าย: ชุดหลัก **13/13 ผ่าน**, ชุด edge cases **6/6 ผ่าน**

- WebGL ทำงานจริง ไม่มี fatal JavaScript errors, console errors หรือไฟล์ปกติที่โหลดไม่สำเร็จ
- ครบ 5 บททั้งสองทิศทาง กล้อง/ประตู/พลังแท่นย้อนกลับได้; deep links, PageDown/Home, wheel, touch, pause/resume และการเลื่อนเร็วทำงาน
- ตรวจความกว้าง 320–2560px ไม่มีแนวนอนล้น; ปุ่มบทบนมือถือมีพื้นที่ 44×44px; ปุ่มเริ่มเล่นเข้าถึงได้ทั้งแนวตั้งและแนวนอน
- `/privacy.html` และ `/terms.html` ตอบ HTTP 200; เข้าเกมในแท็บเดิมด้วย destination ที่ intercept ไว้ จึงไม่ดาวน์โหลด Unity ระหว่าง QA
- ทดสอบ auth forwarding 5 รูปแบบด้วยค่าจำลอง; script แรกใน `<head>` ตรงกับต้นฉบับทุกตัวอักษร
- ทดสอบ reduced motion, WebGL ใช้ไม่ได้, WebGL context loss, โมดูลโหลดไม่ได้, GLB โหลดไม่ได้ และ JavaScript ปิด
- ตรวจเส้นทางกล้อง desktop/portrait 482 จุด, 480 ช่วงระหว่างจุด และ 2,892 รังสีระยะ 0.18: ไม่พบจุดตัดกับ solid geometry; ยกเว้นเมฆ/น้ำตกที่ไม่ใช่วัตถุทึบ การตรวจนี้ครอบคลุมศูนย์กลางกล้องและเส้นทางตัวอย่าง ไม่ใช่หลักฐานว่าทุกขอบภาพจะไม่มี clipping
- Hash ของ protected files ทั้ง 6 และ Git tree ของ `game/`, `admin/` ตรงกับต้นฉบับ; เก็บ `google8504b1a1d0153664.html` จาก main ล่าสุดไว้แล้ว

รายงานและภาพ browser: `D:\Cats\Cats SSR\website-qa\sanctuary\` โดยเฉพาะ `browser-results.json`, `edge-results.json`, `camera-clearance.json`, `protection-check.json` และ `budget-check.json`

ยังไม่ได้วัด FPS/ความร้อนบน iPhone Safari หรือเครื่อง Android จริง; headless viewport emulation ไม่แทนการตรวจอุปกรณ์จริง

## Performance budget

| รายการ | เป้าหมาย | วัดได้ |
|---|---:|---:|
| HTML + assets ตอนเปิดหน้าแรก | ≤5 MiB | 3,778,575 bytes ≈3.78 MB / 3.60 MiB |
| Production GLB | ≤3 MiB | 2,523,492 bytes ≈2.41 MiB |
| ภาพ fallback WebP | — | 70,950 bytes |
| Draw calls สูงสุดจาก samples | ≤64 | 31 |
| Triangles สูงสุดจาก samples | ≤100,000 | 78,030 |
| DPR บน mobile emulation | ≤1.25 | 1.25 |

เป็นขนาด body ที่โหลดจริงจาก local server แบบไม่บีบอัด ไม่รวม HTTP headers; production compression อาจลดจำนวน bytes ได้ ตัวนับ renderer ไม่ใช่ผล benchmark FPS อุปกรณ์จริง ภาพเนื้อหาส่วนล่างโหลดแบบ lazy; ไม่มี postprocessing chain หรือ third-party CDN ใน runtime

## Editable source และการตรวจซ้ำ

ไฟล์แก้ไขได้จริง: `D:\Cats\Cats SSR\website-source\sanctuary\sanctuary.blend`

ตัวสร้าง deterministic และวิธี rebuild: `D:\Cats\Cats SSR\website-source\sanctuary\build_sanctuary.py` และ `README.md` ในโฟลเดอร์เดียวกัน Blender export GLB และ render JPEG จากนั้น Pillow แปลงเป็น `fallback.webp` คุณภาพ 86 ใช้โมเดลต้นฉบับที่สร้างขึ้นใหม่ ไม่มี ImageGen หรือโมเดลจากเกมอื่น ไฟล์ `.blend` และ QA อยู่นอก checkout เว็บไซต์ ควรสำรองแยกเมื่อย้ายเครื่อง

เปิดดูเว็บในเครื่องด้วยคำสั่งนี้ และเปิด `http://127.0.0.1:8770/` ในเบราว์เซอร์ โดยเปิดหน้าต่างคำสั่งนี้ทิ้งไว้ระหว่างดูเว็บ:

```powershell
Set-Location -LiteralPath 'D:\Cats\Cats SSR'
& 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' website-preview.py --port 8770
```

เมื่อ local preview ทำงานที่พอร์ต 8770 ให้รันชุดตรวจในหน้าต่างคำสั่งอีกหน้าจาก `D:\Cats\Cats SSR`:

```powershell
node website-qa/sanctuary/protection-audit.cjs
node website-qa/sanctuary/browser-check.cjs
node website-qa/sanctuary/edge-check.cjs
node website-qa/sanctuary/camera-clearance.cjs
node website-qa/sanctuary/budget-check.cjs
```

## การเผยแพร่เมื่อได้รับอนุญาต

Website checkout: `D:\Cats\Cats SSR\public-website`; branch: `codex/sanctuary-first-pact`; base ที่ซิงก์แล้ว: `0bcec89fe1f9ad98d739809f28253c99bb7a0c3c` (`origin/main` ขณะตรวจ)

ตรวจ staged files ให้มีเฉพาะรายการที่อนุญาตก่อน commit หากมีงานของผู้อื่นค้างอยู่ให้เก็บไว้และแยกตรวจ ห้ามใช้ `git add .` หรือสคริปต์ Unity `tools/deploy_web.py` เพื่อเผยแพร่หน้าแรก

```powershell
Set-Location -LiteralPath 'D:\Cats\Cats SSR\public-website'
git status --short
git diff --check
git add -- index.html sanctuary.css sanctuary.js sanctuary-scene.js courtyard.css courtyard-scene.js assets/sanctuary assets/courtyard assets/vendor SANCTUARY-HANDOFF.md COURTYARD-HANDOFF.md
git diff --cached --name-only
git diff --cached --stat
git commit -m "Remake homepage as a scroll-driven 3D sanctuary"
git pull --rebase origin main
git diff --name-only origin/main...HEAD -- game admin privacy.html terms.html legal.css robots.txt CNAME .nojekyll google8504b1a1d0153664.html
node ../website-qa/sanctuary/protection-audit.cjs
node ../website-qa/sanctuary/browser-check.cjs
node ../website-qa/sanctuary/edge-check.cjs
node ../website-qa/sanctuary/camera-clearance.cjs
node ../website-qa/sanctuary/budget-check.cjs
```

คำสั่ง diff ของ protected paths ต้องไม่แสดงการแก้ไขจาก branch นี้ หาก rebase ชนกับงานใหม่ให้แก้เฉพาะหน้าแรกโดยรักษางานจาก main; หาก audit ไม่ผ่านให้ตรวจความแตกต่างก่อน ห้ามแทนไฟล์เกม/แอดมิน/กฎหมายด้วยสำเนาเก่า

หลังตรวจผ่านและเจ้าของอนุญาตให้เผยแพร่ขึ้น main แล้วเท่านั้น:

```powershell
git push origin HEAD:main
```

ห้าม force-push หาก remote เปลี่ยนให้ซิงก์และตรวจซ้ำ รอ GitHub Pages deploy เสร็จแล้วตรวจหน้าแรก, `/game/`, ลิงก์กฎหมาย และ auth forwarding บนโดเมนจริง
