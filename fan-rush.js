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
  var BASE_HP = 135, HP_PER_LV = 3;          // 최대 HP = BASE + (플레이어 레벨 - 10) × HP_PER_LV
  var DMG_PER_LV = 0.04;           // 스킬 위력: 1 + (플레이어 레벨 - 10) × 이 값
  var HIT_COOLDOWN = 0.5;          // 한 번 맞고 나서 무적 시간(초)
  // 보상 (한 판 전부 성공했을 때 대략: 코인 4~5천, 경험치 수백, 조각 0~2개)
  var COIN_PER_FAN = 16;           // 팬 1명 응대 코인 (웨이브가 높을수록 조금씩 늘어남)
  var EXP_PER_FAN = 3;             // 팬 1명 응대 카드 경험치
  var BOSS_COIN = 2000, BOSS_EXP = 300;
  var BOSS_PIECE_CHANCE = 0.7;     // 보스를 응대했을 때 🖼️ 프리미엄 조각 +1 확률
  var BOSS_PIECE_BONUS = 0.25;     // 거기에 한 번 더(+1) 줄 확률
  var BOSS_STONE_CHANCE = 0.15;    // 보스 응대 시 강화석 +1 확률
  var DEFEAT_RATE = 0.5;           // 쫓겨났을 때 코인·경험치를 받는 비율
  var HEART_DROP = 0.05;           // 팬이 만족했을 때 하트(HP +10)를 떨어뜨릴 확률
  var PIECE_NAME = '프리미엄 조각', PIECE_EMOJI = '🖼️', PIECE_GOAL = 100;
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BG_FILE = 'map-fanrush.png';  // 있으면 배너·카드선택 배경으로 쓰임(없어도 됨)

  // 스킬 (unlock = 플레이어 레벨 / dmg = 기본 위력 / cd = 쿨타임(초) / range = 사거리 or 반경)
  var SKILLS = [
    { id: 'sign',   icon: '✍️', name: '사인',       unlock: 1, cd: 0.8,  dmg: 34,  range: 150, kind: 'single', desc: '가까운 팬 1명에게 사인!' },
    { id: 'photo',  icon: '📸', name: '사진촬영',   unlock: 1, cd: 2.6,  dmg: 42,  range: 300, kind: 'line',   desc: '앞쪽 일직선의 팬을 한꺼번에 찰칵!' },
    { id: 'shake',  icon: '🤝', name: '악수',       unlock: 10, cd: 5.5,  dmg: 130, range: 120, kind: 'single', desc: '한 명을 확실하게! HP도 조금 회복' },
    { id: 'heart',  icon: '💗', name: '손하트',     unlock: 15, cd: 4.5,  dmg: 60,  range: 270, kind: 'multi',  desc: '하트 3발! 가까운 팬 3명을 한꺼번에 저격' },
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
    { id: 'wall',  img: 'guard-1.png', name: '강도현', role: '철벽 경호', cost: 2000, desc: '내가 팬한테 맞는 피해를 35% 줄여줘요' },
    { id: 'medic', img: 'guard-2.png', name: '하윤',   role: '응급 케어', cost: 2000, desc: '8초마다 내 HP를 15 회복시켜줘요' },
    { id: 'rush',  img: 'guard-3.png', name: '마석',   role: '돌격 경호', cost: 2500, desc: '가까운 팬을 알아서 밀치며 응대해요 (1.1초마다 공격)' }
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
  function loadoutIds() { var a = API(); return a ? a.loadout() : ['sign', 'photo', null, null, null]; }
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
      banner: { text: '', t: 0 }, nextId: 1, paused: false, guards: []
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

  function spawnFan(type, x, y) {
    var T = FANTYPES[type];
    if (x === undefined) {
      var a = Math.random() * Math.PI * 2, d = rnd(Math.max(G.vw, G.vh) * 0.55, Math.max(G.vw, G.vh) * 0.7);
      x = clamp(G.px + Math.cos(a) * d, 30, WORLD - 30); y = clamp(G.py + Math.sin(a) * d, 30, WORLD - 30);
    }
    var wmul = 1 + (G.wave - 1) * 0.04;     // 웨이브가 올라갈수록 조금씩 튼튼해짐
    var f = { id: G.nextId++, type: type, T: T, x: x, y: y, hp: T.hp * (T.boss ? 1 : wmul), mhp: T.hp * (T.boss ? 1 : wmul), kx: 0, ky: 0, flash: 0, shootT: rnd(0.8, 2), wob: Math.random() * 6 };
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
    if (Math.random() < HEART_DROP) G.pick.push({ x: f.x, y: f.y, v: 10, t: 14 });
    if (f.T.boss) { G.bossDown = true; G.banner = { text: '👑 팬클럽장이 만족했어요!', t: 2.5 }; sfx('reward'); }
  }
  function fanHit(f, dmg, kb, fromX, fromY) {
    f.hp -= dmg; f.flash = 0.12;
    var d = dist(f.x, f.y, fromX, fromY) || 1, k = f.T.boss ? kb * 0.15 : (f.T.r > 20 ? kb * 0.5 : kb);
    f.kx += (f.x - fromX) / d * k * 4; f.ky += (f.y - fromY) / d * k * 4;
    addDn(f.x + rnd(-6, 6), f.y - f.T.r - 8, '💗+' + Math.round(dmg), '#ff9ec7', dmg >= 100);
    if (f.hp <= 0) satisfy(f);
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
      var spm = (f.slow > 0) ? 0.45 : 1; if (f.slow > 0) f.slow -= dt;
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
    for (var xi = G.fx.length - 1; xi >= 0; xi--) { G.fx[xi].t -= dt; if (G.fx[xi].t <= 0) G.fx.splice(xi, 1); }
    for (var ni = G.dn.length - 1; ni >= 0; ni--) { var N = G.dn[ni]; N.t -= dt; N.y -= 26 * dt; if (N.t <= 0) G.dn.splice(ni, 1); }
    // 보디가드: 졸졸 따라다니며 각자 역할 수행
    G.guards.forEach(function (g, gi) {
      var ang = G.time * 0.8 + gi * Math.PI, gx = G.px + Math.cos(ang) * 46, gy = G.py + Math.sin(ang) * 46;
      g.x += (gx - g.x) * Math.min(1, dt * 6); g.y += (gy - g.y) * Math.min(1, dt * 6);
      g.t += dt; g.flash = Math.max(0, (g.flash || 0) - dt);
      if (g.def.id === 'medic' && g.t >= 8) { g.t = 0; g.flash = 0.6; heal(15); addFx({ k: 'hearts', x: G.px, y: G.py, t: 0.9, max: 0.9 }); }
      if (g.def.id === 'rush' && g.t >= 1.1) {
        var tf = null, bd = 190;
        G.fans.forEach(function (f) { var dd = dist(f.x, f.y, g.x, g.y) - f.T.r; if (dd < bd) { bd = dd; tf = f; } });
        if (tf) { g.t = 0; g.flash = 0.25; g.x += (tf.x - g.x) * 0.5; g.y += (tf.y - g.y) * 0.5; fanHit(tf, 40 * dmgMult(), 70, g.x, g.y); }
        else g.t = 1.1;
      }
    });
    // 카메라
    var tx = G.px - G.vw / 2, ty = G.py - G.vh / 2;
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 8);
    G.cam.x = clamp(G.cam.x, Math.min(0, (WORLD - G.vw) / 2), Math.max(0, WORLD - G.vw));
    G.cam.y = clamp(G.cam.y, Math.min(0, (WORLD - G.vh) / 2), Math.max(0, WORLD - G.vh));
  }

  // ════════ 스킬 ════════
  function useSkill(id) {
    if (!G || G.over || G.paused) return false;
    var s = SKILLS.filter(function (x) { return x.id === id; })[0];
    if (!s) return false;
    if (!skillOpen(s)) { toast('🔒 ' + s.name + '은(는) 플레이어 Lv.' + (API() ? API().SKILLS.filter(function (x) { return x.id === id; })[0].useLv : s.unlock) + '부터 쓸 수 있어요'); return false; }
    if (!skillOwned(s)) { toast('🔒 ' + (G.ch.name || '이 멤버') + '은(는) ' + s.name + '을(를) 아직 못 배웠어요 · 더보기 > 💖 팬 스킬 상점'); return false; }
    if (G.cd[id] > 0) return false;
    var m = dmgMult(), dmg = s.dmg * m, used = false;
    if (id === 'sign' || id === 'shake') {
      var f = nearestFan(s.range);
      if (!f) return false;
      addFx({ k: 'beam', x: G.px, y: G.py, x2: f.x, y2: f.y, t: 0.25, max: 0.25, c: id === 'sign' ? '#ffe27a' : '#ff9ad0' });
      fanHit(f, dmg, 40, G.px, G.py);
      if (id === 'shake') heal(6);
      used = true;
    } else if (id === 'heart') {
      var tg = G.fans.filter(function (f5) { return dist(f5.x, f5.y, G.px, G.py) - f5.T.r < s.range; }).sort(function (a, b) { return dist(a.x, a.y, G.px, G.py) - dist(b.x, b.y, G.px, G.py); }).slice(0, 3);
      if (!tg.length) return false;
      tg.forEach(function (f6) { addFx({ k: 'beam', x: G.px, y: G.py, x2: f6.x, y2: f6.y, t: 0.3, max: 0.3, c: '#ff6fb1' }); fanHit(f6, dmg, 35, G.px, G.py); });
      used = true;
    } else if (id === 'photo') {
      var tgt = nearestFan(420), dx = G.dir.x, dy = G.dir.y;
      if (tgt) { var dd = dist(tgt.x, tgt.y, G.px, G.py) || 1; dx = (tgt.x - G.px) / dd; dy = (tgt.y - G.py) / dd; }
      var hit = 0;
      G.fans.slice().forEach(function (f2) {
        var rx = f2.x - G.px, ry = f2.y - G.py, along = rx * dx + ry * dy, perp = Math.abs(rx * dy - ry * dx);
        if (along > 0 && along < s.range + f2.T.r && perp < 26 + f2.T.r) { fanHit(f2, dmg, 30, G.px, G.py); hit++; }
      });
      if (!hit) return false;
      addFx({ k: 'flash', x: G.px, y: G.py, x2: G.px + dx * s.range, y2: G.py + dy * s.range, t: 0.3, max: 0.3 });
      used = true;
    } else if (s.kind === 'aoe') {
      var inR = G.fans.filter(function (f3) { return dist(f3.x, f3.y, G.px, G.py) - f3.T.r < s.range; });
      if (!inR.length) return false;
      var kb = id === 'finale' ? 70 : (id === 'encore' ? 55 : (id === 'wink' ? 45 : (id === 'rose' ? 35 : 28)));
      inR.forEach(function (f4) { fanHit(f4, dmg, kb, G.px, G.py); if (id === 'rose') f4.slow = 3; });
      addFx({ k: (id === 'encore' || id === 'finale') ? 'bigring' : 'ring', x: G.px, y: G.py, r: s.range, t: 0.7, max: 0.7, c: (id === 'wink' || id === 'rose') ? 'gold' : '' });
      if (id === 'encore') { G.shield = 1.5; G.shake = 10; }
      if (id === 'finale') { G.shield = 2.2; G.shake = 14; }
      used = true;
    }
    if (used) { G.cd[id] = s.cd; sfx(s.sfx || (id === 'encore' ? 'reward' : 'pick')); }
    return used;
  }

  // ════════ 끝 / 보상 ════════
  function giveCardExp(charId, amt) {
    if (amt <= 0) return;
    if (typeof addCardExp === 'function') { try { addCardExp(charId, amt); return; } catch (e) {} }
    try { var d = JSON.parse(localStorage.getItem('ph_cardExp') || '{}'); d[charId] = (d[charId] || 0) + amt; localStorage.setItem('ph_cardExp', JSON.stringify(d)); } catch (e) {}
  }
  function finish(won) {
    if (G.over) return;
    G.over = true; G.won = !!won;
    var coin = G.coins, exp = G.exp, pieces = 0, stones = 0;
    if (won) {
      coin += BOSS_COIN; exp += BOSS_EXP;
      if (Math.random() < BOSS_PIECE_CHANCE) { pieces = 1; if (Math.random() < BOSS_PIECE_BONUS) pieces = 2; }
      if (Math.random() < BOSS_STONE_CHANCE) stones = 1;
    } else { coin = Math.floor(coin * DEFEAT_RATE); exp = Math.floor(exp * DEFEAT_RATE); }
    G.result = { won: !!won, coin: coin, exp: exp, pieces: pieces, stones: stones, kills: G.kills, wave: G.wave, time: Math.round(G.time) };
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

  function drawFloor(c) {
    var cx = G.cam.x, cy = G.cam.y, vw = G.vw, vh = G.vh;
    c.fillStyle = '#0c0719'; c.fillRect(cx - 40, cy - 40, vw + 80, vh + 80);
    // 바닥 (무대 느낌의 체크무늬)
    var T = 100, x0 = Math.max(0, Math.floor(cx / T) * T), y0 = Math.max(0, Math.floor(cy / T) * T);
    for (var x = x0; x < Math.min(WORLD, cx + vw + T); x += T) {
      for (var y = y0; y < Math.min(WORLD, cy + vh + T); y += T) {
        c.fillStyle = ((x / T + y / T) % 2 === 0) ? '#241a3d' : '#1d1532';
        c.fillRect(x, y, T, T);
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
    c.font = Math.round(T.r * 2.1) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(T.emoji, f.x, f.y + bob);
    c.shadowBlur = 0;
    if (T.boss) { c.font = Math.round(T.r * 1.0) + 'px sans-serif'; c.fillText('👑', f.x, f.y - T.r - 6 + bob); }
    // 💗 하트 게이지: 스킬을 맞을수록 차오르고, 가득 차면 만족해서 돌아간다 (처음부터 항상 보임)
    var w = Math.max(30, T.r * 2), bx = f.x - w / 2, by = f.y - T.r - (T.boss ? 24 : 12), fill = Math.min(1, Math.max(0, 1 - f.hp / f.mhp));
    c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(bx - 1.5, by - 1.5, w + 3, 8);
    c.fillStyle = fill >= 0.99 ? '#ffd76a' : '#ff6fb1'; c.fillRect(bx, by, w * fill, 5);
    c.font = '9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillStyle = '#fff'; c.fillText('💗', bx - 6, by + 7);
  }

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

  function drawFx(c) {
    G.fx.forEach(function (e) {
      var p = 1 - e.t / e.max;
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
  function render(c) {
    var sx = G.shake > 0 ? rnd(-G.shake, G.shake) * 0.5 : 0, sy = G.shake > 0 ? rnd(-G.shake, G.shake) * 0.5 : 0;
    c.save();
    c.fillStyle = '#0c0719'; c.fillRect(0, 0, G.vw, G.vh);
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
    update(dt);
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
    openHire(charId, ov);
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
        '<div style="font-size:12px;color:#ccc;margin:4px 0 12px;">공항 입국장은 고렙 지역이라 팬들이 거세요!<br>최대 ' + BG_MAX + '명까지 고용할 수 있어요 (한 판 동안)</div>' + rows +
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
