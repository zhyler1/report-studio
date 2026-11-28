(function(){
  var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var played={},amb=null;
  function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function snow(cv,n,sp,al){   // copos con dos capas de profundidad; devuelve stop()
    var c=cv.getContext('2d'),W=0,H=0,run=1,dpr=Math.min(2,window.devicePixelRatio||1),f=[];
    function rs(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr}rs();window.addEventListener('resize',rs);
    for(var i=0;i<n;i++)f.push({x:Math.random()*W,y:Math.random()*H,r:(.6+Math.random()*2.2)*dpr,v:(.25+Math.random())*sp*dpr,d:Math.random()*6.28,s:.4+Math.random()*.9});
    (function tick(){if(!run)return;c.clearRect(0,0,W,H);
      for(var i=0;i<f.length;i++){var p=f[i];p.y+=p.v;p.d+=.012*p.s;p.x+=Math.sin(p.d)*.6*dpr;if(p.y>H+8){p.y=-8;p.x=Math.random()*W}
        c.beginPath();c.fillStyle='rgba(255,255,255,'+(al*(.5+p.r/(3*dpr)))+')';c.arc(p.x,p.y,p.r,0,6.28);c.fill()}
      requestAnimationFrame(tick)})();
    return function(){run=0;window.removeEventListener('resize',rs)};
  }
  function active(){return document.querySelector('.panel.active .sub.on[data-tema="navidad"]')}
  function ambient(on){
    if(RM)return;
    if(on&&!amb){var cv=document.createElement('canvas');cv.id='xmSnow';document.body.appendChild(cv);amb={cv:cv,stop:snow(cv,70,.9,.8)}}
    else if(!on&&amb){amb.stop();amb.cv.remove();amb=null}
  }
  function fx(cs,cf){   // nieve + bokeh (cs) y fuegos artificiales con estela (cf); devuelve {burst,stop}
    var a=cs.getContext('2d'),b=cf.getContext('2d'),W=0,H=0,run=1,dpr=Math.min(2,window.devicePixelRatio||1),f=[],bk=[],ps=[];
    function rs(){W=cs.width=cf.width=innerWidth*dpr;H=cs.height=cf.height=innerHeight*dpr}rs();window.addEventListener('resize',rs);
    for(var i=0;i<170;i++)f.push({x:Math.random()*W,y:Math.random()*H,r:(.6+Math.random()*2.4)*dpr,v:(.3+Math.random())*1.7*dpr,d:Math.random()*6.28,s:.4+Math.random()*.9});
    for(i=0;i<18;i++)bk.push({x:Math.random()*W,y:Math.random()*H,r:(18+Math.random()*60)*dpr,v:(.12+Math.random()*.3)*dpr,a:.035+Math.random()*.07,c:Math.random()<.6?'255,214,120':'255,110,120'});
    var C=['255,224,138','255,92,104','120,222,255','150,255,170','255,255,255','255,170,70'];
    function burst(x,y,n,pw){
      var c1=C[(Math.random()*C.length)|0],c2=C[(Math.random()*C.length)|0],k=Math.random()<.35;
      for(var i=0;i<n;i++){var an=Math.PI*2*i/n+Math.random()*.1,sp=(k?(i%2?.55:1):(.4+Math.random()*.6))*pw*dpr*(.8+Math.random()*.4);
        ps.push({x:x*dpr,y:y*dpr,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,l:1,dc:.008+Math.random()*.012,r:(1.2+Math.random()*1.8)*dpr,c:i%3?c1:c2})}
    }
    (function tick(){if(!run)return;
      a.clearRect(0,0,W,H);
      for(var i=0;i<bk.length;i++){var o=bk[i];o.y-=o.v;if(o.y<-o.r){o.y=H+o.r;o.x=Math.random()*W}
        var g=a.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);g.addColorStop(0,'rgba('+o.c+','+o.a+')');g.addColorStop(1,'rgba('+o.c+',0)');a.fillStyle=g;a.beginPath();a.arc(o.x,o.y,o.r,0,6.28);a.fill()}
      for(i=0;i<f.length;i++){var p=f[i];p.y+=p.v;p.d+=.012*p.s;p.x+=Math.sin(p.d)*.7*dpr;if(p.y>H+8){p.y=-8;p.x=Math.random()*W}
        a.beginPath();a.fillStyle='rgba(255,255,255,'+(.95*(.45+p.r/(3.2*dpr)))+')';a.arc(p.x,p.y,p.r,0,6.28);a.fill()}
      b.globalCompositeOperation='destination-out';b.fillStyle='rgba(0,0,0,.2)';b.fillRect(0,0,W,H);b.globalCompositeOperation='lighter';
      for(i=ps.length-1;i>=0;i--){var q=ps[i];q.vx*=.985;q.vy=q.vy*.985+.045*dpr;q.x+=q.vx;q.y+=q.vy;q.l-=q.dc;
        if(q.l<=0){ps.splice(i,1);continue}
        b.fillStyle='rgba('+q.c+','+q.l+')';b.beginPath();b.arc(q.x,q.y,q.r*(.5+q.l),0,6.28);b.fill();
        if(Math.random()<.04&&ps.length<900)ps.push({x:q.x,y:q.y,vx:0,vy:.2*dpr,l:.6,dc:.03,r:q.r*.6,c:'255,240,200'})}
      requestAnimationFrame(tick)})();
    return {burst:burst,stop:function(){run=0;window.removeEventListener('resize',rs)}};
  }
  function tree(){
    var o='',pos=[[100,70,'#ff4a57'],[78,104,'#ffd24d'],[124,112,'#59d6ff'],[62,146,'#ff4a57'],[100,138,'#8dff9b'],[140,150,'#ffd24d'],[46,184,'#59d6ff'],[84,178,'#ff4a57'],[122,184,'#ffd24d'],[158,186,'#8dff9b']];
    pos.forEach(function(p,i){o+='<circle class="xi-orn" style="animation-delay:'+(2.1+i*.1)+'s,'+(2.1+i*.1)+'s" cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="'+p[2]+'"/>'});
    var gl='<path class="xi-gl" d="M70 92 Q100 108 130 92"/><path class="xi-gl" d="M52 138 Q100 164 148 138"/><path class="xi-gl" d="M36 192 Q100 222 164 192"/>';
    return '<svg class="xi-tree" viewBox="0 0 200 250" aria-hidden="true"><rect class="t tk" x="88" y="204" width="24" height="26" rx="3" fill="#6b4226"/><polygon class="t t3" points="100,96 180,204 20,204" fill="#0b4d2d" stroke="#f6c453" stroke-width="2"/><polygon class="t t2" points="100,56 168,150 32,150" fill="#0f6238" stroke="#f6c453" stroke-width="2"/><polygon class="t t1" points="100,22 156,100 44,100" fill="#157a45" stroke="#f6c453" stroke-width="2"/>'+gl+o+'<polygon class="xi-star" points="100,0 106,15 122,15 109,25 114,41 100,31 86,41 91,25 78,15 94,15" fill="#ffe08a" stroke="#f6c453"/></svg>';
  }
  function play(sub){
    if(RM||document.getElementById('xmIntro'))return;
    var t=sub.getAttribute('data-it')||'Navidad en Presidencia',s=sub.getAttribute('data-is')||'',n=0;
    var words=t.split(/\s+/).filter(Boolean).map(function(w){
      return '<span class="xw">'+w.split('').map(function(ch){return '<i style="animation-delay:'+(3.6+(n++)*.07).toFixed(2)+'s,'+(5.4+n*.05).toFixed(2)+'s">'+esc(ch)+'</i>'}).join('')+'</span>'}).join(' ');
    var sky='';for(var i=0;i<90;i++){var z=1+Math.random()*2.2;sky+='<b class="xi-st" style="left:'+(Math.random()*100).toFixed(1)+'%;top:'+(Math.random()*75).toFixed(1)+'%;width:'+z.toFixed(1)+'px;height:'+z.toFixed(1)+'px;animation-delay:'+(Math.random()*3).toFixed(2)+'s;animation-duration:'+(2+Math.random()*3).toFixed(1)+'s"></b>'}
    var el=document.createElement('div');el.id='xmIntro';
    el.innerHTML='<div class="xi-sky">'+sky+'</div><div class="xi-au a"></div><div class="xi-au b"></div><canvas class="cs"></canvas><canvas class="cf"></canvas><div class="xi-lights"></div><div class="xi-wrap"><div class="xi-tb"><div class="xi-rays"></div>'+tree()+'</div><div class="xi-kick">Oficina de Talento Humano</div><div class="xi-title">'+words+'</div>'+(s?'<div class="xi-subw"><div class="xi-sub">'+esc(s)+'</div></div>':'')+'</div><button class="xi-skip" type="button">Saltar ▸</button>';
    document.body.appendChild(el);
    var E=fx(el.querySelector('.cs'),el.querySelector('.cf')),done=0,T=[];
    function at(ms,fn){T.push(setTimeout(fn,ms))}
    function ring(x,y){var r=document.createElement('div');r.className='xi-ring';r.style.left=x+'px';r.style.top=y+'px';el.appendChild(r);setTimeout(function(){r.remove()},1600)}
    function rnd(){return [innerWidth*(.08+Math.random()*.84),innerHeight*(.12+Math.random()*.5)]}
    at(2800,function(){var st=el.querySelector('.xi-star');if(!st)return;var r=st.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;E.burst(x,y,110,5.2);E.burst(x,y,60,2.6);ring(x,y)});
    [3700,4000,4300,4600,4900,5200].forEach(function(ms,k){at(ms,function(){var p=rnd();p[0]=k%2?innerWidth*(.1+Math.random()*.22):innerWidth*(.68+Math.random()*.22);E.burst(p[0],p[1],70,4.4)})});
    at(5600,function(){ring(innerWidth/2,innerHeight*.52);for(var k=0;k<6;k++)(function(k){setTimeout(function(){var p=rnd();E.burst(p[0],p[1],95,5.6)},k*170)})(k)});
    for(var m=7000;m<10500;m+=950)at(m,function(){var p=rnd();E.burst(p[0],p[1],60,4.2)});
    function end(){if(done)return;done=1;T.forEach(clearTimeout);el.classList.add('out');setTimeout(function(){E.stop();el.remove()},1000)}
    el.addEventListener('click',end);T.push(setTimeout(end,10800));
  }
  function sync(intro){
    var a=active();ambient(!!a);
    if(a&&intro&&a.getAttribute('data-intro')==='1'&&!played[a.getAttribute('data-sub')]&&!document.querySelector('[data-bp]')){played[a.getAttribute('data-sub')]=1;play(a)}
  }
  document.addEventListener('click',function(e){
    var r=e.target.closest&&e.target.closest('.xm-replay');
    if(r){var a=active();if(a)play(a);return}
    setTimeout(function(){sync(true)},40);
  },true);
  setTimeout(function(){sync(false)},900);

  /* ───── Mundo de Navidad: paisaje de pantalla completa con una carrilera; cada sub-botón es un vagón ───── */
  var NS='http://www.w3.org/2000/svg';
  function rng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
  function pine(x,y,s,lit,k){   // pino nevado; lit = con lucecitas
    var o='<g transform="translate('+x+' '+y+') scale('+s+')"><rect x="-5" y="-6" width="10" height="16" fill="#3a2418"/>';
    [[0,-96,34,'#0f5b38'],[0,-70,44,'#136b41'],[0,-40,54,'#187a4a']].forEach(function(t,i){
      var y0=t[1],w=t[2];o+='<polygon points="0,'+(y0-34)+' '+w+','+y0+' '+(-w)+','+y0+'" fill="'+t[3]+'"/><path d="M0 '+(y0-34)+' L'+(w*.55)+' '+(y0-8)+' Q'+(w*.2)+' '+(y0-14)+' 0 '+(y0-6)+' Q'+(-w*.3)+' '+(y0-16)+' '+(-w*.55)+' '+(y0-8)+'Z" fill="#f4f8ff"/>'});
    if(lit){var cs=['#ff4a57','#ffd24d','#59d6ff','#8dff9b'];for(var i=0;i<7;i++){o+='<circle class="xw-tw" style="animation-delay:'+((i*.37+k*.21)%2).toFixed(2)+'s" cx="'+(((i*53+k*17)%70)-35)+'" cy="'+(-12-((i*29)%80))+'" r="2.6" fill="'+cs[(i+k)%4]+'"/>'}}
    return o+'</g>';
  }
  function house(x,y,s,c){
    return '<g transform="translate('+x+' '+y+') scale('+s+')"><rect x="-34" y="-46" width="68" height="46" fill="'+c+'"/><polygon points="-42,-46 0,-82 42,-46" fill="#8f2b35"/><path d="M-42 -46 L0 -82 L42 -46 L34 -46 L0 -74 L-34 -46Z" fill="#fff"/>'
     +'<rect x="-22" y="-34" width="16" height="16" fill="#ffd978" class="xw-win"/><rect x="6" y="-34" width="16" height="16" fill="#ffd978" class="xw-win" style="animation-delay:.7s"/>'
     +'<rect x="16" y="-92" width="10" height="22" fill="#6b3a2a"/><circle class="xw-ch" cx="21" cy="-98" r="6" fill="#fff" opacity=".7"/><circle class="xw-ch" style="animation-delay:1.3s" cx="21" cy="-98" r="5" fill="#fff" opacity=".7"/></g>';
  }
  function lamp(x,y){return '<g transform="translate('+x+' '+y+')"><rect x="-2" y="-70" width="4" height="70" fill="#2a2c3a"/><circle cx="0" cy="-74" r="30" fill="url(#xwGlow)" class="xw-tw"/><circle cx="0" cy="-74" r="6" fill="#fff1b0"/></g>'}
  function gift(x,y,w,h,c,r){return '<g transform="translate('+x+' '+y+') rotate('+(r||0)+')"><rect x="'+(-w/2)+'" y="'+(-h)+'" width="'+w+'" height="'+h+'" fill="'+c+'"/><rect x="-3" y="'+(-h)+'" width="6" height="'+h+'" fill="#ffe08a"/><rect x="'+(-w/2)+'" y="'+(-h/2-3)+'" width="'+w+'" height="6" fill="#ffe08a"/><path d="M0 '+(-h)+' q-14 -16 -18 -4 q8 8 18 4 q10 4 18 -4 q-4 -12 -18 4z" fill="#ffe08a"/></g>'}
  function bigTree(x,y){
    var o='<g transform="translate('+x+' '+y+')"><rect x="-10" y="-8" width="20" height="26" fill="#4a2c1a"/>';
    [[-150,92,'#0e5233'],[-100,76,'#12633c'],[-52,58,'#178048']].forEach(function(t){var y0=t[0]+130;o+='<polygon points="0,'+(y0-t[1]*1.3)+' '+(t[1]+14)+','+y0+' '+(-(t[1]+14))+','+y0+'" fill="'+t[2]+'" stroke="#f6c453" stroke-width="1.5"/>'});
    var cs=['#ff4a57','#ffd24d','#59d6ff','#8dff9b','#ff8ad8'];
    for(var i=0;i<26;i++){var yy=-140+i*6.4,hw=(yy+160)*.46;o+='<circle class="xw-tw" style="animation-delay:'+((i*.29)%2.4).toFixed(2)+'s" cx="'+(Math.sin(i*2.1)*hw*.82).toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.8" fill="'+cs[i%5]+'"/>'}
    o+='<g class="xw-star" transform="translate(0 -184)"><polygon points="0,-24 7,-8 24,-8 10,3 15,20 0,10 -15,20 -10,3 -24,-8 -7,-8" fill="#ffe08a" stroke="#fff3c4" stroke-width="2"/><circle r="40" fill="url(#xwGlow)"/></g></g>';
    return o;
  }
  function snowman(x,y){return '<g transform="translate('+x+' '+y+') scale(.72)"><circle cy="-22" r="26" fill="#f4f8ff"/><circle cy="-62" r="19" fill="#f4f8ff"/><circle cy="-92" r="14" fill="#f4f8ff"/><rect x="-12" y="-116" width="24" height="16" fill="#222" rx="2"/><rect x="-17" y="-103" width="34" height="5" fill="#222" rx="2"/><polygon points="0,-93 18,-89 0,-86" fill="#ff8a2a"/><circle cx="-5" cy="-96" r="1.8" fill="#222"/><circle cx="5" cy="-96" r="1.8" fill="#222"/><path d="M-14 -80 q14 10 28 0" stroke="#c62a38" stroke-width="6" fill="none"/><circle cy="-30" r="2.6" fill="#222"/><circle cy="-20" r="2.6" fill="#222"/></g>'}
  function candy(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M0 0 V-52 a14 14 0 0 1 28 0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M0 0 V-52 a14 14 0 0 1 28 0" fill="none" stroke="#e23a4a" stroke-width="9" stroke-dasharray="7 9" stroke-linecap="round"/></g>'}
  function scene(W,H,pd){
    var R=rng(7),o='';
    o+='<defs>'
     +'<linearGradient id="xwSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a24"/><stop offset=".5" stop-color="#14245f"/><stop offset=".82" stop-color="#4a3a8c"/><stop offset="1" stop-color="#b8588a"/></linearGradient>'
     +'<radialGradient id="xwGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd35e" stop-opacity=".35"/><stop offset="1" stop-color="#ffd35e" stop-opacity="0"/></radialGradient>'
     +'<radialGradient id="xwMoon"><stop offset="0" stop-color="#fffdf0" stop-opacity=".95"/><stop offset=".35" stop-color="#fff2c4" stop-opacity=".25"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>'
     +'<linearGradient id="xwAu1" x1="0" x2="1"><stop offset="0" stop-color="#3df2b4" stop-opacity="0"/><stop offset=".3" stop-color="#3df2b4" stop-opacity=".55"/><stop offset=".7" stop-color="#6aa8ff" stop-opacity=".5"/><stop offset="1" stop-color="#b66bff" stop-opacity="0"/></linearGradient>'
     +'<linearGradient id="xwAu2" x1="0" x2="1"><stop offset="0" stop-color="#ff7ad9" stop-opacity="0"/><stop offset=".5" stop-color="#7ae8ff" stop-opacity=".4"/><stop offset="1" stop-color="#7affb0" stop-opacity="0"/></linearGradient>'
     +'<linearGradient id="xwHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f7ff"/><stop offset="1" stop-color="#b9cdee"/></linearGradient>'
     +'<linearGradient id="xwHill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3d3ee"/><stop offset="1" stop-color="#8ea6d6"/></linearGradient>'
     +'<linearGradient id="xwC0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5424f"/><stop offset="1" stop-color="#9c1d2a"/></linearGradient>'
     +'<linearGradient id="xwC1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25a766"/><stop offset="1" stop-color="#0c6a3b"/></linearGradient>'
     +'<linearGradient id="xwC2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1c04a"/><stop offset="1" stop-color="#bb831b"/></linearGradient>'
     +'<linearGradient id="xwBeam" x1="0" x2="1"><stop offset="0" stop-color="#fff3b8" stop-opacity=".75"/><stop offset="1" stop-color="#fff3b8" stop-opacity="0"/></linearGradient>'
     +'<filter id="xwBl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>';
    o+='<rect width="'+W+'" height="'+H+'" fill="url(#xwSky)"/>';
    for(var i=0;i<130;i++){var r=R()*1.7+.4;o+='<circle class="xw-tw" style="animation-delay:'+(R()*3).toFixed(2)+'s;animation-duration:'+(1.6+R()*3).toFixed(1)+'s" cx="'+(R()*W).toFixed(0)+'" cy="'+(R()*H*.55).toFixed(0)+'" r="'+r.toFixed(1)+'" fill="#fff"/>'}
    o+='<g class="xw-au" filter="url(#xwBl)"><path d="M-100 150 C250 40 520 220 820 110 S1300 40 1700 160 L1700 270 C1350 200 1080 320 760 240 S240 300 -100 250Z" fill="url(#xwAu1)"/></g>'
     +'<g class="xw-au b" filter="url(#xwBl)"><path d="M-100 250 C300 170 560 300 900 220 S1380 180 1700 270 L1700 340 C1300 300 1000 380 700 330 S200 370 -100 340Z" fill="url(#xwAu2)"/></g>';
    o+='<g class="xw-moon"><circle cx="'+(W*.84)+'" cy="132" r="190" fill="url(#xwMoon)"/><circle cx="'+(W*.84)+'" cy="132" r="64" fill="#fff8dc"/><circle cx="'+(W*.84-18)+'" cy="118" r="11" fill="#eadfae" opacity=".7"/><circle cx="'+(W*.84+22)+'" cy="150" r="8" fill="#eadfae" opacity=".7"/><circle cx="'+(W*.84+10)+'" cy="104" r="6" fill="#eadfae" opacity=".6"/></g>';
    o+='<path class="xw-shoot" d="M0 0 L-120 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0"/>';
    o+='<path d="M-50 470 L120 330 L210 395 L340 280 L470 410 L560 350 L720 470 L900 330 L1010 410 L1160 300 L1300 420 L1420 340 L1560 440 L1700 380 L1700 600 L-50 600Z" fill="#26376f"/>'
     +'<path d="M120 330 L160 362 L134 360 L110 378 L88 360Z M340 280 L392 330 L360 326 L338 346 L312 324Z M900 330 L944 368 L918 366 L896 384 L872 364Z M1160 300 L1212 350 L1182 346 L1160 366 L1132 344Z M1420 340 L1458 372 L1436 370 L1418 386 L1396 368Z" fill="#dfe9ff" opacity=".9"/>'
     +'<path d="M-50 520 L90 430 L230 500 L380 410 L520 500 L690 420 L860 510 L1030 430 L1190 510 L1360 420 L1520 500 L1700 440 L1700 640 L-50 640Z" fill="#1e2c5c"/>';
    o+='<path d="M-60 560 Q200 470 440 540 T900 520 T1380 500 T1700 540 L1700 800 L-60 800Z" fill="url(#xwHill2)"/>';
    for(i=0;i<16;i++)o+=pine(60+i*104+R()*40,520+Math.sin(i*1.3)*14,.46+R()*.2,i%3===0,i);
    o+=house(300,540,.9,'#d98c5f')+house(430,552,.75,'#c9a36b')+house(560,545,.85,'#b7795a')+house(1010,540,.8,'#c98e63');
    o+=bigTree(W*.92,560);
    o+='<path d="'+pd+' L'+(W+300)+' '+(H+60)+' L-300 '+(H+60)+'Z" fill="url(#xwHill)"/>';
    o+='<path id="xwTrack" d="'+pd+'" fill="none"/>';
    o+='<use href="#xwTrack" stroke="#3a3350" stroke-width="30" fill="none" opacity=".55" transform="translate(0 9)"/>'
     +'<use href="#xwTrack" stroke="#6b4a2e" stroke-width="26" stroke-dasharray="6 13" fill="none"/>'
     +'<use href="#xwTrack" stroke="#d6dcef" stroke-width="17" fill="none"/>'
     +'<use href="#xwTrack" stroke="#2c2640" stroke-width="10" fill="none"/>';
    return o;
  }
  function front(W,H){   // lo que va delante de los rieles
    var o='';
    o+='<path d="M-60 '+(H-50)+' Q260 '+(H-86)+' 560 '+(H-44)+' T1160 '+(H-62)+' T1700 '+(H-38)+' L1700 '+(H+40)+' L-60 '+(H+40)+'Z" fill="#f7faff"/>';
    o+=pine(70,H-90,.95,1,3)+pine(150,H-70,.7,0,4)+pine(W-90,H-80,1,1,5)+pine(W-190,H-60,.7,0,6)+pine(W*.46,H-60,.55,1,8);
    o+=snowman(W*.2,H-8)+candy(W*.28,H-22,1)+candy(W*.66,H-18,.85)+candy(W*.74,H-24,1);
    o+=gift(W*.58,H-12,46,36,'#d63a49',-4)+gift(W*.62,H-8,34,28,'#1f9a5c',5)+gift(W*.6,H-40,26,22,'#e7b53a',-8)+gift(W*.36,H-14,40,32,'#3b6fd6',3)+gift(W*.39,H-8,30,24,'#d63a49',-6);
    o+=lamp(W*.14,H-110)+lamp(W*.5,H-96)+lamp(W*.82,H-104);
    return o;
  }
  function wagonSVG(i,n,label){
    var k=i%3,col=['#e5424f','#25a766','#f1c04a'][k],dk=['#6b0f1a','#073f23','#7a520b'][k],tx=k===2?'#3a2400':'#fff';
    return '<g class="xw-w" tabindex="0" role="button" aria-label="Actividad '+(i+1)+': '+esc(label)+'" style="cursor:pointer">'
     +'<rect x="60" y="-20" width="20" height="5" fill="#8f979e"/>'
     +'<g class="xw-wb"><rect x="-62" y="-70" width="124" height="58" rx="7" fill="url(#xwC'+k+')" stroke="rgba(255,255,255,.28)" stroke-width="2"/>'
     +'<rect x="-67" y="-80" width="134" height="13" rx="6" fill="'+dk+'"/><path d="M-66 -80 q8-13 22-5 q12-11 24-2 q14-10 28 0 q12-8 22 2 q10-10 20 5z" fill="#f4f8ff"/>'
     +'<rect x="-62" y="-26" width="124" height="4" fill="#ffe08a" opacity=".8"/>'
     +'<circle cx="-44" cy="-52" r="11" fill="#fff6e2" stroke="'+dk+'" stroke-width="2"/><text x="-44" y="-47.5" text-anchor="middle" font-size="13" font-weight="800" fill="#7a1620" font-family="Inter,system-ui,sans-serif">'+(i+1)+'</text>'
     +'<foreignObject x="-30" y="-68" width="90" height="40"><div xmlns="http://www.w3.org/1999/xhtml" class="xw-lb" style="color:'+tx+'">'+esc(label)+'</div></foreignObject>'
     +'<circle class="xw-lamp" cx="48" cy="-18" r="5" fill="#fff1b0"/></g>'
     +'<g fill="#2b2f33" stroke="#aeb6bd" stroke-width="2"><circle cx="-36" cy="-8" r="10"/><circle cx="36" cy="-8" r="10"/></g><g fill="#c9ced3"><circle cx="-36" cy="-8" r="3"/><circle cx="36" cy="-8" r="3"/></g></g>';
  }
  function locoSVG(){
    return '<g class="xw-lo"><polygon points="86,-30 330,-62 330,0 86,-4" fill="url(#xwBeam)" class="xw-beam"/>'
     +'<rect x="-84" y="-100" width="52" height="86" rx="7" fill="#7a1620" stroke="#ffe08a" stroke-width="2"/><rect x="-92" y="-108" width="68" height="12" rx="5" fill="#4b0c14"/><path d="M-90 -108 q8-12 20-5 q10-10 22-2 q10-8 20 3z" fill="#f4f8ff"/>'
     +'<rect x="-74" y="-88" width="28" height="26" rx="4" fill="#ffd978" class="xw-win"/>'
     +'<rect x="-34" y="-74" width="122" height="56" rx="22" fill="url(#xwC0)" stroke="#ffe08a" stroke-width="2.5"/><rect x="-34" y="-50" width="122" height="6" fill="#ffe08a" opacity=".85"/>'
     +'<rect x="52" y="-104" width="20" height="32" rx="3" fill="#2a2c3a"/><path d="M46 -106 h32 l-6 -12 h-20z" fill="#ffe08a"/>'
     +'<ellipse cx="14" cy="-76" rx="14" ry="12" fill="#ffe08a"/><circle cx="90" cy="-44" r="9" fill="#fff6c4"/><circle cx="90" cy="-44" r="16" fill="url(#xwGlow)" class="xw-tw"/>'
     +'<polygon points="88,-18 112,-4 88,-4" fill="#6b3a2a"/>'
     +'<g fill="#2b2f33" stroke="#e1c27a" stroke-width="2.5"><circle cx="-56" cy="-14" r="15"/><circle cx="-14" cy="-12" r="15"/><circle cx="34" cy="-10" r="12"/></g><g fill="#e1c27a"><circle cx="-56" cy="-14" r="4"/><circle cx="-14" cy="-12" r="4"/><circle cx="34" cy="-10" r="3.4"/></g>'
     +'<g class="xw-smk"><circle cx="62" cy="-124" r="10" fill="#fff"/><circle cx="62" cy="-124" r="8" fill="#fff" style="animation-delay:.9s"/><circle cx="62" cy="-124" r="12" fill="#fff" style="animation-delay:1.8s"/></g></g>';
  }
  function world(){
    [].forEach.call(document.querySelectorAll('.sub[data-tren]'),function(sub){
      var nav=sub.querySelector('.snav2');if(!nav||sub.querySelector('.xw'))return;
      var bs=[].slice.call(nav.querySelectorAll('.sbtn'));if(!bs.length)return;
      var n=bs.length,W=1600,H=760,
          pd='M-300 640 C0 610 250 660 520 630 S980 580 1230 620 S1700 660 1900 610';
      var title=sub.getAttribute('data-it')||'Navidad en Presidencia',subt=sub.getAttribute('data-is')||'';
      var el=document.createElement('div');el.className='xw';
      var body='<svg class="xw-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Tren de la Navidad con las actividades">'+scene(W,H,pd)
        +'<g class="xw-cars"></g><g class="xw-crew"><g class="xw-cb" transform="translate(-23 0)"><text class="xw-em" x="-52" y="0" font-size="32">🧝</text><text class="xw-em" x="-20" y="2" font-size="50">🎅</text><text class="xw-em" x="30" y="0" font-size="36" transform="translate(96 0) scale(-1 1)">🦌</text><text class="xw-em" x="62" y="0" font-size="36" transform="translate(160 0) scale(-1 1)">🦌</text></g></g>'
        +front(W,H)+'</svg>';
      el.innerHTML='<div class="xw-vp"><div class="xw-sc">'+body+'<canvas class="xw-cv"></canvas></div></div>'
        +'<div class="xw-ttl"><small>Oficina de Talento Humano</small><b>'+esc(title)+'</b>'+(subt?'<span>'+esc(subt)+'</span>':'')+'</div>'
        +'<div class="xw-ui"><button type="button" class="xw-b xw-pv" aria-label="Actividad anterior">‹</button><button type="button" class="xw-b xw-play">▶ Recorrer el tren</button><button type="button" class="xw-b xw-nx" aria-label="Actividad siguiente">›</button></div>'
        +'<div class="xw-hint">Toca un vagón para abrir su actividad</div>';
      nav.parentNode.insertBefore(el,nav);
      var svg=el.querySelector('.xw-svg'),cars=svg.querySelector('.xw-cars'),crew=svg.querySelector('.xw-crew'),cb=svg.querySelector('.xw-cb'),track=svg.querySelector('#xwTrack'),
          sc=el.querySelector('.xw-sc'),vp=el.querySelector('.xw-vp'),play=el.querySelector('.xw-play');
      track.id='xwTrack'+Math.random().toString(36).slice(2,6);
      [].forEach.call(svg.querySelectorAll('use'),function(u){u.setAttribute('href','#'+track.id)});
      var len=track.getTotalLength(),els=[],ws=[],cur=0,timer=0,playing=0,shift=0,t0=0,tw=null,vis=true,intro=!RM;
      // posición de cada pieza a lo largo de la carrilera
      var s0=0,s1=len;for(var q=0;q<len;q+=8){var px=track.getPointAtLength(q).x;if(!s0&&px>140)s0=q;if(px<1290)s1=q}
      var step=(s1-s0-250)/Math.max(1,n),pos=[];
      bs.forEach(function(b,i){
        var g=document.createElementNS(NS,'g');g.innerHTML=wagonSVG(i,n,b.textContent.trim());var w=g.firstChild;cars.appendChild(w);ws.push(w);els.push(w);pos.push(s0+120+i*step);
        w.addEventListener('click',function(e){e.stopPropagation();stopPlay();go(i,true)});
        w.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();stopPlay();go(i,true)}});
      });
      var lg=document.createElementNS(NS,'g');lg.innerHTML=locoSVG();var lo=lg.firstChild;cars.appendChild(lo);els.push(lo);pos.push(s0+120+n*step+70);
      function put(elm,s,bob){var p=track.getPointAtLength(Math.max(0,s)),p2=track.getPointAtLength(Math.max(0,s)+2),a=Math.atan2(p2.y-p.y,p2.x-p.x)*180/Math.PI;
        elm.setAttribute('transform','translate('+p.x.toFixed(1)+' '+(p.y-4+(bob||0)).toFixed(1)+') rotate('+a.toFixed(2)+') scale(.9)');return {x:p.x,y:p.y,a:a}}
      function wpos(i,bob){var p=track.getPointAtLength(pos[i]+shift),p2=track.getPointAtLength(pos[i]+shift+2),a=Math.atan2(p2.y-p.y,p2.x-p.x);
        var ra=a,cx=p.x+Math.sin(ra)*80,cy=p.y-Math.cos(ra)*80-4+(bob||0);return {x:cx,y:cy,a:a*180/Math.PI}}
      function frame(t){
        if(!vis||document.hidden){requestAnimationFrame(frame);return}
        if(!t0)t0=t;var tt=(t-t0)/1000;
        if(intro){var u=Math.min(1,tt/3.6),e=1-Math.pow(1-u,3);shift=-(1-e)*(pos[n]+420);if(u>=1){intro=false;shift=0;go(cur,false,true)}}
        for(var i=0;i<els.length;i++){var bob=RM||intro?0:Math.sin(tt*2.2+i*.7)*1.1;put(els[i],pos[i]+shift,bob)}
        var cp;
        if(tw){var u2=Math.min(1,(t-tw.t)/tw.d),a=wpos(tw.a,0),b=wpos(tw.b,0),ee=u2<.5?2*u2*u2:1-Math.pow(-2*u2+2,2)/2;
          cp={x:a.x+(b.x-a.x)*ee,y:a.y+(b.y-a.y)*ee-Math.sin(u2*Math.PI)*70,a:a.a+(b.a-a.a)*ee,hop:1};if(u2>=1)tw=null}
        else{var c=wpos(cur,RM||intro?0:Math.sin(tt*2.2+cur*.7)*1.1);cp={x:c.x,y:c.y-Math.abs(Math.sin(tt*2.6))*(RM||intro?0:3),a:c.a}}
        crew.setAttribute('transform','translate('+cp.x.toFixed(1)+' '+cp.y.toFixed(1)+') rotate('+(cp.a*.6).toFixed(2)+')');
        crew.style.opacity=intro?0:1;
        requestAnimationFrame(frame)}
      function centrar(i,smooth){
        var w=vp.scrollWidth-vp.clientWidth;if(w<=0)return;
        var cx=(wpos(i).x/W)*sc.clientWidth,l=Math.max(0,Math.min(w,cx-vp.clientWidth/2));
        vp.scrollTo?vp.scrollTo({left:l,behavior:smooth&&!RM?'smooth':'auto'}):(vp.scrollLeft=l)}
      function go(i,user,silent){
        i=Math.max(0,Math.min(n-1,i));var prev=cur;cur=i;
        ws.forEach(function(w,k){w.classList.toggle('on',k===i)});
        if(!silent&&prev!==i&&!RM)tw={a:prev,b:i,t:performance.now(),d:950};
        if(!bs[i].classList.contains('on'))bs[i].click();
        centrar(i,true);
        if(user){var sub2=sub.querySelector('.sub2.on'),r=el.getBoundingClientRect();if(r.top<-40||r.top>innerHeight*.5)window.scrollTo({top:scrollY+r.top-60,behavior:RM?'auto':'smooth'})}
      }
      function stopPlay(){playing=0;clearTimeout(timer);play.textContent='▶ Recorrer el tren'}
      function next(){if(!playing)return;if(cur>=n-1){stopPlay();return}go(cur+1);timer=setTimeout(next,5600)}
      play.addEventListener('click',function(){
        if(playing){stopPlay();return}
        playing=1;play.textContent='❚❚ Detener';
        var r=el.getBoundingClientRect();if(r.top<-40||r.top>innerHeight*.5)window.scrollTo({top:scrollY+r.top-60,behavior:RM?'auto':'smooth'});
        if(cur>=n-1)go(0);timer=setTimeout(next,1400)});
      el.querySelector('.xw-pv').addEventListener('click',function(){stopPlay();go(cur-1,true)});
      el.querySelector('.xw-nx').addEventListener('click',function(){stopPlay();go(cur+1,true)});
      var first=0;bs.forEach(function(b,i){if(b.classList.contains('on'))first=i});cur=first;ws[first].classList.add('on');
      // nieve de la escena
      var cv=el.querySelector('.xw-cv'),cx=cv.getContext('2d'),fl=[],dpr=Math.min(2,devicePixelRatio||1),cw=0,ch=0;
      function rs(){cw=cv.width=sc.clientWidth*dpr;ch=cv.height=sc.clientHeight*dpr}
      for(var f=0;f<150;f++)fl.push({x:Math.random(),y:Math.random(),r:.5+Math.random()*2.6,v:.0007+Math.random()*.0022,d:Math.random()*6.28,l:Math.random()<.35?1:0});
      (function snowLoop(){
        if(vis&&!document.hidden&&!RM){if(!cw)rs();cx.clearRect(0,0,cw,ch);
          for(var i=0;i<fl.length;i++){var p=fl[i];p.y+=p.v*(p.l?1.5:1);p.d+=.01;p.x+=Math.sin(p.d)*.0007;if(p.y>1.02){p.y=-.02;p.x=Math.random()}if(p.x<0)p.x=1;if(p.x>1)p.x=0;
            cx.beginPath();cx.fillStyle='rgba(255,255,255,'+(p.l?.95:.6)+')';cx.arc(p.x*cw,p.y*ch,p.r*(p.l?1.5:1)*dpr,0,6.28);cx.fill()}}
        requestAnimationFrame(snowLoop)})();
      window.addEventListener('resize',function(){rs();centrar(cur,false)});
      if('IntersectionObserver' in window){new IntersectionObserver(function(en){var was=vis;vis=en[0].isIntersecting;if(!vis)stopPlay();else if(!was&&intro)t0=0},{threshold:.05}).observe(el)}
      requestAnimationFrame(frame);setTimeout(function(){rs();centrar(cur,false)},400);
      if(RM){intro=false;shift=0}
    });
  }
  world();
})();
