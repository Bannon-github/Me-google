/* CHROMABOUND — self-contained ES2022 canvas adventure. */
'use strict';

const TILE = 16;
const ROOM_W = 20;
const ROOM_H = 11;
const CANVAS_W = ROOM_W * TILE;
const CANVAS_H = 180;
const MAP_H = ROOM_H * TILE;
const STEP = 1 / 60;
const SAVE_KEY = 'chromabound.save.v1';
const HUES = ['crimson', 'verdant', 'azure'];
const HUE_COLOR = { crimson: '#ef534e', verdant: '#5ee07f', azure: '#5eb8ff', grey: '#9aa0aa', gold: '#ffd66b' };
const HUE_LABEL = { crimson: 'Crimson', verdant: 'Verdant', azure: 'Azure' };
const DIRS = {
  down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const DIR_ORDER = ['down', 'up', 'left', 'right'];

const $ = (sel) => document.querySelector(sel);
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const dom = {
  body: document.body,
  title: $('#titleScreen'),
  start: $('#startButton'),
  newGame: $('#newGameButton'),
  hearts: $('#hearts'),
  shards: $('#shards'),
  roomName: $('#roomName'),
  bossBar: $('#bossBar'),
  bossName: $('#bossName'),
  bossMeter: $('#bossMeter'),
  toast: $('#toast'),
  inv: $('#inventoryDialog'),
  invContent: $('#inventoryContent'),
  cheat: $('#cheatDialog'),
  cheatForm: $('#cheatForm'),
  cheatInput: $('#cheatInput'),
  mute: $('#muteButton'),
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function irand(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(a, b) { return Math.hypot((a.x + a.w / 2) - (b.x + b.w / 2), (a.y + a.h / 2) - (b.y + b.h / 2)); }
function rects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function center(e) { return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
function keyOf(x, y) { return `${x},${y}`; }
function hueMatches(attuned, target) { return state.cheats.rainbow || state.tonic > 0 || attuned === target; }

class Synth {
  constructor() { this.ctx = null; this.muted = false; }
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq = 440, dur = .08, type = 'square', gain = .045, slide = 1) {
    if (this.muted) return;
    this.ensure();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), now + dur);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain, now + .008);
    amp.gain.exponentialRampToValueAtTime(.0001, now + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now); osc.stop(now + dur + .03);
  }
  sword() { this.tone(520, .07, 'square', .035, 1.7); }
  hurt() { this.tone(180, .16, 'sawtooth', .05, .45); }
  pickup() { this.tone(760, .06, 'triangle', .04, 1.45); setTimeout(() => this.tone(1040, .06, 'triangle', .035, 1.2), 55); }
  boss() { this.tone(75, .45, 'sawtooth', .07, .55); }
  gate() { this.tone(330, .18, 'triangle', .04, 2.2); }
}
const synth = new Synth();

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  return [c, x];
}
function spriteFromMap(rows, palette, scale = 2) {
  const [c, x] = makeCanvas(rows[0].length * scale, rows.length * scale);
  rows.forEach((row, y) => [...row].forEach((ch, col) => {
    if (ch !== '.' && palette[ch]) { x.fillStyle = palette[ch]; x.fillRect(col * scale, y * scale, scale, scale); }
  }));
  return c;
}
function tintMap(base, map) { return Object.assign({}, base, map); }

const palettes = {
  hero: { K: '#182038', B: '#25365f', S: '#f0c6a0', W: '#f7f1d0', R: '#d64242', G: '#47c76c', A: '#49a8e8', Y: '#ffd66b', O: '#9b6035' },
  blob: { k: '#1c233a', h: '#79d0ff', s: '#bfeaff', e: '#26334d' },
  sentry: { k: '#1a1930', m: '#8d93a4', l: '#c6cedf', r: '#f35a56', a: '#5eb8ff', g: '#5ee07f' },
  boss: { k: '#101018', a: '#ef534e', b: '#ff9b5d', c: '#ffe0a1', d: '#5eb8ff', e: '#d2f2ff', p: '#5b4d79' },
};

const spriteMaps = {
  hero: {
    down: [
      ['..YYYY..','..YSSY..','..SKKS..','.BBWWBB.','B.BWWB.B','..BOOB..','..B..B..','.OO..OO.'],
      ['..YYYY..','..YSSY..','..SKKS..','.BBWWBB.','..BWWB..','.OB..BO.','..B..B..','OO....OO'],
    ],
    up: [
      ['..YYYY..','..YKKY..','..KKKK..','.BBWWBB.','B.BWWB.B','..BOOB..','..B..B..','.OO..OO.'],
      ['..YYYY..','..YKKY..','..KKKK..','.BBWWBB.','..BWWB..','.OB..BO.','..B..B..','OO....OO'],
    ],
    left: [
      ['..YYYY..','..YSS...','..SKK...','.BBWWB..','B.BWWB..','..BOO...','.OB.B...','OO..O...'],
      ['..YYYY..','..YSS...','..SKK...','.BBWWB..','..BWWBB.','..BOO...','OO..B...','...OO...'],
    ],
    right: [
      ['..YYYY..','...SSY..','...KKS..','..BWWBB.','..BWWB.B','...OOB..','...B.BO.','...O..OO'],
      ['..YYYY..','...SSY..','...KKS..','..BWWBB.','.BBWWB..','...OOB..','...B..OO','...OO...'],
    ],
    attack: {
      down: ['..YYYY..','..YSSY..','..SKKS..','.BBWWBB.','..BWWB..','..BOOB..','..B..B..','.OOYYOO.','....Y...'],
      up: ['....Y...','..YYYY..','..YKKY..','..KKKK..','.BBWWBB.','..BWWB..','..BOOB..','.OO..OO.'],
      left: ['.Y......','YYY.....','..YYYY..','..YSS...','..SKK...','.BBWWB..','..BWWBB.','OOBO....'],
      right: ['......Y.','.....YYY','..YYYY..','...SSY..','...KKS..','..BWWBB.','.BBWWB..','....OBOO'],
    },
  },
  blob: [
    ['........','..hhhh..','.hsssshh','hsskkssh','hssssssh','.hhsshh.','..hhhh..','........'],
    ['........','...hh...','.hhhhhh.','hsskkssh','hssssssh','hhsssshh','.hhhhhh.','........'],
  ],
  sentry: [
    ['..llll..','.lmmmm l'.replaceAll(' ',''),'.mkrrkm.','..mmmm..','.m.kk.m.','...mm...','..m..m..','.ll..ll.'],
    ['..llll..','.lmmmm l'.replaceAll(' ',''),'.mkrrkm.','..mmmm..','..mkkm..','.lm..ml.','..m..m..','ll....ll'],
  ],
  spitter: [
    ['..gggg..','.gkkkkg.','gkgaagkg','gkkkkkkg','.ggkkgg.','..gkkg..','.gg..gg.','........'],
    ['..gggg..','.gkkkkg.','gkgddgkg','gkkkkkkg','gggkkggg','..gkkg..','gg....gg','........'],
  ],
  charger: [
    ['.rrrrrr.','rrrkkrrr','rkkrrkkr','rrrrrrrr','.r.rr.r.','...rr...','..r..r..','.rr..rr.'],
    ['.rrrrrr.','rrrkkrrr','rkkrrkkr','rrrrrrrr','rr.rr.rr','...rr...','.rr..rr.','........'],
  ],
  poof: [
    ['........','...ss...','..ssss..','.ssssss.','.ssssss.','..ssss..','...ss...','........'],
    ['..s..s..','...ss...','s.ssss.s','.ssssss.','.ssssss.','s.ssss.s','...ss...','..s..s..'],
    ['s..ss..s','........','..s..s..','s......s','s......s','..s..s..','........','s..ss..s'],
  ],
};

const sprites = { hero: {}, enemies: {}, poof: [] };
function buildSprites() {
  for (const dir of DIR_ORDER) sprites.hero[dir] = spriteMaps.hero[dir].map(m => spriteFromMap(m, palettes.hero));
  sprites.hero.attack = {};
  for (const dir of DIR_ORDER) sprites.hero.attack[dir] = spriteFromMap(spriteMaps.hero.attack[dir], palettes.hero);
  const huePal = {
    crimson: { h: '#ff7771', s: '#ef534e', r: '#ef534e', a: '#ef534e', g: '#ef534e', d: '#ffb3ae' },
    verdant: { h: '#8ff4aa', s: '#5ee07f', r: '#5ee07f', a: '#5ee07f', g: '#5ee07f', d: '#d6ffd8' },
    azure: { h: '#86d6ff', s: '#5eb8ff', r: '#5eb8ff', a: '#5eb8ff', g: '#5eb8ff', d: '#d2f2ff' },
  };
  for (const type of ['blob', 'sentry', 'spitter', 'charger']) {
    sprites.enemies[type] = {};
    for (const hue of HUES) {
      const base = palettes[type === 'blob' ? 'blob' : type === 'sentry' ? 'sentry' : 'sentry'];
      sprites.enemies[type][hue] = spriteMaps[type].map(m => spriteFromMap(m, tintMap(base, huePal[hue])));
    }
  }
  sprites.poof = spriteMaps.poof.map(m => spriteFromMap(m, { s: '#ddd7ff' }));
  sprites.bossWarden = spriteFromMap([
    '....aaaaaaaa....','...abbbbbbbba...','..abccbccbccba..','.abcbkkbbkkbcba.','abbcbbbbbbbbcbba','abbbbbbbbbbbbbba','..bbbaaabbbbbb..','.abbaaaabbbaabba','abbaaaabbbaaaabb','..bb..bbbb..bb..','..bb..bbbb..bb..','.bbb..bbbb..bbb.'], palettes.boss, 2);
  sprites.bossOracle = spriteFromMap([
    '....dddddddd....','...deeeeeeeed...','..deedeeeedde..','.dedekkdekkeded.','ddeeddddddddeedd','ddeeeeeeeeeeeedd','..dddeeedddddd..','.ddppddddddppdd.','ddpppddddddpppdd','..dd..dddd..dd..','..dd..dddd..dd..','.ddd..dddd..ddd.'], palettes.boss, 2);
  sprites.shop = spriteFromMap(['..YYYY..','.YSSSSY.','YSYSSYSY','..YSSY..','..BBBB..','.BGBGB.','BGBBGBB','.OO..OO.'], palettes.hero, 2);
  sprites.heart = spriteFromMap(['.RR.RR.','RRRRRRR','RRRRRRR','.RRRRR.','..RRR..','...R...'], { R: '#ef534e' }, 2);
  sprites.shard = spriteFromMap(['..Y..','.YYY.','YYYYY','.YYY.','..Y..'], { Y: '#ffd66b' }, 2);
  sprites.potion = spriteFromMap(['..A..','.AAA.','..A..','.RRR.','RWWWR','RWWWR','.RRR.'], { A: '#d2f2ff', R: '#8f5bff', W: '#f7f1d0' }, 2);
}
buildSprites();

function baseState() {
  return {
    mode: 'title', frame: 0, time: 0, paused: false, typed: '', muted: false,
    shake: 0, flash: 0, messageTimer: 0, transition: null, stats: { kills: 0, bosses: 0, shards: 0, time: 0 },
    cheats: { god: false, rainbow: false }, tonic: 0, stone: 0,
    player: {
      x: 148, y: 92, w: 13, h: 14, vx: 0, vy: 0, dir: 'down', anim: 0, hp: 6, maxHp: 6,
      hue: 'azure', baseDamage: 1, speed: 72, iframes: 0, attack: 0, attackCd: 0, hurtFlash: 0,
      dashCd: 0, dashTime: 0, beamCd: 0, allHueUntil: 0,
    },
    room: { x: 0, y: 0 },
    inventory: { health: 1, tonic: 0, stone: 0 },
    upgrades: { heartContainers: 0, blade: 0, boots: false, dash: false, beam: false },
    bosses: { warden: false, oracle: false },
    opened: {},
    roomState: {},
  };
}
let state = baseState();
const input = { keys: new Set(), pressed: new Set(), touch: new Set() };

function save() {
  const data = JSON.stringify({ player: state.player, room: state.room, inventory: state.inventory, upgrades: state.upgrades, bosses: state.bosses, opened: state.opened, roomState: state.roomState, stats: state.stats, cheats: state.cheats });
  localStorage.setItem(SAVE_KEY, data);
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const data = JSON.parse(raw); state = Object.assign(baseState(), data); state.mode = 'title'; state.paused = false;
    state.player = Object.assign(baseState().player, data.player || {}); state.player.hp = Math.min(state.player.hp, state.player.maxHp);
    return true;
  } catch { return false; }
}
function newGame() { localStorage.removeItem(SAVE_KEY); state = baseState(); hydrateRoom(true); updateHud(); toast('A new prism oath begins.'); startGame(); }

function makeRoom({ name, x, y, region = 'grey', exits = {}, enemies = [], boss = null, shop = false, secret = false, signs = [], decor = [] }) {
  const roomExits = { ...exits };
  const tiles = Array.from({ length: ROOM_H }, (_, row) => Array.from({ length: ROOM_W }, (_, col) => (row === 0 || row === ROOM_H - 1 || col === 0 || col === ROOM_W - 1) ? '#' : '.'));
  for (const [side, open] of Object.entries(roomExits)) if (open) {
    if (side === 'north') for (let c = 8; c <= 11; c++) tiles[0][c] = '.';
    if (side === 'south') for (let c = 8; c <= 11; c++) tiles[ROOM_H - 1][c] = '.';
    if (side === 'west') for (let r = 4; r <= 6; r++) tiles[r][0] = '.';
    if (side === 'east') for (let r = 4; r <= 6; r++) tiles[r][ROOM_W - 1] = '.';
  }
  function put(ch, cells) { for (const [cx, cy] of cells) if (tiles[cy] && tiles[cy][cx] !== undefined) tiles[cy][cx] = ch; }
  return { name, x, y, region, exits: roomExits, enemies, boss, shop, secret, signs, decor, tiles, put };
}

const rooms = new Map();
function addRoom(r) { rooms.set(keyOf(r.x, r.y), r); return r; }
function buildWorld() {
  const allExits = { north: true, south: true, west: true, east: true };
  for (let y = -1; y <= 2; y++) for (let x = -1; x <= 2; x++) addRoom(makeRoom({ name: 'Unnamed Grey', x, y, exits: allExits }));
  const set = (x, y, props) => Object.assign(rooms.get(keyOf(x, y)), props);
  set(0, 0, { name: 'The Grey Crossroads', region: 'grey', enemies: [{ type: 'blob', hue: 'azure', x: 72, y: 68 }, { type: 'blob', hue: 'verdant', x: 218, y: 84 }], signs: [{ x: 144, y: 46, text: 'The Prism Blade answers 1, 2, and 3. Color is a key.' }] });
  set(-1, 0, { name: 'Crimson Bramble Pass', region: 'crimson', enemies: [{ type: 'sentry', hue: 'crimson', x: 54, y: 54 }, { type: 'blob', hue: 'crimson', x: 212, y: 108 }] });
  set(-1, -1, { name: 'Ash Gate Approach', region: 'crimson', enemies: [{ type: 'charger', hue: 'crimson', x: 120, y: 48 }, { type: 'sentry', hue: 'verdant', x: 220, y: 100 }] });
  set(0, -1, { name: 'The Ashen Warden', region: 'crimson', boss: 'warden', enemies: [] });
  set(1, -1, { name: 'Azure Causeway', region: 'azure', enemies: [{ type: 'spitter', hue: 'azure', x: 190, y: 44 }, { type: 'blob', hue: 'azure', x: 80, y: 112 }] });
  set(2, -1, { name: 'Tide Oracle Sanctum', region: 'azure', boss: 'oracle', enemies: [] });
  set(1, 0, { name: 'Verdant Ruin Fork', region: 'verdant', enemies: [{ type: 'sentry', hue: 'verdant', x: 104, y: 56 }, { type: 'spitter', hue: 'crimson', x: 214, y: 96 }] });
  set(2, 0, { name: 'Moonlit Reed Maze', region: 'azure', enemies: [{ type: 'charger', hue: 'azure', x: 230, y: 70 }, { type: 'blob', hue: 'verdant', x: 82, y: 98 }] });
  set(-1, 1, { name: 'Moss Secret Ledge', region: 'verdant', secret: true, enemies: [{ type: 'blob', hue: 'verdant', x: 120, y: 88 }] });
  set(0, 1, { name: 'Shardmason Bazaar', region: 'grey', shop: true, enemies: [], signs: [{ x: 116, y: 52, text: 'Shop: open inventory here to trade shards for potions and upgrades.' }] });
  set(1, 1, { name: 'Tri-Hue Lock Garden', region: 'verdant', enemies: [{ type: 'sentry', hue: 'azure', x: 62, y: 82 }, { type: 'charger', hue: 'verdant', x: 220, y: 74 }] });
  set(2, 1, { name: 'Sunken Shortcut', region: 'azure', enemies: [{ type: 'spitter', hue: 'azure', x: 164, y: 70 }] });
  set(-1, 2, { name: 'Old Root Cache', region: 'verdant', enemies: [{ type: 'charger', hue: 'verdant', x: 144, y: 80 }] });
  set(0, 2, { name: 'Silent Training Yard', region: 'grey', enemies: [{ type: 'blob', hue: 'crimson', x: 64, y: 58 }, { type: 'blob', hue: 'azure', x: 242, y: 104 }] });
  set(1, 2, { name: 'Hidden Prism Vault', region: 'grey', secret: true, enemies: [], signs: [{ x: 100, y: 84, text: 'A hidden room! The old wall yielded to hue and curiosity.' }] });
  set(2, 2, { name: 'Colorfall Overlook', region: 'azure', enemies: [{ type: 'sentry', hue: 'crimson', x: 88, y: 72 }, { type: 'spitter', hue: 'verdant', x: 210, y: 94 }] });

  // Data-driven terrain gates: W water/azure bridge, T crimson thorn, V verdant vines, C cracked secret wall.
  rooms.get(keyOf(1, -1)).put('W', [[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6]]);
  rooms.get(keyOf(2, 0)).put('W', [[4,3],[5,3],[6,3],[4,4],[5,4],[6,4],[13,6],[14,6],[15,6],[13,7],[14,7],[15,7]]);
  rooms.get(keyOf(-1, 0)).put('T', [[9,2],[10,2],[9,3],[10,3],[9,4],[10,4],[3,7],[4,7],[5,7]]);
  rooms.get(keyOf(-1, -1)).put('T', [[7,6],[8,6],[9,6],[10,6],[11,6],[12,6]]);
  rooms.get(keyOf(1, 0)).put('V', [[9,4],[10,4],[9,5],[10,5],[9,6],[10,6],[15,2],[15,3],[15,4]]);
  rooms.get(keyOf(-1, 1)).put('V', [[8,1],[9,1],[10,1],[11,1],[15,5],[16,5]]);
  rooms.get(keyOf(1, 1)).put('T', [[4,5],[5,5],[6,5]]); rooms.get(keyOf(1,1)).put('V', [[9,5],[10,5]]); rooms.get(keyOf(1,1)).put('W', [[13,5],[14,5],[15,5]]);
  rooms.get(keyOf(0, 2)).put('C', [[19,5]]); // hidden east exit to vault.
  rooms.get(keyOf(0, 2)).exits.east = false;
  rooms.get(keyOf(1, 2)).exits.west = false;
  rooms.get(keyOf(0, 1)).put('S', [[10,5]]);
  for (const r of rooms.values()) scatterDecor(r);
}
function scatterDecor(r) {
  for (let i = 0; i < 18; i++) {
    const x = irand(2, ROOM_W - 3), y = irand(2, ROOM_H - 3);
    if (r.tiles[y][x] === '.') r.decor.push({ x: x * TILE + irand(0, 8), y: y * TILE + irand(0, 8), kind: Math.random() < .5 ? 'grass' : 'stone' });
  }
}
buildWorld();

let entities = [];
let projectiles = [];
let particles = [];
let pickups = [];
let boss = null;
function currentRoom() { return rooms.get(keyOf(state.room.x, state.room.y)); }
function roomMemory(key) {
  const k = key || keyOf(state.room.x, state.room.y);
  state.roomState[k] ||= { killed: {}, thorns: {}, chests: {}, visited: false };
  return state.roomState[k];
}
function hydrateRoom(force = false) {
  const r = currentRoom(); const mem = roomMemory(); mem.visited = true;
  entities = []; projectiles = []; particles = []; pickups = []; boss = null;
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) if (r.tiles[y][x] === 'T' && mem.thorns[`${x},${y}`]) r.tiles[y][x] = '.';
  r.enemies.forEach((e, i) => { if (!mem.killed[`e${i}`]) entities.push(new Enemy(Object.assign({ id: `e${i}` }, e))); });
  if (r.boss && !state.bosses[r.boss]) boss = new Boss(r.boss);
  if (r.secret && !mem.chests.heart) pickups.push(new Pickup(148, 82, 'heartContainer'));
  if (r.shop) entities.push(new Shopkeeper(142, 72));
  dom.roomName.textContent = r.name;
  updateHud(); save();
  if (!force) toast(r.name);
}

function tileAt(px, py) {
  const r = currentRoom(); const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return '#';
  return r.tiles[ty][tx];
}
function isSolidTile(ch, tx = 0, ty = 0) {
  if (ch === '#') return true;
  if (ch === 'W') return !hueMatches(state.player.hue, 'azure');
  if (ch === 'V') return !hueMatches(state.player.hue, 'verdant');
  if (ch === 'T') return true;
  if (ch === 'C') return !hueMatches(state.player.hue, 'crimson');
  return false;
}
function collides(e) {
  const pts = [[e.x, e.y], [e.x + e.w, e.y], [e.x, e.y + e.h], [e.x + e.w, e.y + e.h]];
  return pts.some(([px, py]) => {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    return isSolidTile(tileAt(px, py), tx, ty);
  });
}
function moveWithCollision(e, dx, dy) {
  e.x += dx;
  if (collides(e)) { e.x -= dx; dx = 0; }
  e.y += dy;
  if (collides(e)) { e.y -= dy; dy = 0; }
  return { dx, dy };
}

class Enemy {
  constructor(o) {
    const hp = { blob: 2, sentry: 4, spitter: 3, charger: 5 }[o.type] || 2;
    Object.assign(this, { id: o.id, type: o.type, hue: o.hue, x: o.x, y: o.y, w: 14, h: 14, vx: 0, vy: 0, hp, maxHp: hp, speed: 28, dir: 'down', ai: 0, iframes: 0, dead: false, attackCd: 0, phase: 'idle', telegraph: 0, dash: 0, patrol: o.patrol || [[o.x, o.y], [o.x + 64, o.y]], patrolIndex: 0, anim: 0 });
    if (this.type === 'sentry') this.speed = 38;
    if (this.type === 'spitter') this.speed = 30;
    if (this.type === 'charger') this.speed = 34;
  }
  hit(dmg, hue, kb) {
    if (this.iframes > 0 || this.dead) return;
    const mod = hueMatches(hue, this.hue) ? 2 : .5;
    const dealt = Math.max(.5, dmg * mod);
    this.hp -= dealt; this.iframes = .28; this.vx += kb.x; this.vy += kb.y;
    burst(this.x + 7, this.y + 7, hue, 10); state.shake = Math.max(state.shake, 4); synth.hurt();
    if (this.hp <= 0) this.die();
  }
  die() {
    this.dead = true; state.stats.kills++; roomMemory().killed[this.id] = true; poof(this.x, this.y);
    const roll = Math.random();
    if (roll < .16) pickups.push(new Pickup(this.x, this.y, 'heart'));
    else if (roll < .26) pickups.push(new Pickup(this.x, this.y, 'potion'));
    else pickups.push(new Pickup(this.x, this.y, 'shard', irand(2, 6)));
  }
  update(dt) {
    this.iframes = Math.max(0, this.iframes - dt); this.attackCd -= dt; this.anim += dt * 8;
    const p = state.player; const d = dist(this, p); let ax = 0, ay = 0;
    if (this.type === 'blob') {
      this.ai -= dt; if (this.ai <= 0) { this.ai = rand(.5, 1.6); const a = rand(0, Math.PI * 2); this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed; }
      ax = this.vx; ay = this.vy;
    }
    if (this.type === 'sentry') {
      if (d < 92 && hasLineOfSight(this, p)) { const v = norm(p.x - this.x, p.y - this.y); ax = v.x * this.speed * 1.25; ay = v.y * this.speed * 1.25; }
      else { const target = this.patrol[this.patrolIndex]; const v = norm(target[0] - this.x, target[1] - this.y); ax = v.x * this.speed; ay = v.y * this.speed; if (Math.hypot(target[0] - this.x, target[1] - this.y) < 6) this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length; }
    }
    if (this.type === 'spitter') {
      const v = norm(p.x - this.x, p.y - this.y); if (d < 70) { ax = -v.x * this.speed; ay = -v.y * this.speed; } else if (d > 118) { ax = v.x * this.speed * .5; ay = v.y * this.speed * .5; }
      if (d < 150 && this.attackCd <= 0) { this.attackCd = 1.35; shoot(this.x + 7, this.y + 7, v.x * 82, v.y * 82, this.hue, 'enemy', 1); }
    }
    if (this.type === 'charger') {
      const v = norm(p.x - this.x, p.y - this.y);
      if (this.dash > 0) { this.dash -= dt; ax = this.vx; ay = this.vy; }
      else if (this.telegraph > 0) { this.telegraph -= dt; ax = 0; ay = 0; if (this.telegraph <= 0) { this.dash = .38; this.vx = v.x * 152; this.vy = v.y * 152; synth.tone(160, .12, 'sawtooth'); } }
      else { if (d < 96 && this.attackCd <= 0) { this.telegraph = .45; this.attackCd = 1.8; burst(this.x + 7, this.y + 7, this.hue, 8); } else { ax = v.x * this.speed * .65; ay = v.y * this.speed * .65; } }
    }
    if (Math.abs(ax) > Math.abs(ay)) this.dir = ax < 0 ? 'left' : 'right'; else if (Math.abs(ay) > 1) this.dir = ay < 0 ? 'up' : 'down';
    moveWithCollision(this, ax * dt, ay * dt);
    if (rects(this, p)) hurtPlayer(1, norm(p.x - this.x, p.y - this.y));
  }
  draw() {
    const img = sprites.enemies[this.type][this.hue][Math.floor(this.anim) % 2];
    if (this.iframes > 0 && Math.floor(this.iframes * 40) % 2 === 0) return;
    ctx.drawImage(img, Math.round(this.x - 1), Math.round(this.y - 2));
    if (this.telegraph > 0) { ctx.strokeStyle = HUE_COLOR[this.hue]; ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4); }
  }
}

class Boss {
  constructor(kind) {
    this.kind = kind; this.name = kind === 'warden' ? 'The Ashen Warden' : 'The Tide Oracle'; this.hue = kind === 'warden' ? 'crimson' : 'azure';
    this.x = 134; this.y = 48; this.w = 52; this.h = 48; this.hp = kind === 'warden' ? 42 : 38; this.maxHp = this.hp; this.timer = 1; this.iframes = 0; this.phase2 = false; this.anim = 0; this.teleport = 0;
    dom.bossBar.hidden = false; dom.bossName.textContent = this.name; dom.bossMeter.max = this.maxHp; dom.bossMeter.value = this.hp; synth.boss();
  }
  hit(dmg, hue, kb) {
    if (this.iframes > 0) return;
    const mod = hueMatches(hue, this.hue) ? 2 : .5; this.hp -= Math.max(.5, dmg * mod); this.iframes = .22; this.x += kb.x * .4; this.y += kb.y * .4;
    burst(this.x + this.w / 2, this.y + this.h / 2, hue, 18); state.shake = 8; synth.hurt();
    if (!this.phase2 && this.hp < this.maxHp / 2) { this.phase2 = true; toast(`${this.name} enters phase two!`); synth.boss(); if (this.kind === 'warden') summonMinions('crimson'); }
    if (this.hp <= 0) this.die();
    dom.bossMeter.value = Math.max(0, this.hp);
  }
  die() {
    state.bosses[this.kind] = true; state.stats.bosses++; state.shake = 18; poof(this.x, this.y, 3); burst(this.x + 26, this.y + 24, this.hue, 80);
    if (this.kind === 'warden') { state.upgrades.dash = true; toast('Crimson returns! Shift Dash learned.'); }
    else { state.upgrades.beam = true; toast('Azure returns! Full-heart Prism Beam learned.'); }
    boss = null; dom.bossBar.hidden = true; synth.pickup(); save();
    if (state.bosses.warden && state.bosses.oracle) setTimeout(victory, 900);
  }
  update(dt) {
    this.iframes = Math.max(0, this.iframes - dt); this.timer -= dt; this.anim += dt;
    const p = state.player; const c = center(this); const pc = center(p);
    if (this.kind === 'warden') {
      if (this.timer <= 0) {
        this.timer = this.phase2 ? 1.35 : 1.85;
        for (let i = 0; i < (this.phase2 ? 12 : 8); i++) { const a = i / (this.phase2 ? 12 : 8) * Math.PI * 2 + this.anim; shoot(c.x, c.y, Math.cos(a) * 78, Math.sin(a) * 78, 'crimson', 'enemy', 1, 'fire'); }
        if (this.phase2 && Math.random() < .7) summonMinions('crimson', 1);
      }
      const v = norm(pc.x - c.x, pc.y - c.y); moveWithCollision(this, v.x * dt * 20, v.y * dt * 20);
    } else {
      if (this.timer <= 0) {
        this.timer = this.phase2 ? .95 : 1.35; const count = this.phase2 ? 10 : 7;
        for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2 + this.anim * 2; shoot(c.x, c.y, Math.cos(a) * 88, Math.sin(a) * 88, 'azure', 'enemy', 1, 'water'); }
        if (Math.random() < (this.phase2 ? .65 : .35)) { this.x = rand(42, 226); this.y = rand(32, 104); poof(this.x, this.y); }
      }
    }
    if (rects(this, p)) hurtPlayer(2, norm(p.x - this.x, p.y - this.y));
  }
  draw() {
    if (this.iframes > 0 && Math.floor(this.iframes * 44) % 2 === 0) return;
    const img = this.kind === 'warden' ? sprites.bossWarden : sprites.bossOracle;
    ctx.drawImage(img, Math.round(this.x - 6), Math.round(this.y - 6));
  }
}

class Shopkeeper {
  constructor(x, y) { Object.assign(this, { type: 'shop', x, y, w: 16, h: 20, anim: 0 }); }
  update(dt) { this.anim += dt; if (dist(this, state.player) < 30) showShopHint(); }
  draw() { ctx.drawImage(sprites.shop, Math.round(this.x), Math.round(this.y - Math.sin(this.anim * 5))); }
}
class Projectile {
  constructor(x, y, vx, vy, hue, owner, damage = 1, style = 'spark') { Object.assign(this, { x, y, vx, vy, hue, owner, damage, style, w: 5, h: 5, life: 3 }); }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.x < 0 || this.y < 0 || this.x > CANVAS_W || this.y > MAP_H || isSolidTile(tileAt(this.x, this.y))) this.life = 0;
    if (this.owner === 'enemy' && rects(this, state.player)) { hurtPlayer(this.damage, norm(state.player.x - this.x, state.player.y - this.y)); this.life = 0; }
    if (this.owner === 'player') {
      for (const e of entities) if (!(e instanceof Shopkeeper) && rects(this, e)) { e.hit(this.damage, state.player.hue, norm(e.x - this.x, e.y - this.y)); this.life = 0; break; }
      if (boss && rects(this, boss)) { boss.hit(this.damage, state.player.hue, norm(boss.x - this.x, boss.y - this.y)); this.life = 0; }
    }
  }
  draw() { ctx.fillStyle = HUE_COLOR[this.hue] || '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.style === 'beam' ? 4 : 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff8'; ctx.fillRect(this.x - 1, this.y - 1, 2, 2); }
}
class Particle {
  constructor(x, y, hue = 'grey', life = .45) { const a = rand(0, Math.PI * 2), s = rand(16, 72); Object.assign(this, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, hue, life, max: life, size: rand(1, 3) }); }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= .94; this.vy *= .94; this.life -= dt; }
  draw() { ctx.globalAlpha = Math.max(0, this.life / this.max); ctx.fillStyle = HUE_COLOR[this.hue] || '#ddd'; ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1; }
}
class Pickup {
  constructor(x, y, kind, amount = 1) { Object.assign(this, { x, y, w: 10, h: 10, kind, amount, bob: rand(0, 9) }); }
  update(dt) { this.bob += dt * 5; if (rects(this, state.player)) return collect(this), true; return false; }
  draw() {
    const y = this.y + Math.sin(this.bob) * 2;
    if (this.kind === 'heart' || this.kind === 'heartContainer') ctx.drawImage(sprites.heart, this.x, y);
    else if (this.kind === 'potion') ctx.drawImage(sprites.potion, this.x, y);
    else ctx.drawImage(sprites.shard, this.x, y);
    if (this.kind === 'heartContainer') { ctx.strokeStyle = HUE_COLOR.gold; ctx.strokeRect(this.x - 2, y - 2, 16, 16); }
  }
}

function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function hasLineOfSight(a, b) {
  const ac = center(a), bc = center(b); const steps = Math.ceil(Math.hypot(bc.x - ac.x, bc.y - ac.y) / 8);
  for (let i = 1; i < steps; i++) { const t = i / steps; if (isSolidTile(tileAt(ac.x + (bc.x - ac.x) * t, ac.y + (bc.y - ac.y) * t))) return false; }
  return true;
}
function shoot(x, y, vx, vy, hue, owner, damage, style) { projectiles.push(new Projectile(x, y, vx, vy, hue, owner, damage, style)); }
function burst(x, y, hue, n = 8) { for (let i = 0; i < n; i++) particles.push(new Particle(x, y, hue)); }
function poof(x, y, n = 1) { for (let k = 0; k < n; k++) burst(x + rand(0, 18), y + rand(0, 18), 'grey', 16); }
function summonMinions(hue, count = 2) { for (let i = 0; i < count; i++) entities.push(new Enemy({ id: `m${Date.now()}${Math.random()}`, type: Math.random() < .5 ? 'blob' : 'sentry', hue, x: rand(40, 250), y: rand(38, 116) })); }

function hurtPlayer(damage, kb) {
  const p = state.player; if (p.iframes > 0 || state.cheats.god) return;
  let dmg = damage; if (state.stone > 0) dmg = Math.max(.5, dmg - 1);
  p.hp -= dmg; p.iframes = 1.0; p.hurtFlash = .45; p.x += kb.x * 10; p.y += kb.y * 10; state.shake = 8; burst(p.x + 7, p.y + 7, 'crimson', 14); synth.hurt(); updateHud();
  if (p.hp <= 0) { p.hp = Math.ceil(p.maxHp / 2); state.room = { x: 0, y: 0 }; p.x = 148; p.y = 92; toast('The Prism pulls you back to the Crossroads.'); hydrateRoom(); }
}
function collect(pickup) {
  if (pickup.kind === 'heart') { state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2); toast('Heart restored.'); }
  if (pickup.kind === 'heartContainer') { state.player.maxHp += 2; state.player.hp = state.player.maxHp; roomMemory().chests.heart = true; toast('Heart container acquired!'); }
  if (pickup.kind === 'potion') { state.inventory.health++; toast('Health Potion found.'); }
  if (pickup.kind === 'shard') { state.stats.shards += pickup.amount; toast(`+${pickup.amount} prism shards`); }
  synth.pickup(); updateHud(); save();
}

function setHue(hue) { state.player.hue = hue; dom.body.dataset.hue = hue; updateHud(); burst(state.player.x + 7, state.player.y + 7, hue, 8); }
function attack() {
  const p = state.player; if (p.attackCd > 0) return; p.attack = .18; p.attackCd = .34; synth.sword();
  const d = DIRS[p.dir]; const hit = { w: p.dir === 'left' || p.dir === 'right' ? 18 : 16, h: p.dir === 'up' || p.dir === 'down' ? 18 : 16 };
  hit.x = p.x + (p.dir === 'left' ? -16 : p.dir === 'right' ? p.w : -2);
  hit.y = p.y + (p.dir === 'up' ? -16 : p.dir === 'down' ? p.h : -2);
  const dmg = p.baseDamage + state.upgrades.blade;
  for (const e of entities) {
    if (e instanceof Shopkeeper && rects(hit, e)) { openInventory(); return; }
    if (!(e instanceof Shopkeeper) && rects(hit, e)) e.hit(dmg, p.hue, { x: d.x * 6, y: d.y * 6 });
  }
  if (boss && rects(hit, boss)) boss.hit(dmg, p.hue, { x: d.x * 8, y: d.y * 8 });
  cutHueTerrain(hit);
  if (state.upgrades.beam && p.hp >= p.maxHp && p.beamCd <= 0) { p.beamCd = .55; shoot(p.x + 7 + d.x * 10, p.y + 7 + d.y * 10, d.x * 170, d.y * 170, p.hue, 'player', 1.2, 'beam'); }
}
function cutHueTerrain(hit) {
  const r = currentRoom(); const mem = roomMemory();
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
    if (r.tiles[y][x] === 'T' && hueMatches(state.player.hue, 'crimson') && rects(hit, { x: x * TILE, y: y * TILE, w: TILE, h: TILE })) { r.tiles[y][x] = '.'; mem.thorns[`${x},${y}`] = true; burst(x * TILE + 8, y * TILE + 8, 'crimson', 18); synth.gate(); }
    if (r.tiles[y][x] === 'C' && hueMatches(state.player.hue, 'crimson') && rects(hit, { x: x * TILE, y: y * TILE, w: TILE, h: TILE })) { r.tiles[y][x] = '.'; r.exits.east = true; rooms.get(keyOf(1, 2)).exits.west = true; toast('A secret wall crumbles open!'); synth.gate(); }
  }
}
function dash() { const p = state.player; if (!state.upgrades.dash || p.dashCd > 0) return; p.dashTime = .14; p.dashCd = .65; burst(p.x + 7, p.y + 7, p.hue, 12); synth.tone(420, .08, 'triangle', .035, 1.8); }
function usePotion(kind) {
  const inv = state.inventory; kind ||= inv.health > 0 ? 'health' : inv.tonic > 0 ? 'tonic' : inv.stone > 0 ? 'stone' : null; if (!kind || inv[kind] <= 0) { toast('No potion ready.'); return; }
  inv[kind]--;
  if (kind === 'health') { state.player.hp = Math.min(state.player.maxHp, state.player.hp + 6); toast('Health Potion: wounds sealed.'); }
  if (kind === 'tonic') { state.tonic = 10; toast('Chroma Tonic: all hues sing for 10s.'); }
  if (kind === 'stone') { state.stone = 10; toast('Stone Skin: damage softened for 10s.'); }
  synth.pickup(); updateHud(); renderInventory(); save();
}
function buy(item) {
  const prices = { health: 12, tonic: 18, stone: 16, heart: 65, blade: 80, boots: 70 };
  const price = prices[item]; if (state.stats.shards < price) { toast('Not enough prism shards.'); return; }
  if (item === 'heart' && state.upgrades.heartContainers >= 2) return toast('No more heart stock.');
  if (item === 'blade' && state.upgrades.blade >= 2) return toast('The blade is fully honed.');
  if (item === 'boots' && state.upgrades.boots) return toast('You already wear swift boots.');
  state.stats.shards -= price;
  if (['health', 'tonic', 'stone'].includes(item)) state.inventory[item]++;
  if (item === 'heart') { state.upgrades.heartContainers++; state.player.maxHp += 2; state.player.hp = state.player.maxHp; }
  if (item === 'blade') state.upgrades.blade++;
  if (item === 'boots') { state.upgrades.boots = true; state.player.speed += 16; }
  synth.pickup(); toast('Purchase complete.'); updateHud(); renderInventory(); save();
}

function updatePlayer(dt) {
  const p = state.player; p.iframes = Math.max(0, p.iframes - dt); p.hurtFlash = Math.max(0, p.hurtFlash - dt); p.attack = Math.max(0, p.attack - dt); p.attackCd = Math.max(0, p.attackCd - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.beamCd = Math.max(0, p.beamCd - dt); state.tonic = Math.max(0, state.tonic - dt); state.stone = Math.max(0, state.stone - dt);
  let mx = 0, my = 0;
  if (down('ArrowLeft') || down('KeyA') || input.touch.has('left')) mx--;
  if (down('ArrowRight') || down('KeyD') || input.touch.has('right')) mx++;
  if (down('ArrowUp') || down('KeyW') || input.touch.has('up')) my--;
  if (down('ArrowDown') || down('KeyS') || input.touch.has('down')) my++;
  const v = norm(mx, my); if (mx || my) { p.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down'); p.anim += dt * 8; }
  const speed = p.speed * (p.dashTime > 0 ? 3.2 : 1); p.dashTime = Math.max(0, p.dashTime - dt);
  moveWithCollision(p, v.x * speed * dt, v.y * speed * dt);
  if (p.x < -4) changeRoom(-1, 0); if (p.x > CANVAS_W - p.w + 4) changeRoom(1, 0); if (p.y < -4) changeRoom(0, -1); if (p.y > MAP_H - p.h + 4) changeRoom(0, 1);
}
function changeRoom(dx, dy) {
  const nx = state.room.x + dx, ny = state.room.y + dy; const next = rooms.get(keyOf(nx, ny)); if (!next) { state.player.x = clamp(state.player.x, 1, CANVAS_W - state.player.w - 1); state.player.y = clamp(state.player.y, 1, MAP_H - state.player.h - 1); return; }
  if (dx < 0 && !currentRoom().exits.west) return state.player.x = 2;
  if (dx > 0 && !currentRoom().exits.east) return state.player.x = CANVAS_W - state.player.w - 2;
  if (dy < 0 && !currentRoom().exits.north) return state.player.y = 2;
  if (dy > 0 && !currentRoom().exits.south) return state.player.y = MAP_H - state.player.h - 2;
  state.room = { x: nx, y: ny };
  if (dx < 0) state.player.x = CANVAS_W - state.player.w - 5; if (dx > 0) state.player.x = 5; if (dy < 0) state.player.y = MAP_H - state.player.h - 5; if (dy > 0) state.player.y = 5;
  state.transition = { dx, dy, t: .22 }; hydrateRoom();
}

function update(dt) {
  if (state.mode !== 'game' || state.paused) return;
  state.time += dt; state.stats.time += dt; state.frame++; state.shake = Math.max(0, state.shake - dt * 24); state.flash = Math.max(0, state.flash - dt); if (state.transition) { state.transition.t -= dt; if (state.transition.t <= 0) state.transition = null; }
  updatePlayer(dt);
  for (const e of entities) e.update(dt);
  if (boss) boss.update(dt);
  projectiles.forEach(p => p.update(dt)); projectiles = projectiles.filter(p => p.life > 0);
  particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0);
  pickups = pickups.filter(p => !p.update(dt));
  updateHud(false);
}

function draw() {
  ctx.save();
  const shakeX = state.shake ? rand(-state.shake, state.shake) : 0, shakeY = state.shake ? rand(-state.shake, state.shake) : 0; ctx.translate(Math.round(shakeX), Math.round(shakeY));
  drawRoom();
  pickups.forEach(p => p.draw());
  entities.slice().sort((a,b)=>a.y-b.y).forEach(e => e.draw());
  if (boss) boss.draw();
  drawPlayer();
  projectiles.forEach(p => p.draw()); particles.forEach(p => p.draw());
  drawOverlay();
  ctx.restore();
}
function drawRoom() {
  const r = currentRoom(); const restored = regionRestored(r.region); const drain = restored ? 0 : .62;
  ctx.fillStyle = restored ? colorForRegion(r.region, .18) : '#171824'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) drawTile(r.tiles[y][x], x, y, drain);
  r.decor.forEach(d => { ctx.fillStyle = restored ? (d.kind === 'grass' ? colorForRegion(r.region, .75) : '#4a4c60') : '#343646'; ctx.fillRect(d.x, d.y, d.kind === 'grass' ? 3 : 5, d.kind === 'grass' ? 5 : 3); });
  for (const s of r.signs) { ctx.fillStyle = '#6f5b38'; ctx.fillRect(s.x, s.y, 16, 12); ctx.fillStyle = '#d9c68a'; ctx.fillRect(s.x + 3, s.y + 3, 10, 2); if (Math.hypot(state.player.x - s.x, state.player.y - s.y) < 24) drawSpeech(s.text); }
  if (r.shop) { ctx.fillStyle = '#402948'; ctx.fillRect(92, 36, 136, 34); ctx.fillStyle = HUE_COLOR.gold; ctx.fillText('PRISM SHOP', 118, 56); }
}
function colorForRegion(region, alpha = 1) { const c = { crimson: `rgba(116,35,38,${alpha})`, verdant: `rgba(34,91,55,${alpha})`, azure: `rgba(31,78,116,${alpha})`, grey: `rgba(48,48,66,${alpha})` }; return c[region] || c.grey; }
function regionRestored(region) { return region === 'grey' || (region === 'crimson' && state.bosses.warden) || (region === 'azure' && state.bosses.oracle) || (region === 'verdant' && (state.bosses.warden || state.bosses.oracle)); }
function drawTile(ch, x, y, drain) {
  const px = x * TILE, py = y * TILE;
  const grey = ['#232636', '#292d3e', '#33384a'];
  if (ch === '#') { ctx.fillStyle = grey[(x + y) % 3]; ctx.fillRect(px, py, TILE, TILE); ctx.fillStyle = '#454b60'; ctx.fillRect(px + 2, py + 2, 12, 2); }
  else { ctx.fillStyle = (x + y) % 2 ? '#202434' : '#1c2030'; ctx.fillRect(px, py, TILE, TILE); }
  if (ch === 'W') { ctx.fillStyle = hueMatches(state.player.hue, 'azure') ? '#5eb8ffcc' : '#142641'; ctx.fillRect(px, py, TILE, TILE); ctx.fillStyle = '#d2f2ff55'; ctx.fillRect(px, py + 5 + ((state.frame + x) % 4), TILE, 2); }
  if (ch === 'T') { ctx.fillStyle = '#4b1d2b'; ctx.fillRect(px, py, TILE, TILE); ctx.strokeStyle = '#ef534e'; ctx.beginPath(); ctx.moveTo(px + 2, py + 14); ctx.lineTo(px + 8, py + 2); ctx.lineTo(px + 14, py + 14); ctx.stroke(); }
  if (ch === 'V') { ctx.fillStyle = hueMatches(state.player.hue, 'verdant') ? '#5ee07f99' : '#203d2a'; ctx.fillRect(px, py, TILE, TILE); ctx.strokeStyle = '#91f0a6'; ctx.beginPath(); ctx.moveTo(px + 2, py + 13); ctx.bezierCurveTo(px + 4, py + 2, px + 12, py + 14, px + 14, py + 3); ctx.stroke(); }
  if (ch === 'C') { ctx.fillStyle = '#33384a'; ctx.fillRect(px, py, TILE, TILE); ctx.strokeStyle = '#776f81'; ctx.beginPath(); ctx.moveTo(px + 4, py + 2); ctx.lineTo(px + 9, py + 8); ctx.lineTo(px + 6, py + 14); ctx.stroke(); }
}
function drawSpeech(text) { ctx.fillStyle = '#090916dd'; ctx.fillRect(24, 130, 272, 34); ctx.strokeStyle = HUE_COLOR[state.player.hue]; ctx.strokeRect(24, 130, 272, 34); ctx.fillStyle = '#f4efff'; wrapText(text, 32, 143, 256, 11); }
function wrapText(text, x, y, max, lineH) { ctx.font = '8px monospace'; const words = text.split(' '); let line = ''; for (const w of words) { const test = line + w + ' '; if (ctx.measureText(test).width > max) { ctx.fillText(line, x, y); line = w + ' '; y += lineH; } else line = test; } ctx.fillText(line, x, y); }
function drawPlayer() {
  const p = state.player; if (p.iframes > 0 && Math.floor(p.iframes * 35) % 2 === 0) return;
  const img = p.attack > 0 ? sprites.hero.attack[p.dir] : sprites.hero[p.dir][Math.floor(p.anim) % 2];
  if (p.hurtFlash > 0) { ctx.globalAlpha = .45; ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 2, p.y - 4, 20, 22); ctx.globalAlpha = 1; }
  ctx.drawImage(img, Math.round(p.x - 2), Math.round(p.y - 4));
  ctx.strokeStyle = state.tonic > 0 || state.cheats.rainbow ? '#fff' : HUE_COLOR[p.hue]; ctx.strokeRect(Math.round(p.x - 2), Math.round(p.y - 4), 18, 20);
}
function drawOverlay() {
  if (state.tonic > 0) { ctx.fillStyle = '#ffffff18'; ctx.fillRect(0, 0, CANVAS_W, MAP_H); }
  if (state.stone > 0) { ctx.strokeStyle = '#c8c6c6'; ctx.strokeRect(3, 3, CANVAS_W - 6, MAP_H - 6); }
  if (state.mode === 'victory') { ctx.fillStyle = '#090916aa'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H); ctx.fillStyle = '#fff'; ctx.font = '18px monospace'; ctx.fillText('COLOR RETURNS', 88, 75); ctx.font = '9px monospace'; ctx.fillText(`Bosses ${state.stats.bosses}/2  Shards ${state.stats.shards}  Kills ${state.stats.kills}`, 55, 96); }
}

function updateHud(full = true) {
  const p = state.player;
  dom.hearts.innerHTML = ''; for (let i = 0; i < p.maxHp; i += 2) { const span = document.createElement('span'); span.className = 'heart' + (p.hp <= i ? ' empty' : ''); span.textContent = p.hp >= i + 2 ? '♥' : '♡'; dom.hearts.append(span); }
  dom.shards.textContent = `◇ ${state.stats.shards}`;
  document.querySelectorAll('.hue-chip').forEach(chip => chip.classList.toggle('active', chip.classList.contains(p.hue)));
  dom.mute.textContent = synth.muted ? 'Muted' : 'Sound'; dom.mute.setAttribute('aria-pressed', String(synth.muted));
  if (boss) dom.bossMeter.value = boss.hp;
}
function toast(msg, ms = 1800) { dom.toast.textContent = msg; dom.toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => dom.toast.classList.remove('show'), ms); }
function showShopHint() { if (!showShopHint.t || performance.now() - showShopHint.t > 3000) { showShopHint.t = performance.now(); toast('Open inventory here for the Prism Shop.'); } }

function openInventory() { state.paused = true; renderInventory(); dom.inv.showModal(); }
function closeInventory() { state.paused = false; dom.inv.close(); }
function renderInventory() {
  const inShop = currentRoom()?.shop;
  dom.invContent.innerHTML = `<p>Hue: <strong>${HUE_LABEL[state.player.hue]}</strong>${state.tonic > 0 ? ' · Chroma Tonic active' : ''}${state.cheats.rainbow ? ' · Rainbow secret active' : ''}</p>`;
  const grid = document.createElement('div'); grid.className = 'inventory-grid'; dom.invContent.append(grid);
  const cards = [
    ['health', 'Health Potion', `Restore 3 hearts. Owned: ${state.inventory.health}`],
    ['tonic', 'Chroma Tonic', `All-hue attunement for 10s. Owned: ${state.inventory.tonic}`],
    ['stone', 'Stone Skin', `Reduce incoming damage for 10s. Owned: ${state.inventory.stone}`],
  ];
  for (const [kind, title, desc] of cards) { const el = document.createElement('article'); el.className = 'inventory-card'; el.innerHTML = `<h3>${title}</h3><p>${desc}</p><button class="pixel-button" ${state.inventory[kind] <= 0 ? 'disabled' : ''}>Use</button>`; el.querySelector('button').onclick = () => usePotion(kind); grid.append(el); }
  if (inShop) {
    const shop = document.createElement('section'); shop.innerHTML = '<h3>Prism Shop</h3><p>Spend shards on survival or permanent upgrades.</p>'; const sg = document.createElement('div'); sg.className = 'inventory-grid'; shop.append(sg); dom.invContent.append(shop);
    [['health','Health Potion',12],['tonic','Chroma Tonic',18],['stone','Stone Skin',16],['heart','Heart Container',65],['blade','Blade Honing',80],['boots','Movement Boots',70]].forEach(([item,label,price]) => { const el = document.createElement('article'); el.className = 'inventory-card'; el.innerHTML = `<h3>${label}</h3><p>Cost: ◇${price}</p><button class="pixel-button primary">Buy</button>`; el.querySelector('button').onclick = () => buy(item); sg.append(el); });
  }
}

function down(code) { return input.keys.has(code); }
function pressed(code) { const has = input.pressed.has(code); if (has) input.pressed.delete(code); return has; }
function startGame() { state.mode = 'game'; dom.body.dataset.screen = 'game'; hydrateRoom(true); updateHud(); }
function victory() { state.mode = 'victory'; dom.body.dataset.screen = 'victory'; state.paused = false; state.flash = 2; toast('Victory! The world blooms in full color.', 4200); save(); }
function handleActions() {
  if (state.mode === 'title') { if (pressed('Enter')) startGame(); return; }
  if (pressed('Digit1')) setHue('crimson'); if (pressed('Digit2')) setHue('verdant'); if (pressed('Digit3')) setHue('azure');
  if (pressed('Space') || pressed('KeyZ') || input.touch.has('attack')) attack();
  if (pressed('ShiftLeft') || pressed('ShiftRight') || input.touch.has('dash')) dash();
  if (pressed('KeyQ') || input.touch.has('potion')) usePotion();
  if (pressed('KeyI') || pressed('Escape')) dom.inv.open ? closeInventory() : openInventory();
  if (pressed('Backquote')) openCheat();
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code); input.pressed.add(e.code);
  if (e.code === 'KeyM') { synth.muted = !synth.muted; state.muted = synth.muted; updateHud(); }
  konami(e.code);
  if (state.mode === 'title' && /^[a-z0-9]$/i.test(e.key)) { state.typed = (state.typed + e.key.toUpperCase()).slice(-16); checkCheat(state.typed, true); }
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
dom.start.addEventListener('click', () => startGame());
dom.newGame.addEventListener('click', () => newGame());
dom.mute.addEventListener('click', () => { synth.muted = !synth.muted; updateHud(); });
dom.inv.addEventListener('close', () => { state.paused = false; });
dom.cheatForm.addEventListener('submit', (e) => { e.preventDefault(); checkCheat(dom.cheatInput.value.toUpperCase().trim(), false); dom.cheat.close(); state.paused = false; });
document.querySelectorAll('[data-touch]').forEach(btn => {
  const key = btn.dataset.touch;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if (key.startsWith('hue-')) setHue(key.split('-')[1]); else input.touch.add(key); });
  btn.addEventListener('pointerup', () => input.touch.delete(key)); btn.addEventListener('pointercancel', () => input.touch.delete(key));
});

function openCheat() { state.paused = true; dom.cheatInput.value = ''; dom.cheat.showModal(); setTimeout(() => dom.cheatInput.focus(), 40); }
const cheatHandlers = {
  HYRULE: () => { state.cheats.god = !state.cheats.god; toast(`God mode ${state.cheats.god ? 'enabled' : 'disabled'}.`); },
  RAINBOW: () => { state.cheats.rainbow = true; toast('Permanent all-hue attunement unlocked.'); },
  RICHKID: () => { state.stats.shards = 999; toast('999 prism shards acquired.'); },
  WARP1: () => warp(0, -1, 'Ashen Warden'),
  WARP2: () => warp(2, -1, 'Tide Oracle'),
};
function checkCheat(code, suffix = false) { for (const [key, fn] of Object.entries(cheatHandlers)) if ((suffix && code.endsWith(key)) || code === key) { fn(); updateHud(); save(); return true; } return false; }
function warp(x, y, label) { state.room = { x, y }; state.player.x = 148; state.player.y = 118; hydrateRoom(); startGame(); toast(`Warped to ${label}.`); }
let konamiIndex = 0; const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
function konami(code) { if (code === konamiSeq[konamiIndex]) { konamiIndex++; if (konamiIndex === konamiSeq.length) { konamiIndex = 0; state.player.hp = state.player.maxHp; state.inventory.health = Math.max(state.inventory.health, 3); state.inventory.tonic = Math.max(state.inventory.tonic, 2); state.inventory.stone = Math.max(state.inventory.stone, 2); toast('Konami prism blessing: healed and stocked.'); synth.pickup(); updateHud(); save(); } } else konamiIndex = code === konamiSeq[0] ? 1 : 0; }

let acc = 0, last = performance.now();
function loop(now) {
  const dt = Math.min(.08, (now - last) / 1000); last = now; acc += dt;
  handleActions();
  while (acc >= STEP) { update(STEP); acc -= STEP; }
  draw(); input.pressed.clear(); requestAnimationFrame(loop);
}

function boot() {
  load(); synth.muted = state.muted; setHue(state.player.hue || 'azure'); hydrateRoom(true); dom.body.dataset.screen = 'title'; updateHud(); requestAnimationFrame(loop);
  if (localStorage.getItem(SAVE_KEY)) toast('Save found. Start continues your journey.');
}
boot();
