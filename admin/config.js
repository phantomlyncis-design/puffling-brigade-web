// config.js - ค่าจาก Supabase ▸ Project Settings ▸ API Keys
//
// ค่าพวกนี้คัดลอกมาจาก Assets/_Game/Resources/SupabaseConfig.asset ของเกมโดยตรง
// ถ้าวันไหนเปลี่ยนโปรเจกต์ Supabase ต้องแก้ทั้งสองที่ให้ตรงกัน
//
// ⚠️ ใส่ได้เฉพาะ publishable key เท่านั้น (ขึ้นต้นด้วย sb_publishable_)
//
//    ห้ามใส่ secret key เด็ดขาด แม้จะเป็นหน้าแอดมินก็ตาม
//    เพราะไฟล์นี้อยู่ในหน้าเว็บ ใครเปิดหน้านี้ก็กด View Source อ่านได้
//
//    สิทธิ์แอดมินไม่ได้มาจากกุญแจ แต่มาจากการที่บัญชีคุณอยู่ในตาราง admins
//    (ดู supabase/003_admin.sql) ฐานข้อมูลเป็นคนตรวจให้ ไม่ใช่หน้าเว็บนี้

window.PUFFLING_CONFIG = {
  url: "https://rxrtkazihjbrouiyntls.supabase.co",
  anonKey: "sb_publishable_ihdBZ3_icI_ssrgvtxGPbA_PITJ9myY"
};
