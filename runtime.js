/* Football Sprite Studio - reusable game renderer
 * No dependencies. Load a project JSON exported by the editor.
 * Works with 2D HTML Canvas, including React/Phaser projects that provide a CanvasRenderingContext2D.
 */
(function (root) {
  'use strict';
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
      const layers = this.project.scenes?.[view]?.[a.id]?.[f.id] || [];
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
        context.drawImage(image, crop.x, crop.y, crop.w, crop.h,
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