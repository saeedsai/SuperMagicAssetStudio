/** Headless PNG sprite-sheet splitter and edge-connected background removal. Node stdlib only. */
import fs from 'node:fs';
import path from 'node:path';
import {readPNG,encodePNG} from './agent-raster.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function validRect(rect,w,h){const x=Math.round(Number(rect.x)),y=Math.round(Number(rect.y)),rw=Math.round(Number(rect.w??rect.width)),rh=Math.round(Number(rect.h??rect.height));if(![x,y,rw,rh].every(Number.isFinite)||x<0||y<0||rw<1||rh<1||x+rw>w||y+rh>h)throw new Error(`Invalid crop rectangle: ${JSON.stringify(rect)}`);return {x,y,w:rw,h:rh};}
export function detectSpriteRegions(image,{alphaThreshold=25,minPixels=1000,padding=3,maxSprites=128}={}){
 const {width:w,height:h,data}=image;if(w*h>22000000)throw new Error('Max 22 MP input');const cut=clamp(Math.round(alphaThreshold),1,254),limit=Math.max(30,Number(minPixels)||1000),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),boxes=[];let opaque=0;
 for(let i=3;i<data.length;i+=4)if(data[i]>cut)opaque++;if(opaque/w/h>.985)throw new Error('Image appears opaque; remove background or use manual split.');
 for(let at=0;at<w*h;at++){
  if(seen[at]||data[at*4+3]<=cut)continue;
  let head=0,tail=1,x=at%w,y=Math.floor(at/w),l=x,r=x,t=y,b=y;seen[at]=1;queue[0]=at;
  while(head<tail){const n=queue[head++],xx=n%w,yy=(n-xx)/w;l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);
   const neigh=[xx>0?n-1:-1,xx<w-1?n+1:-1,yy>0?n-w:-1,yy<h-1?n+w:-1];
   for(const k of neigh){if(k<0||seen[k]||data[k*4+3]<=cut)continue;seen[k]=1;queue[tail++]=k;}}
  if(tail>=limit&&r-l>15&&b-t>15){const pad=clamp(padding,0,100);const x0=clamp(l-pad,0,w),y0=clamp(t-pad,0,h),x1=clamp(r+1+pad,0,w),y1=clamp(b+1+pad,0,h);boxes.push({x:x0,y:y0,w:x1-x0,h:y1-y0});}
  if(boxes.length>maxSprites)throw new Error('Too many detected regions; increase minPixels.');
 }
 const hs=[...boxes].map(b=>b.h).sort((a,b)=>a-b),median=hs[Math.floor(hs.length/2)]||100,rows=[];
 for(const box of boxes.sort((a,b)=>a.y-b.y)){let row=rows.find(r=>Math.abs(r.y-box.y)<median*.32);if(!row){row={y:box.y,items:[]};rows.push(row);}row.items.push(box);row.y=row.items.reduce((v,p)=>v+p.y,0)/row.items.length;}
 return rows.sort((a,b)=>a.y-b.y).flatMap(r=>r.items.sort((a,b)=>a.x-b.x));
}
export function cropPNG(image,rect){const b=validRect(rect,image.width,image.height),out=Buffer.alloc(b.w*b.h*4);for(let y=0;y<b.h;y++)image.data.copy(out,y*b.w*4,((b.y+y)*image.width+b.x)*4,((b.y+y)*image.width+b.x+b.w)*4);return {width:b.w,height:b.h,data:out};}
/** Closed smooth path through anchor points, Catmull-Rom converted to cubic Bezier. */
export function curveOutline(region,steps=12){const pts=region.points||[],n=pts.length;if(region.type!=='bezier'||n<3)return pts;const out=[],k=clamp(Number(region.tension??.75),0,1)/6;for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n],d=pts[(i+2)%n];const p1={x:b.x+(c.x-a.x)*k,y:b.y+(c.y-a.y)*k},p2={x:c.x-(d.x-b.x)*k,y:c.y-(d.y-b.y)*k};for(let t=0;t<steps;t++){const z=t/steps,u=1-z;out.push({x:u*u*u*b.x+3*u*u*z*p1.x+3*u*z*z*p2.x+z*z*z*c.x,y:u*u*u*b.y+3*u*u*z*p1.y+3*u*z*z*p2.y+z*z*z*c.y});}}return out;}
function insidePolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y||1e-9)+a.x))inside=!inside;}return inside;}
export function magicWandSelection(image,{seed,mode='alpha',tolerance=40,alphaThreshold=25}={}){
 const {width:w,height:h,data}=image;if(!seed)throw new Error('Wand selection needs seed: {x,y}');const x=Math.floor(Number(seed.x)),y=Math.floor(Number(seed.y));if(x<0||y<0||x>=w||y>=h)throw new Error('Wand point outside image');const first=y*w+x,ri=first*4,reference=[data[ri],data[ri+1],data[ri+2]];if(mode==='alpha'&&data[ri+3]<=alphaThreshold)throw new Error('Wand must start on an opaque sprite pixel');const visited=new Uint8Array(w*h),mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let start=0,end=1,left=x,right=x,top=y,bottom=y;visited[first]=1;queue[0]=first;
 const similar=i=>{const n=i*4;return mode==='alpha'?data[n+3]>alphaThreshold:data[n+3]>0&&Math.hypot(data[n]-reference[0],data[n+1]-reference[1],data[n+2]-reference[2])<=tolerance;};
 while(start<end){const idx=queue[start++],px=idx%w,py=Math.floor(idx/w);mask[idx]=1;left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);for(const n of [px>0?idx-1:-1,px<w-1?idx+1:-1,py>0?idx-w:-1,py<h-1?idx+w:-1])if(n>=0&&!visited[n]){visited[n]=1;if(similar(n))queue[end++]=n;}}
 return {region:{type:'wand',x:left,y:top,w:right-left+1,h:bottom-top+1,seed:{x,y},mode,tolerance},mask,count:end};}
export function cropShapePNG(image,region){if(!region||!['poly','bezier','wand'].includes(region.type))return cropPNG(image,region);let points=[];let wand=null;
 if(region.type==='wand'){wand=magicWandSelection(image,region);region=wand.region;}else{points=curveOutline(region,16);if(points.length<3)throw new Error('Polygon requires 3+ points');const xs=points.map(p=>p.x),ys=points.map(p=>p.y);region={...region,x:Math.max(0,Math.floor(Math.min(...xs))),y:Math.max(0,Math.floor(Math.min(...ys))),w:Math.min(image.width,Math.ceil(Math.max(...xs)))-Math.max(0,Math.floor(Math.min(...xs))),h:Math.min(image.height,Math.ceil(Math.max(...ys)))-Math.max(0,Math.floor(Math.min(...ys)))};}
 const b=validRect(region,image.width,image.height),out=cropPNG(image,b);for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const srcX=b.x+x,srcY=b.y+y,keep=wand?wand.mask[srcY*image.width+srcX]===1:insidePolygon(srcX+.5,srcY+.5,points);if(!keep)out.data[(y*b.w+x)*4+3]=0;}return out;
}
export function removeEdgeBackground(image,{color='#ffffff',tolerance=38,connected=true}={}){
 const {width:w,height:h}=image,data=Buffer.from(image.data);if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('color must be #RRGGBB');const rgb=[1,3,5].map(x=>parseInt(color.slice(x,x+2),16));let removed=0;const match=i=>data[4*i+3]>0&&Math.hypot(data[4*i]-rgb[0],data[4*i+1]-rgb[1],data[4*i+2]-rgb[2])<=Number(tolerance);
 if(connected){const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;const seed=i=>{if(i<0||seen[i])return;seen[i]=1;if(match(i))queue[tail++]=i;};for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}while(head<tail){const n=queue[head++],x=n%w,y=(n-x)/w;data[4*n+3]=0;removed++;if(x>0)seed(n-1);if(x<w-1)seed(n+1);if(y>0)seed(n-w);if(y<h-1)seed(n+w);}}
 else for(let i=0;i<w*h;i++)if(match(i)){data[i*4+3]=0;removed++;}
 return {image:{width:w,height:h,data},removed};
}
export function analyzeSpriteImage(source,opts={}){const image=readPNG(fs.readFileSync(source));return {width:image.width,height:image.height,regions:detectSpriteRegions(image,opts)};}
export function runImageOperation(cmd){if(!cmd?.source)throw new Error('Image tool requires source PNG path');const source=path.resolve(cmd.source),image=readPNG(fs.readFileSync(source)),kind=cmd.op;const outputDir=path.resolve(cmd.outputDir||path.join(path.dirname(source),'sprites_extracted'));fs.mkdirSync(outputDir,{recursive:true});const stem=path.basename(source,path.extname(source)).replace(/[^a-z0-9_-]+/gi,'_').slice(0,80);
 let working=image,regions=[];let removed=0;
 if(kind==='removeBackground'){const result=removeEdgeBackground(image,{color:cmd.color||'#ffffff',tolerance:cmd.tolerance??38,connected:cmd.connected!==false});working=result.image;removed=result.removed;regions=[{x:0,y:0,w:image.width,h:image.height}];}
 else if(kind==='splitImageManual'){if(!Array.isArray(cmd.regions)||!cmd.regions.length)throw new Error('Manual split requires regions array');regions=cmd.regions.map(r=>['poly','bezier','wand'].includes(r.type)?r:validRect(r,image.width,image.height));}
 else if(kind==='splitImageWand'){regions=[{type:'wand',seed:cmd.seed,mode:cmd.mode||'alpha',tolerance:cmd.tolerance??40,alphaThreshold:cmd.alphaThreshold??25}];}
 else if(kind==='splitImageAuto'){if(cmd.method==='grid'){const rows=clamp(Math.round(cmd.rows||2),1,32),cols=clamp(Math.round(cmd.columns||3),1,32);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const x0=Math.floor(x*image.width/cols),y0=Math.floor(y*image.height/rows),x1=Math.ceil((x+1)*image.width/cols),y1=Math.ceil((y+1)*image.height/rows);regions.push({x:x0,y:y0,w:x1-x0,h:y1-y0});}}
 else regions=detectSpriteRegions(image,{alphaThreshold:cmd.alphaThreshold??25,minPixels:cmd.minPixels??1000,padding:cmd.padding??3});if(Array.isArray(cmd.regions))regions.push(...cmd.regions);}
 else throw new Error(`Unknown image operation ${kind}`);
 const files=[];
 for(let i=0;i<regions.length;i++){
  const filename=`${stem}_${kind==='removeBackground'?'transparent':String(i+1).padStart(2,'0')}.png`,dest=path.join(outputDir,filename),cut=cropShapePNG(working,regions[i]);fs.writeFileSync(dest,encodePNG(cut));const assignment=(cmd.assignments||[])[i]||{};files.push({file:filename,path:dest,view:assignment.view||cmd.view||'front',animation:assignment.animation||cmd.animation||'stand',frame:assignment.frame||cmd.frame||'stand_1',category:assignment.category||cmd.category||'bodyPart',mirror:!!assignment.mirror,cropSource:regions[i],width:cut.width,height:cut.height});}
 const manifest={format:'FootballSpriteAssetBundle',version:1,source:path.basename(source),items:files.map(({path:_,...entry})=>entry)};const manifestPath=path.join(outputDir,`${stem}_manifest.json`);fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));return {op:kind,source,outputDir,manifestPath,detected:files.length,removedPixels:removed,files};
}