// ════════════════════════════════
// 🎬 촬영 세트장 소품 세팅 탐험 (set-explore.js)
// 예전 "동쪽숲"이 촬영 세트장이 되면서, 숲의 "🎬 촬영장 가기" 버튼(startExplore('forest'))을 이 탐험으로 연결한다.
// 다른 지역 탐험은 그대로. 예전 숲 탐험(forest-explore.js)은 파일만 남아 있고 더 이상 실행되지 않는다.
//   (예전 숲으로 되돌리려면 loader.js 에서 'set-explore.js' 한 줄만 지우면 됨)
//
// 흐름: 스태미나 10 소모 → 35초 안에
//   바닥에 나타나는 소품 상자를 손가락으로 끌어서, 불 켜진(반짝이는) 점선 칸에 놓기 → "딱!" 하고 재료가 나옴
//   칸은 6개 중 2개만 켜져 있고, 하나 채우면 다른 칸이 랜덤으로 켜짐
//   ✨ 금색 소품 1개: 희귀 재료 확정
//   💥 NG 소품: 칸에 놓으면 시간 -3초 + 연속 기록이 깨짐 (그냥 두면 사라짐)
//   소품 6개를 다 놓으면 끝. NG 없이 6개를 다 놓으면 "🎬 컷! OK!" 보너스 재료 1개
// 재료는 예전 숲 재료 그대로 (별빛나무, 고급원목, 신비버섯, 새의깃털 / 희귀: 행운의잎, 천사의깃털).
// 재조합석 18% 판정은 기존 탐험과 동일. 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // 예전 숲 탐험이 늦게 실행돼도 "숲" 버튼을 다시 가로채지 못하게 미리 막아둔다 (이미 실행됐다면 이 파일이 바깥에서 먼저 가로챔)
  window.__forestHooked = true;

  // ── 설정 ──
  var SESSION_SEC = 35;       // 탐험 시간
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.18;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var TOTAL_PROPS = 6;        // 한 판에 놓아야 하는 소품 수 (재료 양이 예전 숲/헬스장과 비슷하게 나오는 값)
  var EXTRA_DROP = 0.25;      // 소품 하나를 놓았을 때 재료가 2개 나올 확률 (기본은 1개)
  var LIT_COUNT = 2;          // 동시에 켜져 있는 칸 수
  var MAX_FLOOR = 4;          // 바닥에 동시에 나와 있는 소품 수
  var SPAWN_GAP = 0.35;       // 소품이 새로 나타나는 간격 (초)
  var NG_CHANCE = 0.25;       // 소품이 나타날 때 NG 소품도 같이 나올 확률
  var NG_PENALTY = 3;         // NG 소품을 칸에 놓으면 줄어드는 시간(초)
  var NG_LIFE = 6;            // NG 소품이 사라지기까지 (초)
  var GRAB_LIFT = 28;         // 소품을 끌 때 손가락에 가리지 않게 위로 띄우는 높이 (화면 px)
  var BG_FILE = 'map-set.png';

  // 이미지 좌표(1024x1536) 기준. 그림에 그려진 점선 칸 6개의 중심 / 반폭 / 반높이 (대략값. 어긋나면 숫자만 조절)
  var IMG_W = 1024, IMG_H = 1536;
  var SLOT_CX = [99, 266, 434, 603, 771, 940];
  var SLOT_CY = 967, SLOT_HW = 78, SLOT_HH = 54;
  // 소품이 나타나는 바닥 범위 (이미지 좌표)
  var SPAWN = { x0: 70, x1: 954, y0: 1110, y1: 1400 };
  var PROP_EMOJI = ['🎬', '📦', '🪴', '🎞️', '💡', '🎀', '🎭', '📸'];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['별빛나무', '고급원목', '신비버섯', '새의깃털'],
    rare: ['행운의잎', '천사의깃털']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.forest) return EXPLORE_MATERIALS.forest;
    return POOLS;
  }

  // 기존 탐험과 같은 방식으로 재료 하나 뽑기. forceRare면 희귀 확정
  function rollDrop(luck, rng, forceRare) {
    rng = rng || Math.random;
    var p = pools();
    var rareChance = Math.min(0.80, 0.30 + (luck || 0) / 100);
    var isRare = forceRare || rng() < rareChance;
    var pool = isRare ? p.rare : p.normal;
    var mat = pool[Math.floor(rng() * pool.length)];
    var isWish = rng() < 0.005;
    return { name: isWish ? null : mat, isWish: isWish, isRare: isRare };
  }

  // 소품 하나를 놓았을 때 나오는 재료들
  function planDrops(luck, rng, golden) {
    rng = rng || Math.random;
    var n = 1 + (rng() < EXTRA_DROP ? 1 : 0);
    var out = [];
    for (var i = 0; i < n; i++) out.push(rollDrop(luck, rng, golden && i === 0));
    return out;
  }

  // 켜져 있는 칸 중 하나를 채운 뒤, 다른 칸 하나를 새로 켠다 (켜진 칸은 항상 LIT_COUNT개)
  function relight(lit, filled, rng) {
    rng = rng || Math.random;
    var next = lit.filter(function (i) { return i !== filled; });
    var cands = [];
    for (var i = 0; i < SLOT_CX.length; i++) if (next.indexOf(i) < 0 && i !== filled) cands.push(i);
    while (next.length < LIT_COUNT && cands.length) next.push(cands.splice(Math.floor(rng() * cands.length), 1)[0]);
    return next;
  }

  var S = null;

  // ════════ 화면 ════════
  function startSet() {
    if (document.getElementById('set-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'set-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#2a1a22;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image();
    bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      props: [], lit: [], placed: 0, spawned: 0, goldenAt: Math.floor(Math.random() * TOTAL_PROPS), spawnT: 0.2, perfect: true,
      drag: null, exitDown: false, bursts: [], pops: [], collected: [], timeLeft: SESSION_SEC,
      flash: 0, glow: 0, shakeT: 0, msg: '', msgT: 0, last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    S.lit = relight([], -1, Math.random);
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    say('소품 상자를 끌어서 반짝이는 칸에 놓아요! 🎬', 4);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }
  function sfx(name) { try { if (window.pocaSfx) window.pocaSfx.play(name); } catch (e) {} }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = Math.min(S.W / IMG_W, S.H / IMG_H);                      // 그림 전체가 한 화면에 보이게
    S.ox = (S.W - IMG_W * S.s) / 2;
    S.oy = Math.max(0, S.H - IMG_H * S.s);                          // 폰처럼 세로가 남으면 바닥에 붙이고 위는 흐린 배경
  }
  function toScreen(x, y) { return [x * S.s + S.ox, y * S.s + S.oy]; }
  function toImage(x, y) { return [(x - S.ox) / S.s, (y - S.oy) / S.s]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ── 소품 ──
  function floorNormals() { return S.props.filter(function (p) { return p.type !== 'ng'; }).length; }
  function spawnProp(type) {
    var x = 0, y = 0, ok = false;
    for (var tries = 0; tries < 14 && !ok; tries++) {
      x = SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0);
      y = SPAWN.y0 + Math.random() * (SPAWN.y1 - SPAWN.y0);
      ok = S.props.every(function (p) { return Math.hypot(p.x - x, p.y - y) > 110; });
    }
    S.props.push({
      type: type, x: x, y: y, sx: x, sy: y, drag: false, born: S.t, ph: Math.random() * 6,
      emoji: type === 'gold' ? '🌟' : (type === 'ng' ? '💥' : PROP_EMOJI[Math.floor(Math.random() * PROP_EMOJI.length)])
    });
  }

  // ── 입력 ──
  function pos(e) {
    var r = S.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function hitProp(x, y) {
    var best = null, bd = 1e9;
    S.props.forEach(function (p) {
      var sp = toScreen(p.x, p.y), d = Math.hypot(sp[0] - x, sp[1] - y);
      if (d < 40 && d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function moveDrag(p) {
    var im = toImage(p[0], p[1] - GRAB_LIFT);
    S.drag.p.x = clamp(im[0], 30, IMG_W - 30);
    S.drag.p.y = clamp(im[1], 250, IMG_H - 30);
  }
  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var p = pos(e);
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (p[0] < 110 && p[1] < 56) { S.exitDown = true; return; }       // 나가기
    var prop = hitProp(p[0], p[1]);
    if (prop && !S.drag) {
      S.drag = { id: e.pointerId, p: prop };
      prop.drag = true; prop.sx = prop.x; prop.sy = prop.y;
      sfx('setGrab');
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err2) {} }
      moveDrag(p);
    }
  }
  function onMove(e) {
    if (!S || S.ended || !S.drag || S.drag.id !== e.pointerId) return;
    moveDrag(pos(e));
  }
  function onUp(e) {
    if (!S || S.ended) return;
    var p = pos(e);
    if (S.exitDown) { S.exitDown = false; if (p[0] < 110 && p[1] < 56) finish(); return; }
    if (S.drag && S.drag.id === e.pointerId) release();
  }
  function onCancel(e) { if (S && S.drag) { S.drag.p.drag = false; S.drag.p.x = S.drag.p.sx; S.drag.p.y = S.drag.p.sy; S.drag = null; } if (S) S.exitDown = false; }

  // 소품이 어느 칸 위에 있는지 (켜진 칸만 / 아무 칸이나). 화면이 작아도 놓기 쉽게 여유를 둔다.
  function slotAt(prop, onlyLit) {
    var tx = Math.max(SLOT_HW + 12, 42 / S.s), ty = Math.max(SLOT_HH + 20, 36 / S.s), best = -1, bd = 1e9;
    for (var i = 0; i < SLOT_CX.length; i++) {
      if (onlyLit && S.lit.indexOf(i) < 0) continue;
      var dx = (prop.x - SLOT_CX[i]) / tx, dy = (prop.y - SLOT_CY) / ty, d = dx * dx + dy * dy;
      if (d <= 1 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function release() {
    var prop = S.drag.p;
    S.drag = null; prop.drag = false;
    var litIdx = slotAt(prop, true);
    if (litIdx >= 0) {
      if (prop.type === 'ng') penalty(prop);
      else place(prop, litIdx);
      return;
    }
    // 켜진 칸이 아니면 원래 자리로
    if (slotAt(prop, false) >= 0 && prop.type !== 'ng') say('반짝이는 칸에 놓아요! ✨', 1.4);
    prop.x = prop.sx; prop.y = prop.sy;
  }

  function removeProp(prop) { S.props = S.props.filter(function (q) { return q !== prop; }); }

  // 재료 하나 지급: 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
  function giveDrop(d, x, y) {
    var label = null, emoji = '✨';
    var before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label);
    S.pops.push({ x: x, y: y, text: emoji + ' ' + label + (d.isRare ? ' ✨' : ''), t: 0 });
  }

  function place(prop, slotIdx) {
    removeProp(prop);
    S.placed += 1;
    var cx = SLOT_CX[slotIdx], gold = prop.type === 'gold';
    sfx('setClap');
    if (gold) setTimeout(function () { sfx('reward'); }, 220);
    if (navigator.vibrate) { try { navigator.vibrate([15, 25, 30]); } catch (e) {} }
    S.bursts.push({ x: cx, y: SLOT_CY, text: gold ? '🌟 딱!' : '🎬 딱!', t: 0, dur: 0.5, golden: gold, big: false });
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    planDrops(luck, Math.random, gold).forEach(function (d, i) { giveDrop(d, cx, SLOT_CY - 40 - i * 26); });
    S.lit = relight(S.lit, slotIdx, Math.random);
    var left = TOTAL_PROPS - S.placed;
    if (left > 0) say('남은 소품 ' + left + '개!', 1.2);
    else {
      if (S.perfect) {
        // NG 없이 전부 놓으면 보너스 재료
        sfx('cheer');
        S.bursts.push({ x: IMG_W / 2, y: 700, text: '🎬 컷! OK!', t: 0, dur: 1.0, golden: true, big: true });
        S.shakeT = 0.25; S.glow = 0.2;
        giveDrop(rollDrop(luck, Math.random, false), IMG_W / 2, 780);
        say('완벽한 촬영! 보너스 재료 🎉', 2);
      } else say('촬영 끝! 다음엔 NG 없이 도전해봐요 🎬', 2);
    }
  }

  function penalty(prop) {
    removeProp(prop);
    S.timeLeft = Math.max(0, S.timeLeft - NG_PENALTY);
    S.flash = 0.35; S.perfect = false;
    sfx('fail');
    var sp = toScreen(prop.x, prop.y), ip = [prop.x, prop.y];
    S.pops.push({ x: ip[0], y: ip[1] - 30, text: '💥 NG! -' + NG_PENALTY + '초', t: 0, bad: true });
    if (navigator.vibrate) { try { navigator.vibrate([80, 40, 80]); } catch (e) {} }
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    S.timeLeft -= dt;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.glow > 0) S.glow -= dt;
    if (S.shakeT > 0) S.shakeT -= dt;

    // 소품 새로 나타나기
    if (S.spawned < TOTAL_PROPS) {
      S.spawnT -= dt;
      if (S.spawnT <= 0 && floorNormals() < MAX_FLOOR) {
        S.spawnT = SPAWN_GAP;
        spawnProp(S.spawned === S.goldenAt ? 'gold' : 'normal');
        S.spawned += 1;
        if (S.spawned >= 2 && Math.random() < NG_CHANCE && !S.props.some(function (p) { return p.type === 'ng'; })) spawnProp('ng');
      }
    }
    // NG 소품은 시간이 지나면 사라짐 (끌고 있는 중에는 유지)
    S.props = S.props.filter(function (p) { return !(p.type === 'ng' && !p.drag && S.t - p.born > NG_LIFE); });

    S.pops.forEach(function (p) { p.t += dt; });
    S.pops = S.pops.filter(function (p) { return p.t < 1.4; });
    S.bursts.forEach(function (b) { b.t += dt; });
    S.bursts = S.bursts.filter(function (b) { return b.t < b.dur; });

    // 끝났는지: 시간 종료, 또는 소품 6개를 다 놓은 뒤 잠깐 연출을 보여주고 종료
    if (S.timeLeft <= 0) { finish(); return; }
    if (S.placed >= TOTAL_PROPS) {
      if (S.endDelay < 0) S.endDelay = 1.1;
      S.endDelay -= dt;
      if (S.endDelay <= 0) { finish(); return; }
    }

    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function draw() {
    if (!S || S.ended) return;
    var c = S.ctx, W = S.W, H = S.H;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    c.save();   // 보너스 때 장면만 살짝 흔들기 (HUD는 안 흔들림)
    if (S.shakeT > 0) { var sk = 8 * (S.shakeT / 0.25); c.translate((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk); }

    if (S.bgOk) {
      // 남는 곳: 같은 그림을 크게 깔고 흐리게 + 어둡게
      var cs = Math.max(W / IMG_W, H / IMG_H), cw = IMG_W * cs, ch = IMG_H * cs;
      try { c.filter = 'blur(10px)'; } catch (e) {}
      c.drawImage(S.bg, (W - cw) / 2, (H - ch) / 2, cw, ch);
      try { c.filter = 'none'; } catch (e) {}
      c.fillStyle = 'rgba(30,10,20,0.45)'; c.fillRect(0, 0, W, H);
      c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    } else {
      c.fillStyle = '#3a2a30'; c.fillRect(0, 0, W, H);
    }

    // 점선 칸: 꺼진 칸은 살짝 어둡게, 켜진 칸은 반짝이게
    for (var i = 0; i < SLOT_CX.length; i++) {
      var tl = toScreen(SLOT_CX[i] - SLOT_HW, SLOT_CY - SLOT_HH), w = SLOT_HW * 2 * S.s, h = SLOT_HH * 2 * S.s;
      var on = S.lit.indexOf(i) >= 0;
      if (on) {
        var pulse = 0.5 + 0.5 * Math.sin(S.t * 6 + i);
        c.fillStyle = 'rgba(255,236,120,' + (0.30 + 0.18 * pulse) + ')'; roundRect(c, tl[0], tl[1], w, h, 8 * S.s + 4); c.fill();
        c.lineWidth = 3; c.strokeStyle = 'rgba(255,215,0,' + (0.7 + 0.3 * pulse) + ')'; roundRect(c, tl[0], tl[1], w, h, 8 * S.s + 4); c.stroke();
        c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#fff'; c.fillText('👇', tl[0] + w / 2, tl[1] - 14 + Math.sin(S.t * 7 + i) * 4);
      } else {
        c.fillStyle = 'rgba(40,15,30,0.28)'; roundRect(c, tl[0], tl[1], w, h, 8 * S.s + 4); c.fill();
      }
    }

    // 소품 상자 (끌고 있는 건 맨 위에, 살짝 크게)
    var order = S.props.slice().sort(function (a, b) { return (a.drag ? 1 : 0) - (b.drag ? 1 : 0); });
    order.forEach(function (p) {
      var sp = toScreen(p.x, p.y), size = p.drag ? 62 : 54;
      var bob = p.drag ? 0 : Math.sin(S.t * 4 + p.ph) * 2;
      if (p.type === 'ng' && !p.drag && NG_LIFE - (S.t - p.born) < 1.5 && Math.floor(S.t * 10) % 2 === 0) return;
      c.save(); c.translate(sp[0], sp[1] + bob);
      if (p.drag) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, size / 2 + 6, size * 0.45, 7, 0, 0, 6.3); c.fill(); }
      c.fillStyle = p.type === 'gold' ? '#FFE680' : (p.type === 'ng' ? '#5a1a22' : '#fff6e4');
      roundRect(c, -size / 2, -size / 2, size, size, 12); c.fill();
      c.lineWidth = 3; c.strokeStyle = p.type === 'gold' ? '#FFB800' : (p.type === 'ng' ? '#ff5a6a' : '#e6b87a');
      roundRect(c, -size / 2, -size / 2, size, size, 12); c.stroke();
      c.font = (p.drag ? 34 : 30) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#000'; c.fillText(p.emoji, 0, 2);
      c.restore();
    });

    // 성공 연출: 링 + 크게 톡 튀어나오는 글자
    S.bursts.forEach(function (b) {
      var k = Math.min(1, b.t / b.dur), bp = toScreen(b.x, b.y);
      c.globalAlpha = Math.max(0, 0.85 * (1 - k));
      c.strokeStyle = b.golden ? '#FFD700' : '#ff8fc4'; c.lineWidth = 2 + 7 * (1 - k);
      c.beginPath(); c.arc(bp[0], bp[1], 16 + k * (b.big ? 150 : 70), 0, 6.3); c.stroke();
      var sc = k < 0.25 ? 0.5 + (k / 0.25) * 0.75 : 1.25 - ((k - 0.25) / 0.75) * 0.25;
      c.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
      var bx = clamp(bp[0], 80, W - 80), by = bp[1] - 26 - k * 22;
      c.save(); c.translate(bx, by); c.scale(sc, sc);
      c.font = '900 ' + (b.big ? 36 : 26) + 'px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 7; c.strokeStyle = 'rgba(40,0,30,0.85)'; c.lineJoin = 'round';
      c.strokeText(b.text, 0, 0);
      c.fillStyle = b.golden ? '#FFD700' : '#fff'; c.fillText(b.text, 0, 0);
      c.restore();
    });
    c.globalAlpha = 1;
    c.restore();   // 흔들림 끝

    if (S.glow > 0) { c.fillStyle = 'rgba(255,225,240,' + Math.min(0.5, S.glow * 2.2) + ')'; c.fillRect(0, 0, W, H); }

    // 말풍선 팝업 (재료 이름 등)
    S.pops.forEach(function (p) {
      var sp = toScreen(p.x, p.y);
      c.globalAlpha = Math.max(0, 1 - p.t / 1.4);
      c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)';
      var tx = clamp(sp[0], 70, W - 70), ty = sp[1] - p.t * 40;
      c.strokeText(p.text, tx, ty);
      c.fillStyle = p.bad ? '#ff8a8a' : '#fff'; c.fillText(p.text, tx, ty);
    });
    c.globalAlpha = 1;

    // NG를 놓으면 붉게
    if (S.flash > 0) { c.fillStyle = 'rgba(255,60,60,' + (S.flash * 0.9) + ')'; c.fillRect(0, 0, W, H); }

    // 상단 HUD
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 10, 10, 92, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('← 나가기', 56, 28);
    var tw = Math.max(0, S.timeLeft / SESSION_SEC);
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 112, 20, W - 112 - 90, 16, 8); c.fill();
    c.fillStyle = tw < 0.25 ? '#ff6b6b' : '#ffb380';
    if (tw > 0.01) { roundRect(c, 114, 22, (W - 112 - 90 - 4) * tw, 12, 6); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W - 76, 10, 66, 36, 18); c.fill();
    c.fillStyle = S.perfect ? '#fff' : '#ffb0b0'; c.font = '700 13px "Noto Sans KR",sans-serif';
    c.fillText('🎬 ' + S.placed + '/' + TOTAL_PROPS, W - 43, 28);

    // 안내 문구 (HUD 바로 아래: 아래쪽은 소품이 나오는 자리라 비워둠)
    if (S.msgT > 0 && S.msg) {
      c.font = '700 14px "Noto Sans KR",sans-serif';
      var mw = c.measureText(S.msg).width + 28;
      c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, (W - mw) / 2, 56, mw, 34, 17); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(S.msg, W / 2, 73);
    }
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
    var got = S.collected.slice(), ov = S.overlay, perfect = S.perfect && S.placed >= TOTAL_PROPS;

    if (Math.random() < STONE_DROP) {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFB380;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🎬</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">' + (perfect ? '컷! OK! 완벽한 촬영!' : '촬영 세트장 탐험 끝!') + '</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="set-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FFB380,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🎬 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="set-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('set-close').onclick = function () { ov.remove(); };
    document.getElementById('set-again').onclick = function () { ov.remove(); startSet(); };
  }

  window.startSet = startSet;
  window.__setTest = { rollDrop: rollDrop, planDrops: planDrops, relight: relight, get S() { return S; }, SLOT_CX: SLOT_CX, SLOT_CY: SLOT_CY, TOTAL_PROPS: TOTAL_PROPS };

  // ── 숲 "촬영장 가기" 버튼을 이 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__setHooked) return;
    window.__setHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'forest') { startSet(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
