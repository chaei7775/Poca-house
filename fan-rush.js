// ════════════════════════════════
// 🔥 팬 러시 (fan-rush.js)
//
// 팬덤 원정에 추가되는 4번째 칸. 탑뷰 맵에서 팬들이 몹처럼 몰려오고, 내 아이돌이 스킬로 '응대'한다.
//  - 화면을 누른 채 끌면 그쪽으로 이동 (카메라가 아이돌을 따라감)
//  - 스킬 버튼으로 팬을 응대: ✍️사인 · 📸사진 · 🤝악수 · 🎤하이라이트 부르기(광역) · 💖윙크 샤워(넓은 광역) · ✨앵콜 폭죽(대광역). 스킬마다 쿨타임, 플레이어 레벨로 해금
//  - 팬한테 치이면 HP가 깎임. 0이 되면 쫓겨남 (그때까지 번 보상의 절반만 받음). 회복약(가방)으로 회복
//  - 팬 종류: 🙋일반 · ⚡열혈(빠름) · 🧸덕후(튼튼) · 💌편지러(멀리서 편지를 던짐) · 👑 고인물 팬클럽장(마지막 웨이브 보스)
//  - 8웨이브 클리어 + 보스를 응대하면 성공 → 코인 / 카드 경험치 / 프리미엄 조각 / 강화석
//  - 입장: 플레이어 Lv.15 이상 · 스태미나 ENTRY_STAMINA · 히든카드를 가진 멤버로 출전 (기존 팬덤 원정과 같은 카드 선택 화면)
//
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 됨. 기존 broadcast-expedition.js / fan-skills.js 는 건드리지 않는다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var LOC_ID = 'fan_rush';
  var NEED_LEVEL = 15;             // 입장 가능한 플레이어 레벨
  var ENTRY_STAMINA = 120;         // 입장할 때 드는 스태미나
  var WORLD = 1500;                // 맵 한 변 (px)
  var WAVES = 8;                   // 웨이브 수 (마지막은 보스)
  var WAVE_MAX_SEC = 24;           // 한 웨이브가 이 시간 넘으면 다음 웨이브가 먼저 시작
  var PLAYER_SPEED = 140;          // 이동 속도 (px/초)
  var BASE_HP = 135, HP_PER_LV = 10;         // 최대 HP = BASE + (플레이어 레벨 - 10) × HP_PER_LV
  var DMG_PER_LV = 0.04;           // 스킬 위력: 1 + (플레이어 레벨 - 10) × 이 값
  var HIT_COOLDOWN = 0.5;          // 한 번 맞고 나서 무적 시간(초)
  // 보상 (한 판 전부 성공했을 때 대략: 코인 약 10만, 경험치 약 2천, 조각 0~2개)
  var COIN_PER_FAN = 250;          // 팬 1명 응대 코인 (웨이브가 높을수록 조금씩 늘어남)
  var EXP_PER_FAN = 8;             // 팬 1명 응대 카드 경험치
  var BOSS_COIN = 40000, BOSS_EXP = 800;
  var BOSS_PIECE_CHANCE = 0.7;     // 보스를 응대했을 때 🖼️ 프리미엄 조각 +1 확률
  var BOSS_PIECE_BONUS = 0.25;     // 거기에 한 번 더(+1) 줄 확률
  var BOSS_STONE_CHANCE = 0.15;    // 보스 응대 시 강화석 +1 확률
  var DEFEAT_RATE = 0.5;           // 쫓겨났을 때 코인·경험치를 받는 비율
  var BOOK_FAN = 0.005;            // 팬 한 명 응대할 때 📘 스킬북(장착 스킬 중 하나)이 나올 확률
  var BOOK_BOSS = 1;               // 보스까지 깨면 보장되는 스킬북 개수
  var HEART_DROP = 0.05;           // 팬이 만족했을 때 하트(HP +10)를 떨어뜨릴 확률
  var PIECE_NAME = '프리미엄 조각', PIECE_EMOJI = '🖼️', PIECE_GOAL = 100;
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BG_FILE = 'map-fanrush.png';  // 있으면 배너·카드선택 배경으로 쓰임(없어도 됨)

  // 스킬 (unlock = 플레이어 레벨 / dmg = 기본 위력 / cd = 쿨타임(초) / range = 사거리 or 반경)
  var SKILLS = [
    { id: 'sign',   icon: '✍️', name: '사인',       unlock: 1, cd: 1,  dmg: 34,  range: 150, kind: 'single', desc: '가까운 팬 1명에게 사인!' },
    { id: 'photo',  icon: '📸', name: '사진촬영',   unlock: 1, cd: 1,  dmg: 42,  range: 300, kind: 'line',   desc: '앞쪽 일직선의 팬을 한꺼번에 찰칵!' },
    { id: 'shake',  icon: '🤝', name: '악수',       unlock: 10, cd: 1,  dmg: 130, range: 120, kind: 'single', desc: '한 명을 확실하게! HP도 조금 회복' },
    { id: 'heart',  icon: '💗', name: '손하트',     unlock: 15, cd: 1,  dmg: 60,  range: 270, kind: 'multi',  desc: '하트 3발! 가까운 팬 3명을 한꺼번에 저격' },
    { id: 'highlight', icon: '🎤', name: '하이라이트', unlock: 20, cd: 7,  dmg: 75,  range: 170, kind: 'aoe', sfx: 'concertHigh',  desc: '하이라이트 부르기! 주변 팬들을 확 사로잡아요 (광역)' },
    { id: 'wink',   icon: '💖', name: '윙크 샤워',   unlock: 25, cd: 10, dmg: 50,  range: 270, kind: 'aoe', sfx: 'concertWink',  desc: '넓은 범위에 윙크 세례! 팬들을 멀리 밀어내요 (넓은 광역)' },
    { id: 'encore', icon: '✨', name: '앵콜 폭죽',   unlock: 30, cd: 18, dmg: 210, range: 310, kind: 'aoe', sfx: 'concertEncore', desc: '앵콜 폭죽! 전방위 대폭발 + 잠깐 무적 (대광역)' },
    { id: 'rose',   icon: '🌹', name: '장미 세례',   unlock: 35, cd: 12, dmg: 90,  range: 340, kind: 'aoe', sfx: 'concertWink',  desc: '장미꽃 세례! 초광역 + 팬들이 3초간 느려져요' },
    { id: 'finale', icon: '🎆', name: '피날레 불꽃쇼', unlock: 40, cd: 28, dmg: 260, range: 430, kind: 'aoe', sfx: 'concertEncore', desc: '불꽃쇼! 거의 화면 전체 + 팬들을 크게 밀어내고 잠깐 무적' }
  ];
  // 팬 종류 (hp = 만족해야 하는 양 / sp = 속도 / dmg = 닿았을 때 HP 깎임 / r = 크기)
  var FANTYPES = {
    normal:  { emoji: '🙋', name: '일반 팬',     hp: 45,   sp: 58,  dmg: 4,  r: 15 },
    rusher:  { emoji: '⚡', name: '열혈 팬',     hp: 26,   sp: 112, dmg: 3,  r: 13 },
    tank:    { emoji: '🧸', name: '덕후',        hp: 170,  sp: 40,  dmg: 8,  r: 23 },
    thrower: { emoji: '💌', name: '편지러',      hp: 38,   sp: 46,  dmg: 3,  r: 14, ranged: true },
    boss:    { emoji: '👑', name: '고인물 팬클럽장', hp: 1100, sp: 52, dmg: 12, r: 36, boss: true }
  };

  // ── 보디가드(용병): 출전 전에 코인으로 고용 (한 판마다). 최대 BG_MAX명 ──
  var BG_MAX = 2;
  var BODYGUARDS = [
    { id: 'wall',   img: 'guard-1.png', name: '강도현', role: '철벽 경호', cost: 2000, desc: '몸으로 팬들을 막아 밀어내고, 내가 맞는 피해도 35% 줄여줘요' },
    { id: 'luck',   img: 'guard-2.png', name: '하윤',   role: '실수 보호', cost: 2000, desc: '스킬 순서를 틀려도 40% 확률로 벌을 안 받고 넘어가요' },
    { id: 'bounty', img: 'guard-3.png', name: '마석',   role: '보상 사냥꾼', cost: 2500, desc: '이번 판 코인 +30%, 경험치 +20%, 보스 프리미엄 조각 확률 +20%p' }
  ];
  function bgById(id) { return BODYGUARDS.filter(function (b) { return b.id === id; })[0] || null; }
  var guardImgs = {};
  function guardImg(def) {
    if (guardImgs[def.id]) return guardImgs[def.id];
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () { im._ok = true; };
    im.src = IMG_BASE + def.img;
    guardImgs[def.id] = im; return im;
  }

  var G = null;      // 지금 하고 있는 판
  var $ = function (id) { return document.getElementById(id); };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n) { try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(n); } catch (e) {} }
  function fmt(n) { return Number(n).toLocaleString(); }
  function dmgMult() { return 1 + Math.max(0, plv() - 10) * DMG_PER_LV; }
  function maxHpNow() { return BASE_HP + Math.max(0, plv() - 10) * HP_PER_LV; }
  var API = function () { return window.__fanSkillsAPI || null; };
  function skillOpen(s) { var a = API(); return a ? plv() >= (a.SKILLS.filter(function (x) { return x.id === s.id; })[0] || { useLv: s.unlock }).useLv : plv() >= s.unlock; }
  function skillOwned(s) { var a = API(); return !a || !G || a.hasSkill(G.charId, s.id); }
  // 한 판 동안만: 장착한 단일 스킬이 3개 미만이면, 빈 슬롯에 배운 기본 스킬(사인·사진·악수·하트)을 자동으로 채워서 팬들이 다양한 걸 요구하게 함 (저장된 장착 상태는 안 바뀜)
  function loadoutIds() {
    var a = API(), base = a ? a.loadout() : ['sign', 'photo', null, null, null];
    if (!G || !a) return base;
    var lo = base.slice(), singles = 0, have = {};
    lo.forEach(function (id) { if (id) { have[id] = 1; var k = skillById(id); if (k && k.kind !== 'aoe' && skillOpen(k) && skillOwned(k)) singles++; } });
    ['sign', 'photo', 'shake', 'heart'].forEach(function (id) {
      if (singles >= 3 || have[id]) return;
      var k = skillById(id), idx = -1; for (var i = 0; i < lo.length; i++) if (!lo[i]) { idx = i; break; }
      if (k && idx >= 0 && skillOpen(k) && skillOwned(k)) { lo[idx] = id; have[id] = 1; singles++; }
    });
    return lo;
  }
  // 스킬은 멤버별로 배우는 거라, 다른 멤버가 산 스킬은 이 멤버가 못 써요 → 누가 배웠는지 알려줌
  function whoHas(sid) {
    var a = API(), out = [];
    try { Object.keys(CHARS).forEach(function (cid) { if (a && a.hasSkill(cid, sid)) out.push(CHARS[cid].name); }); } catch (e) {}
    return out;
  }
  function lackHtml(charId) {
    var a = API(); if (!a) return '';
    var lack = loadoutIds().filter(Boolean).map(skillById).filter(function (k) { return k && !a.hasSkill(charId, k.id); });
    if (!lack.length) return '';
    var nm = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId].name : '이 멤버';
    return '<div style="font-size:12px;line-height:1.6;color:#ffb3b3;background:rgba(255,80,80,.12);border:1px solid rgba(255,120,120,.4);border-radius:10px;padding:8px 10px;margin:0 0 10px;text-align:left;">🔒 ' + nm + '은(는) 장착한 스킬을 아직 못 배웠어요<br>' +
      lack.map(function (k) { var w = whoHas(k.id).slice(0, 4); return k.icon + ' ' + k.name + (w.length ? ' <span style="color:#ddd;">(배운 멤버: ' + w.join(', ') + ')</span>' : ''); }).join('<br>') +
      '<br><span style="color:#ddd;">스킬은 멤버별로 사요 · 더보기 &gt; 💖 팬 스킬 상점</span></div>';
  }
  function skillById(id) { return SKILLS.filter(function (x) { return x.id === id; })[0] || null; }

  // 웨이브 구성: 웨이브마다 [종류, 수] 목록 (마지막 웨이브는 보스 + 졸개)
  function waveList(n) {
    var L = [];
    if (n >= WAVES) { L.push(['boss', 1]); L.push(['normal', 6]); L.push(['rusher', 4]); return L; }
    L.push(['normal', 5 + n * 2]);
    if (n >= 2) L.push(['rusher', 2 + n]);
    if (n >= 3) L.push(['thrower', Math.floor(n / 2) + 1]);
    if (n >= 4) L.push(['tank', Math.floor((n - 2) / 2)]);
    return L;
  }

  // ════════ 판 시작 ════════
  function newGame(charId, vw, vh) {
    var ch = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId] : { name: '아이돌', emoji: '🎤', gradeColor: '#fff' };
    var g = {
      charId: charId, ch: ch, px: WORLD / 2, py: WORLD / 2, dir: { x: 0, y: 1 },
      maxhp: maxHpNow(), hp: maxHpNow(),
      fans: [], proj: [], pick: [], fx: [], dn: [],
      wave: 0, waveT: 0, queue: [], rest: 1.2, bossDown: false, minionT: 0,
      time: 0, coins: 0, exp: 0, kills: 0, cd: {}, inv: 0, shield: 0, flashRed: 0,
      over: false, won: false, shake: 0, input: { x: 0, y: 0 },
      cam: { x: WORLD / 2 - vw / 2, y: WORLD / 2 - vh / 2 }, vw: vw, vh: vh,
      banner: { text: '', t: 0 }, nextId: 1, paused: false, guards: [], books: []
    };
    SKILLS.forEach(function (s) { g.cd[s.id] = 0; });
    return g;
  }

  function addDn(x, y, text, color, big) { G.dn.push({ x: x, y: y, text: text, color: color || '#fff', t: 0.9, big: !!big }); }
  function addFx(o) { G.fx.push(o); }

  function nextWave() {
    G.wave += 1; G.waveT = 0;
    var list = waveList(G.wave), arr = [];
    list.forEach(function (e) { for (var i = 0; i < e[1]; i++) arr.push(e[0]); });
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    var spread = G.wave >= WAVES ? 6 : Math.min(14, 6 + G.wave);
    var q = arr.map(function (type, i) { return { t: (i / arr.length) * spread, type: type }; });
    q.sort(function (a, b) { return (a.type === 'boss' ? -1 : 0) - (b.type === 'boss' ? -1 : 0) || a.t - b.t; });
    if (q.length && q[0].type === 'boss') q[0].t = 0.5;
    G.queue = q;
    G.banner = { text: G.wave >= WAVES ? '👑 보스 등장! 고인물 팬클럽장' : ('WAVE ' + G.wave + ' / ' + WAVES), t: 2.2 };
    sfx(G.wave >= WAVES ? 'concertDrop' : 'pick');
  }

  // ── 팬 머리 위에 뜨는 스킬 순서 (팬마다 필요한 스킬 개수가 다름) ──
  var SEQ_BY = { normal: 2, rusher: 2, thrower: 2, tank: 3, boss: 5 };   // 팬마다 달고 나오는 랜덤 스킬 개수
  function usablePool() {
    var out = [];
    loadoutIds().forEach(function (id) {
      var k = id && skillById(id);
      if (k && k.kind !== 'aoe' && skillOpen(k) && skillOwned(k) && out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }
  function makeSeq(n) {
    var pool = usablePool(); if (!pool.length) pool = ['sign', 'photo'];
    var seq = [];
    for (var i = 0; i < n; i++) {
      var c = pool.filter(function (x) { return pool.length < 2 || x !== seq[i - 1]; });
      seq.push(c[Math.floor(Math.random() * c.length)]);
    }
    return seq;
  }
  function spawnFan(type, x, y) {
    var T = FANTYPES[type];
    if (x === undefined) {
      var a = Math.random() * Math.PI * 2, d = rnd(Math.max(G.vw, G.vh) * 0.55, Math.max(G.vw, G.vh) * 0.7);
      x = clamp(G.px + Math.cos(a) * d, 30, WORLD - 30); y = clamp(G.py + Math.sin(a) * d, 30, WORLD - 30);
    }
    var wmul = 1 + (G.wave - 1) * 0.04;     // 웨이브가 올라갈수록 조금씩 튼튼해짐
    var f = { id: G.nextId++, type: type, T: T, x: x, y: y, hp: T.hp * (T.boss ? 1 : wmul), mhp: T.hp * (T.boss ? 1 : wmul), kx: 0, ky: 0, flash: 0, shootT: rnd(0.8, 2), wob: Math.random() * 6, step: 0, angry: 0, face: 1 + Math.floor(Math.random() * FAN_FACES), acc: pickAcc(type), lc: ['#ff4d9d', '#4dd2ff', '#ffd23f', '#9b6bff', '#5dff9a'][Math.floor(Math.random() * 5)] };
    f.seq = makeSeq(SEQ_BY[type] || 1);
    G.fans.push(f);
    return f;
  }

  // ════════ 한 프레임 ════════
  function hasGuard(id) { return !!G && G.guards.some(function (g) { return g.def.id === id; }); }
  function hurt(d) {
    if (G.over || G.inv > 0 || G.shield > 0) return;
    if (hasGuard('wall')) d = Math.max(1, d * 0.65);
    G.hp -= d; G.inv = HIT_COOLDOWN; G.shake = 7; G.flashRed = 0.25;
    addDn(G.px, G.py - 24, '-' + Math.round(d), '#ff6b6b', false);
    sfx('concertDrop');
    if (G.hp <= 0) { G.hp = 0; finish(false); }
  }
  function heal(n) {
    var before = G.hp; G.hp = Math.min(G.maxhp, G.hp + n);
    if (G.hp > before) addDn(G.px, G.py - 24, '+' + Math.round(G.hp - before), '#6ee7a0', false);
  }
  function satisfy(f) {
    var i = G.fans.indexOf(f); if (i >= 0) G.fans.splice(i, 1);
    G.kills += 1;
    var coin = f.T.boss ? 0 : Math.round(COIN_PER_FAN * (1 + (G.wave - 1) * 0.12));
    G.coins += coin; G.exp += f.T.boss ? 0 : EXP_PER_FAN;
    if (coin) addDn(f.x, f.y - 20, '+' + coin, '#ffd76a', false);
    addFx({ k: 'hearts', x: f.x, y: f.y, t: 0.9, max: 0.9 });
    burstAt(f.x, f.y - 6, f.T.boss ? 40 : 14, ['#ff6fb1', '#ffd76a', '#ffffff', '#9fd8ff'], f.T.boss ? 230 : 130, 0, !!f.T.boss);
    if (f.T.boss) { var Xb = xfs(); Xb.flash = 0.6; Xb.flashMax = 0.6; Xb.flashRgb = '255,230,150'; Xb.zoom = 0.1; Xb.slowT = 0.5; Xb.slowS = 0.3; G.shake = 14; confetti(80, CONF_COLS); }
    if (Math.random() < BOOK_FAN) { var pool0 = loadoutIds().filter(Boolean); if (pool0.length) { G.books.push(pool0[Math.floor(Math.random() * pool0.length)]); addDn(f.x, f.y - 34, '📘', '#9fd8ff', true); } }
    if (Math.random() < HEART_DROP) G.pick.push({ x: f.x, y: f.y, v: 10, t: 14 });
    if (f.T.boss) { G.bossDown = true; G.banner = { text: '👑 팬클럽장이 만족했어요!', t: 2.5 }; sfx('reward'); }
  }
  function knock(f, kb, fromX, fromY) {
    var d = dist(f.x, f.y, fromX, fromY) || 1, k = f.T.boss ? kb * 0.15 : (f.T.r > 20 ? kb * 0.5 : kb);
    f.kx += (f.x - fromX) / d * k * 4; f.ky += (f.y - fromY) / d * k * 4; f.flash = 0.12;
  }
  // 맞는 스킬 → 한 칸 전진, 다 채우면 만족. 틀린 스킬 → 순서 처음부터 + 화남
  function advance(f) {
    f.step += 1; f.flash = 0.15;
    if (f.step >= f.seq.length) { satisfy(f); return true; }
    addDn(f.x, f.y - f.T.r - 14, '💗 ' + f.step + '/' + f.seq.length, '#ff9ec7', false);
    return false;
  }
  function wrongPress(f) {
    if (hasGuard('luck') && Math.random() < 0.4) { addDn(f.x, f.y - f.T.r - 14, '🛡️ 하윤이 막아줬어요', '#9fd8ff', false); return; }
    f.step = 0; f.angry = 4;
    addDn(f.x, f.y - f.T.r - 14, '😤 순서가 틀렸어요!', '#ff6b6b', true);
  }
  function nearestFan(maxD) {
    var best = null, bd = maxD;
    G.fans.forEach(function (f) { var d = dist(f.x, f.y, G.px, G.py) - f.T.r; if (d < bd) { bd = d; best = f; } });
    return best;
  }

  function update(dt) {
    if (!G || G.over || G.paused) return;
    G.time += dt;
    var m = G.input, mag = Math.sqrt(m.x * m.x + m.y * m.y);
    if (mag > 0.05) {
      var k = Math.min(1, mag);
      G.px = clamp(G.px + (m.x / mag) * PLAYER_SPEED * k * dt, 22, WORLD - 22);
      G.py = clamp(G.py + (m.y / mag) * PLAYER_SPEED * k * dt, 22, WORLD - 22);
      G.dir = { x: m.x / mag, y: m.y / mag };
    }
    G.inv = Math.max(0, G.inv - dt); G.shield = Math.max(0, G.shield - dt); G.flashRed = Math.max(0, G.flashRed - dt);
    G.shake = Math.max(0, G.shake - dt * 30);
    SKILLS.forEach(function (s) { G.cd[s.id] = Math.max(0, G.cd[s.id] - dt); });
    if (G.banner.t > 0) G.banner.t -= dt;

    // 웨이브 진행
    if (G.wave === 0 || G.wave < WAVES) {
      if (G.wave === 0 || (G.queue.length === 0 && (G.fans.length === 0 || G.waveT > WAVE_MAX_SEC))) {
        G.rest -= dt;
        if (G.rest <= 0) { G.rest = 1.4; nextWave(); }
      }
    }
    if (G.wave > 0) {
      G.waveT += dt;
      while (G.queue.length && G.queue[0].t <= G.waveT) spawnFan(G.queue.shift().type);
    }
    if (G.wave >= WAVES && G.bossDown && G.fans.length === 0 && G.queue.length === 0) { finish(true); return; }

    // 팬 움직임
    var fans = G.fans;
    for (var i = 0; i < fans.length; i++) {
      var f = fans[i], T = f.T;
      var dx = G.px - f.x, dy = G.py - f.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d, vx = 0, vy = 0;
      if (T.ranged) {
        if (d > 250) { vx = ux; vy = uy; } else if (d < 180) { vx = -ux; vy = -uy; } else { vx = -uy * 0.6; vy = ux * 0.6; }
        f.shootT -= dt;
        if (f.shootT <= 0 && d < 360) {
          f.shootT = rnd(2.0, 2.8);
          G.proj.push({ x: f.x, y: f.y, vx: ux * 150, vy: uy * 150, dmg: 5, t: 3.2 });
        }
      } else { vx = ux; vy = uy; }
      f.wob += dt * 6;
      var spm = ((f.slow > 0) ? 0.45 : 1) * ((f.angry > 0) ? 1.6 : 1); if (f.slow > 0) f.slow -= dt; if (f.angry > 0) f.angry -= dt;
      f.x += vx * T.sp * spm * dt + f.kx * dt; f.y += vy * T.sp * spm * dt + f.ky * dt;
      f.kx *= Math.max(0, 1 - dt * 6); f.ky *= Math.max(0, 1 - dt * 6);
      f.flash = Math.max(0, f.flash - dt);
      f.x = clamp(f.x, 20, WORLD - 20); f.y = clamp(f.y, 20, WORLD - 20);
      if (T.boss) {
        G.minionT += dt;
        if (G.minionT > 7 && G.fans.length < 34) { G.minionT = 0; for (var q = 0; q < 3; q++) spawnFan('normal', f.x + rnd(-40, 40), f.y + rnd(-40, 40)); }
      }
      if (d < T.r + 13) hurt(T.dmg);
    }
    // 서로 겹치지 않게 살짝 밀어내기
    for (var a = 0; a < fans.length; a++) {
      for (var b = a + 1; b < fans.length; b++) {
        var A = fans[a], B = fans[b], ddx = B.x - A.x, ddy = B.y - A.y, dd = Math.sqrt(ddx * ddx + ddy * ddy), need = (A.T.r + B.T.r) * 0.8;
        if (dd > 0 && dd < need) { var p = (need - dd) / 2 / dd; A.x -= ddx * p; A.y -= ddy * p; B.x += ddx * p; B.y += ddy * p; }
      }
    }
    // 편지
    for (var pi = G.proj.length - 1; pi >= 0; pi--) {
      var P = G.proj[pi]; P.x += P.vx * dt; P.y += P.vy * dt; P.t -= dt;
      if (dist(P.x, P.y, G.px, G.py) < 15) { hurt(P.dmg); G.proj.splice(pi, 1); continue; }
      if (P.t <= 0 || P.x < 0 || P.y < 0 || P.x > WORLD || P.y > WORLD) G.proj.splice(pi, 1);
    }
    // 하트 줍기
    for (var hi = G.pick.length - 1; hi >= 0; hi--) {
      var H = G.pick[hi], hd = dist(H.x, H.y, G.px, G.py); H.t -= dt;
      if (hd < 70) { H.x += (G.px - H.x) / hd * 220 * dt; H.y += (G.py - H.y) / hd * 220 * dt; }
      if (hd < 18) { heal(H.v); sfx('pick'); G.pick.splice(hi, 1); continue; }
      if (H.t <= 0) G.pick.splice(hi, 1);
    }
    // 효과·숫자
    if (G.xf) { var X0 = G.xf; X0.flash = Math.max(0, X0.flash - dt); X0.zoom *= Math.exp(-dt * 7); if (X0.zoom < 0.001) X0.zoom = 0; if (X0.cut) { X0.cut.t -= dt; if (X0.cut.t <= 0) X0.cut = null; }
      for (var ci = X0.conf.length - 1; ci >= 0; ci--) { var q = X0.conf[ci]; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; q.vx += Math.sin(q.rot) * 30 * dt; if (q.y > G.vh + 20) X0.conf.splice(ci, 1); } }
    G.fans.forEach(function (f) { var tg = f.seq.length ? 100 * f.step / f.seq.length : 0; f.vis = (f.vis || 0) + (tg - (f.vis || 0)) * Math.min(1, dt * 8); });   // 게이지가 부드럽게 차오르게
    for (var xi = G.fx.length - 1; xi >= 0; xi--) { G.fx[xi].t -= dt; if (G.fx[xi].t <= 0) G.fx.splice(xi, 1); }
    for (var ni = G.dn.length - 1; ni >= 0; ni--) { var N = G.dn[ni]; N.t -= dt; N.y -= 26 * dt; if (N.t <= 0) G.dn.splice(ni, 1); }
    // 장착을 바꿔서 못 쓰는 스킬이 팬의 남은 순서에 있으면 남은 칸만 새로 뽑음
    G.regenT = (G.regenT || 0) - dt;
    if (G.regenT <= 0) {
      G.regenT = 0.5;
      var pool = usablePool();
      if (pool.length) G.fans.forEach(function (f) {
        for (var q = f.step; q < f.seq.length; q++) if (pool.indexOf(f.seq[q]) < 0) { f.seq = f.seq.slice(0, f.step).concat(makeSeq(f.seq.length - f.step)); break; }
      });
    }
    // 보디가드: 졸졸 따라다님. 철벽은 가까이 온 팬을 몸으로 밀어냄
    G.guards.forEach(function (g, gi) {
      var ang = G.time * 0.8 + gi * Math.PI, gx = G.px + Math.cos(ang) * 46, gy = G.py + Math.sin(ang) * 46;
      g.x += (gx - g.x) * Math.min(1, dt * 6); g.y += (gy - g.y) * Math.min(1, dt * 6);
      if (g.def.id === 'wall') G.fans.forEach(function (f) {
        var dd = dist(f.x, f.y, g.x, g.y);
        if (dd < f.T.r + 34 && dd > 0) { var pu = (f.T.r + 34 - dd) * (f.T.boss ? 3 : 8) * dt; f.x += (f.x - g.x) / dd * pu; f.y += (f.y - g.y) / dd * pu; g.flash = 0.15; }
      });
      g.flash = Math.max(0, (g.flash || 0) - dt);
    });
    // 카메라
    var tx = G.px - G.vw / 2, ty = G.py - G.vh / 2;
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 8);
    G.cam.x = clamp(G.cam.x, Math.min(0, (WORLD - G.vw) / 2), Math.max(0, WORLD - G.vw));
    G.cam.y = clamp(G.cam.y, Math.min(0, (WORLD - G.vh) / 2), Math.max(0, WORLD - G.vh));
  }

  // ════════ 스킬 ════════
  // ════════ 🎆 화려한 연출 (콘서트 스킬처럼: 화면 번쩍 + 흔들림 + 줌 + 슬로모 + 컷인 + 폭죽/꽃가루) ════════
  var CONF_COLS = ['#ff6fb1', '#ffd76a', '#9fd8ff', '#c084fc', '#7ee8a5', '#ff9a5a', '#ffffff'];
  function xfs() { if (!G.xf) G.xf = { flash: 0, flashMax: 0.5, flashRgb: '255,255,255', zoom: 0, slowT: 0, slowS: 1, cut: null, conf: [] }; return G.xf; }
  function burstAt(x, y, n, cols, spd, delay, big) {
    var pts = [], i;
    for (i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (0.35 + Math.random() * 0.75); pts.push({ vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.15, c: cols[i % cols.length], sz: (big ? 4.5 : 3) + Math.random() * 3, star: Math.random() < 0.4 }); }
    var m = big ? 1.1 : 0.8;
    addFx({ k: 'burst', x: x, y: y, pts: pts, t: m + (delay || 0), max: m });
  }
  function confetti(n, cols) { var X = xfs(); for (var i = 0; i < n; i++) X.conf.push({ x: rnd(0, G.vw), y: rnd(-G.vh * 0.6, -10), vx: rnd(-40, 40), vy: rnd(110, 260), rot: rnd(0, 6.28), vr: rnd(-8, 8), col: cols[Math.floor(Math.random() * cols.length)], sz: rnd(6, 12), w: rnd(0.4, 1) }); }
  var SKILL_CINE = {
    highlight: { rgb: '255,225,120', zoom: 0.05, shake: 9,  flash: 0.5, slow: [0.18, 0.4], name: '하이라이트 부르기', cols: ['#ffe27a', '#ffffff', '#ffb04a'], bursts: 1, conf: 0 },
    wink:      { rgb: '255,120,190', zoom: 0.06, shake: 9,  flash: 0.55, slow: [0.2, 0.4], name: '윙크 샤워',       cols: ['#ff6fb1', '#ffd1e8', '#ffffff'], bursts: 2, conf: 25 },
    encore:    { rgb: '190,140,255', zoom: 0.09, shake: 13, flash: 0.75, slow: [0.35, 0.35], name: '앵콜 폭죽',     cols: ['#c084fc', '#ffd76a', '#ff6fb1', '#9fd8ff'], bursts: 4, conf: 70 },
    rose:      { rgb: '255,90,130',  zoom: 0.07, shake: 10, flash: 0.6, slow: [0.3, 0.4],  name: '장미 세례',       cols: ['#ff3d6e', '#ff8aa8', '#ffd1da'], bursts: 3, conf: 60 },
    finale:    { rgb: '255,235,170', zoom: 0.13, shake: 17, flash: 0.9, slow: [0.55, 0.3], name: '피날레 불꽃쇼',   cols: ['#ffd76a', '#ff6fb1', '#9fd8ff', '#7ee8a5', '#c084fc', '#ffffff'], bursts: 8, conf: 110 }
  };
  function cinematic(id, sk, inR) {
    var C = SKILL_CINE[id]; if (!C) return;
    var X = xfs(), i;
    X.flash = C.flash; X.flashMax = C.flash; X.flashRgb = C.rgb;
    X.zoom = C.zoom; X.slowT = C.slow[0]; X.slowS = C.slow[1];
    X.cut = { t: 0.95, max: 0.95, icon: sk.icon, name: C.name, rgb: C.rgb };
    G.shake = Math.max(G.shake, C.shake);
    for (i = 0; i < C.bursts; i++) {
      var a = Math.random() * 6.283, d = i === 0 ? 0 : sk.range * (0.35 + Math.random() * 0.5);
      burstAt(G.px + Math.cos(a) * d, G.py + Math.sin(a) * d, id === 'finale' ? 44 : 30, C.cols, id === 'finale' ? 260 : 200, i * (id === 'finale' ? 0.12 : 0.1), id === 'finale' || id === 'encore');
    }
    inR.forEach(function (f, k) { if (k < 14) burstAt(f.x, f.y - 6, 10, C.cols, 120, 0.05 + k * 0.03, false); });   // 맞은 팬마다 반짝
    if (C.conf) confetti(C.conf, id === 'rose' ? ['#ff3d6e', '#ff8aa8', '#ffd1da', '#ffffff'] : CONF_COLS);
    addFx({ k: 'ring', x: G.px, y: G.py, r: sk.range * 0.7, t: 0.8, max: 0.8, c: 'gold' });
    addDn(G.px, G.py - 56, sk.icon + ' ' + inR.length + '명 두근!', '#fff1b8', true);
  }

  function useSkill(id) {
    if (!G || G.over || G.paused) return false;
    var s = SKILLS.filter(function (x) { return x.id === id; })[0];
    if (!s) return false;
    if (!skillOpen(s)) { toast('🔒 ' + s.name + '은(는) 플레이어 Lv.' + (API() ? API().SKILLS.filter(function (x) { return x.id === id; })[0].useLv : s.unlock) + '부터 쓸 수 있어요'); return false; }
    if (!skillOwned(s)) { toast('🔒 ' + (G.ch.name || '이 멤버') + '은(는) ' + s.name + '을(를) 아직 못 배웠어요' + (whoHas(s.id).length ? ' (배운 멤버: ' + whoHas(s.id).slice(0, 3).join(', ') + ')' : '') + ' · 더보기 > 💖 팬 스킬 상점'); return false; }
    if (G.cd[id] > 0) return false;
    var used = false;
    var near = G.fans.slice().sort(function (a, b) { return dist(a.x, a.y, G.px, G.py) - dist(b.x, b.y, G.px, G.py); });
    function inRange(f, r) { return dist(f.x, f.y, G.px, G.py) - f.T.r < r; }
    function needs(f) { return f.seq[f.step] === id; }
    if (s.kind === 'single') {
      var cand = near.filter(function (f) { return inRange(f, s.range); });
      if (!cand.length) return false;
      var tg1 = cand.filter(needs)[0] || cand[0];
      addFx({ k: 'beam', x: G.px, y: G.py, x2: tg1.x, y2: tg1.y, t: 0.25, max: 0.25, c: id === 'sign' ? '#ffe27a' : '#ff9ad0' });
      addFx({ k: 'pop', id: id, x: tg1.x, y: tg1.y, t: 0.6, max: 0.6 });
      if (needs(tg1)) { knock(tg1, 25, G.px, G.py); advance(tg1); if (id === 'shake') heal(6); } else wrongPress(tg1);
      used = true;
    } else if (s.kind === 'multi') {
      var cm = near.filter(function (f) { return inRange(f, s.range); });
      if (!cm.length) return false;
      var hit3 = cm.filter(needs).slice(0, 3);
      if (!hit3.length) { addFx({ k: 'beam', x: G.px, y: G.py, x2: cm[0].x, y2: cm[0].y, t: 0.3, max: 0.3, c: '#ff6fb1' }); wrongPress(cm[0]); }
      else hit3.forEach(function (f6) { addFx({ k: 'beam', x: G.px, y: G.py, x2: f6.x, y2: f6.y, t: 0.3, max: 0.3, c: '#ff6fb1' }); knock(f6, 25, G.px, G.py); advance(f6); });
      used = true;
    } else if (s.kind === 'line') {
      var tgt = nearestFan(420), dx = G.dir.x, dy = G.dir.y;
      if (!tgt) return false;
      var dd = dist(tgt.x, tgt.y, G.px, G.py) || 1; dx = (tgt.x - G.px) / dd; dy = (tgt.y - G.py) / dd;
      var inLine = G.fans.filter(function (f2) {
        var rx = f2.x - G.px, ry = f2.y - G.py, along = rx * dx + ry * dy, perp = Math.abs(rx * dy - ry * dx);
        return along > 0 && along < s.range + f2.T.r && perp < 26 + f2.T.r;
      });
      addFx({ k: 'flash', x: G.px, y: G.py, x2: G.px + dx * s.range, y2: G.py + dy * s.range, t: 0.3, max: 0.3 });
      var ok2 = inLine.filter(needs);
      if (!ok2.length) wrongPress(inLine[0] || tgt);
      else ok2.slice().forEach(function (f7) { knock(f7, 20, G.px, G.py); advance(f7); });
      used = true;
    } else if (s.kind === 'aoe') {
      var inR = G.fans.filter(function (f3) { return inRange(f3, s.range); });
      if (!inR.length) return false;
      var kb = id === 'finale' ? 70 : (id === 'encore' ? 55 : (id === 'wink' ? 45 : (id === 'rose' ? 35 : 28)));
      inR.slice().forEach(function (f4) { knock(f4, kb, G.px, G.py); if (id === 'rose') f4.slow = 3; advance(f4); });   // 광역: 어떤 순서 칸이든 하나를 채움
      var DUR = { highlight: 0.95, wink: 0.95, encore: 1.15, rose: 1.5, finale: 1.7 }[id] || 0.9;
      addFx({ k: 'skill', id: id, x: G.px, y: G.py, r: s.range, t: DUR, max: DUR });
      addFx({ k: (id === 'encore' || id === 'finale') ? 'bigring' : 'ring', x: G.px, y: G.py, r: s.range, t: 0.7, max: 0.7, c: (id === 'wink' || id === 'rose') ? 'gold' : '' });
      cinematic(id, s, inR);
      if (id === 'encore') { G.shield = 1.5; G.shake = 10; }
      if (id === 'finale') { G.shield = 2.2; G.shake = 14; }
      used = true;
    }
    if (used) { G.cd[id] = s.cd; sfx(s.sfx || (id === 'encore' ? 'reward' : 'pick')); }
    return used;
  }

  function giveCardExp(charId, amt) {
    if (amt <= 0) return;
    if (typeof addCardExp === 'function') { try { addCardExp(charId, amt); return; } catch (e) {} }
    try { var d = JSON.parse(localStorage.getItem('ph_cardExp') || '{}'); d[charId] = (d[charId] || 0) + amt; localStorage.setItem('ph_cardExp', JSON.stringify(d)); } catch (e) {}
  }
  function finish(won) {
    if (G.over) return;
    G.over = true; G.won = !!won;
    var bounty = hasGuard('bounty');
    var coin = Math.round(G.coins * (bounty ? 1.3 : 1)), exp = Math.round(G.exp * (bounty ? 1.2 : 1)), pieces = 0, stones = 0;
    if (won) {
      coin += BOSS_COIN; exp += BOSS_EXP;
      if (Math.random() < Math.min(1, BOSS_PIECE_CHANCE + (bounty ? 0.2 : 0))) { pieces = 1; if (Math.random() < BOSS_PIECE_BONUS) pieces = 2; }
      if (Math.random() < BOSS_STONE_CHANCE) stones = 1;
    } else { coin = Math.floor(coin * DEFEAT_RATE); exp = Math.floor(exp * DEFEAT_RATE); }
    var gotBooks = [];
    try {
      var bk = G.books.slice();
      if (won) { var pl = loadoutIds().filter(Boolean); for (var bi = 0; bi < BOOK_BOSS && pl.length; bi++) bk.push(pl[Math.floor(Math.random() * pl.length)]); }
      var A = API();
      bk.forEach(function (sid) { if (A && A.giveBook && A.giveBook(sid)) gotBooks.push(sid); });
    } catch (e) {}
    if (won) { try { localStorage.setItem('ph_fr_clear', '1'); } catch (e) {} }
    G.result = { books: gotBooks, won: !!won, coin: coin, exp: exp, pieces: pieces, stones: stones, kills: G.kills, wave: G.wave, time: Math.round(G.time) };
    try {
      if (coin > 0 && typeof coins !== 'undefined') coins += coin;
      giveCardExp(G.charId, exp);
      if (pieces > 0 && typeof addToBag === 'function') {
        if (!addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', pieces, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 프리미엄 카드 1장')) { G.result.pieces = 0; G.result.bagFull = true; }
      }
      if (stones > 0) {
        var e = {}; try { e = JSON.parse(localStorage.getItem('ph_enhance') || '{}') || {}; } catch (x) {}
        e.stone = (Math.floor(Number(e.stone) || 0)) + stones; localStorage.setItem('ph_enhance', JSON.stringify(e));
      }
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      if (typeof saveAll === 'function') saveAll();
    } catch (e) {}
    setTimeout(showResult, won ? 900 : 500);
  }

  // ════════ 그리기 ════════
  var faceImgs = {};
  function faceOf(cid) {
    if (faceImgs[cid]) return faceImgs[cid];
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () { im._ok = true; };
    im.src = IMG_BASE + 'face-' + cid + '.png';
    faceImgs[cid] = im; return im;
  }
  function heartPath(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.35); c.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35); c.fill(); }

  var _floor = null;
  function floorImg() {
    if (_floor) return _floor;
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () { im._ok = true; };
    im.src = IMG_BASE + 'fanrush-floor.jpg';
    _floor = im; return im;
  }
  // 팬 얼굴 이미지: rfan-1.png ~ rfan-10.png (없으면 이모지로 대체), 보스는 rfan-boss.png
  var FAN_FACES = 10, fanImgs = {};
  function fanFace(key) {
    if (fanImgs[key]) return fanImgs[key];
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () { im._ok = true; };
    im.src = IMG_BASE + 'rfan-' + key + '.png';
    fanImgs[key] = im; return im;
  }
  // 팬 소품 (그림 파일 없이 코드로 얹음): 마스크 / 안경 / 선글라스 / 응원봉
  function pickAcc(type) {
    if (type === 'boss') return '';
    var r = Math.random();
    return r < 0.38 ? '' : r < 0.55 ? 'mask' : r < 0.70 ? 'glasses' : r < 0.78 ? 'shades' : r < 0.93 ? 'stick' : 'mask+stick';
  }
  function drawAcc(c, f, D, bob) {
    var a = f.acc; if (!a) return;
    var cx = f.x, cy = f.y + bob, ey = cy + D * 0.07, ex = D * 0.17;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    if (a.indexOf('mask') >= 0) {
      var my = cy + D * 0.27;
      c.fillStyle = '#f4f6fb'; c.strokeStyle = '#9aa3b8'; c.lineWidth = Math.max(1, D * 0.015);
      c.beginPath(); c.moveTo(cx - D * 0.24, my - D * 0.09); c.quadraticCurveTo(cx, my - D * 0.15, cx + D * 0.24, my - D * 0.09);
      c.quadraticCurveTo(cx + D * 0.22, my + D * 0.15, cx, my + D * 0.19); c.quadraticCurveTo(cx - D * 0.22, my + D * 0.15, cx - D * 0.24, my - D * 0.09);
      c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(cx - D * 0.17, my - D * 0.02); c.lineTo(cx + D * 0.17, my - D * 0.02); c.moveTo(cx - D * 0.15, my + D * 0.06); c.lineTo(cx + D * 0.15, my + D * 0.06); c.stroke();
    }
    if (a === 'glasses' || a === 'shades') {
      var rr = D * 0.115;
      c.lineWidth = Math.max(1.5, D * 0.03); c.strokeStyle = a === 'shades' ? '#1a1a1a' : '#2b2b3a';
      c.fillStyle = a === 'shades' ? 'rgba(15,15,25,.82)' : 'rgba(190,225,255,.25)';
      [-1, 1].forEach(function (sg) { c.beginPath(); c.arc(cx + sg * ex, ey, rr, 0, 7); c.fill(); c.stroke(); });
      c.beginPath(); c.moveTo(cx - ex + rr, ey - 1); c.lineTo(cx + ex - rr, ey - 1); c.stroke();
    }
    if (a.indexOf('stick') >= 0) {
      var ang = -0.55 + Math.sin((G ? G.time : 0) * 5 + f.wob) * 0.35, L = D * 0.6, bx = cx + D * 0.5, by = cy + D * 0.38;
      var tx = bx + Math.sin(ang) * L, ty = by - Math.cos(ang) * L;
      c.shadowColor = f.lc; c.shadowBlur = 12;
      c.strokeStyle = f.lc; c.lineWidth = Math.max(3, D * 0.09); c.beginPath(); c.moveTo(bx + Math.sin(ang) * L * 0.25, by - Math.cos(ang) * L * 0.25); c.lineTo(tx, ty); c.stroke();
      c.shadowBlur = 0; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.2, D * 0.03); c.beginPath(); c.moveTo(bx + Math.sin(ang) * L * 0.25, by - Math.cos(ang) * L * 0.25); c.lineTo(tx, ty); c.stroke();
      c.strokeStyle = '#444'; c.lineWidth = Math.max(3, D * 0.09); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.sin(ang) * L * 0.25, by - Math.cos(ang) * L * 0.25); c.stroke();
    }
    c.restore();
  }
  function drawFloor(c) {
    var cx = G.cam.x, cy = G.cam.y, vw = G.vw, vh = G.vh;
    c.fillStyle = '#0c0719'; c.fillRect(cx - 40, cy - 40, vw + 80, vh + 80);
    var fl = floorImg();
    if (fl && fl._ok) {
      // 공항 이미지를 월드 전체에 깔기 (높이 기준 꽉 채우고 가운데를 잘라 씀)
      var sc = WORLD / fl.naturalHeight, sw = WORLD / sc;
      c.drawImage(fl, (fl.naturalWidth - sw) / 2, 0, sw, fl.naturalHeight, 0, 0, WORLD, WORLD);
      c.fillStyle = 'rgba(20,10,45,.28)'; c.fillRect(0, 0, WORLD, WORLD);
    } else {
    // 바닥 (무대 느낌의 체크무늬)
    var T = 100, x0 = Math.max(0, Math.floor(cx / T) * T), y0 = Math.max(0, Math.floor(cy / T) * T);
    for (var x = x0; x < Math.min(WORLD, cx + vw + T); x += T) {
      for (var y = y0; y < Math.min(WORLD, cy + vh + T); y += T) {
        c.fillStyle = ((x / T + y / T) % 2 === 0) ? '#241a3d' : '#1d1532';
        c.fillRect(x, y, T, T);
      }
    }
    }
    // 가운데 무대 원
    var mid = WORLD / 2;
    var gr = c.createRadialGradient(mid, mid, 20, mid, mid, 260);
    gr.addColorStop(0, 'rgba(255,140,200,.38)'); gr.addColorStop(1, 'rgba(255,140,200,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(mid, mid, 260, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,215,106,.5)'; c.lineWidth = 3;
    c.beginPath(); c.arc(mid, mid, 110, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(mid, mid, 200, 0, 7); c.stroke();
    // 네 귀퉁이 조명
    [[0.12, 0.12, 'rgba(120,180,255,.25)'], [0.88, 0.12, 'rgba(255,120,200,.25)'], [0.12, 0.88, 'rgba(255,215,106,.22)'], [0.88, 0.88, 'rgba(160,255,200,.2)']].forEach(function (L) {
      var lx = L[0] * WORLD, ly = L[1] * WORLD, g2 = c.createRadialGradient(lx, ly, 10, lx, ly, 240);
      g2.addColorStop(0, L[2]); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.beginPath(); c.arc(lx, ly, 240, 0, 7); c.fill();
    });
    // 바리케이드 테두리
    c.strokeStyle = '#ffd76a'; c.lineWidth = 8; c.setLineDash([26, 14]); c.strokeRect(3, 3, WORLD - 6, WORLD - 6); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.strokeRect(10, 10, WORLD - 20, WORLD - 20);
  }

  function drawFan(c, f) {
    var T = f.T, bob = Math.sin(f.wob) * 2;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(f.x, f.y + T.r * 0.7, T.r * 0.9, T.r * 0.4, 0, 0, 7); c.fill();
    if (f.flash > 0) { c.shadowColor = '#fff'; c.shadowBlur = 18; }
    var fi = fanFace(T.boss ? 'boss' : f.face);
    if (!fi._ok) fi = fanFace(f.face);
    if (!fi._ok) { for (var fk = 1; fk <= FAN_FACES; fk++) { var alt = fanFace(fk); if (alt._ok) { fi = alt; break; } } }   // 아직 안 불러와진 얼굴은 불러와진 다른 얼굴로 대신 (이모지로 안 나오게)
    if (fi && fi._ok) {
      var R = T.r * 1.3, glow = f.angry > 0 ? '#ff4d4d' : (T.boss ? '#ffd76a' : f.type === 'tank' ? '#c084fc' : 'rgba(255,255,255,.9)');
      // 투명 스티커라서 동그랗게 자르지 않고 그대로 그림 (머리카락이 안 잘리게)
      c.shadowColor = glow; c.shadowBlur = (f.angry > 0 || T.boss) ? 14 : 6;
      c.drawImage(fi, f.x - R * 1.1, f.y + bob - R * 1.1, R * 2.2, R * 2.2);
      c.shadowBlur = 0;
      drawAcc(c, f, R * 2.2, bob);
      if (T.ranged) { c.font = '16px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('💌', f.x + R * 0.8, f.y + bob + R * 0.7); }
      if (f.type === 'rusher') { c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('⚡', f.x + R * 0.8, f.y + bob - R * 0.7); }
    } else {
    c.font = Math.round(T.r * 2.1) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(T.emoji, f.x, f.y + bob);
    }
    c.shadowBlur = 0;
    if (T.boss) { c.font = Math.round(T.r * 1.0) + 'px sans-serif'; c.fillText('👑', f.x, f.y - T.r * 1.25 - 8 + bob); }
    // 머리 위: 써야 할 스킬 순서 + 💗 하트 게이지 (순서를 채울수록 차오르고, 가득 차면 만족)
    var n = f.seq.length, iw = 16, tot = n * iw, ix = f.x - tot / 2, iy = f.y - T.r - (T.boss ? 44 : 34);
    for (var i = 0; i < n; i++) {
      var k = skillById(f.seq[i]), cur = i === f.step, done = i < f.step;
      c.globalAlpha = done ? 0.3 : 1;
      c.fillStyle = cur ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(ix + i * iw + iw / 2, iy, cur ? 9 : 7.5, 0, 7); c.fill();
      if (cur) { c.strokeStyle = f.angry > 0 ? '#ff6b6b' : '#ffd76a'; c.lineWidth = 2; c.stroke(); }
      c.font = (cur ? 12 : 10) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
      c.fillText(k ? k.icon : '?', ix + i * iw + iw / 2, iy + 1);
    }
    c.globalAlpha = 1;
    var gp = clamp((f.vis || 0) / 100, 0, 1), gw = Math.max(48, T.r * 2.3, tot), gh = T.boss ? 11 : 8, gx = f.x - gw / 2, gy = f.y - T.r - (T.boss ? 24 : 14);
    c.fillStyle = 'rgba(20,6,36,.85)'; roundRectP(c, gx - 2.5, gy - 2.5, gw + 5, gh + 5, 7); c.fill();
    if (gp > 0) {
      var gg = c.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, f.angry > 0 ? '#ff9a9a' : '#ff8fc4'); gg.addColorStop(1, f.angry > 0 ? '#ff4d4d' : (gp > 0.85 ? '#ffd76a' : '#ff4f9a'));
      c.fillStyle = gg; roundRectP(c, gx, gy, Math.max(gh, gw * gp), gh, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; roundRectP(c, gx + 2, gy + 1.5, Math.max(4, gw * gp - 4), 2.5, 2); c.fill();
    }
    c.lineWidth = 1.5; c.strokeStyle = f.angry > 0 ? 'rgba(255,120,120,.9)' : 'rgba(255,255,255,.6)'; roundRectP(c, gx - 2.5, gy - 2.5, gw + 5, gh + 5, 7); c.stroke();
    c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(gp > 0.5 ? '💖' : '🤍', gx - 9, gy + gh / 2 + 1);
  }

  function roundRectP(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function drawPlayer(c) {
    var x = G.px, y = G.py, R = 20;
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, y + R * 0.85, R, R * 0.4, 0, 0, 7); c.fill();
    if (G.shield > 0) { c.strokeStyle = 'rgba(255,215,106,' + (0.5 + 0.4 * Math.sin(G.time * 18)) + ')'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, R + 9, 0, 7); c.stroke(); }
    if (G.inv > 0 && Math.floor(G.time * 20) % 2 === 0) c.globalAlpha = 0.45;
    var im = faceOf(G.charId), col = G.ch.gradeColor || '#fff';
    c.save(); c.beginPath(); c.arc(x, y, R, 0, 7); c.closePath();
    if (im && im._ok) { c.clip(); c.drawImage(im, x - R, y - R, R * 2, R * 2); c.restore(); }
    else { c.fillStyle = col + '55'; c.fill(); c.restore(); c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(G.ch.emoji || '🎤', x, y + 1); }
    c.strokeStyle = col; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, R + 2.5, 0, 7); c.stroke();
    c.globalAlpha = 1;
  }


  // ════════ ✨ 스킬 이펙트 (스킬마다 다르게) ════════
  function hh(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function starBurst(c, x, y, rad, p, col, n) {          // 폭죽 한 발: p 0→1
    if (p <= 0 || p >= 1) return;
    c.globalAlpha = 1 - p; c.strokeStyle = col; c.lineWidth = 3 * (1 - p) + 1; c.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var a = i / n * 6.2832, r0 = rad * p * 0.55, r1 = rad * (0.25 + p * 0.75);
      c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
    }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 5 * (1 - p) + 1, 0, 7); c.fill();
    c.globalAlpha = 1; c.lineCap = 'butt';
  }
  function drawSkillFx(c, e, p) {
    var x = e.x, y = e.y, R = e.r, id = e.id, i, a, pp;
    c.save();
    if (id === 'highlight') {                              // 🎤 마이크 소리 파동 + 음표
      var g = c.createRadialGradient(x, y, 10, x, y, R); g.addColorStop(0, 'rgba(255,255,255,' + (0.35 * (1 - p)) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill();
      for (i = 0; i < 3; i++) {
        pp = clamp01((p - i * 0.16) / 0.7); if (pp <= 0 || pp >= 1) continue;
        c.globalAlpha = 1 - pp; c.strokeStyle = i % 2 ? '#7fe9ff' : '#ff6fd8'; c.lineWidth = 7 * (1 - pp) + 1.5;
        c.shadowColor = c.strokeStyle; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, R * pp, 0, 7); c.stroke();
      }
      c.shadowBlur = 0; c.globalAlpha = 1 - p; c.textAlign = 'center'; c.textBaseline = 'middle';
      var notes = ['♪', '♫', '♬', '♩'];
      for (i = 0; i < 12; i++) {
        a = i / 12 * 6.2832 + hh(i, 1) * 0.5; var d = R * (0.2 + p * 0.85) * (0.8 + hh(i, 2) * 0.3);
        c.fillStyle = ['#ffe27a', '#7fe9ff', '#ff9ad0', '#fff'][i % 4]; c.font = 'bold ' + (20 + hh(i, 3) * 12) + 'px sans-serif';
        c.fillText(notes[i % 4], x + Math.cos(a) * d, y + Math.sin(a) * d - p * 18);
      }
      c.globalAlpha = Math.min(1, (1 - p) * 1.6); c.font = Math.round(44 + 18 * Math.sin(Math.min(1, p * 3) * 3.14)) + 'px sans-serif';
      c.fillText('🎤', x, y - 34 - p * 26);
    } else if (id === 'wink') {                            // 💖 윙크 + 하트 폭발
      var g2 = c.createRadialGradient(x, y, 10, x, y, R); g2.addColorStop(0, 'rgba(255,120,190,' + (0.32 * (1 - p)) + ')'); g2.addColorStop(1, 'rgba(255,120,190,0)');
      c.fillStyle = g2; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill();
      c.globalAlpha = 1 - p;
      for (i = 0; i < 18; i++) {
        a = i / 18 * 6.2832 + hh(i, 4) * 0.4; var dd = R * p * (0.45 + hh(i, 5) * 0.6);
        c.fillStyle = i % 3 === 0 ? '#ffd1e8' : (i % 3 === 1 ? '#ff6fb1' : '#ff3d8b'); heartPath(c, x + Math.cos(a) * dd, y + Math.sin(a) * dd - p * 14, 7 + hh(i, 6) * 8);
      }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = Math.min(1, (1 - p) * 1.8);
      c.font = Math.round(52 + 22 * Math.sin(Math.min(1, p * 2.5) * 3.14)) + 'px sans-serif'; c.fillText('😉', x, y - 38 - p * 20);
      c.font = '22px sans-serif'; c.fillText('✨', x + 34, y - 62 - p * 18); c.fillText('✨', x - 34, y - 50 - p * 14);
    } else if (id === 'encore') {                          // ✨ 앵콜 폭죽 (여러 발)
      for (i = 0; i < 6; i++) {
        pp = clamp01((p - i * 0.1) / 0.55); var ba = i / 6 * 6.2832 + 0.4, bd = R * (0.35 + hh(i, 7) * 0.45);
        starBurst(c, x + Math.cos(ba) * bd, y + Math.sin(ba) * bd, 70, pp, ['#ffd76a', '#ff6fd8', '#7fe9ff', '#9bff9b', '#fff', '#ffb36b'][i], 12);
      }
      c.globalAlpha = 1 - p; c.fillStyle = '#ffd76a';
      for (i = 0; i < 26; i++) { a = hh(i, 8) * 6.2832; var cd = R * hh(i, 9) * (0.3 + p * 0.7); c.fillRect(x + Math.cos(a) * cd - 2, y + Math.sin(a) * cd + p * 30 * hh(i, 10) - 2, 4, 6); }
    } else if (id === 'rose') {                            // 🌹 장미꽃잎 비
      var g3 = c.createRadialGradient(x, y, 10, x, y, R); g3.addColorStop(0, 'rgba(255,70,120,' + (0.22 * (1 - p)) + ')'); g3.addColorStop(1, 'rgba(255,70,120,0)');
      c.fillStyle = g3; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill();
      c.globalAlpha = Math.min(1, (1 - p) * 1.5);
      for (i = 0; i < 34; i++) {
        var px = x + (hh(i, 11) - 0.5) * 2 * R * 0.95, py = y - R * 0.9 + (p * (0.7 + hh(i, 12) * 0.6) + hh(i, 13) * 0.15) * R * 1.7, sw = Math.sin(p * 9 + i) * 14;
        c.save(); c.translate(px + sw, py); c.rotate(p * 6 + i); c.fillStyle = i % 3 === 0 ? '#ff2f6d' : (i % 3 === 1 ? '#ff7aa6' : '#c81e4d');
        c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, 7); c.fill(); c.restore();
      }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '30px sans-serif';
      for (i = 0; i < 7; i++) c.fillText('🌹', x + (hh(i, 14) - 0.5) * R * 1.5, y - R * 0.7 + p * R * (1.1 + hh(i, 15) * 0.5));
    } else if (id === 'finale') {                          // 🎆 불꽃쇼
      if (p < 0.18) { c.globalAlpha = 0.55 * (1 - p / 0.18); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, R * 1.3, 0, 7); c.fill(); }
      var cols = ['#ffd76a', '#ff6fd8', '#7fe9ff', '#9bff9b', '#ff9a5a', '#c084fc', '#fff'];
      for (i = 0; i < 11; i++) {
        pp = clamp01((p - i * 0.065) / 0.45); a = hh(i, 16) * 6.2832; var fd = R * Math.sqrt(hh(i, 17)) * 0.95;
        starBurst(c, x + Math.cos(a) * fd, y + Math.sin(a) * fd, 85 + hh(i, 18) * 40, pp, cols[i % cols.length], 16);
      }
      c.globalAlpha = 1 - p; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '46px sans-serif'; c.fillText('🎆', x, y - 40 - p * 30);
    }
    c.restore();
  }
  function drawPop(c, e, p) {                              // 기본 스킬: 맞은 팬 위에 작은 효과
    var x = e.x, y = e.y, id = e.id, i;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    if (id === 'photo') {
      c.globalAlpha = (1 - p) * 0.9; var g = c.createRadialGradient(x, y, 2, x, y, 56 * (0.4 + p)); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 56 * (0.4 + p), 0, 7); c.fill();
      c.globalAlpha = 1 - p; c.font = '26px sans-serif'; c.fillText('📸', x, y - 30 - p * 14);
    } else if (id === 'sign') {
      c.globalAlpha = 1 - p; c.font = '24px sans-serif'; c.fillText('✍️', x, y - 28 - p * 10);
      c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 22, y + 20); c.bezierCurveTo(x - 8, y + 4, x + 8, y + 34, x + 22, y + 16); c.stroke();
      c.font = '16px sans-serif'; c.fillText('✨', x + 24, y - 10 - p * 12);
    } else if (id === 'shake') {
      starBurst(c, x, y, 44, p, '#ffe27a', 8); c.globalAlpha = 1 - p; c.font = '24px sans-serif'; c.fillText('🤝', x, y - 30 - p * 12);
    } else if (id === 'heart') {
      c.globalAlpha = 1 - p;
      for (i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#ff6fb1' : '#ff3d8b'; heartPath(c, x + (i - 2) * 13, y - 12 - p * (26 + i * 7), 8 - Math.abs(i - 2)); }
    }
    c.restore();
  }
  function starPath(c, x, y, r) { c.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
  function drawBurst(c, e, p) {
    var tt = p * e.max, i, q, x, y;
    c.globalCompositeOperation = 'lighter';
    for (i = 0; i < e.pts.length; i++) {
      q = e.pts[i]; x = e.x + q.vx * tt; y = e.y + q.vy * tt + 120 * tt * tt;
      c.globalAlpha = Math.max(0, 1 - p * p); c.fillStyle = q.c; c.shadowColor = q.c; c.shadowBlur = 8;
      if (q.star) starPath(c, x, y, q.sz * (1.6 - p * 0.8)); else { c.beginPath(); c.arc(x, y, q.sz * (1 - p * 0.5), 0, 7); }
      c.fill();
    }
    c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  function drawFx(c) {
    G.fx.forEach(function (e) {
      if (e.t > e.max) return;   // 아직 시작 전(딜레이)
      var p = 1 - e.t / e.max;
      if (e.k === 'burst') { drawBurst(c, e, p); return; }
      if (e.k === 'beam') { c.strokeStyle = e.c; c.globalAlpha = 1 - p; c.lineWidth = 6 * (1 - p) + 2; c.shadowColor = e.c; c.shadowBlur = 14; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x2, e.y2); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1; }
      else if (e.k === 'flash') { c.strokeStyle = '#fff'; c.globalAlpha = (1 - p) * 0.85; c.lineWidth = 46 * (1 - p) + 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x2, e.y2); c.stroke(); c.lineCap = 'butt'; c.globalAlpha = 1; }
      else if (e.k === 'ring' || e.k === 'bigring') {
        var big = e.k === 'bigring', col = (big || e.c === 'gold') ? '255,215,106' : '255,120,190';
        c.globalAlpha = 1 - p; c.strokeStyle = 'rgba(' + col + ',1)'; c.lineWidth = big ? 10 : 6;
        c.beginPath(); c.arc(e.x, e.y, e.r * (0.2 + 0.8 * p), 0, 7); c.stroke();
        if (big) { c.beginPath(); c.arc(e.x, e.y, e.r * (0.1 + 0.6 * p), 0, 7); c.stroke(); }
        c.fillStyle = 'rgba(' + col + ',' + (0.18 * (1 - p)) + ')'; c.beginPath(); c.arc(e.x, e.y, e.r * (0.2 + 0.8 * p), 0, 7); c.fill();
        c.fillStyle = 'rgba(' + col + ',1)'; c.globalAlpha = 1 - p;
        for (var i = 0; i < (big ? 8 : 6); i++) { var a = i / (big ? 8 : 6) * 6.283 + p * 2; heartPath(c, e.x + Math.cos(a) * e.r * p, e.y + Math.sin(a) * e.r * p, 9); }
        c.globalAlpha = 1;
      } else if (e.k === 'skill') { drawSkillFx(c, e, p);
      } else if (e.k === 'pop') { drawPop(c, e, p);
      } else if (e.k === 'hearts') {
        c.globalAlpha = 1 - p; c.fillStyle = '#ff6fb1';
        for (var j = 0; j < 4; j++) heartPath(c, e.x + (j - 1.5) * 10, e.y - 8 - p * (26 + j * 6), 7 - j);
        c.globalAlpha = 1;
      }
    });
  }

  function drawGuard(c, g) {
    var R = 15, x = g.x, y = g.y, im = guardImg(g.def);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + R * 0.85, R, R * 0.38, 0, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, R, 0, 7); c.closePath();
    if (im && im._ok) { c.clip(); c.drawImage(im, x - R * 1.15, y - R * 1.15, R * 2.3, R * 2.3 * (im.naturalHeight / im.naturalWidth || 1)); c.restore(); }
    else { c.fillStyle = '#222'; c.fill(); c.restore(); c.font = '18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🕶️', x, y + 1); }
    c.strokeStyle = g.flash > 0 ? '#ffd76a' : '#9aa0b5'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
  }
  function drawScreenFx(c) {
    var X = G.xf, i;
    if (X.flash > 0) {   // 화면 번쩍 (가운데가 더 밝게)
      var fa = X.flash / X.flashMax, g = c.createRadialGradient(G.vw / 2, G.vh / 2, 20, G.vw / 2, G.vh / 2, Math.max(G.vw, G.vh) * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.55 * fa) + ')'); g.addColorStop(0.5, 'rgba(' + X.flashRgb + ',' + (0.4 * fa) + ')'); g.addColorStop(1, 'rgba(' + X.flashRgb + ',' + (0.2 * fa) + ')');
      c.fillStyle = g; c.fillRect(0, 0, G.vw, G.vh);
    }
    for (i = 0; i < X.conf.length; i++) { var q = X.conf[i]; c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(1, q.w); c.fillStyle = q.col; c.fillRect(-q.sz / 2, -q.sz / 4, q.sz, q.sz / 2); c.restore(); }
    if (X.cut) {         // 스킬 컷인: 띠가 휙 들어왔다가 나감
      var k = X.cut, u = 1 - k.t / k.max, off = u < 0.16 ? -(1 - u / 0.16) * G.vw : (u > 0.8 ? ((u - 0.8) / 0.2) * G.vw : 0);
      var by = G.vh * 0.3, bh = 78, al = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      c.save(); c.translate(off, 0); c.globalAlpha = al;
      c.beginPath(); c.moveTo(-30, by); c.lineTo(G.vw + 30, by); c.lineTo(G.vw, by + bh); c.lineTo(-60, by + bh); c.closePath();
      var gg = c.createLinearGradient(0, 0, G.vw, 0); gg.addColorStop(0, 'rgba(10,5,25,.9)'); gg.addColorStop(0.5, 'rgba(' + k.rgb + ',.55)'); gg.addColorStop(1, 'rgba(10,5,25,.9)');
      c.fillStyle = gg; c.fill(); c.strokeStyle = 'rgba(' + k.rgb + ',1)'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
      for (i = 0; i < 4; i++) { var lx = ((u * 900 + i * 170) % (G.vw + 200)) - 100; c.beginPath(); c.moveTo(lx, by + 8 + i * 17); c.lineTo(lx + 60, by + 8 + i * 17); c.stroke(); }
      c.font = '44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(' + k.rgb + ',1)'; c.shadowBlur = 16; c.fillText(k.icon, G.vw * 0.17, by + bh / 2 + 2); c.shadowBlur = 0;
      c.font = '900 27px sans-serif'; c.textAlign = 'left'; c.lineWidth = 6; c.strokeStyle = 'rgba(20,8,40,.95)'; c.strokeText(k.name + '!', G.vw * 0.27, by + bh / 2 + 2); c.fillStyle = '#fff'; c.fillText(k.name + '!', G.vw * 0.27, by + bh / 2 + 2);
      c.restore();
    }
  }
  function render(c) {
    var sx = G.shake > 0 ? rnd(-G.shake, G.shake) * 0.5 : 0, sy = G.shake > 0 ? rnd(-G.shake, G.shake) * 0.5 : 0;
    c.save();
    c.fillStyle = '#0c0719'; c.fillRect(0, 0, G.vw, G.vh);
    if (G.xf && G.xf.zoom > 0) { var zz = 1 + G.xf.zoom; c.translate(G.vw / 2, G.vh / 2); c.scale(zz, zz); c.translate(-G.vw / 2, -G.vh / 2); }
    c.translate(-Math.round(G.cam.x) + sx, -Math.round(G.cam.y) + sy);
    drawFloor(c);
    // 하트 아이템
    G.pick.forEach(function (h) { c.fillStyle = '#ff6fb1'; c.shadowColor = '#ff6fb1'; c.shadowBlur = 10; heartPath(c, h.x, h.y + Math.sin(G.time * 5) * 2, 11); c.shadowBlur = 0; });
    // 편지
    G.proj.forEach(function (p) { c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('💌', p.x, p.y); });
    // 팬 + 플레이어 (아래쪽에 있는 게 앞에 보이게)
    var order = G.fans.slice().sort(function (a, b) { return a.y - b.y; }), drawnP = false;
    order.forEach(function (f) { if (!drawnP && f.y > G.py) { drawPlayer(c); drawnP = true; } drawFan(c, f); });
    if (!drawnP) drawPlayer(c);
    G.guards.forEach(function (g) { drawGuard(c, g); });
    drawFx(c);
    // 숫자
    G.dn.forEach(function (n) {
      c.globalAlpha = Math.min(1, n.t * 2); c.font = '900 ' + (n.big ? 20 : 14) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(n.text, n.x, n.y); c.fillStyle = n.color; c.fillText(n.text, n.x, n.y); c.globalAlpha = 1;
    });
    c.restore();
    if (G.xf) drawScreenFx(c);
    // 화면 좌표 요소: 맞았을 때 붉은 테두리 / 조이스틱 / 배너 / 보스 방향 표시
    if (G.flashRed > 0) { var gr = c.createRadialGradient(G.vw / 2, G.vh / 2, Math.min(G.vw, G.vh) * 0.35, G.vw / 2, G.vh / 2, Math.max(G.vw, G.vh) * 0.7); gr.addColorStop(0, 'rgba(255,0,60,0)'); gr.addColorStop(1, 'rgba(255,0,60,' + (G.flashRed * 2.2) + ')'); c.fillStyle = gr; c.fillRect(0, 0, G.vw, G.vh); }
    if (G.hp / G.maxhp < 0.3 && !G.over) { c.fillStyle = 'rgba(255,0,60,' + (0.06 + 0.06 * Math.sin(G.time * 8)) + ')'; c.fillRect(0, 0, G.vw, G.vh); }
    if (stick) {
      c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(stick.ox, stick.oy, 46, 0, 7); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(stick.ox + clamp(stick.cx - stick.ox, -46, 46), stick.oy + clamp(stick.cy - stick.oy, -46, 46), 20, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    if (G.banner.t > 0) {
      c.globalAlpha = Math.min(1, G.banner.t * 1.5); c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(G.banner.text, G.vw / 2, G.vh * 0.28); c.fillStyle = '#ffe27a'; c.fillText(G.banner.text, G.vw / 2, G.vh * 0.28); c.globalAlpha = 1;
    }
    // 화면 밖 보스 화살표
    var boss = G.fans.filter(function (f) { return f.T.boss; })[0];
    if (boss) {
      var bx = boss.x - G.cam.x, by = boss.y - G.cam.y;
      if (bx < 0 || by < 0 || bx > G.vw || by > G.vh) {
        var ax = clamp(bx, 26, G.vw - 26), ay = clamp(by, 26, G.vh - 26);
        c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👑', ax, ay);
      }
    }
  }

  // ════════ 화면 / 입력 ════════
  var stick = null, keys = {}, raf = 0, lastT = 0, curChar = null;
  var POTS = [{ name: '작은 회복약', emoji: '🧪', heal: 40 }, { name: '큰 회복약', emoji: '💊', heal: 9999 }];
  function potQty(name) { try { var it = bagItems.find(function (i) { return i.name === name; }); return it ? it.qty : 0; } catch (e) { return 0; } }
  function usePot(p) {
    if (!G || G.over) return;
    if (G.hp >= G.maxhp) { toast('HP가 이미 가득 차 있어요!'); return; }
    if (potQty(p.name) <= 0) { toast(p.emoji + ' ' + p.name + '이(가) 없어요! 더보기 > 💖 팬 스킬 상점에서 살 수 있어요'); return; }
    try { useFromBag(p.name, 1); if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    heal(p.heal); sfx('pick');
  }

  function styleOnce() {
    if ($('fr-css')) return;
    var s = document.createElement('style'); s.id = 'fr-css';
    s.textContent = '.fr-sk{position:relative;width:56px;height:56px;border-radius:50%;border:2.5px solid #ffd76a;background:rgba(30,18,60,.82);color:#fff;font-size:24px;cursor:pointer;overflow:hidden;padding:0;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}' +
      '.fr-sk.lock{border-color:#666;filter:grayscale(1);opacity:.65}.fr-sk .cd{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);height:0}' +
      '.fr-sk .nm{position:absolute;left:0;right:0;bottom:2px;font-size:9px;font-weight:900;line-height:1;text-shadow:0 1px 3px #000}.fr-sk .tm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;text-shadow:0 1px 4px #000}' +
      '.fr-sk:active{transform:scale(.93)}.fr-pot{height:36px;padding:0 10px;border-radius:18px;border:1.5px solid #6ee7a0;background:rgba(10,40,30,.78);color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit}';
    document.head.appendChild(s);
  }

  function buildUi(overlay, charId) {
    var ch = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId] : { name: '아이돌' };
    overlay.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px;background:rgba(0,0,0,.7);position:relative;z-index:50;">' +
        '<div style="color:#fff;font-size:15px;font-weight:900;white-space:nowrap;">✈️ 공항 입국장</div>' +
        '<div id="fr-wave" style="color:#FFE27A;font-size:12px;font-weight:900;flex:1;text-align:center;"></div>' +
        '<button id="fr-exit" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;white-space:nowrap;font-family:inherit;">나가기</button></div>' +
      '<div id="fr-view" style="position:relative;flex:1;min-height:0;overflow:hidden;background:#0c0719;">' +
        '<canvas id="fr-cv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;"></canvas>' +
        '<div style="position:absolute;left:8px;top:8px;right:8px;display:flex;align-items:center;gap:8px;pointer-events:none;">' +
          '<div style="flex:1;max-width:190px;"><div style="font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000;margin-bottom:2px;">❤️ <span id="fr-hptxt"></span> · ' + ch.name + '</div>' +
            '<div style="height:12px;border-radius:7px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.4);overflow:hidden;"><div id="fr-hp" style="height:100%;width:100%;background:linear-gradient(90deg,#ff5c8a,#ffb86b);transition:width .15s"></div></div></div>' +
          '<div style="margin-left:auto;text-align:right;font-size:12px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000;line-height:1.5;">🍔 <span id="fr-coin">0</span><br>😊 <span id="fr-kill">0</span>명 응대</div></div>' +
        '<div id="fr-pots" style="position:absolute;left:8px;top:54px;display:flex;flex-direction:column;gap:6px;"></div>' +
        '<div id="fr-skills" style="position:absolute;right:8px;bottom:10px;display:flex;flex-wrap:wrap-reverse;flex-direction:row-reverse;gap:8px;width:190px;justify-content:flex-start;"></div>' +
        '<div style="position:absolute;left:10px;bottom:8px;font-size:10px;color:rgba(255,255,255,.6);pointer-events:none;">화면을 누른 채 끌면 이동</div>' +
      '</div>';
    var sk = $('fr-skills');
    for (var si = 0; si < 5; si++) (function (si) {
      var b = document.createElement('button'); b.className = 'fr-sk'; b.id = 'fr-slot-' + si;
      b.innerHTML = '<span class="ic"></span><span class="nm"></span><div class="cd"></div><span class="tm"></span>';
      b.onclick = function (e) { e.stopPropagation(); var id = loadoutIds()[si]; if (id) useSkill(id); else if (API()) API().openEditor(); else toast('스킬 장착은 더보기 > 💖 팬 스킬 상점에서 해요'); };
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      sk.appendChild(b);
    })(si);
    var pw = $('fr-pots');
    POTS.forEach(function (p, i) {
      var b = document.createElement('button'); b.className = 'fr-pot'; b.id = 'fr-pot' + i;
      b.onclick = function (e) { e.stopPropagation(); usePot(p); };
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      pw.appendChild(b);
    });
  }

  function updateHud() {
    var hp = $('fr-hp'); if (!hp) return;
    hp.style.width = (G.hp / G.maxhp * 100) + '%';
    $('fr-hptxt').textContent = Math.ceil(G.hp) + '/' + G.maxhp;
    $('fr-coin').textContent = fmt(G.coins); $('fr-kill').textContent = G.kills;
    $('fr-wave').textContent = G.wave === 0 ? '준비!' : (G.wave >= WAVES ? '👑 보스전' : 'WAVE ' + G.wave + '/' + WAVES);
    var LD = loadoutIds();
    for (var si = 0; si < 5; si++) {
      var b = $('fr-slot-' + si); if (!b) continue;
      var s = LD[si] ? skillById(LD[si]) : null;
      if (!s) { b.classList.add('lock'); b.querySelector('.ic').textContent = '➕'; b.querySelector('.nm').textContent = '장착'; b.querySelector('.cd').style.height = '0'; b.querySelector('.tm').textContent = ''; continue; }
      var open = skillOpen(s), own = skillOwned(s), cd = G.cd[s.id];
      b.classList.toggle('lock', !open || !own);
      b.querySelector('.ic').textContent = (open && own) ? s.icon : '🔒';
      b.querySelector('.nm').textContent = s.name.replace('윙크 샤워', '윙크샤워').replace('하이라이트', '하이라이트').slice(0, 6);
      b.querySelector('.cd').style.height = (open && own && cd > 0 ? (cd / s.cd * 100) : 0) + '%';
      b.querySelector('.tm').textContent = !open ? 'Lv.' + (API() ? API().SKILLS.filter(function (x) { return x.id === s.id; })[0].useLv : s.unlock) : (!own ? '' : (cd > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : ''));
    }
    POTS.forEach(function (p, i) { var b = $('fr-pot' + i); if (b) { b.textContent = p.emoji + ' ×' + potQty(p.name); b.style.opacity = potQty(p.name) > 0 ? '1' : '.5'; } });
  }

  function resize() {
    var v = $('fr-view'), cv = $('fr-cv'); if (!v || !cv || !G) return;
    var r = v.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    G.vw = r.width; G.vh = r.height;
  }

  function bindInput(cv) {
    cv.addEventListener('pointerdown', function (e) {
      if (!G || G.over) return;
      var r = cv.getBoundingClientRect(); var x = e.clientX - r.left, y = e.clientY - r.top;
      stick = { id: e.pointerId, ox: x, oy: y, cx: x, cy: y };
      try { cv.setPointerCapture(e.pointerId); } catch (x2) {}
    });
    cv.addEventListener('pointermove', function (e) {
      if (!stick || e.pointerId !== stick.id) return;
      var r = cv.getBoundingClientRect(); stick.cx = e.clientX - r.left; stick.cy = e.clientY - r.top;
      var dx = stick.cx - stick.ox, dy = stick.cy - stick.oy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 46) { stick.ox += dx / d * (d - 46); stick.oy += dy / d * (d - 46); dx = stick.cx - stick.ox; dy = stick.cy - stick.oy; }
      G.input = { x: dx / 46, y: dy / 46 };
    });
    var up = function (e) { if (stick && e.pointerId === stick.id) { stick = null; if (G) G.input = { x: 0, y: 0 }; } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  function onKey(e) {
    if (!G || !$('fr-cv')) return;
    var down = e.type === 'keydown', k = e.key.toLowerCase();
    keys[k] = down;
    var x = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0), y = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (!stick) G.input = { x: x, y: y };
    if (down && k >= '1' && k <= '5') { var kid = loadoutIds()[Number(k) - 1]; if (kid) useSkill(kid); }
  }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  document.addEventListener('visibilitychange', function () { if (G && !G.over) G.paused = document.hidden; });

  function loop(ts) {
    var cv = $('fr-cv');
    if (!cv || !G) { raf = 0; return; }
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016); lastT = ts;
    if (G && !G.over) G.paused = document.hidden || !!$('fs-editor');
    var dtU = dt; if (G && G.xf && G.xf.slowT > 0) { G.xf.slowT -= dt; dtU = dt * G.xf.slowS; }
    update(dtU);
    render(cv.getContext('2d'));
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  function showResult() {
    var ov = $('special-overlay'); if (!ov || !G || !G.result) return;
    var r = G.result, old = $('fr-result'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'fr-result';
    el.style.cssText = 'position:absolute;inset:0;z-index:80;background:rgba(8,4,18,.86);display:flex;align-items:center;justify-content:center;padding:16px;font-family:\'Noto Sans KR\',sans-serif;';
    var lines = '<div>🍔 코인 <b style="color:#ffd76a;">+' + fmt(r.coin) + '</b></div><div>⭐ 카드 경험치 <b style="color:#9fd8ff;">+' + fmt(r.exp) + '</b></div>';
    if (r.pieces) lines += '<div>' + PIECE_EMOJI + ' 프리미엄 조각 <b style="color:#ffe27a;">+' + r.pieces + '</b></div>';
    if (r.stones) lines += '<div>🔨 강화석 <b style="color:#ffe27a;">+' + r.stones + '</b></div>';
    if (r.books && r.books.length) { var bl = {}; r.books.forEach(function (x) { bl[x] = (bl[x] || 0) + 1; }); lines += '<div>📘 스킬북 <b style="color:#9fd8ff;">' + Object.keys(bl).map(function (x) { var k = skillById(x); return (k ? k.icon + k.name : x) + ' ×' + bl[x]; }).join(', ') + '</b></div>'; }
    if (r.bagFull) lines += '<div style="color:#ff9a9a;font-size:12px;">가방이 가득 차서 조각을 못 받았어요</div>';
    el.innerHTML = '<div style="width:100%;max-width:330px;text-align:center;background:linear-gradient(160deg,#2a1a4a,#150b2a);border:2px solid ' + (r.won ? '#ffd76a' : '#ff8aa8') + ';border-radius:20px;padding:22px 18px;color:#fff;">' +
      '<div style="font-size:42px;">' + (r.won ? '🎉' : '😵') + '</div>' +
      '<div style="font-size:19px;font-weight:900;color:' + (r.won ? '#ffd76a' : '#ff8aa8') + ';margin:4px 0;">' + (r.won ? '입국장 돌파 성공!' : '팬들한테 치였어요…') + '</div>' +
      '<div style="font-size:12px;color:#bbb;margin-bottom:12px;">' + r.kills + '명 응대 · WAVE ' + Math.min(r.wave, WAVES) + '/' + WAVES + ' · ' + Math.floor(r.time / 60) + '분 ' + (r.time % 60) + '초' + (r.won ? '' : '<br>번 보상의 ' + Math.round(DEFEAT_RATE * 100) + '%만 받아요') + '</div>' +
      '<div style="font-size:14px;line-height:1.9;margin-bottom:14px;">' + lines + '</div>' +
      '<button id="fr-again" style="width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:12px;background:linear-gradient(135deg,#FB7185,#C084FC);color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;">다시 도전 (⚡' + ENTRY_STAMINA + ')</button>' +
      '<button id="fr-out" style="width:100%;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:14px;cursor:pointer;font-family:inherit;">나가기</button></div>';
    ov.appendChild(el);
    $('fr-out').onclick = function () { ov.remove(); G = null; };
    $('fr-again').onclick = function () { enter(curChar, true); };
  }

  // ════════ 입장 ════════
  function enter(charId, again) {
    if (plv() < NEED_LEVEL) { toast('✈️ 공항 입국장은 플레이어 Lv.' + NEED_LEVEL + '부터 열려요 (지금 Lv.' + plv() + ')'); return false; }
    var ov = $('special-overlay'); if (!ov) return false;
    if (typeof stamina === 'undefined' || stamina < ENTRY_STAMINA) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (입장 ' + ENTRY_STAMINA + ')'); return false; }
    var A = API();
    var go = function () { openHire(charId, ov); };
    if (A && A.tut && !again) A.tut('ph_tut_airport', '✈️', '공항 입국장 · 고렙 러쉬!', [
      '팬들이 <b>몰려와요!</b> 닿으면 HP가 깎여요. 화면을 누른 채 끌어서 도망치면서 응대해요.',
      '팬 머리 위에 <b>스킬 아이콘</b>이 떠요. 그 스킬 버튼을 눌러 하트 게이지를 채우면 만족해서 돌아가요.',
      '일반 팬은 <b>2개</b>, 덕후는 <b>3개</b>, 👑 보스는 <b>5개</b>! 순서가 틀리면 팬이 <b>화나서</b> 더 빨라지고 처음부터예요.',
      '몰려올 땐 <b>광역 스킬</b>! 범위 안 팬 전부의 칸을 한꺼번에 채워요.',
      '🕶️ 출동 전에 <b>보디가드</b>를 고용할 수 있어요 (최대 2명, 한 판 동안).',
      '8웨이브 + 보스를 모두 응대하면 성공! 코인·경험치·프리미엄 조각·📘 스킬북을 받아요.'
    ], go); else go();
    return true;
  }

  // ── 보디가드 고용 화면 ──
  function openHire(charId, ov) {
    styleOnce();
    var old = $('fr-hire'); if (old) old.remove();
    var sel = [];
    var el = document.createElement('div'); el.id = 'fr-hire';
    el.style.cssText = 'position:absolute;inset:0;z-index:95;background:rgba(8,4,18,.93);display:flex;align-items:center;justify-content:center;padding:14px;font-family:\'Noto Sans KR\',sans-serif;overflow:auto;';
    ov.appendChild(el);
    function total() { return sel.reduce(function (t, id) { return t + bgById(id).cost; }, 0); }
    function draw() {
      var rows = BODYGUARDS.map(function (b) {
        var on = sel.indexOf(b.id) >= 0;
        return '<div data-bg="' + b.id + '" style="display:flex;align-items:center;gap:10px;padding:9px;margin-bottom:8px;border-radius:14px;cursor:pointer;background:' + (on ? 'rgba(251,113,133,.22)' : 'rgba(255,255,255,.07)') + ';border:2px solid ' + (on ? '#FB7185' : 'rgba(255,255,255,.14)') + ';">' +
          '<img src="' + IMG_BASE + b.img + '" style="width:62px;height:62px;object-fit:contain;flex:none;">' +
          '<div style="flex:1;text-align:left;"><div style="font-size:14px;font-weight:900;color:#fff;">' + b.name + ' <span style="font-size:11px;color:#ffd1da;">' + b.role + '</span></div>' +
          '<div style="font-size:11px;color:#ccc;line-height:1.4;margin-top:2px;">' + b.desc + '</div></div>' +
          '<div style="font-size:12px;font-weight:900;color:' + (on ? '#ffd76a' : '#ddd') + ';white-space:nowrap;">' + (on ? '✔ 고용' : '🍔 ' + fmt(b.cost)) + '</div></div>';
      }).join('');
      var t = total(), have = (typeof coins !== 'undefined') ? coins : 0, lack = t > have;
      el.innerHTML = '<div style="width:100%;max-width:340px;text-align:center;">' +
        '<div style="font-size:20px;font-weight:900;color:#fff;">🕶️ 보디가드 고용</div>' +
        '<div style="font-size:12px;color:#ccc;margin:4px 0 12px;">공항 입국장은 고렙 지역이라 팬들이 거세요!<br>최대 ' + BG_MAX + '명까지 고용할 수 있어요 (한 판 동안)</div>' + lackHtml(charId) + rows +
        '<button id="fr-hire-go" style="width:100%;padding:13px;margin-top:4px;border:none;border-radius:12px;background:' + (lack ? '#555' : 'linear-gradient(135deg,#FB7185,#C084FC)') + ';color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;">' +
        (lack ? '코인이 모자라요 (🍔 ' + fmt(t) + ')' : (t ? '고용하고 출동! (🍔 ' + fmt(t) + ')' : '혼자 출동!')) + '</button>' +
        '<button id="fr-hire-no" style="width:100%;padding:10px;margin-top:8px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;cursor:pointer;font-family:inherit;">취소</button></div>';
      Array.prototype.forEach.call(el.querySelectorAll('[data-bg]'), function (d) {
        d.onclick = function () {
          var id = d.getAttribute('data-bg'), i = sel.indexOf(id);
          if (i >= 0) sel.splice(i, 1);
          else if (sel.length >= BG_MAX) toast('보디가드는 최대 ' + BG_MAX + '명까지예요');
          else sel.push(id);
          draw();
        };
      });
      $('fr-hire-no').onclick = function () { el.remove(); if (!G) ov.remove(); };
      $('fr-hire-go').onclick = function () {
        var t2 = total();
        if (typeof stamina === 'undefined' || stamina < ENTRY_STAMINA) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (입장 ' + ENTRY_STAMINA + ')'); return; }
        if (t2 > ((typeof coins !== 'undefined') ? coins : 0)) { toast('코인이 모자라요!'); return; }
        if (t2 > 0) { coins -= t2; try { if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {} }
        el.remove();
        startRun(charId, sel.slice(), ov);
      };
    }
    draw();
  }

  function startRun(charId, hiredIds, ov) {
    stamina -= ENTRY_STAMINA;
    try { if (typeof saveStamina === 'function') saveStamina(); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    curChar = charId; styleOnce();
    for (var pf = 1; pf <= FAN_FACES; pf++) fanFace(pf); fanFace('boss');   // 얼굴 그림 미리 불러오기
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    stick = null; keys = {};
    buildUi(ov, charId);
    var cv = $('fr-cv');
    G = newGame(charId, 390, 600);
    G.guards = hiredIds.map(function (id, i) { var d = bgById(id); return { def: d, x: G.px + (i ? -46 : 46), y: G.py, t: 0, flash: 0 }; });
    if (G.guards.length) G.banner = { text: '🕶️ 보디가드 ' + G.guards.map(function (g) { return g.def.name; }).join('·') + ' 출동!', t: 2.2 };
    resize(); bindInput(cv);
    $('fr-exit').onclick = function () {
      if (G && !G.over) {
        if (!window.confirm('지금 나가면 지금까지 번 보상의 ' + Math.round(DEFEAT_RATE * 100) + '%만 받아요. 나갈까요?')) return;
        G.paused = true; finish(false); G.paused = false;
      } else { ov.remove(); G = null; }
    };
    window.addEventListener('resize', resize);
    lastT = performance.now(); raf = requestAnimationFrame(loop);
  }

  // ════════ 팬덤 원정 칸에 끼워 넣기 ════════
  function install() {
    if (typeof window.startSpecialExplore !== 'function' || typeof SPECIAL_LOCATIONS === 'undefined' || typeof window.openSpecialCardSelect !== 'function') { setTimeout(install, 60); return; }
    if (window.__frInstalled) return;
    window.__frInstalled = true;
    if (!SPECIAL_LOCATIONS.some(function (l) { return l.id === LOC_ID; })) SPECIAL_LOCATIONS.push({ id: LOC_ID, name: '공항 입국장', emoji: '✈️', color: '#FB7185', bg: IMG_BASE + BG_FILE });
    var orig = window.startSpecialExplore;
    window.startSpecialExplore = function (locationId, charId) {
      if (locationId === LOC_ID) { enter(charId); return; }
      return orig.apply(this, arguments);
    };
    window.openFanRush = function () {
      if (plv() < NEED_LEVEL) { toast('✈️ 공항 입국장은 플레이어 Lv.' + NEED_LEVEL + '부터 열려요 (지금 Lv.' + plv() + ')'); return; }
      window.openSpecialCardSelect(LOC_ID);
    };
    (function addBtn() {
      var sec = $('bc-fandom-section');
      if (sec && !$('fr-entry-btn')) {
        var b = document.createElement('button'); b.id = 'fr-entry-btn';
        b.onclick = window.openFanRush;
        b.style.cssText = 'width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:9px;background:#FB71851f;border:1.5px solid #FB7185;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;text-align:left;font-family:inherit;';
        b.innerHTML = '<span style="font-size:24px;">✈️</span><span>공항 입국장 <span style="font-size:10px;color:#ffd1da;font-weight:700;">NEW</span><br><span style="font-size:10px;font-weight:400;color:#ffd1da;">몰려오는 팬들을 스킬로 응대해요 · Lv.' + NEED_LEVEL + ' · ⚡' + ENTRY_STAMINA + '</span></span><span style="margin-left:auto;color:#888;font-size:16px;">›</span>';
        var pad = sec.lastElementChild;     // 맨 아래 빈칸 앞에 끼운다
        sec.insertBefore(b, pad);
      }
      setTimeout(addBtn, 500);
    })();
  }
  install();

  window.__fanRushTest = {
    get G() { return G; }, SKILLS: SKILLS, FANTYPES: FANTYPES, waveList: waveList,
    newGame: function (cid, w, h) { G = newGame(cid || 'minjun', w || 390, h || 600); return G; },
    update: update, useSkill: useSkill, nearestFan: nearestFan, finish: finish, enter: enter
  };
})();
