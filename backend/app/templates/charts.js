/* Report Studio · motor de gráficos SVG (sin dependencias). Lee data-spec de cada .rs-chart. */
(function(){
var PAL=['var(--blue)','var(--org,#E8730C)','var(--green2,#2E7D32)','#8E63C8','var(--red)','var(--yellow)','#14A3A3','#D6479A'];
var NAMED={blue:'var(--blue)',red:'var(--red)',green:'var(--green2,#2E7D32)',orange:'var(--org,#E8730C)',yellow:'var(--yellow)',purple:'#8E63C8',navy:'var(--navy)'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function col(c,i){return c&&c!=='auto'&&NAMED[c]?NAMED[c]:PAL[i%PAL.length]}
function fmt(v,u){if(v==null||isNaN(v))return'';var s=(+v).toLocaleString('es-CO',{maximumFractionDigits:Math.abs(v)<10&&v%1?1:0});u=u||'';if(u==='$')return'$ '+s;if(u==='%')return s+'%';return u?s+' '+u:s}
function cut(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s}
function ticks(min,max,n){var span=(max-min)||1,step=Math.pow(10,Math.floor(Math.log10(span/n))),e=span/n/step;step*=e>=7.5?10:e>=3.5?5:e>=1.5?2:1;
 var lo=Math.floor(min/step+1e-9)*step,hi=Math.ceil(max/step-1e-9)*step,a=[];for(var v=lo;v<=hi+step/2;v+=step)a.push(+v.toFixed(10));return a}
function T(x,y,s,o){o=o||{};return'<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.c?' class="'+o.c+'"':'')+(o.r?' transform="rotate('+o.r+' '+x.toFixed(1)+' '+y.toFixed(1)+')"':'')+(o.s?' style="'+o.s+'"':'')+'>'+esc(s)+'</text>'}
function tip(t){return' data-t="'+esc(t)+'"'}
function reg(v,upto){var n=Math.min(upto,v.length),sx=0,sy=0,sxy=0,sxx=0,i;for(i=0;i<n;i++){sx+=i;sy+=v[i];sxy+=i*v[i];sxx+=i*i}
 var d=n*sxx-sx*sx||1,b=(n*sxy-sx*sy)/d,a=(sy-b*sx)/n,se=0;for(i=0;i<n;i++)se+=Math.pow(v[i]-(a+b*i),2);return{a:a,b:b,se:Math.sqrt(se/Math.max(1,n-2))}}
function tipEl(){var t=document.getElementById('rsTip');if(!t){t=document.createElement('div');t.id='rsTip';document.body.appendChild(t)}return t}
function bind(el){if(el._rsb)return;el._rsb=1;var t=tipEl();
 function at(e){var x=e.clientX,y=e.clientY;t.style.left=Math.min(x+14,innerWidth-270)+'px';t.style.top=(y+16)+'px'}
 el.addEventListener('mousemove',function(e){var n=e.target.closest&&e.target.closest('[data-t]');if(!n||!el.contains(n)){t.style.opacity=0;return}t.innerHTML=n.getAttribute('data-t').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');at(e);t.style.opacity=1});
 el.addEventListener('mouseleave',function(){t.style.opacity=0});
 el.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.rs-leg button');if(!b)return;var i=+b.getAttribute('data-i'),h=el._h||(el._h={});h[i]=!h[i];draw(el)})}
function legend(items,el){var h=el._h||{};return'<div class="rs-leg">'+items.map(function(it,i){return'<button type="button" data-i="'+i+'" class="'+(h[i]?'off':'')+'"><i style="background:'+it.c+'"></i>'+esc(it.n)+'</button>'}).join('')+'</div>'}
function svg(W,H,body){return'<svg viewBox="0 0 '+W+' '+H+'" role="img">'+body+'</svg>'}
function arc(cx,cy,r0,r1,a0,a1){var c=Math.cos,s=Math.sin,L=a1-a0>Math.PI?1:0;if(a1-a0>=Math.PI*2-1e-4)a1=a0+Math.PI*2-1e-4;
 var x0=cx+r1*c(a0),y0=cy+r1*s(a0),x1=cx+r1*c(a1),y1=cy+r1*s(a1),x2=cx+r0*c(a1),y2=cy+r0*s(a1),x3=cx+r0*c(a0),y3=cy+r0*s(a0);
 return'M'+x0+' '+y0+'A'+r1+' '+r1+' 0 '+L+' 1 '+x1+' '+y1+(r0>0?'L'+x2+' '+y2+'A'+r0+' '+r0+' 0 '+L+' 0 '+x3+' '+y3+'Z':'L'+cx+' '+cy+'Z')}
function dt(s){var p=String(s).split('-');return Date.UTC(+p[0],+p[1]-1,+p[2])}
var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function dstr(ms){var d=new Date(ms);return d.getUTCDate()+' '+MES[d.getUTCMonth()]+' '+d.getUTCFullYear()}

/* ───── cartesianos ───── */
function cart(el,sp,H){
 var W=el.clientWidth,kind=sp.kind,u=sp.unit,hid=el._h||{},n=sp.labels.length,fc=Math.max(0,+sp.forecast||0),stack=/^stacked/.test(kind);
 var P=sp.projection_from!=null?sp.projection_from:(fc?n:1e9),N=n+fc,labels=sp.labels.slice(),k;
 for(k=0;k<fc;k++)labels.push((sp.forecast_labels||[])[k]||'+'+(k+1));
 var S=sp.series.map(function(s,i){var v=s.values.slice(),band=null;
  if(fc&&!stack){var r=reg(v,Math.min(P,n));band=[];for(var j=n;j<N;j++){v.push(r.a+r.b*j);band.push(1.64*r.se)}}
  return{n:s.name,c:col(s.color,i),v:v,band:band,t:kind==='combo'?(s.kind||'bar'):(kind==='step'?'step':kind==='line'?'line':kind==='area'||kind==='stacked_area'?'area':kind==='lollipop'?'lol':'bar'),i:i,off:!!hid[i]}});
 var vis=S.filter(function(s){return!s.off}),ns=vis.length||1;
 var min=0,max=0,first=true;
 function acc(v){if(v==null||isNaN(v))return;if(first){min=max=v;first=false}else{min=Math.min(min,v);max=Math.max(max,v)}}
 if(kind==='stacked100'){min=0;max=100}
 else if(stack){for(var i=0;i<N;i++){var p=0,q=0;vis.forEach(function(s){(s.v[i]>=0)?p+=s.v[i]:q+=s.v[i]});acc(p);acc(q)}}
 else vis.forEach(function(s){s.v.forEach(function(v,i){acc(v);if(s.band&&i>=n)acc(v+s.band[i-n]),acc(v-s.band[i-n])})});
 if(kind!=='line'&&kind!=='area'||true){if(min>0&&kind!=='line'&&kind!=='step')min=0;if(max<0)max=0}
 var tk=ticks(min,max,5);min=tk[0];max=tk[tk.length-1];if(min===max)max=min+1;
 var fy=function(v){return v==null?null:v},longest=Math.max.apply(null,tk.map(function(t){return fmt(t,u).length}));
 var L=Math.max(40,longest*6.6+14),R=14,Tp=18,slot=(W-L-R)/N,mx=Math.max.apply(null,labels.map(function(s){return s.length}));
 var rot=mx*6.2>slot&&N>1,B=rot?70:34,iw=W-L-R,ih=H-Tp-B;
 var X=function(i){return L+slot*(i+.5)},Y=function(v){return Tp+ih-(v-min)/(max-min)*ih};
 var o='',i2;
 tk.forEach(function(t){var y=Y(t);o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'"/>'+T(L-8,y+4,fmt(kind==='stacked100'?t:t,kind==='stacked100'?'%':u),{a:'end'})});
 o+='<line class="rs-axis" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(0)+'" y2="'+Y(0)+'"/>';
 labels.forEach(function(s,i){var y=H-B+16,lbl=cut(s,rot?18:Math.max(4,Math.floor(slot/6.2)));o+=T(X(i),rot?y-2:y,lbl,{a:rot?'end':'middle',r:rot?-35:0})+(i>=P?'':'')});
 var barS=vis.filter(function(s){return s.t==='bar'}),nb=barS.length||1,gw=Math.min(slot*.74,60*nb),bw=gw/nb,pos=new Array(N).fill(0),neg=new Array(N).fill(0),tot=[];
 if(kind==='stacked100'){for(var a=0;a<N;a++){tot[a]=vis.reduce(function(m,s){return m+Math.max(0,s.v[a]||0)},0)||1}}
 var ci=0;
 vis.forEach(function(s){var c=s.c;
  if(stack&&kind!=='stacked_area'){s.v.forEach(function(v,i){var val=kind==='stacked100'?v/tot[i]*100:v,y0,y1;if(val>=0){y0=pos[i];pos[i]+=val;y1=pos[i]}else{y0=neg[i];neg[i]+=val;y1=neg[i]}
    var top=Y(Math.max(y0,y1)),h=Math.abs(Y(y0)-Y(y1));o+='<rect class="rs-bar" style="--i:'+(i)+'" x="'+(X(i)-gw/2)+'" y="'+top+'" width="'+gw+'" height="'+Math.max(h,0)+'" fill="'+c+'" stroke="var(--card,#fff)" stroke-width="1"'+tip('**'+esc(s.n)+'** · '+labels[i]+'\n'+fmt(v,u)+(kind==='stacked100'?' ('+fmt(val,'%')+')':''))+'/>';
    if(sp.show_values&&N<=14&&h>14)o+=T(X(i),top+h/2+4,fmt(kind==='stacked100'?val:v,kind==='stacked100'?'%':''),{a:'middle',c:'rs-v',s:'fill:#fff'})});return}
  if(s.t==='bar'){var bi=barS.indexOf(s);s.v.forEach(function(v,i){var x=X(i)-gw/2+bi*bw,y=Y(Math.max(v,0)),h=Math.abs(Y(v)-Y(0)),pr=i>=P;
    o+='<rect class="rs-bar" style="--i:'+i+'" x="'+(x+1)+'" y="'+y+'" width="'+Math.max(bw-2,1)+'" height="'+h+'" rx="3" fill="'+c+'"'+(pr?' fill-opacity=".42" stroke="'+c+'" stroke-dasharray="4 3"':'')+tip('**'+esc(s.n)+'** · '+labels[i]+'\n'+fmt(v,u)+(pr?'\n(proyección)':''))+'/>';
    if(sp.show_values&&N<=12&&ns<=3)o+=T(x+bw/2,v>=0?y-5:y+h+13,fmt(v,''),{a:'middle',c:'rs-v'})});return}
  var pts=s.v.map(function(v,i){return[X(i),Y(v)]}),real=Math.min(P,N);
  if(s.t==='lol'){s.v.forEach(function(v,i){o+='<line class="rs-grid" style="stroke:'+c+';stroke-width:2" x1="'+X(i)+'" x2="'+X(i)+'" y1="'+Y(0)+'" y2="'+pts[i][1]+'"/><circle class="rs-pop" style="--i:'+i+'" cx="'+X(i)+'" cy="'+pts[i][1]+'" r="6" fill="'+c+'"'+(i>=P?' fill-opacity=".45"':'')+tip('**'+esc(s.n)+'** · '+labels[i]+'\n'+fmt(v,u))+'/>'+(sp.show_values&&N<=12?T(X(i),pts[i][1]-11,fmt(v,''),{a:'middle',c:'rs-v'}):'')});return}
  var d1=pts.slice(0,real).map(function(p,i){return(i?(s.t==='step'?'L'+p[0].toFixed(1)+' '+pts[i-1][1].toFixed(1)+'L':'L'):'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join('');
  if(kind==='stacked_area'||s.t==='area'){
    if(kind==='stacked_area'){var up=s.v.map(function(v,i){var b=pos[i];pos[i]+=v;return[b,pos[i]]});
      var top=up.map(function(w,i){return(i?'L':'M')+X(i).toFixed(1)+' '+Y(w[1]).toFixed(1)}).join(''),bot=up.slice().reverse().map(function(w,i2){var i=N-1-i2;return'L'+X(i).toFixed(1)+' '+Y(w[0]).toFixed(1)}).join('');
      o+='<path class="rs-fade" d="'+top+bot+'Z" fill="'+c+'" fill-opacity=".55" stroke="'+c+'" stroke-width="1.5"/>';
      pts.forEach(function(p,i){o+='<circle cx="'+X(i)+'" cy="'+Y(up[i][1])+'" r="7" fill="transparent"'+tip('**'+esc(s.n)+'** · '+labels[i]+'\n'+fmt(s.v[i],u))+'/>'});return}
    o+='<path class="rs-fade" d="'+d1+'L'+pts[real-1][0]+' '+Y(0)+'L'+pts[0][0]+' '+Y(0)+'Z" fill="'+c+'" fill-opacity=".18"/>'}
  if(s.band&&fc){var up2=[],dn=[];for(var j=n-1;j<N;j++){var b=j<n?0:s.band[j-n];up2.push((j===n-1?'M':'L')+X(j).toFixed(1)+' '+Y(s.v[j]+b).toFixed(1));dn.unshift('L'+X(j).toFixed(1)+' '+Y(s.v[j]-b).toFixed(1))}
    o+='<path class="rs-fade" d="'+up2.join('')+dn.join('')+'Z" fill="'+c+'" fill-opacity=".14"/>'}
  o+='<path class="rs-line" pathLength="1" d="'+d1+'" fill="none" stroke="'+c+'" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
  if(real<N){o+='<path class="rs-fade" d="M'+pts[real-1][0]+' '+pts[real-1][1]+pts.slice(real).map(function(p){return'L'+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join('')+'" fill="none" stroke="'+c+'" stroke-width="2.6" stroke-dasharray="6 5"/>'}
  pts.forEach(function(p,i){var pr=i>=P;o+='<circle class="rs-pop" style="--i:'+i+'" cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="'+(pr?'var(--card,#fff)':c)+'" stroke="'+c+'" stroke-width="2"'+tip('**'+esc(s.n)+'** · '+labels[i]+'\n'+fmt(s.v[i],u)+(pr?'\n(proyección)':''))+'/>'+(sp.show_values&&N<=12&&ns<=2?T(p[0],p[1]-10,fmt(s.v[i],''),{a:'middle',c:'rs-v'}):'')})
 });
 if(fc)o+='<line x1="'+(L+slot*n)+'" x2="'+(L+slot*n)+'" y1="'+Tp+'" y2="'+(H-B)+'" stroke="var(--muted)" stroke-dasharray="4 4" stroke-opacity=".6"/>'+T(L+slot*n+5,Tp+10,'proyección',{});
 return{svg:svg(W,H,o),leg:S.map(function(s){return{n:s.n,c:s.c}}),multi:S.length>1}}

function hbar(el,sp,H){var W=el.clientWidth,u=sp.unit,hid=el._h||{},lab=sp.labels,S=sp.series.map(function(s,i){return{n:s.name,c:col(s.color,i),v:s.values,off:!!hid[i]}}),vis=S.filter(function(s){return!s.off}),ns=vis.length||1;
 var max=0,min=0;vis.forEach(function(s){s.v.forEach(function(v){max=Math.max(max,v);min=Math.min(min,v)})});var tk=ticks(min,max,5);min=tk[0];max=tk[tk.length-1];
 var L=Math.min(200,Math.max.apply(null,lab.map(function(s){return Math.min(s.length,26)}))*6.4+14),R=44,Tp=8,B=26,ih=H-Tp-B,slot=ih/lab.length,iw=W-L-R,X=function(v){return L+(v-min)/(max-min)*iw},o='',gh=Math.min(slot*.74,34*ns),bh=gh/ns;
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+X(t)+'" x2="'+X(t)+'" y1="'+Tp+'" y2="'+(H-B)+'"/>'+T(X(t),H-8,fmt(t,u),{a:'middle'})});
 lab.forEach(function(s,i){var cy=Tp+slot*(i+.5);o+=T(L-8,cy+4,cut(s,26),{a:'end'});
  vis.forEach(function(sr,j){var v=sr.v[i],y=cy-gh/2+j*bh;o+='<rect class="rs-barh" style="--i:'+i+'" x="'+Math.min(X(0),X(v))+'" y="'+(y+1)+'" width="'+Math.abs(X(v)-X(0))+'" height="'+Math.max(bh-2,1)+'" rx="3" fill="'+sr.c+'"'+tip('**'+esc(sr.n)+'** · '+esc(s)+'\n'+fmt(v,u))+'/>'+(sp.show_values?T(Math.max(X(v),X(0))+6,y+bh/2+4,fmt(v,''),{c:'rs-v'}):'')})});
 return{svg:svg(W,H,o),leg:S.map(function(s){return{n:s.n,c:s.c}}),multi:S.length>1}}

/* ───── circulares ───── */
function pie(el,sp,H,donut){var W=el.clientWidth,s0=sp.series[0],u=sp.unit,hid=el._h||{},vals=s0.values,lab=sp.labels,tot=0,items=lab.map(function(l,i){return{n:l,v:vals[i]||0,c:s0.color&&s0.color!=='auto'&&lab.length===1?col(s0.color,0):PAL[i%PAL.length],off:!!hid[i]}});
 items.forEach(function(it){if(!it.off)tot+=it.v});tot=tot||1;var cx=W/2,cy=H/2,r=Math.min(W*.4,H/2-34),r0=donut?r*.6:0,a=-Math.PI/2,o='';
 items.forEach(function(it,i){if(it.off||!it.v)return;var d=it.v/tot*Math.PI*2,mid=a+d/2,dx=Math.cos(mid)*7,dy=Math.sin(mid)*7;
  o+='<path class="rs-slice" style="--i:'+i+'" d="'+arc(cx,cy,r0,r,a,a+d)+'" fill="'+it.c+'" stroke="var(--card,#fff)" stroke-width="2"'+tip('**'+esc(it.n)+'**\n'+fmt(it.v,u)+' · '+fmt(it.v/tot*100,'%'))+'/>';
  if(sp.show_values&&d>.28){var rr=donut?(r+r0)/2:r*.68;o+=T(cx+Math.cos(mid)*rr,cy+Math.sin(mid)*rr+4,fmt(it.v/tot*100,'%'),{a:'middle',c:'rs-v',s:'fill:#fff;pointer-events:none'})}
  a+=d});
 if(donut)o+=T(cx,cy+2,fmt(tot,''),{a:'middle',c:'rs-big'})+T(cx,cy+22,u&&u!=='%'?u:'total',{a:'middle'});
 return{svg:svg(W,H,o),leg:items.map(function(it){return{n:it.n+' ('+fmt(it.v,'')+')',c:it.c}}),multi:true}}

function radial(el,sp,H){var W=el.clientWidth,s0=sp.series[0],mx=sp.max||Math.max.apply(null,s0.values.concat(sp.series.length?[0]:[0]))||100,hid=el._h||{},n=sp.labels.length,cx=W/2,cy=H/2,R=Math.min(W*.42,H/2-10),st=R/(n+1.2),o='';
 sp.labels.forEach(function(l,i){var v=s0.values[i],r=R-i*st,c=PAL[i%PAL.length],f=Math.min(1,v/mx);if(hid[i])return;
  o+='<path d="'+arc(cx,cy,r-st*.32,r+st*.32,-Math.PI/2,Math.PI*1.5)+'" fill="var(--border)" fill-opacity=".6"/><path class="rs-slice" style="--i:'+i+'" d="'+arc(cx,cy,r-st*.32,r+st*.32,-Math.PI/2,-Math.PI/2+Math.max(f,.004)*Math.PI*2)+'" fill="'+c+'"'+tip('**'+esc(l)+'**\n'+fmt(v,sp.unit)+' de '+fmt(mx,sp.unit))+'/>'});
 return{svg:svg(W,H,o),leg:sp.labels.map(function(l,i){return{n:l+' ('+fmt(s0.values[i],sp.unit)+')',c:PAL[i%PAL.length]}}),multi:true}}

function gauge(el,sp,H){var W=el.clientWidth,v=sp.series[0].values[0]||0,mx=sp.max||100,f=Math.max(0,Math.min(1,v/mx)),cx=W/2,cy=H-46,R=Math.min(W*.4,cy-14),o='',z=[[0,.5,'var(--red)'],[.5,.8,'var(--yellow)'],[.8,.9,'var(--org,#E8730C)'],[.9,1,'var(--green2,#2E7D32)']];
 z=[[0,.5,'var(--red)'],[.5,.8,'var(--org,#E8730C)'],[.8,.9,'var(--yellow)'],[.9,1,'var(--green2,#2E7D32)']];
 z.forEach(function(q){o+='<path d="'+arc(cx,cy,R*.72,R,Math.PI+q[0]*Math.PI,Math.PI+q[1]*Math.PI)+'" fill="'+q[2]+'" fill-opacity=".28"/>'});
 var cc=f>=.9?z[3][2]:f>=.8?z[2][2]:f>=.5?z[1][2]:z[0][2];
 o+='<path class="rs-slice" d="'+arc(cx,cy,R*.72,R,Math.PI,Math.PI+f*Math.PI)+'" fill="'+cc+'"'+tip('**'+esc(sp.series[0].name)+'**\n'+fmt(v,sp.unit))+'/>';
 var an=Math.PI+f*Math.PI;o+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+Math.cos(an)*R*.66)+'" y2="'+(cy+Math.sin(an)*R*.66)+'" stroke="var(--head)" stroke-width="3" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+cy+'" r="7" fill="var(--head)"/>';
 o+=T(cx,cy-R*.3,fmt(v,sp.unit),{a:'middle',c:'rs-big'})+T(cx-R*.86,cy+18,'0',{a:'middle'})+T(cx+R*.86,cy+18,fmt(mx,''),{a:'middle'})+T(cx,cy+30,sp.series[0].name,{a:'middle'});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function bullet(el,sp,H){var W=el.clientWidth,s0=sp.series[0],lab=sp.labels,tg=sp.target,mxg=sp.max||Math.max.apply(null,s0.values.concat([1]))*1.15,L=Math.min(190,Math.max.apply(null,lab.map(function(s){return Math.min(s.length,24)}))*6.4+14),R=60,slot=(H-10)/lab.length,bh=Math.min(26,slot*.45),o='',tw=W-L-R;
 lab.forEach(function(l,i){var cy=5+slot*(i+.5),v=s0.values[i],t=tg[i],span=t?t*1.25:mxg,X=function(q){return L+Math.min(q/span,1)*tw},f=t?v/t:v/mxg,c=f>=.9?'var(--green2,#2E7D32)':f>=.8?'var(--yellow)':f>=.5?'var(--org,#E8730C)':'var(--red)';
  o+=T(L-8,cy+4,cut(l,24),{a:'end'})+'<rect x="'+L+'" y="'+(cy-bh)+'" width="'+tw+'" height="'+bh*2+'" rx="4" fill="var(--border)" fill-opacity=".55"/><rect class="rs-barh" style="--i:'+i+'" x="'+L+'" y="'+(cy-bh*.5)+'" width="'+(X(v)-L)+'" height="'+bh+'" rx="3" fill="'+c+'"'+tip('**'+esc(l)+'**\nActual: '+fmt(v,sp.unit)+(t?'\nMeta: '+fmt(t,sp.unit)+' ('+fmt(f*100,'%')+')':''))+'/>';
  if(t)o+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(cy-bh)+'" y2="'+(cy+bh)+'" stroke="var(--head)" stroke-width="3"/>';
  if(sp.show_values)o+=T(W-R+8,cy+4,fmt(v,'')+(t?' / '+fmt(t,''):''),{c:'rs-v'})});
 return{svg:svg(W,H,o),leg:[{n:'Avance (verde ≥90%, amarillo ≥80%, naranja ≥50%, rojo <50%)',c:'var(--green2,#2E7D32)'},{n:'Meta',c:'var(--head)'}],multi:true}}

function radar(el,sp,H){var W=el.clientWidth,n=sp.labels.length,hid=el._h||{},cx=W/2,cy=H/2+4,R=Math.min(W*.32,H/2-34),o='',all=[];sp.series.forEach(function(s){all=all.concat(s.values)});
 var mx=sp.max||ticks(0,Math.max.apply(null,all),4).pop()||1,an=function(i){return-Math.PI/2+i/n*Math.PI*2},P=function(i,v){return[cx+Math.cos(an(i))*R*v/mx,cy+Math.sin(an(i))*R*v/mx]};
 for(var g=1;g<=4;g++){o+='<polygon class="rs-grid" fill="none" points="'+sp.labels.map(function(_,i){return P(i,mx*g/4).join(',')}).join(' ')+'"/>';o+=T(cx+4,cy-R*g/4+3,fmt(mx*g/4,''),{s:'font-size:10px;opacity:.7'})}
 sp.labels.forEach(function(l,i){var p=P(i,mx),q=P(i,mx*1.14);o+='<line class="rs-grid" x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'"/>'+T(q[0],q[1]+4,cut(l,16),{a:q[0]<cx-6?'end':q[0]>cx+6?'start':'middle'})});
 sp.series.forEach(function(s,k){if(hid[k])return;var c=col(s.color,k),pts=s.values.map(function(v,i){return P(i,v)});
  o+='<polygon class="rs-fade" points="'+pts.map(function(p){return p.join(',')}).join(' ')+'" fill="'+c+'" fill-opacity=".2" stroke="'+c+'" stroke-width="2.4" stroke-linejoin="round"/>';
  pts.forEach(function(p,i){o+='<circle class="rs-pop" style="--i:'+i+'" cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="'+c+'"'+tip('**'+esc(s.name)+'** · '+esc(sp.labels[i])+'\n'+fmt(s.values[i],sp.unit))+'/>'})});
 return{svg:svg(W,H,o),leg:sp.series.map(function(s,i){return{n:s.name,c:col(s.color,i)}}),multi:sp.series.length>1}}

/* ───── dispersión ───── */
function scatter(el,sp,H,bub){var W=el.clientWidth,hid=el._h||{},xs=[],ys=[],rs=[];sp.series.forEach(function(s,i){if(!hid[i])s.points.forEach(function(p){xs.push(p.x);ys.push(p.y);rs.push(p.r||0)})});
 if(!xs.length)return{svg:svg(W,H,''),leg:[],multi:false};var tx=ticks(Math.min.apply(null,xs),Math.max.apply(null,xs),6),ty=ticks(Math.min.apply(null,ys),Math.max.apply(null,ys),5),xa=tx[0]-(tx[1]-tx[0])*.5,xb=tx[tx.length-1]+(tx[1]-tx[0])*.5,ya=ty[0]-(ty[1]-ty[0])*.5,yb=ty[ty.length-1]+(ty[1]-ty[0])*.5,L=56,R=18,Tp=14,B=34,
  X=function(v){return L+(v-xa)/((xb-xa)||1)*(W-L-R)},Y=function(v){return Tp+(H-Tp-B)-(v-ya)/((yb-ya)||1)*(H-Tp-B)},rm=Math.max.apply(null,rs.concat(1)),o='';
 ty.forEach(function(t){o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'"/>'+T(L-8,Y(t)+4,fmt(t,''),{a:'end'})});tx.forEach(function(t){o+='<line class="rs-grid" x1="'+X(t)+'" x2="'+X(t)+'" y1="'+Tp+'" y2="'+(H-B)+'"/>'+T(X(t),H-12,fmt(t,''),{a:'middle'})});
 sp.series.forEach(function(s,k){if(hid[k])return;var c=col(s.color,k);s.points.forEach(function(p,i){var r=bub?6+Math.sqrt((p.r||0)/rm)*26:7;o+='<circle class="rs-pop" style="--i:'+i+'" cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="'+r+'" fill="'+c+'" fill-opacity="'+(bub?.55:.8)+'" stroke="'+c+'" stroke-width="1.5"'+tip('**'+esc(p.label||s.name)+'**\nx: '+fmt(p.x,'')+' · y: '+fmt(p.y,sp.unit)+(bub?'\ntamaño: '+fmt(p.r,''):''))+'/>'})});
 return{svg:svg(W,H,o),leg:sp.series.map(function(s,i){return{n:s.name,c:col(s.color,i)}}),multi:sp.series.length>1}}

/* ───── cascada, embudo, velas, mapa de calor, treemap ───── */
function waterfall(el,sp,H){var W=el.clientWidth,v=sp.series[0].values,lab=sp.labels,tot=sp.totals||[],run=0,bars=[],mn=0,mx=0;
 v.forEach(function(x,i){var t=tot.indexOf(i)>=0,a=t?0:run,b=t?x:run+x;if(t)run=x;else run+=x;bars.push({a:a,b:b,t:t,x:x,end:run});mn=Math.min(mn,a,b);mx=Math.max(mx,a,b)});
 var tk=ticks(mn,mx,5);mn=tk[0];mx=tk[tk.length-1];var L=Math.max(44,Math.max.apply(null,tk.map(function(t){return fmt(t,sp.unit).length}))*6.6+14),R=14,Tp=16,B=40,slot=(W-L-R)/lab.length,Y=function(q){return Tp+(H-Tp-B)-(q-mn)/(mx-mn)*(H-Tp-B)},o='';
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'"/>'+T(L-8,Y(t)+4,fmt(t,sp.unit),{a:'end'})});
 bars.forEach(function(b,i){var x=L+slot*i+slot*.14,w=slot*.72,c=b.t?'var(--blue)':b.x>=0?'var(--green2,#2E7D32)':'var(--red)';
  o+='<rect class="rs-bar" style="--i:'+i+'" x="'+x+'" y="'+Y(Math.max(b.a,b.b))+'" width="'+w+'" height="'+Math.max(Math.abs(Y(b.a)-Y(b.b)),1)+'" rx="3" fill="'+c+'"'+tip('**'+esc(lab[i])+'**\n'+(b.t?'Total: ':(b.x>=0?'+':''))+fmt(b.x,sp.unit)+(b.t?'':'\nAcumulado: '+fmt(b.end,sp.unit)))+'/>';
  if(i<bars.length-1)o+='<line x1="'+(x+w)+'" x2="'+(x+slot)+'" y1="'+Y(b.end)+'" y2="'+Y(b.end)+'" stroke="var(--muted)" stroke-dasharray="3 3" stroke-opacity=".6"/>';
  if(sp.show_values)o+=T(x+w/2,Y(Math.max(b.a,b.b))-6,(b.t||b.x<0?'':'+')+fmt(b.x,''),{a:'middle',c:'rs-v'});o+=T(x+w/2,H-B+16,cut(lab[i],Math.max(4,Math.floor(slot/6.2))),{a:'middle'})});
 return{svg:svg(W,H,o),leg:[{n:'Aumento',c:'var(--green2,#2E7D32)'},{n:'Disminución',c:'var(--red)'},{n:'Total',c:'var(--blue)'}],multi:true}}

function funnel(el,sp,H){var W=el.clientWidth,v=sp.series[0].values,lab=sp.labels,mx=Math.max.apply(null,v.concat(1)),n=v.length,h=(H-8)/n,o='',cx=W/2,MW=W*.8;
 v.forEach(function(x,i){var w=x/mx*MW,nx=(v[i+1]!=null?v[i+1]:x*.7)/mx*MW,y=4+i*h,c=PAL[i%PAL.length];
  o+='<path class="rs-slice" style="--i:'+i+'" d="M'+(cx-w/2)+' '+y+'L'+(cx+w/2)+' '+y+'L'+(cx+nx/2)+' '+(y+h-3)+'L'+(cx-nx/2)+' '+(y+h-3)+'Z" fill="'+c+'"'+tip('**'+esc(lab[i])+'**\n'+fmt(x,sp.unit)+(i?'\n'+fmt(x/v[0]*100,'%')+' del inicio · '+fmt(x/v[i-1]*100,'%')+' del paso previo':''))+'/>'+((w+nx)/2>190?T(cx,y+h/2+4,lab[i]+' · '+fmt(x,sp.unit),{a:'middle',c:'rs-v',s:'fill:#fff;pointer-events:none'}):T(cx+Math.max(w,nx)/2+12,y+h/2+4,lab[i]+' · '+fmt(x,sp.unit),{c:'rs-v',s:'pointer-events:none'}))});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function candles(el,sp,H){var W=el.clientWidth,d=sp.series[0].ohlc,lab=sp.labels,lo=Math.min.apply(null,d.map(function(x){return x[2]})),hi=Math.max.apply(null,d.map(function(x){return x[1]})),tk=ticks(lo,hi,5),mn=tk[0],mx=tk[tk.length-1],
  L=Math.max(44,Math.max.apply(null,tk.map(function(t){return fmt(t,sp.unit).length}))*6.6+14),R=14,Tp=14,B=36,slot=(W-L-R)/d.length,Y=function(q){return Tp+(H-Tp-B)-(q-mn)/(mx-mn)*(H-Tp-B)},o='';
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'"/>'+T(L-8,Y(t)+4,fmt(t,sp.unit),{a:'end'})});
 d.forEach(function(q,i){var up=q[3]>=q[0],c=up?'var(--green2,#2E7D32)':'var(--red)',cx=L+slot*(i+.5),w=Math.min(slot*.6,26);
  o+='<g class="rs-pop" style="--i:'+i+'"'+tip('**'+esc(lab[i])+'**\nApertura '+fmt(q[0],'')+' · Cierre '+fmt(q[3],'')+'\nMáx '+fmt(q[1],'')+' · Mín '+fmt(q[2],''))+'><line x1="'+cx+'" x2="'+cx+'" y1="'+Y(q[1])+'" y2="'+Y(q[2])+'" stroke="'+c+'" stroke-width="2"/><rect x="'+(cx-w/2)+'" y="'+Y(Math.max(q[0],q[3]))+'" width="'+w+'" height="'+Math.max(Math.abs(Y(q[0])-Y(q[3])),2)+'" fill="'+c+'" rx="2"/></g>'+T(cx,H-B+16,cut(lab[i],Math.max(4,Math.floor(slot/6.2))),{a:'middle'})});
 return{svg:svg(W,H,o),leg:[{n:'Sube',c:'var(--green2,#2E7D32)'},{n:'Baja',c:'var(--red)'}],multi:true}}

function heat(el,sp,H){var W=el.clientWidth,rows=sp.series,lab=sp.labels,all=[];rows.forEach(function(s){all=all.concat(s.values)});var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),
  L=Math.min(170,Math.max.apply(null,rows.map(function(s){return Math.min(s.name.length,22)}))*6.4+14),Tp=26,cw=(W-L-8)/lab.length,rh=Math.min(40,(H-Tp-6)/rows.length),o='';
 lab.forEach(function(l,j){o+=T(L+cw*(j+.5),16,cut(l,Math.max(3,Math.floor(cw/6.2))),{a:'middle'})});
 rows.forEach(function(s,i){o+=T(L-8,Tp+rh*(i+.5)+4,cut(s.name,22),{a:'end'});s.values.forEach(function(v,j){var f=(v-mn)/((mx-mn)||1);
  o+='<rect class="rs-slice" style="--i:'+(i+j)+';fill:color-mix(in srgb,var(--blue) '+Math.round(8+f*84)+'%,var(--card,#fff))" x="'+(L+cw*j+1.5)+'" y="'+(Tp+rh*i+1.5)+'" width="'+(cw-3)+'" height="'+(rh-3)+'" rx="5"'+tip('**'+esc(s.name)+'** · '+esc(lab[j])+'\n'+fmt(v,sp.unit))+'/>';
  if(sp.show_values&&cw>34)o+=T(L+cw*(j+.5),Tp+rh*(i+.5)+4,fmt(v,''),{a:'middle',c:'rs-v',s:'pointer-events:none;'+(f>.55?'fill:#fff':'')})})});
 return{svg:svg(W,Tp+rh*rows.length+6,o),leg:[],multi:false}}

function treemap(el,sp,H){var W=el.clientWidth,v=sp.series[0].values,lab=sp.labels,hid=el._h||{},it=lab.map(function(l,i){return{n:l,v:hid[i]?0:v[i],c:PAL[i%PAL.length]}}).filter(function(x){return x.v>0}).sort(function(a,b){return b.v-a.v}),tot=it.reduce(function(s,x){return s+x.v},0)||1,o='';
 (function lay(items,x,y,w,h){if(!items.length)return;if(items.length===1){items[0].r=[x,y,w,h];return}var sum=items.reduce(function(s,q){return s+q.v},0),acc=0,k=0;while(k<items.length-1&&acc+items[k].v<sum/2)acc+=items[k++].v;k=Math.max(1,k);
  var a=items.slice(0,k),b=items.slice(k),sa=a.reduce(function(s,q){return s+q.v},0)/sum;if(w>=h){lay(a,x,y,w*sa,h);lay(b,x+w*sa,y,w*(1-sa),h)}else{lay(a,x,y,w,h*sa);lay(b,x,y+h*sa,w,h*(1-sa))}})(it,0,0,W,H);
 it.forEach(function(q,i){var r=q.r;o+='<rect class="rs-slice" style="--i:'+i+'" x="'+(r[0]+1.5)+'" y="'+(r[1]+1.5)+'" width="'+Math.max(r[2]-3,1)+'" height="'+Math.max(r[3]-3,1)+'" rx="6" fill="'+q.c+'" fill-opacity=".9"'+tip('**'+esc(q.n)+'**\n'+fmt(q.v,sp.unit)+' · '+fmt(q.v/tot*100,'%'))+'/>';
  if(r[2]>70&&r[3]>34)o+=T(r[0]+10,r[1]+22,cut(q.n,Math.floor(r[2]/7.2)),{c:'rs-v',s:'fill:#fff;pointer-events:none'})+T(r[0]+10,r[1]+38,fmt(q.v,sp.unit)+' · '+fmt(q.v/tot*100,'%'),{s:'fill:#fff;opacity:.9;pointer-events:none'})});
 return{svg:svg(W,H,o),leg:lab.map(function(l,i){return{n:l,c:PAL[i%PAL.length]}}),multi:true}}

/* ───── tiempo ───── */
function range(ev){var a=Math.min.apply(null,ev.map(function(e){return dt(e.start)})),b=Math.max.apply(null,ev.map(function(e){return dt(e.end||e.start)})),pad=Math.max((b-a)*.04,864e5*2);return[a-pad,b+pad]}
function mticks(a,b){var d=new Date(a),r=[],x=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);while(x<b){r.push(x);var e=new Date(x);x=Date.UTC(e.getUTCFullYear(),e.getUTCMonth()+1,1)}return r}
function gantt(el,sp,H){var W=el.clientWidth,ev=sp.events,r=range(ev),L=Math.min(210,Math.max.apply(null,ev.map(function(e){return Math.min(e.label.length,28)}))*6.4+14),Tp=28,rh=Math.min(38,(H-Tp)/ev.length),X=function(t){return L+(t-r[0])/(r[1]-r[0])*(W-L-12)},o='',now=Date.now();
 mticks(r[0],r[1]).forEach(function(t){var d=new Date(t);o+='<line class="rs-grid" x1="'+X(t)+'" x2="'+X(t)+'" y1="'+Tp+'" y2="'+(Tp+rh*ev.length)+'"/>'+(X(t)>W-90?T(X(t)-4,18,MES[d.getUTCMonth()]+' '+d.getUTCFullYear(),{a:'end'}):T(X(t)+4,18,MES[d.getUTCMonth()]+' '+d.getUTCFullYear(),{}))});
 ev.forEach(function(e,i){var a=dt(e.start),b=dt(e.end)+864e5,y=Tp+rh*i,c=col(e.color,i),w=Math.max(X(b)-X(a),4),dn=e.done==null?0:Math.min(100,e.done);
  o+=T(L-8,y+rh/2+4,cut(e.label,28),{a:'end'})+'<rect class="rs-barh" style="--i:'+i+'" x="'+X(a)+'" y="'+(y+rh*.2)+'" width="'+w+'" height="'+rh*.6+'" rx="5" fill="'+c+'" fill-opacity="'+(e.done==null?1:.3)+'"'+tip('**'+esc(e.label)+'**\n'+dstr(a)+' → '+dstr(b-864e5)+(e.done!=null?'\nAvance: '+fmt(dn,'%'):'')+(e.text?'\n'+esc(e.text):''))+'/>';
  if(e.done!=null)o+='<rect class="rs-barh" style="--i:'+i+';pointer-events:none" x="'+X(a)+'" y="'+(y+rh*.2)+'" width="'+w*dn/100+'" height="'+rh*.6+'" rx="5" fill="'+c+'"/>'+(w>40?T(X(a)+w/2,y+rh/2+4,fmt(dn,'%'),{a:'middle',c:'rs-v',s:'fill:#fff;pointer-events:none'}):'')});
 if(now>r[0]&&now<r[1])o+='<line x1="'+X(now)+'" x2="'+X(now)+'" y1="'+(Tp-6)+'" y2="'+(Tp+rh*ev.length)+'" stroke="var(--red)" stroke-width="2" stroke-dasharray="5 4"/>'+T(X(now)+4,Tp-10,'Hoy',{s:'fill:var(--red);font-weight:700'});
 return{svg:svg(W,Tp+rh*ev.length+8,o),leg:[],multi:false}}

function timeline(el,sp,H){var W=el.clientWidth,ev=sp.events.slice().sort(function(a,b){return dt(a.start)-dt(b.start)}),r=range(ev),M=24,X=function(t){return M+(t-r[0])/(r[1]-r[0])*(W-2*M)},cy=H/2,o='',now=Date.now(),lastEnd=[-1e9,-1e9];
 o+='<line x1="'+M+'" x2="'+(W-M)+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--border)" stroke-width="4" stroke-linecap="round"/>';
 mticks(r[0],r[1]).forEach(function(t){var d=new Date(t);o+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(cy-5)+'" y2="'+(cy+5)+'" stroke="var(--muted)" stroke-opacity=".6"/>'+T(X(t),cy+20,MES[d.getUTCMonth()]+(d.getUTCMonth()===0?' '+d.getUTCFullYear():''),{a:'middle',s:'font-size:10px;opacity:.75'})});
 var up=true;ev.forEach(function(e,i){var a=dt(e.start),b=e.end?dt(e.end):a,c=col(e.color,i),side=(i%2===0)?-1:1,lane=Math.floor(i/2)%3,len=44+lane*34,x=X(a),y=cy+side*len,bw=150,tx=Math.max(M,Math.min(W-M-bw,x-bw/2));
  if(e.end&&b>a)o+='<rect class="rs-barh" style="--i:'+i+'" x="'+x+'" y="'+(cy-6)+'" width="'+Math.max(X(b)-x,6)+'" height="12" rx="6" fill="'+c+'"/>';
  o+='<line x1="'+x+'" x2="'+x+'" y1="'+cy+'" y2="'+y+'" stroke="'+c+'" stroke-width="2"/><circle class="rs-pop" style="--i:'+i+'" cx="'+x+'" cy="'+cy+'" r="8" fill="'+c+'" stroke="var(--card,#fff)" stroke-width="3"'+tip('**'+esc(e.label)+'**\n'+dstr(a)+(e.end?' → '+dstr(b):'')+(e.text?'\n'+esc(e.text):''))+'/>';
  o+='<g class="rs-fade" style="--i:'+i+'"><rect x="'+tx+'" y="'+(side<0?y-40:y)+'" width="'+bw+'" height="40" rx="8" fill="var(--card,#fff)" stroke="'+c+'" stroke-width="1.5"/>'+T(tx+8,(side<0?y-40:y)+16,cut(e.label,24),{c:'rs-v'})+T(tx+8,(side<0?y-40:y)+31,dstr(a)+(e.end?' → '+dstr(b):''),{s:'font-size:10.5px'})+'</g>'});
 if(now>r[0]&&now<r[1])o+='<line x1="'+X(now)+'" x2="'+X(now)+'" y1="'+(cy-20)+'" y2="'+(cy+20)+'" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 3"/>'+T(X(now),cy+34,'Hoy',{a:'middle',s:'fill:var(--red);font-weight:700'});
 return{svg:svg(W,H,o),leg:[],multi:false}}

/* ───── tipos adicionales ───── */
function hstacked(el,sp,H){var W=el.clientWidth,u=sp.unit,hid=el._h||{},lab=sp.labels,S=sp.series.map(function(s,i){return{n:s.name,c:col(s.color,i),v:s.values,off:!!hid[i]}}),vis=S.filter(function(s){return!s.off}),tot=lab.map(function(_,i){return vis.reduce(function(m,s){return m+(s.v[i]||0)},0)}),mx=Math.max.apply(null,tot.concat(1)),tk=ticks(0,mx,5);mx=tk[tk.length-1];
 var L=Math.min(200,Math.max.apply(null,lab.map(function(s){return Math.min(s.length,26)}))*6.4+14),R=20,Tp=8,B=26,slot=(H-Tp-B)/lab.length,bh=Math.min(slot*.7,38),X=function(v){return L+v/mx*(W-L-R)},o='';
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+X(t)+'" x2="'+X(t)+'" y1="'+Tp+'" y2="'+(H-B)+'"/>'+T(X(t),H-8,fmt(t,u),{a:'middle'})});
 lab.forEach(function(l,i){var cy=Tp+slot*(i+.5),acc=0;o+=T(L-8,cy+4,cut(l,26),{a:'end'});vis.forEach(function(s){var v=s.v[i]||0;o+='<rect class="rs-barh" style="--i:'+i+'" x="'+X(acc)+'" y="'+(cy-bh/2)+'" width="'+Math.max(X(v)-L,0)+'" height="'+bh+'" fill="'+s.c+'" stroke="var(--card,#fff)"'+tip('**'+esc(s.n)+'** · '+esc(l)+'\n'+fmt(v,u))+'/>'+(sp.show_values&&X(v)-L>26?T(X(acc)+(X(v)-L)/2,cy+4,fmt(v,''),{a:'middle',c:'rs-v',s:'fill:#fff;pointer-events:none'}):'');acc+=v})});
 return{svg:svg(W,H,o),leg:S.map(function(s){return{n:s.n,c:s.c}}),multi:S.length>1}}

function pareto(el,sp,H){var W=el.clientWidth,u=sp.unit,s0=sp.series[0],it=sp.labels.map(function(l,i){return{l:l,v:s0.values[i]||0}}).sort(function(a,b){return b.v-a.v}),tot=it.reduce(function(m,x){return m+x.v},0)||1,tk=ticks(0,it[0]?it[0].v:1,5),mx=tk[tk.length-1],
 L=Math.max(40,fmt(mx,u).length*6.6+14),R=44,Tp=14,B=44,slot=(W-L-R)/it.length,Y=function(v){return Tp+(H-Tp-B)*(1-v/mx)},Yp=function(p){return Tp+(H-Tp-B)*(1-p/100)},o='',cum=0,pts=[];
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'"/>'+T(L-8,Y(t)+4,fmt(t,''),{a:'end'})});[0,25,50,75,100].forEach(function(p){o+=T(W-R+8,Yp(p)+4,p+'%',{})});
 o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Yp(80)+'" y2="'+Yp(80)+'" stroke="var(--red)" stroke-dasharray="5 4" stroke-opacity=".7"/>'+T(W-R-4,Yp(80)-5,'80 %',{a:'end',s:'fill:var(--red)'});
 it.forEach(function(x,i){var cx=L+slot*(i+.5),w=Math.min(slot*.7,56);cum+=x.v;var p=cum/tot*100;pts.push([cx,Yp(p),p]);
  o+='<rect class="rs-bar" style="--i:'+i+'" x="'+(cx-w/2)+'" y="'+Y(x.v)+'" width="'+w+'" height="'+(Y(0)-Y(x.v))+'" rx="3" fill="var(--blue)"'+tip('**'+esc(x.l)+'**\n'+fmt(x.v,u)+' · '+fmt(x.v/tot*100,'%')+'\nAcumulado: '+fmt(p,'%'))+'/>'+T(cx,H-B+16,cut(x.l,Math.max(4,Math.floor(slot/6.2))),{a:'middle'})});
 o+='<path class="rs-line" pathLength="1" d="'+pts.map(function(q,i){return(i?'L':'M')+q[0]+' '+q[1]}).join('')+'" fill="none" stroke="var(--org,#E8730C)" stroke-width="2.6"/>'+pts.map(function(q){return'<circle class="rs-pop" cx="'+q[0]+'" cy="'+q[1]+'" r="4" fill="var(--org,#E8730C)"/>'}).join('');
 return{svg:svg(W,H,o),leg:[{n:'Valor',c:'var(--blue)'},{n:'% acumulado',c:'var(--org,#E8730C)'}],multi:true}}

function histogram(el,sp,H){var W=el.clientWidth,v=sp.series[0].values.slice().sort(function(a,b){return a-b}),n=v.length,mn=v[0],mx=v[n-1],k=sp.bins||Math.max(3,Math.min(20,Math.ceil(Math.log2(n)+1))),w=(mx-mn)/k||1,c=[],i;
 for(i=0;i<k;i++)c.push(0);v.forEach(function(x){c[Math.min(k-1,Math.floor((x-mn)/w))]++});
 var tk=ticks(0,Math.max.apply(null,c),5),top=tk[tk.length-1],L=40,R=14,Tp=40,B=40,sw=(W-L-R)/k,Y=function(q){return Tp+(H-Tp-B)*(1-q/top)},X=function(x){return L+(x-mn)/(w*k)*(W-L-R)},o='',mean=v.reduce(function(a,b){return a+b},0)/n,med=n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'"/>'+T(L-8,Y(t)+4,fmt(t,''),{a:'end'})});
 c.forEach(function(q,i){o+='<rect class="rs-bar" style="--i:'+i+'" x="'+(L+sw*i+1)+'" y="'+Y(q)+'" width="'+(sw-2)+'" height="'+(Y(0)-Y(q))+'" rx="3" fill="var(--blue)"'+tip('**'+fmt(mn+w*i,sp.unit)+' – '+fmt(mn+w*(i+1),sp.unit)+'**\n'+q+' datos')+'/>'+(sp.show_values&&q?T(L+sw*(i+.5),Y(q)-5,String(q),{a:'middle',c:'rs-v'}):'')+(i%Math.ceil(k/10)===0?T(L+sw*i,H-B+16,fmt(mn+w*i,''),{a:'middle'}):'')});
 o+=T(W-R,H-B+16,fmt(mx,''),{a:'end'});
 [[mean,'media','var(--red)',0],[med,'mediana','var(--green2,#2E7D32)',1]].forEach(function(m){o+='<line x1="'+X(m[0])+'" x2="'+X(m[0])+'" y1="'+(Tp-26)+'" y2="'+(H-B)+'" stroke="'+m[2]+'" stroke-width="2" stroke-dasharray="5 4"/>'+T(X(m[0])+(m[3]?-4:4),Tp-22+m[3]*14,m[1]+' '+fmt(m[0],sp.unit),{a:m[3]?'end':'start',s:'fill:'+m[2]+';font-weight:700'})});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function pyramid(el,sp,H){var W=el.clientWidth,lab=sp.labels,A=sp.series[0],B2=sp.series[1],u=sp.unit,mx=ticks(0,Math.max.apply(null,A.values.concat(B2.values,[1])),4),top=mx[mx.length-1],cg=70,M=20,hw=(W-cg-2*M)/2,Tp=8,Bt=28,slot=(H-Tp-Bt)/lab.length,bh=Math.min(slot*.78,30),o='',ca=col(A.color,0),cb=col(B2.color,1);
 mx.forEach(function(t){var xl=M+hw-t/top*hw,xr=M+hw+cg+t/top*hw;o+='<line class="rs-grid" x1="'+xl+'" x2="'+xl+'" y1="'+Tp+'" y2="'+(H-Bt)+'"/><line class="rs-grid" x1="'+xr+'" x2="'+xr+'" y1="'+Tp+'" y2="'+(H-Bt)+'"/>'+T(xl,H-10,fmt(t,''),{a:'middle'})+T(xr,H-10,fmt(t,''),{a:'middle'})});
 lab.forEach(function(l,i){var cy=Tp+slot*(i+.5),a=A.values[i]||0,b=B2.values[i]||0,wa=a/top*hw,wb=b/top*hw;
  o+=T(M+hw+cg/2,cy+4,cut(l,12),{a:'middle'})+'<rect class="rs-barh" style="--i:'+i+';transform-origin:100% 50%" x="'+(M+hw-wa)+'" y="'+(cy-bh/2)+'" width="'+wa+'" height="'+bh+'" rx="3" fill="'+ca+'"'+tip('**'+esc(A.name)+'** · '+esc(l)+'\n'+fmt(a,u))+'/><rect class="rs-barh" style="--i:'+i+'" x="'+(M+hw+cg)+'" y="'+(cy-bh/2)+'" width="'+wb+'" height="'+bh+'" rx="3" fill="'+cb+'"'+tip('**'+esc(B2.name)+'** · '+esc(l)+'\n'+fmt(b,u))+'/>'+(sp.show_values?T(M+hw-wa-5,cy+4,fmt(a,''),{a:'end',c:'rs-v'})+T(M+hw+cg+wb+5,cy+4,fmt(b,''),{c:'rs-v'}):'')});
 return{svg:svg(W,H,o),leg:[{n:A.name,c:ca},{n:B2.name,c:cb}],multi:true}}

function rose(el,sp,H){var W=el.clientWidth,s0=sp.series[0],lab=sp.labels,n=lab.length,hid=el._h||{},cx=W/2,cy=H/2,R=Math.min(W*.4,H/2-24),mx=Math.max.apply(null,s0.values.concat(1)),o='',g;
 for(g=1;g<=4;g++)o+='<circle class="rs-grid" cx="'+cx+'" cy="'+cy+'" r="'+R*g/4+'" fill="none"/>';
 lab.forEach(function(l,i){if(hid[i])return;var a0=-Math.PI/2+i/n*Math.PI*2,a1=-Math.PI/2+(i+1)/n*Math.PI*2,r=Math.sqrt((s0.values[i]||0)/mx)*R,c=PAL[i%PAL.length];
  o+='<path class="rs-slice" style="--i:'+i+'" d="'+arc(cx,cy,0,r,a0,a1)+'" fill="'+c+'" fill-opacity=".85" stroke="var(--card,#fff)" stroke-width="1.5"'+tip('**'+esc(l)+'**\n'+fmt(s0.values[i],sp.unit))+'/>';
  var am=(a0+a1)/2;o+=T(cx+Math.cos(am)*(R+14),cy+Math.sin(am)*(R+14)+4,cut(l,14),{a:Math.cos(am)<-.2?'end':Math.cos(am)>.2?'start':'middle'})});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function alloc(vals,total){var s=vals.reduce(function(a,b){return a+Math.max(0,b)},0)||1,raw=vals.map(function(v){return Math.max(0,v)/s*total}),fl=raw.map(Math.floor),rem=total-fl.reduce(function(a,b){return a+b},0),ord=raw.map(function(r,i){return[r-fl[i],i]}).sort(function(a,b){return b[0]-a[0]});
 for(var i=0;i<rem;i++)fl[ord[i][1]]++;return fl}
function waffle(el,sp,H,person){var W=el.clientWidth,s0=sp.series[0],lab=sp.labels,hid=el._h||{},vals=s0.values.map(function(v,i){return hid[i]?0:v}),cnt=alloc(vals,100),sum=vals.reduce(function(a,b){return a+b},0)||1,cs=Math.min((H-20)/10,(W*.5)/10,44),gx=Math.max(12,(W-(W>520?cs*10+260:cs*10))/2),o='',k=0,ci=[];
 cnt.forEach(function(c,i){for(var j=0;j<c;j++)ci.push(i)});
 for(var r=0;r<10;r++)for(var q=0;q<10;q++){var i=ci[k++];if(i==null)continue;var x=gx+q*cs,y=10+r*cs,c=PAL[i%PAL.length],t=tip('**'+esc(lab[i])+'**\n'+fmt(s0.values[i],sp.unit)+' · '+fmt(s0.values[i]/sum*100,'%'));
  o+=person?'<g class="rs-pop" style="--i:'+(k%20)+'"'+t+'><circle cx="'+(x+cs/2)+'" cy="'+(y+cs*.24)+'" r="'+cs*.16+'" fill="'+c+'"/><path d="M'+(x+cs*.22)+' '+(y+cs*.9)+'V'+(y+cs*.52)+'a'+cs*.28+' '+cs*.2+' 0 0 1 '+cs*.56+' 0V'+(y+cs*.9)+'Z" fill="'+c+'"/></g>':'<rect class="rs-pop" style="--i:'+(k%20)+'" x="'+(x+2)+'" y="'+(y+2)+'" width="'+(cs-4)+'" height="'+(cs-4)+'" rx="'+cs*.18+'" fill="'+c+'"'+t+'/>'}
 if(W>520){var lx=gx+cs*10+30;lab.forEach(function(l,i){if(hid[i])return;var y=34+i*34,c=PAL[i%PAL.length];o+='<rect x="'+lx+'" y="'+(y-12)+'" width="14" height="14" rx="4" fill="'+c+'"/>'+T(lx+22,y,cut(l,24),{c:'rs-v'})+T(lx+22,y+16,fmt(s0.values[i],sp.unit)+' · '+fmt(vals[i]/sum*100,'%'),{})})}
 return{svg:svg(W,H,o+(person?T(gx,H-2,'Cada ícono ≈ '+fmt(sum/100,sp.unit),{s:'font-size:11px'}):'')),leg:W>520?[]:lab.map(function(l,i){return{n:l,c:PAL[i%PAL.length]}}),multi:true}}

function slope(el,sp,H){var W=el.clientWidth,hid=el._h||{},S=sp.series.map(function(s,i){return{n:s.name,v:s.values,c:s.color&&s.color!=='auto'?col(s.color,i):(good(sp,s.values[1]-s.values[0])?'var(--green2,#2E7D32)':'var(--red)'),off:!!hid[i]}}).filter(function(s){return!s.off}),all=[];S.forEach(function(s){all=all.concat(s.v)});
 var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),L=Math.min(190,W*.3),R=L,Tp=34,B=14,Y=function(v){return Tp+(H-Tp-B)*(1-(v-mn)/((mx-mn)||1))},o=T(L,18,sp.labels[0],{a:'middle',c:'rs-v'})+T(W-R,18,sp.labels[1],{a:'middle',c:'rs-v'})+'<line class="rs-axis" x1="'+L+'" x2="'+L+'" y1="'+Tp+'" y2="'+(H-B)+'"/><line class="rs-axis" x1="'+(W-R)+'" x2="'+(W-R)+'" y1="'+Tp+'" y2="'+(H-B)+'"/>';
 S.forEach(function(s,i){var y0=Y(s.v[0]),y1=Y(s.v[1]);o+='<line class="rs-line" pathLength="1" x1="'+L+'" y1="'+y0+'" x2="'+(W-R)+'" y2="'+y1+'" stroke="'+s.c+'" stroke-width="3" stroke-linecap="round"'+tip('**'+esc(s.n)+'**\n'+fmt(s.v[0],sp.unit)+' → '+fmt(s.v[1],sp.unit)+' ('+(s.v[1]>=s.v[0]?'+':'')+fmt(s.v[1]-s.v[0],sp.unit)+')')+'/><circle cx="'+L+'" cy="'+y0+'" r="5" fill="'+s.c+'"/><circle cx="'+(W-R)+'" cy="'+y1+'" r="5" fill="'+s.c+'"/>'+T(L-10,y0+4,cut(s.n,22)+'  '+fmt(s.v[0],''),{a:'end'})+T(W-R+10,y1+4,fmt(s.v[1],'')+'  '+cut(s.n,22),{})});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function dumbbell(el,sp,H){var W=el.clientWidth,A=sp.series[0],B2=sp.series[1],lab=sp.labels,u=sp.unit,all=A.values.concat(B2.values),tk=ticks(Math.min(0,Math.min.apply(null,all)),Math.max.apply(null,all),5),mn=tk[0],mx=tk[tk.length-1],
 L=Math.min(200,Math.max.apply(null,lab.map(function(s){return Math.min(s.length,26)}))*6.4+14),R=24,Tp=8,B=26,slot=(H-Tp-B)/lab.length,X=function(v){return L+(v-mn)/(mx-mn)*(W-L-R)},o='',ca=col(A.color,0),cb=col(B2.color,1);
 tk.forEach(function(t){o+='<line class="rs-grid" x1="'+X(t)+'" x2="'+X(t)+'" y1="'+Tp+'" y2="'+(H-B)+'"/>'+T(X(t),H-8,fmt(t,u),{a:'middle'})});
 lab.forEach(function(l,i){var cy=Tp+slot*(i+.5),a=A.values[i],b=B2.values[i];o+=T(L-8,cy+4,cut(l,26),{a:'end'})+'<line class="rs-fade" style="--i:'+i+'" x1="'+X(a)+'" x2="'+X(b)+'" y1="'+cy+'" y2="'+cy+'" stroke="'+(good(sp,b-a)?'var(--green2,#2E7D32)':'var(--red)')+'" stroke-width="4" stroke-linecap="round" stroke-opacity=".55"/><circle class="rs-pop" style="--i:'+i+'" cx="'+X(a)+'" cy="'+cy+'" r="7" fill="'+ca+'"'+tip('**'+esc(A.name)+'** · '+esc(l)+'\n'+fmt(a,u))+'/><circle class="rs-pop" style="--i:'+i+'" cx="'+X(b)+'" cy="'+cy+'" r="7" fill="'+cb+'"'+tip('**'+esc(B2.name)+'** · '+esc(l)+'\n'+fmt(b,u)+'\nCambio: '+(b>=a?'+':'')+fmt(b-a,u))+'/>'+(sp.show_values?T(Math.max(X(a),X(b))+12,cy+4,(b>=a?'+':'')+fmt(b-a,''),{c:'rs-v'}):'')});
 return{svg:svg(W,H,o),leg:[{n:A.name,c:ca},{n:B2.name,c:cb}],multi:true}}

function bump(el,sp,H){var W=el.clientWidth,S=sp.series,lab=sp.labels,m=S.length,n=lab.length,hid=el._h||{},rk=S.map(function(){return[]});
 lab.forEach(function(_,j){S.map(function(s,i){return[s.values[j],i]}).sort(function(a,b){return b[0]-a[0]}).forEach(function(p,r){rk[p[1]][j]=r+1})});
 var Lm=Math.min(170,Math.max.apply(null,S.map(function(s){return Math.min(s.name.length,20)}))*6.4+24),Tp=46,B=16,X=function(j){return Lm+(W-2*Lm)*(n>1?j/(n-1):.5)},Y=function(r){return Tp+(H-Tp-B)*((r-1)/Math.max(m-1,1))},o='';
 lab.forEach(function(l,j){o+=T(X(j),20,l,{a:'middle',c:'rs-v'})});
 S.forEach(function(s,i){if(hid[i])return;var c=col(s.color,i),d=rk[i].map(function(r,j){return(j?'L':'M')+X(j)+' '+Y(r)}).join('');
  o+='<path class="rs-line" pathLength="1" d="'+d+'" fill="none" stroke="'+c+'" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" stroke-opacity=".85"/>';
  rk[i].forEach(function(r,j){o+='<circle class="rs-pop" style="--i:'+j+'" cx="'+X(j)+'" cy="'+Y(r)+'" r="12" fill="'+c+'"'+tip('**'+esc(s.name)+'** · '+esc(lab[j])+'\nPuesto '+r+' · '+fmt(s.values[j],sp.unit))+'/>'+T(X(j),Y(r)+4,String(r),{a:'middle',c:'rs-v',s:'fill:#fff;pointer-events:none'})});
  o+=T(Lm-22,Y(rk[i][0])+4,cut(s.name,20),{a:'end',c:'rs-v'})+T(W-Lm+22,Y(rk[i][n-1])+4,cut(s.name,20),{c:'rs-v'})});
 return{svg:svg(W,H,o),leg:[],multi:false}}

function hemicycle(el,sp,H){var W=el.clientWidth,s0=sp.series[0],lab=sp.labels,hid=el._h||{},vals=s0.values.map(function(v,i){return hid[i]?0:Math.round(v)}),tot=vals.reduce(function(a,b){return a+b},0)||1,cx=W/2,R=Math.min(W*.46,H-40),cy=H-26,rows=Math.max(3,Math.round(Math.sqrt(tot)/1.7)),r0=R*.42,rad=[],o='',seats=[],i,j;
 for(i=0;i<rows;i++)rad.push(r0+(R-r0)*(rows>1?i/(rows-1):1));var rs=rad.reduce(function(a,b){return a+b},0),cn=rad.map(function(r){return Math.max(1,Math.round(tot*r/rs))}),diff=tot-cn.reduce(function(a,b){return a+b},0);cn[rows-1]+=diff;
 rad.forEach(function(r,ri){for(j=0;j<cn[ri];j++){var a=Math.PI+(cn[ri]>1?j/(cn[ri]-1):.5)*Math.PI;seats.push([a,cx+Math.cos(a)*r,cy+Math.sin(a)*r])}});
 seats.sort(function(a,b){return a[0]-b[0]});var sr=Math.min((R-r0)/rows*.42,R*Math.PI/Math.max(cn[rows-1],1)*.42,14),k=0;
 vals.forEach(function(v,ci){for(j=0;j<v&&k<seats.length;j++,k++)o+='<circle class="rs-pop" style="--i:'+(k%30)+'" cx="'+seats[k][1]+'" cy="'+seats[k][2]+'" r="'+sr+'" fill="'+PAL[ci%PAL.length]+'"'+tip('**'+esc(lab[ci])+'**\n'+fmt(s0.values[ci],sp.unit)+' · '+fmt(s0.values[ci]/tot*100,'%'))+'/>'});
 o+=T(cx,cy-4,fmt(tot,''),{a:'middle',c:'rs-big'})+T(cx,cy+16,sp.unit||'total',{a:'middle'});
 return{svg:svg(W,H,o),leg:lab.map(function(l,i){return{n:l+' ('+fmt(s0.values[i],'')+')',c:PAL[i%PAL.length]}}),multi:true}}

function good(sp,d){return sp.lower_is_better?d<=0:d>=0}
function kpi(el,sp,H){var u=sp.unit,hid=el._h||{},h='<div class="rs-kpis">';
 sp.series.forEach(function(s,i){if(hid[i])return;var v=s.values,last=v[v.length-1],prev=v.length>1?v[v.length-2]:null,d=prev==null?null:last-prev,pc=prev?d/Math.abs(prev)*100:null,c=col(s.color,i),mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),w=160,hh=38,pts=v.map(function(x,j){return[(v.length>1?j/(v.length-1):.5)*w,hh-3-(x-mn)/((mx-mn)||1)*(hh-8)]});
  h+='<div class="rs-kpi"'+tip('**'+esc(s.name)+'**\n'+(sp.labels.length?sp.labels.map(function(l,j){return esc(l)+': '+fmt(v[j],u)}).join('\n'):v.map(function(x){return fmt(x,u)}).join(' · ')))+'><div class="rs-kn">'+esc(s.name)+'</div><div class="rs-kv" style="color:'+c+'">'+esc(fmt(last,u))+'</div>'+
   (d==null?'':'<div class="rs-kd '+(good(sp,d)?'up':'dn')+'">'+(d>=0?'▲':'▼')+' '+esc(fmt(Math.abs(d),u))+(pc==null?'':' ('+esc(fmt(Math.abs(pc),'%'))+')')+'</div>')+
   '<svg viewBox="0 0 '+w+' '+hh+'" preserveAspectRatio="none"><path class="rs-line" pathLength="1" d="'+pts.map(function(p,j){return(j?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join('')+'" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+pts[pts.length-1][0]+'" cy="'+pts[pts.length-1][1]+'" r="3.5" fill="'+c+'"/></svg></div>'});
 return{svg:h+'</div>',leg:[],multi:false}}

function calendar(el,sp,H){var W=el.clientWidth,D={},mn=1e18,mxd=0,mxv=0;sp.events.forEach(function(e){var t=dt(e.start),v=e.value==null?1:e.value;(D[t]=D[t]||{v:0,l:[]});D[t].v+=v;D[t].l.push(e.label);mn=Math.min(mn,t);mxd=Math.max(mxd,t);mxv=Math.max(mxv,D[t].v)});var m0=new Date(mn),m1=new Date(mxd);mn=Date.UTC(m0.getUTCFullYear(),m0.getUTCMonth(),1);mxd=Date.UTC(m1.getUTCFullYear(),m1.getUTCMonth()+1,0);
 var dow=function(t){return(new Date(t).getUTCDay()+6)%7},st=mn-dow(mn)*864e5,weeks=Math.floor((mxd-st)/864e5/7)+1,L=34,Tp=22,cs=Math.min(34,(W-L-8)/weeks),o='',DN=['Lun','','Mié','','Vie','',''],lastM=-1,w,d;
 DN.forEach(function(n,i){if(n)o+=T(L-6,Tp+i*cs+cs*.7,n,{a:'end'})});
 for(w=0;w<weeks;w++)for(d=0;d<7;d++){var t=st+(w*7+d)*864e5;if(t<mn||t>mxd)continue;var x=D[t],dd=new Date(t),f=x?x.v/mxv:0;
  if(dd.getUTCMonth()!==lastM&&d===0||(lastM===-1&&d===0)){lastM=dd.getUTCMonth();o+=T(L+w*cs,14,MES[lastM],{})}
  o+='<rect class="rs-slice" style="--i:'+(w%15)+';fill:'+(x?'color-mix(in srgb,var(--blue) '+Math.round(25+f*70)+'%,var(--card,#fff))':'var(--border)')+';fill-opacity:'+(x?1:.5)+'" x="'+(L+w*cs+1)+'" y="'+(Tp+d*cs+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3"'+tip('**'+dstr(t)+'**'+(x?'\n'+x.l.map(esc).join('\n'):'\nSin actividad'))+'/>'}
 return{svg:svg(W,Tp+7*cs+6,o),leg:[],multi:false}}

function sankey(el,sp,H){var W=el.clientWidth,lk=sp.links,nm=[],ix={},o='',i;
 lk.forEach(function(l){[l.source,l.target].forEach(function(x){if(ix[x]==null){ix[x]=nm.length;nm.push({n:x,in:0,out:0,d:0,c:PAL[nm.length%PAL.length]})}})});
 lk.forEach(function(l){nm[ix[l.source]].out+=l.value;nm[ix[l.target]].in+=l.value});
 for(i=0;i<=nm.length;i++)lk.forEach(function(l){nm[ix[l.target]].d=Math.max(nm[ix[l.target]].d,nm[ix[l.source]].d+1)});
 var cols=Math.max.apply(null,nm.map(function(x){return x.d}))+1,Lm=130,Rm=130,nw=14,Tp=8,gap=14,cw=(W-Lm-Rm-nw)/Math.max(cols-1,1),by=[];
 for(i=0;i<cols;i++)by.push([]);nm.forEach(function(x){x.v=Math.max(x.in,x.out);by[x.d].push(x)});
 var sc=1e9;by.forEach(function(c){var s=c.reduce(function(a,x){return a+x.v},0);if(s)sc=Math.min(sc,(H-Tp*2-gap*(c.length-1))/s)});
 by.forEach(function(c,ci){var tot=c.reduce(function(a,x){return a+x.v*sc},0)+gap*(c.length-1),y=Tp+(H-Tp*2-tot)/2;c.forEach(function(x){x.x=Lm+ci*cw;x.y=y;x.h=Math.max(x.v*sc,3);x.io=0;x.oo=0;y+=x.h+gap})});
 lk.forEach(function(l,k){var a=nm[ix[l.source]],b=nm[ix[l.target]],t=Math.max(l.value*sc,1.5),y0=a.y+a.oo+t/2,y1=b.y+b.io+t/2,xm=(a.x+nw+b.x)/2;a.oo+=t;b.io+=t;
  o+='<path class="rs-fade" style="--i:'+k+'" d="M'+(a.x+nw)+' '+y0+'C'+xm+' '+y0+' '+xm+' '+y1+' '+b.x+' '+y1+'" fill="none" stroke="'+a.c+'" stroke-opacity=".38" stroke-width="'+t+'"'+tip('**'+esc(l.source)+' → '+esc(l.target)+'**\n'+fmt(l.value,sp.unit))+'/>'});
 nm.forEach(function(x){var last=x.d===0&&cols>1||x.d===cols-1&&cols>1;o+='<rect class="rs-barh" style="transform-origin:50% 0;--i:'+x.d+'" x="'+x.x+'" y="'+x.y+'" width="'+nw+'" height="'+x.h+'" rx="3" fill="'+x.c+'"'+tip('**'+esc(x.n)+'**\n'+fmt(x.v,sp.unit))+'/>'+T(x.d===0&&cols>1?x.x-8:x.x+nw+8,x.y+x.h/2+4,cut(x.n,18)+' · '+fmt(x.v,''),{a:x.d===0&&cols>1?'end':'start',c:'rs-v'})});
 return{svg:svg(W,H,o),leg:[],multi:false}}

var K={step:cart,hstacked:hstacked,pareto:pareto,histogram:histogram,pyramid:pyramid,rose:rose,waffle:function(e,s,h){return waffle(e,s,h,false)},pictogram:function(e,s,h){return waffle(e,s,h,true)},slope:slope,dumbbell:dumbbell,bump:bump,hemicycle:hemicycle,kpi:kpi,calendar:calendar,sankey:sankey,
 bar:cart,stacked:cart,stacked100:cart,line:cart,area:cart,stacked_area:cart,combo:cart,lollipop:cart,hbar:hbar,
 pie:function(e,s,h){return pie(e,s,h,false)},donut:function(e,s,h){return pie(e,s,h,true)},radialbar:radial,gauge:gauge,bullet:bullet,radar:radar,
 scatter:function(e,s,h){return scatter(e,s,h,false)},bubble:function(e,s,h){return scatter(e,s,h,true)},waterfall:waterfall,funnel:funnel,candles:candles,heatmap:heat,treemap:treemap,timeline:timeline,gantt:gantt};

function draw(el){var sp;try{sp=JSON.parse(el.getAttribute('data-spec'))}catch(e){return}
 var W=el.clientWidth;if(!W)return;bind(el);
 var H=sp.height||320;if(sp.kind==='gantt')H=Math.max(H,60+sp.events.length*34);if(sp.kind==='pyramid'||sp.kind==='hstacked')H=Math.max(H,40+sp.labels.length*30);if(sp.kind==='heatmap')H=Math.max(H,40+sp.series.length*34);
 var f=K[sp.kind];if(!f)return;var r;try{r=f(el,sp,H)}catch(e){el.innerHTML='<p style="color:var(--red);font-size:13px">No se pudo dibujar el gráfico: '+esc(e.message)+'</p>';return}
 el.classList.toggle('rs-still',!!el._drawn);el._drawn=1;el._w=W;el.innerHTML=r.svg+((sp.show_legend!==false&&r.leg.length&&(r.multi||r.leg.length>1))?legend(r.leg,el):'')}

function init(){var all=document.querySelectorAll('.rs-chart');all.forEach(function(el){if(el._rs)return;el._rs=1;
  if(window.ResizeObserver){var t;new ResizeObserver(function(){if(el.clientWidth!==el._w){cancelAnimationFrame(t);t=requestAnimationFrame(function(){draw(el)})}}).observe(el)}draw(el)});
 if(!window._rsT){window._rsT=1;new MutationObserver(function(){document.querySelectorAll('.rs-chart').forEach(draw)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})}}
window.RSCharts={init:init,draw:draw};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
