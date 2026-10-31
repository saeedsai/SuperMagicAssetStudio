/* Football Sprite Studio - reusable game renderer
 * No dependencies. Load a project JSON exported by the editor.
 * Works with 2D HTML Canvas, including React/Phaser projects that provide a CanvasRenderingContext2D.
 */
(function (root) {
  'use strict';

  // Dependency-free mirror of the shared rig evaluator for the classic-script game runtime.
  function rigPoseLayers(layers,rig,pose) {
    if (!rig?.joints?.length || !rig.bindings?.length) return layers;
    const jointMap=new Map(rig.joints.map(j=>[j.id,j])),world=new Map(),visiting=new Set();
    function evaluate(id) {
      if(world.has(id))return world.get(id);
      if(visiting.has(id))throw new Error('Cyclic skeleton');
      const j=jointMap.get(id);if(!j)throw new Error('Missing joint: '+id);
      visiting.add(id);
      const d=pose?.[id]||{},a=d.rotationDeg||0;
      let x=j.position.x+(d.x||0),y=j.position.y+(d.y||0),angle=a;
      if(j.parent){
        const parent=evaluate(j.parent),restParent=jointMap.get(j.parent).position;
        const rx=j.position.x-restParent.x+(d.x||0),ry=j.position.y-restParent.y+(d.y||0),r=parent.rotationDeg*Math.PI/180;
        x=parent.x+rx*Math.cos(r)-ry*Math.sin(r);
        y=parent.y+rx*Math.sin(r)+ry*Math.cos(r);
        angle+=parent.rotationDeg;
      }
      const value={x,y,rotationDeg:angle};world.set(id,value);visiting.delete(id);return value;
    }
    const bound=new Map(rig.bindings.map(b=>[b.category,b]));
    return layers.map(layer=>{
      const b=bound.get(layer.category);if(!b||!layer.transform)return layer;
      const j=evaluate(b.joint),rest=jointMap.get(b.joint),t=layer.transform,r=j.rotationDeg*Math.PI/180;
      const ax=b.anchor?.x||0,ay=b.anchor?.y||0,dx=t.x-rest.position.x-ax,dy=t.y-rest.position.y-ay;
      return {...layer,transform:{...t,x:j.x+ax+dx*Math.cos(r)-dy*Math.sin(r),y:j.y+ay+dx*Math.sin(r)+dy*Math.cos(r),rotationDeg:(t.rotationDeg||0)+j.rotationDeg}};
    });
  }
  function rigSampleMotion(motion,time) {
    if(!motion?.keyframes?.length)return {};
    const k=[...motion.keyframes].sort((a,b)=>a.timeMs-b.timeMs);
    if(time<=k[0].timeMs)return k[0].pose||{};
    if(time>=k[k.length-1].timeMs)return k[k.length-1].pose||{};
    for(let i=1;i<k.length;i++)if(time<=k[i].timeMs){
      const a=k[i-1],b=k[i],t=(time-a.timeMs)/(b.timeMs-a.timeMs),pose={};
      for(const id of new Set([...Object.keys(a.pose||{}),...Object.keys(b.pose||{})])){
        const start=a.pose?.[id]||{},end=b.pose?.[id]||{};
        pose[id]={};for(const key of ['rotationDeg','x','y'])pose[id][key]=(start[key]||0)+((end[key]||0)-(start[key]||0))*t;
      }return pose;
    }
    return {};
  }
  class FootballSpriteCharacter {
    constructor(project) {
      if (!project || project.format !== 'FootballSpriteStudio') {
        throw new Error('Expected a Football Sprite Studio JSON project');
      }
      this.project = project;
      this.images = new Map();
    }
    static async fromURL(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Project download failed: ' + response.status);
      const character = new FootballSpriteCharacter(await response.json());
      await character.load();
      return character;
    }
    static async fromFile(file) {
      const character = new FootballSpriteCharacter(JSON.parse(await file.text()));
      await character.load();
      return character;
    }
    async load() {
      const entries = Object.entries(this.project.assets || {});
      await Promise.all(entries.map(([id, asset]) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => { this.images.set(id, image); resolve(); };
        image.onerror = () => reject(new Error('Could not decode: ' + asset.name));
        image.src = asset.src;
      })));
      return this;
    }
    animation(id = 'stand') {
      return this.project.animations.find(a => a.id === id)
        || this.project.animations.find(a => a.name.toLowerCase() === id.toLowerCase())
        || this.project.animations[0];
    }
    frames(animation = 'stand') { return this.animation(animation).frames; }
    durationMs(animation = 'stand') { const a = this.animation(animation); return a.frames.length * 1000 / a.fps; }
    frameAtTime(animation = 'stand', elapsedMs = 0) {
      const a = this.animation(animation);
      return Math.floor(Math.max(0, elapsedMs) * a.fps / 1000) % a.frames.length;
    }
    // x and y position the world-space origin. With origin='feet' (default),
    // (x,y) is the sprite's bottom-center, easy for platformers and football games.
    // With origin='topLeft', (x,y) is the top-left of the original editor canvas.
    // Scale multiplies all saved layer sizes; rotation is a whole-character rotation.
    draw(context, { view = 'front', animation = 'stand', frame = 0,
      x = 0, y = 0, scale = 1, rotationDeg = 0, alpha = 1,
      origin = 'feet', flipX = false } = {}) {
      const a = this.animation(animation);
      const f = typeof frame === 'string' ? a.frames.find(item => item.id === frame || item.name === frame)
        : a.frames[((Math.trunc(frame) % a.frames.length) + a.frames.length) % a.frames.length];
      if (!f) return;
      const width = this.project.canvas.width, height = this.project.canvas.height;
      const baseLayers = this.project.scenes?.[view]?.[a.id]?.[f.id] || [];
      const frameIndex = a.frames.indexOf(f),motion=this.project.motions?.[view]?.[a.id];
      const timeMs = Math.max(0,frameIndex)*1000/(a.fps||8);
      const pose=motion?rigSampleMotion(motion,timeMs):this.project.poses?.[view]?.[a.id]?.[f.id]||{};
      const layers=rigPoseLayers(baseLayers,this.project.rigs?.[view],pose);
      context.save();
      context.globalAlpha *= alpha;
      context.translate(x, y);
      context.rotate(rotationDeg * Math.PI / 180);
      context.scale(scale * (flipX ? -1 : 1), scale);
      if (origin === 'feet') context.translate(-width / 2, -height);
      else if (origin === 'center') context.translate(-width / 2, -height / 2);
      for (const layer of layers) {
        if (layer.visible === false) continue;
        const image = this.images.get(layer.assetId);
        if (!image) continue;
        const crop = layer.crop, t = layer.transform;
        if (!crop || !t || crop.w <= 0 || crop.h <= 0) continue;
        context.save();
        context.globalAlpha *= (t.opacity ?? 1);
        context.translate(t.x, t.y);
        context.rotate(t.rotationDeg * Math.PI / 180);
        context.scale(t.scaleX * (t.flipX ? -1 : 1), t.scaleY * (t.flipY ? -1 : 1));
        context.drawImage(image, crop.x, crop.y, crop.w, crop.h,
          -crop.w * (t.anchorX ?? .5), -crop.h * (t.anchorY ?? .5), crop.w, crop.h);
        context.restore();
      }
      context.restore();
    }
    // Full sprite preview. Output canvas may be any pixel resolution.
    drawToCanvas(canvas, { view = 'front', animation = 'stand', frame = 0,
      clear = true } = {}) {
      const ctx = canvas.getContext('2d');
      if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / this.project.canvas.width,
        canvas.height / this.project.canvas.height);
      this.draw(ctx, { view, animation, frame, x: 0, y: 0, origin: 'topLeft' });
      ctx.restore();
    }
  }
  root.FootballSpriteCharacter = FootballSpriteCharacter;
})(typeof window !== 'undefined' ? window : globalThis);