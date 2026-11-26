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
})();
