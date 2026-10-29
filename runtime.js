/* Football Sprite Studio - reusable game renderer
 * No dependencies. Load a project JSON exported by the editor.
 * Works with 2D HTML Canvas, including React/Phaser projects that provide a CanvasRenderingContext2D.
 */
(function (root) {
  'use strict';
  class FootballSpriteCharacter {
    constructor(project, { assetBaseUrl = "" } = {}) {
      if (!project || project.format !== 'FootballSpriteStudio') {
        throw new Error('Expected a Football Sprite Studio JSON project');
      }
      this.project = project;
      this.images = new Map();
      this.assetBaseUrl = assetBaseUrl;
      this.rgbCache = new Map();
    }
    static async fromURL(url, options = {}) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Project download failed: ' + response.status);
      const character = new FootballSpriteCharacter(await response.json(), {assetBaseUrl:options.assetBaseUrl || new URL(".", new URL(url, location.href)).href});
      await character.load();
      return character;
    }
    static async fromFile(file, options = {}) {
      const character = new FootballSpriteCharacter(JSON.parse(await file.text()), options);
      await character.load();
      return character;
    }
    async load() {
      const entries = Object.entries(this.project.assets || {});
      await Promise.all(entries.map(([id, asset]) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => { this.images.set(id, image); resolve(); };
        image.onerror = () => reject(new Error('Could not decode: ' + asset.name));
        const path = asset.src || asset.fileRef || asset.name;
        if (!path) return reject(new Error('Missing image source for asset ' + id));
        image.src = asset.src ? asset.src : (this.assetBaseUrl ? new URL(path, this.assetBaseUrl).href : path);
      })));
      return this;
    }
    // Channel multipliers apply in source-image RGB space before Canvas CSS-style filters.
    // Cached tiles ensure repeated animation renders don't process pixel data each frame.
    getRGBImage(layer, image) {
      const c=layer.color||{};
      const red=Math.max(0,Math.min(300,Number(c.red??100)));
      const green=Math.max(0,Math.min(300,Number(c.green??100)));
      const blue=Math.max(0,Math.min(300,Number(c.blue??100)));
      const tintAmount=Math.max(0,Math.min(100,Number(c.tintAmount??0)))/100,hex=/^#[0-9a-f]{6}$/i.test(c.tintHex||'')?c.tintHex:'#ffffff',tint=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
      if(red===100&&green===100&&blue===100&&tintAmount===0)return null;
      const crop=layer.crop;
      const key=[layer.assetId,crop.x,crop.y,crop.w,crop.h,red,green,blue,tintAmount,hex].join(':');
      if(this.rgbCache.has(key))return this.rgbCache.get(key);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(crop.w));canvas.height=Math.max(1,Math.ceil(crop.h));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];data[i]=Math.min(255,Math.round(data[i]*red/100*(1-tintAmount)+(lum*tint[0]/255)*tintAmount));data[i+1]=Math.min(255,Math.round(data[i+1]*green/100*(1-tintAmount)+(lum*tint[1]/255)*tintAmount));data[i+2]=Math.min(255,Math.round(data[i+2]*blue/100*(1-tintAmount)+(lum*tint[2]/255)*tintAmount));}
      ctx.putImageData(pixels,0,0);this.rgbCache.set(key,canvas);return canvas;
    }
    static get VIEWS() {return ['front','threeQuarterFrontLeft','left','threeQuarterBackLeft','back','threeQuarterBackRight','right','threeQuarterFrontRight'];}
    viewForAngle(degrees) {return FootballSpriteCharacter.VIEWS[((Math.round(degrees / 45) % 8) + 8) % 8];}
    rotateView(view = 'front', steps = 1) {const ids = FootballSpriteCharacter.VIEWS;const i = ids.indexOf(view);return ids[((i + steps) % 8 + 8) % 8];}
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
    // Linkable animation frames reuse source frame content at render time.
    // The local scene is added on top, preserving its explicit z-order.
    resolveLayers(view, animationId, frameId, seen = new Set()) {
      const key = `${animationId}:${frameId}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const animation = this.project.animations.find(a => a.id === animationId);
      const frame = animation?.frames.find(f => f.id === frameId);
      const inherited = frame?.reuse?.animation && frame?.reuse?.frame
        ? this.resolveLayers(view, frame.reuse.animation, frame.reuse.frame, seen) : [];
      return inherited.concat(this.project.scenes?.[view]?.[animationId]?.[frameId] || []);
    }
    // x and y position the world-space origin. With origin='feet' (default),
    // (x,y) is the sprite's bottom-center, easy for platformers and football games.
    // With origin='topLeft', (x,y) is the top-left of the original editor canvas.
    // Scale multiplies all saved layer sizes; rotation is a whole-character rotation.
    draw(context, { view = 'front', animation = 'stand', frame = 0,
      x = 0, y = 0, scale = 1, rotationDeg = 0, alpha = 1,
      origin = 'feet', flipX = false, hiddenCategories = [] } = {}) {
      const a = this.animation(animation);
      const f = typeof frame === 'string' ? a.frames.find(item => item.id === frame || item.name === frame)
        : a.frames[((Math.trunc(frame) % a.frames.length) + a.frames.length) % a.frames.length];
      if (!f) return;
      const width = this.project.canvas.width, height = this.project.canvas.height;
      const layers = this.resolveLayers(view, a.id, f.id);
      context.save();
      context.globalAlpha *= alpha;
      context.translate(x, y);
      context.rotate(rotationDeg * Math.PI / 180);
      context.scale(scale * (flipX ? -1 : 1), scale);
      if (origin === 'feet') context.translate(-width / 2, -height);
      else if (origin === 'center') context.translate(-width / 2, -height / 2);
      for (const layer of layers) {
        if (layer.visible === false || hiddenCategories.includes(layer.category)) continue;
        const image = this.images.get(layer.assetId);
        if (!image) continue;
        const crop = layer.crop, t = layer.transform;
        if (!crop || !t || crop.w <= 0 || crop.h <= 0) continue;
        context.save();
        context.globalAlpha *= (t.opacity ?? 1);
        const c = layer.color;
        if(c) context.filter = `brightness(${c.brightness ?? 100}%) contrast(${c.contrast ?? 100}%) saturate(${c.saturate ?? 100}%) hue-rotate(${c.hue ?? 0}deg) sepia(${c.sepia ?? 0}%)`;
        context.translate(t.x, t.y);
        context.rotate(t.rotationDeg * Math.PI / 180);
        context.scale(t.scaleX * (t.flipX ? -1 : 1), t.scaleY * (t.flipY ? -1 : 1));
        const rgbImage=this.getRGBImage(layer,image);
        if(rgbImage)context.drawImage(rgbImage,0,0,rgbImage.width,rgbImage.height,
          -crop.w * (t.anchorX ?? .5), -crop.h * (t.anchorY ?? .5), crop.w, crop.h);
        else context.drawImage(image, crop.x, crop.y, crop.w, crop.h,
          -crop.w * (t.anchorX ?? .5), -crop.h * (t.anchorY ?? .5), crop.w, crop.h);
        context.restore();
      }
      context.restore();
    }
    // Full sprite preview. Output canvas may be any pixel resolution.
    drawToCanvas(canvas, { view = 'front', animation = 'stand', frame = 0,
      clear = true, hiddenCategories = [] } = {}) {
      const ctx = canvas.getContext('2d');
      if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / this.project.canvas.width,
        canvas.height / this.project.canvas.height);
      this.draw(ctx, { view, animation, frame, x: 0, y: 0, origin: 'topLeft', hiddenCategories });
      ctx.restore();
    }
  }
  root.FootballSpriteCharacter = FootballSpriteCharacter;
})(typeof window !== 'undefined' ? window : globalThis);