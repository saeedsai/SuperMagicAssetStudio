'use strict';
(()=>{
const spriteGeometry=window.SuperMagicSpriteGeometry;
const {curvePoints:spriteCurvePoints,regionBounds:spriteRegionBounds,normalizeRegion:spriteNormalizeRegion,drawRegionPath:spriteDrawRegionPath}=spriteGeometry;
const $=s=>document.querySelector(s), W=()=>project.canvas.width, H=()=>project.canvas.height;
const VIEWS=[['front','Front','↓'],['threeQuarterFrontLeft','3/4 front left','↙'],['left','Left','←'],['threeQuarterBackLeft','3/4 back left','↖'],['back','Back','↑'],['threeQuarterBackRight','3/4 back right','↗'],['right','Right','→'],['threeQuarterFrontRight','3/4 front right','↘']];
const VIEW_IDS=VIEWS.map(x=>x[0]);
const BODY_HEAD_PARTS=[
  {id:'body',name:'Body without head',group:'Base'},
  {id:'head',name:'Head',group:'Head'},
  {id:'hairBack',name:'Hair · back',group:'Head'},
  {id:'hairFront',name:'Hair · front',group:'Head'},
  {id:'face',name:'Face',group:'Face'},
  {id:'eyes',name:'Eyes',group:'Face'},
  {id:'eyebrows',name:'Eyebrows',group:'Face'},
  {id:'nose',name:'Nose',group:'Face'},
  {id:'mouth',name:'Mouth',group:'Face'},
  {id:'beard',name:'Beard / moustache',group:'Face'},
  {id:'shirt',name:'Shirt / jersey',group:'Clothes'},
  {id:'shorts',name:'Pants / shorts',group:'Clothes'},
  {id:'sockLeft',name:'Sock · left',group:'Clothes'},
  {id:'sockRight',name:'Sock · right',group:'Clothes'},
  {id:'bootLeft',name:'Boot · left',group:'Clothes'},
  {id:'bootRight',name:'Boot · right',group:'Clothes'},
  {id:'accessory',name:'Accessory',group:'Accessory'}
];
const STANDARD_PARTS=[
  {id:'head',name:'Head base / ears / neck attachment',group:'Head'},
  {id:'hairFront',name:'Hair · front',group:'Head'},
  {id:'hairBack',name:'Hair · back',group:'Head'},
  {id:'eyebrows',name:'Eyebrows',group:'Face'},
  {id:'eyes',name:'Eyes',group:'Face'},
  {id:'nose',name:'Nose',group:'Face'},
  {id:'mouth',name:'Mouth',group:'Face'},
  {id:'beard',name:'Mustache / beard',group:'Face'},
  {id:'torso',name:'Torso / jersey',group:'Upper body'},
  {id:'shirt',name:'Shirt / jersey overlay',group:'Upper body'},
  {id:'sleeveLeft',name:'Left jersey sleeve',group:'Upper body'},
  {id:'sleeveRight',name:'Right jersey sleeve',group:'Upper body'},
  {id:'upperArmLeft',name:'Left upper arm',group:'Upper body'},
  {id:'forearmLeft',name:'Left forearm',group:'Upper body'},
  {id:'handLeft',name:'Left hand',group:'Upper body'},
  {id:'upperArmRight',name:'Right upper arm',group:'Upper body'},
  {id:'forearmRight',name:'Right forearm',group:'Upper body'},
  {id:'handRight',name:'Right hand',group:'Upper body'},
  {id:'pelvis',name:'Pelvis / hips',group:'Lower body'},
  {id:'shorts',name:'Pelvis and shorts',group:'Lower body'},
  {id:'upperLegLeft',name:'Left thigh',group:'Lower body'},
  {id:'lowerLegLeft',name:'Left lower leg',group:'Lower body'},
  {id:'sockLeft',name:'Left sock',group:'Lower body'},
  {id:'bootLeft',name:'Left football boot',group:'Lower body'},
  {id:'upperLegRight',name:'Right thigh',group:'Lower body'},
  {id:'lowerLegRight',name:'Right lower leg',group:'Lower body'},
  {id:'sockRight',name:'Right sock',group:'Lower body'},
  {id:'bootRight',name:'Right football boot',group:'Lower body'},
  {id:'accessory',name:'Accessory',group:'Accessory'},
  {id:'bodyPart',name:'Other body part',group:'Custom'}
];
const FULL_BODY_PARTS=[{id:'fullBody',name:'Full body',group:'Base'},{id:'accessory',name:'Accessory',group:'Accessory'}];
function partsToMap(parts){return Object.fromEntries(parts.map(p=>[p.id,p.name]));}
function builtinPartsFor(mode='standard'){
  if(mode==='fullBody')return clone(FULL_BODY_PARTS);
  if(mode==='bodyHead')return clone(BODY_HEAD_PARTS);
  if(mode==='standard')return clone(STANDARD_PARTS);
  return clone(partDefinitions());
}
let CATEGORIES=partsToMap(STANDARD_PARTS);
const BASE_CATEGORIES={...CATEGORIES};
const STANDARD_CATEGORIES=()=>partsToMap(STANDARD_PARTS);
const icons={fullBody:'♟',head:'◉',face:'◉',shirt:'♜',shorts:'▣',accessory:'✧',hairFront:'♠',hairBack:'♠',mouth:'◡',eyes:'◉'};
const layerOrder={body:0,fullBody:0,hairBack:4,torso:6,neck:7,pelvis:8,upperLegLeft:10,upperLegRight:11,lowerLegLeft:12,lowerLegRight:13,footLeft:14,footRight:15,sockLeft:16,sockRight:17,bootLeft:18,bootRight:19,shorts:22,shirt:30,sleeveLeft:30,sleeveRight:30,upperArmLeft:31,upperArmRight:32,forearmLeft:33,forearmRight:34,handLeft:35,handRight:36,bodyPart:37,head:40,face:41,eyes:42,eyebrows:43,nose:44,mouth:45,beard:46,hairFront:48,accessory:50};
function insertOrdered(list,l){const at=list.findIndex(x=>(layerOrder[x.category]??25)>(layerOrder[l.category]??25));if(at<0)list.push(l);else list.splice(at,0,l);}
const uid=(prefix='id')=>`${prefix}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const num=(n,d=0)=>{const x=Number(n);return Number.isFinite(x)?x:d};
const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),overlay=$('#overlay'),octx=overlay.getContext('2d');
let cropOnCanvas=false,showGrid=false,showRulers=false,gridSize=32,snapGrid=false,historyPast=[],historyFuture=[],restoring=false,dragHistory=false;
let currentView='front',currentAnimation='stand',currentFrame='',selectedLayer=null,selectedLayerIds=new Set(),zoom=1,showGuides=false,drag=null,playing=null,spinning=null,toastTimer,pending=[],queueManifest=null;
const images=new Map();
function createProject(){const scenes={};for(const [key] of VIEWS)scenes[key]={};return {format:'FootballSpriteStudio',schemaVersion:4,mode:'bodyHead',assetStorage:'bundled',partDefinitions:null,editor:{grid:false,rulers:false,gridSize:32,snap:false,reference:null},viewOrder:VIEW_IDS.slice(),projectName:'Alex - Crown Royal',canvas:{width:768,height:768},animations:[{id:'stand',name:'Stand',fps:6,frames:[{id:'stand_1',name:'Stand 1'}]},{id:'run',name:'Run',fps:8,frames:[{id:'run_1',name:'Run 1'},{id:'run_2',name:'Run 2'}]}],assets:{},scenes,defaults:{},notes:'All positions and dimensions are in canvas pixels. Layer image source = assets[layer.assetId].src. Layer crop is in original image pixels. Draw order = array order (back to front). assetStorage may be bundled or external.'};}
let project=createProject();currentFrame='stand_1';
function modeLabel(){return ({fullBody:'Full body + head in one PNG',bodyHead:'Body + separate head',standard:'Standard modular parts',custom:'Custom modular parts'})[project.mode]||'Body + separate head';}

function modeCategories(mode=project.mode){
  if(mode==='fullBody')return partsToMap(FULL_BODY_PARTS);
  if(mode==='bodyHead')return partsToMap(BODY_HEAD_PARTS);
  if(mode==='standard')return STANDARD_CATEGORIES();
  if(mode==='custom'){
    const parts=partDefinitions();
    return parts.length?partsToMap(parts):partsToMap([{id:'bodyPart',name:'Other body part'},{id:'accessory',name:'Accessory'}]);
  }
  return STANDARD_CATEGORIES();
}
function applyModeCategories(){CATEGORIES=modeCategories();populateChoices();}
function unresolvedAssets(){return Object.values(project.assets||{}).filter(a=>!a.src);}
function anim(){return project.animations.find(a=>a.id===currentAnimation)||project.animations[0];}
function frame(){return anim().frames.find(f=>f.id===currentFrame)||anim().frames[0];}
function scene(view=currentView,animation=currentAnimation,frameId=currentFrame){const vs=project.scenes[view]||(project.scenes[view]={});const as=vs[animation]||(vs[animation]={});return as[frameId]||(as[frameId]=[]);}
function asset(layer){return layer&&project.assets[layer.assetId];}
function sel(){return scene().find(l=>l.id===selectedLayer)||null;}
function selectedLayers(){return scene().filter(l=>selectedLayerIds.has(l.id));}
function setSelected(id,options={}){if(options.toggle){if(selectedLayerIds.has(id))selectedLayerIds.delete(id);else selectedLayerIds.add(id);}else if(options.add){selectedLayerIds.add(id);}else{selectedLayerIds=new Set(id?[id]:[]);}selectedLayer=selectedLayerIds.has(id)?id:(selectedLayerIds.size?[...selectedLayerIds].at(-1):null);renderLayers();renderInspector();if(selectedLayerIds.size)window.SuperMagicStudioUI?.showLayerInspector();draw();}
function clearSelection(){selectedLayer=null;selectedLayerIds.clear();}
function selectionBounds(layers=selectedLayers()){const pts=layers.flatMap(l=>layerCorners(l));if(!pts.length)return null;const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);const x=Math.min(...xs),y=Math.min(...ys),x2=Math.max(...xs),y2=Math.max(...ys);return {x,y,w:x2-x,h:y2-y,cx:(x+x2)/2,cy:(y+y2)/2};}
function groupHandles(b){return [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}];}
function changeGroup({dx=0,dy=0,scaleX=1,scaleY=1,rotationDeg=0},layers=selectedLayers(),center=selectionBounds(layers)){if(!center)return;const rad=rotationDeg*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);for(const l of layers){const t=l.transform,rx=(t.x-center.cx)*scaleX,ry=(t.y-center.cy)*scaleY;t.x=center.cx+rx*co-ry*si+dx;t.y=center.cy+rx*si+ry*co+dy;t.scaleX=clamp(t.scaleX*scaleX,.001,30);t.scaleY=clamp(t.scaleY*scaleY,.001,30);t.rotationDeg+=rotationDeg;}}
function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
function loadImg(id){if(images.has(id))return images.get(id);const a=project.assets[id];if(!a||!a.src)return null;const img=new Image();img.onload=()=>{a.width=img.naturalWidth;a.height=img.naturalHeight;draw();};img.onerror=()=>notify('An image could not be decoded.');img.src=a.src;images.set(id,img);return img;}
function renderViews(){const root=$('#viewButtons');root.innerHTML=VIEWS.map(([key,label,icon],i)=>`<button type="button" data-view="${key}" class="${currentView===key?'selected':''}" title="${i*45} degrees"><span class="view-icon">${icon}</span>${label}</button>`).join('');$('#canvasViewLabel').textContent=`${VIEW_IDS.indexOf(currentView)+1} / 8 · ${VIEWS.find(v=>v[0]===currentView)[1]}`;}
function renderAnimations(){const a=anim();$('#animationSelect').innerHTML=project.animations.map(x=>`<option value="${esc(x.id)}" ${x.id===currentAnimation?'selected':''}>${esc(x.name)}</option>`).join('');$('#fps').value=a.fps;}
function renderFrames(){const a=anim();$('#frameButtons').innerHTML=a.frames.map((f,i)=>`<button class="frame ${f.id===currentFrame?'current':''}" data-frame="${esc(f.id)}">${esc(f.name)}<small>${f.reuse?'↪ '+esc(project.animations.find(a=>a.id===f.reuse.animation)?.name||f.reuse.animation):`${i+1} / ${a.frames.length}`}</small></button>`).join('');$('#frameInfo').textContent=`${a.frames.length} frame${a.frames.length===1?'':'s'} · ${a.fps} FPS`;$('#sceneTitle').textContent=`${VIEWS.find(v=>v[0]===currentView)?.[1]} · ${frame().name}`;$('#stageLabel').textContent=VIEWS.find(v=>v[0]===currentView)?.[1].toUpperCase();}
function renderLayers(){const list=scene();renderGroupVisibility();$('#layerCount').textContent=`${list.length} layer${list.length===1?'':'s'}`;$('#layersList').innerHTML=list.length?list.slice().reverse().map(l=>`<button draggable="true" class="layer-item ${selectedLayerIds.has(l.id)?'selected':''}" data-layer="${esc(l.id)}"><img class="layer-thumb" alt="" src="${asset(l)?.src||''}"><span class="layer-label"><b>${esc(l.name)}</b><small>${icons[l.category]||''} ${CATEGORIES[l.category]||l.category}${l.locked?' · locked':''}</small></span><span class="eye ${l.visible?'':'off'}" role="button" data-eye="${esc(l.id)}" title="Toggle visibility">${l.visible?'◉':'○'}</span></button>`).join(''):(frame().reuse?'<div class="empty">This frame inherits the linked animation. Add overlay layers, or choose Make frame editable to detach it.</div>':'<div class="empty">No layers in this view and frame.<br>Upload a full body, head, or a separate part.</div>');}
function renderInspector(){const l=sel(),root=$('#inspectorContent');if(selectedLayerIds.size>1){const b=selectionBounds();root.innerHTML=`<div class="multi-box"><b>${selectedLayerIds.size} parts selected</b><span class="multi-hint">Ctrl-click parts on the canvas or in Layers to modify the selection. Drag any selected part to move all; drag a group corner to resize all.</span><div class="two"><div class="control"><label>Move X (Δ px)</label><input type="number" data-group-prop="dx" value="0" step="1"></div><div class="control"><label>Move Y (Δ px)</label><input type="number" data-group-prop="dy" value="0" step="1"></div><div class="control"><label>Multiply scale X</label><input type="number" data-group-prop="scaleX" value="1" step=".05" min=".01"></div><div class="control"><label>Multiply scale Y</label><input type="number" data-group-prop="scaleY" value="1" step=".05" min=".01"></div><div class="control"><label>Rotate group (Δ °)</label><input type="number" data-group-prop="rotationDeg" value="0" step="1"></div></div><p>Group box: ${Math.round(b.w)} × ${Math.round(b.h)} px</p><button class="btn primary full" id="openAutoResize" style="margin-top:10px">Auto-resize selected part types across views / animations</button></div>`;return;}if(!l){root.innerHTML='<div class="empty">Select a layer or upload a PNG to edit its placement.</div>';return;}const a=asset(l),t=l.transform,c=l.crop;
const field=(label,key,value,step='1',min='',max='')=>`<div class="control"><label>${label}</label><input data-prop="${key}" type="number" step="${step}" ${min!==''?`min="${min}"`:''} ${max!==''?`max="${max}"`:''} value="${Number(value.toFixed?.(3)??value)}" /></div>`;
root.innerHTML=`<div class="control"><label>Layer name</label><input class="full" data-prop="name" type="text" value="${esc(l.name)}"></div><div class="formline"><label>Type</label><select data-prop="category">${Object.entries({...CATEGORIES,...(CATEGORIES[l.category]?{}:{[l.category]:l.category||'Legacy part'})}).map(([k,n])=>`<option value="${k}" ${l.category===k?'selected':''}>${n}</option>`).join('')}</select></div><div class="toolrow" style="margin:12px 0"><button class="btn sm" id="replaceImage">↻ Replace PNG</button><button class="btn sm" id="cropLayer">▧ Crop dialog...</button><button class="btn sm ${cropOnCanvas?"crop-active":""}" id="cropHere">▧ Crop on canvas</button></div>
<div class="two">${field('X center (px)','x',t.x)}${field('Y center (px)','y',t.y)}${field('Scale X × original PNG','scaleX',t.scaleX,.01,.001)}${field('Scale Y × original PNG','scaleY',t.scaleY,.01,.001)}${field('Rotation from original (°)','rotationDeg',t.rotationDeg,.5)}${field('Opacity (0–1)','opacity',t.opacity,.05,0,1)}</div>
<div class="toolrow" style="margin-top:12px"><button class="btn sm" id="flipX">↔ Flip X ${t.flipX?'✓':''}</button><button class="btn sm" id="flipY">↕ Flip Y ${t.flipY?'✓':''}</button><button class="btn sm" id="toggleLock">${l.locked?'🔒 Unlock':'🔓 Lock'}</button></div>
<div class="separator"></div><h4>Color adjustments</h4><div class="two">${field('Brightness %','colorBrightness',l.color?.brightness??100,1,0,300)}${field('Contrast %','colorContrast',l.color?.contrast??100,1,0,300)}${field('Saturation %','colorSaturate',l.color?.saturate??100,1,0,300)}${field('Hue rotation (°)','colorHue',l.color?.hue??0,1,-180,180)}${field('Sepia / brown %','colorSepia',l.color?.sepia??0,1,0,100)}${field('Red %','colorRed',l.color?.red??100,1,0,300)}${field('Green %','colorGreen',l.color?.green??100,1,0,300)}${field('Blue %','colorBlue',l.color?.blue??100,1,0,300)}${field('Tint strength %','colorTintAmount',l.color?.tintAmount??0,1,0,100)}</div><div class="formline" style="margin-top:8px"><label>RGB tint (HEX picker)</label><input type="color" data-prop="colorTintHex" style="width:64px;height:34px;cursor:pointer" value="${esc(l.color?.tintHex||'#ffffff')}"/></div><div class="toolrow" style="margin-top:10px"><button class="btn sm" data-colorpreset="normal">Original</button><button class="btn sm" data-colorpreset="light">Lighter</button><button class="btn sm" data-colorpreset="dark">Darker</button><button class="btn sm" data-colorpreset="red">Red tone</button><button class="btn sm" data-colorpreset="brown">Brown tone</button><button class="btn sm" data-colorpreset="cool">Cool tone</button></div><div class="separator"></div><h4>Source crop (original pixels)</h4><div class="two">${field('Crop left','cropX',c.x)}${field('Crop top','cropY',c.y)}${field('Crop width','cropW',c.w,1,1)}${field('Crop height','cropH',c.h,1,1)}</div>
<div class="small-note" style="margin-top:8px">Original PNG: ${a?.width||'?'} × ${a?.height||'?'} px · 1.0 scale = 100% of source pixel size; 0° = source orientation.<br>Full source at this scale: ${Math.round((a?.width||0)*t.scaleX)} × ${Math.round((a?.height||0)*t.scaleY)} px · Cropped visible area: ${Math.round(c.w*t.scaleX)} × ${Math.round(c.h*t.scaleY)} px</div>
<div class="separator"></div><button class="btn primary full" id="openAutoResize">Auto-resize matching parts in other views / frames</button><div class="toolrow" style="margin-top:8px"><button class="btn sm" id="autoFitLayer">✦ Auto-fit to part</button><button class="btn sm" id="fitLayer">Fit height</button><button class="btn sm" id="resetLayer">Reset placement</button><button class="btn sm" id="saveDefault">Save type default</button></div><p>Auto-fit uses transparent image geometry and part-specific anchor estimates (local heuristic, not AI). Save type default uses the current size and position for the next imported ${String(CATEGORIES[l.category]||l.category||'part').toLowerCase()} in this view.</p>`;
}
function refresh(){renderMode();renderReferenceControls();renderClipControls();renderViews();renderAnimations();renderFrames();renderLayers();renderInspector();draw();}
function updateDimension(){canvas.width=overlay.width=W();canvas.height=overlay.height=H();$('#canvasWidth').value=W();$('#canvasHeight').value=H();fitZoom();}
function fitZoom(){const host=$('#canvasHost');zoom=clamp(Math.min((host.clientWidth-55)/W(),(host.clientHeight-55)/H()),.14,1.6);updateZoom();}
function updateZoom(){$('#stage').style.width=`${W()*zoom}px`;$('#stage').style.height=`${H()*zoom}px`;$('#zoomValue').textContent=`${Math.round(zoom*100)}%`;}

function colorFilter(c){if(!c)return 'none';return `brightness(${clamp(num(c.brightness,100),0,300)}%) contrast(${clamp(num(c.contrast,100),0,300)}%) saturate(${clamp(num(c.saturate,100),0,300)}%) hue-rotate(${clamp(num(c.hue,0),-180,180)}deg) sepia(${clamp(num(c.sepia,0),0,100)}%)`;}
function rgbCanvas(img,l){const c=l.crop,col=l.color||{};const r=clamp(num(col.red,100),0,300),g=clamp(num(col.green,100),0,300),b=clamp(num(col.blue,100),0,300),tintAmount=clamp(num(col.tintAmount,0),0,100)/100,hex=/^#[0-9a-f]{6}$/i.test(col.tintHex||'')?col.tintHex:'#ffffff',tint=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];if(r===100&&g===100&&b===100&&tintAmount===0)return null;const tmp=document.createElement('canvas');tmp.width=Math.max(1,Math.round(c.w));tmp.height=Math.max(1,Math.round(c.h));const t=tmp.getContext('2d',{willReadFrequently:true});t.drawImage(img,c.x,c.y,c.w,c.h,0,0,c.w,c.h);try{const im=t.getImageData(0,0,tmp.width,tmp.height),d=im.data;for(let i=0;i<d.length;i+=4){const lum=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=clamp(Math.round(d[i]*r/100*(1-tintAmount)+(lum*tint[0]/255)*tintAmount),0,255);d[i+1]=clamp(Math.round(d[i+1]*g/100*(1-tintAmount)+(lum*tint[1]/255)*tintAmount),0,255);d[i+2]=clamp(Math.round(d[i+2]*b/100*(1-tintAmount)+(lum*tint[2]/255)*tintAmount),0,255);}t.putImageData(im,0,0);}catch(_){return null;}return tmp;}
function paintLayer(context,l){if(!l.visible)return;const a=asset(l),img=loadImg(l.assetId);if(!a||!img||(!img.complete&&!a.src))return;const t=l.transform,c=l.crop;if(c.w<=0||c.h<=0)return;const source=rgbCanvas(img,l);context.save();context.globalAlpha=clamp(num(t.opacity,1),0,1);context.filter=colorFilter(l.color);context.translate(t.x,t.y);context.rotate(t.rotationDeg*Math.PI/180);context.scale(t.scaleX*(t.flipX?-1:1),t.scaleY*(t.flipY?-1:1));try{if(source)context.drawImage(source,0,0,c.w,c.h,-c.w*(t.anchorX??.5),-c.h*(t.anchorY??.5),c.w,c.h);else context.drawImage(img,c.x,c.y,c.w,c.h,-c.w*(t.anchorX??.5),-c.h*(t.anchorY??.5),c.w,c.h);}catch(_){}context.restore();}
function resolvedLayers(view,animation,frameId,seen=new Set()){
  const key=animation+'::'+frameId;if(seen.has(key))return [];
  seen.add(key);const a=project.animations.find(x=>x.id===animation);
  const f=a?.frames.find(x=>x.id===frameId);let base=[];
  if(f?.reuse?.animation&&f.reuse.frame)base=resolvedLayers(view,f.reuse.animation,f.reuse.frame,seen);
  const local=project.scenes[view]?.[animation]?.[frameId]||[];
  return base.concat(local);
}
function posedLayers(view,animation,frameId){const layers=resolvedLayers(view,animation,frameId),rig=project.rigs?.[view],api=window.SuperMagicSkeleton;if(!rig||!api)return layers;return api.applyPoseToLayers(layers,rig,project.poses?.[view]?.[animation]?.[frameId]||{});}
function renderTo(context,view=currentView,animation=currentAnimation,frameId=currentFrame){context.clearRect(0,0,W(),H());for(const l of posedLayers(view,animation,frameId))paintLayer(context,l);}
function localPoint(l,p){const t=l.transform,angle=-t.rotationDeg*Math.PI/180,dx=p.x-t.x,dy=p.y-t.y;const rx=dx*Math.cos(angle)-dy*Math.sin(angle),ry=dx*Math.sin(angle)+dy*Math.cos(angle);return {x:rx/(t.scaleX*(t.flipX?-1:1)),y:ry/(t.scaleY*(t.flipY?-1:1))};}
function layerCorners(l){const t=l.transform,c=l.crop,ax=t.anchorX??.5,ay=t.anchorY??.5;const pts=[[-c.w*ax,-c.h*ay],[c.w*(1-ax),-c.h*ay],[c.w*(1-ax),c.h*(1-ay)],[-c.w*ax,c.h*(1-ay)]];const rad=t.rotationDeg*Math.PI/180;return pts.map(([x,y])=>{x*=t.scaleX*(t.flipX?-1:1);y*=t.scaleY*(t.flipY?-1:1);return {x:t.x+x*Math.cos(rad)-y*Math.sin(rad),y:t.y+x*Math.sin(rad)+y*Math.cos(rad)};});}
function rotationHandle(l,corners){const t=l.transform,top={x:(corners[0].x+corners[1].x)/2,y:(corners[0].y+corners[1].y)/2};const angle=t.rotationDeg*Math.PI/180;return {x:top.x+32*Math.sin(angle),y:top.y-32*Math.cos(angle)};}
function cropHandles(l){const pts=layerCorners(l);return [pts[0],pts[1],pts[2],pts[3],...Array.from({length:4},(_,i)=>({x:(pts[i].x+pts[(i+1)%4].x)/2,y:(pts[i].y+pts[(i+1)%4].y)/2}))];}
function draw(){
 ctx.clearRect(0,0,W(),H());
 const ref=project.editor?.reference;
 if(ref?.enabled){const tmp=document.createElement('canvas');tmp.width=W();tmp.height=H();renderTo(tmp.getContext('2d'),ref.view,ref.animation,ref.frame);ctx.save();ctx.globalAlpha=clamp(num(ref.alpha,.3),.05,.9);ctx.drawImage(tmp,0,0);ctx.restore();}
 for(const layer of posedLayers(currentView,currentAnimation,currentFrame))paintLayer(ctx,layer);
 octx.clearRect(0,0,W(),H());octx.save();
 if(showGrid){octx.strokeStyle='#5978b04c';octx.lineWidth=1;const step=gridSize;for(let x=0;x<=W();x+=step){octx.beginPath();octx.moveTo(x+.5,0);octx.lineTo(x+.5,H());octx.stroke();}for(let y=0;y<=H();y+=step){octx.beginPath();octx.moveTo(0,y+.5);octx.lineTo(W(),y+.5);octx.stroke();}}
 if(showGuides){octx.strokeStyle='#88a0cd99';octx.setLineDash([7,7]);octx.beginPath();octx.moveTo(W()/2,0);octx.lineTo(W()/2,H());octx.moveTo(0,H()/2);octx.lineTo(W(),H()/2);octx.stroke();octx.setLineDash([]);}
 if(showRulers){octx.fillStyle='#101a2ada';octx.fillRect(0,0,W(),19);octx.fillRect(0,0,25,H());octx.font='11px monospace';octx.fillStyle='#dde5ff';octx.strokeStyle='#ccd4eb';for(let x=0;x<=W();x+=gridSize){octx.beginPath();octx.moveTo(x,14);octx.lineTo(x,19);octx.stroke();if(x>25)octx.fillText(String(x),x+2,11);}for(let y=gridSize;y<=H();y+=gridSize){octx.beginPath();octx.moveTo(19,y);octx.lineTo(25,y);octx.stroke();octx.save();octx.translate(12,y+12);octx.rotate(-Math.PI/2);octx.fillText(String(y),0,0);octx.restore();}octx.fillStyle='#283659';octx.fillRect(0,0,25,19);octx.fillStyle='#fff';octx.fillText('0',4,12);}
 octx.restore();
 const l=sel();if(!l||playing)return;if(selectedLayerIds.size>1){const box=selectionBounds(),handles=groupHandles(box);octx.save();octx.strokeStyle='#f7c66d';octx.lineWidth=2/zoom;octx.setLineDash([6/zoom,4/zoom]);octx.strokeRect(box.x,box.y,box.w,box.h);octx.setLineDash([]);octx.fillStyle='#f8e0a4';for(const h of handles){octx.fillRect(h.x-6/zoom,h.y-6/zoom,12/zoom,12/zoom);}octx.restore();return;}const pts=layerCorners(l),rot=rotationHandle(l,pts);octx.save();octx.strokeStyle=cropOnCanvas?'#ffc878':'#b9a6ff';octx.lineWidth=2/zoom;octx.fillStyle=cropOnCanvas?'#fff0d0':'#f6f0ff';octx.setLineDash([6/zoom,4/zoom]);octx.beginPath();octx.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))octx.lineTo(p.x,p.y);octx.closePath();octx.stroke();octx.setLineDash([]);
 if(!cropOnCanvas){const top={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};octx.beginPath();octx.moveTo(top.x,top.y);octx.lineTo(rot.x,rot.y);octx.stroke();octx.beginPath();octx.arc(rot.x,rot.y,7/zoom,0,Math.PI*2);octx.fill();octx.stroke();}
 for(const p of (cropOnCanvas?cropHandles(l):pts)){octx.fillRect(p.x-5/zoom,p.y-5/zoom,10/zoom,10/zoom);octx.strokeRect(p.x-5/zoom,p.y-5/zoom,10/zoom,10/zoom);}octx.restore();}
function pointer(e){const r=overlay.getBoundingClientRect();return {x:(e.clientX-r.left)*W()/r.width,y:(e.clientY-r.top)*H()/r.height};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function findPart(p){for(const l of scene().slice().reverse()){if(!l.visible||l.locked)continue;const q=localPoint(l,p),c=l.crop,t=l.transform,ax=t.anchorX??.5,ay=t.anchorY??.5;if(q.x>=-c.w*ax&&q.x<=c.w*(1-ax)&&q.y>=-c.h*ay&&q.y<=c.h*(1-ay))return l;}return null;}
function cropByHandle(l,original,q,handle){const c=original.crop,t=original.transform;
 let x=c.x,y=c.y,x2=c.x+c.w,y2=c.y+c.h;const sx=c.x+q.x+c.w*(t.anchorX??.5),sy=c.y+q.y+c.h*(t.anchorY??.5);
 const min=8,a=asset(l);
 if([0,3,7].includes(handle))x=clamp(sx,0,x2-min);if([1,2,5].includes(handle))x2=clamp(sx,x+min,a.width);
 if([0,1,4].includes(handle))y=clamp(sy,0,y2-min);if([2,3,6].includes(handle))y2=clamp(sy,y+min,a.height);
 const nc={x:Math.round(x),y:Math.round(y),w:Math.round(x2-x),h:Math.round(y2-y)};
 const ax=t.anchorX??.5,ay=t.anchorY??.5,ox=c.x+c.w*ax,oy=c.y+c.h*ay,nx=nc.x+nc.w*ax,ny=nc.y+nc.h*ay;
 const dx=(nx-ox)*t.scaleX*(t.flipX?-1:1),dy=(ny-oy)*t.scaleY*(t.flipY?-1:1),rad=t.rotationDeg*Math.PI/180;
 l.crop=nc;l.transform.x=t.x+dx*Math.cos(rad)-dy*Math.sin(rad);l.transform.y=t.y+dx*Math.sin(rad)+dy*Math.cos(rad);
}
overlay.addEventListener('pointerdown',e=>{if(e.button!==0||playing)return;const p=pointer(e),multi=selectedLayers(),group=multi.length>1?selectionBounds(multi):null;let mode=null,handle=-1;
 if(!e.ctrlKey&&!e.metaKey&&group){handle=groupHandles(group).findIndex(h=>dist(p,h)<14/zoom);if(handle>=0)mode='groupScale';}
 const primary=sel();if(!mode&&primary&&!primary.locked&&!e.ctrlKey&&!e.metaKey&&multi.length===1){const corners=layerCorners(primary),rot=rotationHandle(primary,corners);if(cropOnCanvas){handle=cropHandles(primary).findIndex(h=>dist(p,h)<14/zoom);if(handle>=0)mode='crop';}else if(dist(p,rot)<14/zoom)mode='rotate';else if(corners.some(h=>dist(p,h)<13/zoom))mode='scale';}
 const hit=mode?null:findPart(p);
 if(e.ctrlKey||e.metaKey){if(hit){setSelected(hit.id,{toggle:true});}e.preventDefault();return;}
 if(!mode){if(hit){if(!selectedLayerIds.has(hit.id))setSelected(hit.id);mode=selectedLayerIds.size>1?'groupMove':'move';}else{setSelected(null);return;}}
 const chosen=sel();if(!chosen)return;recordHistory();const selected=selectedLayers().filter(l=>!l.locked);if(!selected.length)return;
 const box=selectionBounds(selected);drag={mode,handle,start:p,original:clone(chosen.transform),crop:clone(chosen.crop),angle:Math.atan2(p.y-chosen.transform.y,p.x-chosen.transform.x),distance:Math.max(10,dist(p,chosen.transform)),groupBox:box,groupOriginal:selected.map(l=>({id:l.id,transform:clone(l.transform)}))};overlay.setPointerCapture(e.pointerId);e.preventDefault();});
overlay.addEventListener('pointermove',e=>{if(!drag)return;const p=pointer(e),l=sel();if(!l)return;const t=l.transform,d=drag;
 if(d.mode==='groupMove'||d.mode==='groupScale'){const b=d.groupBox,dx=p.x-d.start.x,dy=p.y-d.start.y;let factor=1;if(d.mode==='groupScale'){const pivot={x:b.cx,y:b.cy};factor=clamp(dist(p,pivot)/Math.max(1,dist(d.start,pivot)),.01,30);}for(const orig of d.groupOriginal){const item=scene().find(x=>x.id===orig.id);if(!item)continue;const q=item.transform,o=orig.transform;if(d.mode==='groupMove'){q.x=o.x+dx;q.y=o.y+dy;}else{q.x=b.cx+(o.x-b.cx)*factor;q.y=b.cy+(o.y-b.cy)*factor;q.scaleX=clamp(o.scaleX*factor,.001,30);q.scaleY=clamp(o.scaleY*factor,.001,30);}if(snapGrid&&d.mode==='groupMove'){q.x=Math.round(q.x/gridSize)*gridSize;q.y=Math.round(q.y/gridSize)*gridSize;}}}
 else if(d.mode==='move'){t.x=Math.round(d.original.x+p.x-d.start.x);t.y=Math.round(d.original.y+p.y-d.start.y);if(snapGrid){t.x=Math.round(t.x/gridSize)*gridSize;t.y=Math.round(t.y/gridSize)*gridSize;}}
 else if(d.mode==='rotate'){const angle=Math.atan2(p.y-t.y,p.x-t.x);t.rotationDeg=Math.round((d.original.rotationDeg+(angle-d.angle)*180/Math.PI)*10)/10;}
 else if(d.mode==='scale'){const ratio=clamp(dist(p,t)/d.distance,.02,30);t.scaleX=clamp(d.original.scaleX*ratio,.005,30);t.scaleY=clamp(d.original.scaleY*ratio,.005,30);}
 else if(d.mode==='crop'){const original={crop:d.crop,transform:d.original};const q=localPoint({transform:d.original},p);cropByHandle(l,original,q,d.handle);}draw();renderInspector();});
overlay.addEventListener('pointerup',()=>{drag=null;});overlay.addEventListener('pointercancel',()=>{drag=null;});
function resizeScopeBuckets(scope){const out=[];const views=(scope==='all'||scope==='currentAnimation')?VIEW_IDS:[currentView];const animations=(scope==='all'||scope==='currentView')?project.animations:[anim()];for(const view of views)for(const a of animations)for(const f of a.frames){if(scope==='currentFrame'&&f.id!==currentFrame)continue;out.push({view,animation:a.id,frame:f.id,layers:scene(view,a.id,f.id)});}return out;}
function calculateAutoResizeTargets(options={}){const source=sel();if(!source)throw new Error('Select an example layer first.');const scope=options.scope||'all',matchBy=options.matchBy||'category';const ref=asset(source);if(!ref)throw new Error('Missing original image');const method=options.method||'sourceScale';const same= l=>(matchBy==='assetId'?l.assetId===source.assetId:matchBy==='name'?l.name===source.name:l.category===source.category);const seen=new Set();let list=[];for(const bucket of resizeScopeBuckets(scope))for(const layer of bucket.layers){if(!same(layer))continue;const key=bucket.view+'|'+bucket.animation+'|'+bucket.frame+'|'+layer.id;if(seen.has(key))continue;seen.add(key);const a=asset(layer);if(!a)continue;let sx,sy;if(method==='renderedHeight'){const factor=(source.crop.h*source.transform.scaleY)/Math.max(1,layer.crop.h);sx=sy=factor;}else if(method==='renderedWidth'){const factor=(source.crop.w*source.transform.scaleX)/Math.max(1,layer.crop.w);sx=sy=factor;}else{sx=source.transform.scaleX;sy=source.transform.scaleY;}list.push({layer,scaleX:clamp(sx,.001,30),scaleY:clamp(sy,.001,30)});}return list;}
function applyAutoResize(options={}){const targets=calculateAutoResizeTargets(options);if(!targets.length)throw new Error('No matching layers in selected scope');recordHistory();for(const item of targets){item.layer.transform.scaleX=item.scaleX;item.layer.transform.scaleY=item.scaleY;}renderInspector();renderLayers();draw();return targets.length;}
function openAutoResize(){if(!sel())return notify('Select a layer first');$('#autoResizeDialog').showModal();updateAutoResizeStats();}
function updateAutoResizeStats(){try{$('#autoResizeStats').textContent=`${calculateAutoResizeTargets({scope:$('#autoResizeScope').value,matchBy:$('#autoResizeMatch').value,method:$('#autoResizeMethod').value}).length} matching layers will be resized (including the current layer). Positions and rotations stay unchanged.`;}catch(e){$('#autoResizeStats').textContent=e.message;}}
function defaultPlacement(category,crop,view=currentView){const saved=project.defaults[view]?.[category];if(saved)return clone(saved);const targetH={body:H()*.74,fullBody:H()*.74,bodyPart:H()*.26,head:H()*.27,shirt:H()*.38,shorts:H()*.23,accessory:H()*.16}[category]||H()*.2;const scale=targetH/Math.max(1,crop.h);const targets={body:[.5,.625],fullBody:[.5,.625],bodyPart:[.5,.45],head:[.5,.145],shirt:[.5,.43],shorts:[.5,.65],accessory:[.5,.39]};const [px,py]=targets[category]|| (category.toLowerCase().includes('hair')||['face','eyes','eyebrows','nose','mouth','beard'].includes(category)?[.5,.15]:category.toLowerCase().includes('leg')||category.toLowerCase().includes('foot')||category.toLowerCase().includes('boot')||category.toLowerCase().includes('sock')?[.5,.76]:[.5,.5]);const calculated={x:W()*px,y:H()*py,scaleX:scale,scaleY:scale,rotationDeg:0,opacity:1,flipX:false,flipY:false,anchorX:.5,anchorY:.5};const defined=partDefinitions().find(p=>p.id===category)?.default;return defined?{...calculated,...defined}:calculated;}
async function readFile(file){if(!file.type.startsWith('image/'))throw new Error('Please upload PNG, JPEG or WebP images.');const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error(`Could not open ${file.name}`));i.src=src;});let bounds={x:0,y:0,w:img.naturalWidth,h:img.naturalHeight},opaque=false;try{const scratch=document.createElement('canvas');const factor=Math.min(1,350/Math.max(img.naturalWidth,img.naturalHeight));scratch.width=Math.max(1,Math.round(img.naturalWidth*factor));scratch.height=Math.max(1,Math.round(img.naturalHeight*factor));const sc=scratch.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,scratch.width,scratch.height);const pixels=sc.getImageData(0,0,scratch.width,scratch.height).data;let x0=scratch.width,y0=scratch.height,x1=-1,y1=-1,clear=0;for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++){const al=pixels[(y*scratch.width+x)*4+3];if(al>15){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}else clear++;}opaque=clear===0;if(x1>=0&&clear>0){bounds={x:Math.max(0,Math.floor(x0/factor)),y:Math.max(0,Math.floor(y0/factor)),w:Math.min(img.naturalWidth,Math.ceil((x1-x0+1)/factor)),h:Math.min(img.naturalHeight,Math.ceil((y1-y0+1)/factor))};bounds.w=Math.min(bounds.w,img.naturalWidth-bounds.x);bounds.h=Math.min(bounds.h,img.naturalHeight-bounds.y);}}catch(_){}const id=uid('asset');project.assets[id]={name:file.name,fileRef:file.name,mime:file.type||'image/png',width:img.naturalWidth,height:img.naturalHeight,src};images.set(id,img);return {id,bounds,opaque};}
function addLayer(assetInfo,name,category,intoScene=scene(),replace=false,view=currentView){if(replace){const old=intoScene.slice().reverse().find(l=>l.category===category);if(old){const before=old.crop.h*old.transform.scaleY;old.assetId=assetInfo.id;old.crop=clone(assetInfo.bounds);const sc=before/Math.max(1,old.crop.h);old.transform.scaleX=sc;old.transform.scaleY=sc;old.name=name.replace(/\.[^.]+$/,'');return old;}}const t=defaultPlacement(category,assetInfo.bounds,view);const l={id:uid('layer'),name:name.replace(/\.[^.]+$/,''),category,assetId:assetInfo.id,visible:true,locked:false,transform:t,crop:clone(assetInfo.bounds)};insertOrdered(intoScene,l);return l;}
function addOneFrame(duplicate=true){const a=anim();const prev=frame(),f={id:uid('frame'),name:`${a.name} ${a.frames.length+1}`};const idx=a.frames.findIndex(x=>x.id===currentFrame);a.frames.splice(idx+1,0,f);for(const [view]of VIEWS){const dest=scene(view,currentAnimation,f.id);if(duplicate){const src=scene(view,currentAnimation,prev.id);dest.push(...src.map(l=>({...clone(l),id:uid('layer')})));}}currentFrame=f.id;return f;}
async function processFiles(fileList){const files=Array.from(fileList);if(!files.length)return;const category=$('#importCategory').value,sequential=$('#sequentialImport').checked&&files.length>1,replace=$('#replaceCategory').checked||sequential;const a=anim(),startIndex=a.frames.findIndex(f=>f.id===currentFrame);let hasOpaque=false,last=null;try{for(let i=0;i<files.length;i++){if(sequential&&i>0){const frameIndex=startIndex+i;if(frameIndex<a.frames.length){currentFrame=a.frames[frameIndex].id;}else{currentFrame=a.frames[a.frames.length-1].id;addOneFrame(true);}}const info=await readFile(files[i]);hasOpaque ||=info.opaque;last=addLayer(info,files[i].name,category,scene(),replace);}selectedLayer=last?.id||null;refresh();notify(`${files.length} image${files.length===1?'':'s'} imported${sequential?' into consecutive frames':''}.${hasOpaque?' Note: an image has no transparency.':''}`);}catch(err){notify(err.message||'Import failed.');}}
function setAnimation(id){stop();stopSpin();currentAnimation=id;currentFrame=anim().frames[0].id;clearSelection();refresh();}
function setFrame(id){currentFrame=id;clearSelection();renderFrames();renderLayers();renderInspector();draw();}
function setView(id){if(!VIEW_IDS.includes(id))return;stop();currentView=id;clearSelection();refresh();}
function stop(){if(playing){clearInterval(playing);playing=null;}$('#playBtn').textContent='▶ Play';}
function togglePlay(){if(playing){stop();draw();return;}const a=anim();if(a.frames.length<2){notify('Add at least two frames to preview animation.');return;}selectedLayer=null;refresh();$('#playBtn').textContent='❚❚ Pause';playing=setInterval(()=>{const a=anim(),i=a.frames.findIndex(f=>f.id===currentFrame);currentFrame=a.frames[(i+1)%a.frames.length].id;renderFrames();renderLayers();draw();},1000/a.fps);}

function exportProjectObject(options={}){
  project.schemaVersion=4;project.viewOrder=VIEW_IDS.slice();project.projectName=$('#projectName').value;project.assetStorage=options.assetStorage||$('#imageStorage').value||project.assetStorage||'bundled';project.savedAt=new Date().toISOString();
  const data=clone(project);
  if(data.assetStorage==='external'){
    for(const [id,a] of Object.entries(data.assets||{})){
      a.fileRef=a.fileRef||a.name||`${id}.png`;
      delete a.src;
    }
  }
  return data;
}
function standaloneProject(){const data=exportProjectObject({assetStorage:'bundled'});for(const [id,a] of Object.entries(data.assets)){if(!a.src)throw new Error('Image '+id+' is unresolved. Resolve external images before saving.');}return data;}
function saveJSON(){try{const data=standaloneProject();download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),slug(project.projectName)+'-sprite-project.json');notify('Standalone JSON saved, with all images embedded.');}catch(err){notify(err.message);}}
function projectZipData(){
 const data=standaloneProject(),entries=[];
 data.assetStorage='external';
 for(const [id,a] of Object.entries(data.assets)){
  const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(a.src);
  if(!match)throw new Error('Unsupported embedded image: '+id);
  const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[match[1]];
  const raw=atob(match[2]),content=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
  const name='images/'+id+'.'+ext;
  entries.push({name,data:content});a.fileRef=name;a.mime=match[1];delete a.src;
 }
 entries.unshift({name:'project.json',data:JSON.stringify(data,null,2)});
 return entries;
}
function saveZIP(){try{download(window.SuperMagicProjectArchive.pack(projectZipData()),slug(project.projectName)+'-sprite-project.zip');notify('ZIP saved with project.json and separate image files.');}catch(err){notify('Could not save ZIP: '+err.message);}}
function validateProjectData(data){if(!data||data.format!=='FootballSpriteStudio'||!data.assets||!Array.isArray(data.animations)||!data.animations.length||!data.animations.every(a=>a.id&&Array.isArray(a.frames)&&a.frames.length)||!data.scenes||!data.canvas)throw new Error('Invalid FootballSpriteStudio project');return data;}
async function readProjectPackage(file){
 if(!/\.zip$/i.test(file.name))return validateProjectData(JSON.parse(await file.text()));
 const entries=await window.SuperMagicProjectArchive.unpack(file);
 if(!entries.has('project.json'))throw new Error('ZIP missing project.json');
 const data=validateProjectData(JSON.parse(new TextDecoder().decode(entries.get('project.json'))));
 for(const [id,a] of Object.entries(data.assets)){
  const name=a.fileRef;
  if(!name||!entries.has(name))throw new Error('ZIP missing image for '+id+': '+name);
  const content=entries.get(name),mime=a.mime||(/\.jpe?g$/i.test(name)?'image/jpeg':/\.webp$/i.test(name)?'image/webp':'image/png');
  let binary='';for(let i=0;i<content.length;i+=16384)binary+=String.fromCharCode(...content.subarray(i,i+16384));
  a.src='data:'+mime+';base64,'+btoa(binary);
 }
 data.assetStorage='bundled';
 return data;
}
function mergeProjectData(input){
 const incoming=migrateProject(clone(validateProjectData(input)));
 if(incoming.canvas.width!==project.canvas.width||incoming.canvas.height!==project.canvas.height)throw new Error('Canvas sizes differ; resize a project before merging.');
 recordHistory();
 const assetIds=new Map(),animationIds=new Map();
 for(const [id,a] of Object.entries(incoming.assets)){
  if(!a.src)throw new Error('Imported image '+id+' is missing');
  const newId=uid('asset');assetIds.set(id,newId);project.assets[newId]=clone(a);loadImg(newId);
 }
 const remapLayer=l=>{const n=clone(l);n.id=uid('layer');if(!assetIds.has(n.assetId))throw new Error('Layer references unknown image');n.assetId=assetIds.get(n.assetId);return n;};
 for(const a of incoming.animations){
  const newId=uid('animation');animationIds.set(a.id,newId);
  const frameIds=new Map(),frames=a.frames.map(f=>{const id=uid('frame');frameIds.set(f.id,id);return {...clone(f),id};});
  project.animations.push({...clone(a),id:newId,frames});
  for(const view of VIEW_IDS){
   project.scenes[view]||={};project.scenes[view][newId]={};
   for(const f of a.frames){
    const layers=incoming.scenes[view]?.[a.id]?.[f.id]||[];
    project.scenes[view][newId][frameIds.get(f.id)]=layers.map(remapLayer);
   }
  }
 }
 if(incoming.partDefinitions?.parts?.length&&(!project.partDefinitions?.parts?.length))project.partDefinitions=clone(incoming.partDefinitions);
 refresh();
 return {assets:assetIds.size,animations:animationIds.size};
}
async function mergeProjectFile(file){try{const imported=await readProjectPackage(file);const summary=mergeProjectData(imported);notify('Merged '+summary.assets+' images and '+summary.animations+' animations. Undo is available.');}catch(err){notify('Could not merge project: '+err.message);}}

function slug(x){return String(x).trim().replace(/[^a-z0-9-_]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'sprite';}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
async function imageBlob(c){return await new Promise(r=>c.toBlob(r,'image/png'));}
async function exportPNG(){const c=document.createElement('canvas');c.width=W();c.height=H();renderTo(c.getContext('2d'));download(await imageBlob(c),`${slug(project.projectName)}-${currentView}-${currentAnimation}-${frame().name.replace(/\s+/g,'-')}.png`);notify('Transparent PNG exported.');}
async function exportSheet(){const frames=anim().frames,cols=Math.min(4,frames.length),rows=Math.ceil(frames.length/cols),c=document.createElement('canvas');c.width=W()*cols;c.height=H()*rows;if(c.width>16384||c.height>16384){notify('Sprite sheet is too large. Reduce canvas size or frame count.');return;}const sc=c.getContext('2d'),tmp=document.createElement('canvas');tmp.width=W();tmp.height=H();const t=tmp.getContext('2d');for(let i=0;i<frames.length;i++){renderTo(t,currentView,currentAnimation,frames[i].id);sc.drawImage(tmp,(i%cols)*W(),Math.floor(i/cols)*H());}download(await imageBlob(c),`${slug(project.projectName)}-${currentView}-${currentAnimation}-sheet.png`);notify(`Sprite sheet exported: ${cols} columns × ${rows} rows.`);}
// Small self-contained GIF89a encoder: global RGB332 palette and LZW-compressed frames.
// Alpha below 50% is transparent; no CDN or online encoder is required.
function encodeGIF(frames,width,height,delayCs){const bytes=[],u8=n=>bytes.push(n&255),u16=n=>{u8(n);u8(n>>8);},ascii=s=>{for(const ch of s)u8(ch.charCodeAt(0));};ascii('GIF89a');u16(width);u16(height);u8(0xf7);u8(0);u8(0);
for(let i=0;i<256;i++){const v=Math.max(0,i-1);u8(Math.round(((v>>5)&7)*255/7));u8(Math.round(((v>>2)&7)*255/7));u8(Math.round((v&3)*255/3));}
u8(0x21);u8(0xff);u8(11);ascii('NETSCAPE2.0');u8(3);u8(1);u16(0);u8(0);
for(const pixels of frames){u8(0x21);u8(0xf9);u8(4);u8(0x09);u16(delayCs);u8(0);u8(0);u8(0x2c);u16(0);u16(0);u16(width);u16(height);u8(0);u8(8);
const packed=gifLZW(pixels);for(let at=0;at<packed.length;at+=255){const section=packed.subarray(at,at+255);u8(section.length);for(const b of section)u8(b);}u8(0);}u8(0x3b);return new Blob([new Uint8Array(bytes)],{type:'image/gif'});}
function gifLZW(pixels){const clear=256,end=257,dict=new Map();let next=258,bits=9,buffer=0,used=0;const out=[];const emit=code=>{buffer|=code<<used;used+=bits;while(used>=8){out.push(buffer&255);buffer>>>=8;used-=8;}};emit(clear);if(!pixels.length){emit(end);if(used)out.push(buffer&255);return new Uint8Array(out);}let prev=pixels[0];for(let i=1;i<pixels.length;i++){const symbol=pixels[i],key=prev*256+symbol;if(dict.has(key)){prev=dict.get(key);continue;}emit(prev);if(next<4096){dict.set(key,next++);if(next>(1<<bits)&&bits<12)bits++;}else{emit(clear);dict.clear();next=258;bits=9;}prev=symbol;}emit(prev);emit(end);if(used)out.push(buffer&255);return new Uint8Array(out);}
function quantize(imageData){const d=imageData.data,r=new Uint8Array(d.length/4);for(let i=0,j=0;i<d.length;i+=4,j++){if(d[i+3]<128)r[j]=0;else {const code=((d[i]>>5)<<5)|((d[i+1]>>5)<<2)|(d[i+2]>>6);r[j]=Math.min(255,code+1);}}return r;}
async function exportGIF(){const a=anim();if(a.frames.length<2){notify('GIF needs at least two animation frames.');return;}const maxDim=480,scale=Math.min(1,maxDim/Math.max(W(),H())),w=Math.max(1,Math.round(W()*scale)),h=Math.max(1,Math.round(H()*scale));const src=document.createElement('canvas');src.width=W();src.height=H();const sm=document.createElement('canvas');sm.width=w;sm.height=h;const st=src.getContext('2d'),ct=sm.getContext('2d',{willReadFrequently:true}),indexed=[];$('#exportGIF').disabled=true;$('#exportGIF').textContent='Encoding…';try{for(const f of a.frames){renderTo(st,currentView,currentAnimation,f.id);ct.clearRect(0,0,w,h);ct.drawImage(src,0,0,w,h);indexed.push(quantize(ct.getImageData(0,0,w,h)));await new Promise(resolve=>setTimeout(resolve,0));}const blob=encodeGIF(indexed,w,h,Math.max(2,Math.round(100/a.fps)));download(blob,`${slug(project.projectName)}-${currentView}-${currentAnimation}.gif`);notify(`Animated GIF exported (${w} × ${h}, ${a.frames.length} frames).`);}catch(e){notify('GIF export failed: '+e.message);}finally{$('#exportGIF').disabled=false;$('#exportGIF').textContent='Export GIF';}}
async function exportTurntable(){
  const maxDim=480,scale=Math.min(1,maxDim/Math.max(W(),H())),w=Math.round(W()*scale),h=Math.round(H()*scale);
  const source=document.createElement('canvas'),scaled=document.createElement('canvas');source.width=W();source.height=H();scaled.width=w;scaled.height=h;
  const src=source.getContext('2d'),dst=scaled.getContext('2d',{willReadFrequently:true}),frames=[];
  $('#exportTurntable').disabled=true;
  try{for(const view of VIEW_IDS){renderTo(src,view,currentAnimation,currentFrame);dst.clearRect(0,0,w,h);dst.drawImage(source,0,0,w,h);frames.push(quantize(dst.getImageData(0,0,w,h)));}
  download(encodeGIF(frames,w,h,35),`${slug(project.projectName)}-${currentAnimation}-turntable.gif`);notify('Eight-direction turntable GIF exported.');
  }catch(e){notify('Turntable export failed: '+e.message);}finally{$('#exportTurntable').disabled=false;}
}
function resetProject(){stopSpin();if(!confirm('Discard the current project and start a new one?'))return;stop();project=createProject();historyPast=[];historyFuture=[];images.clear();currentView='front';currentAnimation='stand';currentFrame='stand_1';selectedLayer=null;$('#projectName').value=project.projectName;updateDimension();refresh();notify('New project created.');}
async function loadProject(file){try{const data=await readProjectPackage(file);stop();stopSpin();project=migrateProject(data);project.defaults ||= {};images.clear();historyPast=[];historyFuture=[];currentView='front';currentAnimation=project.animations[0].id;currentFrame=project.animations[0].frames[0].id;clearSelection();$('#projectName').value=project.projectName||'Football character';updateDimension();syncEditorState();for(const [id,a] of Object.entries(project.assets)){if(a.src)loadImg(id);}refresh();historyButtons();window.SuperMagicAssetStudioAPI?.applyUIOptions?.();notify('Opened '+Object.keys(project.assets).length+' image asset(s).');}catch(err){notify('Could not open project: '+err.message);}}
async function resolveExternalImages(fileList){const files=Array.from(fileList||[]);if(!files.length)return;let matched=0;for(const file of files){const found=Object.entries(project.assets).find(([id,a])=>!a.src&&((a.fileRef||a.name||'').replace(/\\/g,'/').split('/').pop().toLowerCase()===file.name.toLowerCase()));if(!found)continue;const [id,a]=found;const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});a.src=src;a.mime=file.type||'image/png';a.name=a.name||file.name;a.fileRef=a.fileRef||file.name;images.delete(id);loadImg(id);matched++;}
refresh();notify(`Resolved ${matched} external image asset(s).`);}
function moveLayer(by){const ls=scene(),i=ls.findIndex(x=>x.id===selectedLayer),j=i+by;if(i<0||j<0||j>=ls.length)return;[ls[i],ls[j]]=[ls[j],ls[i]];renderLayers();draw();}
function deleteSelected(){const ls=scene(),i=ls.findIndex(x=>x.id===selectedLayer);if(i>=0){ls.splice(i,1);setSelected(null);}}
function defaultReset(l){l.transform=defaultPlacement(l.category,l.crop);renderInspector();draw();}
// Crop modal: drag source-space corners; only the saved crop rectangle changes.
let cropping=null,cropDrag=null;
const cropCanvas=$('#cropCanvas'),cropCtx=cropCanvas.getContext('2d');
function cropMetrics(){const a=asset(cropping.layer),pad=20,s=Math.min((520-2*pad)/a.width,(520-2*pad)/a.height);return {s,x:(520-a.width*s)/2,y:(520-a.height*s)/2};}
function cropScreenPoint(x,y){const m=cropMetrics();return {x:m.x+x*m.s,y:m.y+y*m.s};}
function cropToSource(p){const m=cropMetrics();return {x:clamp((p.x-m.x)/m.s,0,asset(cropping.layer).width),y:clamp((p.y-m.y)/m.s,0,asset(cropping.layer).height)};}
function drawCrop(){if(!cropping)return;cropCtx.clearRect(0,0,520,520);const l=cropping.layer,img=loadImg(l.assetId),a=asset(l),m=cropMetrics(),c=cropping.rect;if(img?.complete&&img.naturalWidth)cropCtx.drawImage(img,m.x,m.y,a.width*m.s,a.height*m.s);cropCtx.strokeStyle='#fff';cropCtx.lineWidth=2;cropCtx.strokeRect(m.x,m.y,a.width*m.s,a.height*m.s);cropCtx.fillStyle='#05091f9c';cropCtx.fillRect(m.x,m.y,a.width*m.s,(c.y)*m.s);cropCtx.fillRect(m.x,(c.y+c.h)*m.s,a.width*m.s,(a.height-c.y-c.h)*m.s);cropCtx.fillRect(m.x,m.y+c.y*m.s,c.x*m.s,c.h*m.s);cropCtx.fillRect(m.x+(c.x+c.w)*m.s,m.y+c.y*m.s,(a.width-c.x-c.w)*m.s,c.h*m.s);const x=m.x+c.x*m.s,y=m.y+c.y*m.s,w=c.w*m.s,h=c.h*m.s;cropCtx.strokeStyle='#d7c9ff';cropCtx.lineWidth=3;cropCtx.strokeRect(x,y,w,h);cropCtx.fillStyle='#fff';for(const p of [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]){cropCtx.fillRect(p[0]-6,p[1]-6,12,12);cropCtx.strokeRect(p[0]-6,p[1]-6,12,12);}}
function openCrop(){const l=sel();if(!l)return;cropping={layer:l,rect:clone(l.crop)};$('#cropDialog').showModal();drawCrop();}
function closeCrop(){cropping=null;$('#cropDialog').close();}
function cropPointer(e){const r=cropCanvas.getBoundingClientRect();return {x:(e.clientX-r.left)*520/r.width,y:(e.clientY-r.top)*520/r.height};}
cropCanvas.addEventListener('pointerdown',e=>{if(!cropping)return;const p=cropPointer(e),c=cropping.rect,m=cropMetrics(),corners=[[c.x,c.y],[c.x+c.w,c.y],[c.x+c.w,c.y+c.h],[c.x,c.y+c.h]].map(([x,y])=>cropScreenPoint(x,y));let mode=-1;for(let i=0;i<4;i++)if(dist(p,{x:corners[i].x,y:corners[i].y})<16){mode=i;break;}const q=cropToSource(p);if(mode===-1&&q.x>=c.x&&q.x<=c.x+c.w&&q.y>=c.y&&q.y<=c.y+c.h)mode=4;if(mode===-1)return;cropDrag={mode,original:clone(c),start:q};cropCanvas.setPointerCapture(e.pointerId);});
cropCanvas.addEventListener('pointermove',e=>{if(!cropDrag||!cropping)return;const q=cropToSource(cropPointer(e)),d=cropDrag,o=d.original,a=asset(cropping.layer),min=Math.max(3,Math.min(15,a.width*.015));let x=o.x,y=o.y,x2=o.x+o.w,y2=o.y+o.h;if(d.mode===4){x=clamp(o.x+q.x-d.start.x,0,a.width-o.w);y=clamp(o.y+q.y-d.start.y,0,a.height-o.h);x2=x+o.w;y2=y+o.h;}else{if(d.mode===0||d.mode===3)x=clamp(q.x,0,x2-min);if(d.mode===0||d.mode===1)y=clamp(q.y,0,y2-min);if(d.mode===1||d.mode===2)x2=clamp(q.x,x+min,a.width);if(d.mode===2||d.mode===3)y2=clamp(q.y,y+min,a.height);}cropping.rect={x:Math.round(x),y:Math.round(y),w:Math.round(x2-x),h:Math.round(y2-y)};drawCrop();});
cropCanvas.addEventListener('pointerup',()=>cropDrag=null);cropCanvas.addEventListener('pointercancel',()=>cropDrag=null);
$('#applyCrop').addEventListener('click',()=>{if(!cropping)return;cropping.layer.crop=clone(cropping.rect);closeCrop();renderInspector();draw();});$('#closeCrop').addEventListener('click',closeCrop);$('#cancelCrop').addEventListener('click',closeCrop);$('#resetCrop').addEventListener('click',()=>{if(!cropping)return;const a=asset(cropping.layer);cropping.rect={x:0,y:0,w:a.width,h:a.height};drawCrop();});
// Eight-direction migration and reusable mirrored scene clones.
function cloneView(source,destination,mirror=false,replace=true,allFrames=false,category="all"){
  const anims=allFrames?project.animations:[anim()];let copied=0;
  for(const a of anims)for(const f of a.frames){if(!allFrames&&f.id!==currentFrame)continue;
    const src=scene(source,a.id,f.id),target=scene(destination,a.id,f.id);
    const copies=src.filter(l=>category==="all"||l.category===category).map(l=>{const o=clone(l);o.id=uid('layer');if(mirror){o.transform.x=W()-o.transform.x;o.transform.rotationDeg=-o.transform.rotationDeg;o.transform.flipX=!o.transform.flipX;}return o;});
    if(replace&&category==="all")target.splice(0,target.length,...copies);else if(replace)target.splice(0,target.length,...target.filter(x=>x.category!==category),...copies);else target.push(...copies);copied+=copies.length;
  }return copied;
}
function migrateProject(d){
  d.defaults ||= {};d.scenes ||= {};const olds=[['threeQuarterFront','threeQuarterFrontRight'],['threeQuarterBack','threeQuarterBackRight']];
  for(const [old,newKey]of olds){if(d.scenes[old]&&!d.scenes[newKey])d.scenes[newKey]=clone(d.scenes[old]);if(d.defaults[old]&&!d.defaults[newKey])d.defaults[newKey]=clone(d.defaults[old]);}
  for(const id of VIEW_IDS)d.scenes[id] ||= {};
  // Legacy six-direction projects gain mirrored left-side diagonals.
  if((d.schemaVersion||1)<2){
    for(const [src,dest]of [['threeQuarterFrontRight','threeQuarterFrontLeft'],['threeQuarterBackRight','threeQuarterBackLeft']]){
      for(const a of d.animations)for(const f of a.frames){const source=d.scenes[src]?.[a.id]?.[f.id]||[];if(source.length&&!d.scenes[dest]?.[a.id]?.[f.id]){
        const ls=sceneMirror(source,d.canvas.width);(d.scenes[dest][a.id]||=( {} ))[f.id]=ls;
      }}
    }
  }
  d.schemaVersion=4;d.mode ||= 'bodyHead';d.assetStorage ||= 'bundled';d.partDefinitions ||= null;d.editor ||= {grid:false,rulers:false,gridSize:32,snap:false,reference:null};d.viewOrder=VIEW_IDS.slice();return d;
}
function sceneMirror(source,width){return source.map(l=>{const n=clone(l);n.id=uid('layer');n.transform.x=width-n.transform.x;n.transform.rotationDeg=-n.transform.rotationDeg;n.transform.flipX=!n.transform.flipX;return n;});}
function stepView(direction){const at=VIEW_IDS.indexOf(currentView);setView(VIEW_IDS[(at+direction+8)%8]);}
function stopSpin(){if(spinning){clearInterval(spinning);spinning=null;}const b=$('#spinView');if(b)b.textContent='▶ 360°';}
function renderGroupVisibility(){const el=$('#quickVisibility');if(!el)return;const groups={Head:['head','neck','face','eyes','eyebrows','nose','mouth','beard'],Hair:['hairFront','hairBack'],Clothes:['shirt','shorts','sockLeft','sockRight','bootLeft','bootRight'],Arms:['upperArmLeft','upperArmRight','forearmLeft','forearmRight','handLeft','handRight'],Legs:['upperLegLeft','upperLegRight','lowerLegLeft','lowerLegRight','footLeft','footRight'],Accessories:['accessory']};
  el.innerHTML=Object.entries(groups).map(([name,categories])=>{const l=scene().filter(x=>categories.includes(x.category));return `<button type="button" class="${l.length&&l.every(x=>!x.visible)?'off':''}" data-group="${name}" title="Toggle ${name}">${name} ${l.filter(x=>x.visible).length}/${l.length}</button>`;}).join('');}
function preferredPartForMode(mode=project.mode){
  if(mode==='fullBody')return 'fullBody';
  if(mode==='bodyHead')return 'body';
  if(mode==='standard')return 'torso';
  const parts=partDefinitions();
  return parts.find(p=>p.default)?.id||parts[0]?.id||Object.keys(CATEGORIES)[0];
}
function populateChoices(){
  const cats=Object.entries(CATEGORIES),allowed=new Set(cats.map(([id])=>id));
  const defaultPart=preferredPartForMode();
  const partSelect=$('#importCategory'),reuseSelect=$('#reuseCategory'),sourceSelect=$('#reuseSource');
  const priorPart=partSelect.value,priorReuse=reuseSelect.value,priorSource=sourceSelect.value;
  partSelect.innerHTML=cats.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
  partSelect.value=allowed.has(priorPart)?priorPart:(allowed.has(defaultPart)?defaultPart:cats[0]?.[0]||'');
  reuseSelect.innerHTML=queueOptions([['all','All layers'],...cats],allowed.has(priorReuse)||priorReuse==='all'?priorReuse:'all');
  reuseSelect.value=allowed.has(priorReuse)||priorReuse==='all'?priorReuse:'all';
  sourceSelect.innerHTML=VIEWS.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
  sourceSelect.value=VIEW_IDS.includes(priorSource)?priorSource:'threeQuarterFrontRight';
}
function guessView(filename){const v=filename.toLowerCase().replace(/\.[^.]+$/,'').replace(/[\s_-]+/g,'');
  for(const [regex,id] of [[/threequarterfrontleft|34frontleft|frontleft|diagonalfrontleft|qfl/, 'threeQuarterFrontLeft'],[/threequarterfrontright|34frontright|frontright|diagonalfrontright|qfr/,'threeQuarterFrontRight'],[/threequarterbackleft|34backleft|backleft|qbl/,'threeQuarterBackLeft'],[/threequarterbackright|34backright|backright|qbr/,'threeQuarterBackRight'],[/^left|viewleft|sideleft/,'left'],[/^right|viewright|sideright/,'right'],[/^back|rear|viewback/,'back'],[/^front|viewfront/,'front']])if(regex.test(v))return id;return currentView;
}
function guessCategory(filename){const n=filename.toLowerCase();for(const [key,rx]of [['hairFront',/hair.front|front.hair/],['hairBack',/hair.back|back.hair/],['body',/headless|body(?:_|\b)|torso/],['head',/head/],['nose',/nose/],['mouth',/mouth/],['eyes',/eyes/],['eyebrows',/brow/],['shorts',/shorts|pants/],['shirt',/shirt|jersey/],['accessory',/accessory|glasses|hat/],['handLeft',/hand.left|left.hand/],['handRight',/hand.right|right.hand/],['footLeft',/foot.left|left.foot/],['footRight',/foot.right|right.foot/],['upperLegLeft',/thigh.left|left.thigh/],['upperLegRight',/thigh.right|right.thigh/]])if(rx.test(n))return key;return $('#importCategory').value;
}
function guessAnimation(filename){const n=filename.toLowerCase();return n.includes('run')?'run':currentAnimation;}
function chooseFrame(aId,filename){const a=project.animations.find(x=>x.id===aId)||anim();const match=filename.match(/(?:run|walk|stand|frame|pose)[_-]?(\d+)/i);const n=match?parseInt(match[1],10):NaN;return Number.isFinite(n)&&n>=1&&n<=a.frames.length?a.frames[n-1].id:a.frames[0].id;}
function queueOptions(items,val){return items.map(([k,v])=>`<option value="${esc(k)}" ${k===val?'selected':''}>${esc(v)}</option>`).join('');}
function renderQueue(){const root=$('#importQueue');$('#applyQueue').style.display=pending.length?'block':'none';$('#clearQueue').style.display=pending.length?'block':'none';root.innerHTML=pending.map((p,i)=>{
  const a=project.animations.find(x=>x.id===p.animation)||anim();
  return `<div class="queue-row" data-queue="${i}"><div class="queue-head"><strong title="${esc(p.name)}">${esc(p.name)}</strong><button class="btn sm danger" data-remove="${i}">×</button></div>
 <div class="two"><select data-q="view" title="View">${queueOptions(VIEWS.map(x=>x.slice(0,2)),p.view)}</select><select data-q="category" title="Part">${queueOptions(Object.entries(CATEGORIES),p.category)}</select>
 <select data-q="animation" title="Animation">${queueOptions(project.animations.map(x=>[x.id,x.name]),p.animation)}</select><select data-q="frame" title="Frame">${queueOptions(a.frames.map(x=>[x.id,x.name]),p.frame)}</select></div>
 <label class="check"><input type="checkbox" data-q="mirror" ${p.mirror?'checked':''}/> Mirror horizontally</label></div>`;}).join('');}
async function stageFiles(files){
 const all=Array.from(files),jsons=all.filter(f=>f.name.toLowerCase().endsWith('.json')),pictures=all.filter(f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(f.name));
 for(const f of jsons){try{const data=JSON.parse(await f.text());if(data.format==='FootballSpriteStudio'&&pictures.length===0){await loadProject(f);continue;}if(data.format==='FootballSpriteStudio')throw new Error('Use Load JSON for a full project.');if(data.format==='SuperMagicParts'&&Array.isArray(data.parts)){recordHistory();setParts(data);project.mode='custom';renderMode();continue;}if(!Array.isArray(data.items))throw new Error('Expected asset bundle with an items array.');queueManifest=data;for(const item of data.items){if(!item.file&&!item.src)continue;const match=pictures.find(f=>f.name===item.file);if(!match&&!item.src)continue;let a=project.animations.find(x=>x.id===item.animation||x.name.toLowerCase()===String(item.animation).toLowerCase());if(!a){const name=item.animation||'Stand';a={id:uid('anim'),name,fps:8,frames:[]};project.animations.push(a);}if(item.frame&&!a.frames.find(x=>x.id===item.frame||x.name===item.frame))a.frames.push({id:String(item.frame),name:String(item.frame)});if(!a.frames.length)a.frames.push({id:uid('frame'),name:a.name+' 1'});
   pending.push({file:match||null,src:item.src||null,name:item.file||item.name||'Embedded asset',view:VIEW_IDS.includes(item.view)?item.view:currentView,category:CATEGORIES[item.category]?item.category:'bodyPart',animation:a.id,frame:item.frame?(a.frames.find(x=>x.id===item.frame||x.name===item.frame)?.id||a.frames[0].id):a.frames[0].id,mirror:!!item.mirror,meta:item});}
  }catch(err){notify('JSON import: '+err.message);}}
 for(const file of pictures)if(!pending.some(p=>p.file===file)){
   const animation=guessAnimation(file.name);pending.push({file,name:file.name,src:null,view:guessView(file.name),category:guessCategory(file.name),animation,frame:chooseFrame(animation,file.name),mirror:$('#importMirror').checked,meta:null});
 }
 if($('#sequentialImport').checked&&pictures.length>1){for(const [i,file]of pictures.entries()){
 const p=pending.find(x=>x.file===file);if(!p)continue;const a=project.animations.find(x=>x.id===p.animation)||anim();while(a.frames.length<=i)a.frames.push({id:uid('frame'),name:`${a.name} ${a.frames.length+1}`});p.frame=a.frames[i].id;
 }}
 renderQueue();if(pending.length)notify(`${pending.length} file(s) staged. Assign views/parts, then click Import assigned files.`);
}
async function loadEmbedded(src,name){if(!/^data:image\/(png|jpeg|webp);base64,/i.test(src))throw new Error('Embedded images must be data:image PNG/JPEG/WebP URLs.');const response=await fetch(src);const blob=await response.blob();return readFile(new File([blob],name,{type:blob.type}));}
async function applyQueue(){let count=0;try{for(const p of pending){const info=p.file?await readFile(p.file):await loadEmbedded(p.src,p.name);const target=scene(p.view,p.animation,p.frame);const l=addLayer(info,p.name,p.category,target,$('#replaceCategory').checked,p.view);
   if(p.meta?.crop){const c=p.meta.crop;l.crop={x:clamp(num(c.x),0,info.bounds.x+info.bounds.w-1),y:clamp(num(c.y),0,info.bounds.y+info.bounds.h-1),w:clamp(num(c.w,info.bounds.w),1,info.bounds.w),h:clamp(num(c.h,info.bounds.h),1,info.bounds.h)};}
   if(p.meta?.transform)l.transform={...l.transform,...p.meta.transform};if(p.meta?.color)l.color=clone(p.meta.color);if(p.meta?.order!==undefined){const i=target.indexOf(l);target.splice(i,1);target.splice(clamp(Math.round(num(p.meta.order)),0,target.length),0,l);}if(typeof p.meta?.visible==='boolean')l.visible=p.meta.visible;
   if(p.mirror)l.transform.flipX=!l.transform.flipX;count++;
 }pending=[];queueManifest=null;renderQueue();selectedLayer=null;refresh();notify(`${count} assigned layers imported, positions and colors saved in JSON.`);
 }catch(err){notify('Import failed: '+err.message);}}

// --- Version 3: asset structures, on-canvas tools, timeline references and undo ---
function snapshot(){const {assets,...rest}=project;return {data:clone(rest),assets:{...assets},view:currentView,animation:currentAnimation,frame:currentFrame,layer:selectedLayer,layers:[...selectedLayerIds]};}
function recordHistory(){if(restoring)return;historyPast.push(snapshot());if(historyPast.length>60)historyPast.shift();historyFuture=[];historyButtons();}
function historyButtons(){$('#undoBtn').disabled=!historyPast.length;$('#redoBtn').disabled=!historyFuture.length;}
function restoreSnapshot(snap){restoring=true;stop();stopSpin();project={...snap.data,assets:snap.assets};currentView=snap.view;currentAnimation=snap.animation;currentFrame=snap.frame;selectedLayer=snap.layer;selectedLayerIds=new Set(snap.layers||[snap.layer].filter(Boolean));images.clear();for(const id of Object.keys(project.assets))loadImg(id);$('#projectName').value=project.projectName;updateDimension();syncEditorState();refresh();restoring=false;historyButtons();}
function undo(){if(!historyPast.length)return;const previous=historyPast.pop();historyFuture.push(snapshot());restoreSnapshot(previous);notify('Undo');}
function redo(){if(!historyFuture.length)return;const next=historyFuture.pop();historyPast.push(snapshot());restoreSnapshot(next);notify('Redo');}
function partDefinitions(){return project.partDefinitions&&Array.isArray(project.partDefinitions.parts)?project.partDefinitions.parts:[];}
function exportPartsDefinition(mode='custom'){const parts=(mode==='custom'?partDefinitions():builtinPartsFor(mode)).map(p=>({id:p.id,name:p.name,group:p.group||'Custom',default:p.default||null}));return {format:'SuperMagicParts',schemaVersion:1,base:mode,parts};}
function setParts(data){if(!Array.isArray(data.parts)||data.parts.some(p=>!p.id||!p.name||!/^[A-Za-z][A-Za-z0-9_]{0,48}$/.test(p.id)))throw new Error('parts must have unique id and name; id uses letters/digits/_');const ids=data.parts.map(p=>p.id);if(new Set(ids).size!==ids.length)throw new Error('Duplicate part IDs in JSON');project.partDefinitions={format:'SuperMagicParts',schemaVersion:1,base:data.base||'custom',parts:data.parts.map((p,i)=>({id:p.id,name:p.name,group:p.group||'Custom',default:!!p.default,order:num(p.order,i)}))};project.partDefinitions.parts.sort((a,b)=>num(a.order,0)-num(b.order,0));populateChoices();renderMode();refresh();}
function partFormData(){return {id:$('#customPartId').value.trim(),name:$('#customPartName').value.trim(),group:$('#customPartGroup').value.trim()||'Custom',default:$('#customPartDefault').checked};}
function clearCustomPartForm(){['customPartId','customPartName'].forEach(id=>$("#"+id).value='');$('#customPartGroup').value='Custom';$('#customPartDefault').checked=false;delete $('#addCustomPart').dataset.editing;$('#addCustomPart').textContent='Add / update part';}
function customBaseParts(){const mode=$('#customBaseTemplate').value||'current';if(mode==='current')return partDefinitions().length?partDefinitions():builtinPartsFor('bodyHead');return builtinPartsFor(mode);}
function applyCustomBase(merge=false){const source=$('#customBaseTemplate').value||'current';const base=customBaseParts();const current=partDefinitions().map(p=>clone(p));let parts=[];if(merge){const map=new Map(current.map((p,i)=>[p.id,{...p,order:num(p.order,i)}]));for(const p of base){if(!map.has(p.id))map.set(p.id,{id:p.id,name:p.name,group:p.group||'Custom',default:!!p.default,order:map.size});}parts=[...map.values()];}else{parts=base.map((p,i)=>({id:p.id,name:p.name,group:p.group||'Custom',default:!!p.default,order:i}));}
 recordHistory();setParts({base:source,parts});project.mode='custom';clearCustomPartForm();notify(merge?`Merged ${source} parts into custom structure.`:`Custom structure replaced using ${source} as a base.`);}
function upsertCustomPart(spec){const name=String(spec.name||'').trim();let id=String(spec.id||'').trim();if(!name&&!id)throw new Error('Part name or id is required');if(!id)id=('custom_'+name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''));if(!/^[A-Za-z][A-Za-z0-9_]{0,48}$/.test(id))throw new Error('Part ID must start with a letter and use only letters, digits or _');const parts=partDefinitions().map((p,i)=>({...clone(p),order:num(p.order,i)}));const idx=parts.findIndex(p=>p.id===id);const part={id,name:name||id,group:spec.group||'Custom',default:!!spec.default,order:idx>=0?parts[idx].order:parts.length};if(idx>=0)parts[idx]=part; else parts.push(part); setParts({base:'custom',parts});project.mode='custom';clearCustomPartForm();notify(idx>=0?`Updated custom part ${part.name}.`:`Added custom part ${part.name}.`);}
function updateCustomPartField(id,key,value){const parts=partDefinitions().map((p,i)=>({...clone(p),order:num(p.order,i)}));const idx=parts.findIndex(p=>p.id===id);if(idx<0)return; if(key==='id'){if(!/^[A-Za-z][A-Za-z0-9_]{0,48}$/.test(value))throw new Error('Part ID must start with a letter and use only letters, digits or _');if(parts.some((p,i)=>i!==idx&&p.id===value))throw new Error('Part ID already exists');parts[idx].id=value;} else if(key==='default'){parts[idx].default=!!value;} else {parts[idx][key]=value||parts[idx][key];} setParts({base:'custom',parts});}
function moveCustomPart(id,delta){const parts=partDefinitions().map((p,i)=>({...clone(p),order:i}));const idx=parts.findIndex(p=>p.id===id),to=idx+delta; if(idx<0||to<0||to>=parts.length)return; [parts[idx],parts[to]]=[parts[to],parts[idx]]; parts.forEach((p,i)=>p.order=i); recordHistory();setParts({base:'custom',parts});}
function removeCustomPart(id){const parts=partDefinitions().map(p=>clone(p)).filter(p=>p.id!==id); recordHistory();setParts({base:'custom',parts}); notify('Custom part removed.');}
function renderCustomPartsEditor(){const host=$('#customPartsList'); if(!host)return; const parts=partDefinitions(); if(!parts.length){host.innerHTML='<div class="empty">No custom parts yet. Use a base structure or add a part.</div>'; return;} host.innerHTML=`<table><thead><tr><th style="width:20%">ID</th><th style="width:26%">Name</th><th style="width:18%">Group</th><th style="width:12%">Default</th><th style="width:24%">Actions</th></tr></thead><tbody>${parts.map((p,i)=>`<tr data-partid="${esc(p.id)}"><td><input data-part-field="id" value="${esc(p.id)}"></td><td><input data-part-field="name" value="${esc(p.name)}"></td><td><input data-part-field="group" value="${esc(p.group||'Custom')}"></td><td><label class="check"><input type="checkbox" data-part-field="default" ${p.default?'checked':''}> default</label></td><td><div class="row-actions"><button class="btn sm" data-part-action="edit">Edit</button><button class="btn sm" data-part-action="up" ${i===0?'disabled':''}>↑</button><button class="btn sm" data-part-action="down" ${i===parts.length-1?'disabled':''}>↓</button><button class="btn sm" data-part-action="delete">Delete</button></div></td></tr>`).join('')}</tbody></table>`;}
function editCustomPart(id){const p=partDefinitions().find(x=>x.id===id); if(!p)return; $('#customPartId').value=p.id; $('#customPartName').value=p.name; $('#customPartGroup').value=p.group||'Custom'; $('#customPartDefault').checked=!!p.default; $('#addCustomPart').dataset.editing=id; $('#addCustomPart').textContent='Save part';}
function renderMode(){
  const mode=project.mode||'bodyHead';
  $('#assetMode').value=mode;
  $('#imageStorage').value=project.assetStorage||'bundled';
  $('#customPartsPanel').style.display=mode==='custom'?'block':'none';
  $('#customBaseTemplate').value=(project.partDefinitions&&project.partDefinitions.base)||'current';
  const hints={fullBody:'Use one complete image per view/frame; choose “Full body” in the importer.',bodyHead:'Use “Body without head” and “Head” layers independently.',standard:'Use the standard modular schema defined for the modular 2.5D football character generator.',custom:'Custom mode can be simple or advanced. Start from full body, body+head, standard modular, or your current custom structure, then edit the parts directly in the UI.'};
  $('#assetModeHelp').textContent=hints[mode];
  renderCustomPartsEditor();
  $('#resolveImagesBtn').style.display=unresolvedAssets().length?'inline-flex':'none';
  $('#imageStorageHelp').textContent=(project.assetStorage||'bundled')==='bundled'
    ? 'Bundled JSON includes all images. Best for backups, AI review, and one-file sharing.'
    : `External JSON stores transforms and metadata only. ${unresolvedAssets().length} asset(s) currently need separate PNG files.`;
  applyModeCategories();
}
function renderClipControls(){const select=$('#clipSource'),prev=select.value;select.innerHTML=project.animations.filter(a=>a.id!==currentAnimation).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');if([...select.options].some(o=>o.value===prev))select.value=prev;const a=project.animations.find(x=>x.id===select.value);if(a){$('#clipStart').max=a.frames.length;$('#clipEnd').max=a.frames.length;if(+$('#clipEnd').value>a.frames.length||+$('#clipEnd').value<1)$('#clipEnd').value=a.frames.length;}}
function insertLinkedClip(){const a=project.animations.find(a=>a.id===$('#clipSource').value),target=anim();if(!a||a===target)return notify('Choose another source animation.');const start=clamp(Math.round(num($('#clipStart').value,1)),1,a.frames.length),end=clamp(Math.round(num($('#clipEnd').value,a.frames.length)),start,a.frames.length),repeats=clamp(Math.round(num($('#clipRepeats').value,1)),1,20);recordHistory();let n=0;for(let loop=0;loop<repeats;loop++)for(let i=start-1;i<end;i++){const sf=a.frames[i],f={id:uid('frame'),name:`↪ ${a.name}: ${sf.name}`,reuse:{animation:a.id,frame:sf.id}};target.frames.push(f);n++;}setFrame(target.frames.at(-n).id);notify(`Linked ${n} source frames. Linked layers stay synchronized.`);}
function unlinkCurrentFrame(){const f=frame();if(!f.reuse)return notify('Current frame is not linked.');recordHistory();for(const view of VIEW_IDS){const resolved=resolvedLayers(view,f.reuse.animation,f.reuse.frame);const local=scene(view,currentAnimation,f.id);local.unshift(...resolved.map(l=>({...clone(l),id:uid('layer')})));}delete f.reuse;renderFrames();draw();notify('Frame now contains editable independent layers.');}
function setReference(view=currentView,animation=currentAnimation,frameId=currentFrame,alpha=.3){project.editor ||= {};project.editor.reference={enabled:true,view,animation,frame:frameId,alpha:clamp(alpha,.05,.9)};renderReferenceControls();draw();notify('30% reference enabled (not included in exports).');}
function renderReferenceControls(){const e=project.editor||(project.editor={});const r=e.reference||{};$('#referenceView').innerHTML=queueOptions(VIEWS.map(v=>v.slice(0,2)),r.view||currentView);$('#referenceAnimation').innerHTML=queueOptions(project.animations.map(a=>[a.id,a.name]),r.animation||currentAnimation);const a=project.animations.find(a=>a.id===$('#referenceAnimation').value)||anim();$('#referenceFrame').innerHTML=queueOptions(a.frames.map(f=>[f.id,f.name]),r.frame||a.frames[0].id);$('#referenceOpacity').value=Math.round((r.alpha??.3)*100);}
function syncEditorState(){const e=project.editor||{};showGrid=!!e.grid;showRulers=!!e.rulers;gridSize=clamp(num(e.gridSize,32),8,256);snapGrid=!!e.snap;$('#gridToggle').classList.toggle('active',showGrid);$('#rulerToggle').classList.toggle('active',showRulers);$('#cropTool').classList.toggle('crop-active',cropOnCanvas);$('#gridSize').value=gridSize;$('#snapGrid').checked=snapGrid;}
function toggleCrop(){cropOnCanvas=!cropOnCanvas;$('#cropTool').classList.toggle('crop-active',cropOnCanvas);renderInspector();draw();notify(cropOnCanvas?'Crop mode: drag any of 8 orange handles. Resize and rotate remain available when toggled off.':'Transform mode: drag to resize or rotate.');}
function calcBox(l){const pts=layerCorners(l),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
function geometryAutoFit(){const l=sel();if(!l)return;const list=resolvedLayers(currentView,currentAnimation,currentFrame).filter(x=>x!==l&&x.visible);if(!list.length)return notify('Add a body/head/reference layer before auto-fitting.');
 const cat=l.category;const headParts=['head','neck','hairFront','hairBack','face','eyes','eyebrows','nose','mouth','beard'];const clothing=['shirt','shorts','sockLeft','sockRight','bootLeft','bootRight'];
 const priority= headParts.includes(cat)?(['hairFront','hairBack','face','eyes','eyebrows','nose','mouth','beard'].includes(cat)?['head','face','body','fullBody']:['body','fullBody','torso']):clothing.includes(cat)?['body','fullBody','torso','pelvis']:['body','fullBody','torso','head'];
 const target=priority.map(c=>list.findLast(x=>x.category===c)).find(Boolean)||list.at(-1),box=calcBox(target),c=l.crop; if(!c.w||!c.h)return;
 const placements={head:[.5,-.03,.31],neck:[.5,.02,.16],hairFront:[.5,.16,.85],hairBack:[.5,.14,.88],face:[.5,.5,.63],eyes:[.5,.41,.50],eyebrows:[.5,.32,.53],nose:[.5,.55,.17],mouth:[.5,.75,.30],beard:[.5,.78,.52],shirt:[.5,.28,.82],shorts:[.5,.58,.70],sockLeft:[.35,.81,.18],sockRight:[.65,.81,.18],bootLeft:[.35,.95,.23],bootRight:[.65,.95,.23],upperArmLeft:[.2,.29,.26],upperArmRight:[.8,.29,.26],forearmLeft:[.12,.48,.22],forearmRight:[.88,.48,.22],handLeft:[.10,.58,.15],handRight:[.90,.58,.15],upperLegLeft:[.36,.67,.27],upperLegRight:[.65,.67,.27],lowerLegLeft:[.36,.83,.20],lowerLegRight:[.65,.83,.20],footLeft:[.37,.97,.18],footRight:[.64,.97,.18],accessory:[.5,.40,.26]};
 const [cx,cy,relativeW]=placements[cat]||[.5,.5,.3];let width=box.w*relativeW;
 // Relative proportion when a small face part is being fitted to a head rather than a whole body.
 if(headParts.includes(cat)&&target.category==='head'){width=box.w*(relativeW||.6);}
 const scale=clamp(width/Math.max(1,c.w),.005,30);l.transform.scaleX=scale;l.transform.scaleY=scale;l.transform.rotationDeg=target.transform.rotationDeg;
 l.transform.x=box.x+box.w*cx;l.transform.y=box.y+box.h*cy;
 if(cat==='head'&&['body','fullBody','torso'].includes(target.category)){l.transform.y=box.y+box.h*.015;}
 renderInspector();draw();notify(`Geometry auto-fit: ${CATEGORIES[cat]||cat} aligned to ${target.name}. Review manually.`);
}
let contextTarget=null;
function openCameraContext(e,view,animation,frameId){e.preventDefault();contextTarget={view,animation,frame:frameId};const menu=$('#cameraMenu');menu.style.display='grid';menu.style.left=clamp(e.clientX,0,window.innerWidth-245)+'px';menu.style.top=clamp(e.clientY,0,window.innerHeight-95)+'px';}
$('#viewButtons').addEventListener('contextmenu',e=>{const v=e.target.closest('[data-view]');if(v)openCameraContext(e,v.dataset.view,currentAnimation,currentFrame);});
$('#frameButtons').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-frame]');if(b)openCameraContext(e,currentView,currentAnimation,b.dataset.frame);});
$('#useCameraAsReference').addEventListener('click',()=>{if(contextTarget)setReference(contextTarget.view,contextTarget.animation,contextTarget.frame,.3);$('#cameraMenu').style.display='none';});
$('#clearCameraReference').addEventListener('click',()=>{project.editor.reference=null;draw();$('#cameraMenu').style.display='none';});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#cameraMenu'))$('#cameraMenu').style.display='none';});
$('#setReference').addEventListener('click',()=>setReference($('#referenceView').value,$('#referenceAnimation').value,$('#referenceFrame').value,num($('#referenceOpacity').value,30)/100));
$('#clearReference').addEventListener('click',()=>{project.editor.reference=null;draw();notify('Reference cleared.');});
$('#referenceAnimation').addEventListener('change',()=>{const a=project.animations.find(x=>x.id===$('#referenceAnimation').value);$('#referenceFrame').innerHTML=queueOptions(a.frames.map(f=>[f.id,f.name]),a.frames[0].id);});

$('#downloadPartsSchema').addEventListener('click',()=>{const spec=exportPartsDefinition('standard');download(new Blob([JSON.stringify(spec,null,2)],{type:'application/json'}),'supermagic-standard-parts.json');});
$('#loadPartsSchema').addEventListener('click',()=>$('#partsInput').click());
$('#partsInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());recordHistory();setParts(data);project.mode='custom';renderMode();notify('Custom parts schema imported.');}catch(err){notify(err.message);}e.target.value='';});
$('#applyCustomBase').addEventListener('click',()=>applyCustomBase(false));
$('#mergeCustomBase').addEventListener('click',()=>applyCustomBase(true));
$('#exportCustomParts').addEventListener('click',()=>{const spec=exportPartsDefinition('custom');download(new Blob([JSON.stringify(spec,null,2)],{type:'application/json'}),`${slug(project.projectName||'custom-parts')}-parts.json`);notify('Custom parts JSON exported.');});
$('#addCustomPart').addEventListener('click',()=>{try{const spec=partFormData();recordHistory();upsertCustomPart(spec);}catch(err){notify(err.message);}});
$('#resetCustomPartForm').addEventListener('click',clearCustomPartForm);
$('#customPartsList').addEventListener('click',e=>{const row=e.target.closest('tr[data-partid]');if(!row)return;const id=row.dataset.partid;const action=e.target.dataset.partAction;if(!action)return;try{if(action==='edit'){editCustomPart(id);}else if(action==='up'){moveCustomPart(id,-1);}else if(action==='down'){moveCustomPart(id,1);}else if(action==='delete'){removeCustomPart(id);} }catch(err){notify(err.message);}});
$('#customPartsList').addEventListener('change',e=>{const row=e.target.closest('tr[data-partid]'); if(!row)return; const field=e.target.dataset.partField; if(!field)return; try{recordHistory(); updateCustomPartField(row.dataset.partid,field,field==='default'?e.target.checked:e.target.value.trim()); notify('Custom part updated.');}catch(err){notify(err.message); refresh();}});
$('#clipSource').addEventListener('change',()=>{const a=project.animations.find(a=>a.id===$('#clipSource').value);if(a)$('#clipEnd').value=a.frames.length;});
$('#appendClip').addEventListener('click',insertLinkedClip);
$('#unlinkFrame').addEventListener('click',unlinkCurrentFrame);
$('#layerTop').addEventListener('click',()=>{const l=sel();if(!l)return;const arr=scene(),i=arr.indexOf(l);if(i<0)return;arr.splice(i,1);arr.push(l);renderLayers();draw();});
$('#layerBottom').addEventListener('click',()=>{const l=sel();if(!l)return;const arr=scene(),i=arr.indexOf(l);if(i<0)return;arr.splice(i,1);arr.unshift(l);renderLayers();draw();});
let rowDragging=null;
$('#layersList').addEventListener('dragstart',e=>{const row=e.target.closest('[data-layer]');if(!row)return;rowDragging=row.dataset.layer;e.dataTransfer.effectAllowed='move';});
$('#layersList').addEventListener('dragover',e=>{const row=e.target.closest('[data-layer]');if(!row||!rowDragging)return;e.preventDefault();row.classList.add('drag-target');});
$('#layersList').addEventListener('dragleave',e=>e.target.closest('[data-layer]')?.classList.remove('drag-target'));
$('#layersList').addEventListener('drop',e=>{const row=e.target.closest('[data-layer]');if(!row||!rowDragging)return;e.preventDefault();const arr=scene(),from=arr.findIndex(l=>l.id===rowDragging),to=arr.findIndex(l=>l.id===row.dataset.layer);if(from>=0&&to>=0&&from!==to){recordHistory();arr.splice(to,0,arr.splice(from,1)[0]);renderLayers();draw();}rowDragging=null;});
$('#gridToggle').addEventListener('click',()=>{showGrid=!showGrid;project.editor.grid=showGrid;syncEditorState();draw();});
$('#rulerToggle').addEventListener('click',()=>{showRulers=!showRulers;project.editor.rulers=showRulers;syncEditorState();draw();});
$('#gridSize').addEventListener('change',e=>{gridSize=clamp(Math.round(num(e.target.value,32)),8,256);project.editor.gridSize=gridSize;syncEditorState();draw();});
$('#snapGrid').addEventListener('change',e=>{snapGrid=e.target.checked;project.editor.snap=snapGrid;draw();});
$('#cropTool').addEventListener('click',toggleCrop);
$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);
// Record pre-mutation state, not the expensive embedded image bytes, when controls change.
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ids=new Set(['reuseView','addAnimation','deleteAnimation','addFrame','duplicateFrame','deleteFrame','applyQueue','layerUp','layerDown','layerTop','layerBottom','deleteLayer','duplicateLayer','copyFrames','copyAnimations','resetLayer','fitLayer','autoFitLayer','flipX','flipY','toggleLock','saveDefault','applyCrop','replaceImage','newProject','canvasWidth','canvasHeight','setReference','clearReference','useCameraAsReference','clearCameraReference']);if(ids.has(b.id)||b.dataset.colorpreset||e.target.closest('[data-eye]')||e.target.closest('[data-group]'))recordHistory();},true);
document.addEventListener('change',e=>{if(e.target.closest('#inspectorContent')||['fps','canvasWidth','canvasHeight','projectName'].includes(e.target.id))recordHistory();},true);
// For navigation, retain a local reference. Frame source links are explicitly saved in project.animations[].frames[].reuse.
syncEditorState();historyButtons();


function closeMenus(){for(const m of document.querySelectorAll('.menu.open'))m.classList.remove('open');}
function toggleMenuButton(btn){const wrap=btn.closest('.menu');const open=wrap.classList.contains('open');closeMenus();if(!open)wrap.classList.add('open');}
function openHelpDialog(){$('#helpDialog').showModal();}
function openAIDialog(){$('#aiDialog').showModal();}
function allSceneBuckets(scope='currentFrame'){
  const buckets=[];
  if(scope==='currentFrame')return [{view:currentView,animation:currentAnimation,frame:currentFrame,layers:scene()}];
  if(scope==='currentAnimationCurrentView')return anim().frames.map(f=>({view:currentView,animation:currentAnimation,frame:f.id,layers:scene(currentView,currentAnimation,f.id)}));
  if(scope==='allCurrentView'){
    for(const a of project.animations)for(const f of a.frames)buckets.push({view:currentView,animation:a.id,frame:f.id,layers:scene(currentView,a.id,f.id)});
    return buckets;
  }
  for(const view of VIEW_IDS)for(const a of project.animations)for(const f of a.frames)buckets.push({view,animation:a.id,frame:f.id,layers:scene(view,a.id,f.id)});
  return buckets;
}
function layerMatches(layer,match={}){
  if(!match||!Object.keys(match).length)return true;
  if(match.id && layer.id!==match.id)return false;
  if(match.ids && Array.isArray(match.ids) && !match.ids.includes(layer.id))return false;
  if(match.name && String(layer.name).toLowerCase()!==String(match.name).toLowerCase())return false;
  if(match.nameContains && !String(layer.name).toLowerCase().includes(String(match.nameContains).toLowerCase()))return false;
  if(match.category && layer.category!==match.category)return false;
  if(match.assetId && layer.assetId!==match.assetId)return false;
  if(typeof match.visible==='boolean' && !!layer.visible!==match.visible)return false;
  return true;
}
function findLayers(match={},scope='currentFrame'){
  const found=[];
  for(const bucket of allSceneBuckets(scope)){
    bucket.layers.forEach((layer,index)=>{if(layerMatches(layer,match))found.push({...bucket,index,layer});});
  }
  return found;
}
function mergeLayerChanges(layer,changes={}){
  if(changes.name!==undefined)layer.name=changes.name;
  if(changes.category!==undefined)layer.category=changes.category;
  if(changes.visible!==undefined)layer.visible=!!changes.visible;
  if(changes.locked!==undefined)layer.locked=!!changes.locked;
  if(changes.crop){layer.crop={...layer.crop,...changes.crop};}
  if(changes.transform){layer.transform={...layer.transform,...changes.transform};}
  if(changes.color){layer.color={...(layer.color||{}),...changes.color};}
  if(changes.flipX!==undefined)layer.transform.flipX=!!changes.flipX;
  if(changes.flipY!==undefined)layer.transform.flipY=!!changes.flipY;
}
function createAnimationBySpec(spec={}){
  const name=(spec.name||'New animation').trim();
  const id=spec.id||uid('animation');
  if(project.animations.some(a=>a.id===id))throw new Error(`Animation ${id} exists already`);
  const frameNames=Array.isArray(spec.frames)&&spec.frames.length?spec.frames:[name+' 1'];
  const frames=frameNames.map((n,i)=>({id:(Array.isArray(spec.frameIds)&&spec.frameIds[i])||uid('frame'),name:String(n)}));
  project.animations.push({id,name,fps:clamp(Math.round(num(spec.fps,8)),1,30),frames});
  for(const [view] of VIEWS){project.scenes[view] ||= {};project.scenes[view][id] ||= {};for(const f of frames)project.scenes[view][id][f.id]=[];}
  return {id,name,frames:frames.length};
}
function addCustomPartSpec(spec={}){
  const before=partDefinitions().find(p=>p.id===spec.id);
  upsertCustomPart(spec);
  return {id:spec.id||partDefinitions().slice(-1)[0]?.id,name:spec.name,updated:!!before};
}
function setCustomPartsSpec(spec={}){
  if(spec.base){const base=['fullBody','bodyHead','standard','current'].includes(spec.base)?spec.base:'standard'; $('#customBaseTemplate').value=base; if(!Array.isArray(spec.parts)) applyCustomBase(false);}
  if(Array.isArray(spec.parts)){setParts({base:spec.base||'custom',parts:spec.parts}); project.mode='custom';}
  return exportPartsDefinition('custom');
}
function moveLayerMatch(match={},direction='front',scope='currentFrame'){
  const found=findLayers(match,scope); if(!found.length)return 0;
  for(const item of found){const arr=item.layers;const i=arr.findIndex(x=>x.id===item.layer.id); if(i<0)continue; const [l]=arr.splice(i,1); let dest=i;
    if(direction==='front')dest=arr.length; else if(direction==='back')dest=0; else if(direction==='up')dest=Math.min(arr.length,i+1); else if(direction==='down')dest=Math.max(0,i-1);
    arr.splice(dest,0,l);
  }
  return found.length;
}
async function runStructuredCommands(payload){
  const commands=Array.isArray(payload)?payload:Array.isArray(payload.commands)?payload.commands:null;
  if(!commands)throw new Error('Expected a JSON object with a commands array.');
  const output=[]; let mutated=false, historyTaken=false;
  const say=(msg,obj)=>output.push(obj!==undefined?`${msg}
${JSON.stringify(obj,null,2)}`:msg);
  const touch=()=>{if(!historyTaken){recordHistory();historyTaken=true;}mutated=true;};
  for(const [idx,cmd] of commands.entries()){
    if(!cmd||typeof cmd!=='object')throw new Error(`Command ${idx+1} is not an object`);
    const op=cmd.op;
    if(!op)throw new Error(`Command ${idx+1} has no op field`);
    switch(op){
      case 'createProject': {touch();project=createProject();project.projectName=String(cmd.name||'New character');project.mode=['fullBody','bodyHead','standard','custom'].includes(cmd.mode)?cmd.mode:'bodyHead';project.assetStorage=cmd.assetStorage==='external'?'external':'bundled';images.clear();currentView='front';currentAnimation='stand';currentFrame='stand_1';selectedLayer=null;$('#projectName').value=project.projectName;updateDimension();say('✔ New project created');break;}
      case 'setCanvas': {const w=Math.round(num(cmd.width,project.canvas.width)),h=Math.round(num(cmd.height,project.canvas.height));if(w<128||w>2048||h<128||h>2048)throw new Error('Canvas width/height must be 128–2048');touch();project.canvas={width:w,height:h};updateDimension();say(`✔ Canvas set to ${w} × ${h}`);break;}
      case 'addAsset': {const id=String(cmd.id||uid('asset'));if(project.assets[id])throw new Error('Asset ID already exists');const w=Math.round(num(cmd.width)),h=Math.round(num(cmd.height));if(w<1||h<1)throw new Error('Asset width and height must be positive');if(cmd.src&&!String(cmd.src).startsWith('data:image/'))throw new Error('Asset src must be a data:image URL; use fileRef for external images');touch();project.assets[id]={name:String(cmd.name||cmd.fileRef||id+'.png'),fileRef:String(cmd.fileRef||cmd.name||id+'.png'),width:w,height:h,mime:String(cmd.mime||'image/png'),...(cmd.src?{src:String(cmd.src)}:{})};if(cmd.src)loadImg(id);say('✔ Asset added',{id});break;}
      case 'addLayer': {const id=cmd.assetId;if(!project.assets[id])throw new Error('Unknown assetId: '+id);const a=project.assets[id],view=cmd.view||currentView,animation=cmd.animation||currentAnimation,frameId=cmd.frame||currentFrame;if(!VIEW_IDS.includes(view))throw new Error('Unknown view');const at=project.animations.find(a=>a.id===animation);if(!at||!at.frames.some(f=>f.id===frameId))throw new Error('Unknown animation/frame');const category=cmd.category||'accessory';if(!BASE_CATEGORIES[category]&&!partDefinitions().some(p=>p.id===category))throw new Error('Unknown part category');const crop={x:0,y:0,w:a.width,h:a.height,...cmd.crop};if(crop.x<0||crop.y<0||crop.w<=0||crop.h<=0||crop.x+crop.w>a.width||crop.y+crop.h>a.height)throw new Error('Crop is outside image bounds');touch();const layer={id:String(cmd.id||uid('layer')),name:String(cmd.name||a.name||category),category,assetId:id,visible:cmd.visible!==false,locked:!!cmd.locked,transform:{...defaultPlacement(category,crop,view),...(cmd.transform||{})},crop,color:{brightness:100,contrast:100,saturate:100,hue:0,sepia:0,red:100,green:100,blue:100,...(cmd.color||{})}};insertOrdered(scene(view,animation,frameId),layer);say('✔ Layer added',{id:layer.id,view,animation,frame:frameId});break;}
      case 'addFrame': {const target=project.animations.find(a=>a.id===(cmd.animation||currentAnimation));if(!target)throw new Error('Unknown animation');const id=String(cmd.id||uid('frame'));if(target.frames.some(f=>f.id===id))throw new Error('Frame ID already exists');touch();target.frames.push({id,name:String(cmd.name||`${target.name} ${target.frames.length+1}`),...(cmd.reuse?{reuse:cmd.reuse}:{})});for(const view of VIEW_IDS)scene(view,target.id,id);say('✔ Animation frame added',{id,animation:target.id});break;}
      case 'setProjectName': touch(); project.projectName=String(cmd.name||'Untitled project'); $('#projectName').value=project.projectName; say(`✔ Project name set to ${project.projectName}`); break;
      case 'setMode': if(!['fullBody','bodyHead','standard','custom'].includes(cmd.mode))throw new Error('Unsupported mode'); touch(); project.mode=cmd.mode; say(`✔ Mode set to ${cmd.mode}`); break;
      case 'setImageStorage': if(!['bundled','external'].includes(cmd.mode))throw new Error('Unsupported image storage'); touch(); project.assetStorage=cmd.mode; say(`✔ Image storage set to ${cmd.mode}`); break;
      case 'setView': if(!VIEW_IDS.includes(cmd.view))throw new Error('Unknown view'); setView(cmd.view); say(`✔ Current view set to ${cmd.view}`); break;
      case 'setAnimation': if(!project.animations.some(a=>a.id===cmd.animation))throw new Error('Unknown animation'); setAnimation(cmd.animation); say(`✔ Current animation set to ${cmd.animation}`); break;
      case 'setFrame': {const a=anim(); if(!a.frames.some(f=>f.id===cmd.frame))throw new Error('Unknown frame in current animation'); setFrame(cmd.frame); say(`✔ Current frame set to ${cmd.frame}`); break;}
      case 'createAnimation': {touch(); const info=createAnimationBySpec(cmd); say('✔ Animation created',info); break;}
      case 'addCustomPart': {touch(); const info=addCustomPartSpec(cmd); say('✔ Custom part added',info); break;}
      case 'setPartsDefinition': {touch(); const info=setCustomPartsSpec(cmd); say('✔ Custom parts definition updated',info); break;}
      case 'exportPartsDefinition': {say('Parts definition',exportPartsDefinition(cmd.mode||'custom')); break;}
      case 'selectLayer': {const found=findLayers(cmd.match||cmd,cmd.scope||'currentFrame'); if(!found.length)throw new Error('No matching layer found'); if(found[0].view!==currentView)setView(found[0].view); if(found[0].animation!==currentAnimation)setAnimation(found[0].animation); if(found[0].frame!==currentFrame)setFrame(found[0].frame); setSelected(found[0].layer.id); say(`✔ Selected layer ${found[0].layer.name} (${found[0].layer.id})`); break;}
      case 'setLayer': {if(!cmd.match||!Object.keys(cmd.match).length)throw new Error('setLayer requires a non-empty match selector');const found=findLayers(cmd.match,cmd.scope||'currentFrame'); if(!found.length)throw new Error('No matching layers found'); touch(); for(const f of found)mergeLayerChanges(f.layer,cmd.changes||{}); say(`✔ Updated ${found.length} layer(s)`); break;}
      case 'moveLayer': {if(!cmd.match||!Object.keys(cmd.match).length)throw new Error('moveLayer requires a non-empty match selector');touch(); const n=moveLayerMatch(cmd.match,cmd.direction||'front',cmd.scope||'currentFrame'); say(`✔ Reordered ${n} layer(s)`); break;}
      case 'deleteLayer': {if(!cmd.match||!Object.keys(cmd.match).length)throw new Error('deleteLayer requires a non-empty match selector');const found=findLayers(cmd.match,cmd.scope||'currentFrame'); touch(); let n=0; for(const f of [...found].reverse()){f.layers.splice(f.index,1); n++;} if(selectedLayer && !scene().some(l=>l.id===selectedLayer))selectedLayer=null; say(`✔ Deleted ${n} layer(s)`); break;}
      case 'autoResizeMatching': {const n=applyAutoResize(cmd);say(`✔ Auto-resized ${n} matching layers`);break;}
      case 'setReference': touch(); project.editor.reference={enabled:cmd.enabled!==false,view:cmd.view||currentView,animation:cmd.animation||currentAnimation,frame:cmd.frame||currentFrame,alpha:clamp(num(cmd.alpha,.3),.05,.9)}; say('✔ Reference overlay updated',project.editor.reference); break;
      case 'listCapabilities': say('UI capabilities',window.SuperMagicAssetStudioAPI.listCapabilities()); break;
      case 'getControlValue': say('UI control',window.SuperMagicAssetStudioAPI.getUIControl(cmd.id)); break;
      case 'setControlValue':{
        if(!window.SuperMagicAssetStudioAPI.setUIControl)throw Error('UI controls are not initialized');
        touch();const value=window.SuperMagicAssetStudioAPI.setUIControl(cmd.id,cmd.value);
        say('Updated UI control '+cmd.id,{value});break;
      }
      case 'invokeControl':{
        if(!window.SuperMagicAssetStudioAPI.invokeUIAction)throw Error('UI controls are not initialized');
        const result=window.SuperMagicAssetStudioAPI.invokeUIAction(cmd.id);
        say('Invoked UI action',result);break;
      }
      case 'paint':{
        const paintAPI=window.SuperMagicPaintAPI;
        if(!paintAPI?.performPaintOperation)throw Error('Paint API unavailable');
        const mapping={size:'paintSize',brushShape:'paintBrushShape',color:'paintColor',texture:'paintTexture',
          fillMode:'paintFillMode',gradientEnd:'paintGradientEnd',eraseMode:'paintEraseMode',sides:'paintSides',
          curveBend:'paintCurveBend',shapeFill:'paintShapeFill',text:'paintText',font:'paintFont',fontSize:'paintFontSize'};
        const options={...(cmd.properties||{})};
        for(const [key,id] of Object.entries(mapping))if(cmd[key]!==undefined)options[id]=cmd[key];
        if(cmd.opacity!==undefined)options.paintOpacity=Math.round(Number(cmd.opacity)*100);
        const info=await paintAPI.performPaintOperation({...cmd,properties:options});
        say('Paint operation',info);break;
      }
      case 'createRig':case 'setRig':case 'setJoint':case 'bindPart':case 'setPose':case 'setMotion':case 'getRig':case 'getPose':case 'samplePose':case 'listPosedLayers':{
        const api=window.SuperMagicSkeleton;if(!api)throw Error('Rig module not ready');
        const view=cmd.view||currentView,animation=cmd.animation||currentAnimation,frame=cmd.frame||currentFrame;
        if(!VIEW_IDS.includes(view))throw Error('Unknown view');
        const rig=project.rigs?.[view];let value;
        if(op==='createRig'||op==='setRig'){touch();project.rigs||={};project.rigs[view]=op==='createRig'?api.createRig(cmd.joints||[],cmd.bindings||[]):api.createRig(cmd.rig.joints,cmd.rig.bindings);value=project.rigs[view];}
        else if(op==='setJoint'||op==='bindPart'){if(!rig)throw Error('Create rig first');touch();project.rigs[view]=op==='setJoint'?api.setJoint(rig,cmd.id,cmd.changes||{}):api.bindPart(rig,cmd.category,cmd.joint,cmd.anchor||{x:0,y:0});value=project.rigs[view];}
        else if(op==='setPose'){if(!rig)throw Error('Create rig first');if(!project.animations.find(a=>a.id===animation)?.frames.some(f=>f.id===frame))throw Error('Unknown animation/frame');api.evaluateRig(rig,cmd.pose||{});touch();project.poses||={};(((project.poses[view]||={})[animation]||={}))[frame]=clone(cmd.pose||{});value=project.poses[view][animation][frame];}
        else if(op==='setMotion'){if(!rig)throw Error('Create rig first');if(!project.animations.some(a=>a.id===animation))throw Error('Unknown animation');if(!Array.isArray(cmd.keyframes))throw Error('keyframes must be array');for(const k of cmd.keyframes){if(!Number.isFinite(k.timeMs)||k.timeMs<0)throw Error('Invalid keyframe time');api.evaluateRig(rig,k.pose||{});}touch();project.motions||={};((project.motions[view]||={}))[animation]={keyframes:clone(cmd.keyframes)};value=project.motions[view][animation];}
        else if(op==='getRig')value=rig||null;
        else if(op==='getPose')value=project.poses?.[view]?.[animation]?.[frame]||{};
        else if(op==='samplePose')value=api.sampleMotion(project.motions?.[view]?.[animation],cmd.timeMs||0);
        else value=rig?api.applyPoseToLayers(resolvedLayers(view,animation,frame),rig,cmd.timeMs!=null?api.sampleMotion(project.motions?.[view]?.[animation],cmd.timeMs):project.poses?.[view]?.[animation]?.[frame]||{}):resolvedLayers(view,animation,frame);
        say('Rig '+op,value);break;
      }
      case 'summary': say('Summary',window.SuperMagicAssetStudioAPI.getSummary()); break;
      case 'splitImageAuto':case 'splitImageManual':case 'removeBackground':{
        const a=project.assets[cmd.assetId];if(!a?.src)throw new Error('Image command requires an existing image assetId with embedded src');
        const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=a.src;});
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);
        let work=c,regions;
        if(op==='removeBackground'){
          const result=spriteBackgroundRemove(c,cmd.color||'#ffffff',cmd.tolerance??38,cmd.connected!==false);
          work=result.canvas;regions=[{x:0,y:0,w:c.width,h:c.height}];say('Background pixels removed',result.removed);
        } else if(op==='splitImageManual'){
          if(!Array.isArray(cmd.regions)||!cmd.regions.length)throw new Error('splitImageManual needs regions');
          regions=cmd.regions.map(r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w),h:Math.round(r.h)}));
        } else regions=cmd.method==='grid'?spriteGridRegions(c,cmd.rows||2,cmd.columns||3,cmd.padding||0):spriteDetectRegions(c,{alphaThreshold:cmd.alphaThreshold??25,minArea:cmd.minPixels??1000,padding:cmd.padding??3});
        if(regions.some(r=>r.x<0||r.y<0||r.w<1||r.h<1||r.x+r.w>c.width||r.y+r.h>c.height))throw new Error('Crop outside source image');
        const old={work:spriteSheetState.working,file:spriteSheetState.file,regions:spriteSheetState.regions};
        try{
          spriteSheetState.working=work;spriteSheetState.file=a.name||cmd.assetId;spriteSheetState.regions=regions;
          const files=await spriteBuildFiles();await stageFiles(files);
          if(Array.isArray(cmd.assignments)){
            for(let i=0;i<files.length;i++){
              const pendingItem=pending.find(x=>x.file===files[i]);const assignment=cmd.assignments[i]||{};
              if(pendingItem){for(const key of ['view','category','animation','frame','mirror'])if(assignment[key]!==undefined)pendingItem[key]=assignment[key];}
            }renderQueue();
          }
          say(`Queued ${files.length} extracted PNG(s) for assignment`,regions);
        }finally{spriteSheetState.working=old.work;spriteSheetState.file=old.file;spriteSheetState.regions=old.regions;}
        break;
      }
      case 'review': say('Review',window.SuperMagicAssetStudioAPI.review()); break;
      default: throw new Error(`Unsupported op: ${op}`);
    }
  }
  if(mutated){renderMode();refresh();}
  return output.join('\n\n');
}
// Event wiring
$('#prevView').addEventListener('click',()=>stepView(-1));$('#nextView').addEventListener('click',()=>stepView(1));
$('#spinView').addEventListener('click',()=>{if(spinning){stopSpin();return;}stop();$('#spinView').textContent='❚❚ Stop';spinning=setInterval(()=>stepView(1),450);});
$('#reuseView').addEventListener('click',()=>{const source=$('#reuseSource').value;if(source===currentView)return notify('Select a different source view.');stopSpin();const n=cloneView(source,currentView,$('#reuseMirror').checked,$('#reuseReplace').checked,true,$('#reuseCategory').value);selectedLayer=null;refresh();notify(`${n} layers reused across this direction and all animation frames.`);});
$('#quickVisibility').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;const groups={Head:['head','neck','face','eyes','eyebrows','nose','mouth','beard'],Hair:['hairFront','hairBack'],Clothes:['shirt','shorts','sockLeft','sockRight','bootLeft','bootRight'],Arms:['upperArmLeft','upperArmRight','forearmLeft','forearmRight','handLeft','handRight'],Legs:['upperLegLeft','upperLegRight','lowerLegLeft','lowerLegRight','footLeft','footRight'],Accessories:['accessory']};const matching=scene().filter(l=>groups[b.dataset.group].includes(l.category));const next=matching.some(l=>l.visible);for(const l of matching)l.visible=!next;renderLayers();draw();});
$('#importQueue').addEventListener('change',e=>{const row=e.target.closest('[data-queue]');if(!row)return;const p=pending[Number(row.dataset.queue)];if(!p)return;const key=e.target.dataset.q;if(!key)return;p[key]=key==='mirror'?e.target.checked:e.target.value;if(key==='animation'){p.frame=(project.animations.find(x=>x.id===p.animation)?.frames||[])[0]?.id;renderQueue();}});
$('#importQueue').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;pending.splice(Number(b.dataset.remove),1);renderQueue();});
$('#applyQueue').addEventListener('click',applyQueue);$('#clearQueue').addEventListener('click',()=>{pending=[];queueManifest=null;renderQueue();});
$('#viewButtons').addEventListener('click',e=>{const v=e.target.closest('[data-view]');if(v)setView(v.dataset.view);});
$('#animationSelect').addEventListener('change',e=>setAnimation(e.target.value));
$('#addAnimation').addEventListener('click',()=>{const name=prompt('New animation name (e.g. Tackle, Celebrate, Shoot):');if(!name?.trim())return;const id=uid('animation'),f={id:uid('frame'),name:name.trim()+' 1'};project.animations.push({id,name:name.trim(),fps:8,frames:[f]});setAnimation(id);});
$('#deleteAnimation').addEventListener('click',()=>{if(project.animations.length===1)return notify('Keep at least one animation.');const a=anim();if(!confirm(`Delete animation “${a.name}” and all its frames?`))return;project.animations=project.animations.filter(x=>x.id!==a.id);for(const [view]of VIEWS)delete project.scenes[view][a.id];setAnimation(project.animations[0].id);});
$('#fps').addEventListener('change',e=>{anim().fps=clamp(Math.round(num(e.target.value,8)),1,30);if(playing){stop();togglePlay();}renderFrames();});
$('#addFrame').addEventListener('click',()=>{addOneFrame(false);setFrame(currentFrame);notify('Empty animation frame added.');});
$('#duplicateFrame').addEventListener('click',()=>{addOneFrame(true);setFrame(currentFrame);notify('Frame duplicated across all eight views.');});
$('#deleteFrame').addEventListener('click',()=>{const a=anim();if(a.frames.length<=1)return notify('Keep at least one frame.');const i=a.frames.findIndex(f=>f.id===currentFrame);const removed=a.frames.splice(i,1)[0];for(const [view]of VIEWS)delete project.scenes[view]?.[a.id]?.[removed.id];currentFrame=a.frames[Math.min(i,a.frames.length-1)].id;setFrame(currentFrame);});
$('#frameButtons').addEventListener('click',e=>{const b=e.target.closest('[data-frame]');if(b){stop();setFrame(b.dataset.frame);}});
$('#playBtn').addEventListener('click',togglePlay);
$('#dropzone').addEventListener('click',()=>$('#imageInput').click());$('#dropzone').addEventListener('keydown',e=>{if(e.key==='Enter')$('#imageInput').click();});
$('#imageInput').addEventListener('change',async e=>{await stageFiles(e.target.files);e.target.value='';});
for(const evt of ['dragenter','dragover'])$('#dropzone').addEventListener(evt,e=>{e.preventDefault();$('#dropzone').classList.add('dragover');});
$('#dropzone').addEventListener('dragleave',()=>$('#dropzone').classList.remove('dragover'));
$('#dropzone').addEventListener('drop',async e=>{e.preventDefault();$('#dropzone').classList.remove('dragover');await stageFiles(e.dataTransfer.files);});
$('#layersList').addEventListener('click',e=>{const eye=e.target.closest('[data-eye]');if(eye){const l=scene().find(x=>x.id===eye.dataset.eye);if(l)l.visible=!l.visible;renderLayers();draw();return;}const b=e.target.closest('[data-layer]');if(b)setSelected(b.dataset.layer,{toggle:e.ctrlKey||e.metaKey});});
$('#layerUp').addEventListener('click',()=>moveLayer(1));$('#layerDown').addEventListener('click',()=>moveLayer(-1));$('#deleteLayer').addEventListener('click',deleteSelected);
$('#duplicateLayer').addEventListener('click',()=>{const l=sel();if(!l)return;const d={...clone(l),id:uid('layer'),name:l.name+' copy'};d.transform.x+=12;d.transform.y+=12;scene().push(d);setSelected(d.id);});
function copySelectedEverywhere(allAnimations){const l=sel();if(!l)return notify('Select a layer first.');let copied=0;for(const a of (allAnimations?project.animations:[anim()]))for(const f of a.frames){if(a.id===currentAnimation&&f.id===currentFrame)continue;const target=scene(currentView,a.id,f.id);const match=target.findIndex(x=>x.category===l.category&&x.name===l.name);const copiedLayer={...clone(l),id:match>=0?target[match].id:uid('layer')};if(match>=0)target[match]=copiedLayer;else insertOrdered(target,copiedLayer);copied++;}notify(`${l.name} reused in ${copied} frame${copied===1?'':'s'} in this view.`);}
$('#copyFrames').addEventListener('click',()=>copySelectedEverywhere(false));$('#copyAnimations').addEventListener('click',()=>copySelectedEverywhere(true));
$('#frameButtons').addEventListener('dblclick',e=>{const b=e.target.closest('[data-frame]');if(!b)return;const f=anim().frames.find(x=>x.id===b.dataset.frame);if(!f)return;recordHistory();const name=prompt('Rename this frame:',f.name);if(name?.trim()){f.name=name.trim();renderFrames();}});
$('#inspectorContent').addEventListener('change',e=>{const key=e.target.dataset.groupProp;if(!key||selectedLayerIds.size<2)return;const value=num(e.target.value,key==='scaleX'||key==='scaleY'?1:0);recordHistory();const changes={};changes[key]=value;changeGroup(changes);renderInspector();draw();});
$('#inspectorContent').addEventListener('click',e=>{if(e.target.id==='openAutoResize')openAutoResize();});
for(const id of ['autoResizeScope','autoResizeMatch','autoResizeMethod'])$('#'+id).addEventListener('change',updateAutoResizeStats);
$('#closeAutoResize').addEventListener('click',()=>$('#autoResizeDialog').close());$('#cancelAutoResize').addEventListener('click',()=>$('#autoResizeDialog').close());$('#applyAutoResize').addEventListener('click',()=>{try{const n=applyAutoResize({scope:$('#autoResizeScope').value,matchBy:$('#autoResizeMatch').value,method:$('#autoResizeMethod').value});$('#autoResizeDialog').close();notify(`Auto-resized ${n} matching layers.`);}catch(e){notify(e.message);}});
$('#inspectorContent').addEventListener('change',e=>{const field=e.target.closest('[data-prop]'),l=sel();if(!field||!l)return;const key=field.dataset.prop,v=field.value;const t=l.transform,c=l.crop,a=asset(l);if(key.startsWith('color')){l.color||={};const name={colorBrightness:'brightness',colorContrast:'contrast',colorSaturate:'saturate',colorHue:'hue',colorSepia:'sepia',colorRed:'red',colorGreen:'green',colorBlue:'blue',colorTintHex:'tintHex',colorTintAmount:'tintAmount'}[key];if(name==='tintHex')l.color.tintHex=/^#[0-9a-f]{6}$/i.test(v)?v:'#ffffff';else l.color[name]=num(v,['hue','sepia','tintAmount'].includes(name)?0:100);}else if(key==='name')l.name=v;else if(key==='category')l.category=v;else if(key==='cropX')c.x=clamp(Math.round(num(v)),0,a.width-c.w);else if(key==='cropY')c.y=clamp(Math.round(num(v)),0,a.height-c.h);else if(key==='cropW')c.w=clamp(Math.round(num(v,1)),1,a.width-c.x);else if(key==='cropH')c.h=clamp(Math.round(num(v,1)),1,a.height-c.y);else if(key==='scaleX'||key==='scaleY')t[key]=clamp(num(v,1),.001,30);else if(key==='opacity')t.opacity=clamp(num(v,1),0,1);else if(key in t)t[key]=num(v);renderLayers();renderInspector();draw();});
$('#inspectorContent').addEventListener('click',e=>{const l=sel(),b=e.target.closest('button');if(!l||!b)return;const id=b.id;if(b.dataset.colorpreset){const presets={normal:{brightness:100,contrast:100,saturate:100,hue:0,sepia:0,red:100,green:100,blue:100},light:{brightness:122,contrast:107,saturate:100,hue:0,sepia:0,red:110,green:110,blue:110},dark:{brightness:77,contrast:114,saturate:95,hue:0,sepia:0,red:88,green:88,blue:88},red:{brightness:105,contrast:105,saturate:145,hue:-35,sepia:42,red:138,green:92,blue:92},brown:{brightness:94,contrast:114,saturate:88,hue:0,sepia:70,red:120,green:100,blue:82},cool:{brightness:104,contrast:102,saturate:120,hue:37,sepia:0,red:94,green:104,blue:126}};l.color=clone(presets[b.dataset.colorpreset]);renderInspector();draw();return;}if(id==='cropLayer')openCrop();else if(id==='cropHere')toggleCrop();else if(id==='autoFitLayer')geometryAutoFit();else if(id==='replaceImage')$('#replaceImageInput').click();else if(id==='flipX'){l.transform.flipX=!l.transform.flipX;renderInspector();draw();}else if(id==='flipY'){l.transform.flipY=!l.transform.flipY;renderInspector();draw();}else if(id==='toggleLock'){l.locked=!l.locked;renderInspector();renderLayers();}else if(id==='fitLayer'){const h={fullBody:H()*.74,bodyPart:H()*.26,head:H()*.27,shirt:H()*.38,shorts:H()*.23,accessory:H()*.16}[l.category]||H()*.2;l.transform.scaleX=l.transform.scaleY=h/l.crop.h;renderInspector();draw();}else if(id==='resetLayer')defaultReset(l);else if(id==='saveDefault'){project.defaults[currentView]||={};project.defaults[currentView][l.category]=clone(l.transform);notify(`Default ${CATEGORIES[l.category]} placement saved for ${currentView}.`);}});
$('#replaceImageInput').addEventListener('change',async e=>{const l=sel(),f=e.target.files[0];e.target.value='';if(!l||!f)return;try{const before=l.crop.h*l.transform.scaleY,info=await readFile(f);l.assetId=info.id;l.crop=clone(info.bounds);l.transform.scaleX=l.transform.scaleY=before/l.crop.h;l.name=f.name.replace(/\.[^.]+$/,'');renderLayers();renderInspector();draw();notify('PNG replaced. Placement preserved.');}catch(err){notify(err.message);}});
$('#saveProject').addEventListener('click',saveJSON);$('#menuSavePackage').addEventListener('click',()=>{closeMenus();saveZIP();});$('#menuMergeProject').addEventListener('click',()=>{closeMenus();$('#mergeProjectInput').click();});$('#mergeProjectInput').addEventListener('change',async e=>{if(e.target.files[0])await mergeProjectFile(e.target.files[0]);e.target.value='';});$('#loadProject').addEventListener('click',()=>$('#jsonInput').click());$('#jsonInput').addEventListener('change',async e=>{if(e.target.files[0])await loadProject(e.target.files[0]);e.target.value='';});$('#newProject').addEventListener('click',resetProject);$('#exportPNG').addEventListener('click',exportPNG);$('#exportGIF').addEventListener('click',exportGIF);$('#exportTurntable').addEventListener('click',exportTurntable);$('#exportSheet').addEventListener('click',exportSheet);
$('#projectName').addEventListener('change',e=>project.projectName=e.target.value);
function changeSize(){const w=clamp(Math.round(num($('#canvasWidth').value,768)),128,2048),h=clamp(Math.round(num($('#canvasHeight').value,768)),128,2048);project.canvas={width:w,height:h};updateDimension();draw();}
$('#canvasWidth').addEventListener('change',changeSize);$('#canvasHeight').addEventListener('change',changeSize);
$('#zoomIn').addEventListener('click',()=>{zoom=clamp(zoom*1.2,.14,2.5);updateZoom();draw();});$('#zoomOut').addEventListener('click',()=>{zoom=clamp(zoom/1.2,.14,2.5);updateZoom();draw();});$('#zoomFit').addEventListener('click',fitZoom);$('#toggleGrid').addEventListener('click',e=>{showGuides=!showGuides;e.target.classList.toggle('active',showGuides);draw();});
document.addEventListener('keydown',e=>{const tag=e.target.tagName,isInput=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();resetProject();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();$('#jsonInput').click();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveJSON();return;}if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){if(e.target.closest('input,textarea,select'))return;e.preventDefault();if(e.key.toLowerCase()==='y'||(e.key.toLowerCase()==='z'&&e.shiftKey))redo();else undo();return;}if(isInput||$('#cropDialog').open)return;if(e.key==='Escape'){setSelected(null);return;}if(e.key===' '){e.preventDefault();togglePlay();return;}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();recordHistory();deleteSelected();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){const l=sel();if(!l||l.locked)return;e.preventDefault();recordHistory();const n=e.shiftKey?10:1;const group=selectedLayers().filter(x=>!x.locked);const dx=e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,dy=e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0;for(const item of group){item.transform.x+=dx;item.transform.y+=dy;}draw();renderInspector();}});
window.addEventListener('resize',()=>{if(!drag)fitZoom();});

$('#assetMode').addEventListener('change',e=>{recordHistory();project.mode=e.target.value;clearSelection();renderMode();$('#importCategory').value=preferredPartForMode();refresh();});
$('#imageStorage').addEventListener('change',e=>{project.assetStorage=e.target.value;renderMode();});
$('#resolveImagesBtn').addEventListener('click',()=>$('#resolveImagesInput').click());
const resolveInput=document.createElement('input');resolveInput.type='file';resolveInput.accept='image/png,image/webp,image/jpeg';resolveInput.multiple=true;resolveInput.id='resolveImagesInput';resolveInput.style.display='none';document.body.appendChild(resolveInput);
resolveInput.addEventListener('change',async e=>{await resolveExternalImages(e.target.files);e.target.value='';});
for(const section of document.querySelectorAll('.sidebar .section,.inspector .section')){const title=section.querySelector('h3');if(!title)continue;section.classList.add('collapsed');if(/Project|Inspector|Layers/.test(title.textContent))section.classList.remove('collapsed');title.addEventListener('click',e=>{if(e.target.closest('button,select,input'))return;section.classList.toggle('collapsed');});}
window.SuperMagicAssetStudioAPI={
  version:'5.9.0',
  getUIOptionState:()=>clone(project.editor?.uiOptions||{}),
  setUIOptionState:(id,value)=>{project.editor ||= {};project.editor.uiOptions ||= {};project.editor.uiOptions[id]=clone(value);return value;},
  getProject:()=>clone(project),
  exportProjectObject:(options={})=>clone(exportProjectObject(options)),
  getSummary:()=>({name:project.projectName,mode:project.mode,assetStorage:project.assetStorage,views:[...VIEW_IDS],animations:project.animations.map(a=>({id:a.id,name:a.name,frames:a.frames.length,fps:a.fps})),assets:Object.keys(project.assets).length,unresolvedAssets:unresolvedAssets().map(a=>a.fileRef||a.name),partsDefinitionCount:partDefinitions().length}),
  review:()=>({warnings:[...(unresolvedAssets().length?[`${unresolvedAssets().length} asset(s) have no embedded image source`]:[]),...(Object.keys(project.assets).length?[]:['Project has no image assets yet'])],layerCounts:Object.fromEntries(VIEW_IDS.map(v=>[v,project.animations.reduce((n,a)=>n+a.frames.reduce((s,f)=>s+(project.scenes[v]?.[a.id]?.[f.id]?.length||0),0),0)]))}),
  setMode:(mode)=>{if(!['fullBody','bodyHead','standard','custom'].includes(mode))throw new Error('Unsupported mode');project.mode=mode;renderMode();refresh();return clone(project);},
  setImageStorage:(mode)=>{if(!['bundled','external'].includes(mode))throw new Error('Unsupported image storage');project.assetStorage=mode;renderMode();return project.assetStorage;},
  getPartDefinitions:()=>clone(exportPartsDefinition('custom')),
  setPartDefinitions:(spec)=>{recordHistory(); const out=setCustomPartsSpec(spec||{}); renderMode(); refresh(); return clone(out);},
  exportPartDefinitions:(mode='custom')=>clone(exportPartsDefinition(mode)),
  importProjectObject:(obj)=>{if(!obj||obj.format!=='FootballSpriteStudio'||!obj.canvas||!obj.assets||!obj.scenes||!Array.isArray(obj.animations))throw new Error('Invalid FootballSpriteStudio project');project=migrateProject(clone(obj));images.clear();for(const [id,a] of Object.entries(project.assets||{})){if(a.src)loadImg(id);}currentView='front';currentAnimation=project.animations[0].id;currentFrame=project.animations[0].frames[0].id;selectedLayer=null;$('#projectName').value=project.projectName||'Football character';syncEditorState();refresh();window.SuperMagicAssetStudioAPI.applyUIOptions?.();return clone(project);},
  resolveExternalImages: async (files)=>resolveExternalImages(files),
  setView:(view)=>{setView(view);return currentView;},
  setAnimation:(id)=>{setAnimation(id);return currentAnimation;},
  setFrame:(id)=>{setFrame(id);return currentFrame;},
  autoResizeMatching:(options={})=>applyAutoResize(options),
  getSelectedLayerIds:()=>[...selectedLayerIds],
  selectLayers:(ids)=>{const valid=ids.filter(id=>scene().some(l=>l.id===id));selectedLayerIds=new Set(valid);selectedLayer=valid.at(-1)||null;renderLayers();renderInspector();if(valid.length)window.SuperMagicStudioUI?.showLayerInspector();draw();return valid;},
  runCommands: async (payload)=>await runStructuredCommands(payload),
  saveJSON:()=>saveJSON(),
  saveZIP:()=>saveZIP(),
  exportProjectZip:()=>window.SuperMagicProjectArchive.pack(projectZipData()),
  openProjectFile:async(file)=>loadProject(file),
  mergeProjectFile:async(file)=>mergeProjectFile(file),
  mergeProjectObject:(data)=>mergeProjectData(data)
};



// Paint integration: persist edit strokes as isolated, undoable PNG layers. Existing sources remain immutable.
function createRasterPaintLayer(dataURL,name='Paint stroke',bounds=null){
 if(!/^data:image\/png;base64,/.test(dataURL))throw new Error('Paint data must be a PNG data URL');
 if(dataURL.length>30000000)throw new Error('Paint layer exceeds safe size');
 recordHistory();
 const id=uid('asset'),lId=uid('layer'),w=W(),h=H();
 project.assets[id]={name:name+'.png',fileRef:name+'.png',mime:'image/png',width:w,height:h,src:dataURL};
 const rect=bounds&&Number.isFinite(bounds.x)&&Number.isFinite(bounds.y)&&Number.isFinite(bounds.w)&&Number.isFinite(bounds.h)&&bounds.w>0&&bounds.h>0&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.w<=w&&bounds.y+bounds.h<=h?bounds:{x:0,y:0,w,h};
 const l={id:lId,name,category:'accessory',assetId:id,paintLayer:true,visible:true,locked:false,
   transform:{x:rect.x+rect.w/2,y:rect.y+rect.h/2,scaleX:1,scaleY:1,rotationDeg:0,opacity:1,flipX:false,flipY:false,anchorX:.5,anchorY:.5},
   crop:{...rect}};
 scene().push(l);images.delete(id);loadImg(id);if(bounds)setSelected(lId);else clearSelection();renderLayers();renderInspector();draw();historyButtons();return lId;
}
function decodePaintPNG(src){
 return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Invalid paint image'));img.src=src;});
}
async function eraseRasterWithMask(maskURL,scope='paint'){
 if(!/^data:image\/png;base64,/.test(maskURL))throw new Error('Eraser mask must be PNG');
 if(!['paint','original'].includes(scope))throw new Error('Invalid erase scope');
 const layers=scope==='original'?[sel()].filter(Boolean):scene().filter(l=>l.paintLayer);
 const editable=layers.filter(l=>!l.locked && l.visible && project.assets[l.assetId]?.src);
 if(!editable.length)throw new Error(scope==='original'?'Select an unlocked image layer to erase':'No visible unlocked brush, shape or text layers to erase');
 const mask=await decodePaintPNG(maskURL);
 if(mask.width!==W()||mask.height!==H())throw new Error('Eraser mask dimension mismatch');
 const results=[];
 for(const l of editable){
  const source=project.assets[l.assetId],img=await decodePaintPNG(source.src),c=l.crop,t=l.transform;
  if(img.width*img.height>4194304)throw new Error('Source image is too large to edit safely');
  const out=document.createElement('canvas');out.width=img.width;out.height=img.height;const g=out.getContext('2d');
  g.drawImage(img,0,0);g.save();g.beginPath();g.rect(c.x,c.y,c.w,c.h);g.clip();g.globalCompositeOperation='destination-out';
  const sx=t.scaleX*(t.flipX?-1:1),sy=t.scaleY*(t.flipY?-1:1);
  if(!sx||!sy)throw new Error('Cannot erase zero-scale layer');
  g.translate(c.x+c.w*(t.anchorX??.5),c.y+c.h*(t.anchorY??.5));
  g.scale(1/sx,1/sy);g.rotate(-t.rotationDeg*Math.PI/180);g.translate(-t.x,-t.y);g.drawImage(mask,0,0);g.restore();
  results.push({layer:l,source,src:out.toDataURL('image/png')});
 }
 recordHistory();
 for(const {layer,source,src} of results){const id=uid('asset');project.assets[id]={...source,src,name:source.name?.replace(/\.png$/i,'')+'-erased.png',fileRef:id+'.png'};layer.assetId=id;images.delete(id);loadImg(id);}
 renderLayers();renderInspector();draw();historyButtons();return results.length;
}
Object.assign(window.SuperMagicAssetStudioAPI,{
 createRasterPaintLayer,
 eraseRasterWithMask,
 getPaintContext:()=>({view:currentView,animation:currentAnimation,frame:currentFrame,width:W(),height:H()}),
});

// Sprite sheet tools: all processing is local, preserves alpha and offers queue assignment.
const spriteSheetState={mode:'auto',file:null,image:null,original:null,working:null,regions:[],selection:-1,drawStart:null,preview:{x:0,y:0,scale:1},files:[],drawMode:'rect',activePoly:null,hoverPoint:null,editPoints:false,dragPoint:null,selectedPoint:-1};
const spriteCanvas=$('#spriteToolsCanvas'),spriteCtx=spriteCanvas.getContext('2d',{willReadFrequently:true});
const spritePointInRegion=(point,region)=>spriteGeometry.pointInRegion(point,region,spriteCtx);
function spriteMessage(message){$('#spriteToolsStatus').textContent=message;}
function spriteFileStem(name){return String(name||'sprite').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70)||'sprite';}
function spriteClamp(v,a,b){return Math.min(b,Math.max(a,v));}





async function spriteLoadSource(src,name){
 const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Cannot decode image'));img.src=src;});
 if(img.naturalWidth*img.naturalHeight>22000000)throw new Error('Maximum source size is 22 megapixels');
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);
 spriteSheetState.original=c;spriteSheetState.working=c;spriteSheetState.file=name;spriteSheetState.regions=[];spriteSheetState.selection=-1;spriteSheetState.activePoly=null;spriteSheetState.hoverPoint=null;
 spriteRenderPreview();spriteRenderRegions();spriteMessage(`${name}: ${c.width} × ${c.height} px. Draw regions or detect automatically.`);
}
async function spriteLoadFile(file){const src=URL.createObjectURL(file);try{await spriteLoadSource(src,file.name);}finally{URL.revokeObjectURL(src);}}
function spriteSourceOptions(){const dropdown=$('#spriteToolsExisting');const value=dropdown.value;dropdown.innerHTML='<option value="">Select from project or upload a source image…</option>'+Object.entries(project.assets).filter(([id,a])=>a.src).map(([id,a])=>`<option value="${esc(id)}">${esc(a.name||id)} (${a.width} × ${a.height})</option>`).join('');if([...dropdown.options].some(x=>x.value===value))dropdown.value=value;}
function spriteOpen(mode='auto'){spriteSheetState.mode=mode;spriteSourceOptions();$('#spriteToolsTitle').textContent=mode==='background'?'Remove background':mode==='manual'?'Manual crop & split':'Auto-split sprite sheet';$('#splitControlPanel').hidden=mode==='background';$('#backgroundControlPanel').hidden=mode!=='background';$('#spriteToolsQueue').textContent=mode==='background'?'Add transparent PNG to import queue':'Add splits to import queue';$('#spriteToolsDownload').textContent=mode==='background'?'Download PNG':'Download PNGs + manifest (ZIP)';if(!$('#spriteToolsDialog').open)$('#spriteToolsDialog').showModal();spriteUpdateShapeHint();spriteRenderPreview();}
function spriteUpdateShapeHint(){const mode=$('#spriteSelectionShape')?.value||'rect';spriteSheetState.drawMode=mode;$('#spriteShapeHint').textContent=mode==='wand'?'Magic wand: click inside a sprite. Opaque mode selects the connected silhouette; color mode selects a contiguous similar-color region.':mode==='bezier'?'Smooth curve: click boundary anchors, then Finish boundary. Select Edit points to drag anchors or double-click an edge to insert one.':'Freeform mode: click around sprite; Finish boundary closes the selection.';}
function spriteDrawChecker(){const w=spriteCanvas.width,h=spriteCanvas.height;spriteCtx.clearRect(0,0,w,h);spriteCtx.fillStyle='#161d30';spriteCtx.fillRect(0,0,w,h);spriteCtx.fillStyle='#242e45';for(let y=0;y<h;y+=24)for(let x=0;x<w;x+=24)if((x/24+y/24)%2<1)spriteCtx.fillRect(x,y,24,24);}
function spriteRenderPreview(){spriteDrawChecker();const c=spriteSheetState.working;if(!c)return;const s=Math.min(spriteCanvas.width/c.width,spriteCanvas.height/c.height),x=(spriteCanvas.width-c.width*s)/2,y=(spriteCanvas.height-c.height*s)/2;spriteSheetState.preview={x,y,scale:s};spriteCtx.drawImage(c,x,y,c.width*s,c.height*s);if(spriteSheetState.mode==='background')return;const r=spriteSheetState.regions;for(let i=0;i<r.length;i++){const region=r[i],b=spriteRegionBounds(region),selected=i===spriteSheetState.selection;spriteCtx.save();spriteCtx.translate(x,y);spriteCtx.scale(s,s);spriteCtx.strokeStyle=selected?'#fff5a4':'#9c88ff';spriteCtx.lineWidth=(selected?3:2)/s;spriteCtx.setLineDash(selected?[]:[5/s,4/s]);spriteDrawRegionPath(spriteCtx,region);spriteCtx.stroke();spriteCtx.setLineDash([]);spriteCtx.restore();spriteCtx.fillStyle=selected?'#f9c766':'#4732a8';spriteCtx.fillRect(x+b.x*s,y+b.y*s,22,20);spriteCtx.fillStyle=selected?'#111':'#fff';spriteCtx.font='bold 12px system-ui';spriteCtx.fillText(String(i+1),x+b.x*s+5,y+b.y*s+14);}if(spriteSheetState.editPoints){const selected=spriteSheetState.regions[spriteSheetState.selection];if(selected?.points){spriteCtx.save();spriteCtx.translate(x,y);spriteCtx.scale(s,s);for(const [i,p] of selected.points.entries()){spriteCtx.fillStyle=i===spriteSheetState.selectedPoint?'#ffbc6d':'#ffffff';spriteCtx.strokeStyle='#6340ab';spriteCtx.lineWidth=2/s;spriteCtx.beginPath();spriteCtx.arc(p.x,p.y,7/s,0,2*Math.PI);spriteCtx.fill();spriteCtx.stroke();}spriteCtx.restore();}}
 const d=spriteSheetState.drawStart;if(d?.current&&spriteSheetState.drawMode==='rect'){const b=spriteRect(d.start,d.current);spriteCtx.strokeStyle='#f9c766';spriteCtx.lineWidth=2;spriteCtx.setLineDash([7,4]);spriteCtx.strokeRect(x+b.x*s,y+b.y*s,b.w*s,b.h*s);spriteCtx.setLineDash([]);}const poly=spriteSheetState.activePoly;if(poly?.points?.length){spriteCtx.save();spriteCtx.translate(x,y);spriteCtx.scale(s,s);spriteCtx.strokeStyle='#f9c766';spriteCtx.lineWidth=2/s;spriteCtx.setLineDash([7/s,4/s]);spriteCtx.beginPath();poly.points.forEach((p,i)=>{i?spriteCtx.lineTo(p.x,p.y):spriteCtx.moveTo(p.x,p.y)});if(spriteSheetState.hoverPoint)spriteCtx.lineTo(spriteSheetState.hoverPoint.x,spriteSheetState.hoverPoint.y);spriteCtx.stroke();spriteCtx.setLineDash([]);for(const p of poly.points){spriteCtx.fillStyle='#fff5a4';spriteCtx.beginPath();spriteCtx.arc(p.x,p.y,4/s,0,Math.PI*2);spriteCtx.fill();}spriteCtx.restore();}}
function spriteRenderRegions(){const root=$('#spriteRegions');root.innerHTML=spriteSheetState.regions.map((region,i)=>{const r=spriteRegionBounds(region),tag=['poly','bezier','wand'].includes(region.type)?`<span class="sprite-poly-badge">${region.type==='bezier'?'curve':region.type==='wand'?'wand':'freeform'}</span>`:'';return `<div class="sprite-region ${spriteSheetState.selection===i?'selected':''}"><button data-sprite-select="${i}" title="Select region">${i+1}. ${r.w}×${r.h} at (${r.x}, ${r.y}) ${tag}</button><button class="btn sm danger" data-sprite-remove="${i}" title="Remove selection">✕</button></div>`;}).join('');}
function spriteRect(a,b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x:Math.round(x),y:Math.round(y),w:Math.round(Math.abs(a.x-b.x)),h:Math.round(Math.abs(a.y-b.y))};}
function spritePointer(e){const box=spriteCanvas.getBoundingClientRect(),sx=spriteCanvas.width/box.width,sy=spriteCanvas.height/box.height;const {x,y,scale}=spriteSheetState.preview,c=spriteSheetState.working;return {x:spriteClamp((e.clientX-box.left)*sx-x,0,c.width*scale)/scale,y:spriteClamp((e.clientY-box.top)*sy-y,0,c.height*scale)/scale};}
function spriteFinalizePolygon(){const poly=spriteSheetState.activePoly;if(!poly?.points?.length||poly.points.length<3){spriteMessage('Freeform split needs at least 3 points.');return false;}spriteSheetState.regions.push(spriteNormalizeRegion({type:poly.type||'poly',points:poly.points,tension:+$('#spriteCurveSmooth').value/100}));spriteSheetState.selection=spriteSheetState.regions.length-1;spriteSheetState.activePoly=null;spriteSheetState.hoverPoint=null;spriteRenderRegions();spriteRenderPreview();spriteMessage('Freeform split added. You can queue or download it like any other split.');return true;}
// 4-connected pixel segmentation at bounded resolution. Alpha-only to avoid thresholding painted sprite colors.
function spriteDetectRegions(input,{alphaThreshold=25,minArea=1000,padding=3,maxDimension=1000}={}){
 const scale=Math.min(1,maxDimension/Math.max(input.width,input.height)),w=Math.max(1,Math.round(input.width*scale)),h=Math.max(1,Math.round(input.height*scale));const low=document.createElement('canvas');low.width=w;low.height=h;const g=low.getContext('2d',{willReadFrequently:true});g.drawImage(input,0,0,w,h);const data=g.getImageData(0,0,w,h).data;
 let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>alphaThreshold)opaque++;if(opaque/w/h>.985)throw new Error('This appears opaque. Use Remove background first, or choose Grid detection.');
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),min=Math.max(20,minArea*scale*scale),boxes=[];
 for(let at=0;at<w*h;at++){if(seen[at]||data[at*4+3]<=alphaThreshold)continue;let head=0,tail=1,xx=at%w,yy=Math.floor(at/w),left=xx,right=xx,top=yy,bottom=yy;queue[0]=at;seen[at]=1;
 while(head<tail){const n=queue[head++],x=n%w,y=(n-x)/w;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 for(const j of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1]){if(j<0||seen[j]||data[j*4+3]<=alphaThreshold)continue;seen[j]=1;queue[tail++]=j;}}
 if(tail>=min && right-left>10 && bottom-top>10){const x=Math.max(0,Math.floor(left/scale)-padding),y=Math.max(0,Math.floor(top/scale)-padding),x2=Math.min(input.width,Math.ceil((right+1)/scale)+padding),y2=Math.min(input.height,Math.ceil((bottom+1)/scale)+padding);boxes.push({type:'rect',x,y,w:x2-x,h:y2-y,area:tail});}}
 if(boxes.length>128)throw new Error('Detected too many regions. Increase Minimum pixels or use the Grid mode.');
 const medianH=[...boxes].map(b=>b.h).sort((a,b)=>a-b)[Math.floor(boxes.length/2)]||100;
 const rows=[];for(const b of boxes.sort((a,b)=>a.y-b.y)){let row=rows.find(r=>Math.abs(r.y-b.y)<medianH*.32);if(!row){row={y:b.y,items:[]};rows.push(row);}row.items.push(b);row.y=row.items.reduce((v,p)=>v+p.y,0)/row.items.length;}
 return rows.sort((a,b)=>a.y-b.y).flatMap(r=>r.items.sort((a,b)=>a.x-b.x)).map(({area,...box})=>box);
}
function spriteGridRegions(input,rows,cols,padding){const boxes=[];const w=input.width/cols,h=input.height/rows;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const x0=Math.floor(x*w+padding),y0=Math.floor(y*h+padding),x1=Math.ceil((x+1)*w-padding),y1=Math.ceil((y+1)*h-padding);if(x1>x0&&y1>y0)boxes.push({type:'rect',x:x0,y:y0,w:x1-x0,h:y1-y0});}return boxes;}
function spriteAutoDetect(){const input=spriteSheetState.working;if(!input)throw new Error('Choose a source image first');const type=$('#spriteDetectMethod').value,pad=spriteClamp(+$('#spritePadding').value||0,0,120);const boxes=type==='grid'?spriteGridRegions(input,spriteClamp(+$('#spriteGridRows').value||2,1,32),spriteClamp(+$('#spriteGridColumns').value||3,1,32),pad):spriteDetectRegions(input,{alphaThreshold:+$('#spriteAlphaThreshold').value||25,minArea:+$('#spriteMinArea').value||1000,padding:pad});spriteSheetState.regions=boxes.map(spriteNormalizeRegion);spriteSheetState.selection=boxes.length?0:-1;spriteSheetState.activePoly=null;spriteRenderRegions();spriteRenderPreview();spriteMessage(`Detected ${boxes.length} sprites. Remove unwanted selections or add freeform boundaries; then assign each output in the import queue.`);return boxes;}
function spriteWandRegion(canvas,seed,{mode='alpha',tolerance=40,alphaThreshold=25,maxPixels=22000000}={}){
 const w=canvas.width,h=canvas.height;if(w*h>maxPixels)throw new Error('Image too large for wand');const x=Math.floor(seed.x),y=Math.floor(seed.y);if(x<0||y<0||x>=w||y>=h)throw new Error('Click inside source image');const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,at=y*w+x,idx=at*4;
 if(mode==='alpha'&&data[idx+3]<=alphaThreshold)throw new Error('Click on a visible sprite, not transparent space.');const reference=[data[idx],data[idx+1],data[idx+2],data[idx+3]],visited=new Uint8Array(w*h),selected=new Uint8Array(w*h),queue=new Int32Array(w*h);let front=0,tail=1,left=x,right=x,top=y,bottom=y;queue[0]=at;visited[at]=1;
 function similar(i){const k=i*4;if(mode==='alpha')return data[k+3]>alphaThreshold;return data[k+3]>0&&Math.hypot(data[k]-reference[0],data[k+1]-reference[1],data[k+2]-reference[2])<=tolerance;}
 while(front<tail){const pos=queue[front++],px=pos%w,py=Math.floor(pos/w);selected[pos]=1;left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);const ns=[px>0?pos-1:-1,px<w-1?pos+1:-1,py>0?pos-w:-1,py<h-1?pos+w:-1];for(const n of ns)if(n>=0&&!visited[n]){visited[n]=1;if(similar(n))queue[tail++]=n;}}
 if(tail<1)throw new Error('No connected pixels selected');const b={x:left,y:top,w:right-left+1,h:bottom-top+1};const local=new Uint8Array(b.w*b.h);for(let py=b.y;py<=bottom;py++)for(let px=b.x;px<=right;px++)local[(py-b.y)*b.w+(px-b.x)]=selected[py*w+px];let binary='';for(let i=0;i<local.length;i+=8192)binary+=String.fromCharCode(...local.subarray(i,i+8192));return {...b,type:'wand',mode,tolerance,seed:{x,y},mask:btoa(binary),selectedPixels:tail};}
function spriteBackgroundRemove(input,hex,tolerance=38,connected=true){const w=input.width,h=input.height,g=input.getContext('2d',{willReadFrequently:true}),source=g.getImageData(0,0,w,h),rgba=source.data,ref=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),tol=+tolerance;const near=i=>rgba[4*i+3]>0&&Math.hypot(rgba[i*4]-ref[0],rgba[i*4+1]-ref[1],rgba[i*4+2]-ref[2])<=tol;
 let removed=0;if(connected){const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let front=0,end=0;const seed=i=>{if(i<0||seen[i])return;seen[i]=1;if(near(i))queue[end++]=i;};for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}while(front<end){const i=queue[front++],x=i%w,y=(i-x)/w;rgba[4*i+3]=0;removed++;if(x>0)seed(i-1);if(x<w-1)seed(i+1);if(y>0)seed(i-w);if(y<h-1)seed(i+w);}}
 else for(let i=0;i<w*h;i++)if(near(i)){rgba[i*4+3]=0;removed++;}
 const result=document.createElement('canvas');result.width=w;result.height=h;result.getContext('2d').putImageData(source,0,0);return {canvas:result,removed};}
async function spriteBuildFiles(){const source=spriteSheetState.working;if(!source)throw new Error('Choose an image first');const bg=spriteSheetState.mode==='background';const regions=bg?[{type:'rect',x:0,y:0,w:source.width,h:source.height}]:spriteSheetState.regions;if(!regions.length)throw new Error('No crop regions. Draw or detect at least one sprite.');const stem=spriteFileStem(spriteSheetState.file),files=[];
 for(let i=0;i<regions.length;i++){
  const region=spriteNormalizeRegion(regions[i]),r=spriteRegionBounds(region),c=document.createElement('canvas');c.width=r.w;c.height=r.h;const g=c.getContext('2d');
  if(['poly','bezier'].includes(region.type)&&region.points?.length){g.save();g.translate(-r.x,-r.y);spriteDrawRegionPath(g,region);g.clip();g.drawImage(source,0,0);g.restore();}
  else if(region.type==='wand'&&region.mask){const raw=atob(region.mask),orig=source.getContext('2d',{willReadFrequently:true}).getImageData(r.x,r.y,r.w,r.h),data=orig.data;for(let j=0;j<r.w*r.h;j++){if(raw.charCodeAt(j)===0)data[j*4+3]=0;}g.putImageData(orig,0,0);}
  else g.drawImage(source,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  blob.name=`${stem}_${String(i+1).padStart(2,'0')}.png`;blob.region=region;files.push(blob);
 }
 return files;}
async function spriteDownload(){const files=await spriteBuildFiles();if(spriteSheetState.mode==='background'){download(files[0],files[0].name);spriteMessage('Saved transparent PNG. You can also add it to the import queue.');return;}
 const manifest={format:'FootballSpriteAssetBundle',version:1,items:files.map((file,i)=>({file:file.name,view:currentView,category:$('#importCategory').value,animation:currentAnimation,frame:currentFrame,mirror:false,cropSource:spriteNormalizeRegion(spriteSheetState.regions[i])}))};const entries=await Promise.all(files.map(async f=>({name:f.name,data:new Uint8Array(await f.arrayBuffer())})));entries.push({name:'sprite-manifest.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});download(spriteZip(entries),`${spriteFileStem(spriteSheetState.file)}_sprites.zip`);spriteMessage(`Downloaded ${files.length} PNGs and a manifest in a ZIP. Assign camera/animation/frame individually in the import queue.`);}
async function spriteQueue(){const files=await spriteBuildFiles();await stageFiles(files);spriteMessage(`Added ${files.length} PNG files to the import queue. Close this window, choose view, part, animation and frame for each, then click Import assigned files.`);notify(`${files.length} extracted PNGs queued for assignment.`);}
async function spritePreviewRemoval(){const c=spriteSheetState.original;if(!c)throw new Error('Choose an image first');const {canvas,removed}=spriteBackgroundRemove(c,$('#spriteBackgroundColor').value,+$('#spriteBackgroundTolerance').value,$('#spriteBackgroundConnected').checked);spriteSheetState.working=canvas;spriteRenderPreview();spriteMessage(`Removed ${removed.toLocaleString()} background pixels (${(100*removed/c.width/c.height).toFixed(1)}%). Check edges and export or queue the transparent PNG.`);return removed;}
function spriteTry(fn){return async(...args)=>{try{return await fn(...args)}catch(e){spriteMessage('Error: '+e.message);notify(e.message);}};}
$('#menuManualSplit').addEventListener('click',()=>{closeMenus();spriteOpen('manual');});$('#menuAutoSplit').addEventListener('click',()=>{closeMenus();spriteOpen('auto');});$('#menuRemoveBackground').addEventListener('click',()=>{closeMenus();spriteOpen('background');});$('#menuStandaloneBackground').addEventListener('click',()=>{closeMenus();bgStandaloneOpen();});$('#menuImageTools').addEventListener('click',()=>{closeMenus();spriteOpen('auto');});
$('#spriteToolsChooseFile').addEventListener('click',()=>$('#spriteToolsUpload').click());$('#spriteToolsUpload').addEventListener('change',spriteTry(async e=>{if(e.target.files[0])await spriteLoadFile(e.target.files[0]);e.target.value='';}));
$('#spriteToolsExisting').addEventListener('change',spriteTry(async e=>{const a=project.assets[e.target.value];if(a?.src)await spriteLoadSource(a.src,a.name||e.target.value);}));
$('#spriteAutoDetect').addEventListener('click',spriteTry(spriteAutoDetect));$('#spriteManualDraw').addEventListener('click',()=>{spriteUpdateShapeHint();spriteMessage(spriteSheetState.drawMode==='poly'?'Click around the sprite to create a freeform boundary. Double-click, press Enter, or use Finish freeform.':'Drag a rectangle on the source preview to create a split.');});$('#spriteFinishPolygon').addEventListener('click',()=>spriteFinalizePolygon());$('#spriteEditPoints').addEventListener('click',()=>{spriteSheetState.editPoints=!spriteSheetState.editPoints;spriteSheetState.activePoly=null;$('#spriteEditPoints').textContent=`Edit points: ${spriteSheetState.editPoints?'On':'Off'}`;spriteRenderPreview();});$('#spriteDeletePoint').addEventListener('click',()=>{const s=spriteSheetState,r=s.regions[s.selection];if(r?.points?.length>3&&s.selectedPoint>=0){r.points.splice(s.selectedPoint,1);s.selectedPoint=-1;Object.assign(r,spriteRegionBounds(r));spriteRenderPreview();spriteRenderRegions();}});$('#spriteCurveSmooth').addEventListener('input',e=>{$('#spriteCurveValue').textContent=e.target.value+'%';const r=spriteSheetState.regions[spriteSheetState.selection];if(r?.type==='bezier'){r.tension=+e.target.value/100;spriteRenderPreview();}});$('#spriteWandTolerance').addEventListener('input',e=>$('#spriteWandToleranceValue').textContent=e.target.value);$('#spriteSelectionShape').addEventListener('change',()=>{spriteUpdateShapeHint();spriteRenderPreview();});$('#spriteClearRegions').addEventListener('click',()=>{spriteSheetState.regions=[];spriteSheetState.selection=-1;spriteSheetState.activePoly=null;spriteSheetState.hoverPoint=null;spriteRenderPreview();spriteRenderRegions();});
$('#spriteRegions').addEventListener('click',e=>{const n=e.target.closest('[data-sprite-remove]');if(n){spriteSheetState.regions.splice(+n.dataset.spriteRemove,1);spriteSheetState.selection=-1;}else{const b=e.target.closest('[data-sprite-select]');if(b)spriteSheetState.selection=+b.dataset.spriteSelect;}spriteRenderRegions();spriteRenderPreview();});
function spriteHandlePosition(p){const s=spriteSheetState,r=s.regions[s.selection];if(!r?.points)return -1;return r.points.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<12/Math.max(.2,s.preview.scale));}
function spriteInsertPoint(point){const s=spriteSheetState,r=s.regions[s.selection];if(!r?.points?.length)return false;let best=Infinity,at=-1;const outline=spriteCurvePoints(r,24);for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];const dx=b.x-a.x,dy=b.y-a.y,lambda=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));const dist=Math.hypot(point.x-a.x-lambda*dx,point.y-a.y-lambda*dy);if(dist<best){best=dist;at=i;}}if(best>14/Math.max(.2,s.preview.scale))return false;let segment=Math.floor(at/(r.type==='bezier'?24:1));r.points.splice(segment+1,0,{x:Math.round(point.x),y:Math.round(point.y)});s.selectedPoint=segment+1;spriteRenderRegions();spriteRenderPreview();return true;}
spriteCanvas.addEventListener('pointerdown',e=>{const s=spriteSheetState;if(s.mode==='background'||!s.working)return;const p=spritePointer(e);
 if(s.editPoints){const idx=spriteHandlePosition(p);if(idx>=0){s.selectedPoint=idx;s.dragPoint={index:idx};spriteCanvas.setPointerCapture(e.pointerId);spriteRenderPreview();return;}if(e.detail>=2){spriteInsertPoint(p);return;}s.selection=s.regions.findIndex(r=>spritePointInRegion(p,r));s.selectedPoint=-1;spriteRenderRegions();spriteRenderPreview();return;}
 if(s.drawMode==='wand'){try{const region=spriteWandRegion(s.working,p,{mode:$('#spriteWandMode').value,tolerance:+$('#spriteWandTolerance').value,alphaThreshold:+$('#spriteAlphaThreshold').value});s.regions.push(region);s.selection=s.regions.length-1;spriteRenderRegions();spriteRenderPreview();spriteMessage(`Wand selected ${region.selectedPixels.toLocaleString()} connected pixels. Download or assign this shape.`);}catch(err){spriteMessage(err.message);}return;}
 if(['poly','bezier'].includes(s.drawMode)){if(e.detail>1&&s.activePoly?.points?.length>=3){spriteFinalizePolygon();return;}if(!s.activePoly)s.activePoly={type:s.drawMode,points:[p]};else s.activePoly.points.push(p);s.hoverPoint=p;spriteRenderPreview();return;}
 s.drawStart={start:p,current:p};spriteCanvas.setPointerCapture(e.pointerId);});
spriteCanvas.addEventListener('pointermove',e=>{const s=spriteSheetState,p=spritePointer(e);if(s.dragPoint){const r=s.regions[s.selection];if(r?.points?.[s.dragPoint.index]){r.points[s.dragPoint.index]={x:Math.round(p.x),y:Math.round(p.y)};Object.assign(r,spriteRegionBounds(r));spriteRenderPreview();}return;}if(['poly','bezier'].includes(s.drawMode)){if(s.activePoly?.points?.length){s.hoverPoint=p;spriteRenderPreview();}return;}if(!s.drawStart)return;s.drawStart.current=p;spriteRenderPreview();});
spriteCanvas.addEventListener('pointerup',e=>{const s=spriteSheetState;if(s.dragPoint){s.dragPoint=null;spriteRenderRegions();spriteRenderPreview();return;}if(s.drawMode!=='rect'||s.editPoints)return;const state=s.drawStart;if(!state)return;s.drawStart=null;const b=spriteRect(state.start,spritePointer(e));if(b.w>8&&b.h>8){s.regions.push(spriteNormalizeRegion(b));s.selection=s.regions.length-1;}else s.selection=s.regions.findIndex(r=>spritePointInRegion(state.start,r));spriteRenderRegions();spriteRenderPreview();});
document.addEventListener('keydown',e=>{if(!$('#spriteToolsDialog').open||spriteSheetState.mode==='background')return;if(e.key==='Enter'&&spriteSheetState.drawMode==='poly'&&spriteSheetState.activePoly?.points?.length>=3){e.preventDefault();spriteFinalizePolygon();}else if(e.key==='Escape'&&spriteSheetState.activePoly){spriteSheetState.activePoly=null;spriteSheetState.hoverPoint=null;spriteRenderPreview();spriteMessage('Freeform boundary canceled.');}});
$('#spriteBackgroundSample').addEventListener('click',()=>{const c=spriteSheetState.original;if(!c)return;const d=c.getContext('2d').getImageData(0,0,1,1).data;$('#spriteBackgroundColor').value='#'+[d[0],d[1],d[2]].map(x=>x.toString(16).padStart(2,'0')).join('');spriteMessage('Background sampled from top-left corner.');});$('#spriteBackgroundTolerance').addEventListener('input',e=>$('#spriteToleranceValue').textContent=e.target.value);
$('#spriteBackgroundPreview').addEventListener('click',spriteTry(spritePreviewRemoval));$('#spriteBackgroundRestore').addEventListener('click',()=>{spriteSheetState.working=spriteSheetState.original;spriteRenderPreview();spriteMessage('Restored original pixels.');});
$('#spriteToolsDownload').addEventListener('click',spriteTry(spriteDownload));$('#spriteToolsQueue').addEventListener('click',spriteTry(spriteQueue));for(const id of ['#spriteToolsClose','#spriteToolsCloseFooter'])$(id).addEventListener('click',()=>$('#spriteToolsDialog').close());
Object.assign(window.SuperMagicAssetStudioAPI,{
 autoSplitImage:(canvas,options={})=>spriteDetectRegions(canvas,options),
 removeImageBackground:(canvas,{color='#ffffff',tolerance=38,connected=true}={})=>spriteBackgroundRemove(canvas,color,tolerance,connected),
 cropImageRegions:async(canvas,regions)=>{const c=spriteSheetState.working;const oldRegions=spriteSheetState.regions;try{spriteSheetState.working=canvas;spriteSheetState.regions=regions;return await spriteBuildFiles();}finally{spriteSheetState.working=c;spriteSheetState.regions=oldRegions;}},
 openImageTools:(mode='auto')=>spriteOpen(mode),
 loadImageToolsFile:async(file)=>spriteLoadFile(file),
 getDetectedRegions:()=>clone(spriteSheetState.regions.map(spriteNormalizeRegion)),
 magicWandRegion:(canvas,seed,options={})=>spriteWandRegion(canvas,seed,options),
 getCurveOutline:(region,steps=12)=>spriteCurvePoints(region,steps),
 openStandaloneBackground:()=>bgStandaloneOpen()
});

// Independent background removal workflow (no split-state or source modifications).
const bgOnly={original:null,working:null,name:'image',preview:{x:0,y:0,scale:1}};
function bgStandaloneOpen(){if(!$('#bgStandaloneDialog').open)$('#bgStandaloneDialog').showModal();bgStandaloneDraw();}
function bgStandaloneDraw(){const c=$('#bgStandaloneCanvas'),g=c.getContext('2d'),source=bgOnly.working;g.fillStyle='#17223a';g.fillRect(0,0,c.width,c.height);g.fillStyle='#354258';for(let y=0;y<c.height;y+=24)for(let x=0;x<c.width;x+=24)if((x/24+y/24)%2<1)g.fillRect(x,y,24,24);if(!source)return;const scale=Math.min(c.width/source.width,c.height/source.height),x=(c.width-source.width*scale)/2,y=(c.height-source.height*scale)/2;bgOnly.preview={x,y,scale};g.drawImage(source,x,y,source.width*scale,source.height*scale);}
$('#bgStandaloneChoose').addEventListener('click',()=>$('#bgStandaloneFile').click());
$('#bgStandaloneFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const url=URL.createObjectURL(f),img=new Image();try{await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});}finally{URL.revokeObjectURL(url);}if(img.width*img.height>22000000)throw Error('Image exceeds 22 MP');const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);bgOnly.original=c;bgOnly.working=c;bgOnly.name=f.name;$('#bgStandaloneStatus').textContent=`${f.name}: ${c.width} × ${c.height}. Sample color or preview removal.`;bgStandaloneDraw();}catch(err){$('#bgStandaloneStatus').textContent='Error: '+err.message;}e.target.value='';});
$('#bgStandaloneCanvas').addEventListener('click',e=>{const c=bgOnly.original;if(!c)return;const rect=e.target.getBoundingClientRect(),k=bgOnly.preview,xx=((e.clientX-rect.left)*880/rect.width-k.x)/k.scale,yy=((e.clientY-rect.top)*440/rect.height-k.y)/k.scale;if(xx<0||yy<0||xx>=c.width||yy>=c.height)return;const data=c.getContext('2d').getImageData(Math.floor(xx),Math.floor(yy),1,1).data;$('#bgStandaloneColor').value='#'+[data[0],data[1],data[2]].map(n=>n.toString(16).padStart(2,'0')).join('');$('#bgStandaloneStatus').textContent='Sampled color. Click Preview removal.';});
$('#bgStandalonePreview').addEventListener('click',()=>{if(!bgOnly.original)return;try{const out=spriteBackgroundRemove(bgOnly.original,$('#bgStandaloneColor').value,+$('#bgStandaloneTolerance').value,$('#bgStandaloneConnected').checked);bgOnly.working=out.canvas;bgStandaloneDraw();$('#bgStandaloneStatus').textContent=`Removed ${out.removed.toLocaleString()} pixels. The source remains unchanged.`;}catch(e){$('#bgStandaloneStatus').textContent=e.message;}});
$('#bgStandaloneRestore').addEventListener('click',()=>{bgOnly.working=bgOnly.original;bgStandaloneDraw();});
async function bgStandaloneBlob(){if(!bgOnly.working)throw Error('Choose a source image');return new Promise(res=>bgOnly.working.toBlob(res,'image/png'));}
$('#bgStandaloneDownload').addEventListener('click',async()=>{try{const b=await bgStandaloneBlob();download(b,`${spriteFileStem(bgOnly.name)}_transparent.png`);}catch(e){$('#bgStandaloneStatus').textContent=e.message;}});
$('#bgStandaloneQueue').addEventListener('click',async()=>{try{const b=await bgStandaloneBlob();await stageFiles([new File([b],`${spriteFileStem(bgOnly.name)}_transparent.png`,{type:'image/png'})]);$('#bgStandaloneStatus').textContent='Transparent image added to import queue.';}catch(e){$('#bgStandaloneStatus').textContent=e.message;}});
for(const id of ['#bgStandaloneClose','#bgStandaloneCloseFooter'])$(id).addEventListener('click',()=>$('#bgStandaloneDialog').close());
// Menu bar
$('#menubar').addEventListener('click',e=>{const btn=e.target.closest('.menu-btn');if(btn){e.stopPropagation();toggleMenuButton(btn);return;}});
document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus();});
const clickRelay=(menuId,targetId)=>$(menuId).addEventListener('click',()=>{$(targetId).click();closeMenus();});
[['#menuNewProject','#newProject'],['#menuLoadProject','#loadProject'],['#menuFileImportImage','#imageInput'],['#menuSaveProject','#saveProject'],['#menuExportPNG','#exportPNG'],['#menuExportGIF','#exportGIF'],['#menuExportTurntable','#exportTurntable'],['#menuExportSheet','#exportSheet'],['#menuImportImages','#imageInput'],['#menuImportParts','#loadPartsSchema'],['#menuDownloadParts','#downloadPartsSchema'],['#menuResolveImages','#resolveImagesBtn'],['#menuPrevView','#prevView'],['#menuNextView','#nextView'],['#menuSpinView','#spinView'],['#menuZoomFit','#zoomFit'],['#menuToggleGrid','#gridToggle'],['#menuToggleRulers','#rulerToggle'],['#menuToggleGuides','#toggleGrid'],['#menuToggleCropHandles','#cropTool'],['#menuAddAnimation','#addAnimation'],['#menuDeleteAnimation','#deleteAnimation'],['#menuAddFrame','#addFrame'],['#menuDuplicateFrame','#duplicateFrame'],['#menuDeleteFrame','#deleteFrame'],['#menuPlayAnimation','#playBtn'],['#menuAppendClip','#appendClip'],['#menuUnlinkFrame','#unlinkFrame'],['#menuUndo','#undoBtn'],['#menuRedo','#redoBtn']].forEach(([a,b])=>clickRelay(a,b));
$('#menuAutoFit').addEventListener('click',()=>{closeMenus();geometryAutoFit();});
$('#menuAutoResize').addEventListener('click',()=>{closeMenus();openAutoResize();});
$('#menuHelp').addEventListener('click',()=>{closeMenus();openHelpDialog();});
$('#menuAI').addEventListener('click',()=>{closeMenus();openAIDialog();});
$('#menuAPIDocs').addEventListener('click',()=>{closeMenus();openAIDialog();$('#aiCommandOutput').textContent=`See API.md in the package for the full browser API.\n\nMain entry point:\nwindow.SuperMagicAssetStudioAPI`;});
$('#menuCLIHelp').addEventListener('click',()=>{closeMenus();openHelpDialog();notify('Use SuperMagicAssetStudio.ps1 and see CLI_API.md for all agent commands.');});
$('#menuJSONDocs').addEventListener('click',()=>{closeMenus();openHelpDialog();notify('See JSON_FORMAT.md in the package for the full project schema.');});
$('#menuAssetGuide').addEventListener('click',()=>{closeMenus();openHelpDialog();notify('See ASSET_CREATION_GUIDE.md in the package.');});
$('#menuSpriteDocs').addEventListener('click',()=>{closeMenus();openHelpDialog();notify('See IMAGE_TOOLS_API.md in the package.');});
$('#closeHelp').addEventListener('click',()=>$('#helpDialog').close());
$('#closeHelpFooter').addEventListener('click',()=>$('#helpDialog').close());
$('#openAIPanelFromHelp').addEventListener('click',()=>{$('#helpDialog').close();openAIDialog();});
$('#closeAIDialog').addEventListener('click',()=>$('#aiDialog').close());
$('#closeAIDialogFooter').addEventListener('click',()=>$('#aiDialog').close());
$('#aiHelpBtn').addEventListener('click',()=>{$('#aiDialog').close();openHelpDialog();});
$('#runAICommands').addEventListener('click',async ()=>{try{const payload=JSON.parse($('#aiCommandInput').value);const result=await runStructuredCommands(payload);$('#aiCommandOutput').textContent=result||'Done.';}catch(err){$('#aiCommandOutput').textContent='Error: '+err.message;}});
$('#loadAIExample').addEventListener('click',()=>{$('#aiCommandInput').value=JSON.stringify({commands:[{op:'setProjectName',name:'Alex Runtime Pack'},{op:'setMode',mode:'bodyHead'},{op:'setImageStorage',mode:'external'},{op:'summary'},{op:'review'}]},null,2);});
$('#copyAISchema').addEventListener('click',async ()=>{const schema=JSON.stringify({commands:[{op:'setProjectName',name:'Project name'},{op:'setMode',mode:'fullBody|bodyHead|standard|custom'},{op:'setImageStorage',mode:'bundled|external'},{op:'setView',view:'front|threeQuarterFrontLeft|left|threeQuarterBackLeft|back|threeQuarterBackRight|right|threeQuarterFrontRight'},{op:'setAnimation',animation:'run'},{op:'setFrame',frame:'run_1'},{op:'selectLayer',match:{name:'Head'},scope:'currentFrame|currentAnimationCurrentView|allCurrentView|all'},{op:'setLayer',match:{category:'head'},scope:'currentFrame',changes:{transform:{x:384,y:210,scaleX:1,scaleY:1},color:{red:110,green:100,blue:95},visible:true}},{op:'moveLayer',match:{category:'head'},direction:'front|back|up|down',scope:'currentFrame'},{op:'deleteLayer',match:{nameContains:'temp'},scope:'currentFrame'},{op:'createAnimation',name:'Celebrate',id:'celebrate',fps:10,frames:['Celebrate 1','Celebrate 2']},{op:'addCustomPart',name:'Left glove',id:'custom_left_glove',group:'Accessories'},{op:'setReference',view:'front',animation:'stand',frame:'stand_1',alpha:0.3,enabled:true},{op:'summary'},{op:'review'}]},null,2); try{await navigator.clipboard.writeText(schema); $('#aiCommandOutput').textContent='Command schema copied to clipboard.';}catch(_){$('#aiCommandOutput').textContent=schema;}});

populateChoices();renderQueue();refresh();requestAnimationFrame(fitZoom);
})();