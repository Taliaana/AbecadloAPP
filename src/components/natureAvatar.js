import { normalizeNatureAvatar, natureColors } from '../data/natureFriends.js'

const ink = '#51474a'
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`
const line = d => path(d, 'none', `stroke="${ink}" stroke-width="2.2" stroke-linecap="round"`)
function eyes(config, x, y, gap, radius = 5) {
  return [x-gap,x+gap].map(cx => config.eyes === 'sleepy'
    ? line(`M${cx-5} ${y}q5 5 10 0`)
    : ellipse(cx,y,config.eyes === 'bright' ? radius+1 : radius,radius+1,ink) + ellipse(cx+1,y-2,1.5,1.8,'#fffaf5')).join('')
}
function mouth(config, x, y) {
  return config.mouth === 'calm' ? line(`M${x-3} ${y}q3 1 6 0`)
    : config.mouth === 'happy' ? path(`M${x-6} ${y}q6 15 12 0Z`,ink)+path(`M${x-3} ${y+5}q3-3 6 0`, '#d49a98')
      : line(`M${x-6} ${y}q6 7 12 0`)
}
function deer(c, b, cream, detail) {
  const ears = c.part === 'wide'
    ? path('M72 69C41 67 25 45 36 32c24-1 40 13 44 31M121 63c7-21 25-33 46-30 8 17-9 35-36 38',b)+path('M69 60Q47 54 42 40q20 2 27 20M130 61q10-18 28-20-6 17-28 20',cream)
    : path('M74 68C52 55 43 25 55 15c23 7 30 27 26 48M119 64c-3-23 9-45 29-49 12 13 3 42-21 54',b)+path('M71 53Q58 37 59 25q15 11 12 28M129 54q-1-19 15-29 1 17-15 29',cream)
  return `<g data-layer="body">${path('M143 141q29-11 26-26-19-5-31 16',cream)}${path('M68 132c-6 12-14 33-9 48l16 3 7-28 7 29h18l7-31 10 29 17-3c6-20-7-41-12-49Z',b)}${path('M62 178h16l-2 7H61m28-6h17v7H89m33-8h18v7h-17',detail)}${ellipse(101,145,28,29,cream)}</g>
    <g data-layer="head">${ears}${path('M63 76c0-27 18-36 38-36s39 12 39 37c0 29-15 51-39 51S63 105 63 76',b)}${path('M80 96c2-14 11-17 21-17s20 4 22 17c3 16-10 27-22 27S77 112 80 96',cream)}${path('M92 97q9-8 18 0-1 8-9 8t-9-8',detail)}${line('M101 104v5')}${eyes(c,101,79,18,4)}${mouth(c,101,110)}</g>
    <g data-layer="pattern" fill="${cream}">${c.pattern==='spots' ? '<ellipse cx="72" cy="137" rx="3" ry="4"/><ellipse cx="66" cy="148" rx="2.5" ry="3"/><ellipse cx="132" cy="138" rx="3" ry="4"/><ellipse cx="137" cy="151" rx="2.5" ry="3"/>' : c.pattern==='patch' ? path('M91 51q10-8 19 0l-9 18Z',cream) : ''}</g>`
}
function owl(c,b,cream,detail) {
  const wings = c.part === 'open'
    ? path('M63 92C43 86 22 95 12 116c14 15 38 14 54-1M137 92c22-6 43 3 52 24-16 15-38 14-55-1',b)+line('M22 116q18-11 34-11m90 0q15 0 32 11')
    : path('M64 92c-23 9-28 45-11 61 10-6 17-28 20-49m53-12c23 9 28 45 11 61-10-6-17-28-20-49',b)
  return `<g data-layer="body">${path('M79 164l-9 13m9-13 2 14m40-14-2 14m2-14 10 13',detail,'stroke="'+detail+'" stroke-width="5" stroke-linecap="round"')}${path('M60 69C43 101 47 158 73 167q27 15 54-1c24-17 28-67 12-97Z',b)}${ellipse(100,123,31,38,cream)}${wings}</g>
    <g data-layer="head">${path('M52 73 50 35l26 13q24-10 48 0l25-13-1 39c3 30-19 40-48 40S49 101 52 73',b)}${path('M100 60C83 42 59 53 60 77c0 21 24 28 40 15 16 13 40 6 40-15 1-24-23-35-40-17',cream)}${ellipse(78,76,13,14,detail)}${ellipse(122,76,13,14,detail)}${ellipse(78,76,10,11,cream)}${ellipse(122,76,10,11,cream)}${eyes(c,100,76,22,4)}${path('m94 87 6 13 6-13Z',detail)}${mouth(c,100,106)}</g>
    <g data-layer="pattern" fill="${detail}" opacity=".8">${c.pattern==='feathers' ? ['82 123','99 124','116 123','90 140','108 140','99 154'].map(p=>{const[x,y]=p.split(' ').map(Number);return line(`M${x-3} ${y-2}q3 6 6 0`)}).join('') : c.pattern==='speckles' ? [[83,124],[100,130],[117,124],[91,144],[110,147]].map(([x,y])=>ellipse(x,y,2,3,detail)).join('') : ''}</g>`
}
function turtle(c,b,cream,detail) {
  const feet = c.part==='walking'
    ? path('M62 136q-26 14-25 28 15 7 30-6l8-16m45-5q5 19 26 22 11-8-3-22m-15-3q15 4 20-1',b)+path('M138 129q20 16 33 9-2-12-24-19',b)
    : path('M58 140q-11 14 4 20 15-1 17-14m40-3q-2 19 20 17 8-9-6-17',b)
  return `<g data-layer="body">${path('M47 119 26 111l18 22',b)}${feet}${path('M48 131c-2-45 19-75 57-72 35 3 47 32 44 72Z',detail)}${path('M51 128c-2-37 20-62 51-61 27 0 43 25 44 61Z',b)}${path('M45 127q52 15 106-1l-1 13q-57 14-104-1Z',cream)}</g>
    <g data-layer="pattern" fill="none" stroke="${detail}" stroke-width="3" stroke-linejoin="round">${c.pattern==='tiles' ? '<path d="m87 81 24-2 15 20-10 23-27 1-14-21Zm0 0-5-10m29 8 8-6m7 26 13-2m-23 25 6 9m-33-8-6 10m-8-31-18-3"/>' : c.pattern==='rings' ? '<path d="M66 121c0-48 68-49 69 0M79 121c0-31 43-31 43 0"/>' : ''}</g>
    <g data-layer="head">${path('M136 117q6-30 23-32c27-4 32 38 12 46-13 6-24-3-35 0Z',b)}${ellipse(162,113,17,12,cream)}${eyes(c,163,100,8,2.8)}${mouth(c,163,116)}</g>`
}
function frog(c,b,cream,detail) {
  const legs = c.part==='stretch'
    ? path('M72 128Q22 121 23 155l-11 9q16 13 37-3l31-15m49-17q48-8 48 26l11 9q-16 13-37-3l-29-15',b)
    : path('M73 125c-38-11-45 19-28 35l-15 5q8 14 29 4l26-25m41-19c38-11 45 19 28 35l15 5q-8 14-29 4l-26-25',b)
  return `<g data-layer="body">${legs}${path('M68 106c-9 13-15 41 1 57 16 14 48 14 64-1 15-17 6-45-2-56Z',b)}${ellipse(100,139,24,28,cream)}${path('M73 133 65 168l-10 5m10-5 8 5m54-40 8 35 10 5m-10-5-8 5',b,`stroke="${b}" stroke-width="9" stroke-linecap="round"`)}</g>
    <g data-layer="head">${ellipse(72,62,22,25,b)}${ellipse(128,62,22,25,b)}${path('M51 77c-11 32 6 48 49 48s60-16 49-48c-16-20-82-20-98 0',b)}${ellipse(72,61,13,16,cream)}${ellipse(128,61,13,16,cream)}${eyes(c,100,61,28,4)}${path('M69 98q31 20 62 0c-7 27-55 28-62 0',cream)}${ellipse(88,90,1.5,2,detail)}${ellipse(112,90,1.5,2,detail)}${mouth(c,100,104)}</g>
    <g data-layer="pattern">${c.pattern==='spots' ? [[57,90],[142,90],[48,146],[152,147]].map(([x,y])=>ellipse(x,y,4,3,detail)).join('') : c.pattern==='stripe' ? path('M95 77h10l-2 18h-6Z',detail) : ''}</g>`
}
function fish(c,b,cream,detail) {
  const fins = c.part==='fan'
    ? path('M67 92Q37 57 24 71l5 35-5 31q17 12 43-21m25-35q11-40 41-35l-4 33m-34 49 31 29 12-34',b,`stroke="${detail}" stroke-width="3" stroke-linejoin="round"`)
    : path('M68 92Q36 71 27 85q-6 18 0 39 12 13 41-9m22-34q9-25 31-24l10 21m-32 48 14 22q18-3 19-22',b,`stroke="${detail}" stroke-width="3" stroke-linejoin="round"`)
  return `<g data-layer="body">${fins}${path('M58 101c0-25 28-40 64-33 27 5 48 22 53 37-9 26-38 39-67 34-28-3-50-14-50-38',b,`stroke="${detail}" stroke-width="2.5"`)}${path('M70 116q43 24 92-2-18 30-55 22-24-3-37-20',cream,'opacity=".4"')}</g>
    <g data-layer="pattern" fill="${cream}" stroke="${detail}" stroke-width="2.5">${c.pattern==='bands' ? '<path d="M77 76q9 26-1 49l14 7q15-32-1-61ZM120 69q-6 33 5 70l14-4q-10-30-3-61Z"/>' : '<path d="M80 75q10 29-1 52l7 3q14-29-1-57ZM124 70q-5 33 5 68l7-2q-10-30-3-64Z"/>'}</g>
    <g data-layer="head">${c.eyes==='sleepy' ? line('M146 95q6 6 12 0') : ellipse(151,94,c.eyes==='bright'?6:5,7,ink)+ellipse(153,91,2,2,'#fffaf5')}${mouth(c,161,111)}${path('M105 102q-3 14 13 17l6-9-19-8',b,`stroke="${detail}" stroke-width="2" stroke-linejoin="round"`)}${line('M31 91 49 99m-19 15 19-9')}</g>`
}
const renderers = { 'roe-deer':deer, owl, turtle, frog, clownfish:fish }
const anchors = { 'roe-deer':[101,79,125,39], owl:[100,76,113,37], turtle:[163,100,132,79], frog:[100,61,124,36], clownfish:[151,94,126,65] }
function accessory(c) {
  const [x,y,neck,top] = anchors[c.species]
  const detail = natureColors[c.detail][1], rose='#bd7f88', paper='#fff4df'
  const gap=c.species==='frog'?28:c.species==='owl'?22:c.species==='turtle'?8:18
  const rim=c.species==='turtle'?7:12
  switch(c.accessory) {
    case 'glasses': return `<g fill="none" stroke="${detail}" stroke-width="3">${c.species==='clownfish' ? `<circle cx="${x}" cy="${y}" r="11"/><path d="M${x+11} ${y}h12"/>` : `<circle cx="${x-gap}" cy="${y}" r="${rim}"/><circle cx="${x+gap}" cy="${y}" r="${rim}"/><path d="M${x-gap+rim} ${y}q${gap-rim}-4 ${2*(gap-rim)} 0"/>`}</g>`
    case 'bow': return path(`M${x} ${top+9}q-20-19-21-2t21 5q20-20 21-2t-21 4`,rose)+ellipse(x,top+10,4,5,detail)
    case 'hat': return path(`M${x-18} ${top+8}l6-20h24l6 20Z`,detail)+path(`M${x-25} ${top+7}q25-6 50 0v6h-50Z`,rose)
    case 'scarf': return path(`M${x-22} ${neck-5}q22 7 44 0l-2 10q-23 7-43-1Zm30 12 14-1 6 25-14 3Z`,rose)+line(`M${x+16} ${neck+22}l9-2`)
    case 'backpack': return path(c.species==='frog' ? 'M145 121q24-5 24 15v22h-22Z' : 'M133 124q25-5 25 15v24h-22Z',detail)+path(c.species==='frog' ? 'M150 137h15v13h-15Z' : 'M140 140h14v13h-14Z',paper)
    default:return ''
  }
}
export function natureAvatar(value, size='medium') {
  const c=normalizeNatureAvatar(value)
  const color=key=>natureColors[c[key]][1]
  const safeSize=['small','medium','large','xlarge'].includes(size)?size:'medium'
  return `<span class="avatar avatar--${safeSize} nature-avatar" data-species="${c.species}" aria-hidden="true" style="background-color:${color('background')}"><svg viewBox="0 0 200 200" focusable="false" xmlns="http://www.w3.org/2000/svg"><g stroke-linecap="round" stroke-linejoin="round">${renderers[c.species](c,color('body'),color('belly'),color('detail'))}<g data-layer="accessory">${accessory(c)}</g></g></svg></span>`
}
