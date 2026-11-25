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
  function tree(){
    var o='',pos=[[100,70,'#ff4a57'],[78,104,'#ffd24d'],[124,112,'#59d6ff'],[62,146,'#ff4a57'],[100,138,'#8dff9b'],[140,150,'#ffd24d'],[46,184,'#59d6ff'],[84,178,'#ff4a57'],[122,184,'#ffd24d'],[158,186,'#8dff9b']];
    pos.forEach(function(p,i){o+='<circle class="xi-orn" style="animation-delay:'+(1.7+i*.12)+'s,'+(1.7+i*.12)+'s" cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="'+p[2]+'"/>'});
    return '<svg class="xi-tree" viewBox="0 0 200 250" aria-hidden="true"><polygon points="100,22 156,100 44,100" fill="#157a45" stroke="#f6c453" stroke-width="2"/><polygon points="100,56 168,150 32,150" fill="#0f6238" stroke="#f6c453" stroke-width="2"/><polygon points="100,96 180,204 20,204" fill="#0b4d2d" stroke="#f6c453" stroke-width="2"/><rect x="88" y="204" width="24" height="26" rx="3" fill="#6b4226"/>'+o+'<polygon class="xi-star" points="100,0 106,15 122,15 109,25 114,41 100,31 86,41 91,25 78,15 94,15" fill="#ffe08a" stroke="#f6c453"/></svg>';
  }
  function play(sub){
    if(RM||document.getElementById('xmIntro'))return;
    var t=sub.getAttribute('data-it')||'',s=sub.getAttribute('data-is')||'Navidad en Presidencia';
    var words=t.split(/\s+/).filter(Boolean).map(function(w){return '<span>'+esc(w)+'</span>'}).join(' ');
    var el=document.createElement('div');el.id='xmIntro';
    el.innerHTML='<canvas></canvas><div class="xi-lights"></div><div class="xi-wrap">'+tree()+'<div class="xi-kick">Presidencia de la República · Talento Humano</div><div class="xi-title">'+words+'</div><div class="xi-sub">'+esc(s)+'</div></div><button class="xi-skip" type="button">Saltar ▸</button>';
    document.body.appendChild(el);
    var stop=snow(el.querySelector('canvas'),160,1.6,.95),done=0;
    function end(){if(done)return;done=1;el.classList.add('out');setTimeout(function(){stop();el.remove()},900)}
    el.addEventListener('click',end);setTimeout(end,7600);
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
