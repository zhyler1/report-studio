/* Report Studio · ventanas emergentes con contenido libre (.rs-pp). El contenido se mueve a la ventana al abrir y vuelve a su sitio al cerrar. */
(function(){
var ov,box,ttl,bd,cur=null,last=null;
function make(){
  if(ov)return;
  ov=document.createElement('div');ov.id='rsPP';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML='<div class="pp-box"><div class="pp-top"><h3 class="pp-ttl"></h3><button type="button" class="pp-x" aria-label="Cerrar">×</button></div><div class="pp-body"></div></div>';
  document.body.appendChild(ov);box=ov.querySelector('.pp-box');ttl=ov.querySelector('.pp-ttl');bd=ov.querySelector('.pp-body');
  ov.addEventListener('click',function(e){if(e.target===ov||e.target.classList.contains('pp-x'))close()});
}
function open(src,from){
  make();if(cur)close();cur=src;last=from;
  ttl.textContent=src.getAttribute('data-title')||'';box.setAttribute('data-size',src.getAttribute('data-size')||'mediana');
  while(src.firstChild)bd.appendChild(src.firstChild);
  bd.querySelectorAll('[data-r]').forEach(function(e){e.classList.add('in')});
  bd.scrollTop=0;ov.classList.add('on');document.documentElement.style.overflow='hidden';
  ov.querySelector('.pp-x').focus();
  window.dispatchEvent(new Event('resize'));
}
function close(){
  if(!cur)return;
  while(bd.firstChild)cur.appendChild(bd.firstChild);
  ov.classList.remove('on');document.documentElement.style.overflow='';
  var f=last;cur=null;last=null;if(f&&f.focus)f.focus();
}
document.addEventListener('click',function(e){
  var g=e.target.closest&&e.target.closest('.rs-pp-go');if(!g)return;
  var w=g.closest('.rs-pp'),s=w&&w.querySelector('.rs-pp-src');if(s)open(s,g);
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&cur){close();return}
  if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('rs-pp-card')){e.preventDefault();e.target.click()}
});
})();
