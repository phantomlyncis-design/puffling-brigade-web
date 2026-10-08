(() => {
  'use strict';
  const root = document.documentElement;
  const menu = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  function closeMenu() { mobileNav.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'เปิดเมนู'); }
  menu.addEventListener('click', () => {
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menu.setAttribute('aria-expanded', String(opening));
    menu.setAttribute('aria-label', opening ? 'ปิดเมนู' : 'เปิดเมนู');
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

  // Native dialogs provide keyboard focus containment and Escape support.
  const dialogOpeners = new WeakMap();
  function showDialog(dialog) {
    closeMenu();
    if (dialog.open) return;
    dialogOpeners.set(dialog, document.activeElement);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) {
        document.body.classList.remove('modal-open');
        const opener = dialogOpeners.get(dialog);
        if (opener && opener.isConnected && !opener.closest('dialog')) opener.focus({preventScroll:true});
      }
    });
  });
  let toastTimer;
  function toast(message) {
    const box = document.querySelector('#toast');
    clearTimeout(toastTimer); box.textContent = message; box.hidden = false;
    toastTimer = setTimeout(() => { box.hidden = true; }, 7000);
  }
  window.PufflingUI = Object.freeze({showDialog, toast});

  const characters = {
    rachan: {name:'ราชันขนฟู', element:'UR / ธาตุแดง · ระเบิดวง', description:'ราชันตัวจิ๋วผู้มาพร้อมมงกุฎทองและลูกไฟ โจมตีเป็นวงกว้าง พร้อมสกิลคริติคอล ช่วยทีมจัดการศัตรูที่รวมกลุ่มกัน'},
    wayu: {name:'วายุเขียว', element:'UR / ธาตุเขียว · ระยะไกล', description:'นักธนูสีเขียวผู้โจมตีจากแนวหลัง มาพร้อมสกิลผลักถอย ช่วยสร้างพื้นที่ให้เพื่อนร่วมทีมได้เดินหน้าต่อ'},
    niran: {name:'นิรันดร์น้ำเงิน', element:'UR / ธาตุน้ำเงิน · กันแนว', description:'ผู้ปกป้องแนวหน้าของกองทัพปุยนุ่น มาพร้อมโล่แรกเข้าและบทบาทกันแนว คอยรับแรงปะทะให้เพื่อนร่วมทีม'}
  };
  document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.character, character = characters[key];
    document.querySelector('#character-title').textContent = character.name;
    document.querySelector('#character-element').textContent = character.element;
    document.querySelector('#character-description').textContent = character.description;
    const portrait = document.querySelector('#character-portrait');
    portrait.src = '/assets/' + key + '.webp'; portrait.alt = character.name;
    showDialog(document.querySelector('#character-dialog'));
  }));

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = media.matches;
  try { paused = paused || localStorage.getItem('puffling_motion_paused') === 'true'; } catch (_) {}
  const motionButton = document.querySelector('#motion-toggle');
  function applyMotion() {
    root.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'เปิดภาพเคลื่อนไหว' : 'หยุดภาพเคลื่อนไหว');
    motionButton.textContent = (paused ? '▷ เปิดการเคลื่อนไหว' : 'Ⅱ หยุดการเคลื่อนไหว');
  }
  motionButton.addEventListener('click', () => {
    if (media.matches) { toast('อุปกรณ์ของคุณตั้งค่าให้ลดการเคลื่อนไหวอยู่ เว็บไซต์จะใช้การตั้งค่านี้'); return; }
    paused = !paused; applyMotion();
    try { localStorage.setItem('puffling_motion_paused', String(paused)); } catch (_) {}
  });
  media.addEventListener('change', () => { paused = media.matches; applyMotion(); });
  applyMotion();
  const fireflies = document.querySelector('.fireflies');
  for (let i = 0; i < 18; i++) {
    const mote = document.createElement('span'); mote.className = 'firefly';
    mote.style.cssText = `left:${(i * 37 + 9) % 100}%;top:${(i * 23 + 17) % 100}%;--duration:${5 + i % 7}s;--delay:-${i % 5}s`;
    fireflies.appendChild(mote);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } });
    }, {threshold:0.08});
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('page-away', document.hidden));
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
