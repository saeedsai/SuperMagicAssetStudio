/* Pure sprite geometry. No project state or DOM dependency. */
(function(global){
'use strict';
function spriteCurvePoints(region,step=12){const pts=region.points||[],n=pts.length;if(region.type!=='bezier'||n<3)return pts;const result=[],k=Math.max(0,Math.min(1,Number(region.tension??.75)))/6;for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n],d=pts[(i+2)%n];const p1={x:b.x+(c.x-a.x)*k,y:b.y+(c.y-a.y)*k},p2={x:c.x-(d.x-b.x)*k,y:c.y-(d.y-b.y)*k};for(let t=0;t<step;t++){const z=t/step,u=1-z;result.push({x:u*u*u*b.x+3*u*u*z*p1.x+3*u*z*z*p2.x+z*z*z*c.x,y:u*u*u*b.y+3*u*u*z*p1.y+3*u*z*z*p2.y+z*z*z*c.y});}}return result;}
function spriteRegionBounds(region){if(!region)return{x:0,y:0,w:0,h:0};if(['poly','bezier'].includes(region.type)&&region.points?.length){const outline=region.type==='bezier'?spriteCurvePoints(region,16):region.points;const xs=outline.map(p=>p.x),ys=outline.map(p=>p.y),x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys)),x2=Math.ceil(Math.max(...xs)),y2=Math.ceil(Math.max(...ys));return {x,y,w:Math.max(1,x2-x),h:Math.max(1,y2-y)};}return {x:region.x,y:region.y,w:region.w,h:region.h};}
function spriteNormalizeRegion(region){if(region.type==='wand')return {...region};if(['poly','bezier'].includes(region.type)&&region.points?.length){const b=spriteRegionBounds(region);return {...b,type:region.type,tension:region.tension??.75,points:region.points.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))};}return {type:'rect',x:Math.round(region.x),y:Math.round(region.y),w:Math.round(region.w),h:Math.round(region.h)};}
function spriteDrawRegionPath(ctx,region,dx=0,dy=0){
 if(['poly','bezier'].includes(region.type)&&region.points?.length){
 const pts=region.points,n=pts.length;ctx.beginPath();ctx.moveTo(pts[0].x+dx,pts[0].y+dy);
 if(region.type==='bezier'&&n>=3){const k=Math.max(0,Math.min(1,Number(region.tension??.75)))/6;
 for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n],d=pts[(i+2)%n];
 ctx.bezierCurveTo(b.x+(c.x-a.x)*k+dx,b.y+(c.y-a.y)*k+dy,c.x-(d.x-b.x)*k+dx,c.y-(d.y-b.y)*k+dy,c.x+dx,c.y+dy);}}
 else for(const p of pts.slice(1))ctx.lineTo(p.x+dx,p.y+dy);
 ctx.closePath();}else{ctx.beginPath();ctx.rect(region.x+dx,region.y+dy,region.w,region.h);}}
function spritePointInRegion(point,region,ctx){const b=spriteRegionBounds(region);if(point.x<b.x||point.x>b.x+b.w||point.y<b.y||point.y>b.y+b.h)return false;if(region.type==='bezier'){const g=ctx;g.save();spriteDrawRegionPath(g,region);const inside=g.isPointInPath(point.x,point.y);g.restore();return inside;}if(region.type!=='poly'||!region.points?.length)return true;let inside=false;const pts=region.points;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],c=pts[j];const hit=((a.y>point.y)!=(c.y>point.y))&&(point.x<(c.x-a.x)*(point.y-a.y)/(c.y-a.y||1e-9)+a.x);if(hit)inside=!inside;}return inside;}
const api=Object.freeze({curvePoints:spriteCurvePoints,regionBounds:spriteRegionBounds,normalizeRegion:spriteNormalizeRegion,drawRegionPath:spriteDrawRegionPath,pointInRegion:spritePointInRegion});
global.SuperMagicSpriteGeometry=api;
})(typeof window!=='undefined'?window:globalThis);