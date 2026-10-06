// ════════════════════════════════
// 💪 연습생 숙소촌 헬스장 탐험 (housing-explore.js)
// 숙소촌의 "🎤 연습실 가기" 버튼(startExplore('housing'))만 새 방식으로 연결한다. 다른 지역 탐험은 그대로.
//
// 흐름: 스태미나 10 소모 → 35초 동안
//   운동기구를 연타해서 열심히 연습하기 → 게이지가 차면 ✨별빛 재료가 우수수 떨어짐 → 떨어지는 재료를 탭해서 줍기
//   😴 지친 연습생이 같이 떨어질 때가 있음 (누르면 시간 -3초, 그냥 두면 사라짐)
//   ✨ 반짝이는 기구 1개: 거기서는 희귀 재료가 확정으로 나옴
//   화면을 좌우로 밀거나 양쪽 화살표(◀ ▶)로 다른 기구로 이동
// 기구를 전부 쓰고 재료를 다 주우면 일찍 끝남. 재조합석 18% 판정은 기존 탐험과 동일.
//
// 재료는 기존 재료 이름만 사용한다 (새 재료 없음). 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// 만든 방식은 forest-explore.js 와 같다. game.js 는 건드리지 않는다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SESSION_SEC = 35;       // 탐험 시간
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.18;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var HIT_NEED = 8;           // 기구 하나를 연타해서 재료가 떨어지게 하는 데 필요한 탭 수
  var HIT_DECAY = 1.0;        // 가만히 있으면 게이지가 초당 이만큼 줄어듦
  var EXTRA_DROP = 0.25;      // 기구 하나에서 재료가 2개 떨어질 확률 (기본은 1개)
  var TIRED_CHANCE = 0.25;    // 기구 하나에서 😴가 같이 떨어질 확률
  var TIRED_PENALTY = 3;      // 😴를 누르면 줄어드는 시간(초)
  var GROUND_LIFE = 3.0;      // 바닥에 떨어진 재료가 사라지기까지 (초)
  var BG_FILE = 'map-gym.png';
  var FRAC = 0.62;            // 화면에 한 번에 보이는 헬스장 가로 비율 (작을수록 확대)

  // 이미지 좌표(1536x1024) 기준 기구 위치 (대략값. 어색하면 숫자만 조절)
  // x: 기구 중심, w: 탭 반폭, y0~y1: 탭 가능한 높이 범위
  var IMG_W = 1536, IMG_H = 1024;
  var GEARS = [
    { name: '샌드백',     x: 0.105, w: 0.060, y0: 0.14, y1: 0.55 },
    { name: '덤벨랙',     x: 0.250, w: 0.088, y0: 0.36, y1: 0.56 },
    { name: '러닝머신 1', x: 0.450, w: 0.068, y0: 0.32, y1: 0.58 },
    { name: '러닝머신 2', x: 0.573, w: 0.077, y0: 0.32, y1: 0.58 },
    { name: '랫풀다운',   x: 0.710, w: 0.100, y0: 0.20, y1: 0.57 },
    { name: '벤치',       x: 0.910, w: 0.068, y0: 0.46, y1: 0.64 }
  ];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  // 기존 재료 이름만 사용. 숙소촌 전용 목록이라 game.js의 EXPLORE_MATERIALS는 건드리지 않는다.
  var POOLS = {
    normal: ['빛나는돌', '별빛모래', '네잎클로버', '고급원목'],
    rare: ['행운의잎', '달의눈물']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.housing) return EXPLORE_MATERIALS.housing;
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

  // 한 번 채웠을 때 떨어지는 것들: [{...재료}, ..., {tired:true}]
  function planDrops(luck, rng, golden) {
    rng = rng || Math.random;
    var n = 1 + (rng() < EXTRA_DROP ? 1 : 0);
    var out = [];
    for (var i = 0; i < n; i++) out.push(rollDrop(luck, rng, golden && i === 0));
    if (rng() < TIRED_CHANCE) out.splice(Math.floor(rng() * (out.length + 1)), 0, { tired: true });
    return out;
  }

  var S = null;

  // ════════ 화면 ════════
  function startHousing() {
    if (document.getElementById('housing-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'housing-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#1a1020;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image();
    bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    var goldenIdx = Math.floor(Math.random() * GEARS.length);
    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0, camX: 0.3 * IMG_W, camTarget: 0.3 * IMG_W,
      gears: GEARS.map(function (g, i) {
        var y0 = g.y0 * IMG_H, y1 = g.y1 * IMG_H;
        return { x: g.x * IMG_W, hw: g.w * IMG_W, y0: y0, y1: y1, cy: y0 + (y1 - y0) * 0.35, hit: 0, anim: 0, done: false, golden: i === goldenIdx };
      }),
      items: [], sparks: [], pops: [], collected: [], timeLeft: SESSION_SEC, flash: 0,
      msg: '', msgT: 0, pointer: null, last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    say('운동기구를 연타해서 연습해봐요! 💪 (밀어서 이동)', 4);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = Math.max(S.W / (FRAC * IMG_W), 0.68 * S.H / IMG_H);
    clampCam();
  }
  function visW() { return S.W / S.s; }
  function clampCam() {
    var half = Math.min(visW(), IMG_W) / 2;
    S.camX = Math.max(half, Math.min(IMG_W - half, S.camX));
    S.camTarget = Math.max(half, Math.min(IMG_W - half, S.camTarget));
  }
  function layout() {
    var dw = IMG_W * S.s, dh = IMG_H * S.s;
    S.ox = S.W / 2 - S.camX * S.s;
    S.oy = dh <= S.H ? (S.H - dh) / 2 : Math.min(0, Math.max(S.H - dh, S.H / 2 - 0.5 * dh));
  }
  function toScreen(x, y) { return [x * S.s + S.ox, y * S.s + S.oy]; }
  function toImage(x, y) { return [(x - S.ox) / S.s, (y - S.oy) / S.s]; }

  // ── 입력 ──
  function pos(e) {
    var r = S.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var p = pos(e);
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    S.pointer = { id: e.pointerId, x0: p[0], y0: p[1], cam0: S.camTarget, moved: false };
  }
  function onMove(e) {
    if (!S || S.ended || !S.pointer || S.pointer.id !== e.pointerId) return;
    var p = pos(e), dx = p[0] - S.pointer.x0;
    if (!S.pointer.moved && Math.abs(dx) > 12) S.pointer.moved = true;
    if (S.pointer.moved) {
      S.camTarget = S.pointer.cam0 - dx / S.s;
      S.camX = S.camTarget;
      clampCam();
    }
  }
  function onUp(e) {
    if (!S || S.ended || !S.pointer || S.pointer.id !== e.pointerId) return;
    var ptr = S.pointer; S.pointer = null;
    if (ptr.moved) return;
    tap(ptr.x0, ptr.y0);
  }
  function onCancel() { if (S) S.pointer = null; }

  function tap(x, y) {
    if (x < 110 && y < 56) { finish(); return; }                          // 나가기
    var arrowY = S.H / 2;
    if (Math.abs(y - arrowY) < 60) {
      if (x < 48) { S.camTarget -= visW() * 0.45; clampCam(); return; }
      if (x > S.W - 48) { S.camTarget += visW() * 0.45; clampCam(); return; }
    }
    // 1) 떨어진 재료 / 😴
    var best = null, bd = 1e9;
    S.items.forEach(function (it) {
      if (it.gone) return;
      var sp = toScreen(it.x, it.y), d = Math.hypot(sp[0] - x, sp[1] - (y + 4));
      if (d < 36 && d < bd) { bd = d; best = it; }
    });
    if (best) { pickItem(best); return; }
    // 2) 기구 연타
    var im = toImage(x, y);
    var hit = null;
    S.gears.forEach(function (g) {
      var hw = Math.max(g.hw, 30 / S.s);
      if (Math.abs(im[0] - g.x) <= hw && im[1] >= g.y0 && im[1] <= g.y1 + 20) hit = g;
    });
    if (hit) hitGear(hit);
  }

  function hitGear(g) {
    if (g.done) { say('이 기구는 이미 다 썼어요 💦', 1.2); return; }
    g.hit += 1;
    g.anim = 0.25;
    if (window.pocaSfx) window.pocaSfx.play('shake');
    for (var i = 0; i < 3; i++) addSpark(g.x + (Math.random() - 0.5) * g.hw * 2, g.y0 + Math.random() * (g.y1 - g.y0));
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (g.hit >= HIT_NEED) dropFromGear(g);
  }

  function addSpark(x, y) {
    var cols = ['#ffd1e8', '#ffe27a', '#ffffff', '#ffb3d9'];
    S.sparks.push({ x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: -20 + Math.random() * 60, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, life: 1.0 + Math.random() * 0.8, col: cols[Math.floor(Math.random() * cols.length)] });
  }

  function dropFromGear(g) {
    if (window.pocaSfx) window.pocaSfx.play('treeDrop');
    g.done = true; g.hit = HIT_NEED;
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var drops = planDrops(luck, Math.random, g.golden);
    drops.forEach(function (d, i) {
      var lx = Math.max(70, Math.min(IMG_W - 70, g.x + (Math.random() - 0.5) * 260));
      S.items.push({
        d: d, tired: !!d.tired, x: g.x + (Math.random() - 0.5) * 60, y: g.cy, ys: g.cy, x1: lx,
        ly: (0.74 + Math.random() * 0.16) * IMG_H, vy: 0, delay: i * 0.18, state: 'wait', life: GROUND_LIFE, bounced: false, gone: false, t0: 0
      });
    });
    for (var k = 0; k < 14; k++) addSpark(g.x + (Math.random() - 0.5) * g.hw * 3, g.y0 + Math.random() * (g.y1 - g.y0));
    if (g.golden) S.pops.push({ x: g.x, y: g.y0, text: '✨ 반짝이는 기구!', t: 0 });
    var left = S.gears.filter(function (q) { return !q.done; }).length;
    say(left ? '별빛을 탭해서 주워요! (남은 기구 ' + left + ')' : '마지막 재료를 주워요!', 2);
  }

  function pickItem(it) {
    it.gone = true;
    if (it.tired) {
      S.timeLeft = Math.max(0, S.timeLeft - TIRED_PENALTY);
      S.flash = 0.35;
      S.pops.push({ x: it.x, y: it.y - 30, text: '😴 지친 연습생! -' + TIRED_PENALTY + '초', t: 0, bad: true });
      if (navigator.vibrate) { try { navigator.vibrate([80, 40, 80]); } catch (e) {} }
      return;
    }
    var d = it.d, label = null, emoji = '✨';
    var before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);   // 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label);
    S.pops.push({ x: it.x, y: it.y - 30, text: emoji + ' ' + label + (d.isRare ? ' ✨' : ''), t: 0 });
    if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    S.timeLeft -= dt;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.flash > 0) S.flash -= dt;

    // 카메라 부드럽게
    if (!(S.pointer && S.pointer.moved)) S.camX += (S.camTarget - S.camX) * Math.min(1, dt * 8);

    S.gears.forEach(function (g) {
      if (g.anim > 0) g.anim -= dt;
      if (!g.done && g.hit > 0) g.hit = Math.max(0, g.hit - HIT_DECAY * dt);
    });

    S.items.forEach(function (it) {
      if (it.gone) return;
      if (it.state === 'wait') { it.delay -= dt; if (it.delay <= 0) { it.state = 'fall'; it.t0 = 0; it.xs = it.x; } return; }
      if (it.state === 'fall') {
        it.t0 += dt;
        it.vy += 1500 * dt;
        it.y += it.vy * dt;
        var span = Math.max(1, it.ly - it.ys);
        var prog = Math.max(0, Math.min(1, (it.y - it.ys) / span));
        it.x = it.xs + (it.x1 - it.xs) * prog;
        if (it.y >= it.ly) {
          it.y = it.ly;
          if (!it.bounced) { it.bounced = true; it.vy = -it.vy * 0.3; }
          else { it.state = 'ground'; it.vy = 0; }
        }
      } else if (it.state === 'ground') {
        it.life -= dt;
        if (it.life <= 0) {
          it.gone = true;
          S.pops.push({ x: it.x, y: it.y - 30, text: it.tired ? '😴 가버렸어요' : '😢 놓쳤어요', t: 0, dim: true });
        }
      }
    });
    S.items = S.items.filter(function (it) { return !it.gone; });

    S.sparks.forEach(function (l) { l.life -= dt; l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.vr * dt; });
    S.sparks = S.sparks.filter(function (l) { return l.life > 0; });
    S.pops.forEach(function (p) { p.t += dt; });
    S.pops = S.pops.filter(function (p) { return p.t < 1.4; });

    // 끝났는지
    var allDone = S.gears.every(function (g) { return g.done; }) && S.items.length === 0;
    if (S.timeLeft <= 0) { finish(); return; }
    if (allDone) {
      if (S.endDelay < 0) S.endDelay = 0.7;
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
    layout();

    if (S.bgOk) {
      // 위아래 빈 곳: 같은 그림을 크게 깔고 어둡게
      var cs = Math.max(W / IMG_W, H / IMG_H), cw = IMG_W * cs, ch = IMG_H * cs;
      try { c.filter = 'blur(10px)'; } catch (e) {}
      c.drawImage(S.bg, (W - cw) / 2, (H - ch) / 2, cw, ch);
      try { c.filter = 'none'; } catch (e) {}
      c.fillStyle = 'rgba(20,5,15,0.5)'; c.fillRect(0, 0, W, H);

      c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);

      // 연타 맞은 기구: 그 기구 부분만 살짝 옆으로 밀어서 한 번 더 그림 (덜컹 효과)
      S.gears.forEach(function (g) {
        if (g.anim <= 0) return;
        var amp = Math.sin(S.t * 60) * 7 * (g.anim / 0.25);
        var sx = Math.max(0, g.x - g.hw), sw = Math.min(IMG_W - sx, g.hw * 2), sy = g.y0, sh = g.y1 - g.y0;
        var d = toScreen(sx + amp, sy);
        c.drawImage(S.bg, sx, sy, sw, sh, d[0], d[1], sw * S.s, sh * S.s);
      });
    } else {
      c.fillStyle = '#2a1a2e'; c.fillRect(0, 0, W, H);
    }

    // 기구 표시 + 게이지
    S.gears.forEach(function (g) {
      var p = toScreen(g.x, g.cy);
      if (p[0] < -60 || p[0] > W + 60) return;
      if (g.done) return;
      var bounce = Math.sin(S.t * 5 + g.x) * 5;
      c.font = '28px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(g.golden ? '✨' : '👆', p[0], p[1] - 34 + bounce);
      var bw = 64, bx = p[0] - bw / 2, by = p[1] + 4;
      c.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(c, bx - 2, by - 2, bw + 4, 12, 6); c.fill();
      c.fillStyle = g.golden ? '#FFD700' : '#ff8fc4';
      var w = bw * Math.min(1, g.hit / HIT_NEED);
      if (w > 1) { roundRect(c, bx, by, w, 8, 4); c.fill(); }
    });

    // 반짝이 조각
    S.sparks.forEach(function (l) {
      var p = toScreen(l.x, l.y);
      c.save(); c.translate(p[0], p[1]); c.rotate(l.rot);
      c.globalAlpha = Math.min(1, l.life * 1.5);
      c.fillStyle = l.col; c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('✦', 0, 0);
      c.restore();
    });
    c.globalAlpha = 1;

    // 재료 / 😴
    S.items.forEach(function (it) {
      if (it.state === 'wait') return;
      var p = toScreen(it.x, it.y);
      var blink = it.state === 'ground' && it.life < 1.0 && Math.floor(S.t * 10) % 2 === 0;
      if (blink) return;
      var emoji = it.tired ? '😴' : (it.d.isWish ? '🧩' : (typeof getMaterialEmoji === 'function' ? getMaterialEmoji(it.d.name) : '✨'));
      var bob = it.state === 'ground' ? Math.sin(S.t * 6 + it.x) * 3 : 0;
      if (!it.tired) {
        c.fillStyle = it.d.isRare ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.25)';
        c.beginPath(); c.arc(p[0], p[1] + bob, 24, 0, 6.3); c.fill();
      }
      c.font = '34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(emoji, p[0], p[1] + bob);
    });

    // 말풍선 팝업
    S.pops.forEach(function (p) {
      var sp = toScreen(p.x, p.y);
      c.globalAlpha = Math.max(0, 1 - p.t / 1.4);
      c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)';
      var tx = Math.max(70, Math.min(W - 70, sp[0])), ty = sp[1] - p.t * 40;
      c.strokeText(p.text, tx, ty);
      c.fillStyle = p.bad ? '#ff8a8a' : (p.dim ? '#bbb' : '#fff');
      c.fillText(p.text, tx, ty);
    });
    c.globalAlpha = 1;

    // 😴를 누르면 붉게
    if (S.flash > 0) { c.fillStyle = 'rgba(255,60,60,' + (S.flash * 0.9) + ')'; c.fillRect(0, 0, W, H); }

    // 좌우 이동 화살표
    var half = Math.min(visW(), IMG_W) / 2;
    c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (S.camX > half + 4) { c.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(c, 4, H / 2 - 28, 40, 56, 14); c.fill(); c.fillStyle = '#fff'; c.fillText('◀', 24, H / 2); }
    if (S.camX < IMG_W - half - 4) { c.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(c, W - 44, H / 2 - 28, 40, 56, 14); c.fill(); c.fillStyle = '#fff'; c.fillText('▶', W - 24, H / 2); }

    // 상단 HUD
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 10, 10, 92, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif'; c.textAlign = 'center';
    c.fillText('← 나가기', 56, 28);
    var tw = Math.max(0, S.timeLeft / SESSION_SEC);
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 112, 20, W - 112 - 90, 16, 8); c.fill();
    c.fillStyle = tw < 0.25 ? '#ff6b6b' : '#ff8fc4';
    if (tw > 0.01) { roundRect(c, 114, 22, (W - 112 - 90 - 4) * tw, 12, 6); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W - 76, 10, 66, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif';
    c.fillText('✨ ' + S.collected.length, W - 43, 28);

    // 하단 안내
    if (S.msgT > 0 && S.msg) {
      c.font = '700 14px "Noto Sans KR",sans-serif';
      var mw = c.measureText(S.msg).width + 28;
      c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, (W - mw) / 2, H - 70, mw, 34, 17); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(S.msg, W / 2, H - 53);
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
    var got = S.collected.slice(), ov = S.overlay;

    if (Math.random() < STONE_DROP) {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 주웠어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">💪</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">연습실 탐험 끝!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="housing-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">💪 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="housing-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('housing-close').onclick = function () { ov.remove(); };
    document.getElementById('housing-again').onclick = function () { ov.remove(); startHousing(); };
  }

  window.startHousing = startHousing;
  window.__housingTest = { rollDrop: rollDrop, planDrops: planDrops, get S() { return S; }, GEARS: GEARS, HIT_NEED: HIT_NEED };

  // ── 숙소촌 "연습실 가기" 버튼만 새 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__housingHooked) return;
    window.__housingHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'housing') { startHousing(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
