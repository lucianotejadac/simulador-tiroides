/* Simulador de tiroides: carga de las cuatro estaticas, editor de pagina panoramica con mouse,
   ajustes por imagen, flechas de anotacion, exportacion PNG y proyecto. Todo local. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),C=RenalCore;
const W=1132,H=860,MARGEN=24,ARRIBA=64,ABAJO=826,ROTULO=20,ASA=14;
const S={caso:null,archivos:[],ignorados:[],seleccion:null,paleta:'grisInv',infoVista:new Set(),
 pagina:{titulo:'CINTIGRAMA DE TIROIDES',linea:'',pie:'',items:[],anotaciones:[]},serial:0,
 sel:null,herramienta:'mover',flechaTexto:'',ajustados:new Set(),exportado:false,proyectoGuardado:false,paso:0};
let tutorial=null,arrastre=null;
const cache=new Map();
function estado(msg){$('status').textContent=msg;}
/* ---------- archivos ---------- */
function reconocido(d){return d.rec&&(S.caso===null||d.rec.caso===S.caso);}
function porVista(vista){return S.archivos.find(d=>d.vistaNorm===vista&&(S.caso===null||!d.rec||d.rec.caso===S.caso))||null;}
function porHash(h){return S.archivos.find(d=>d.hash===h)||null;}
function normVista(v){const s=String(v||'').trim().toUpperCase();if(/MARCA/.test(s))return 'ANTERIOR MARCA';if(/^ANT/.test(s))return 'ANTERIOR';if(/OAD|RAO/.test(s))return 'OAD';if(/OAI|LAO/.test(s))return 'OAI';return s;}
async function cargar(files){
 let nuevos=0;
 for(const f of files){
  if(/\.(png|pdf|txt|zip|docx?)$/i.test(f.name)){S.ignorados.push(f.name+' (no es DICOM)');continue;}
  try{const d=await C.leer(f);if(S.archivos.some(x=>x.hash===d.hash)){S.ignorados.push(f.name+' (copia repetida)');continue;}
   d.rec=tiroReconocer(d.hash);d.vistaNorm=d.rec?d.rec.vista:normVista(d.detectores[0]?.vista);S.archivos.push(d);nuevos++;
  }catch(e){S.ignorados.push(f.name+' ('+e.message+')');}
 }
 if(S.caso===null){const r=S.archivos.find(d=>d.rec);if(r&&tutorial)tutorial.setCaso(r.rec.caso);}
 if(!S.pagina.linea){const n=casoActual(),d=S.archivos[0];if(n)S.pagina.linea='Caso '+n+(d?' · '+fecha(d):'');}
 estado(nuevos?nuevos+' archivo(s) cargado(s).':'No se cargó ningún archivo nuevo.');refrescar();
}
function fecha(d){return d.fecha.replace(/(\d{4})(\d{2})(\d{2})/,'$3-$2-$1');}
function faltantes(){return TIRO_VISTAS.filter(v=>!porVista(v));}
function problemasCarga(){const p=[];for(const d of S.archivos){if(!d.rec)p.push('«'+d.nombre+'» no pertenece a ningún caso de este curso.');else if(S.caso!==null&&d.rec.caso!==S.caso)p.push('«'+d.nombre+'» es del caso '+d.rec.caso+', no del caso '+S.caso+'.');}
 const f=faltantes();if(S.archivos.length&&f.length)p.push('Falta: '+f.map(v=>TIRO_NOMBRE_VISTA[v]).join('; ')+'.');return p;}
function listar(){
 const ul=$('listaArchivos');ul.replaceChildren();
 for(const d of S.archivos){const li=document.createElement('li');li.className=reconocido(d)?'ok':'problema';
  li.append(Object.assign(document.createElement('strong'),{textContent:d.nombre}));li.append(Object.assign(document.createElement('span'),{textContent:TIRO_NOMBRE_VISTA[d.vistaNorm]||d.vistaNorm||'vista sin rótulo'}));
  li.append(Object.assign(document.createElement('span'),{textContent:Math.round(d.duracionMs/1000)+' s · '+Math.round(C.total(d.data)/1000)+' k cuentas'}));
  const est=document.createElement('span');est.className='estado';est.textContent=d.rec?'Caso '+d.rec.caso+' · '+d.rec.vista:'archivo desconocido';li.append(est);
  li.tabIndex=0;li.onclick=()=>{S.seleccion=d;if(d.rec)S.infoVista.add(d.rec.vista);refrescar();};if(S.seleccion===d)li.style.outline='2px solid #000080';ul.append(li);}
 const info=[];if(S.archivos.length)info.push(S.archivos.length+' archivo(s) DICOM.');if(S.ignorados.length)info.push('Omitidos: '+S.ignorados.join('; ')+'.');$('cargaInfo').textContent=info.join(' ')||'Aún no hay archivos.';
 $('infoAdquisicion').hidden=!S.seleccion;if(S.seleccion)tablaInfo(S.seleccion);
}
function tablaInfo(d){
 const filas=[['Tipo de imagen',d.imageType.join(' / ')],['Vista',(d.detectores[0]?.vista||'sin rótulo')+' · detector a '+C.fmt(d.detectores[0]?.angulo||0,1)+'°'],['Matriz',d.cols+' × '+d.rows+' píxeles'],['Píxel',C.fmt(d.pixelMm,2)+' mm · campo '+C.fmt(d.pixelMm*d.cols/10,1)+' cm · zoom de adquisición '+C.fmt(d.detectores[0]?.zoom||1,2)],
  ['Duración',Math.round(d.duracionMs/1000)+' s'],['Cuentas',Math.round(C.total(d.data)/1000)+' k'],['Ventana energética',d.ventanas.map(w=>(w.nombre||'')+' '+C.fmt(w.bajo,1)+'–'+C.fmt(w.alto,1)+' keV').join('; ')||'no consta'],
  ['Radiofármaco',(d.farmaco||'no consta en el DICOM')+(d.dosisMBq?' · '+C.fmt(d.dosisMBq,1)+' MBq':' · dosis no registrada')],['Fecha y hora',fecha(d)+' '+d.hora.replace(/(\d{2})(\d{2})(\d{2}).*/,'$1:$2:$3')],
  ['Paciente',d.paciente.nombre+(d.paciente.edad?' · '+d.paciente.edad:'')+(d.paciente.sexo?' · '+d.paciente.sexo:'')],['Identificación del caso',d.rec?'Caso '+d.rec.caso+' · '+d.rec.vista:'no reconocido']];
 const t=document.createElement('table');t.className='tabla';filas.forEach(([k,v])=>{const tr=document.createElement('tr');const a=document.createElement('td');a.textContent=k;const b=document.createElement('td');b.style.textAlign='left';b.textContent=v;tr.append(a,b);t.append(tr);});$('infoTabla').replaceChildren(t);
}
/* ---------- pagina: items ---------- */
function ranura(i){const w=(W-2*MARGEN-16)/2,h=(ABAJO-ARRIBA-16)/2;return {x:MARGEN+(i%2)*(w+16),y:ARRIBA+Math.floor(i/2)*(h+16),w,h};}
function agregar(vista){
 const d=porVista(vista);if(!d)return null;let it=S.pagina.items.find(i=>i.hash===d.hash);if(it){S.sel={tipo:'item',id:it.id};refrescar();return it;}
 const orden=TIRO_VISTAS.indexOf(vista);let idx=orden>=0&&!S.pagina.items.some(i=>i.ranura===orden)?orden:[0,1,2,3].find(k=>!S.pagina.items.some(i=>i.ranura===k));if(idx===undefined)idx=S.pagina.items.length%4;
 const r=ranura(idx);it={id:++S.serial,hash:d.hash,vista,ranura:idx,x:r.x,y:r.y,w:r.w,h:r.h,rotulo:TIRO_NOMBRE_VISTA[vista]||vista,techo:1,piso:0,zoom:1,panX:0,panY:0};
 S.pagina.items.push(it);S.sel={tipo:'item',id:it.id};S.exportado=false;refrescar();return it;
}
function autoOrden(){S.pagina.items.forEach(it=>{const k=TIRO_VISTAS.indexOf(it.vista);const r=ranura(k>=0?k:0);it.ranura=k;Object.assign(it,r);});S.exportado=false;refrescar();}
function itemSel(){return S.sel&&S.sel.tipo==='item'?S.pagina.items.find(i=>i.id===S.sel.id):null;}
function anotSel(){return S.sel&&S.sel.tipo==='anot'?S.pagina.anotaciones.find(a=>a.id===S.sel.id):null;}
function raster(it){const d=porHash(it.hash);if(!d)return null;const k=[it.hash,it.techo,it.piso,S.paleta].join('|');if(!cache.has(k)){const cv=C.lienzo(d.cols,d.rows);C.pintar(cv,d.frame(0),d.rows,d.cols,{paleta:S.paleta,maxRel:it.techo,minRel:it.piso});if(cache.size>40)cache.delete(cache.keys().next().value);cache.set(k,cv);}return cache.get(k);}
/* Transformacion imagen -> pagina para un item: cuadro interior (sin el rotulo), ajuste cuadrado, zoom y encuadre. */
function geometria(it){const d=porHash(it.hash);const iw=it.w,ih=it.h-ROTULO;const base=Math.min(iw,ih);const esc=base/d.cols*it.zoom;const cx=it.x+iw/2+it.panX,cy=it.y+ih/2+it.panY;return {esc,ox:cx-d.cols*esc/2,oy:cy-d.rows*esc/2,d};}
function imagenAPagina(it,ix,iy){const g=geometria(it);return {x:g.ox+ix*g.esc,y:g.oy+iy*g.esc};}
function paginaAImagen(it,px,py){const g=geometria(it);return {x:(px-g.ox)/g.esc,y:(py-g.oy)/g.esc};}
function dibujar(ctx,exportando){
 ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#000';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.fillText(S.pagina.titulo||'',W/2,34);ctx.font='14px Arial';ctx.textAlign='left';ctx.fillText(S.pagina.linea||'',MARGEN,34);ctx.textAlign='right';ctx.fillText(S.pagina.pie||'',W-MARGEN,H-14);ctx.textAlign='left';
 ctx.fillStyle='#c8c8e8';ctx.fillRect(MARGEN,48,W-2*MARGEN,4);
 for(const it of S.pagina.items){const r=raster(it);if(!r)continue;const g=geometria(it);
  ctx.save();ctx.beginPath();ctx.rect(it.x,it.y,it.w,it.h-ROTULO);ctx.clip();ctx.fillStyle=S.paleta==='grisInv'?'#fff':'#000';ctx.fillRect(it.x,it.y,it.w,it.h-ROTULO);ctx.imageSmoothingEnabled=g.esc<2;ctx.drawImage(r,g.ox,g.oy,g.d.cols*g.esc,g.d.rows*g.esc);ctx.restore();
  ctx.fillStyle='#c8c8e8';ctx.fillRect(it.x,it.y+it.h-ROTULO,it.w,ROTULO);ctx.fillStyle='#000';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText(it.rotulo||'',it.x+it.w/2,it.y+it.h-6);ctx.textAlign='left';
  ctx.strokeStyle='#9a9ac8';ctx.lineWidth=1;ctx.strokeRect(it.x+.5,it.y+.5,it.w-1,it.h-1);
  if(!exportando&&itemSel()===it){ctx.strokeStyle='#d00000';ctx.lineWidth=2;ctx.strokeRect(it.x+1,it.y+1,it.w-2,it.h-2);ctx.fillStyle='#d00000';ctx.fillRect(it.x+it.w-ASA,it.y+it.h-ASA,ASA,ASA);}}
 for(const a of S.pagina.anotaciones){const sel=!exportando&&anotSel()===a;ctx.strokeStyle=sel?'#d00000':'#000';ctx.fillStyle=sel?'#d00000':'#000';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(a.x1,a.y1);ctx.lineTo(a.x2,a.y2);ctx.stroke();const ang=Math.atan2(a.y2-a.y1,a.x2-a.x1);ctx.beginPath();ctx.moveTo(a.x2,a.y2);ctx.lineTo(a.x2-12*Math.cos(ang-.4),a.y2-12*Math.sin(ang-.4));ctx.lineTo(a.x2-12*Math.cos(ang+.4),a.y2-12*Math.sin(ang+.4));ctx.closePath();ctx.fill();
  ctx.font='13px Arial';const tw=ctx.measureText(a.texto||'').width;const tx=a.x1<a.x2?a.x1-tw-6:a.x1+6;ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(tx-3,a.y1-13,tw+6,17);ctx.fillStyle=sel?'#d00000':'#000';ctx.fillText(a.texto||'',tx,a.y1);}
 if(arrastre&&arrastre.tipo==='flecha'){ctx.strokeStyle='#c000c0';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(arrastre.x1,arrastre.y1);ctx.lineTo(arrastre.x2,arrastre.y2);ctx.stroke();ctx.setLineDash([]);}
 ctx.restore();
}
function repintar(){for(const id of ['pagina','pagina2']){const cv=$(id);if(!cv)continue;const ctx=cv.getContext('2d');dibujar(ctx,false);cv.classList.toggle('flecha',S.herramienta==='flecha');}}
/* ---------- mouse ---------- */
function coord(cv,e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function golpe(p){
 const a=[...S.pagina.anotaciones].reverse().find(a=>{const d=distSeg(p,a);return d<8||(Math.hypot(p.x-a.x1,p.y-a.y1)<40&&Math.abs(p.y-a.y1)<14);});if(a)return {tipo:'anot',obj:a};
 const items=[...S.pagina.items].reverse();const it=items.find(i=>p.x>=i.x&&p.x<=i.x+i.w&&p.y>=i.y&&p.y<=i.y+i.h);if(it)return {tipo:'item',obj:it,asa:p.x>=it.x+it.w-ASA&&p.y>=it.y+it.h-ASA};return null;
}
function distSeg(p,a){const dx=a.x2-a.x1,dy=a.y2-a.y1;const l2=dx*dx+dy*dy||1;let t=((p.x-a.x1)*dx+(p.y-a.y1)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x1+t*dx),p.y-(a.y1+t*dy));}
function enlazarMouse(cv){
 cv.onpointerdown=e=>{const p=coord(cv,e);try{cv.setPointerCapture(e.pointerId);}catch(err){}
  if(S.herramienta==='flecha'){arrastre={tipo:'flecha',x1:p.x,y1:p.y,x2:p.x,y2:p.y};return;}
  const g=golpe(p);if(!g){S.sel=null;refrescarPanel();repintar();return;}
  S.sel={tipo:g.tipo,id:g.obj.id};S.pagina.items.sort((a,b)=>(a===g.obj)-(b===g.obj));
  arrastre=g.tipo==='item'?{tipo:g.asa?'tamano':'mover',obj:g.obj,dx:p.x-g.obj.x,dy:p.y-g.obj.y,w0:g.obj.w,h0:g.obj.h,px:p.x,py:p.y}:{tipo:'moverAnot',obj:g.obj,px:p.x,py:p.y};
  cv.classList.add('arrastrando');refrescarPanel();repintar();};
 cv.onpointermove=e=>{if(!arrastre)return;const p=coord(cv,e);
  if(arrastre.tipo==='flecha'){arrastre.x2=p.x;arrastre.y2=p.y;}
  else if(arrastre.tipo==='mover'){const it=arrastre.obj;it.x=Math.max(0,Math.min(W-it.w,p.x-arrastre.dx));it.y=Math.max(ARRIBA-10,Math.min(H-it.h,p.y-arrastre.dy));it.ranura=-1;}
  else if(arrastre.tipo==='tamano'){const it=arrastre.obj;it.w=Math.max(120,Math.min(W-it.x,arrastre.w0+p.x-arrastre.px));it.h=Math.max(120,Math.min(H-it.y,arrastre.h0+p.y-arrastre.py));it.ranura=-1;}
  else if(arrastre.tipo==='moverAnot'){const a=arrastre.obj;const dx=p.x-arrastre.px,dy=p.y-arrastre.py;a.x1+=dx;a.y1+=dy;a.x2+=dx;a.y2+=dy;arrastre.px=p.x;arrastre.py=p.y;}
  S.exportado=false;repintar();};
 cv.onpointerup=e=>{if(!arrastre)return;cv.classList.remove('arrastrando');
  if(arrastre.tipo==='flecha'){const a=arrastre;arrastre=null;if(Math.hypot(a.x2-a.x1,a.y2-a.y1)>=10){agregarFlecha(a.x1,a.y1,a.x2,a.y2,S.flechaTexto||$('flechaTexto').value||'');}else{repintar();}return;}
  arrastre=null;refrescar();};
 cv.onpointercancel=()=>{arrastre=null;repintar();};
}
function agregarFlecha(x1,y1,x2,y2,texto){const a={id:++S.serial,x1,y1,x2,y2,texto:texto||''};S.pagina.anotaciones.push(a);S.sel={tipo:'anot',id:a.id};S.exportado=false;estado(texto?'Flecha «'+texto+'» agregada.':'Flecha agregada sin texto: escribe el texto en el panel y quedará en la flecha seleccionada.');refrescar();return a;}
/* ---------- marcas: deteccion automatica para comprobar las flechas ---------- */
let marcasCache=null;
function detectarMarcas(){
 const m=porVista('ANTERIOR MARCA'),a=porVista('ANTERIOR');if(!m)return [];if(marcasCache&&marcasCache.k===m.hash)return marcasCache.v;
 const rows=m.rows,cols=m.cols,im=m.frame(0);const dif=new Float32Array(rows*cols);
 if(a&&a.rows===rows&&a.cols===cols){const ia=a.frame(0),f=C.total(im)/(C.total(ia)||1);for(let i=0;i<dif.length;i++)dif[i]=Math.max(0,im[i]-ia[i]*f);}else dif.set(im);
 const s=C.suavizar(dif,rows,cols,1);
 // Candidatos: maximos locales separados. Una fuente puntual es compacta: su pico supera con
 // holgura la media de un anillo de 5 a 8 pixeles alrededor. La tiroides y las salivales no.
 const cand=[];
 for(let k=0;k<12;k++){let mejor=-1,mv=0;for(let i=0;i<s.length;i++){if(s[i]<=mv)continue;const x=i%cols,y=(i-x)/cols;if(cand.some(p=>Math.hypot(p.x-x,p.y-y)<12))continue;mv=s[i];mejor=i;}if(mejor<0||mv<=0)break;const x=mejor%cols,y=(mejor-x)/cols;
  let suma=0,n=0;for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const r=Math.hypot(dx,dy);if(r<5||r>8)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;suma+=s[yy*cols+xx];n++;}
  const anillo=n?suma/n:0;cand.push({x,y,valor:mv,compacidad:mv>0?1-anillo/mv:0});}
 // Puede haber una marca o dos: la segunda solo cuenta si es compacta y no muy tenue frente a la primera.
 // Umbral de compacidad 0,65: los residuos de la tiroides quedan entre 0,4 y 0,62; las fuentes
 // puntuales, entre 0,67 y 0,94 en los diez casos. La segunda marca puede ser tenue (15 % de la
 // primera) pero tiene que superar el ruido.
 const compactos=cand.filter(p=>p.compacidad>=.65).sort((p,q)=>q.valor-p.valor);
 const elegidas=compactos.slice(0,1);const segunda=compactos.slice(1).find(p=>p.valor>=.15*compactos[0].valor&&p.valor>=12);if(segunda)elegidas.push(segunda);
 // El nombre sale de la posicion respecto de la glandula: por encima, menton; por debajo, horquilla.
 let cy=rows/2;if(a){const ia=a.frame(0);let mx=0;for(let i=0;i<ia.length;i++)if(ia[i]>mx)mx=ia[i];let sy=0,sw=0;for(let i=0;i<ia.length;i++)if(ia[i]>.5*mx){const y=(i-i%cols)/cols;sy+=y*ia[i];sw+=ia[i];}if(sw)cy=sy/sw;}
 const v=elegidas.sort((p,q)=>p.y-q.y).map(p=>({...p,nombre:p.y<cy?'mentón':'horquilla esternal'}));
 if(v.length===2&&v[0].nombre===v[1].nombre){v[0].nombre='mentón';v[1].nombre='horquilla esternal';}
 marcasCache={k:m.hash,v,cand};return v;
}
function flechasSobreMarcas(){
 const it=S.pagina.items.find(i=>i.vista==='ANTERIOR MARCA');const marcas=detectarMarcas();if(!it||!marcas.length)return {ok:false,problemas:[it?'No se detectaron las marcas en la imagen.':'La anterior con marcas no está en la página.'],detalle:[]};
 const p=[],detalle=[],usadas=new Set();
 for(const m of marcas){const q=imagenAPagina(it,m.x,m.y);if(q.x<it.x||q.x>it.x+it.w||q.y<it.y||q.y>it.y+it.h-ROTULO)p.push('La marca del '+m.nombre+' queda fuera del encuadre de la anterior con marcas: baja el zoom o mueve la imagen hasta que se vea.');}
 for(const a of S.pagina.anotaciones){const q=paginaAImagen(it,a.x2,a.y2);const cerca=marcas.map((m,i)=>({i,m,d:Math.hypot(q.x-m.x,q.y-m.y)})).sort((u,v)=>u.d-v.d)[0];
  if(!cerca||cerca.d>10)continue;// flecha que no apunta a una marca: se ignora aqui
  const t=(a.texto||'').toLowerCase();const dice=cerca.m.nombre==='mentón'?/ment/.test(t):/horq|estern|yugul|supraest/.test(t);
  if(!t)p.push('La flecha sobre la marca del '+cerca.m.nombre+' no tiene texto.');else if(!dice)p.push('La flecha sobre la marca del '+cerca.m.nombre+' dice «'+a.texto+'». Revisa cuál marca es cuál: la superior es el mentón y la inferior la horquilla esternal.');
  else{usadas.add(cerca.i);detalle.push(a.texto);}}
 for(const [i,m] of marcas.entries())if(!usadas.has(i))p.push('Falta señalar la marca del '+m.nombre+' con una flecha y su texto.');
 return {ok:usadas.size===marcas.length&&!p.length,problemas:p,detalle};
}
/* ---------- comprobaciones de composicion ---------- */
function vistasEnPagina(){return S.pagina.items.map(i=>i.vista);}
function ordenCorrecto(){
 const p=[];const its=S.pagina.items;if(its.length<4)return p;
 const centro=it=>({x:it.x+it.w/2,y:it.y+it.h/2});const esperado={'ANTERIOR':[0,0],'ANTERIOR MARCA':[1,0],'OAD':[0,1],'OAI':[1,1]};
 for(const it of its){const c=centro(it);const col=c.x<W/2?0:1,fila=c.y<(ARRIBA+ABAJO)/2?0:1;const e=esperado[it.vista];if(e&&(e[0]!==col||e[1]!==fila))p.push('«'+it.rotulo+'» está '+(fila?'abajo':'arriba')+' a la '+(col?'derecha':'izquierda')+'; el equipo la pone '+(e[1]?'abajo':'arriba')+' a la '+(e[0]?'derecha':'izquierda')+'.');}
 for(let i=0;i<its.length;i++)for(let j=i+1;j<its.length;j++){const a=its[i],b=its[j];if(a.x<b.x+b.w-4&&b.x<a.x+a.w-4&&a.y<b.y+b.h-4&&b.y<a.y+a.h-4)p.push('«'+a.rotulo+'» y «'+b.rotulo+'» se superponen.');}
 return p;
}
function problemasComposicion(){const p=[];const v=vistasEnPagina();for(const vista of TIRO_VISTAS)if(!v.includes(vista))p.push('Falta poner en la página: '+TIRO_NOMBRE_VISTA[vista]+'.');const dup=v.filter((x,i)=>v.indexOf(x)!==i);if(dup.length)p.push('Hay imágenes repetidas en la página.');return p.concat(ordenCorrecto());}
function problemasAjuste(){const p=[];for(const it of S.pagina.items){if(!it.rotulo.trim())p.push('Una imagen quedó sin rótulo.');if(!S.ajustados.has(it.id))p.push('Aún no ajustaste techo, piso, zoom o encuadre de «'+it.rotulo+'».');}return p;}
/* ---------- paneles ---------- */
function refrescarPanel(){
 const it=itemSel();$('panelItem').hidden=!it||S.paso===0||S.paso===3;
 if(it){$('itemNombre').textContent=TIRO_NOMBRE_VISTA[it.vista]||it.vista;$('itemRotulo').value=it.rotulo;$('itemTecho').value=Math.round(it.techo*100);$('itemTechoValor').textContent=Math.round(it.techo*100)+' %';$('itemPiso').value=Math.round(it.piso*100);$('itemPisoValor').textContent=Math.round(it.piso*100)+' %';$('itemZoom').value=Math.round(it.zoom*100);$('itemZoomValor').textContent=C.fmt(it.zoom,1)+'×';}
 $('herrMover').setAttribute('aria-pressed',String(S.herramienta==='mover'));$('herrFlecha').setAttribute('aria-pressed',String(S.herramienta==='flecha'));
 const ul=$('listaAnotaciones');ul.replaceChildren();for(const a of S.pagina.anotaciones){const li=document.createElement('li');if(anotSel()===a)li.className='sel';const txt=document.createElement('input');txt.type='text';txt.value=a.texto;txt.maxLength=40;txt.placeholder='texto de la flecha';txt.oninput=()=>{a.texto=txt.value;S.exportado=false;repintar();};txt.onchange=()=>refrescar();const b=document.createElement('button');b.textContent='✕';b.title='Borrar flecha';b.onclick=()=>{S.pagina.anotaciones=S.pagina.anotaciones.filter(x=>x!==a);if(anotSel()===a)S.sel=null;S.exportado=false;refrescar();};li.append(txt,b);li.onclick=e=>{if(e.target===li){S.sel={tipo:'anot',id:a.id};refrescar();}};ul.append(li);}
}
function bandeja(){
 const host=$('bandeja');host.replaceChildren();
 for(const vista of TIRO_VISTAS){const d=porVista(vista);if(!d)continue;const b=document.createElement('button');b.type='button';const enPag=S.pagina.items.some(i=>i.hash===d.hash);b.className=enPag?'enPagina':'';
  const cv=document.createElement('canvas');C.pintar(cv,d.frame(0),d.rows,d.cols,{paleta:S.paleta});b.append(cv,Object.assign(document.createElement('span'),{textContent:TIRO_NOMBRE_VISTA[vista]}),Object.assign(document.createElement('span'),{textContent:enPag?'en la página':'clic para agregar',className:'notice'}));
  b.onclick=()=>agregar(vista);host.append(b);}
}
/* ---------- exportacion ---------- */
function casoActual(){return S.caso??(S.archivos.find(d=>d.rec)?.rec.caso??null);}
async function exportarPng(){const cv=C.lienzo(W,H);dibujar(cv.getContext('2d'),true);const n=casoActual();const nombre='Tiroides-Caso-'+(n??'X')+'-panoramica.png';const blob=await C.canvasABlob(cv);C.descargar(blob,nombre);S.exportado=true;$('exportInfo').textContent='Descargado '+nombre+'.';const img=document.createElement('img');img.src=URL.createObjectURL(blob);img.style.maxWidth='100%';img.style.border='1px solid #808080';img.alt=nombre;$('previsualizacion').replaceChildren(img);refrescar();}
function estadoProyecto(){return {caso:casoActual(),paleta:S.paleta,pagina:S.pagina,serial:S.serial,ajustados:[...S.ajustados],infoVista:[...S.infoVista],exportado:S.exportado};}
function guardarProyecto(){const n=casoActual();C.guardarProyecto('tiroides',estadoProyecto(),S.archivos,'Tiroides-Caso-'+(n??'X')+'.renalproject');S.proyectoGuardado=true;$('exportInfo').textContent='Proyecto guardado.';refrescar();}
async function abrirProyecto(file){try{const obj=await C.abrirProyecto(file);if(obj.app!=='tiroides')throw Error('Este proyecto es del simulador '+obj.app+'.');reiniciar(false);await cargar(obj.files);const e=obj.estado;S.paleta=e.paleta;S.pagina=e.pagina;S.serial=e.serial||100;S.ajustados=new Set(e.ajustados||[]);S.infoVista=new Set(e.infoVista||[]);S.exportado=!!e.exportado;$('paleta').value=S.paleta;sincronizarEncabezado();if(e.caso&&tutorial)tutorial.setCaso(e.caso);S.proyectoGuardado=true;estado('Proyecto abierto.');refrescar();}catch(err){estado('No se pudo abrir el proyecto: '+err.message);}}
function sincronizarEncabezado(){$('encTitulo').value=S.pagina.titulo;$('encLinea').value=S.pagina.linea;$('encPie').value=S.pagina.pie;}
/* ---------- navegacion ---------- */
function navegar(i){S.paso=Math.max(0,Math.min(3,i));document.querySelectorAll('.step').forEach((s,k)=>s.hidden=k!==S.paso);document.querySelectorAll('.steps button').forEach((b,k)=>b.classList.toggle('active',k===S.paso));$('prev').disabled=S.paso===0;$('next').disabled=S.paso===3;$('posicion').textContent='Paso '+(S.paso+1)+' de 4';
 $('panelEncabezado').hidden=S.paso!==1;$('panelAnotar').hidden=S.paso!==2;if(S.paso!==2){S.herramienta='mover';}$('vacio').hidden=S.archivos.length>0||S.paso!==0;refrescarPanel();repintar();if(tutorial)tutorial.render();}
function refrescar(){
 listar();bandeja();refrescarPanel();repintar();
 const n=casoActual();$('casoNombre').textContent=n?'Tiroides · Caso '+n:'Sin caso';$('casoInfo').textContent=n&&TIRO_CASOS[n]?TIRO_CASOS[n].titulo:'Elige el caso en el tutorial y carga los archivos de tu carpeta.';
 $('pngPagina').disabled=!S.pagina.items.length;$('guardarProyecto').disabled=!S.archivos.length;$('vacio').hidden=S.archivos.length>0||S.paso!==0;
 document.querySelectorAll('.steps button').forEach((b,k)=>b.classList.toggle('hecho',[!faltantes().length&&S.archivos.length>0,S.pagina.items.length===4&&!problemasComposicion().length,!problemasAjuste().length&&S.pagina.items.length===4&&flechasSobreMarcas().ok,S.exportado&&S.proyectoGuardado][k]));
 if(tutorial)tutorial.render();window.dispatchEvent(new CustomEvent('tiroides',{detail:{kind:'estado'}}));
}
function reiniciar(conCaso=true){Object.assign(S,{archivos:[],ignorados:[],seleccion:null,infoVista:new Set(),pagina:{titulo:'CINTIGRAMA DE TIROIDES',linea:'',pie:'',items:[],anotaciones:[]},serial:0,sel:null,herramienta:'mover',ajustados:new Set(),exportado:false,proyectoGuardado:false});cache.clear();marcasCache=null;sincronizarEncabezado();$('archivos').value='';$('carpeta').value='';$('previsualizacion').replaceChildren();$('exportInfo').textContent='';if(conCaso){navegar(0);refrescar();}}
function marcarAjuste(){const it=itemSel();if(it){S.ajustados.add(it.id);S.exportado=false;}}
/* ---------- tutorial ---------- */
function pasosTutorial(n,caso){
 return [
  {titulo:'Cargar los cuatro archivos',pantalla:0,resaltar:'archivos',texto:'Tu carpeta es «Caso '+n+'» dentro de tu carpeta Tiroides. Trae cuatro archivos DICOM sin extensión, uno por proyección.',
   haz:['Pulsa «Archivos» y selecciona los cuatro, o usa «O carpeta».','Espera a que aparezcan las cuatro filas en verde.'],deberia:'Anterior, anterior con marcas, OAD y OAI, cada una con «Caso '+n+'».',ayuda:'Una fila roja es un archivo de otro caso o que no es DICOM. Si falta una fila, vuelve a seleccionar los cuatro juntos.',
   completo:()=>S.archivos.length>0&&!faltantes().length&&!problemasCarga().length,problemas:()=>problemasCarga(),detalle:()=>S.archivos.filter(reconocido).map(d=>d.nombre+': '+TIRO_NOMBRE_VISTA[d.vistaNorm]).join(' · ')},
  {titulo:'Reconocer la adquisición',pantalla:0,resaltar:'listaArchivos',texto:'Lee la cabecera de la anterior: matriz, píxel, zoom de adquisición, duración y cuentas. El paro fue por cuentas, unas 500 k por imagen.',
   haz:['Haz clic en la fila de la anterior.','Compara la duración de las cuatro imágenes.'+(n===3?' Fíjate en la anterior con marcas: duró 39 s y tiene la tercera parte de las cuentas.':'')],deberia:'256 × 256, píxel de 1,05 mm, zoom de adquisición 2,29, ventana de 129 a 150 keV.',ayuda:'Si la tabla no aparece, la fila no quedó seleccionada. La dosis no siempre consta en el DICOM; úsala desde el procedimiento del antecedente.',
   completo:()=>S.infoVista.has('ANTERIOR'),problemas:()=>[],detalle:()=>{const d=porVista('ANTERIOR');return d?'Anterior: '+Math.round(d.duracionMs/1000)+' s · '+Math.round(C.total(d.data)/1000)+' k':'';}},
  {titulo:'Componer la página',pantalla:1,resaltar:'bandeja',texto:'La página del equipo tiene las cuatro imágenes en 2 × 2: anterior arriba a la izquierda, anterior con marcas a su derecha, OAD abajo a la izquierda y OAI abajo a la derecha. Arma la tuya igual y completa el encabezado.',
   haz:['Haz clic en cada imagen de la bandeja para ponerla en la página.','Arrástralas si quedaron en otro lugar, o pulsa «Ordenar 2 × 2 como el equipo».','Escribe la segunda línea del encabezado con «Caso '+n+'» y la fecha, y un pie con radiofármaco y matriz.'],
   deberia:'Cuatro cuadros del mismo tamaño con su rótulo, sin superponerse, y el encabezado con el caso.',ayuda:'Si una imagen no aparece en la bandeja, falta cargarla en el paso 1. Los rótulos vienen del DICOM; puedes corregirlos en el paso 3.',
   completo:()=>S.pagina.items.length===4&&!problemasComposicion().length&&/Caso\s*\d+/i.test(S.pagina.linea)&&!!S.pagina.pie.trim(),
   problemas:()=>{const p=problemasComposicion();if(!/Caso\s*\d+/i.test(S.pagina.linea))p.push('La segunda línea del encabezado debe decir «Caso '+n+'».');if(!S.pagina.pie.trim())p.push('Falta el pie de página con radiofármaco y matriz.');return p;},
   acciones:()=>[{etiqueta:'Ordenar 2 × 2',accion:autoOrden}]},
  {titulo:'Ajustar cada imagen',pantalla:2,resaltar:'panelItem',texto:'Selecciona cada cuadro y decide techo, piso, zoom y encuadre. La tiroides tiene que ocupar el cuadro sin cortar las salivales ni las marcas, y el techo tiene que mostrar la glándula sin quemarla.'+(caso.particularidades[0]?' '+caso.particularidades[0]:''),
   haz:['Haz clic en un cuadro; ajusta techo y piso hasta que se vea la glándula y el fondo.','Sube el zoom y mueve el encuadre con las flechas para centrar el cuello.','Repite con los cuatro. Corrige el rótulo si hace falta.'],deberia:'Cuatro imágenes con la misma escala de zoom, tiroides centrada, marcas visibles en la segunda.',ayuda:'Si una imagen se ve blanca, el techo está muy alto para ella: cada imagen tiene su propio ajuste. Si se ve quemada, súbelo.',
   completo:()=>S.pagina.items.length===4&&!problemasAjuste().length,problemas:()=>problemasAjuste()},
  {titulo:'Señalar las marcas',pantalla:2,resaltar:'herrFlecha',texto:()=>{const m=detectarMarcas();return 'En la anterior con marcas hay fuentes puntuales de referencia: la del mentón, arriba, y la de la horquilla esternal, abajo. '+(m.length===1?'En este caso el simulador distingue una sola marca, la de la '+m[0].nombre+'; señálala.':'En este caso hay dos; señálalas.')+' Cada flecha lleva su texto, como hace el equipo.';},
   haz:['Pulsa «Flecha con texto» y escribe el texto, por ejemplo «Marca horquilla esternal».','Arrastra desde donde quieres el texto hasta el punto brillante de la marca.','Si hay una segunda marca, repite con «Marca mentón».'],deberia:'Una flecha por marca sobre la anterior con marcas, cada una con su texto, con la punta sobre el punto.',ayuda:'Si la flecha quedó corta, arrástrala desde su texto para moverla o bórrala en la lista y vuelve a dibujarla. La punta tiene que caer sobre el punto brillante.',
   completo:()=>flechasSobreMarcas().ok,problemas:()=>flechasSobreMarcas().problemas,detalle:()=>flechasSobreMarcas().detalle.join(' · ')},
  {titulo:'Exportar y guardar',pantalla:3,resaltar:'pngPagina',texto:'Entregas la página en PNG. Guarda también el proyecto para poder retomar.',haz:['Pulsa «Descargar PNG · página».','Pulsa «Guardar proyecto…».'],deberia:'Tiroides-Caso-'+n+'-panoramica.png y Tiroides-Caso-'+n+'.renalproject.',ayuda:'Si el navegador bloquea las descargas, permítelas para este sitio y vuelve a pulsar.',
   completo:()=>S.exportado&&S.proyectoGuardado,problemas:()=>{const p=[];if(!S.exportado)p.push('Falta el PNG de la página.');if(!S.proyectoGuardado)p.push('Falta guardar el proyecto.');return p;}}
 ];
}
function cierreTutorial(n,caso){const box=document.createElement('div');if(!caso.referencia){box.append(Object.assign(document.createElement('p'),{textContent:'Este caso no tiene informe. Escribe tú la impresión: qué ves, qué causas explican una glándula así y qué pedirías para decidir.'}));return box;}
 const imp=document.createElement('details');imp.open=true;imp.append(Object.assign(document.createElement('summary'),{textContent:'Impresión del informe'}));imp.append(Object.assign(document.createElement('p'),{textContent:caso.referencia.impresion}));box.append(imp);
 box.append(Object.assign(document.createElement('p'),{className:'notice',textContent:'Compara con lo que describiste en tu página antes de leerla. No la recites en la presentación: fundamenta en las imágenes.'}));return box;}
/* ---------- arranque ---------- */
function iniciar(){
 tutorial=RenalTutorial.crear({contenedor:$('tutorial'),workspace:$('workspace'),boton:$('tutorialBoton'),titulo:'Tutorial tiroides',clave:'tiroidesTutorial',casos:TIRO_CASOS,pasos:pasosTutorial,cierre:cierreTutorial,preguntasOrales:TIRO_PREGUNTAS_ORALES,onCaso:n=>{S.caso=n;if(n&&!/Caso/.test(S.pagina.linea)){const d=S.archivos[0];S.pagina.linea='Caso '+n+(d?' · '+fecha(d):'');sincronizarEncabezado();}refrescar();},navegar:i=>{if(i!==S.paso&&S.archivos.length)navegar(i);}});
 S.caso=tutorial.caso;
 $('archivos').onchange=e=>cargar([...e.target.files]);$('carpeta').onchange=e=>cargar([...e.target.files]);
 $('paleta').onchange=e=>{S.paleta=e.target.value;cache.clear();refrescar();};
 $('encTitulo').oninput=e=>{S.pagina.titulo=e.target.value;S.exportado=false;repintar();};$('encLinea').oninput=e=>{S.pagina.linea=e.target.value;S.exportado=false;repintar();};$('encPie').oninput=e=>{S.pagina.pie=e.target.value;S.exportado=false;repintar();};
 for(const id of ['encTitulo','encLinea','encPie'])$(id).onchange=()=>refrescar();
 $('autoOrden').onclick=autoOrden;
 $('itemRotulo').oninput=e=>{const it=itemSel();if(it){it.rotulo=e.target.value;S.exportado=false;repintar();}};$('itemRotulo').onchange=()=>refrescar();
 $('itemTecho').oninput=e=>{const it=itemSel();if(it){it.techo=Number(e.target.value)/100;$('itemTechoValor').textContent=e.target.value+' %';marcarAjuste();repintar();}};
 $('itemPiso').oninput=e=>{const it=itemSel();if(it){it.piso=Math.min(Number(e.target.value)/100,it.techo-.05);$('itemPisoValor').textContent=e.target.value+' %';marcarAjuste();repintar();}};
 $('itemZoom').oninput=e=>{const it=itemSel();if(it){it.zoom=Number(e.target.value)/100;$('itemZoomValor').textContent=C.fmt(it.zoom,1)+'×';marcarAjuste();repintar();}};
 for(const id of ['itemTecho','itemPiso','itemZoom'])$(id).onchange=()=>refrescar();
 const pan=(dx,dy)=>{const it=itemSel();if(!it)return;it.panX+=dx;it.panY+=dy;marcarAjuste();refrescar();};
 $('panIzq').onclick=()=>pan(-15,0);$('panDer').onclick=()=>pan(15,0);$('panArr').onclick=()=>pan(0,-15);$('panAba').onclick=()=>pan(0,15);$('panCentro').onclick=()=>{const it=itemSel();if(it){it.panX=0;it.panY=0;marcarAjuste();refrescar();}};
 $('itemFrente').onclick=()=>{const it=itemSel();if(it){S.pagina.items.sort((a,b)=>(a===it)-(b===it));refrescar();}};
 $('itemQuitar').onclick=()=>{const it=itemSel();if(it){S.pagina.items=S.pagina.items.filter(x=>x!==it);S.sel=null;S.exportado=false;refrescar();}};
 $('herrMover').onclick=()=>{S.herramienta='mover';refrescarPanel();repintar();};$('herrFlecha').onclick=()=>{S.herramienta='flecha';S.sel=null;refrescarPanel();repintar();};
 $('flechaTexto').oninput=e=>{S.flechaTexto=e.target.value;};
 $('pngPagina').onclick=exportarPng;$('guardarProyecto').onclick=guardarProyecto;
 $('abrirProyecto').onclick=()=>$('proyectoInput').click();$('proyectoInput').onchange=e=>{if(e.target.files[0])abrirProyecto(e.target.files[0]);e.target.value='';};
 $('nuevo').onclick=()=>{if(!S.archivos.length||confirm('¿Descartar el caso cargado y su página?'))reiniciar();};
 $('prev').onclick=()=>navegar(S.paso-1);$('next').onclick=()=>navegar(S.paso+1);document.querySelectorAll('.steps button').forEach(b=>b.onclick=()=>navegar(Number(b.dataset.step)));
 $('ayuda').onclick=()=>$('acerca').showModal();$('cerrarAcerca').onclick=()=>$('acerca').close();$('inicio').onclick=()=>navegar(0);
 enlazarMouse($('pagina'));enlazarMouse($('pagina2'));
 window.addEventListener('error',e=>{(window.__errores=window.__errores||[]).push(String(e.message));});
 sincronizarEncabezado();navegar(0);refrescar();
}
window.TiroApp={estado:S,cargar,agregar,autoOrden,agregarFlecha,detectarMarcas,candidatosMarcas(){detectarMarcas();return marcasCache?marcasCache.cand:[];},imagenAPagina,paginaAImagen,flechasSobreMarcas,problemasComposicion,problemasAjuste,problemasCarga,navegar,exportarPng,guardarProyecto,refrescar,marcarAjuste,seleccionar(id){S.sel={tipo:'item',id};refrescar();},get tutorial(){return tutorial;},porVista};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
})();
