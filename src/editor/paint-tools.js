import {rectangleMask,polygonMask,floodMask,regularPolygon,applyMaskAlpha} from './paint-core.mjs';

const api=window.SuperMagicAssetStudioAPI;
const $=id=>document.getElementById(id);
const canvas=$('paintCanvas'),ctx=canvas.getContext('2d');
const art=$('artCanvas'),overlay=$('overlay');
if(!api||!canvas||!art)throw new Error('Paint editor failed to initialize');
const state={tool:'select',selection:null,selectionPreview:null,points:[],start:null,last:null,working:null,workContext:null,source:null,cloneReference:null,cloneOffset:null,texture:null,dragging:false};
const limit=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||min));
const size=()=>limit($('paintSize').value,1,256);
const color=()=>$('paintColor').value;
const opacity=()=>limit($('paintOpacity').value,1,100)/100;
function message(value){$('paintStatus').textContent=value;}
function makeCanvas(w=canvas.width,h=canvas.height){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function syncSize(){
 if(canvas.width===art.width&&canvas.height===art.height)return;
 canvas.width=art.width;canvas.height=art.height;state.selection=null;state.selectionPreview=null;state.points=[];state.working=null;render();
}
function point(e){const r=canvas.getBoundingClientRect();return {x:limit((e.clientX-r.left)*canvas.width/r.width,0,canvas.width),y:limit((e.clientY-r.top)*canvas.height/r.height,0,canvas.height)};}
function toolIsShape(t){return t.startsWith('shape-');}
function setTool(value){
 state.tool=value;$('paintTool').value=value;canvas.style.pointerEvents=value==='select'?'none':'auto';
 canvas.style.cursor=value==='select'?'default':'crosshair';state.start=null;state.dragging=false;state.working=null;state.points=[];
 $('paintPanel').classList.remove('collapsed');render();
 message(value==='clone'?'Alt-click on the canvas to set a clone source. Then paint to copy those pixels.':value==='select-freeform'?'Click boundary anchors, then double-click or Finish freeform.':value==='eraser'?'Choose whether to erase the selected source layer or only added paint/text/shape layers.':'Tool: '+value+'. Changes are saved as independent PNG layers.');
}
function clearSelection(){state.selection=null;state.selectionPreview=null;state.points=[];render();message('Selection cleared.');}
function setSelection(mask){
 state.selection=mask;state.points=[];
 const preview=makeCanvas(),g=preview.getContext('2d'),image=g.createImageData(preview.width,preview.height);
 let count=0;for(let i=0;i<mask.length;i++)if(mask[i]){image.data[i*4]=120;image.data[i*4+1]=93;image.data[i*4+2]=255;image.data[i*4+3]=42;count++;}
 g.putImageData(image,0,0);state.selectionPreview=preview;render();message('Selected '+count+' pixels. Brush, fill and shapes are clipped to this region.');
}
function render(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(state.selectionPreview)ctx.drawImage(state.selectionPreview,0,0);
 if(state.working)ctx.drawImage(state.working,0,0);
 if(state.points.length){
  ctx.save();ctx.strokeStyle='#ffedb1';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();
  state.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);for(const p of state.points){ctx.fillStyle='#8e6af5';ctx.fillRect(p.x-4,p.y-4,8,8);}ctx.restore();
 }
 if(state.dragging&&state.start&&state.last){
  if(state.tool==='select-rect'){ctx.save();ctx.strokeStyle='#f8df9e';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(state.start.x,state.start.y,state.last.x-state.start.x,state.last.y-state.start.y);ctx.restore();}
  else if(toolIsShape(state.tool)){ctx.save();drawShape(ctx,state.start,state.last);ctx.restore();}
 }
}
function work(){
 state.working=makeCanvas();state.workContext=state.working.getContext('2d');return state.workContext;
}
function pattern(){
 const type=$('paintTexture').value;if(type==='solid')return color();
 let tile=makeCanvas(48,48),g=tile.getContext('2d');g.fillStyle=color();g.fillRect(0,0,48,48);
 if(type==='imported'&&state.texture){g.clearRect(0,0,48,48);g.drawImage(state.texture,0,0,48,48);}
 else if(type==='dots'){g.fillStyle='rgba(0,0,0,.55)';for(let y=8;y<48;y+=16)for(let x=8;x<48;x+=16){g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();}}
 else if(type==='stripes'){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=7;for(let x=-48;x<90;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x+48,48);g.stroke();}}
 else if(type==='checker'){g.fillStyle='rgba(0,0,0,.4)';for(let y=0;y<48;y+=16)for(let x=0;x<48;x+=16)if((x+y)/16%2===0)g.fillRect(x,y,16,16);}
 return state.workContext?.createPattern(tile,'repeat')||ctx.createPattern(tile,'repeat');
}
function fillPaint(g,gradient=false){
 if(gradient){const grad=g.createLinearGradient(0,0,canvas.width,canvas.height);grad.addColorStop(0,color());grad.addColorStop(1,$('paintGradientEnd').value);return grad;}
 return pattern();
}
function strokeStyle(g){g.strokeStyle=pattern();g.lineWidth=size();g.lineCap=$('paintBrushShape').value==='square'?'square':'round';g.lineJoin='round';g.globalAlpha=opacity();}
function stamp(g,p,clone=false){
 g.save();g.globalAlpha=opacity();
 const radius=size()/2,shape=$('paintBrushShape').value;
 g.beginPath();
 if(shape==='square')g.rect(p.x-radius,p.y-radius,size(),size());
 else if(shape==='diamond'){g.moveTo(p.x,p.y-radius);g.lineTo(p.x+radius,p.y);g.lineTo(p.x,p.y+radius);g.lineTo(p.x-radius,p.y);g.closePath();}
 else g.arc(p.x,p.y,radius,0,Math.PI*2);
 if(clone){
  if(state.cloneReference&&state.cloneOffset){g.clip();g.drawImage(state.cloneReference,-state.cloneOffset.x,-state.cloneOffset.y);}
 }else if(shape==='soft'){
  const grad=g.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
  grad.addColorStop(0,color());grad.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=grad;g.fill();
 }else{g.fillStyle=pattern();g.fill();}
 g.restore();
}
function dabLine(g,a,b,clone=false){
 const distance=Math.hypot(b.x-a.x,b.y-a.y),step=Math.max(1,size()/4),n=Math.max(1,Math.ceil(distance/step));
 for(let i=1;i<=n;i++){const t=i/n;stamp(g,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},clone);}
}
function shapePath(g,t,a,b){
 g.beginPath();
 const dx=b.x-a.x,dy=b.y-a.y;
 if(t==='shape-rect')g.rect(a.x,a.y,dx,dy);
 if(t==='shape-oval'){g.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(.01,Math.abs(dx)/2),Math.max(.01,Math.abs(dy)/2),0,0,2*Math.PI);}
 if(t==='shape-circle')g.arc(a.x,a.y,Math.max(.01,Math.hypot(dx,dy)),0,2*Math.PI);
 if(t==='shape-line'){g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}
 if(t==='shape-poly'){const vertices=regularPolygon(a.x,a.y,b.x,b.y,$('paintSides').value);vertices.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();}
 if(t==='shape-curve'){
  const len=Math.max(1,Math.hypot(dx,dy)),bend=limit($('paintCurveBend').value,-300,300);
  const cp={x:(a.x+b.x)/2-dy/len*bend,y:(a.y+b.y)/2+dx/len*bend};
  g.moveTo(a.x,a.y);g.quadraticCurveTo(cp.x,cp.y,b.x,b.y);
 }
}
function drawShape(g,a,b){
 g.save();strokeStyle(g);shapePath(g,state.tool,a,b);
 if($('paintShapeFill').value==='fill'&&!['shape-line','shape-curve'].includes(state.tool)){g.fillStyle=fillPaint(g);g.fill();}
 else g.stroke();g.restore();
}
async function commit(label,erase=false){
 if(!state.working)return;
 const active=state.working;state.working=null;state.workContext=null;state.dragging=false;state.start=null;state.last=null;render();
 const g=active.getContext('2d',{willReadFrequently:true});
 if(state.selection){const data=g.getImageData(0,0,active.width,active.height);applyMaskAlpha(data.data,state.selection);g.putImageData(data,0,0);}
 const pixels=g.getImageData(0,0,active.width,active.height).data;let hasPixels=false;
 for(let i=3;i<pixels.length;i+=4){if(pixels[i]){hasPixels=true;break;}}
 if(!hasPixels){message('No pixels changed inside the selection.');return;}
 try{
  if(erase){const count=await api.eraseRasterWithMask(active.toDataURL('image/png'),$('paintEraseMode').value);message('Erased '+count+' layer(s). Undo is available.');return {affected:count};}
  else{const layerId=api.createRasterPaintLayer(active.toDataURL('image/png'),label);message(label+' added as a movable editable layer. Undo is available.');return {layerId};}
 }catch(err){message('Paint error: '+err.message);}
}
function finishFreeform(){
 if(state.points.length<3){message('Freeform requires at least three boundary points.');return;}
 setSelection(polygonMask(canvas.width,canvas.height,state.points));
}
function pick(p){
 const data=art.getContext('2d',{willReadFrequently:true}).getImageData(Math.min(art.width-1,Math.floor(p.x)),Math.min(art.height-1,Math.floor(p.y)),1,1).data;
 const hex='#'+Array.from(data.slice(0,3),n=>n.toString(16).padStart(2,'0')).join('');$('paintColor').value=hex;message('Picked '+hex);
}
function fillSelected(){
 if(!state.selection){message('Select a rectangle, freeform region or wand region before filling.');return;}
 const g=work();g.save();g.globalAlpha=opacity();
 const mode=$('paintFillMode').value;
 g.fillStyle=mode==='gradient'?fillPaint(g,true):mode==='texture'?pattern():color();
 g.fillRect(0,0,canvas.width,canvas.height);g.restore();commit('Selection fill');
}
function writeText(p){
 const txt=$('paintText').value.trim();if(!txt){message('Enter text in the text field first.');return;}
 const g=work(),font=$('paintFont').value.replace(/[^a-zA-Z -]/g,''),fontSize=limit($('paintFontSize').value,8,320);
 g.save();g.globalAlpha=opacity();g.fillStyle=color();g.font=fontSize+'px "'+font+'"';g.textBaseline='top';
 g.fillText(txt,p.x,p.y,canvas.width-p.x);g.restore();commit('Text: '+txt.slice(0,28));
}
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0||state.tool==='select')return;
 syncSize();const p=point(e),t=state.tool;
 if(t==='picker'){pick(p);return;}
 if(t==='select-wand'){
  try{const data=art.getContext('2d',{willReadFrequently:true}).getImageData(0,0,art.width,art.height).data;setSelection(floodMask(data,art.width,art.height,p.x,p.y,$('paintTolerance').value));}catch(err){message(err.message);}return;
 }
 if(t==='select-freeform'){state.points.push(p);render();return;}
 if(t==='fill'){fillSelected();return;}
 if(t==='text'){writeText(p);return;}
 if(t==='clone'&&e.altKey){state.source=p;message('Clone source set at '+Math.round(p.x)+','+Math.round(p.y)+'. Drag elsewhere to stamp.');return;}
 if(t==='clone'&&!state.source){message('Alt-click the source pixel first.');return;}
 state.start=p;state.last=p;state.dragging=true;
 if(!t.startsWith('select-')){
  const g=work();
  if(t==='clone'){state.cloneReference=makeCanvas();state.cloneReference.getContext('2d').drawImage(art,0,0);state.cloneOffset={x:state.source.x-p.x,y:state.source.y-p.y};}
  if(['brush','eraser','clone'].includes(t))stamp(g,p,t==='clone');
 }
 canvas.setPointerCapture(e.pointerId);render();e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
 if(!state.dragging)return;
 const p=point(e),t=state.tool;
 if(['brush','eraser','clone'].includes(t)){dabLine(state.workContext,state.last,p,t==='clone');}
 state.last=p;render();
});
canvas.addEventListener('pointerup',e=>{
 if(!state.dragging)return;const p=point(e),t=state.tool;
 state.last=p;state.dragging=false;
 if(t==='select-rect'){setSelection(rectangleMask(canvas.width,canvas.height,state.start,p));state.start=null;state.last=null;return;}
 if(toolIsShape(t)){drawShape(state.workContext,state.start,p);commit('Shape: '+t.slice(6));}
 else if(['brush','eraser','clone'].includes(t)){commit(t==='clone'?'Clone stamp':'Brush stroke',t==='eraser');}
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel',()=>{state.dragging=false;state.working=null;state.start=null;render();});
canvas.addEventListener('dblclick',e=>{if(state.tool==='select-freeform'){e.preventDefault();finishFreeform();}});
$('paintTool').addEventListener('change',e=>setTool(e.target.value));
$('paintFinishFreeform').addEventListener('click',finishFreeform);
$('paintClearSelection').addEventListener('click',clearSelection);
$('paintClearMenu').addEventListener('click',()=>{clearSelection();document.querySelectorAll('.menu.open').forEach(el=>el.classList.remove('open'));});
$('paintStop').addEventListener('click',()=>setTool('select'));
for(const el of document.querySelectorAll('[data-paint-menu]'))el.addEventListener('click',()=>{
 setTool(el.dataset.paintMenu);document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open'));
});
$('paintImportTexture').addEventListener('click',()=>$('paintTextureFile').click());
$('paintTextureFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>6000000){message('Choose a PNG, JPEG or WebP under 6 MB.');return;}
 try{const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});}finally{URL.revokeObjectURL(url);}
  state.texture=img;$('paintTexture').value='imported';$('paintTextureName').textContent=file.name;message('Imported texture '+file.name+'.');
 }catch(err){message('Texture could not be decoded: '+err.message);}
});
new MutationObserver(()=>syncSize()).observe(art,{attributes:true,attributeFilter:['width','height']});
let previousScene=$('sceneTitle').textContent;
new MutationObserver(()=>{const s=$('sceneTitle').textContent;if(s!==previousScene){previousScene=s;clearSelection();}}).observe($('sceneTitle'),{childList:true,characterData:true,subtree:true});
const PROPERTY_IDS=['paintColor','paintSize','paintBrushShape','paintTexture','paintOpacity','paintTolerance',
 'paintFillMode','paintGradientEnd','paintEraseMode','paintSides','paintCurveBend','paintShapeFill','paintText','paintFont','paintFontSize'];
function getPaintSettings(){return Object.fromEntries(PROPERTY_IDS.map(id=>[id,$(id).value]));}
function setPaintSettings(settings={}){
 for(const [id,value] of Object.entries(settings)){
  if(!PROPERTY_IDS.includes(id))throw Error('Unknown paint property '+id);
  const field=$(id);if(field.tagName==='SELECT'&&![...field.options].some(x=>x.value===String(value)))throw Error('Unknown option for '+id);
  if(field.type==='number'||field.type==='range'){if(!Number.isFinite(Number(value))||Number(value)<Number(field.min)||Number(value)>Number(field.max))throw Error('Out of range '+id);}
  if(field.type==='color'&&!/^#[0-9a-f]{6}$/i.test(value))throw Error('Invalid color');
  field.value=String(value);field.dispatchEvent(new Event('change',{bubbles:true}));
 }return getPaintSettings();
}
async function performPaintOperation(spec={}){
 syncSize();if(spec.properties)setPaintSettings(spec.properties);
 const kind=spec.tool||state.tool;
 if(spec.selection){
  const s=spec.selection,w=canvas.width,h=canvas.height;
  if(s.type==='rect')setSelection(rectangleMask(w,h,{x:s.x,y:s.y},{x:s.x+s.w,y:s.y+s.h}));
  else if(['poly','freeform','bezier'].includes(s.type)){
   const pts=s.type==='bezier'?window.SuperMagicAssetStudioAPI.getCurveOutline?.(s,24):s.points;
   if(!pts?.length)throw Error('Selection requires points');setSelection(polygonMask(w,h,pts));
  }else if(s.type==='wand'){
   const data=art.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
   setSelection(floodMask(data,w,h,s.seed.x,s.seed.y,s.tolerance??$('paintTolerance').value));
  }else throw Error('Unsupported selection type '+s.type);
 }
 if(kind==='selection')return {selectedPixels:state.selection?.reduce((a,b)=>a+b,0)||0};
 if(kind==='picker'){pick(spec.position||spec.start);return {color:$('paintColor').value};}
 setTool(kind);
 if(kind==='fill'){
  if(!state.selection)throw Error('Fill needs a selection');const g=work();
  g.save();g.globalAlpha=opacity();const mode=$('paintFillMode').value;
  g.fillStyle=mode==='gradient'?fillPaint(g,true):mode==='texture'?pattern():color();
  g.fillRect(0,0,canvas.width,canvas.height);g.restore();return await commit('Selection fill');
 }
 if(kind==='text'){
  const text=$('paintText').value.trim();if(!text)throw Error('Text is empty');
  const g=work(),p=spec.start||spec.position||{x:0,y:0},font=$('paintFont').value.replace(/[^a-zA-Z -]/g,''),fontSize=limit($('paintFontSize').value,8,320);
  g.save();g.globalAlpha=opacity();g.fillStyle=color();g.font=fontSize+'px "'+font+'"';g.textBaseline='top';g.fillText(text,p.x,p.y,canvas.width-p.x);g.restore();
  return await commit('Text: '+text.slice(0,28));
 }
 if(toolIsShape(kind)){
  const a=spec.start||spec.points?.[0],b=spec.end||spec.points?.at(-1);
  if(!a||!b)throw Error('Shape requires start and end points');
  const g=work();drawShape(g,a,b);return await commit('Shape: '+kind.slice(6));
 }
 if(['brush','eraser','clone'].includes(kind)){
  const points=spec.points||[spec.start||spec.position];if(!points?.length||!points[0])throw Error('Stroke needs points');
  const g=work();if(kind==='clone'){
   if(!spec.cloneSource)throw Error('Clone stamp needs cloneSource');
   state.cloneReference=makeCanvas();state.cloneReference.getContext('2d').drawImage(art,0,0);
   state.cloneOffset={x:spec.cloneSource.x-points[0].x,y:spec.cloneSource.y-points[0].y};
  }
  stamp(g,points[0],kind==='clone');
  for(let i=1;i<points.length;i++)dabLine(g,points[i-1],points[i],kind==='clone');
  return await commit(kind==='clone'?'Clone stamp':'Brush stroke',kind==='eraser');
 }
 throw Error('Unsupported paint operation '+kind);
}
async function importPaintTexture(file){
 if(!(file instanceof Blob)||file.size>6000000)throw Error('Texture must be a File/Blob under 6MB');
 const source=URL.createObjectURL(file),img=new Image();
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Texture decode failed'));img.src=source;});}
 finally{URL.revokeObjectURL(source);}
 state.texture=img;$('paintTexture').value='imported';$('paintTextureName').textContent=file.name||'Imported texture';
 return {width:img.width,height:img.height};
}

window.SuperMagicPaintAPI={setTool,clearSelection,finishFreeform,getSelectionCount:()=>state.selection?.reduce((a,b)=>a+b,0)||0,getSelectionMask:()=>state.selection?.slice()||null,setSelectionMask:(mask)=>{if(!(mask instanceof Uint8Array)||mask.length!==canvas.width*canvas.height)throw Error('Selection mask size mismatch');setSelection(mask.slice());},getTool:()=>state.tool,getPaintSettings,setPaintSettings,performPaintOperation,importPaintTexture};
setTool('select');
