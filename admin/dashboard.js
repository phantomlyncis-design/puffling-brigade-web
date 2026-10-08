/* Revenue reports are local-only until a real shop data source is connected.
   No currency, purchases, or player records are created by this module. */
(function () {
  'use strict';
  var records = null, source = 'empty', sourceName = '', kind = 'bar', days = 30, dataRevision = 0;
  var money = new Intl.NumberFormat('th-TH', {minimumFractionDigits:0,maximumFractionDigits:2});
  function $(id) { return document.getElementById(id); }
  function esc(value) { return String(value).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function baht(satang) { return '฿' + money.format(satang / 100); }
  function today() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10); }
  function dates(count) {
    var end = new Date(today() + 'T00:00:00Z').getTime(), output = [];
    for (var i=count-1;i>=0;i--) output.push(new Date(end-i*86400000).toISOString().slice(0,10));
    return output;
  }
  function shortDate(date) { return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')); }
  function sample() {
    return dates(90).map(function(date,i) {
      var orders = 2 + (i*7)%13, gross = orders * 49000;
      return {date:date,gross:gross,refunds:i%9===0?49000:0,orders:orders};
    });
  }
  function status(text, error) { $('revenueMessage').textContent=text; $('revenueMessage').className='msg '+(error?'err':'ok'); }
  function table(rows) {
    if(!rows.length)return '<div class="empty">ไม่มีข้อมูลในช่วงเวลานี้</div>';
    return '<table><thead><tr><th>วันที่</th><th class="num">ยอดขายรวม (บาท)</th><th class="num">คืนเงิน (บาท)</th><th class="num">หลังคืนเงิน (บาท)</th><th class="num">คำสั่งซื้อ</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+r.date+'</td><td class="num">'+money.format(r.gross/100)+'</td><td class="num">'+money.format(r.refunds/100)+'</td><td class="num">'+money.format((r.gross-r.refunds)/100)+'</td><td class="num">'+r.orders+'</td></tr>';}).join('')+'</tbody></table>';
  }
  function emptyChart(title, description) {
    $('revenueChart').innerHTML='<div class="empty-chart"><span aria-hidden="true">▥</span><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p></div>';
  }
  function chart(windowDates, selected) {
    var map=new Map(selected.map(function(r){return [r.date,r];}));
    var values=selected.map(function(r){return (r.gross-r.refunds)/100;});
    var minimum=Math.min(0,Math.min.apply(null,values)), maximum=Math.max(0,Math.max.apply(null,values));
    if(minimum===maximum)maximum=1;
    var span=maximum-minimum; maximum+=span*.15;if(minimum<0)minimum-=span*.1;
    var W=Math.max(260,$('revenueChart').clientWidth),H=255,left=48,right=W-12,top=20,bottom=221;
    function y(n){return bottom-(n-minimum)/(maximum-minimum)*(bottom-top);}
    function x(i){return left+(i+.5)/windowDates.length*(right-left);}
    var html='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="revenueSvgTitle revenueSvgDesc"><title id="revenueSvgTitle">'+(source==='demo'?'ข้อมูลสมมติ: ':'')+'ยอดขายสินค้าหลังคืนเงิน '+days+' วัน</title><desc id="revenueSvgDesc">หน่วยบาท วันที่ไม่มีข้อมูลเว้นช่องว่าง ดูตัวเลขทั้งหมดได้ในตารางรายวัน</desc>';
    for(var t=0;t<=4;t++){var value=minimum+(maximum-minimum)*t/4,py=y(value);html+='<line class="chart-grid" x1="'+left+'" x2="'+right+'" y1="'+py+'" y2="'+py+'"/><text class="chart-axis" x="'+(left-9)+'" y="'+(py+3)+'" text-anchor="end">'+esc(new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value))+'</text>';}
    html+='<line x1="'+left+'" x2="'+right+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="#8aa89d66"/>';
    var line='',open=false;
    windowDates.forEach(function(date,i){
      var r=map.get(date);if(!r){open=false;return;}
      var net=(r.gross-r.refunds)/100,cx=x(i),cy=y(net);
      line+=(open?' L ':' M ')+cx.toFixed(2)+' '+cy.toFixed(2);open=true;
      var label=(source==='demo'?'ข้อมูลสมมติ · ':'')+shortDate(date)+' · '+baht(r.gross-r.refunds)+' · '+r.orders+' คำสั่งซื้อ';
      html+='<g class="chart-data-group" tabindex="0" role="img" aria-label="'+esc(label)+'" data-tip="'+esc(label)+'"><title>'+esc(label)+'</title>';
      if(kind==='bar'){var barWidth=Math.max(2,(right-left)/windowDates.length*.65),zero=y(0);html+='<rect class="chart-bar'+(net<0?' negative':'')+'" x="'+(cx-barWidth/2)+'" y="'+Math.min(cy,zero)+'" width="'+barWidth+'" height="'+Math.max(2,Math.abs(cy-zero))+'" rx="2"/>';}
      else html+='<circle class="chart-dot" cx="'+cx+'" cy="'+cy+'" r="4"/>';
      html+='</g>';
    });
    if(kind==='line')html+='<path class="chart-line" d="'+line+'" pointer-events="none"/>';
    var labels=[0,Math.floor((windowDates.length-1)/3),Math.floor((windowDates.length-1)*2/3),windowDates.length-1];
    labels.forEach(function(i){html+='<text class="chart-axis" x="'+x(i)+'" y="245" text-anchor="middle">'+esc(shortDate(windowDates[i]))+'</text>';});
    html+='</svg><div class="chart-tooltip" hidden></div>';
    $('revenueChart').innerHTML=html;
    var tooltip=$('revenueChart').querySelector('.chart-tooltip');
    var groups=Array.from($('revenueChart').querySelectorAll('[data-tip]'));
    groups.forEach(function(node,index){
      node.setAttribute('tabindex',index===0?'0':'-1');
      var show=function(){tooltip.textContent=node.dataset.tip;tooltip.hidden=false;};
      var hide=function(){tooltip.hidden=true;};
      node.addEventListener('pointerenter',show);node.addEventListener('pointerleave',hide);node.addEventListener('focus',show);node.addEventListener('blur',hide);
      node.addEventListener('keydown',function(event){
        var next=index;
        if(event.key==='ArrowRight')next=Math.min(groups.length-1,index+1);
        else if(event.key==='ArrowLeft')next=Math.max(0,index-1);
        else if(event.key==='Home')next=0;else if(event.key==='End')next=groups.length-1;else return;
        event.preventDefault();groups.forEach(function(g,i){g.setAttribute('tabindex',i===next?'0':'-1');});groups[next].focus();
      });
    });
  }
  function render() {
    var selectedDates=dates(days), start=selectedDates[0], end=selectedDates[selectedDates.length-1];
    var selected=(records||[]).filter(function(r){return r.date>=start&&r.date<=end;});
    $('revenueSource').textContent=source==='demo'?'ข้อมูลสมมติ / DEMO':source==='csv'?'CSV บนเครื่อง':'ยังไม่มีแหล่งข้อมูล';
    $('revenueSource').className='source-chip'+(source==='demo'?' sample':source==='csv'?' imported':'');
    $('revenueClear').hidden=source==='empty';$('revenueExport').disabled=selected.length===0;
    $('revenueDemo').textContent=source==='demo'?'กำลังดูข้อมูลสมมติ':'ลองกราฟข้อมูลสมมติ';
    ['revenueGross','revenueRefunds','revenueNet','revenueOrders'].forEach(function(id){$(id).textContent='—';});
    if(selected.length){
      var sums=selected.reduce(function(a,r){a.gross+=r.gross;a.refunds+=r.refunds;a.orders+=r.orders;return a;},{gross:0,refunds:0,orders:0});
      $('revenueGross').textContent=baht(sums.gross);$('revenueRefunds').textContent=baht(sums.refunds);$('revenueNet').textContent=baht(sums.gross-sums.refunds);$('revenueOrders').textContent=money.format(sums.orders);
      chart(selectedDates,selected);
    }else emptyChart(source==='empty'?'พร้อมสำหรับร้านค้าในอนาคต':'ไม่มีข้อมูลในช่วงเวลานี้',source==='empty'?'ยังไม่เชื่อมต่อระบบรายได้ ลองกราฟตัวอย่างหรือนำเข้า CSV ของคุณ':'เลือกช่วงเวลาอื่น หรือใช้ไฟล์ที่มีข้อมูลใน 90 วันล่าสุด');
    $('revenueCaption').textContent=source==='demo'?'ข้อมูลสมมติทั้งหมด ไม่ใช่ยอดขายจริง · '+days+' วัน · หน่วยบาท':source==='csv'?sourceName+' · มีข้อมูล '+selected.length+'/'+days+' วัน · วันที่ไม่มีแถวข้อมูลเว้นว่าง': 'เกมไม่มีการเติมเงินจริง · ส่วนนี้เตรียมสำหรับยอดขายสินค้านอกเกม';
    $('revenueTable').innerHTML=table(selected);
  }
  function parseCsv(text) {
    if(text.length>1000000)throw new Error('ไฟล์ใหญ่เกิน 1 MB');
    text=text.replace(/^\uFEFF/,'');
    var rows=[],row=[],field='',quoted=false;
    for(var i=0;i<text.length;i++){
      var c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(field.trim());field='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(quoted)throw new Error('รูปแบบ CSV ไม่สมบูรณ์: เครื่องหมายคำพูดไม่ครบ');
    row.push(field.trim());if(row.some(Boolean))rows.push(row);
    if(!rows.length||rows[0].join(',').toLowerCase()!=='date,gross,refunds,orders')throw new Error('หัวตารางต้องเป็น date,gross,refunds,orders ตามแม่แบบ');
    if(rows.length<2)throw new Error('ไฟล์นี้ยังไม่มีข้อมูลรายวัน');
    if(rows.length>3661)throw new Error('รองรับสูงสุด 3,660 วันต่อไฟล์');
    var seen=new Set();
    function amount(value,line){
      if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))throw new Error('ยอดเงินแถว '+line+' ต้องเป็นเลขไม่ติดลบและทศนิยมไม่เกิน 2 ตำแหน่ง');
      var parts=value.split('.'),satang=Number(parts[0])*100+Number(((parts[1]||'')+'00').slice(0,2));
      if(satang>100000000000)throw new Error('ยอดเงินแถว '+line+' เกินขอบเขตที่รองรับ');return satang;
    }
    var result=rows.slice(1).map(function(r,i){
      var line=i+2;
      if(r.length!==4)throw new Error('แถว '+line+' ต้องมี 4 คอลัมน์');
      var date=r[0],dt=new Date(date+'T00:00:00Z');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date||date>today())throw new Error('วันที่แถว '+line+' ต้องเป็น YYYY-MM-DD ที่ถูกต้องและไม่ใช่วันในอนาคต');
      if(seen.has(date))throw new Error('วันที่ '+date+' ซ้ำ กรุณารวมยอดเป็นหนึ่งแถวต่อวัน');seen.add(date);
      if(!/^\d{1,8}$/.test(r[3]))throw new Error('จำนวนคำสั่งซื้อแถว '+line+' ต้องเป็นจำนวนเต็มไม่ติดลบ');
      return {date:date,gross:amount(r[1],line),refunds:amount(r[2],line),orders:Number(r[3])};
    });
    return result.sort(function(a,b){return a.date.localeCompare(b.date);});
  }
  function download(name,text) {
    var url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));
    var link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function reset() { dataRevision++;records=null;source='empty';sourceName='';if($('revenueChart')){render();status('');$('revenueCsv').value='';} }
  function overview(d) {
    var total=Number(d.saves_total),active=Number(d.saves_active_week);
    var valid=d.saves_total!=null&&d.saves_active_week!=null&&Number.isFinite(total)&&Number.isFinite(active)&&total>=0&&active>=0&&active<=total;
    var percent=valid&&total>0?Math.round(active/total*100):0;
    $('activityDonut').style.setProperty('--activity',percent+'%');
    $('activityPercent').textContent=valid?(total>0?percent+'%':'ไม่มีเซฟ'):'—';
    $('activityActive').textContent=valid?money.format(active):'—';$('activityOther').textContent=valid?money.format(total-active):'—';
    var fields=[['สมัครวันนี้',d.players_today],['เซฟบนคลาวด์',d.saves_total],['ด่านเฉลี่ย',d.avg_stages],['ประกาศที่แสดง',d.announcements_active],['แอดมิน',d.admins_total]];
    $('secondaryStats').innerHTML=fields.map(function(f){return '<span>'+f[0]+'<b>'+(f[1]==null?'—':esc(money.format(Number(f[1]))))+'</b></span>';}).join('');
    $('dashboardUpdated').textContent='โหลดล่าสุด '+new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date())+' น.';
  }
  function overviewError() { overview({});$('dashboardUpdated').textContent='โหลดข้อมูลไม่สำเร็จ ลองอัปเดตอีกครั้ง'; }
  window.PufflingDashboard=Object.freeze({overview:overview,overviewError:overviewError,reset:reset});
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-chart]').forEach(function(button){button.addEventListener('click',function(){kind=button.dataset.chart;document.querySelectorAll('[data-chart]').forEach(function(b){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();});});
    $('revenueRange').addEventListener('change',function(){days=Number(this.value);render();});
    $('revenueDemo').addEventListener('click',function(){dataRevision++;records=sample();source='demo';sourceName='';render();status('กำลังแสดงข้อมูลสมมติสำหรับทดลองกราฟ ไม่ใช่ยอดขายจริง');});
    $('revenueClear').addEventListener('click',reset);
    $('revenueCsv').addEventListener('change',async function(){
      var file=this.files[0];if(!file)return;var revision=++dataRevision;
      try{if(file.size>1000000)throw new Error('ไฟล์ใหญ่เกิน 1 MB');var parsed=parseCsv(await file.text());if(revision!==dataRevision)return;records=parsed;source='csv';sourceName=file.name;render();status('อ่านข้อมูล '+parsed.length+' วันจาก CSV แล้ว ข้อมูลอยู่บนเครื่องนี้เท่านั้น');}
      catch(error){if(revision===dataRevision)status(error.message+' · ข้อมูลก่อนหน้ายังอยู่',true);}finally{this.value='';}
    });
    $('revenueTemplate').addEventListener('click',function(){download('puffling-revenue-template.csv','date,gross,refunds,orders\r\n'+today()+',0.00,0.00,0\r\n');});
    $('revenueExport').addEventListener('click',function(){var range=dates(days),selected=(records||[]).filter(function(r){return r.date>=range[0]&&r.date<=range[range.length-1];});if(!selected.length)return;download('puffling-revenue-'+(source==='demo'?'DEMO-':'')+days+'days.csv','date,gross,refunds,orders\r\n'+selected.map(function(r){return [r.date,(r.gross/100).toFixed(2),(r.refunds/100).toFixed(2),r.orders].join(',');}).join('\r\n')+'\r\n');});
    document.querySelectorAll('[data-go]').forEach(function(button){button.addEventListener('click',function(){var target=document.querySelector('nav.tabs [data-page="'+button.dataset.go+'"]');if(target)target.click();});});
    document.querySelectorAll('nav.tabs [data-page]').forEach(function(button){button.addEventListener('click',function(){var labels={dash:['OVERVIEW','ภาพรวมกองทัพปุยนุ่น'],news:['ANNOUNCEMENTS','ประกาศและข่าวสาร'],mail:['PLAYER MAIL','จดหมายและของขวัญ'],raid:['BOSS EVENTS','จัดกิจกรรมบอส'],players:['PLAYERS','ดูแลผู้เล่น'],log:['ACTIVITY LOG','บันทึกการทำงาน']};var label=labels[button.dataset.page];$('currentPageLabel').textContent=label[0];$('currentPageTitle').textContent=label[1];document.querySelectorAll('nav.tabs [data-page]').forEach(function(b){if(b===button)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});});});
    render();
    if('ResizeObserver' in window){var lastWidth=0;new ResizeObserver(function(entries){var width=Math.round(entries[0].contentRect.width);if(width>0&&width!==lastWidth){lastWidth=width;render();}}).observe($('revenueChart'));}
  });
})();
