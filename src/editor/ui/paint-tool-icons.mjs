/** Local stroke icons for all options in the right-side Paint toolbox.
 * All vector paths are self-contained: no CDN, fonts or external icon service.
 */
export const PAINT_ICON_PATHS=Object.freeze({
 'select':'<path d="M5 3l13 9-7 1-3 8z"/>',
 'select-rect':'<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 3"/>',
 'select-freeform':'<path d="M4 16c0-6 5-12 11-11s6 9 1 13c-4 3-10 2-12-2z" stroke-dasharray="3 3"/>',
 'select-wand':'<path d="m4 20 11-11M14 3v3m5 3h3m-8 4v3m-3-7h3M18 2l.7 2.3L21 5l-2.3.7L18 8l-.7-2.3L16 5l1.3-.7z"/>',
 'clear':'<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6"/>',
 'brush':'<path d="m13 6 5-4 4 4-4 5-5-5zM13 6l5 5-7 7-5-5zM6 13c-2 0-4 1-4 4v4h4c3 0 4-2 4-4"/>',
 'eraser':'<path d="m3 15 9-11a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 8H8zM8 10l8 8M3 21h18"/>',
 'clone':'<path d="M8 3h8l1 7 4 4v3H3v-3l4-4zM4 21h16M7 17v4m10-4v4"/>',
 'fill':'<path d="m3 12 8-8 9 9-8 8zM11 4l9 9M17 20c0-2 2-4 2-4s2 2 2 4a2 2 0 0 1-4 0z"/>',
 'picker':'<path d="m13 6 5-5 5 5-5 5m-2-3L7 17l-4 1 1-4 9-9M3 21h9"/>',
 'text':'<path d="M4 6h16M12 6v14M7 20h10M4 6v4m16-4v4"/>',
 'shape-rect':'<rect x="4" y="5" width="16" height="14" rx="1"/>',
 'shape-poly':'<path d="M12 3 21 9l-3 12H6L3 9z"/>',
 'shape-oval':'<ellipse cx="12" cy="12" rx="9" ry="6"/>',
 'shape-circle':'<circle cx="12" cy="12" r="8"/>',
 'shape-line':'<path d="M4 20 20 4"/>',
 'shape-curve':'<path d="M3 19C3 3 21 21 21 5M3 19h4m10-14h4"/>'
});
export function decoratePaintTools(root){
 const buttons=[...root.querySelectorAll('[data-paint-menu],#paintClearMenu')];
 for(const button of buttons){
  const id=button.dataset.paintMenu||'clear',path=PAINT_ICON_PATHS[id];
  if(!path)throw Error('Paint icon missing: '+id);
  if(button.querySelector('.studio-paint-icon'))continue;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.85');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('focusable','false');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('studio-paint-icon');
  svg.innerHTML=path;
  button.prepend(svg);
  button.classList.add('studio-paint-entry');
  if(button.dataset.paintMenu)button.setAttribute('aria-pressed','false');
 }
 return buttons.length;
}
