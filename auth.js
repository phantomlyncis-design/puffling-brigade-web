(() => {
  'use strict';
  const cfg = window.PUFFLING_SITE_CONFIG;
  const ui = window.PufflingUI;
  const $ = selector => document.querySelector(selector);
  const KEY = 'puffling_website_session_v1';
  const ADMIN_KEY = 'puffling_admin_session';
  let session = null, verified = false, admin = false, epoch = 0;
  let checking = null, pendingCollection = false, busy = false;
  const accountDialog = $('#account-dialog');
  const form = $('#login-form');
  const submit = form.querySelector('[type="submit"]');
  const collectionButton = $('#collection-access');

  function saveSession() {
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
    } catch (_) { /* Continue in memory when browser storage is unavailable. */ }
  }
  function render() {
    $('#login-content').hidden = verified;
    $('#member-content').hidden = !verified;
    $('#member-email').textContent = verified ? session.email : '';
    $('[data-login]').textContent = verified ? 'บัญชีของฉัน ↗' : 'เข้าสู่ระบบ ↗';
    $('#account-title').textContent = verified ? 'สมาชิกกองทัพปุยนุ่น' : 'ยินดีต้อนรับกลับมา';
    document.querySelectorAll('[data-admin]').forEach(link => { link.hidden = !(verified && admin); });
    collectionButton.textContent = verified ? 'ดูคอลเลกชันสมาชิก ↗' : 'เข้าสู่ระบบเพื่อดูคอลเลกชัน ↗';
  }
  function clearLocal() {
    epoch++; session = null; verified = false; admin = false; checking = null;
    saveSession(); render();
    $('#collection-dialog').close();
  }
  function friendly(error) {
    if (error.name === 'AbortError') return 'การเชื่อมต่อใช้เวลานาน กรุณาลองใหม่อีกครั้ง';
    if (error.status === 429) return 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง';
    if (error.code === 'email_not_confirmed') return 'กรุณายืนยันอีเมลของบัญชีก่อนเข้าสู่ระบบ';
    if ([400,401,403].includes(error.status)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง';
    return 'เชื่อมต่อระบบสมาชิกไม่ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง';
  }
  async function request(path, {method='GET', body, token}={}) {
    if (!cfg || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url) || !cfg.anonKey.startsWith('sb_publishable_')) throw new Error('Invalid public configuration');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const headers = {'apikey':cfg.anonKey,'Content-Type':'application/json'};
      if (token) headers.Authorization = 'Bearer ' + token;
      const response = await fetch(cfg.url + path, {method,headers,body:body === undefined ? undefined : JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit'});
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) { throw new Error('Invalid API response'); }
      if (!response.ok) { const error = new Error('Request failed'); error.status=response.status; error.code=data && data.error_code; throw error; }
      return data;
    } finally { clearTimeout(timeout); }
  }
  function normalize(data) {
    if (!data || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string' || !data.user || !data.user.id) throw new Error('Incomplete session');
    return {access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(data.expires_in)||3600),email:data.user.email||'',user_id:data.user.id};
  }
  // Auth /user validates credentials on the server. Local storage never grants roles.
  async function verifyMember() {
    if (!session) return false;
    if (checking) return checking;
    const currentEpoch = epoch;
    const operation = (async () => {
      try {
        let candidate = session;
        if (candidate.expires_at - 90 <= Math.floor(Date.now()/1000)) {
          candidate = normalize(await request('/auth/v1/token?grant_type=refresh_token', {method:'POST',body:{refresh_token:candidate.refresh_token}}));
          if (currentEpoch !== epoch) return false;
          session = candidate; saveSession();
        }
        const user = await request('/auth/v1/user', {token:candidate.access_token});
        if (currentEpoch !== epoch) return false;
        if (!user || !user.id || user.id !== candidate.user_id) throw Object.assign(new Error('Session mismatch'),{status:401});
        session.email = user.email || ''; verified = true;
        saveSession(); render();
        return true;
      } catch (error) {
        if (currentEpoch === epoch) {
          verified = false; admin = false;
          if ([400,401,403].includes(error.status)) clearLocal(); else render();
        }
        throw error;
      }
    })();
    checking = operation;
    try { return await operation; } finally { if (checking === operation) checking = null; }
  }
  async function checkAdmin() {
    admin = false; render();
    if (!verified || !session) return false;
    const currentEpoch = epoch;
    const token = session.access_token;
    const result = await request('/rest/v1/rpc/is_admin',{method:'POST',body:{},token});
    if (currentEpoch !== epoch || !session || session.access_token !== token) return false;
    admin = result === true; render(); return admin;
  }
  function openAccount() { $('#auth-message').textContent=''; ui.showDialog(accountDialog); }
  document.querySelectorAll('[data-login]').forEach(button => button.addEventListener('click', () => { pendingCollection=false; openAccount(); }));
  accountDialog.addEventListener('close', () => { $('#password').value=''; pendingCollection=false; });
  $('#password-toggle').addEventListener('click', () => {
    const password = $('#password'), show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    $('#password-toggle').textContent = show ? 'ซ่อน' : 'แสดง';
    $('#password-toggle').setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');
    $('#password-toggle').setAttribute('aria-pressed',String(show));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy=true; submit.disabled=true; submit.textContent='กำลังเข้าสู่ระบบ…';
    $('#auth-message').textContent='';
    const currentEpoch = ++epoch;
    try {
      const data = await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:$('#email').value.trim(),password:$('#password').value}});
      if (currentEpoch !== epoch) return;
      session=normalize(data); checking=null; saveSession();
      if (!await verifyMember()) return;
      try { await checkAdmin(); } catch (_) { $('#auth-message').textContent='เข้าสู่ระบบแล้ว แต่ยังตรวจสิทธิ์แอดมินไม่ได้ ลองเปิดบัญชีใหม่อีกครั้ง'; }
      $('#password').value=''; $('#password').type='password';
      $('#password-toggle').textContent='แสดง'; $('#password-toggle').setAttribute('aria-pressed','false'); $('#password-toggle').setAttribute('aria-label','แสดงรหัสผ่าน');
      if (pendingCollection && accountDialog.open) { pendingCollection=false; accountDialog.close(); ui.showDialog($('#collection-dialog')); }
      else if (accountDialog.open) $('#member-collection').focus();
    } catch (error) { $('#auth-message').textContent=friendly(error); }
    finally { busy=false; submit.disabled=false; submit.textContent='เข้าสู่ระบบ →'; }
  });
  async function openCollection() {
    collectionButton.disabled = true;
    try {
      if (!await verifyMember()) { pendingCollection=true; openAccount(); return; }
      accountDialog.close(); ui.showDialog($('#collection-dialog'));
    } catch (error) { ui.toast(friendly(error)); }
    finally { collectionButton.disabled=false; }
  }
  collectionButton.addEventListener('click',openCollection);
  $('#member-collection').addEventListener('click',openCollection);
  $('#signout').addEventListener('click', async () => {
    const token = session && session.access_token;
    clearLocal(); $('#auth-message').textContent='ออกจากระบบเว็บไซต์แล้ว';
    // Revoke only this website session; do not log the player out of the game.
    if (token) {
      try { await request('/auth/v1/logout?scope=local',{method:'POST',token}); }
      catch (_) { $('#auth-message').textContent='ออกจากระบบบนหน้านี้แล้ว แต่ยังยกเลิกเซสชันบนเซิร์ฟเวอร์ไม่ได้เพราะการเชื่อมต่อขัดข้อง'; }
    }
  });
  document.querySelectorAll('[data-admin]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault(); if (busy) return; busy=true;
    try {
      if (!await verifyMember() || !await checkAdmin()) { ui.toast('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานแอดมิน'); return; }
      // Exact session shape consumed by the existing /admin/app.js. Transfer only
      // after server role verification, and let admin own subsequent refreshes.
      try { localStorage.setItem(ADMIN_KEY,JSON.stringify(session)); }
      catch (_) { ui.toast('เบราว์เซอร์ไม่อนุญาตให้ส่งต่อบัญชี กรุณาเข้าสู่ระบบอีกครั้งที่หน้าแอดมิน'); }
      clearLocal(); window.location.assign('/admin/');
    } catch (error) { ui.toast(friendly(error)); }
    finally { busy=false; }
  }));
  // Revalidate restored state, including after back/forward cache restoration.
  async function restore() {
    if (busy) return;
    try {
      const raw = sessionStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved.access_token === 'string' && typeof saved.refresh_token === 'string' && typeof saved.user_id === 'string' && Number.isFinite(saved.expires_at)) session=saved;
      if (session && await verifyMember()) await checkAdmin();
    } catch (error) { if (session) ui.toast(friendly(error)); }
  }
  window.addEventListener('pageshow', event => { if (event.persisted) { verified=false; admin=false; render(); restore(); } });
  $('[data-login]').addEventListener('click', async () => { if (session) { try { if (await verifyMember()) await checkAdmin(); } catch(error) { $('#auth-message').textContent=friendly(error); } } });
  render(); restore();
})();
