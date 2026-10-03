// ════════════════════════════════
// 🎣 동쪽호수 낚시 (fishing.js)
// 호수의 "🎣 낚시하기" 버튼(explorePlace('lake'))만 진짜 낚시로 바꾼다. 다른 지역 탐험은 그대로.
//
// 흐름: 스태미나 10 소모 → 60초 동안 낚시 (물고기와 싸우는 중이면 그 한 마리까지)
//   물을 탭해서 찌 던지기 → 물고기 그림자가 다가와 입질 → 타이밍 맞춰 탭 → 릴링(꾹 눌러서 초록 칸 맞추기)
//   (✨ 반짝이는 곳 = 기존 호수 재료는 지금 꺼져 있음. TREASURE_COUNT를 올리면 다시 나옴)
// 세션이 끝나면 재조합석 15% 판정도 기존 탐험처럼 그대로 한다.
//
// 값을 바꾸고 싶으면 아래 설정 / SPECIES 표만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SESSION_SEC = 60;       // 낚시 시간 (싸우는 중에 끝나면 그 한 마리는 끝까지)
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var WEB_DROP = 0.15;        // 물고기를 잡을 때 은빛거미줄이 같이 올라올 확률 (의상 제작 재료, 호수에서만 나오던 것)
  var STONE_DROP = 0.15;      // 세션 종료 시 재조합석 확률 (기존 호수 탐험과 동일)
  var BG_FILE = 'map-lake.png';

  // 이미지 좌표(1536x1024) 기준 호수 물 영역 (대략값. 어색하면 숫자만 조절)
  var IMG_W = 1536, IMG_H = 1024;
  var WATER_POLY = [
    [0.30, 0.42], [0.36, 0.35], [0.50, 0.335], [0.70, 0.325], [0.88, 0.33], [0.96, 0.36], [0.97, 0.46],
    [0.88, 0.52], [0.68, 0.55], [0.62, 0.64], [0.44, 0.63], [0.33, 0.52]
  ].map(function (p) { return [p[0] * IMG_W, p[1] * IMG_H]; });

  // ── 물고기 표 ──
  // weight: 등장 비중 / size: 그림자 크기 / speed: 헤엄 속도 / price: 재료 상점 판매가 / bite: 입질 유지 시간
  // hz: 타이밍 칸 크기(클수록 쉬움) / ht: 구슬이 한 번 왕복하는 시간(초, 짧을수록 빠름)
  // pull: 힘겨루기에서 물고기가 끌어당기는 힘(클수록 힘듦)
  var SPECIES = [
    { id: 'songsari', name: '별빛 송사리', emoji: '🐟', weight: 40, size: 20, speed: 70, price: 20,  hz: 0.30, ht: 1.8, pull: 0.06, bite: 1.4, rare: false },
    { id: 'bungeo',   name: '은빛 붕어',   emoji: '🐟', weight: 28, size: 30, speed: 60, price: 30,  hz: 0.26, ht: 1.6, pull: 0.10, bite: 1.3, rare: false },
    { id: 'ingeo',    name: '달빛 잉어',   emoji: '🐠', weight: 17, size: 42, speed: 52, price: 50, hz: 0.22, ht: 1.4, pull: 0.14, bite: 1.2, rare: true },
    { id: 'goldfish', name: '꽃잎 금붕어', emoji: '🐠', weight: 10, size: 34, speed: 80, price: 90, hz: 0.18, ht: 1.2, pull: 0.17, bite: 1.1, rare: true },
    { id: 'goldcarp', name: '황금 잉어',   emoji: '🐡', weight: 5,  size: 54, speed: 66, price: 180, hz: 0.14, ht: 1.0, pull: 0.20, bite: 1.0, rare: true }
  ];
  // ✨ 반짝이는 곳 (기존 호수 재료가 올라옴, 타이밍만 맞추면 끝)
  var TREASURE = { id: 'treasure', name: '반짝이는 것', emoji: '✨', size: 16, speed: 8, hz: 0.40, ht: 2.0, pull: 0, bite: 2.0, treasure: true };

  var FISH_COUNT = 6;
  var TREASURE_COUNT = 0;   // ✨ 반짝이는 곳(기존 호수 재료) 개수. 0이면 아예 안 나옴. 되살리려면 2 정도로

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function pickSpecies(luck, rng) {
    rng = rng || Math.random;
    var boost = 1 + (luck || 0) / 20; // 행운 옷: 희귀종 비중 소폭 증가
    var total = 0, ws = SPECIES.map(function (s) { var w = s.weight * (s.rare ? boost : 1); total += w; return w; });
    var r = rng() * total;
    for (var i = 0; i < SPECIES.length; i++) { r -= ws[i]; if (r <= 0) return SPECIES[i]; }
    return SPECIES[0];
  }

  var HOOK_TRIES = 2;       // 챔질(타이밍) 기회
  var TAP_GAIN = 0.05;      // 힘겨루기에서 탭 1번이 끌어당기는 양
  var TUG_LIMIT = 18;       // 힘겨루기 제한 시간(초)

  // ① 타이밍 게이지: 구슬이 왔다갔다하고, 임팩트존에 있을 때 탭
  function newZone(hz, rng) { return 0.25 + (rng || Math.random)() * 0.5; }
  function makeHook(sp, rng) { return { sp: sp, pos: 0, dir: 1, tries: HOOK_TRIES, zc: newZone(sp.hz, rng), freeze: 0 }; }
  function stepHook(h, dt) {
    if (h.freeze > 0) { h.freeze -= dt; return; }
    h.pos += h.dir * (2 / h.sp.ht) * dt;
    if (h.pos >= 1) { h.pos = 1; h.dir = -1; }
    if (h.pos <= 0) { h.pos = 0; h.dir = 1; }
  }
  // 'perfect'(존 가운데 40%) | 'good'(존 안) | 'miss'
  function judgeHook(h) {
    var d = Math.abs(h.pos - h.zc);
    if (d <= h.sp.hz * 0.2) return 'perfect';
    if (d <= h.sp.hz * 0.5) return 'good';
    return 'miss';
  }

  // ② 힘겨루기: 연타로 당기고, 물고기는 계속 끌어당기며 가끔 발버둥
  function makeTug(sp, bonus, rng) {
    return { sp: sp, pos: 0.5 + (bonus || 0), t: 0, surge: 0, nextSurge: 1.2 + (rng || Math.random)() * 1.5 };
  }
  function tapTug(g) { g.pos = Math.min(1.05, g.pos + TAP_GAIN); }
  function stepTug(g, dt, rng) {
    rng = rng || Math.random;
    g.t += dt; g.nextSurge -= dt;
    if (g.surge > 0) g.surge -= dt;
    else if (g.nextSurge <= 0) { g.surge = 0.7; g.nextSurge = 1.8 + rng() * 1.4; }
    g.pos -= g.sp.pull * (g.surge > 0 ? 1.8 : 1) * dt;
    if (g.pos >= 1) return 'win';
    if (g.pos <= 0 || g.t >= TUG_LIMIT) return 'lose';
    return 'go';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SPECIES: SPECIES, TREASURE: TREASURE, WATER_POLY: WATER_POLY, pointInPoly: pointInPoly, pickSpecies: pickSpecies, makeHook: makeHook, stepHook: stepHook, judgeHook: judgeHook, makeTug: makeTug, stepTug: stepTug, tapTug: tapTug, HOOK_TRIES: HOOK_TRIES };
  }
  if (typeof document === 'undefined') return;

  // ════════ 게임 연동 ════════
  function registerItems() {
    try {
      SPECIES.forEach(function (s) {
        if (typeof MATERIAL_SELL_PRICES !== 'undefined') MATERIAL_SELL_PRICES[s.name] = s.price;
        if (typeof MATERIAL_EMOJI_MAP !== 'undefined') MATERIAL_EMOJI_MAP[s.name] = s.emoji;
      });
    } catch (e) {}
  }

  // 기존 호수 탐험과 같은 방식으로 재료 하나를 굴린다 (희귀 확률: 행운 옷 반영, 소원의 조각 0.5%)
  function rollLakeItem() {
    var mats = EXPLORE_MATERIALS.lake;
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var rareChance = Math.min(0.80, 0.30 + luck / 100);
    var pool = Math.random() < rareChance ? mats.rare : mats.normal;
    var name = pool[Math.floor(Math.random() * pool.length)];
    var isWish = Math.random() < 0.005;
    return { name: isWish ? null : name, isWish: isWish };
  }

  var S = null; // 현재 낚시 세션 상태

  function startFishing() {
    if (document.getElementById('fishing-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    registerItems();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'fishing-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#0b1b2b;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image();
    bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      state: 'idle', timeLeft: SESSION_SEC, fishes: [], bobber: null, bite: null, hook: null, tug: null, shake: 0,
      msg: '', msgT: 0, pops: [], ripples: [], catches: [], last: performance.now(), raf: 0, t: 0, ended: false
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    for (var i = 0; i < FISH_COUNT; i++) spawn(false);
    for (var k = 0; k < TREASURE_COUNT; k++) spawn(true);
    say('물을 탭해서 낚싯줄을 던져봐요 🎣', 4);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onUp);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    // cover + 초점을 물(오른쪽 중앙)쪽으로
    S.s = Math.max(S.W / IMG_W, S.H / IMG_H);
    var dw = IMG_W * S.s, dh = IMG_H * S.s;
    S.ox = Math.min(0, Math.max(S.W - dw, S.W / 2 - 0.62 * dw));
    S.oy = Math.min(0, Math.max(S.H - dh, S.H / 2 - 0.5 * dh));
  }
  function toScreen(x, y) { return [x * S.s + S.ox, y * S.s + S.oy]; }
  function toImage(x, y) { return [(x - S.ox) / S.s, (y - S.oy) / S.s]; }
  function visRect(m) {
    m = m || 0;
    return { x0: -S.ox / S.s + m, x1: (S.W - S.ox) / S.s - m, y0: -S.oy / S.s + m, y1: (S.H - S.oy) / S.s - m };
  }

  function waterPoint() {
    var v = visRect(50), b = [1e9, 1e9, -1e9, -1e9];
    WATER_POLY.forEach(function (p) { b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])]; });
    for (var i = 0; i < 60; i++) {
      var x = b[0] + Math.random() * (b[2] - b[0]), y = b[1] + Math.random() * (b[3] - b[1]);
      if (pointInPoly(x, y, WATER_POLY) && x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) return [x, y];
    }
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  }

  function spawn(treasure) {
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var sp = treasure ? TREASURE : pickSpecies(luck);
    var p = waterPoint();
    S.fishes.push({ sp: sp, x: p[0], y: p[1], ang: Math.random() * 6.28, tx: p[0], ty: p[1], retarget: 0, state: 'swim', dwell: 0, orbit: Math.random() * 6.28, wob: Math.random() * 6.28, alpha: 0 });
  }

  // ── 입력 ──
  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var r = S.canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 110 && y < 56) { finish(); return; }          // 나가기
    if (S.state === 'tug') { tapTug(S.tug); S.shake = 0.08; return; }
    if (S.state === 'hook') { hookTap(); return; }
    if (S.state === 'bite') { startHook(); return; }
    if (S.state === 'waiting') { reelIn(true); return; }  // 너무 일찍 당김
    if (S.state === 'idle') {
      var ip = toImage(x, y);
      if (!pointInPoly(ip[0], ip[1], WATER_POLY)) { say('물 위에 던져야 해요 💧', 1.6); return; }
      cast(ip[0], ip[1]);
    }
  }
  function onUp() {}

  function cast(x, y) {
    S.bobber = { x: x, y: y, t: 0, fly: 0.45, from: [S.W * 0.55, S.H + 20], dip: 0 };
    S.state = 'casting';
    S.waitT = 0;
  }

  function reelIn(early) {
    // 낚싯줄 걷기. 건드려진 물고기는 놀라서 도망
    S.fishes.forEach(function (f) { if (f.state === 'interest' || f.state === 'hooked') { f.state = 'flee'; f.dwell = 2.5; } });
    S.bobber = null; S.bite = null; S.state = 'idle';
    say(early ? '너무 일찍 당겼어요! 물고기가 놀랐어요 💦' : '다시 던져봐요 🎣', 2);
  }

  // ① 입질 → 타이밍 게이지 시작
  function startHook() {
    var f = S.bite.fish;
    S.hook = makeHook(f.sp);
    S.state = 'hook';
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
  }

  function hookTap() {
    var h = S.hook;
    if (h.freeze > 0) return;
    var res = judgeHook(h);
    if (res === 'miss') {
      h.tries--;
      S.pops.push({ text: '아쉬워요!', t: 0 });
      if (h.tries <= 0) { escape('줄이 풀렸어요... 물고기가 도망갔어요 💦'); return; }
      h.zc = newZone(h.sp.hz); h.pos = 0; h.dir = 1; h.freeze = 0.4;
      say('기회가 ' + h.tries + '번 남았어요!', 1.4);
      return;
    }
    S.pops.push({ text: res === 'perfect' ? '🌟 PERFECT!' : '👍 GOOD!', t: 0 });
    if (h.sp.treasure) { landCatch(); return; }
    // ② 힘겨루기 시작 (퍼펙트면 유리하게 시작)
    S.tug = makeTug(h.sp, res === 'perfect' ? 0.14 : 0);
    S.hook = null; S.state = 'tug';
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
  }

  function escape(msg) {
    var f = S.bite.fish; f.state = 'flee'; f.dwell = 3;
    S.bobber = null; S.bite = null; S.hook = null; S.tug = null; S.state = 'idle';
    say(msg, 2.2);
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    update(dt);
    if (!S || S.ended) return;   // update() 안에서 시간이 끝나 finish()가 불렸으면 그리지 않음
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (S.msgT > 0) S.msgT -= dt;
    S.pops = S.pops.filter(function (p) { p.t += dt; return p.t < 1.6; });
    S.ripples = S.ripples.filter(function (r) { r.t += dt; return r.t < 1.2; });

    if (S.shake > 0) S.shake -= dt;
    // 시간은 계속 흐르고, 물고기와 싸우는 중에 끝나면 그 한 마리는 끝까지 상대한 뒤 마무리
    S.timeLeft -= dt;
    if (S.timeLeft <= 0) {
      S.timeLeft = 0;
      if (S.state !== 'hook' && S.state !== 'tug') { finish(); return; }
    }

    var b = S.bobber;
    if (S.state === 'casting' && b) {
      b.t += dt;
      if (b.t >= b.fly) { S.state = 'waiting'; S.waitT = 0; S.ripples.push({ x: b.x, y: b.y, t: 0 }); }
    }
    if (S.state === 'waiting') {
      S.waitT += dt;
      if (S.waitT > 11) { reelIn(false); say('입질이 없네요... 다시 던져볼까요? 🎣', 2.2); }
    }

    updateFishes(dt);

    if (S.state === 'bite' && S.bite) {
      S.bite.t -= dt;
      b.dip = Math.sin(S.t * 28) * 3 + 5;
      if (S.bite.t <= 0) {
        S.bite.fish.state = 'flee'; S.bite.fish.dwell = 3;
        S.bobber = null; S.bite = null; S.state = 'idle';
        say('놓쳤어요 💦 다시 던져봐요', 2);
      }
    }

    if (S.state === 'hook' && S.hook) stepHook(S.hook, dt);
    if (S.state === 'tug' && S.tug) {
      var res = stepTug(S.tug, dt);
      if (res === 'win') landCatch();
      else if (res === 'lose') escape('힘 싸움에서 졌어요... 물고기가 도망갔어요 💦');
    }
  }

  function updateFishes(dt) {
    var b = S.bobber, v = visRect(40), waiting = (S.state === 'waiting');
    var chosen = null;
    var interested = S.fishes.filter(function (x) { return x.state === 'interest' && !x.sp.treasure; }).length;
    S.fishes.forEach(function (f) {
      f.alpha = Math.min(1, f.alpha + dt * 1.5);
      var sp = f.sp, speed = sp.speed, tx = f.tx, ty = f.ty;

      if (f.state === 'flee') {
        f.dwell -= dt; speed = sp.speed * 2.4;
        if (f.dwell <= 0) f.state = 'swim';
      }
      if (f.state === 'swim') {
        f.retarget -= dt;
        var dd = Math.hypot(f.tx - f.x, f.ty - f.y);
        if (f.retarget <= 0 || dd < 14) { var p = waterPoint(); f.tx = p[0]; f.ty = p[1]; f.retarget = 2 + Math.random() * 3; }
        if (waiting && b && b.t >= b.fly) {
          var d0 = Math.hypot(b.x - f.x, b.y - f.y);
          if (d0 < 260 && (sp.treasure || interested < 2)) {
            f.state = 'interest'; f.dwell = sp.treasure ? 0.35 : 0.9 + Math.random() * 1.5;
            if (!sp.treasure) interested++;
          }
        }
      } else if (f.state === 'interest') {
        if (!waiting || !b) { f.state = 'swim'; }
        else {
          f.orbit += dt * 1.9;
          var dist = Math.hypot(b.x - f.x, b.y - f.y);
          var rad = sp.treasure ? 0 : Math.max(18, 62 - (1 - Math.min(1, f.dwell / 2)) * 40);
          f.tx = b.x + Math.cos(f.orbit) * rad; f.ty = b.y + Math.sin(f.orbit) * rad;
          if (dist < 120) f.dwell -= dt;
          if (dist > 420) f.state = 'swim';
          if (f.dwell <= 0 && !chosen) chosen = f;
        }
      } else if (f.state === 'hooked' && b) {
        f.tx = b.x; f.ty = b.y; speed = 40;
      }

      // 이동 (부드럽게 방향 전환, 물 밖으로는 안 나감)
      var want = Math.atan2(f.ty - f.y, f.tx - f.x), diff = want - f.ang;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      f.ang += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
      var step = sp.treasure ? 0 : speed * dt;
      var nx = f.x + Math.cos(f.ang) * step, ny = f.y + Math.sin(f.ang) * step;
      if (sp.treasure) {
        f.wob += dt; nx = f.x + Math.cos(f.wob * 0.6) * 4 * dt; ny = f.y + Math.sin(f.wob * 0.5) * 4 * dt;
      }
      if (pointInPoly(nx, ny, WATER_POLY) && nx > v.x0 - 60 && nx < v.x1 + 60 && ny > v.y0 - 60 && ny < v.y1 + 60) { f.x = nx; f.y = ny; }
      else { var q = waterPoint(); f.tx = q[0]; f.ty = q[1]; f.retarget = 2; f.ang += 1.2; }
    });

    if (chosen && S.state === 'waiting') {
      chosen.state = 'hooked';
      S.fishes.forEach(function (f) { if (f !== chosen && f.state === 'interest') f.state = 'swim'; });
      S.bite = { fish: chosen, t: chosen.sp.bite };
      S.state = 'bite';
      S.ripples.push({ x: b.x, y: b.y, t: 0 });
      if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch (e) {} }
    }
  }

  // ── 낚아 올림 ──
  function landCatch() {
    var f = S.bite.fish, sp = f.sp, label = null, emoji = sp.emoji, ok = true;
    if (sp.treasure) {
      var item = rollLakeItem();
      var before = exploreCollected.length;
      var el = { style: {}, parentNode: { removeChild: function () {} } };
      collectExploreItem(0, item, el);   // 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : (item.isWish ? '🧩 소원의 조각' : item.name);
      emoji = item.isWish ? '🧩' : (typeof getMaterialEmoji === 'function' ? getMaterialEmoji(item.name) : '✨');
      if (item.isWish) label = '🧩 소원의 조각';
    } else {
      ok = addToBag(sp.emoji, sp.name, 'material', 1, '낚시로 잡은 물고기 · 재료 상점에서 팔 수 있어요');
      label = sp.name;
      if (ok) {
        if (typeof addPlayerExp === 'function') addPlayerExp(10);
        if (typeof checkQuestProgress === 'function') checkQuestProgress('first_explore');
        exploreCollected.push(sp.emoji + ' ' + sp.name);
        // 은빛거미줄: 호수 탐험이 낚시로 바뀌면서 얻을 곳이 없어지지 않게, 물고기와 함께 가끔 올라옴
        if (Math.random() < WEB_DROP && addToBag('🕸️', '은빛거미줄', 'material', 1, '제작 재료 (낚시 중 낚싯줄에 걸려 올라왔어요)')) {
          S.catches.push('은빛거미줄');
          exploreCollected.push('은빛거미줄');
          S.pops.push({ text: '🕸️ 은빛거미줄도 걸렸어요!', t: 0.5 });
        }
      }
    }
    if (ok) {
      S.catches.push(label);
      S.pops.push({ text: emoji + ' ' + (label || '') + ' 획득!', t: 0 });
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
    }
    // 잡힌 개체는 사라지고 새로 등장
    S.fishes = S.fishes.filter(function (x) { return x !== f; });
    spawn(!!sp.treasure);
    S.bobber = null; S.bite = null; S.hook = null; S.tug = null; S.state = 'idle';
    say(ok ? '좋아요! 계속 던져봐요 🎣' : '가방이 꽉 차서 놓쳤어요 🎒', 2);
  }

  // ── 그리기 ──
  function draw() {
    var c = S.ctx, W = S.W, H = S.H;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (S.bgOk) c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    else { var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d4e6e'); g.addColorStop(1, '#0b1b2b'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    // 살짝 어둡게 (UI가 잘 보이게)
    var shade = c.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(0,0,20,0.35)'); shade.addColorStop(0.3, 'rgba(0,0,20,0.05)'); shade.addColorStop(1, 'rgba(0,0,20,0.55)');
    c.fillStyle = shade; c.fillRect(0, 0, W, H);

    // 물고기 그림자 / 반짝임
    S.fishes.forEach(function (f) {
      var p = toScreen(f.x, f.y), sz = f.sp.size * S.s;
      c.save(); c.translate(p[0], p[1]);
      if (f.sp.treasure) {
        var pulse = 0.75 + 0.25 * Math.sin(S.t * 3 + f.orbit);
        c.globalAlpha = f.alpha * pulse; c.font = (26 * S.s + 10) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.shadowColor = '#FFD700'; c.shadowBlur = 14; c.fillText('✨', 0, 0);
      } else {
        c.rotate(f.ang); c.globalAlpha = f.alpha * (f.state === 'flee' ? 0.7 : 0.5);
        c.fillStyle = '#06182a';
        var wag = Math.sin(S.t * 8 + f.wob) * 0.35;
        c.beginPath(); c.ellipse(0, 0, sz, sz * 0.42, 0, 0, 6.2832); c.fill();
        c.beginPath(); c.moveTo(-sz * 0.8, 0); c.lineTo(-sz * 1.45, -sz * 0.45 + wag * sz * 0.4); c.lineTo(-sz * 1.45, sz * 0.45 + wag * sz * 0.4); c.closePath(); c.fill();
      }
      c.restore();
    });

    // 물결
    S.ripples.forEach(function (r) {
      var p = toScreen(r.x, r.y), k = r.t / 1.2;
      c.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p[0], p[1], 10 + k * 46 * S.s, (10 + k * 46 * S.s) * 0.45, 0, 0, 6.2832); c.stroke();
    });

    // 낚싯줄 + 찌
    var b = S.bobber;
    if (b) {
      var bp = toScreen(b.x, b.y), pos = bp, fly = b.t < b.fly;
      if (fly) {
        var k2 = b.t / b.fly; pos = [b.from[0] + (bp[0] - b.from[0]) * k2, b.from[1] + (bp[1] - b.from[1]) * k2 - Math.sin(k2 * Math.PI) * 120];
      }
      var by = pos[1] + (fly ? 0 : b.dip + Math.sin(S.t * 3) * 1.5);
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(S.W * 0.55, S.H + 20); c.quadraticCurveTo((S.W * 0.55 + pos[0]) / 2, Math.max(pos[1], S.H * 0.5) + 40, pos[0], by); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(pos[0], by, 7, 0, 6.2832); c.fill();
      c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(pos[0], by, 7, Math.PI, 6.2832); c.fill();
      if (S.state === 'bite') {
        c.font = '900 34px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#FFD700'; c.strokeStyle = '#000'; c.lineWidth = 4;
        c.strokeText('❗', pos[0], by - 26); c.fillText('❗', pos[0], by - 26);
        c.font = '700 14px sans-serif'; c.fillStyle = '#fff'; c.strokeText('지금 탭!', pos[0], by - 54); c.fillText('지금 탭!', pos[0], by - 54);
      }
    }

    // 릴링 UI
    if (S.state === 'hook' && S.hook) drawHook(c);
    if (S.state === 'tug' && S.tug) drawTug(c);

    // 상단 HUD
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 12, 12, 92, 36, 12); c.fill();
    c.fillStyle = '#fff'; c.font = '700 14px sans-serif'; c.fillText('← 나가기', 22, 31);
    c.textAlign = 'center';
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W / 2 - 78, 12, 156, 36, 12); c.fill();
    c.fillStyle = S.timeLeft < 10 ? '#FF6B9D' : '#fff'; c.font = '900 16px sans-serif';
    c.fillText('⏱ ' + Math.ceil(S.timeLeft) + '초   🎣 ' + S.catches.length, W / 2, 31);

    // 안내 문구
    if (S.msgT > 0 && S.msg) {
      c.font = '700 15px sans-serif'; var tw = c.measureText(S.msg).width + 36;
      c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, W / 2 - tw / 2, H - 112, tw, 40, 14); c.fill();
      c.fillStyle = '#fff'; c.fillText(S.msg, W / 2, H - 92);
    }
    // 획득 팝업
    S.pops.forEach(function (p) {
      var a = 1 - Math.max(0, (p.t - 1) / 0.6);
      c.globalAlpha = Math.max(0, a); c.font = '900 20px sans-serif'; c.fillStyle = '#FFD700'; c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 4;
      var y = H * 0.4 - p.t * 40; c.strokeText(p.text, W / 2, y); c.fillText(p.text, W / 2, y); c.globalAlpha = 1;
    });
  }

  function drawHook(c) {
    var h = S.hook, W = S.W, H = S.H;
    c.fillStyle = 'rgba(0,0,20,0.35)'; c.fillRect(0, 0, W, H);
    var bw = Math.min(W - 48, 340), bh = 34, bx = (W - bw) / 2, by = H * 0.46;
    c.fillStyle = 'rgba(0,0,0,0.62)'; roundRect(c, bx - 12, by - 46, bw + 24, bh + 84, 20); c.fill();
    c.font = '700 14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText('구슬이 노란 칸에 오면 탭!', W / 2, by - 22);
    c.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(c, bx, by, bw, bh, 17); c.fill();
    // 임팩트존 (가운데 흰 부분이 PERFECT)
    var zw = bw * h.sp.hz, zx = bx + bw * h.zc - zw / 2;
    c.fillStyle = 'rgba(255,214,10,0.6)'; roundRect(c, zx, by + 2, zw, bh - 4, 12); c.fill();
    var pw = zw * 0.4;
    c.fillStyle = 'rgba(255,255,255,0.8)'; roundRect(c, bx + bw * h.zc - pw / 2, by + 2, pw, bh - 4, 10); c.fill();
    // 구슬
    var px = bx + bw * h.pos, py = by + bh / 2;
    var grd = c.createRadialGradient(px - 4, py - 4, 2, px, py, 16);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, '#7dd3fc'); grd.addColorStop(1, '#2563eb');
    c.save(); c.globalAlpha = h.freeze > 0 ? 0.45 : 1; c.shadowColor = '#7dd3fc'; c.shadowBlur = 14;
    c.fillStyle = grd; c.beginPath(); c.arc(px, py, 16, 0, 6.2832); c.fill(); c.restore();
    // 기회
    var hearts = ''; for (var i = 0; i < HOOK_TRIES; i++) hearts += i < h.tries ? '💙' : '🤍';
    c.font = '14px sans-serif'; c.fillStyle = '#fff'; c.fillText('기회 ' + hearts, W / 2, by + bh + 24);
  }

  function drawTug(c) {
    var g = S.tug, W = S.W, H = S.H, surge = g.surge > 0;
    c.fillStyle = 'rgba(0,0,20,0.35)'; c.fillRect(0, 0, W, H);
    var amp = surge ? 7 : (S.shake > 0 ? 3 : 0);
    var sx = amp ? (Math.random() - 0.5) * amp : 0, sy = amp ? (Math.random() - 0.5) * amp : 0;
    var bw = Math.min(W - 140, 280), bh = 30, bx = (W - bw) / 2 + sx, by = H * 0.47 + sy, ky = by + bh / 2;
    c.fillStyle = 'rgba(0,0,0,0.62)'; roundRect(c, bx - 62, by - 52, bw + 124, bh + 96, 20); c.fill();
    c.font = '900 15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = surge ? '#ff6b6b' : '#fff';
    c.fillText(surge ? '🐟 발버둥 쳐요!! 더 빨리 연타!' : '연타해서 끌어당겨요! 👊', W / 2 + sx, by - 26);
    var grad = c.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#ef4444'); grad.addColorStop(0.5, '#fbbf24'); grad.addColorStop(1, '#22c55e');
    c.fillStyle = grad; roundRect(c, bx, by, bw, bh, 15); c.fill();
    // 매듭: 오른쪽 끝에 닿으면 내 승리, 왼쪽 끝이면 물고기 승리
    var kx = bx + bw * Math.max(0, Math.min(1, g.pos));
    c.fillStyle = '#fff'; c.beginPath(); c.arc(kx, ky, 17, 0, 6.2832); c.fill();
    c.fillStyle = '#1e293b'; c.beginPath(); c.arc(kx, ky, 8, 0, 6.2832); c.fill();
    c.font = '30px sans-serif'; c.fillStyle = '#fff';
    c.fillText(g.sp.emoji, bx - 32, ky); c.fillText('🎣', bx + bw + 32, ky);
    c.font = '700 12px sans-serif'; c.fillStyle = '#ddd';
    c.fillText('물고기', bx - 32, ky + 30); c.fillText('나', bx + bw + 32, ky + 30);
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ── 종료 / 결과 ──
  function finish() {
    if (!S || S.ended) return;
    S.ended = true;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', resize);
    var catches = S.catches.slice(), ov = S.overlay;

    var stone = false;
    if (Math.random() < STONE_DROP) {
      stone = addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료');
      if (stone) { catches.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    catches.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 잡았어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #38BDF8;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🎣</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">낚시 끝!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="fishing-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#38BDF8,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🎣 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="fishing-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('fishing-close').onclick = function () { ov.remove(); };
    document.getElementById('fishing-again').onclick = function () { ov.remove(); startFishing(); };
  }

  window.startFishing = startFishing;

  // ── 호수 "낚시하기" 버튼만 진짜 낚시로 연결 (game.js는 건드리지 않음) ──
  (function hookExplorePlace() {
    if (typeof window.explorePlace !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookExplorePlace, 50); return; }
    if (window.__fishingHooked) return;
    window.__fishingHooked = true;
    var original = window.explorePlace;
    window.explorePlace = function (id) {
      if (id === 'lake') { startFishing(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
