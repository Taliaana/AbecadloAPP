// Only drawing primitives are shared. Each species owns its silhouette and layers.
export const ink = '#51474a'
export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
export const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`
export const line = (d, color=ink, width=2.2) => path(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round"`)
export function eye(c,x,y,r=4) {
  return c.eyes==='sleepy' ? line(`M${x-r} ${y}q${r} ${r} ${2*r} 0`) : ellipse(x,y,c.eyes==='bright'?r+1:r,r+1,ink)+ellipse(x+1,y-2,1.5,1.8,'#fffaf5')
}
export const eyes=(c,x,y,gap,r=5)=>eye(c,x-gap,y,r)+eye(c,x+gap,y,r)
export function mouth(c,x,y) {
  return c.mouth==='calm' ? line(`M${x-3} ${y}q3 1 6 0`) : c.mouth==='happy' ? path(`M${x-6} ${y}q6 15 12 0Z`,ink)+path(`M${x-3} ${y+5}q3-3 6 0`,'#d49a98') : line(`M${x-6} ${y}q6 7 12 0`)
}
export const layers=(body,head,pattern)=>`<g data-layer="body">${body}</g><g data-layer="head">${head}</g><g data-layer="pattern">${pattern}</g>`
