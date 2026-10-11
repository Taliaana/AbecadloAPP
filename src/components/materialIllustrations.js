const illustrations = {
  computer: `
    <rect class="material-fill material-fill--blue" x="37" y="26" width="126" height="84" rx="14"/>
    <rect class="material-paper" x="47" y="36" width="106" height="62" rx="7"/>
    <path d="M100 110v23m-28 0h56"/>
    <path class="material-fill material-fill--wood" d="M42 146h116l13 22H29Z"/>
    <path d="M52 155h96m-83 0v8m18-8v8m18-8v8m18-8v8m18-8v8"/>
    <path class="material-fill material-fill--ochre" d="M158 126c17 0 29 12 29 29v15h-34v-15c0-11 2-21 5-29Z"/>
    <path d="M170 140v17"/>
  `,
  workshop: `
    <path class="material-fill material-fill--wood" d="M20 137h160v18H20z"/>
    <path d="M32 155v24m136-24v24"/>
    <rect class="material-fill material-fill--blue" x="30" y="59" width="42" height="64" rx="8"/>
    <path d="M41 72h20M41 83h20M41 94h14"/>
    <path class="material-fill material-fill--ochre" d="M87 78h36v45H87z"/>
    <circle class="material-fill material-fill--sage" cx="151" cy="100" r="23"/>
    <path d="M151 88v24m-12-12h24"/>
  `,
  portfolio: `
    <rect class="material-fill material-fill--terracotta" x="33" y="32" width="94" height="118" rx="8" transform="rotate(-5 33 32)"/>
    <rect class="material-paper" x="68" y="45" width="99" height="120" rx="8" transform="rotate(4 68 45)"/>
    <circle class="material-fill material-fill--blue" cx="105" cy="88" r="17"/>
    <path class="material-fill material-fill--sage" d="m90 142 27-42 31 42Z"/>
    <path class="material-fill material-fill--ochre" d="M126 72h25v25h-25z"/>
  `,
  'mouse-practice': `
    <rect class="material-paper" x="28" y="42" width="76" height="106" rx="10"/>
    <path d="M44 65h44M44 82h31M44 99h38"/>
    <rect class="material-fill material-fill--blue" x="121" y="56" width="48" height="81" rx="24"/>
    <path d="M145 57v27m-23 4h46"/>
    <path class="material-fill material-fill--ochre" d="m96 126 18 2-12 14Z"/>
  `,
  typewriting: `
    <path class="material-fill material-fill--blue" d="M23 67h154l-12 79H35Z"/>
    <g class="material-keys"><path d="M44 84h18v15H44zm28 0h18v15H72zm28 0h18v15h-18zm28 0h18v15h-18zM51 108h18v15H51zm28 0h42v15H79zm52 0h18v15h-18z"/></g>
    <path d="M23 146h142"/>
  `,
  studio: `
    <rect class="material-paper" x="34" y="28" width="104" height="132" rx="8"/>
    <circle class="material-fill material-fill--ochre" cx="78" cy="78" r="20"/>
    <path class="material-fill material-fill--sage" d="m53 135 31-42 36 42Z"/>
    <path class="material-fill material-fill--terracotta" d="m139 138 31-78 13 6-31 78-17 13Z"/>
  `,
  robot: `
    <path class="material-fill material-fill--blue" d="M38 54h124v105H38z"/>
    <path d="M38 89h124M79 54v105m42-105v105"/>
    <rect class="material-paper" x="72" y="76" width="57" height="52" rx="12"/>
    <circle cx="89" cy="96" r="4"/><circle cx="112" cy="96" r="4"/><path d="M88 113h25M100 76V65m0 0 7-7"/>
  `,
  sequences: `
    <rect class="material-fill material-fill--sage" x="23" y="63" width="45" height="67" rx="8"/>
    <rect class="material-fill material-fill--ochre" x="78" y="52" width="45" height="78" rx="8"/>
    <rect class="material-fill material-fill--terracotta" x="133" y="40" width="45" height="90" rx="8"/>
    <path d="M42 97h8m47-6h8m47-6h8"/>
  `,
  search: `
    <circle class="material-fill material-fill--blue" cx="87" cy="84" r="47"/>
    <circle class="material-paper" cx="87" cy="84" r="31"/>
    <path d="m121 119 46 46"/>
    <path class="material-fill material-fill--sage" d="M69 76c11-20 29-18 39-4-18-4-30 4-37 19-5-5-6-10-2-15Z"/>
  `,
}

export function materialIllustration(name, label = '') {
  const drawing = illustrations[name] || illustrations.workshop
  const accessibility = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'
  return `<svg class="material-illustration" viewBox="0 0 200 190" ${accessibility}><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg>`
}
