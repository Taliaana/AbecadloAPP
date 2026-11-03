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
  // Batch 1 — one species from each vertebrate group.
  friend('fox','Lis','Ssaki',{body:['coral','chestnut','honey'],belly:['cream','ivory','sand'],detail:['cocoa','graphite','taupe']},[['socks','Skarpetki'],['none','Bez wzoru']],'Ogon',[['curled','Zawinięty'],['sweeping','Rozłożysty']],['none','glasses','bow','scarf','hat','backpack'],{body:'coral',belly:'ivory',detail:'cocoa',pattern:'socks',part:'curled'}),
  friend('penguin','Pingwin','Ptaki',{body:['graphite','blue','cocoa'],belly:['ivory','cream','sand'],detail:['apricot','coral','honey']},[['bib','Śliniaczek'],['none','Bez wzoru']],'Skrzydła',[['down','Opuszczone'],['wave','Machające']],['none','glasses','bow','scarf','hat','backpack'],{body:'graphite',belly:'ivory',detail:'apricot',pattern:'bib',part:'down'}),
  friend('chameleon','Kameleon','Gady',{body:['sage','mint','blue'],belly:['cream','mint','sand'],detail:['moss','rose','honey']},[['spots','Plamki'],['stripe','Pasek']],'Grzebień',[['high','Wysoki'],['low','Niski']],['none','glasses','bow','hat'],{body:'sage',belly:'mint',detail:'moss',pattern:'spots',part:'high'}),
  friend('toad','Ropucha','Płazy',{body:['taupe','cocoa','sage'],belly:['cream','sand','ivory'],detail:['cocoa','moss','chestnut']},[['warts','Guzki'],['spots','Plamki']],'Postawa',[['rest','Odpoczywa'],['step','Robi krok']],['none','glasses','bow','scarf','hat','backpack'],{body:'taupe',belly:'cream',detail:'cocoa',pattern:'warts',part:'rest'}),
  friend('shark','Rekin','Ryby',{body:['blue','taupe','graphite'],belly:['ivory','cream','mint'],detail:['graphite','cocoa','moss']},[['gills','Skrzela'],['freckles','Piegi i skrzela']],'Płetwa grzbietowa',[['tall','Wysoka'],['swept','Odchylona']],['none','glasses','bow','hat'],{body:'blue',belly:'ivory',detail:'graphite',pattern:'gills',part:'tall'}),
  // Batch 2.
  friend('rabbit','Królik','Ssaki',{body:['sand','taupe','ivory'],belly:['ivory','cream','rose'],detail:['rose','cocoa','coral']},[['patch','Łatka'],['none','Bez wzoru']],'Uszy',[['up','Stojące'],['flop','Jedno oklapnięte']],['none','glasses','bow','scarf','hat','backpack'],{body:'sand',belly:'ivory',detail:'rose',pattern:'patch',part:'up'}),
  friend('duck','Kaczka','Ptaki',{body:['sage','honey','sand'],belly:['cream','ivory','mint'],detail:['apricot','coral','honey']},[['wing','Piórka skrzydła'],['none','Bez wzoru']],'Dziób',[['round','Zaokrąglony'],['broad','Szeroki']],['none','glasses','bow','scarf','hat'],{body:'sage',belly:'cream',detail:'apricot',pattern:'wing',part:'round'}),
  friend('gecko','Gekon','Gady',{body:['honey','mint','coral'],belly:['cream','ivory','sand'],detail:['cocoa','moss','rose']},[['spots','Cętki'],['bands','Pasy']],'Ogon',[['curl','Zakręcony'],['straight','Wyprostowany']],['none','glasses','bow','hat'],{body:'honey',belly:'cream',detail:'cocoa',pattern:'spots',part:'curl'}),
  friend('salamander','Salamandra','Płazy',{body:['graphite','cocoa','moss'],belly:['sand','cream','mint'],detail:['honey','apricot','coral']},[['patches','Plamy'],['stripes','Pasy']],'Ogon',[['curve','Wygięty'],['curl','Zwinięty']],['none','glasses','bow','hat'],{body:'graphite',belly:'sand',detail:'honey',pattern:'patches',part:'curve'}),
  friend('seahorse','Konik morski','Ryby',{body:['honey','coral','blue'],belly:['cream','ivory','sand'],detail:['chestnut','rose','taupe']},[['ridges','Pierścienie'],['dots','Kropki']],'Korona',[['crown','Koronka'],['soft','Łagodna']],['none','glasses','bow','hat'],{body:'honey',belly:'cream',detail:'chestnut',pattern:'ridges',part:'crown'}),
  // Batch 3.
  friend('bear','Niedźwiedź','Ssaki',{body:['cocoa','chestnut','sand'],belly:['cream','sand','ivory'],detail:['graphite','cocoa','rose']},[['chest','Jasna pierś'],['none','Bez wzoru']],'Łapy',[['rest','Na kolanach'],['wave','Powitanie']],['none','glasses','bow','scarf','hat','backpack'],{body:'chestnut',belly:'sand',detail:'cocoa',pattern:'chest',part:'rest'}),
  friend('parrot','Papuga','Ptaki',{body:['sage','coral','blue'],belly:['mint','cream','apricot'],detail:['honey','coral','chestnut']},[['feathers','Pióra'],['dots','Kropki']],'Czubek',[['crest','Czubek'],['smooth','Gładka głowa']],['none','glasses','bow','scarf','hat'],{body:'sage',belly:'mint',detail:'honey',pattern:'feathers',part:'crest'}),
  friend('snake','Wąż','Gady',{body:['sage','honey','blue'],belly:['cream','mint','sand'],detail:['moss','cocoa','rose']},[['diamonds','Romby'],['bands','Pasy']],'Ogon',[['coil','Zwinięty'],['tip','Uniesiony']],['none','glasses','bow','hat'],{body:'sage',belly:'cream',detail:'moss',pattern:'diamonds',part:'coil'}),
  friend('newt','Traszka','Płazy',{body:['cocoa','moss','taupe'],belly:['apricot','cream','coral'],detail:['graphite','honey','rose']},[['spots','Cętki'],['stripe','Pasek']],'Grzbiet',[['crest','Falisty'],['smooth','Gładki']],['none','glasses','bow','hat'],{body:'moss',belly:'apricot',detail:'graphite',pattern:'spots',part:'crest'}),
  friend('pufferfish','Rozdymka','Ryby',{body:['honey','blue','sage'],belly:['cream','ivory','mint'],detail:['chestnut','graphite','moss']},[['spots','Plamki'],['freckles','Drobne piegi']],'Płetwy',[['small','Małe'],['fan','Wachlarzowe']],['none','glasses','bow','hat'],{body:'honey',belly:'cream',detail:'chestnut',pattern:'spots',part:'small'}),
  // Batch 4.
  friend('otter','Wydra','Ssaki',{body:['cocoa','chestnut','taupe'],belly:['cream','sand','ivory'],detail:['graphite','rose','cocoa']},[['whiskers','Wąsy'],['freckles','Piegi i wąsy']],'Ogon',[['curl','Zawinięty'],['paddle','Wyciągnięty']],['none','glasses','bow','scarf','hat'],{body:'cocoa',belly:'cream',detail:'graphite',pattern:'whiskers',part:'curl'}),
  friend('toucan','Tukan','Ptaki',{body:['graphite','cocoa','blue'],belly:['cream','ivory','sand'],detail:['honey','coral','apricot']},[['bill','Pas na dziobie'],['dots','Kropki na dziobie']],'Ogon',[['long','Długi'],['fan','Rozłożony']],['none','glasses','bow','scarf','hat'],{body:'graphite',belly:'ivory',detail:'honey',pattern:'bill',part:'long'}),
  friend('crocodile','Krokodyl','Gady',{body:['moss','sage','mint'],belly:['cream','sand','mint'],detail:['graphite','cocoa','taupe']},[['scales','Łuski'],['spots','Plamki']],'Ogon',[['curve','Wygięty'],['up','Uniesiony']],['none','glasses','bow','hat'],{body:'sage',belly:'cream',detail:'moss',pattern:'scales',part:'curve'}),
  friend('axolotl','Aksolotl','Płazy',{body:['rose','coral','ivory'],belly:['ivory','cream','mint'],detail:['coral','rose','chestnut']},[['freckles','Piegi'],['none','Bez wzoru']],'Skrzela',[['feathery','Pierzaste'],['round','Zaokrąglone']],['none','glasses','bow','hat'],{body:'rose',belly:'ivory',detail:'coral',pattern:'freckles',part:'feathery'}),
  friend('angelfish','Skalar','Ryby',{body:['blue','sand','ivory'],belly:['ivory','cream','mint'],detail:['graphite','cocoa','moss']},[['stripes','Pionowe pasy'],['marble','Marmurkowe łaty']],'Płetwy',[['long','Długie'],['wide','Szerokie']],['none','glasses','bow','hat'],{body:'blue',belly:'ivory',detail:'graphite',pattern:'stripes',part:'long'}),
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
