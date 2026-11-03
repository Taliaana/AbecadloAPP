// Shared, small JSON contract used by the editor, SVG renderer and API validation.
export const natureColors = {
  chestnut: ['Kasztanowy', '#ad7959'], honey: ['Miodowy', '#c99d62'], sand: ['Piaskowy', '#d6b58c'],
  cocoa: ['Kakaowy', '#806858'], cream: ['Kremowy', '#f4e6cb'], ivory: ['Jasny', '#fff5df'],
  sage: ['Szałwiowy', '#8da78a'], moss: ['Mchowy', '#64866b'], mint: ['Miętowy', '#bdd0ad'],
  coral: ['Koralowy', '#d78d71'], apricot: ['Morelowy', '#e9b180'], rose: ['Pudrowy róż', '#c78e94'],
  blue: ['Przygaszony błękit', '#91acb6'], graphite: ['Grafitowy', '#51474a'], taupe: ['Taupe', '#aa9387'],
  paper: ['Papier', '#f5ebdb'], blush: ['Blush', '#f3dfe1'], sky: ['Niebo', '#e3ecef'], meadow: ['Łąka', '#e4ebdf'],
}
const expressions = {
  eyes: [['gentle', 'Łagodne'], ['bright', 'Ciekawe'], ['sleepy', 'Przymknięte']],
  mouth: [['smile', 'Uśmiech'], ['calm', 'Spokój'], ['happy', 'Radość']],
}
const accessories = { none: 'Bez dodatku', glasses: 'Okulary', bow: 'Kokarda', scarf: 'Szalik', hat: 'Kapelusz', backpack: 'Plecak' }
function friend(id, name, group, colors, patterns, partLabel, parts, extras, defaults) {
  return { id, name, group, colors, patterns, partLabel, parts, accessories: extras.map(id => [id, accessories[id]]), defaults }
}
export const natureFriends = [
  friend('roe-deer', 'Sarna', 'Ssaki', { body: ['chestnut','honey','sand'], belly: ['cream','ivory','sand'], detail: ['cocoa','rose','taupe'] }, [['spots','Cętki'],['none','Bez wzoru'],['patch','Jasna łatka']], 'Uszy', [['upright','Nasłuchujące'],['wide','Rozłożone']], ['none','glasses','bow','scarf','hat','backpack'], { body:'chestnut',belly:'cream',detail:'cocoa',pattern:'spots',part:'upright' }),
  friend('owl', 'Sowa', 'Ptaki', { body: ['cocoa','taupe','chestnut'], belly: ['cream','ivory','sand'], detail: ['honey','rose','blue'] }, [['feathers','Piórka'],['speckles','Nakrapiane'],['none','Bez wzoru']], 'Skrzydła', [['folded','Złożone'],['open','Rozłożone']], ['none','glasses','bow','scarf','hat','backpack'], { body:'cocoa',belly:'cream',detail:'honey',pattern:'feathers',part:'folded' }),
  friend('turtle', 'Żółw', 'Gady', { body: ['sage','moss','mint'], belly: ['cream','sand','mint'], detail: ['moss','cocoa','taupe'] }, [['tiles','Płytki skorupy'],['rings','Pierścienie'],['none','Gładka skorupa']], 'Łapy', [['walking','Wędrujące'],['resting','Odpoczywające']], ['none','glasses','bow','scarf','hat'], { body:'sage',belly:'cream',detail:'moss',pattern:'tiles',part:'walking' }),
  friend('frog', 'Żaba', 'Płazy', { body: ['sage','moss','mint'], belly: ['cream','ivory','mint'], detail: ['moss','taupe','rose'] }, [['spots','Plamki'],['stripe','Pasek'],['none','Bez wzoru']], 'Nogi', [['sitting','Siedzące'],['stretch','Rozciągnięte']], ['none','glasses','bow','scarf','hat','backpack'], { body:'sage',belly:'ivory',detail:'moss',pattern:'spots',part:'sitting' }),
  friend('clownfish', 'Błazenek', 'Ryby', { body: ['coral','apricot','honey'], belly: ['cream','ivory','sand'], detail: ['graphite','cocoa','taupe'] }, [['bands','Szerokie pasy'],['narrow','Wąskie pasy']], 'Płetwy', [['rounded','Zaokrąglone'],['fan','Wachlarzowe']], ['none','glasses','bow','hat'], { body:'coral',belly:'ivory',detail:'graphite',pattern:'bands',part:'rounded' }),
]
export const getNatureFriend = id => natureFriends.find(friend => friend.id === id)
export function natureOptions(species) {
  const friend = getNatureFriend(species) || natureFriends[0]
  return {
    ...Object.fromEntries(Object.entries(friend.colors).map(([key, values]) => [key, values.map(value => [value, natureColors[value][0]])])),
    ...expressions, pattern: friend.patterns, part: friend.parts, accessory: friend.accessories,
    background: ['paper','blush','sky','meadow'].map(key => [key, natureColors[key][0]]),
  }
}
export function defaultNatureAvatar(species = 'roe-deer') {
  const friend = getNatureFriend(species) || natureFriends[0]
  return { kind:'nature', version:1, species:friend.id, ...friend.defaults, eyes:'gentle', mouth:'smile', accessory:'none', background:'paper' }
}
export function normalizeNatureAvatar(value) {
  const config = defaultNatureAvatar(value?.species)
  for (const [key, options] of Object.entries(natureOptions(config.species))) {
    if (options.some(([id]) => id === value?.[key])) config[key] = value[key]
  }
  return config
}
export function isValidNatureAvatar(value) {
  if (!value || value.kind !== 'nature' || value.version !== 1 || !getNatureFriend(value.species)) return false
  const normalized = normalizeNatureAvatar(value)
  return Object.keys(value).length === Object.keys(normalized).length && Object.entries(normalized).every(([key, item]) => value[key] === item)
}
// Do not rewrite class assignments: 1A and 1B belong to the same grade.
export function profileGrade(className) {
  const match = String(className || '').trim().match(/^(?:klasa\s*)?([123])(?:\s*[a-ząćęłńóśźż])?$/iu)
  return match ? match[1] : null
}
