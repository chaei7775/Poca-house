// ════════════════════════════════
// 🏖️ 해변 모래 파기 탐험 (beach-explore.js)
// 해변의 "🏖️ 해변 탐험" 버튼(startExplore('beach'))만 새 방식으로 바꾼다. 다른 지역 탐험은 그대로.
//
// 흐름: 스태미나 10 소모 → 35초 동안
//   모래 위에서 반짝이는 ✦ 자리를 찾아 손가락으로 쓱쓱 문질러서 파기 → 다 파면 재료가 나옴
//   바다 쪽 ✦(노란색)은 희귀 재료가 묻혀 있음. 대신 파도가 오면 그 자리가 쓸려서 진행도가 줄어듦
//   🌊 파도: 경고가 뜨고 잠깐 뒤 해안선 쪽 모래를 덮음. 덮인 동안엔 거기서 못 팜
// 다 파면 일찍 끝남. 재조합석 15% 판정은 기존 탐험과 동일.
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SESSION_SEC = 35;       // 탐험 시간
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.18;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var DIG_NEED = 1800;        // 한 자리를 파는 데 필요한 문지르기 길이 (클수록 오래 문질러야 함)
  var DIG_R = 65;             // 자리 중심에서 이 거리 안에서 문질러야 파짐 (이미지 px)
  var WAVE_FIRST = 8;         // 첫 파도가 오는 시간(초)
  var WAVE_EVERY = 9;         // 파도 간격(초)
  var WAVE_WARN = 1.2;        // 경고 시간(초)
  var WAVE_WASH = 1.8;        // 파도가 덮고 있는 시간(초)
  var WAVE_KEEP = 0.35;       // 파도가 지나가면 해안 쪽 자리의 진행도가 이 비율만 남음
  var BG_FILE = 'map-beach.png';
  var VIEW_CX = 995;          // 화면 가운데에 오는 이미지 x (모래사장이 가운데 오게)
  var VIEW_W = 700;           // 화면에 보이는 가로 폭(이미지 px, 모바일 세로 화면 기준)

  // 이미지 좌표(1672x941) 기준 모래사장 (대략값. 어색하면 숫자만 조절)
  var IMG_W = 1672, IMG_H = 941;
  var SAND = [[640, 478], [780, 462], [785, 492], [825, 540], [915, 610], [1015, 680], [1115, 740], [1215, 810], [1310, 860], [1350, 941],
              [1010, 941], [960, 880], [900, 810], [840, 730], [780, 680], [720, 620], [660, 560]];
  // 파도가 덮는 해안선 쪽 띠
  var SHORE = [[785, 492], [825, 540], [915, 610], [1015, 680], [1115, 740], [1215, 810], [1310, 860], [1350, 941]];
  var BAND = SHORE.concat(SHORE.slice().reverse().map(function (p) { return [p[0] - 85, p[1] + 100]; }));

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['반짝이는조개', '달빛모래', '별빛모래', '맑은샘물'],
    rare: ['바다진주', '달의눈물']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.beach) return EXPLORE_MATERIALS.beach;
    return POOLS;
  }

  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  // 기존 탐험과 같은 방식으로 재료 하나 뽑기
  function rollDrop(luck, rng) {
    rng = rng || Math.random;
    var p = pools();
    var rareChance = Math.min(0.80, 0.30 + (luck || 0) / 100);
    var isRare = rng() < rareChance;
    var pool = isRare ? p.rare : p.normal;
    var mat = pool[Math.floor(rng() * pool.length)];
    var isWish = rng() < 0.005;
    return { name: isWish ? null : mat, isWish: isWish, isRare: isRare };
  }

  // 묻힌 자리 만들기: 개수는 기존 탐험과 같은 4~7개. 희귀는 해안 쪽, 일반은 안쪽에 묻힘
  function planSpots(luck, rng) {
    rng = rng || Math.random;
    var count = 4 + Math.floor(rng() * 4);
    var spots = [];
    for (var i = 0; i < count; i++) {
      var d = rollDrop(luck, rng);
      var pt = null;
      for (var tries = 0; tries < 200 && !pt; tries++) {
        var x = 640 + rng() * 720, y = 470 + rng() * 460;
        if (!pointInPoly(x, y, SAND)) continue;
        var inBand = pointInPoly(x, y, BAND);
        if (tries < 150 && inBand !== d.isRare) continue;     // 150번까지는 구역을 지켜서 찾고, 안 되면 아무 데나
        if (y > 905) continue;                                // 화면 맨 아래 가장자리는 피함
        var ok = spots.every(function (s) { return Math.hypot(s.x - x, s.y - y) > 115; });
        if (ok) pt = [x, y];
      }
      if (!pt) continue;
      spots.push({ x: pt[0], y: pt[1], d: d, dug: 0, done: false, inBand: pointInPoly(pt[0], pt[1], BAND) });
    }
    return spots;
  }

  var S = null;

  // ════════ 화면 ════════
  function startBeach() {
    if (document.getElementById('beach-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'beach-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#12303f;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image();
    bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    var trail = document.createElement('canvas');
    trail.width = Math.round(IMG_W / 2); trail.height = Math.round(IMG_H / 2);

    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false, trail: trail, tctx: trail.getContext('2d'),
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      spots: planSpots(luck), puffs: [], pops: [], collected: [], timeLeft: SESSION_SEC,
      wave: { state: 'idle', t: 0, next: WAVE_FIRST }, flash: 0,
      msg: '', msgT: 0, pointer: null, last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    say('✦ 반짝이는 곳을 손가락으로 쓱쓱 문질러서 파봐요! ⛏️', 4);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = Math.max(S.W / VIEW_W, 0.62 * S.H / IMG_H);
    var dw = IMG_W * S.s, dh = IMG_H * S.s;
    S.ox = Math.min(0, Math.max(S.W - dw, S.W / 2 - VIEW_CX * S.s));
    S.oy = dh <= S.H ? (S.H - dh) / 2 : Math.min(0, Math.max(S.H - dh, S.H / 2 - 0.72 * dh));
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
    if (p[0] < 110 && p[1] < 56) { finish(); return; }          // 나가기
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    var im = toImage(p[0], p[1]);
    S.pointer = { id: e.pointerId, x: im[0], y: im[1] };
  }
  function onMove(e) {
    if (!S || S.ended || !S.pointer || S.pointer.id !== e.pointerId) return;
    var p = pos(e), im = toImage(p[0], p[1]);
    var x0 = S.pointer.x, y0 = S.pointer.y, x1 = im[0], y1 = im[1];
    S.pointer.x = x1; S.pointer.y = y1;
    dig(x0, y0, x1, y1);
  }
  function onUp(e) { if (S && S.pointer && S.pointer.id === e.pointerId) S.pointer = null; }

  function washing() { return S.wave.state === 'wash'; }

  function dig(x0, y0, x1, y1) {
    var len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) return;
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (!pointInPoly(mx, my, SAND)) return;                       // 모래 밖은 못 팜
    if (washing() && pointInPoly(mx, my, BAND)) {                 // 파도가 덮은 곳
      if (S.msgT <= 0) say('🌊 파도가 덮고 있어요! 잠깐만 기다려요', 1);
      return;
    }
    if (window.pocaSfx) window.pocaSfx.play('dig'); 
    len = Math.min(len, 120);                                     // 한 번에 너무 멀리 훑어도 인정은 일정하게
    // 파인 자국
    var t = S.tctx;
    t.strokeStyle = 'rgba(176,134,88,0.30)'; t.lineWidth = 30; t.lineCap = 'round';
    t.beginPath(); t.moveTo(x0 / 2, y0 / 2); t.lineTo(x1 / 2, y1 / 2); t.stroke();
    if (Math.random() < 0.6) addPuff(mx, my);
    // 묻힌 자리 진행도
    S.spots.forEach(function (sp) {
      if (sp.done) return;
      if (Math.hypot(sp.x - mx, sp.y - my) > DIG_R) return;
      sp.dug += len;
      sp.shake = 0.15;
      if (sp.dug >= DIG_NEED) reveal(sp);
    });
  }

  function addPuff(x, y) {
    S.puffs.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 0.5 + Math.random() * 0.3, r: 3 + Math.random() * 3 });
  }

  function reveal(sp) {
    if (window.pocaSfx) window.pocaSfx.play('digFind'); 
    sp.done = true;
    var d = sp.d, label = null, emoji = '✨';
    var before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);   // 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label);
    S.pops.push({ x: sp.x, y: sp.y - 20, text: emoji + ' ' + label + (d.isRare ? ' ✨' : ''), t: 0 });
    for (var i = 0; i < 14; i++) addPuff(sp.x, sp.y);
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
    var left = S.spots.filter(function (q) { return !q.done; }).length;
    if (left) say('남은 자리 ' + left + '곳', 1.5);
  }

  // ── 파도 ──
  function updateWave(dt) {
    var w = S.wave;
    if (w.state === 'idle') {
      if (S.t >= w.next) { w.state = 'warn'; w.t = 0; say('🌊 파도가 온다! 바다 쪽 자리는 쓸려요!', WAVE_WARN + 0.4); }
    } else if (w.state === 'warn') {
      w.t += dt;
      if (w.t >= WAVE_WARN) {
        w.state = 'wash'; w.t = 0;
        S.spots.forEach(function (sp) {
          if (!sp.done && sp.inBand && sp.dug > 0) {
            sp.dug *= WAVE_KEEP;
            S.pops.push({ x: sp.x, y: sp.y - 20, text: '🌊 되돌아갔어요', t: 0, bad: true });
          }
        });
        if (navigator.vibrate) { try { navigator.vibrate([40, 30, 40]); } catch (e) {} }
      }
    } else if (w.state === 'wash') {
      w.t += dt;
      // 덮인 동안 해안 쪽 파인 자국도 지움
      var t = S.tctx;
      t.save(); t.beginPath();
      BAND.forEach(function (p, i) { if (i === 0) t.moveTo(p[0] / 2, p[1] / 2); else t.lineTo(p[0] / 2, p[1] / 2); });
      t.closePath(); t.clip();
      t.globalCompositeOperation = 'destination-out'; t.fillStyle = 'rgba(0,0,0,' + Math.min(1, dt * 1.5) + ')';
      t.fillRect(0, 0, S.trail.width, S.trail.height);
      t.restore();
      if (w.t >= WAVE_WASH) { w.state = 'idle'; w.next = S.t + WAVE_EVERY; }
    }
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    S.timeLeft -= dt;
    if (S.msgT > 0) S.msgT -= dt;

    updateWave(dt);
    S.spots.forEach(function (sp) { if (sp.shake > 0) sp.shake -= dt; });
    S.puffs.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; });
    S.puffs = S.puffs.filter(function (p) { return p.life > 0; });
    S.pops.forEach(function (p) { p.t += dt; });
    S.pops = S.pops.filter(function (p) { return p.t < 1.5; });

    var allDone = S.spots.every(function (sp) { return sp.done; });
    if (S.timeLeft <= 0) { finish(); return; }
    if (allDone) {
      if (S.endDelay < 0) S.endDelay = 1.0;
      S.endDelay -= dt;
      if (S.endDelay <= 0) { finish(); return; }
    }

    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function polyPath(c, poly) {
    c.beginPath();
    poly.forEach(function (p, i) { var q = toScreen(p[0], p[1]); if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); });
    c.closePath();
  }

  function draw() {
    if (!S || S.ended) return;
    var c = S.ctx, W = S.W, H = S.H;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    if (S.bgOk) {
      var cs = Math.max(W / IMG_W, H / IMG_H), cw = IMG_W * cs, ch = IMG_H * cs;
      try { c.filter = 'blur(10px)'; } catch (e) {}
      c.drawImage(S.bg, (W - cw) / 2, (H - ch) / 2, cw, ch);
      try { c.filter = 'none'; } catch (e) {}
      c.fillStyle = 'rgba(8,24,36,0.5)'; c.fillRect(0, 0, W, H);
      c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    } else {
      c.fillStyle = '#1b4a5c'; c.fillRect(0, 0, W, H);
    }

    // 파인 자국 (모래 위에만)
    c.save(); polyPath(c, SAND); c.clip();
    c.drawImage(S.trail, 0, 0, S.trail.width, S.trail.height, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    c.restore();

    // 묻힌 자리: 반짝임 / 진행도
    S.spots.forEach(function (sp) {
      if (sp.done) return;
      var p = toScreen(sp.x, sp.y);
      var pr = Math.min(1, sp.dug / DIG_NEED);
      var jitter = sp.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
      var tw = 0.55 + 0.45 * Math.sin(S.t * 4 + sp.x);
      c.save(); c.translate(p[0] + jitter, p[1]);
      c.fillStyle = sp.d.isRare ? 'rgba(255,215,0,' + tw + ')' : 'rgba(255,255,255,' + tw + ')';
      var r = 9 + 3 * tw;
      c.beginPath();
      c.moveTo(0, -r); c.quadraticCurveTo(1.5, -1.5, r, 0); c.quadraticCurveTo(1.5, 1.5, 0, r);
      c.quadraticCurveTo(-1.5, 1.5, -r, 0); c.quadraticCurveTo(-1.5, -1.5, 0, -r); c.fill();
      if (pr > 0) {
        c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.beginPath(); c.arc(0, 0, 22, 0, 6.3); c.stroke();
        c.strokeStyle = sp.d.isRare ? '#FFD700' : '#8be0ff';
        c.beginPath(); c.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + 6.283 * pr); c.stroke();
      }
      c.restore();
    });

    // 모래 먼지
    S.puffs.forEach(function (pf) {
      var p = toScreen(pf.x, pf.y);
      c.globalAlpha = Math.max(0, Math.min(1, pf.life * 2));
      c.fillStyle = '#e8d3a6'; c.beginPath(); c.arc(p[0], p[1], pf.r, 0, 6.3); c.fill();
    });
    c.globalAlpha = 1;

    // 파도
    var w = S.wave;
    c.save(); c.beginPath(); c.rect(S.ox, S.oy, IMG_W * S.s, IMG_H * S.s); c.clip();
    if (w.state === 'warn') {
      var a = 0.25 + 0.25 * Math.sin(w.t * 14);
      c.save(); polyPath(c, BAND); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,' + (a + 0.3) + ')'; c.setLineDash([10, 8]); c.stroke();
      c.fillStyle = 'rgba(120,200,255,' + (a * 0.5) + ')'; c.fill(); c.restore();
    } else if (w.state === 'wash') {
      var k = w.t / WAVE_WASH, al = k < 0.25 ? k / 0.25 : (k > 0.75 ? (1 - k) / 0.25 : 1);
      c.save(); polyPath(c, BAND);
      c.fillStyle = 'rgba(110,195,255,' + (0.62 * al) + ')'; c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,' + (0.8 * al) + ')'; c.stroke(); c.restore();
    }
    c.restore();

    // 팝업
    S.pops.forEach(function (p) {
      var sp = toScreen(p.x, p.y);
      c.globalAlpha = Math.max(0, 1 - p.t / 1.5);
      c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)';
      var tx = Math.max(70, Math.min(W - 70, sp[0])), ty = sp[1] - p.t * 40;
      c.strokeText(p.text, tx, ty);
      c.fillStyle = p.bad ? '#ff9a9a' : '#fff';
      c.fillText(p.text, tx, ty);
    });
    c.globalAlpha = 1;

    // 상단 HUD
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 10, 10, 92, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('← 나가기', 56, 28);
    var tw2 = Math.max(0, S.timeLeft / SESSION_SEC);
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 112, 20, W - 112 - 90, 16, 8); c.fill();
    c.fillStyle = tw2 < 0.25 ? '#ff6b6b' : '#7dd3fc';
    if (tw2 > 0.01) { roundRect(c, 114, 22, (W - 112 - 90 - 4) * tw2, 12, 6); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W - 76, 10, 66, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif';
    c.fillText('🐚 ' + S.collected.length + '/' + S.spots.length, W - 43, 28);

    // 다음 파도까지 표시
    var wl = w.state === 'idle' ? Math.max(0, w.next - S.t) : 0;
    if (w.state === 'idle' && wl < 3.5) {
      c.font = '700 12px "Noto Sans KR",sans-serif'; c.fillStyle = '#bfe8ff'; c.textAlign = 'center';
      c.fillText('🌊 곧 파도…', W / 2, 62);
    }

    if (S.msgT > 0 && S.msg) {
      c.font = '700 14px "Noto Sans KR",sans-serif'; c.textBaseline = 'middle';
      var mw = c.measureText(S.msg).width + 28;
      c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, (W - mw) / 2, H - 70, mw, 34, 17); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center';
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
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 찾았어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #38BDF8;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🏖️</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">해변 탐험 끝!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="beach-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#38BDF8,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🏖️ 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="beach-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('beach-close').onclick = function () { ov.remove(); };
    document.getElementById('beach-again').onclick = function () { ov.remove(); startBeach(); };
  }

  window.startBeach = startBeach;
  window.__beachTest = { planSpots: planSpots, rollDrop: rollDrop, pointInPoly: pointInPoly, SAND: SAND, BAND: BAND, get S() { return S; }, DIG_NEED: DIG_NEED };

  // ── 해변 "탐험" 버튼만 새 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__beachHooked) return;
    window.__beachHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'beach') { startBeach(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
