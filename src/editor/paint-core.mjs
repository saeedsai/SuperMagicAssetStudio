/** Pure, bounded canvas-selection geometry. No DOM dependencies. */
export function rectangleMask(width,height,a,b){
 const out=new Uint8Array(width*height),x0=Math.max(0,Math.floor(Math.min(a.x,b.x))),y0=Math.max(0,Math.floor(Math.min(a.y,b.y))),x1=Math.min(width,Math.ceil(Math.max(a.x,b.x))),y1=Math.min(height,Math.ceil(Math.max(a.y,b.y)));
 for(let y=y0;y<y1;y++)out.fill(1,y*width+x0,y*width+x1);return out;
}
export function polygonMask(width,height,points){
 const out=new Uint8Array(width*height);if(points.length<3)return out;
 const minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))),maxY=Math.min(height,Math.ceil(Math.max(...points.map(p=>p.y))));
 for(let y=minY;y<maxY;y++){const crosses=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y+.5)!==(b.y>y+.5))crosses.push(a.x+(y+.5-a.y)*(b.x-a.x)/(b.y-a.y));}crosses.sort((a,b)=>a-b);for(let i=0;i+1<crosses.length;i+=2){const x0=Math.max(0,Math.ceil(crosses[i]-.5)),x1=Math.min(width,Math.ceil(crosses[i+1]-.5));if(x1>x0)out.fill(1,y*width+x0,y*width+x1);}}return out;
}
export function floodMask(data,width,height,sx,sy,tolerance=35){
 if(width*height>4194304||data.length!==width*height*4)throw new Error('Selection exceeds safe image limits');
 const out=new Uint8Array(width*height),seen=new Uint8Array(width*height),queue=new Int32Array(width*height),x=Math.floor(sx),y=Math.floor(sy);if(x<0||y<0||x>=width||y>=height)return out;
 const start=(y*width+x)*4,ref=data.subarray(start,start+4),tol=Math.max(0,Math.min(255,Number(tolerance)||0)),seed=y*width+x;let head=0,tail=1;queue[0]=seed;seen[seed]=1;
 while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);out[at]=1;
  const around=[x>0?at-1:-1,x<width-1?at+1:-1,y>0?at-width:-1,y<height-1?at+width:-1];
  for(const n of around){if(n<0||seen[n])continue;seen[n]=1;const k=n*4;
   if(Math.max(Math.abs(data[k]-ref[0]),Math.abs(data[k+1]-ref[1]),Math.abs(data[k+2]-ref[2]),Math.abs(data[k+3]-ref[3]))<=tol)queue[tail++]=n;
  }
 }return out;
}
export function regularPolygon(cx,cy,x,y,sides){
 const n=Math.max(3,Math.min(64,Math.round(Number(sides)||3))),angle=Math.atan2(y-cy,x-cx),radius=Math.hypot(x-cx,y-cy);return Array.from({length:n},(_,i)=>({x:cx+radius*Math.cos(angle+i*Math.PI*2/n),y:cy+radius*Math.sin(angle+i*Math.PI*2/n)}));
}
export function applyMaskAlpha(data,mask){
 if(data.length!==mask.length*4)throw new Error('Mask and image dimensions differ');
 for(let i=0;i<mask.length;i++)if(!mask[i])data[i*4+3]=0;return data;
}
