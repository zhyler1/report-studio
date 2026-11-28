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

  /* ───── Mundo de Navidad (pantalla completa): carrilera sinuosa por un bosque nevado; cada sub-botón es una estación ───── */
  var NS='http://www.w3.org/2000/svg';
  function rng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
  function pineS(x,y,s,c,lit,k){   // pino nevado (símbolo ligero)
    var g=c==1?['#0b4a2e','#0f5b38','#146b41']:['#0e5233','#136b41','#188050'];
    var o='<g transform="translate('+x.toFixed(0)+' '+y.toFixed(0)+') scale('+s.toFixed(2)+')"><ellipse cx="3" cy="4" rx="26" ry="7" fill="rgba(0,10,40,.35)"/><rect x="-4" y="-4" width="8" height="12" fill="#3a2418"/>';
    [[-24,30,g[0]],[-48,24,g[1]],[-70,17,g[2]]].forEach(function(t){o+='<polygon points="0,'+(t[0]-30)+' '+t[1]+','+t[0]+' '+(-t[1])+','+t[0]+'" fill="'+t[2]+'"/><path d="M0 '+(t[0]-30)+' L'+(t[1]*.62)+' '+(t[0]-8)+' Q'+(t[1]*.2)+' '+(t[0]-14)+' 0 '+(t[0]-7)+' Q'+(-t[1]*.3)+' '+(t[0]-15)+' '+(-t[1]*.62)+' '+(t[0]-8)+'Z" fill="#eef4ff"/>'});
    if(lit){var cs=['#ff4a57','#ffd24d','#59d6ff','#8dff9b'];for(var i=0;i<6;i++)o+='<circle class="xw-tw" style="animation-delay:'+(((i*.43)+k*.17)%2.2).toFixed(2)+'s" cx="'+(((i*47+k*13)%36)-18)+'" cy="'+(-10-((i*23+k*7)%58))+'" r="2.4" fill="'+cs[(i+k)%4]+'"/>'}
    return o+'</g>';
  }
  function cottage(x,y,s,c){return '<g transform="translate('+x+' '+y+') scale('+s+')"><ellipse cx="4" cy="6" rx="46" ry="9" fill="rgba(0,10,40,.35)"/><rect x="-32" y="-34" width="64" height="38" fill="'+c+'"/><polygon points="-40,-34 0,-72 40,-34" fill="#8f2b35"/><path d="M-40 -34 L0 -72 L40 -34 L33 -34 L0 -64 L-33 -34Z" fill="#fff"/><rect x="-20" y="-24" width="14" height="14" fill="#ffd978" class="xw-win"/><rect x="6" y="-24" width="14" height="14" fill="#ffd978" class="xw-win" style="animation-delay:.8s"/><rect x="14" y="-84" width="9" height="20" fill="#6b3a2a"/><circle class="xw-ch" cx="18" cy="-90" r="5" fill="#fff"/></g>'}
  function bigTree(x,y,s){
    var o='<g transform="translate('+x+' '+y+') scale('+s+')"><ellipse cx="6" cy="10" rx="80" ry="14" fill="rgba(0,10,40,.35)"/><rect x="-9" y="-8" width="18" height="22" fill="#4a2c1a"/>';
    [[10,86,'#0e5233'],[-42,70,'#12633c'],[-88,54,'#178048']].forEach(function(t){o+='<polygon points="0,'+(t[0]-80)+' '+t[1]+','+t[0]+' '+(-t[1])+','+t[0]+'" fill="'+t[2]+'" stroke="#f6c453" stroke-width="1.4"/>'});
    var cs=['#ff4a57','#ffd24d','#59d6ff','#8dff9b','#ff8ad8'];
    for(var i=0;i<30;i++){var yy=-150+i*5.2,hw=(yy+160)*.5;o+='<circle class="xw-tw" style="animation-delay:'+((i*.29)%2.4).toFixed(2)+'s" cx="'+(Math.sin(i*2.1)*hw*.8).toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.6" fill="'+cs[i%5]+'"/>'}
    return o+'<g class="xw-star" transform="translate(0 -168)"><polygon points="0,-22 6,-7 22,-7 9,3 14,18 0,9 -14,18 -9,3 -22,-7 -6,-7" fill="#ffe08a" stroke="#fff3c4" stroke-width="2"/><circle r="46" fill="url(#xwGlow)"/></g></g>';
  }
  function gift(x,y,w,h,c){return '<g transform="translate('+x+' '+y+')"><rect x="'+(-w/2)+'" y="'+(-h)+'" width="'+w+'" height="'+h+'" fill="'+c+'"/><rect x="-3" y="'+(-h)+'" width="6" height="'+h+'" fill="#ffe08a"/><rect x="'+(-w/2)+'" y="'+(-h/2-3)+'" width="'+w+'" height="6" fill="#ffe08a"/></g>'}
  function snowman(x,y){return '<g transform="translate('+x+' '+y+') scale(.8)"><ellipse cx="4" cy="4" rx="30" ry="7" fill="rgba(0,10,40,.35)"/><circle cy="-20" r="23" fill="#f4f8ff"/><circle cy="-54" r="17" fill="#f4f8ff"/><circle cy="-80" r="12" fill="#f4f8ff"/><rect x="-10" y="-102" width="20" height="14" fill="#222" rx="2"/><rect x="-15" y="-91" width="30" height="5" fill="#222" rx="2"/><polygon points="0,-81 16,-77 0,-74" fill="#ff8a2a"/><path d="M-12 -68 q12 9 24 0" stroke="#c62a38" stroke-width="5" fill="none"/></g>'}
  function stationSVG(i,label,bx,by,sx,sy){   // estación: andén junto a la vía, casita iluminada, cartel y bandera numerada
    var c=['#d98c5f','#c9a36b','#b7795a','#cf9a6a'][i%4];
    return '<g class="xw-st" tabindex="0" role="button" aria-label="Estación '+(i+1)+': '+esc(label)+'" style="cursor:pointer">'
     +'<ellipse class="xw-ring" cx="'+sx+'" cy="'+(sy-24)+'" rx="96" ry="22" fill="url(#xwGlow)"/>'
     +'<rect x="'+(sx-76)+'" y="'+(sy-40)+'" width="152" height="22" rx="3" fill="#8a6a4a" stroke="#4b3622" stroke-width="2"/><rect x="'+(sx-76)+'" y="'+(sy-40)+'" width="152" height="7" rx="3" fill="#f4f8ff" opacity=".9"/>'
     +'<g transform="translate('+bx+' '+by+')"><ellipse cx="5" cy="8" rx="52" ry="10" fill="rgba(0,10,40,.4)"/><rect x="-40" y="-34" width="80" height="40" fill="'+c+'"/><rect x="-40" y="-34" width="80" height="6" fill="rgba(0,0,0,.15)"/>'
     +'<polygon points="-50,-34 0,-76 50,-34" fill="#9a2f3a"/><polygon points="-50,-34 0,-76 0,-34" fill="#b73845"/><path d="M-50 -34 L0 -76 L50 -34 L42 -34 L0 -66 L-42 -34Z" fill="#fff"/>'
     +'<rect x="-30" y="-24" width="16" height="16" fill="#ffd978" class="xw-win"/><rect x="14" y="-24" width="16" height="16" fill="#ffd978" class="xw-win" style="animation-delay:.9s"/><rect x="-7" y="-22" width="14" height="28" rx="2" fill="#5b3a21"/>'
     +'<rect x="24" y="-90" width="10" height="22" fill="#6b3a2a"/><circle class="xw-ch" cx="29" cy="-96" r="6" fill="#fff"/><circle class="xw-ch" style="animation-delay:1.5s" cx="29" cy="-96" r="5" fill="#fff"/></g>'
     +'<g transform="translate('+(sx-70)+' '+(sy-42)+')"><rect x="-2" y="-54" width="4" height="54" fill="#2a2c3a"/><circle cy="-58" r="26" fill="url(#xwGlow)" class="xw-tw"/><circle cy="-58" r="5" fill="#fff1b0"/></g>'
     +'<g transform="translate('+(sx+70)+' '+(sy-42)+')"><rect x="-2" y="-54" width="4" height="54" fill="#2a2c3a"/><circle cy="-58" r="26" fill="url(#xwGlow)" class="xw-tw" style="animation-delay:.8s"/><circle cy="-58" r="5" fill="#fff1b0"/></g>'
     +'<g class="xw-flag" transform="translate('+(bx+58)+' '+(by-8)+')"><rect x="-1.5" y="-62" width="3" height="62" fill="#d9dbe6"/><circle cy="-70" r="14" fill="#c62a38" stroke="#ffe08a" stroke-width="2.5"/><text y="-65" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" font-family="Inter,system-ui,sans-serif">'+(i+1)+'</text></g>'
     +'<foreignObject x="'+(bx-86)+'" y="'+(by-142)+'" width="172" height="52"><div xmlns="http://www.w3.org/1999/xhtml" class="xw-sl"><span>'+esc(label)+'</span></div></foreignObject></g>';
  }
  function locoSVG(){
    return '<g><polygon points="62,-8 360,-84 360,84 62,8" fill="url(#xwBeam)" class="xw-beam"/><ellipse cx="2" cy="9" rx="64" ry="21" fill="rgba(0,10,40,.4)"/>'
     +'<rect x="-58" y="-18" width="116" height="36" rx="13" fill="url(#xwL)" stroke="#ffe08a" stroke-width="2"/><rect x="-6" y="-13" width="54" height="9" rx="4" fill="rgba(255,255,255,.28)"/><rect x="14" y="-18" width="5" height="36" fill="#ffe08a"/><rect x="-24" y="-18" width="4" height="36" fill="#ffe08a" opacity=".8"/>'
     +'<rect x="-58" y="-20" width="34" height="40" rx="8" fill="#7a1620" stroke="#ffe08a" stroke-width="2"/><path d="M-56 -18 q9 -7 18 -1 q8 -6 14 1z M-52 12 q8 6 18 0 q6 5 10 0" fill="#f4f8ff"/>'
     +'<rect x="-50" y="16" width="12" height="4" fill="#ffd978" class="xw-win"/><rect x="-50" y="-20" width="12" height="4" fill="#ffd978" class="xw-win"/><rect x="2" y="17" width="30" height="3" fill="#ffd978" class="xw-win"/><rect x="2" y="-20" width="30" height="3" fill="#ffd978" class="xw-win"/>'
     +'<circle cx="36" r="9" fill="#1e2030" stroke="#ffe08a" stroke-width="3"/><circle cx="8" r="7" fill="#ffe08a"/><circle cx="62" r="7" fill="#fff6c4"/><circle cx="62" r="18" fill="url(#xwGlow)" class="xw-tw"/>'
     +'<polygon points="58,-15 76,0 58,15" fill="#6b3a2a"/></g>';
  }
  function wagonSVG(k){
    var col=['xwK0','xwK1','xwK2'][k%3];
    return '<g><ellipse cx="2" cy="8" rx="40" ry="17" fill="rgba(0,10,40,.4)"/><rect x="-38" y="-16" width="76" height="32" rx="7" fill="url(#'+col+')" stroke="rgba(255,255,255,.35)" stroke-width="2"/>'
     +'<rect x="-31" y="-12" width="62" height="24" rx="5" fill="rgba(255,255,255,.14)"/><ellipse cx="-14" cy="-3" rx="13" ry="5" fill="#f4f8ff"/><ellipse cx="14" cy="4" rx="12" ry="5" fill="#f4f8ff"/><ellipse cx="22" cy="-6" rx="7" ry="3" fill="#f4f8ff"/>'
     +'<rect x="-32" y="16" width="64" height="3" fill="#ffd978" class="xw-win"/><rect x="-32" y="-19" width="64" height="3" fill="#ffd978" class="xw-win" style="animation-delay:.6s"/><rect x="38" y="-3" width="9" height="6" fill="#8f979e"/></g>';
  }
  function defsSVG(){
    return '<defs><linearGradient id="xwSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a24"/><stop offset=".6" stop-color="#1a2a6c"/><stop offset="1" stop-color="#5a3f95"/></linearGradient>'
     +'<linearGradient id="xwGr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c74b4"/><stop offset=".45" stop-color="#7f98cb"/><stop offset="1" stop-color="#a9bfe6"/></linearGradient>'
     +'<radialGradient id="xwVg" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#050a24" stop-opacity="0"/><stop offset="1" stop-color="#050a24" stop-opacity=".72"/></radialGradient>'
     +'<radialGradient id="xwGlow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset=".4" stop-color="#ffd35e" stop-opacity=".32"/><stop offset="1" stop-color="#ffd35e" stop-opacity="0"/></radialGradient>'
     +'<radialGradient id="xwMoon"><stop offset="0" stop-color="#fffdf0" stop-opacity=".95"/><stop offset=".35" stop-color="#fff2c4" stop-opacity=".25"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>'
     +'<linearGradient id="xwAu1" x1="0" x2="1"><stop offset="0" stop-color="#3df2b4" stop-opacity="0"/><stop offset=".3" stop-color="#3df2b4" stop-opacity=".6"/><stop offset=".7" stop-color="#6aa8ff" stop-opacity=".5"/><stop offset="1" stop-color="#b66bff" stop-opacity="0"/></linearGradient>'
     +'<linearGradient id="xwL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0505c"/><stop offset=".5" stop-color="#c62a38"/><stop offset="1" stop-color="#8f1a26"/></linearGradient>'
     +'<linearGradient id="xwK0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25a766"/><stop offset="1" stop-color="#0c6a3b"/></linearGradient>'
     +'<linearGradient id="xwK1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5424f"/><stop offset="1" stop-color="#9c1d2a"/></linearGradient>'
     +'<linearGradient id="xwK2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1c04a"/><stop offset="1" stop-color="#bb831b"/></linearGradient>'
     +'<linearGradient id="xwBeam" x1="0" x2="1"><stop offset="0" stop-color="#fff3b8" stop-opacity=".7"/><stop offset="1" stop-color="#fff3b8" stop-opacity="0"/></linearGradient>'
     +'<linearGradient id="xwIce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#6fa4d6"/></linearGradient>'
     +'<filter id="xwBl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>';
  }
  function crp(P){var d='M'+P[0][0].toFixed(1)+' '+P[0][1].toFixed(1);for(var i=0;i<P.length-1;i++){var p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;
    d+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+' '+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+' '+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+' '+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+' '+p2[0].toFixed(1)+' '+p2[1].toFixed(1)}return d}
  function ridge(x0,x1,base,amp,seed,col){var R=rng(seed),d='M'+x0+' '+(base+400);for(var x=x0;x<=x1;x+=70){d+=' L'+x+' '+(base-R()*amp-(Math.sin(x/260)+1)*amp*.35).toFixed(0)}return '<path d="'+d+' L'+x1+' '+(base+400)+'Z" fill="'+col+'"/>'}
  function santaFace(){return '<svg class="xw-san" viewBox="0 0 300 330" aria-hidden="true"><defs><radialGradient id="xwFace" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffe0c4"/><stop offset="1" stop-color="#e29e78"/></radialGradient></defs>'
    +'<circle cx="150" cy="150" r="140" fill="url(#xwGlow)"/><ellipse cx="150" cy="300" rx="120" ry="60" fill="#c41f2c"/><circle cx="82" cy="190" r="34" fill="#f1f4fb"/><circle cx="218" cy="190" r="34" fill="#f1f4fb"/>'
    +'<ellipse cx="150" cy="140" rx="62" ry="68" fill="url(#xwFace)"/><circle cx="116" cy="172" r="26" fill="#fff"/><circle cx="184" cy="172" r="26" fill="#fff"/><circle cx="150" cy="215" r="48" fill="#f7f9fe"/><circle cx="108" cy="204" r="34" fill="#f7f9fe"/><circle cx="192" cy="204" r="34" fill="#f7f9fe"/><circle cx="150" cy="262" r="40" fill="#f1f4fb"/>'
    +'<path d="M126 196 Q150 222 174 196 Q150 206 126 196Z" fill="#8a1a26"/><circle cx="150" cy="158" r="14" fill="#ee9a7a"/>'
    +'<ellipse cx="124" cy="138" rx="6" ry="7" fill="#1b2340"/><ellipse cx="176" cy="138" rx="6" ry="7" fill="#1b2340"/><circle cx="126" cy="135" r="2.4" fill="#fff"/><circle cx="178" cy="135" r="2.4" fill="#fff"/>'
    +'<path d="M104 122 q20 -14 36 -2 M160 120 q16 -12 36 2" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"/>'
    +'<path d="M84 98 Q86 30 150 22 Q214 30 216 98Z" fill="#c8212e"/><path d="M196 36 Q250 30 262 92 Q268 128 248 156" stroke="#c8212e" stroke-width="38" stroke-linecap="round" fill="none"/>'
    +'<circle cx="248" cy="160" r="19" fill="#fff"/><rect x="80" y="86" width="140" height="24" rx="12" fill="#fff"/></svg>'}
  function world(){
    [].forEach.call(document.querySelectorAll('.sub[data-tren]'),function(sub){
      var nav=sub.querySelector('.snav2');if(!nav||sub.querySelector('.xw'))return;
      var bs=[].slice.call(nav.querySelectorAll('.sbtn')),n=bs.length;if(n<2)return;
      var edit=sub.getAttribute('data-tren')==='2',H=1000,R=rng(11);
      var title=sub.getAttribute('data-it')||'Navidad en Presidencia',subt=sub.getAttribute('data-is')||'',telon=sub.getAttribute('data-intro')==='1';
      try{if(!document.getElementById('xwFont')){var lk=document.createElement('link');lk.id='xwFont';lk.rel='stylesheet';lk.href='https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap';document.head.appendChild(lk)}}catch(e){}
      // estaciones en zigzag (cresta / valle) y carrilera que pasa por todas
      var sp=410,x0=620,W=x0*2+(n-1)*sp,ST=[];for(var i=0;i<n;i++)ST.push([x0+i*sp,i%2?610:790]);
      var P=[[x0-sp-700,ST[0][1]+70],[x0-sp,ST[1][1]]].concat(ST).concat([[x0+(n-1)*sp+sp,ST[n-2][1]],[x0+(n-1)*sp+sp+700,ST[n-1][1]-70]]);
      var pd=crp(P),HZ=300;
      var o=defsSVG().replace('id="xwGr" x1="0" y1="0" x2="0" y2="1"','id="xwGr" gradientUnits="userSpaceOnUse" x1="0" y1="'+HZ+'" x2="0" y2="1100"');
      // fondo con paralaje: cielo (casi fijo), montañas lejanas y cercanas
      var sky='<rect x="-300" y="-700" width="2900" height="1100" fill="url(#xwSky)"/>';
      for(i=0;i<170;i++)sky+='<circle class="xw-tw" style="animation-delay:'+(R()*3).toFixed(2)+'s;animation-duration:'+(1.6+R()*3).toFixed(1)+'s" cx="'+(R()*2400).toFixed(0)+'" cy="'+(R()*330-20).toFixed(0)+'" r="'+(R()*1.6+.4).toFixed(1)+'" fill="#fff"/>';
      sky+='<g class="xw-au" filter="url(#xwBl)"><path d="M-100 150 C250 40 520 220 820 110 S1300 40 1700 160 S2100 100 2500 180 L2500 290 C2100 220 1800 320 1500 240 S1000 300 700 260 S200 300 -100 250Z" fill="url(#xwAu1)"/></g>'
         +'<circle cx="1180" cy="190" r="190" fill="url(#xwMoon)"/><circle cx="1180" cy="190" r="56" fill="#fff8dc"/><circle cx="1163" cy="178" r="9" fill="#eadfae" opacity=".7"/><circle cx="1198" cy="204" r="7" fill="#eadfae" opacity=".7"/>';
      var par=[[sky,.97],[ridge(-200,2900,330,150,3,'#26376f'),.6],[ridge(-200,3200,372,95,5,'#1e2c5c'),.4]];
      par.forEach(function(p){o+='<g class="xw-par" data-f="'+p[1]+'">'+p[0]+'</g>'});
      o+='<rect x="-3000" y="'+HZ+'" width="'+(W+6000)+'" height="1300" fill="url(#xwGr)"/>';
      for(i=0;i<Math.round(W/36);i++){o+='<ellipse cx="'+(R()*W).toFixed(0)+'" cy="'+(HZ+30+R()*700).toFixed(0)+'" rx="'+(40+R()*100).toFixed(0)+'" ry="'+(6+R()*12).toFixed(0)+'" fill="#e9f1ff" opacity="'+(.1+R()*.14).toFixed(2)+'"/>'}
      var LAKE=[W*.5+205,960,260,46];
      o+='<ellipse cx="'+LAKE[0]+'" cy="'+LAKE[1]+'" rx="'+LAKE[2]+'" ry="'+LAKE[3]+'" fill="url(#xwIce)" opacity=".88" stroke="#e9f4ff" stroke-width="3"/><path d="M'+(LAKE[0]-120)+' '+(LAKE[1]-4)+' q44 -10 90 0 M'+(LAKE[0]+30)+' '+(LAKE[1]+8)+' q50 -12 100 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>';
      o+='<path id="xwTrackP" d="'+pd+'" fill="none"/><g class="xw-trk">'
        +'<use href="#xwTrackP" stroke="#2a2a4a" stroke-width="40" fill="none" opacity=".4" transform="translate(0 9)"/>'
        +'<use href="#xwTrackP" stroke="#6b4a2e" stroke-width="30" stroke-dasharray="7 11" fill="none"/>'
        +'<use href="#xwTrackP" stroke="#dfe5f5" stroke-width="22" fill="none"/>'
        +'<use href="#xwTrackP" stroke="#2c2640" stroke-width="15" fill="none"/></g>';
      var tmp=document.createElementNS(NS,'path');tmp.setAttribute('d',pd);
      var len=tmp.getTotalLength(),PP=[],sArc=[];
      for(var q=0;q<=len;q+=14){var pt=tmp.getPointAtLength(q);PP.push([pt.x,pt.y])}
      ST.forEach(function(s){var best=0,bd=1e9;for(var q=0;q<=len;q+=3){var pt=tmp.getPointAtLength(q),dd=(pt.x-s[0])*(pt.x-s[0])+(pt.y-s[1])*(pt.y-s[1]);if(dd<bd){bd=dd;best=q}}sArc.push(best)});
      function near(x,y,r){for(var k=0;k<PP.length;k++){var ddx=PP[k][0]-x,ddy=PP[k][1]-y;if(ddx*ddx+ddy*ddy<r*r)return true}return false}
      function nearSt(x,y){for(var k=0;k<n;k++){var bx=ST[k][0],by=ST[k][1];if(Math.abs(x-bx)<135&&y>by-250&&y<by+60)return true}return false}
      var trees=[],ntr=Math.min(520,Math.round(W/7.5));
      for(i=0;i<ntr*2&&trees.length<ntr;i++){var tx=-200+R()*(W+400),ty=HZ+30+R()*760;
        if(near(tx,ty,120)||nearSt(tx,ty)||(Math.pow((tx-LAKE[0])/(LAKE[2]+40),2)+Math.pow((ty-LAKE[1])/(LAKE[3]+30),2)<1)||(tx>W-480&&ty>760))continue;
        trees.push([tx,ty,.62+((ty-HZ)/760)*.8+R()*.15,R()<.5?1:2,R()<.16])}
      trees.sort(function(a,b){return a[1]-b[1]});
      var cot='';for(i=0;i<Math.round(W/330);i++){var cx0=300+i*330+R()*120,cy0=HZ+70+R()*80;if(!near(cx0,cy0,80)&&!nearSt(cx0,cy0))cot+=cottage(cx0,cy0,.85+R()*.2,['#d98c5f','#c9a36b','#b7795a','#cf9a6a'][i%4])}
      var treeBack=trees.filter(function(t){return t[1]<700}).map(function(t,k){return pineS(t[0],t[1],t[2],t[3],t[4],k)}).join('');
      o+=cot+treeBack;
      var stG='';ST.forEach(function(s,k){stG+=stationSVG(k,bs[k].textContent.trim(),s[0],s[1]-52,s[0],s[1])});
      o+='<g class="xw-sts">'+stG+'</g><g class="xw-train"></g><g class="xw-smoke"></g><g class="xw-crew"></g>';
      o+=trees.filter(function(t){return t[1]>=700}).map(function(t,k){return pineS(t[0],t[1],t[2],t[3],t[4],k+50)}).join('');
      o+=bigTree(W-300,900,1.15)+gift(W-380,930,38,30,'#d63a49')+gift(W-345,938,30,24,'#1f9a5c')+gift(W-410,940,26,22,'#3b6fd6')+snowman(260,930)+snowman(W-120,860)+snowman(W*.5-300,980);
      var el=document.createElement('div');el.className='xw';
      el.innerHTML='<div class="xw-vp"><div class="xw-sc"><svg class="xw-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="group" aria-label="Mapa del tren de la Navidad">'+o+'</svg><canvas class="xw-cv"></canvas></div></div><div class="xw-vg"></div>'
        +'<div class="xw-ttl"><small>Oficina de Talento Humano</small><b>'+esc(title)+'</b>'+(subt?'<span>'+esc(subt)+'</span>':'')+'</div>'
        +'<div class="xw-cuenta"><b class="xw-num">0</b><span>de '+n+' estaciones</span><div class="xw-bar"><i></i></div><button type="button" class="xw-b xw-ex">'+(edit?'⛶ Pantalla completa':'✕ Salir de la Navidad')+'</button></div>'
        +'<section class="xw-card" aria-live="polite"><h2></h2><p></p><div class="xw-row"><button type="button" class="xw-b xw-pri xw-enter">Entrar</button><button type="button" class="xw-b xw-cl">Cerrar</button></div></section>'
        +'<div class="xw-prompt"><button type="button" class="xw-b xw-pri xw-go"></button></div>'
        +'<nav class="xw-ui" aria-label="Controles del tren"><button type="button" class="xw-b xw-pv" aria-label="Estación anterior">◀</button><button type="button" class="xw-b xw-play">▶ Recorrido</button><button type="button" class="xw-b xw-nx" aria-label="Estación siguiente">▶</button><button type="button" class="xw-b xw-zi" aria-label="Acercar">+</button><button type="button" class="xw-b xw-zo" aria-label="Alejar">−</button></nav>'
        +(telon&&!edit?'<div class="xw-tel"><div class="xw-tcen">'+santaFace()+'<h2>'+esc(title)+'</h2><p>'+esc(subt||'Una carrilera, siete estaciones')+'</p></div><div class="xw-tl i"></div><div class="xw-tl d"></div><div class="xw-valla"></div><div class="xw-cartel"><button type="button" class="xw-open">Abrir el telón</button><button type="button" class="sec xw-skip">Saltar la introducción</button></div></div>':'');
      sub.insertBefore(el,sub.firstChild);
      [].forEach.call(sub.querySelectorAll('.sub2'),function(s2,k){var h=document.createElement('div');h.className='xw-pnh';h.innerHTML='<span>Estación '+(k+1)+' de '+n+'</span><b>'+esc(bs[k]?bs[k].textContent.trim():'')+'</b><button type="button" class="xw-x">✕ Volver al mapa</button>';s2.insertBefore(h,s2.firstChild)});
      var svg=el.querySelector('.xw-svg'),vp=el.querySelector('.xw-vp'),sc=el.querySelector('.xw-sc'),trainG=svg.querySelector('.xw-train'),smokeG=svg.querySelector('.xw-smoke'),crewG=svg.querySelector('.xw-crew'),
          play=el.querySelector('.xw-play'),card=el.querySelector('.xw-card'),goB=el.querySelector('.xw-go'),sts=[].slice.call(svg.querySelectorAll('.xw-st')),pars=[].slice.call(svg.querySelectorAll('.xw-par')),track=svg.querySelector('#xwTrackP'),
          numE=el.querySelector('.xw-num'),barE=el.querySelector('.xw-bar i'),tel=el.querySelector('.xw-tel');
      var offs=[0,86,162,238],pcs=[];
      for(i=3;i>=0;i--){var g=document.createElementNS(NS,'g');g.innerHTML=i===0?locoSVG():wagonSVG(i);trainG.appendChild(g);pcs[i]=g}
      var crew=[];
      [[0,'🎅',34,-6,-6],[1,'🦌',26,-16,-2],[1,'🦌',26,14,-2],[2,'🧝',26,0,-4],[3,'🎁',24,0,-2]].forEach(function(c){var t=document.createElementNS(NS,'text');t.setAttribute('font-size',c[2]);t.setAttribute('text-anchor','middle');t.setAttribute('class','xw-em');t.textContent=c[1];crewG.appendChild(t);crew.push({t:t,p:c[0],dx:c[3],dy:c[4]})});
      var cur=0,headS=0,moving=false,mv=null,vis=true,intro=!RM,introWait=false,t0=0,playing=0,timer=0,full=false,seenFull=false,parts=[],lastSp=0,visited={},nv=0,
          cam={x:ST[0][0],y:600,z:1,fx:ST[0][0]},drag=null,userCam=0;
      function tgt(i){return sArc[i]+22}
      function startS(){return Math.max(0,sArc[0]-900)}
      function pose(s){s=Math.max(0,Math.min(len-2,s));var p=track.getPointAtLength(s),p2=track.getPointAtLength(s+2);return {x:p.x,y:p.y,a:Math.atan2(p2.y-p.y,p2.x-p.x)}}
      function descr(k){var s2=sub.querySelectorAll('.sub2')[k];if(!s2)return '';var e=[].slice.call(s2.querySelectorAll('p,.callout,.note,li')).filter(function(x){return !x.closest('.xw-pnh')&&(x.textContent||'').trim().length>24})[0];var t=e?e.textContent.trim().replace(/\s+/g,' '):'';return t.length>170?t.slice(0,167)+'…':t}
      function setSel(i){cur=i;sts.forEach(function(s,k){s.classList.toggle('on',k===i)});if(!bs[i].classList.contains('on'))bs[i].click()}
      function showCard(){var k=cur;card.querySelector('h2').textContent=bs[k].textContent.trim();card.querySelector('p').textContent=descr(k)||'Estación '+(k+1)+' de '+n;el.classList.add('xw-cardon')}
      function hideCard(){el.classList.remove('xw-cardon','xw-promptOn')}
      function openPanel(){if(!full)return;hideCard();sub.classList.remove('xw-closed');sub.classList.add('xw-open');if(!visited[cur]){visited[cur]=1;nv++;sts[cur].classList.add('v');numE.textContent=nv;barE.style.width=(nv/n*100)+'%'}}
      function closePanel(){sub.classList.add('xw-closed');sub.classList.remove('xw-open')}
      function drive(i,user){
        i=Math.max(0,Math.min(n-1,i));if(moving||intro||introWait)return;userCam=0;
        if(i===cur){setSel(i);if(full){if(playing||!user)openPanel();else{showCard();el.classList.add('xw-promptOn')}}else bs[i].click();return}
        closePanel();hideCard();setSel(i);moving=true;
        var dist=Math.abs(tgt(i)-headS);mv={from:headS,to:tgt(i),t:performance.now(),d:RM?1:Math.max(1800,Math.min(4600,dist*2.2))};
        if(user)stopPlay()}
      function arrive(){moving=false;mv=null;if(full){if(playing)setTimeout(openPanel,600);else{showCard();goB.textContent='Entrar a «'+bs[cur].textContent.trim()+'»';el.classList.add('xw-promptOn')}}}
      function stopPlay(){playing=0;clearTimeout(timer);play.textContent='▶ Recorrido'}
      function nextAuto(){if(!playing)return;if(cur>=n-1){stopPlay();return}drive(cur+1);timer=setTimeout(nextAuto,9500)}
      play.addEventListener('click',function(){if(playing){stopPlay();return}playing=1;play.textContent='❚❚ Detener';hideCard();if(cur>=n-1){drive(0)}else closePanel();timer=setTimeout(nextAuto,cur>=n-1?5200:900)});
      el.querySelector('.xw-pv').addEventListener('click',function(){stopPlay();drive(cur-1,true)});
      el.querySelector('.xw-nx').addEventListener('click',function(){stopPlay();drive(cur+1,true)});
      el.querySelector('.xw-zi').addEventListener('click',function(){cam.z=Math.min(1.9,cam.z*1.25)});
      el.querySelector('.xw-zo').addEventListener('click',function(){cam.z=Math.max(.6,cam.z/1.25)});
      goB.addEventListener('click',openPanel);el.querySelector('.xw-enter').addEventListener('click',openPanel);el.querySelector('.xw-cl').addEventListener('click',hideCard);
      sts.forEach(function(s,k){s.addEventListener('click',function(e){if(drag&&drag.moved)return;e.stopPropagation();drive(k,true)});s.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();drive(k,true)}})});
      [].forEach.call(sub.querySelectorAll('.xw-x'),function(b){b.addEventListener('click',function(){stopPlay();closePanel();showCard();el.classList.add('xw-promptOn');goB.textContent='Entrar a «'+bs[cur].textContent.trim()+'»'})});
      document.addEventListener('keydown',function(e){if(!full||(!sub.classList.contains('on')&&!edit))return;var open=sub.classList.contains('xw-open');if(e.key==='Escape'){if(open)closePanel();else exit()}else if(e.key==='ArrowRight'&&!open){stopPlay();drive(cur+1,true)}else if(e.key==='ArrowLeft'&&!open){stopPlay();drive(cur-1,true)}else if(e.key==='Enter'&&!open&&el.classList.contains('xw-promptOn')){openPanel()}});
      // arrastrar para mirar alrededor
      vp.addEventListener('pointerdown',function(e){if(e.button>0)return;drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false,id:e.pointerId}});
      window.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<7)return;drag.moved=true;userCam=1;sc.classList.add('xw-grab');var k=vb.w/vp.clientWidth;cam.x=Math.max(300,Math.min(W-300,drag.cx-dx*k));cam.y=Math.max(480,Math.min(700,drag.cy-dy*k))});
      window.addEventListener('pointerup',function(){if(!drag)return;sc.classList.remove('xw-grab');var d=drag;setTimeout(function(){if(drag===d)drag=null},0)});
      // telón
      function abrirTelon(skip){if(!tel)return;tel.classList.add('abre');setTimeout(function(){tel.remove();tel=null;introWait=false;t0=0;intro=true},skip?60:4200);if(skip)tel.classList.add('rapido')}
      if(tel){el.querySelector('.xw-open').addEventListener('click',function(){abrirTelon(false)});el.querySelector('.xw-skip').addEventListener('click',function(){abrirTelon(true)})}
      function enter(){if(full)return;full=true;sub.classList.add('xw-full','xw-closed');sub.classList.remove('xw-open');document.documentElement.classList.add('xw-lock');
        if(edit)el.querySelector('.xw-ex').textContent='✕ Cerrar pantalla completa';
        setSel(cur);size();userCam=0;if(!seenFull&&!RM){seenFull=true;intro=true;introWait=!!tel;t0=0;headS=startS()}else{intro=false;if(!moving)headS=tgt(cur)}
        if(!introWait&&!moving&&!intro){showCard();el.classList.add('xw-promptOn');goB.textContent='Entrar a «'+bs[cur].textContent.trim()+'»'}}
      function exit(){if(!full)return;stopPlay();full=false;hideCard();sub.classList.remove('xw-full','xw-closed','xw-open');document.documentElement.classList.remove('xw-lock');
        if(edit){el.querySelector('.xw-ex').textContent='⛶ Pantalla completa';size();return}
        var sn=sub.closest('.panel')&&sub.closest('.panel').querySelector('.subnav'),other=sn&&[].slice.call(sn.querySelectorAll('.sbtn')).filter(function(b){return b.getAttribute('data-s')!==sub.getAttribute('data-sub')})[0];
        if(other)other.click();else{var home=document.querySelector('.tab[data-t="inicio"]')||document.querySelector('.tab');if(home)home.click()}}
      el.querySelector('.xw-ex').addEventListener('click',function(){full?exit():enter()});
      if(!edit){
        var pan=sub.closest('.panel');
        function sync2(){var on=sub.classList.contains('on')&&(!pan||pan.classList.contains('active'));
          if(on&&!full)enter();
          else if(!on&&full){full=false;stopPlay();hideCard();sub.classList.remove('xw-full','xw-closed','xw-open');document.documentElement.classList.remove('xw-lock')}}
        var mo=new MutationObserver(sync2);mo.observe(sub,{attributes:true,attributeFilter:['class']});if(pan)mo.observe(pan,{attributes:true,attributeFilter:['class']});
        if(sub.classList.contains('on'))setTimeout(sync2,60)}
      // nieve
      var cv=el.querySelector('.xw-cv'),cx=cv.getContext('2d'),fl=[],dpr=Math.min(2,devicePixelRatio||1),cw=0,ch=0,vb={x:0,y:0,w:1440,h:900};
      function rs(){cw=cv.width=sc.clientWidth*dpr;ch=cv.height=sc.clientHeight*dpr}
      function size(){rs()}
      for(var f=0;f<170;f++)fl.push({x:Math.random(),y:Math.random(),r:.5+Math.random()*2.6,v:.0007+Math.random()*.0022,d:Math.random()*6.28,l:Math.random()<.35?1:0});
      function ease(u){return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2}
      function frame(t){
        requestAnimationFrame(frame);
        if(!vis||document.hidden||(!full&&!edit&&!sub.classList.contains('on')))return;
        if(!t0)t0=t;var tt=(t-t0)/1000;
        if(introWait){headS=startS()}
        else if(intro){var u=Math.min(1,tt/4.4);headS=startS()+(tgt(0)-startS())*(1-Math.pow(1-u,3));if(u>=1){intro=false;headS=tgt(0);setSel(0);if(full){showCard();goB.textContent='Entrar a «'+bs[0].textContent.trim()+'»';el.classList.add('xw-promptOn')}}}
        else if(mv){var u2=Math.min(1,(t-mv.t)/mv.d);headS=mv.from+(mv.to-mv.from)*ease(u2);if(u2>=1){headS=mv.to;arrive()}}
        var run=(intro&&!introWait)||moving,bob=run?Math.sin(tt*18)*.9:0;
        for(var k=0;k<4;k++){var ps=pose(headS-offs[k]);pcs[k].setAttribute('transform','translate('+ps.x.toFixed(1)+' '+(ps.y+(k?bob*(k%2?1:-1):bob)).toFixed(1)+') rotate('+(ps.a*180/Math.PI).toFixed(2)+')');pcs[k]._p=ps}
        var hop=(!run&&!RM)?Math.abs(Math.sin(tt*3))*3:0;
        crew.forEach(function(c){var ps=pcs[c.p]._p;c.t.setAttribute('x',(ps.x+c.dx).toFixed(1));c.t.setAttribute('y',(ps.y+c.dy+9-hop).toFixed(1))});
        if(run&&!RM&&t-lastSp>110){lastSp=t;var l0=pcs[0]._p,cxp=l0.x+Math.cos(l0.a)*36,cyp=l0.y+Math.sin(l0.a)*36;var c=document.createElementNS(NS,'circle');c.setAttribute('fill','#fff');c.setAttribute('r','7');smokeG.appendChild(c);parts.push({c:c,x:cxp,y:cyp,vx:(Math.random()-.5)*.5-.2,vy:-.9-Math.random()*.5,l:1})}
        for(var q=parts.length-1;q>=0;q--){var pp=parts[q];pp.x+=pp.vx;pp.y+=pp.vy;pp.l-=.012;if(pp.l<=0){pp.c.remove();parts.splice(q,1);continue}pp.c.setAttribute('cx',pp.x.toFixed(1));pp.c.setAttribute('cy',pp.y.toFixed(1));pp.c.setAttribute('r',(7+(1-pp.l)*20).toFixed(1));pp.c.setAttribute('opacity',(pp.l*.6).toFixed(2))}
        // cámara: sigue al tren; en reposo, encuadra la estación
        var asp=Math.max(.3,vp.clientWidth/Math.max(1,vp.clientHeight)),vh=900/cam.z,vw=vh*asp;
        if(!userCam){var hx=pcs[0]._p.x+Math.cos(pcs[0]._p.a)*60,tx=(run||moving)?hx-40:ST[cur][0]+ (vw<900?0:60);cam.x+=(tx-cam.x)*(RM?1:.06);cam.y+=((run||moving?pcs[0]._p.y-90:620)-cam.y)*.04}
        var cxx=Math.max(vw/2-200,Math.min(W-vw/2+200,cam.x)),cyy=Math.max(vh/2-60,Math.min(1060-vh/2,cam.y));
        vb.x=cxx-vw/2;vb.y=cyy-vh/2;vb.w=vw;vb.h=vh;svg.setAttribute('viewBox',vb.x.toFixed(1)+' '+vb.y.toFixed(1)+' '+vw.toFixed(1)+' '+vh.toFixed(1));
        for(var pi=0;pi<pars.length;pi++){var ff=parseFloat(pars[pi].getAttribute('data-f'));pars[pi].setAttribute('transform','translate('+(ff*vb.x).toFixed(1)+' 0)')}
        if(!RM){if(!cw)rs();cx.clearRect(0,0,cw,ch);for(var i2=0;i2<fl.length;i2++){var p=fl[i2];p.y+=p.v*(p.l?1.5:1);p.d+=.01;p.x+=Math.sin(p.d)*.0007;if(p.y>1.02){p.y=-.02;p.x=Math.random()}if(p.x<0)p.x=1;if(p.x>1)p.x=0;cx.beginPath();cx.fillStyle='rgba(255,255,255,'+(p.l?.95:.6)+')';cx.arc(p.x*cw,p.y*ch,p.r*(p.l?1.5:1)*dpr,0,6.28);cx.fill()}}
      }
      var first=0;bs.forEach(function(b,i){if(b.classList.contains('on'))first=i});cur=first;headS=tgt(cur);sts[cur].classList.add('on');cam.x=ST[cur][0];
      closePanel();size();window.addEventListener('resize',size);
      if('IntersectionObserver' in window){new IntersectionObserver(function(en){var was=vis;vis=en[0].isIntersecting;if(!vis)stopPlay();else if(!was&&intro)t0=0},{threshold:.01}).observe(el)}
      requestAnimationFrame(frame);setTimeout(size,300);
      if(RM){intro=false}
    });
  }
  world();
})();
