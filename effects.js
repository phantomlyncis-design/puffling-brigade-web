(() => {
  'use strict';
  const root=document.documentElement, body=document.body, hero=document.querySelector('.hero');
  const canvas=document.querySelector('#hero-cosmos'), ctx=canvas.getContext('2d');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const cursor=document.querySelector('.explorer-cursor');
  const chargeButton=document.querySelector('#charge-portal');
  const book=document.querySelector('#spellbook-dialog');
  let width=0,height=0,dpr=1,raf=0,last=0,visible=true,mouse={x:.65,y:.4},smoothed={x:0,y:0};
  let pointer={x:-1000,y:-1000},particles=[],bursts=[],hue='240,195,108';
  let charge=0,charging=false,automatic=false,awakenedUntil=0,lastPointerType='mouse',lastSound=0;
  let sound=false,audio=null,scrollPending=false;
  const paused=()=>reduce.matches||root.classList.contains('motion-paused');

  function resize(){
    const box=hero.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);
    particles=Array.from({length:width<600?48:100},(_,i)=>({x:((i*73.31+17.2)%100)/100,y:((i*37.79+9.3)%100)/100,z:.25+(i%5)*.18,size:.5+(i%4)*.45,phase:i*.71}));
    if(paused())draw(performance.now());
  }
  function draw(time){
    if(!ctx)return;
    ctx.clearRect(0,0,width,height);
    const moving=!paused();
    const phase=moving?time*.00015:0;
    const points=[];
    particles.forEach((p,i)=>{
      const x=p.x*width+smoothed.x*p.z*28+Math.sin(phase+p.phase)*9;
      const y=p.y*height+smoothed.y*p.z*20+Math.cos(phase*.8+p.phase)*7;
      const near=Math.hypot(pointer.x-x,pointer.y-y);
      const alpha=.2+p.z*.45+(near<130?.25:0);
      ctx.fillStyle=`rgba(${i%3===0?'152,206,242':hue},${alpha})`;
      ctx.beginPath();ctx.arc(x,y,p.size+(near<100?.6:0),0,Math.PI*2);ctx.fill();
      if(near<180&&fine.matches)points.push({x,y,near});
      if(i%18===0){ctx.strokeStyle=`rgba(${hue},.35)`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}
    });
    points.slice(0,12).forEach((p,i)=>{
      ctx.strokeStyle=`rgba(${hue},${.18*(1-p.near/180)})`;ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(p.x,p.y);ctx.stroke();
      if(i>0){ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(p.x,p.y);ctx.stroke();}
    });
    if(moving){
      // One slow meteor, rather than repeated full-screen flashes.
      const progress=(time%12000)/12000;
      if(progress<.16){const x=width*.8-progress*width*1.8,y=height*.06+progress*height*.65;const gradient=ctx.createLinearGradient(x,y,x+90,y-38);gradient.addColorStop(0,'rgba(207,235,250,.65)');gradient.addColorStop(1,'rgba(207,235,250,0)');ctx.strokeStyle=gradient;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+90,y-38);ctx.stroke();}
    }
    bursts=bursts.filter(p=>time-p.born<900);
    bursts.forEach(p=>{const age=Math.max(0,Math.min(1,(time-p.born)/900)),r=age*75;ctx.strokeStyle=`rgba(${hue},${(1-age)*.45})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.fillStyle=`rgba(${hue},${1-age})`;ctx.fillRect(p.x+Math.cos(a)*r*1.2,p.y+Math.sin(a)*r*1.2,2,2);}});
  }
  function tone(frequency=440,length=.1){
    if(!sound||!audio||audio.state!=='running')return;
    const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(frequency*1.35,now+length);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.04,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+length);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(now+length+.02);
  }
  function paintCharge(){
    chargeButton.style.setProperty('--charge',String(charge/100));
    document.querySelector('#charge-number').textContent=Math.round(charge)+'%';
    document.querySelector('#charge-label').textContent=charge>=100?'✦ ประตูเปิดแล้ว':charge>0?'✦ กำลังปลุกพลัง…':'✦ กดค้างเพื่อปลุกประตู';
  }
  function awaken(){
    charging=false;automatic=false;charge=100;paintCharge();awakenedUntil=performance.now()+3500;
    hero.classList.add('portal-awakened');document.querySelector('#portal-status').textContent='ประตูเปิดแล้ว นักสำรวจ!';
    document.querySelector('#portal-announcement').textContent='ประตูอัญเชิญเปิดแล้ว! เป็นเอฟเฟกต์บนเว็บไซต์เท่านั้น';
    if(!paused()){const r=document.querySelector('.hero-art').getBoundingClientRect(),h=hero.getBoundingClientRect();bursts.push({x:r.left-h.left+r.width/2,y:r.top-h.top+r.height*.4,born:performance.now()});}
    tone(523,.45);setTimeout(()=>tone(659,.35),100);setTimeout(()=>tone(784,.4),220);
    // Timeout also restores the UI when reduced motion stops the canvas loop.
    setTimeout(()=>{if(performance.now()>=awakenedUntil-30){hero.classList.remove('portal-awakened');charge=0;paintCharge();document.querySelector('#portal-status').textContent='พร้อมออกผจญภัย';}},3600);
  }
  function startCharge(auto=false){
    if(performance.now()<awakenedUntil)return;
    if(paused()){awaken();return;}
    charging=true;automatic=auto;document.querySelector('#portal-announcement').textContent='';schedule();
  }
  function stopCharge(){if(!automatic)charging=false;}
  chargeButton.addEventListener('pointerdown',event=>{lastPointerType=event.pointerType;if(event.pointerType==='mouse'&&event.button===0){chargeButton.setPointerCapture(event.pointerId);startCharge(false);}});
  chargeButton.addEventListener('pointerup',stopCharge);chargeButton.addEventListener('pointercancel',()=>{charging=false;automatic=false;});chargeButton.addEventListener('lostpointercapture',stopCharge);
  chargeButton.addEventListener('click',event=>{if(event.detail===0||lastPointerType!=='mouse')startCharge(true);});
  document.querySelectorAll('[data-element]').forEach(button=>button.addEventListener('click',()=>{
    const theme={gold:['240,195,108','#f0c36c','0deg'],mint:['118,233,182','#76e9b6','55deg'],blue:['120,190,255','#78beff','160deg']}[button.dataset.element];
    hue=theme[0];body.style.setProperty('--portal-rgb',hue);body.style.setProperty('--portal-color',theme[1]);document.querySelector('.portal-ring').style.filter=`hue-rotate(${theme[2]}) drop-shadow(0 0 18px rgba(${hue},.5))`;
    document.querySelectorAll('[data-element]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});tone(380,.14);if(paused())draw(performance.now());
  }));
  function frame(time){
    raf=0;if(!visible||document.hidden||paused())return;
    const dt=Math.min((time-(last||time))/1000,.06);last=time;
    smoothed.x+=(mouse.x*2-1-smoothed.x)*.06;smoothed.y+=(mouse.y*2-1-smoothed.y)*.06;
    body.style.setProperty('--scene-x',smoothed.x.toFixed(3));body.style.setProperty('--scene-y',smoothed.y.toFixed(3));
    if(charging){charge=Math.min(100,charge+dt*55);paintCharge();if(charge>=100)awaken();}
    else if(charge>0&&charge<100){charge=Math.max(0,charge-dt*80);paintCharge();}
    draw(time);raf=requestAnimationFrame(frame);
  }
  function schedule(){if(!raf&&visible&&!document.hidden&&!paused()){last=0;raf=requestAnimationFrame(frame);}}
  function syncMotion(){if(paused()||document.hidden||!visible){cancelAnimationFrame(raf);raf=0;charging=false;automatic=false;if(charge<100){charge=0;paintCharge();}if(paused()){smoothed={x:0,y:0};pointer={x:-1000,y:-1000};cursor.style.opacity='0';draw(performance.now());}}else schedule();}
  hero.addEventListener('pointermove',event=>{if(!fine.matches||paused())return;const r=hero.getBoundingClientRect();mouse.x=(event.clientX-r.left)/r.width;mouse.y=(event.clientY-r.top)/r.height;pointer={x:event.clientX-r.left,y:event.clientY-r.top};document.querySelector('#portal-coordinates').textContent=`X ${Math.round(mouse.x*100).toString().padStart(3,'0')} / Y ${Math.round(mouse.y*100).toString().padStart(3,'0')}`;},{passive:true});
  hero.addEventListener('pointerleave',()=>{mouse={x:.5,y:.5};pointer={x:-1000,y:-1000};});
  hero.addEventListener('pointerdown',event=>{if(paused()||event.target.closest('button,a,input'))return;const r=hero.getBoundingClientRect();bursts.push({x:event.clientX-r.left,y:event.clientY-r.top,born:performance.now()});bursts=bursts.slice(-8);tone(330,.14);});
  let cursorPending=false,cursorPoint={x:0,y:0};
  document.addEventListener('pointermove',event=>{
    if(!fine.matches||paused()||event.pointerType!=='mouse')return;
    cursorPoint={x:event.clientX,y:event.clientY};cursor.style.opacity='1';cursor.classList.toggle('over-control',!!event.target.closest('a,button,summary'));
    if(!cursorPending){cursorPending=true;requestAnimationFrame(()=>{cursorPending=false;cursor.style.transform=`translate(${cursorPoint.x-cursor.offsetWidth/2}px,${cursorPoint.y-cursor.offsetHeight/2}px)`;});}
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{cursor.style.opacity='0';});
  document.querySelectorAll('.character-card,.product-card,.world-image').forEach(card=>{
    card.addEventListener('pointermove',event=>{
      if(!fine.matches||paused())return;
      const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
      card.style.animation='none';card.style.transform=`perspective(900px) rotateX(${(y-.5)*-9}deg) rotateY(${(x-.5)*11}deg) translateY(-4px)`;card.style.setProperty('--shine-x',x*100+'%');card.style.setProperty('--shine-y',y*100+'%');
    },{passive:true});card.addEventListener('pointerleave',()=>{card.style.transform='';});
  });
  function updateScroll(){const max=root.scrollHeight-innerHeight;root.style.setProperty('--reading-progress',String(max>0?scrollY/max:0));body.style.setProperty('--scroll-shift',Math.min(scrollY,900)+'px');scrollPending=false;}
  window.addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateScroll);}},{passive:true});
  window.addEventListener('resize',()=>{resize();updateScroll();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion();},{threshold:0}).observe(hero);
  new MutationObserver(syncMotion).observe(root,{attributes:true,attributeFilter:['class']});
  reduce.addEventListener('change',syncMotion);document.addEventListener('visibilitychange',()=>{syncMotion();if(document.hidden&&audio&&audio.state==='running')audio.suspend().catch(()=>{});});
  window.addEventListener('blur',()=>{charging=false;automatic=false;cursor.style.opacity='0';});
  const soundButton=document.querySelector('#sound-toggle');
  soundButton.addEventListener('click',async()=>{
    try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');audio=new Audio();}sound=!sound;if(sound)await audio.resume();else await audio.suspend();soundButton.setAttribute('aria-pressed',String(sound));soundButton.textContent=sound?'♫ ปิดเสียง':'♫ เปิดเสียง';tone(523,.16);}catch(_){sound=false;window.PufflingUI.toast('เบราว์เซอร์นี้ยังเปิดเสียงไม่ได้ คุณสำรวจต่อได้ตามปกติ');}
  });
  document.addEventListener('pointerover',event=>{if(event.target.closest('button,a')&&performance.now()-lastSound>160){lastSound=performance.now();tone(650,.05);}});
  document.querySelector('#open-spellbook').addEventListener('click',()=>window.PufflingUI.showDialog(book));
  function command(value){
    const cmd=value.trim().toLowerCase();if(!cmd)return;
    const out=document.querySelector('#spellbook-output');const row=document.createElement('p');row.textContent='› '+value.slice(0,60);out.appendChild(row);
    const answer=document.createElement('p');
    if(cmd==='help'){answer.textContent='help — ดูคำสั่ง / summon — ปลุกประตู / world — สำรวจโลก / creator — พบผู้สร้าง / clear — ล้างสมุด';}
    else if(cmd==='clear'){out.replaceChildren();answer.textContent='✦ หน้ากระดาษใหม่ พร้อมผจญภัยต่อ';}
    else if(cmd==='summon'){answer.textContent='✦ กำลังปลุกประตูอัญเชิญ';book.close();hero.scrollIntoView({behavior:paused()?'instant':'smooth'});startCharge(true);}
    else if(cmd==='world'||cmd==='creator'){answer.textContent='✦ กำลังพาไปยัง '+cmd;book.close();document.getElementById(cmd).scrollIntoView({behavior:paused()?'instant':'smooth'});}
    else{answer.textContent='ยังไม่มีเวทนี้ ลอง help, summon, world หรือ creator';}
    out.appendChild(answer);while(out.children.length>25)out.firstElementChild.remove();out.scrollTop=out.scrollHeight;tone(440,.1);
  }
  document.querySelector('#spellbook-form').addEventListener('submit',event=>{event.preventDefault();const input=document.querySelector('#spellbook-command');command(input.value);input.value='';});
  document.querySelectorAll('[data-spell]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.spell)));
  resize();updateScroll();schedule();
})();
