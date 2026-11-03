import { path as p, ellipse as e, line as l, eyes, eye, mouth, layers } from './svg.js'

function penguin(c,b,a,d) {
  const wings=c.part==='wave'?p('M65 98Q19 78 19 55c-22 8-8 48 40 70m76-27q37 29 28 52-17 1-34-35',b):p('M65 98q-34 32-23 54 15 1 28-35m65-19q34 32 23 54-15 1-28-35',b)
  return layers(p('M64 83c-14 32-23 73-2 88 23 17 53 17 76 0 21-15 12-56-2-88Z',b)+wings+e(100,139,29,36,a)+p('M81 169q-20-2-24 12 20 8 34-1m18 0q14 9 34 1-4-14-24-12',d),
    e(100,71,38,42,b)+p('M100 57C72 39 62 70 74 90q26 21 52 0c12-20 2-51-26-33',a)+eyes(c,100,72,16,4)+p('m91 87 9 10 9-10-9-4Z',d)+mouth(c,100,105),
    c.pattern==='bib'?p('M82 116q18 12 36 0l-5 13q-13 6-26 0Z',d):'')
}
function duck(c,b,a,d) {
  const bill=c.part==='broad'?p('M138 88q45-15 46 4-3 18-45 14Z',d):p('M137 87q36-8 38 8-7 13-38 9Z',d)
  return layers(p('M55 127 26 108l6 34q-5 30 49 33 53 2 68-24 12-23-18-36Z',b)+p('M45 150q39 25 96-5-19 37-58 27-24-2-38-22',a)+p('M79 170v9l-13 4m46-13v9l13 4',d,`stroke="${d}" stroke-width="4"`)+p('M63 129q22-14 43 1-14 29-38 20Z',a),
    p('M118 121q-14-18-17-33c-6-37 45-47 53-17 3 17-7 32-9 51Z',b)+e(125,82,19,21,b)+bill+eye(c,131,77,4)+mouth(c,151,100),
    c.pattern==='wing'?l('M70 135q10 10 24-1m-19 9q8 6 15 0',d,2):'')
}
function parrot(c,b,a,d) {
  const crest=c.part==='crest'?p('M92 47q-21-29-9-29l17 23q-7-35 6-27l7 29q8-25 16-13l-5 22',d):p('M89 51q8-25 30-11l7 11',b)
  return layers(p('M91 128 69 184l22-8 9-30 7 39 13-10-4-48',d)+p('M82 84q-23 28-12 67 21 22 52-3 21-35 1-64Z',b)+e(107,123,21,30,a)+p('M78 97q-21 9-12 46 18 3 25-30Z',b)+p('M93 150v10l-9 5m30-13v9l10 3',d,`stroke="${d}" stroke-width="4"`),
    crest+e(109,68,32,33,b)+e(122,71,17,18,a)+p('M138 69q31-2 27 24-13-10-24-4l-8-10Z',d)+p('M141 89q10 10 10 19-13-4-16-18Z',d)+eye(c,121,67,4)+mouth(c,127,95),
    c.pattern==='feathers'?l('M72 112q5 8 12 0m-12 10q5 8 10 0m-8 10q4 8 8 0',d):[[77,111],[75,124],[78,137]].map(([x,y])=>e(x,y,2.5,3,d)).join(''))
}
function toucan(c,b,a,d) {
  const tail=c.part==='fan'?p('M83 139 46 181l20-3 8 10 31-44',b):p('M86 140 63 187l18-3 25-42',b)
  return layers(tail+p('M79 83q-22 27-9 65 23 24 50-2 18-35-1-59Z',b)+e(106,121,21,29,a)+p('M79 101q-20 16-9 39 15-7 20-25',b)+l('M91 153v10m-6 0h14m10-11v11m-5 0h13',d,4),
    e(106,66,31,32,b)+e(118,74,14,20,a)+p('M127 50q58-18 61 13-8 23-58 19l-3-32',d)+p('M176 48q15 5 12 15-3 8-12 11Z',b)+l('M133 71q26 7 48-7',b,1.8)+eye(c,115,65,4)+mouth(c,118,96),
    c.pattern==='bill'?p('M145 47h10v36l-10-1Z',a):[[142,58],[155,54],[150,72]].map(([x,y])=>e(x,y,3,3,a)).join(''))
}
export const birdRenderers={penguin,duck,parrot,toucan}
export const birdAnchors={penguin:[100,72,111,32,16,11],duck:[131,77,115,50,0,11,true],parrot:[121,67,103,35,0,11,true],toucan:[115,65,100,28,0,10,true]}
