/* Report Studio · calendario de agenda (texto plano → mes + lista). Lee data-spec de cada .rs-ag */
(function(){
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var DIA=['lun','mar','mié','jue','vie','sáb','dom'];
var COL=['--blue','--yellow','--red','--green','--navy','--gold'];
var TX={'--yellow':'#14243F','--gold':'#14243F'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function pad(n){return(n<10?'0':'')+n}
function ymd(y,m,d){return y+'-'+pad(m)+'-'+pad(d)}
function fl(d){var p=d.split('-');return parseInt(p[2],10)+' '+MES[parseInt(p[1],10)-1].slice(0,3)}
function hoy(){var t=new Date();return ymd(t.getFullYear(),t.getMonth()+1,t.getDate())}
function build(el){
  var sp;try{sp=JSON.parse(el.getAttribute('data-spec'))}catch(e){return}
  var ev=sp.ev||[],cats=[],cc={};
  ev.forEach(function(e){var k=e.c||'';if(!(k in cc)){cc[k]=COL[cats.length%COL.length];cats.push(k)}});
  var p=(sp.mes||(ev[0]?ev[0].d.slice(0,7):hoy().slice(0,7))).split('-');
  var st={y:+p[0],m:+p[1],sel:null,off:{},vista:sp.vista||'ambas'};
  function inMonth(e){var a=ymd(st.y,st.m,1),z=ymd(st.y,st.m,31);return e.d<=z&&e.e>=a}
  function onDay(e,d){return e.d<=d&&e.e>=d}
  function chip(e){var c=cc[e.c||''];return '<span class="ag-dot" style="--ac:var('+c+')"></span>'}
  function draw(){
    var first=new Date(st.y,st.m-1,1),lead=(first.getDay()+6)%7,dim=new Date(st.y,st.m,0).getDate(),t=hoy();
    var vis=ev.filter(function(e){return !st.off[e.c||'']});
    var h='<div class="ag-bar"><div class="ag-nav"><button data-a="prev" aria-label="Mes anterior">‹</button><b class="ag-ttl">'+MES[st.m-1]+' '+st.y+'</b><button data-a="next" aria-label="Mes siguiente">›</button><button data-a="hoy" class="ag-hoy">Hoy</button></div>';
    if(cats.length>1||(cats[0]||'')!=='')h+='<div class="ag-cats">'+cats.map(function(k){return '<button class="ag-cat'+(st.off[k]?' off':'')+'" data-c="'+esc(k)+'" style="--ac:var('+cc[k]+')"><i></i>'+esc(k||'General')+'</button>'}).join('')+'</div>';
    if(sp.vista==='ambas')h+='<div class="ag-seg"><button data-v="ambas" class="'+(st.vista==='ambas'?'on':'')+'">Ambas</button><button data-v="mes" class="'+(st.vista==='mes'?'on':'')+'">Mes</button><button data-v="lista" class="'+(st.vista==='lista'?'on':'')+'">Lista</button></div>';
    h+='</div>';
    var mv=st.vista!=='lista',lv=st.vista!=='mes';
    h+='<div class="ag-body'+(mv&&lv?' two':'')+'">';
    if(mv){
      h+='<div class="ag-grid">'+DIA.map(function(d){return '<div class="ag-dh">'+d+'</div>'}).join('');
      for(var i=0;i<lead;i++)h+='<div class="ag-d blank"></div>';
      for(var d=1;d<=dim;d++){
        var k=ymd(st.y,st.m,d),es=vis.filter(function(e){return onDay(e,k)});
        h+='<button class="ag-d'+(es.length?' has':'')+(k===t?' today':'')+(k===st.sel?' sel':'')+'" data-d="'+k+'"><span class="ag-n">'+d+'</span>'
          +es.slice(0,2).map(function(e){return '<span class="ag-ev" style="--ac:var('+cc[e.c||'']+');--at:'+(TX[cc[e.c||'']]||'#fff')+'">'+esc(e.t)+'</span>'}).join('')
          +(es.length>2?'<span class="ag-more">+'+(es.length-2)+' más</span>':'')
          +(es.length?'<span class="ag-dots">'+es.slice(0,4).map(chip).join('')+'</span>':'')+'</button>';
      }
      h+='</div>';
    }
    var lst=vis.filter(inMonth);
    if(st.sel&&mv)lst=lst.filter(function(e){return onDay(e,st.sel)});
    if(lv||st.sel){
      h+='<div class="ag-list">'+(st.sel?'<div class="ag-lh">'+fl(st.sel)+' <button data-a="all">Ver todo el mes ✕</button></div>':(lv?'<div class="ag-lh">Eventos de '+MES[st.m-1]+'</div>':''));
      h+=lst.length?lst.map(function(e){
        var r=e.e!==e.d?fl(e.d)+' → '+fl(e.e):fl(e.d);
        return '<div class="ag-it" style="--ac:var('+cc[e.c||'']+')"><div class="ag-when">'+r+'</div><div class="ag-what"><b>'+esc(e.t)+'</b>'+(e.x?'<span>'+esc(e.x)+'</span>':'')+(e.c?'<em>'+esc(e.c)+'</em>':'')+'</div></div>';
      }).join(''):'<div class="ag-empty">'+(ev.length?'No hay eventos '+(st.sel?'este día':'este mes')+'.':'Aún no hay eventos. Escríbelos en el texto del bloque.')+'</div>';
      h+='</div>';
    }
    h+='</div>';
    el.innerHTML=h;
  }
  el.addEventListener('click',function(x){
    var b=x.target.closest('button');if(!b||!el.contains(b))return;
    var a=b.getAttribute('data-a');
    if(a==='prev'||a==='next'){st.m+=a==='next'?1:-1;if(st.m<1){st.m=12;st.y--}if(st.m>12){st.m=1;st.y++}st.sel=null}
    else if(a==='hoy'){var t=hoy().split('-');st.y=+t[0];st.m=+t[1];st.sel=hoy()}
    else if(a==='all')st.sel=null;
    else if(b.hasAttribute('data-d')){var d=b.getAttribute('data-d');st.sel=st.sel===d?null:d}
    else if(b.hasAttribute('data-c')){var c=b.getAttribute('data-c');st.off[c]=!st.off[c]}
    else if(b.hasAttribute('data-v')){st.vista=b.getAttribute('data-v')}
    else return;
    draw();
  });
  draw();
}
function init(){document.querySelectorAll('.rs-ag').forEach(function(el){if(el._rs)return;el._rs=1;build(el)})}
window.RSAgenda={init:init};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
