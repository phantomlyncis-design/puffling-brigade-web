# Puffling Brigade — ลานปุยนุ่นและเสื้อ 3D

อัปเดต 12 ตุลาคม 2026: ต่อเติมหน้าแรกใน `D:\Cats\Cats SSR\public-website` แล้ว งานนี้ยังอยู่ในเครื่อง ไม่ได้ commit, push หรือเผยแพร่ขึ้น GitHub Pages

## การจัดวาง

ต่อจากวิหาร 5 บทเดิมด้วยฉากต่อเนื่องอีก 4 ส่วน ใช้กล้องและ WebGL canvas เดิม:

1. **โลกของเกม** — ปราสาทจำลองกลางสวนบนเกาะลอยฟ้า พร้อมคำอธิบายเกมที่ผู้ใช้ส่งมาและลิงก์ `/game/`
2. **เพื่อนร่วมทาง** — โมเดลราชันขนฟู วายุเขียว และนิรันดร์น้ำเงินจริง เลือกดูได้ พร้อมชื่อ ธาตุ และหน้าที่ บนมือถือกล้องเคลื่อนไปหาตัวที่เลือก
3. **ผู้สร้าง** — โต๊ะทำงาน สมุด หนังสือ และกรอบรูปจริงของ Muhammadshareef Maseng พร้อม Facebook, Instagram และ LinkedIn เดิม
4. **ของสะสมในอนาคต** — ศาลาแสดงเสื้อจริงสองแบบ: Little King Tee สีครีม/ราชันขนฟู และ Wanderer Tee สีป่า/วายุเขียว เปลี่ยนสีผ้าและลายจริง ลากหมุน ดูด้านหน้า–หลัง หรือใช้ลูกศรซ้าย/ขวา, Home และ End ได้

เสื้อมีผิวด้านหน้า–หลัง ช่องคอ แขน ชายเสื้อ ตะเข็บ และป้ายทอ ไม่ใช่แผ่นภาพแบน คงข้อความว่าเป็นแนวคิด ยังไม่ขาย รับจอง หรือชำระเงิน และคริสตัลได้รับจากการเล่น

## พฤติกรรมและความทนทาน

- เลื่อนหน้าแบบปกติ ไปข้างหน้าและย้อนกลับได้ ลิงก์ `#world`, `#characters`, `#creator`, `#collection` เปิดตรงฉากได้
- โหลดโมเดลลานและเสื้อเมื่อผ่าน 52% ของวิหาร ไม่โหลดสองโมเดลนี้ตอนเปิดหน้าแรก
- ปุ่มหยุดภาพคงมุมปัจจุบัน แต่เปลี่ยนฉากหรือหมุนเสื้อด้วยคำสั่งผู้ใช้ได้; เริ่มภาพต่อแล้วไม่ย้อนกลับไปฉากเก่า
- Reduced motion ใช้มุมคงที่ในแต่ละฉาก และปุ่มเลือก/หมุนยังทำงาน
- คงตำแหน่งเรื่องราวเมื่อเปลี่ยนขนาดหรือหมุนหน้าจอ; การลากเสื้อไม่ขวางการเลื่อนแนวตั้งบนมือถือ
- ถ้าฉากใหม่โหลดไม่ได้ วิหารยังทำงานและส่วนใหม่ใช้ภาพสำรอง; ถ้า WebGL หรือ JavaScript ใช้ไม่ได้ ข้อความ ภาพ ลิงก์เข้าเกม และลิงก์ผู้สร้างยังมีอยู่
- พื้นที่ปุ่มหลักในลานสูงอย่างน้อย 44px; สถานะปุ่มและชื่อที่เลือกอ่านผ่านเครื่องมือช่วยการเข้าถึงได้

## ไฟล์

ไฟล์หน้าเว็บที่เพิ่ม: `courtyard.css`, `courtyard-scene.js`, `assets/courtyard/` และเอกสารนี้

ไฟล์ที่เชื่อมระบบ: `index.html`, `sanctuary.js`, `sanctuary-scene.js` ส่วน `sanctuary.css` และโมเดลวิหารเดิมยังใช้ร่วมกัน ไม่มี build step หรือ CDN เพิ่ม

ต้นฉบับแก้ไขได้อยู่นอก checkout เว็บไซต์:

- `D:\Cats\Cats SSR\website-source\puffling-courtyard\editable.blend`
- `D:\Cats\Cats SSR\website-source\puffling-courtyard\deterministic.py`
- `D:\Cats\Cats SSR\website-source\puffling-shirt\puffling-shirt.blend`
- `D:\Cats\Cats SSR\website-source\puffling-shirt\build_shirt.py`

แต่ละโฟลเดอร์มี README และ manifest สำหรับสร้างซ้ำ โมเดลทั้งหมดสร้างขึ้นใหม่ใน Blender ใช้ภาพตัวละคร โลโก้ และรูปผู้สร้างที่มีในโปรเจกต์ ควรสำรองโฟลเดอร์ `website-source` แยกเมื่อย้ายเครื่อง

## ผลตรวจ

ทดสอบ Chrome headless และตรวจภาพจริงทั้งคอมพิวเตอร์และมือถือ:

- ชุดลานปุยนุ่น **14/14 ผ่าน**: lazy loading, 4 ฉาก, 3 ตัวละคร, เสื้อสองแบบ, สีผ้า/ลาย, หน้า–หลัง, คีย์บอร์ด, เมาส์/สัมผัส, deep links, มือถือ, reduced motion, โหลดโมเดลล้มเหลว, ปิด JavaScript และ protected files
- ชุดตรวจเพิ่มเติม **3/3 ผ่าน**: pause/เปลี่ยนฉาก/resume, กล้องมือถือเลือกครบสามตัว, และงบการวาดฉากระหว่างเดินทาง
- วิหารเดิม **13/13 ผ่าน**, กรณีเพิ่มเติมเดิม **6/6 ผ่าน** รวม auth forwarding ด้วยค่าจำลอง, ปุ่มเข้าเกมแท็บเดิม, หน้า Privacy/Terms, หน้าจอแนวนอน และ WebGL context loss
- กล้องลานปุยนุ่น: ตรวจ 964 จุด, 960 ช่วง และ 5,784 รังสีระยะ 0.18 ในมุมคอมพิวเตอร์/มือถือทั้งสามตัว ไม่พบการชนวัตถุทึบ การตรวจนี้ครอบคลุมศูนย์กล้องและช่วงที่สุ่มตรวจ ไม่ครอบคลุมทุกพิกเซลของขอบภาพ
- `game/`, `admin/`, ไฟล์กฎหมาย/โดเมน/robots ที่ห้ามแก้ และไฟล์ Google verification ตรงกับต้นฉบับ; auth script ยังเป็น script แรกและตรงกับต้นฉบับทุกตัวอักษร

รายงานและภาพอยู่ที่ `D:\Cats\Cats SSR\website-qa\courtyard\`: `browser-results.json`, `edge-results.json`, `camera-clearance.json`, `protection-check.json` และภาพ `acceptance-*.png` / `mobile-hero-*.png`

ยังไม่ได้ทดสอบ FPS หรือความร้อนบน iPhone Safari/Android จริง การจำลอง viewport และ Chrome headless ไม่แทนผลจากอุปกรณ์จริง

## ขนาดและงบการแสดงผล

| รายการ | วัดได้ |
| --- | ---: |
| หน้าแรกและทรัพยากรเริ่มต้น รวม HTML | 3,985,236 bytes ≈ 3.99 MB |
| courtyard.glb | 1,861,228 bytes |
| shirt.glb | 262,388 bytes / 6,938 triangles |
| ลายเสื้อครีม / สีป่า | 94,020 / 91,790 bytes |
| JS + โมเดลและลายที่โหลดเพิ่มภายหลัง | 2,318,331 bytes ≈ 2.32 MB |
| ภาพสำรองเสื้อ | 29,432 bytes |
| Draw calls สูงสุดใน 25 จุดช่วงเชื่อมฉาก | 90 / งบ 110 |
| Triangles สูงสุดใน 25 จุดช่วงเชื่อมฉาก | 145,504 / งบ 180,000 |
| Draw calls ที่จุดหลัก โลก / ตัวละคร / ผู้สร้าง / เสื้อ | 50 / 75 / 37 / 45 |

ขนาดจากเซิร์ฟเวอร์ในเครื่องแบบไม่บีบอัด ไม่รวม HTTP headers; การบีบอัดบนโฮสต์อาจลด bytes ลง งบช่วงเชื่อมฉากรองรับทั้งวิหารและลานที่มองเห็นพร้อมกันก่อนถึงสวน ตัวนับการวาดไม่ใช่การวัด FPS

## เปิดและตรวจซ้ำ

เปิดเว็บตัวอย่างจากโฟลเดอร์หลัก:

```powershell
Set-Location -LiteralPath 'D:\Cats\Cats SSR'
& 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' website-preview.py --port 8770
```

เปิด `http://127.0.0.1:8770/#collection` เพื่อดูเสื้อ หรือ `/#characters` เพื่อดูตัวละคร เปิดเซิร์ฟเวอร์ค้างไว้ระหว่างใช้งาน หน้า `/game/` ในตัวอย่างส่งต่อไปเกมจริง; ชุด QA จะ intercept การเข้าเกมเพื่อไม่โหลด Unity หรือใช้บัญชีจริง

```powershell
node website-qa/courtyard/browser-check.cjs
node website-qa/courtyard/edge-check.cjs
node website-qa/courtyard/camera-clearance.cjs
node website-qa/sanctuary/protection-audit.cjs
```

## เตรียมเผยแพร่

ใช้ขั้นตอน GitHub Pages ใน `SANCTUARY-HANDOFF.md` โดย stage เฉพาะไฟล์ที่อนุญาตดังนี้:

```powershell
git add -- index.html sanctuary.css sanctuary.js sanctuary-scene.js courtyard.css courtyard-scene.js assets/sanctuary assets/courtyard assets/vendor SANCTUARY-HANDOFF.md COURTYARD-HANDOFF.md
```

ตรวจรายการ staged, commit งาน, ซิงก์ `git pull --rebase origin main`, ตรวจ protected paths และ QA อีกครั้งหากมีความเปลี่ยนแปลงที่เกี่ยวข้อง แล้ว push เมื่อเผยแพร่จริง ห้าม force-push และห้ามใช้สคริปต์ deploy Unity สำหรับงานหน้าแรกนี้
