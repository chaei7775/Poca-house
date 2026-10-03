// ════════════════════════════════
// 🦋 꽃길공원 나비 잡기 탐험 (park-explore.js)
// 공원의 "🌸 꽃길공원 산책" 버튼(startExplore('park'))만 새 방식으로 바꾼다. 다른 지역 탐험은 그대로.
//
// 흐름: 스태미나 10 소모 → 30초 동안
//   공원을 날아다니는 나비를 탭해서 잡기 → 나비마다 재료를 하나씩 품고 있음
//   🌸 가끔 꽃에 앉아서 쉼 (그때가 기회, 대신 가까이서 헛탭하면 놀라서 도망감)
//   ✨ 금빛 나비는 희귀 재료를 품고 있고 더 빠름
//   못 잡고 시간이 지나면 나비는 하늘로 날아가 버림
// 다 잡거나 다 날아가면 일찍 끝남. 재조합석 15% 판정은 기존 탐험과 동일.
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SESSION_SEC = 30;       // 탐험 시간
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.15;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var SPEED = 115;            // 일반 나비 속도(화면 px/초)
  var SPEED_RARE = 165;       // 금빛 나비 속도
  var CATCH_R = 34;           // 날고 있는 나비를 잡을 수 있는 거리(화면 px)
  var CATCH_R_REST = 44;      // 꽃에 앉은 나비를 잡을 수 있는 거리
  var SPOOK_R = 120;          // 헛탭하면 이 거리 안의 나비가 놀라서 도망감
  var SPOOK_SEC = 0.8;        // 놀란 상태 지속 시간
  var LIFE_MIN = 10, LIFE_MAX = 17;   // 나비가 머무는 시간(초). 지나면 하늘로 날아감
  var REST_MIN = 1.4, REST_MAX = 2.4; // 꽃에 앉아 쉬는 시간(초)
  var BG_FILE = 'map-park.png';

  // 이미지 좌표(1672x941) 기준 나비가 앉는 꽃밭 (대략값)
  var IMG_W = 1672, IMG_H = 941;
  var FLOWERS = [[1010, 700], [830, 565], [1180, 560], [620, 515], [430, 770], [1560, 640], [900, 760]];
  var FOCUS_X = 0.52, FOCUS_Y = 0.55;   // 세로 화면에서 보여줄 부분

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['무지개꽃', '장미꽃', '나비가루', '네잎클로버'],
    rare: ['나비의날개', '벚꽃결정']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.park) return EXPLORE_MATERIALS.park;
    return POOLS;
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

  // 나비 명단: 개수는 5~8마리 (다 못 잡는 걸 감안해 기존 4~7개보다 조금 많게), 등장 시간은 처음 몇 초에 걸쳐 차례로
  function planButterflies(luck, rng) {
    rng = rng || Math.random;
    var n = 5 + Math.floor(rng() * 4), out = [];
    for (var i = 0; i < n; i++) {
      out.push({ d: rollDrop(luck, rng), appear: i * 0.9 + rng() * 0.6, life: LIFE_MIN + rng() * (LIFE_MAX - LIFE_MIN) });
    }
    return out;
  }

  var COLORS = [['#ff9ec7', '#ffd0e4'], ['#9ec9ff', '#d3e6ff'], ['#c9a8ff', '#e6d8ff'], ['#ffb98a', '#ffe0c8'], ['#8fe3c2', '#cdf5e5']];
  var S = null;

  // ════════ 화면 ════════
  function startPark() {
    if (document.getElementById('park-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'park-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#2b1f3a;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image();
    bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      plan: planButterflies(luck), bfs: [], rings: [], sparks: [], pops: [], petals: [], collected: [],
      total: 0, resolved: 0, timeLeft: SESSION_SEC, msg: '', msgT: 0,
      last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    S.total = S.plan.length;
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    for (var i = 0; i < 16; i++) S.petals.push({ x: Math.random() * S.W, y: Math.random() * S.H, vx: 10 + Math.random() * 20, vy: 20 + Math.random() * 30, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, r: 3 + Math.random() * 3 });
    say('나비를 탭해서 잡아봐요! 🦋 (헛탭하면 놀라서 도망가요)', 4);

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = Math.max(S.W / IMG_W, S.H / IMG_H);
    var dw = IMG_W * S.s, dh = IMG_H * S.s;
    S.ox = Math.min(0, Math.max(S.W - dw, S.W / 2 - FOCUS_X * dw));
    S.oy = Math.min(0, Math.max(S.H - dh, S.H / 2 - FOCUS_Y * dh));
  }
  // 지금 화면 안에 보이는 꽃밭 (화면 좌표)
  function visibleFlowers() {
    var out = [];
    FLOWERS.forEach(function (f, i) {
      var x = f[0] * S.s + S.ox, y = f[1] * S.s + S.oy;
      if (x > 40 && x < S.W - 40 && y > 90 && y < S.H - 100) out.push({ x: x, y: y, id: i });
    });
    return out;
  }

  // ── 나비 ──
  function spawnButterfly(pl) {
    var edge = Math.floor(Math.random() * 3), x, y;     // 왼쪽 / 오른쪽 / 위에서 날아 들어옴
    if (edge === 0) { x = -30; y = S.H * (0.25 + Math.random() * 0.5); }
    else if (edge === 1) { x = S.W + 30; y = S.H * (0.25 + Math.random() * 0.5); }
    else { x = S.W * (0.15 + Math.random() * 0.7); y = -30; }
    var col = COLORS[Math.floor(Math.random() * COLORS.length)];
    var b = {
      d: pl.d, rare: pl.d.isRare, life: pl.life, age: 0, x: x, y: y,
      hd: Math.atan2(S.H / 2 - y, S.W / 2 - x), turn: 0, turnT: 0, sp: pl.d.isRare ? SPEED_RARE : SPEED,
      state: 'fly', stT: 0, flower: null, phase: Math.random() * 6, col: pl.d.isRare ? ['#ffd24a', '#fff2b0'] : col,
      gone: false, perchCool: 1 + Math.random() * 2
    };
    S.bfs.push(b);
  }

  function updateButterfly(b, dt) {
    b.age += dt;
    b.phase += dt;
    // 시간이 다 되면 하늘로 날아감
    if (b.age > b.life && b.state !== 'leave' && b.state !== 'rest') { b.state = 'leave'; }
    if (b.state === 'leave') {
      b.hd = -Math.PI / 2 + Math.sin(b.phase * 2) * 0.4;
      b.x += Math.cos(b.hd) * 140 * dt; b.y += Math.sin(b.hd) * 140 * dt;
      if (b.y < -50) { b.gone = true; S.resolved++; S.pops.push({ x: Math.max(70, Math.min(S.W - 70, b.x)), y: 80, text: '🦋 날아갔어요', t: 0, dim: true }); }
      return;
    }
    if (b.state === 'rest') {
      b.stT -= dt;
      if (b.stT <= 0) { b.state = 'fly'; b.hd = -Math.PI / 2 + (Math.random() - 0.5) * 2; b.perchCool = 3 + Math.random() * 3; }
      return;
    }
    if (b.state === 'flee') {
      b.stT -= dt;
      if (b.stT <= 0) b.state = 'fly';
    }
    var spd = b.sp * (b.state === 'flee' ? 2.3 : 1) * (0.75 + 0.35 * Math.sin(b.phase * 3.1));
    if (b.state === 'seek') {
      var dx = b.flower.x - b.x, dy = b.flower.y - 6 - b.y, dist = Math.hypot(dx, dy);
      if (dist < 8) { b.state = 'rest'; b.stT = REST_MIN + Math.random() * (REST_MAX - REST_MIN); b.x = b.flower.x; b.y = b.flower.y - 6; return; }
      var want = Math.atan2(dy, dx), diff = Math.atan2(Math.sin(want - b.hd), Math.cos(want - b.hd));
      b.hd += diff * Math.min(1, dt * 6);
      var step = Math.min(dist, spd * 0.8 * dt);
      b.x += Math.cos(b.hd) * step; b.y += Math.sin(b.hd) * step;
      return;
    }
    // 하늘하늘 날기: 가끔 방향을 확 틀어줌
    b.turnT -= dt;
    if (b.turnT <= 0) { b.turn = (Math.random() - 0.5) * 5; b.turnT = 0.4 + Math.random() * 0.9; }
    b.hd += b.turn * dt;
    // 화면 밖으로 너무 나가면 안쪽으로
    var m = 36, topM = 80, botM = 96;
    if (b.x < m || b.x > S.W - m || b.y < topM || b.y > S.H - botM) {
      var want2 = Math.atan2(S.H * 0.5 - b.y, S.W * 0.5 - b.x), diff2 = Math.atan2(Math.sin(want2 - b.hd), Math.cos(want2 - b.hd));
      b.hd += diff2 * Math.min(1, dt * 3);
    }
    b.x += Math.cos(b.hd) * spd * dt;
    b.y += Math.sin(b.hd) * spd * dt + Math.sin(b.phase * 9) * 18 * dt;
    // 꽃이 가까우면 앉으러 감
    b.perchCool -= dt;
    if (b.state === 'fly' && b.perchCool <= 0 && b.age > 1.5) {
      var fl = visibleFlowers().filter(function (f) { return Math.hypot(f.x - b.x, f.y - b.y) < 170 && !S.bfs.some(function (o) { return o !== b && o.flower && o.flower.id === f.id && (o.state === 'rest' || o.state === 'seek'); }); });
      if (fl.length && Math.random() < 0.5) { b.flower = fl[Math.floor(Math.random() * fl.length)]; b.state = 'seek'; }
      else b.perchCool = 1.5;
    }
  }

  // ── 입력 ──
  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var r = S.canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var best = null, bd = 1e9;
    S.bfs.forEach(function (b) {
      if (b.gone || b.state === 'leave') return;
      var d = Math.hypot(b.x - x, b.y - y), lim = b.state === 'rest' ? CATCH_R_REST : CATCH_R;
      if (d < lim && d < bd) { bd = d; best = b; }
    });
    if (best) { S.rings.push({ x: x, y: y, t: 0 }); catchButterfly(best); return; }
    if (x < 110 && y < 56) { finish(); return; }          // 나가기 (나비가 없는 곳을 눌렀을 때만)
    S.rings.push({ x: x, y: y, t: 0 });
    // 헛탭: 주변 나비가 놀람
    var spooked = false;
    S.bfs.forEach(function (b) {
      if (b.gone || b.state === 'leave') return;
      if (Math.hypot(b.x - x, b.y - y) < SPOOK_R) {
        b.state = 'flee'; b.stT = SPOOK_SEC; b.hd = Math.atan2(b.y - y, b.x - x) + (Math.random() - 0.5) * 0.6; b.flower = null;
        spooked = true;
      }
    });
    if (spooked && navigator.vibrate) { try { navigator.vibrate(15); } catch (err) {} }
  }

  function catchButterfly(b) {
    b.gone = true; S.resolved++;
    var d = b.d, label = null, emoji = '✨';
    var before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);   // 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label);
    S.pops.push({ x: b.x, y: b.y - 20, text: emoji + ' ' + label + (d.isRare ? ' ✨' : ''), t: 0 });
    for (var i = 0; i < 12; i++) S.sparks.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.5 + Math.random() * 0.3, col: b.col[Math.floor(Math.random() * 2)] });
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    S.timeLeft -= dt;
    if (S.msgT > 0) S.msgT -= dt;

    // 차례로 등장
    for (var i = S.plan.length - 1; i >= 0; i--) {
      if (S.t >= S.plan[i].appear) { spawnButterfly(S.plan[i]); S.plan.splice(i, 1); }
    }
    S.bfs.forEach(function (b) { updateButterfly(b, dt); });
    S.bfs = S.bfs.filter(function (b) { return !b.gone; });

    S.rings.forEach(function (r) { r.t += dt; }); S.rings = S.rings.filter(function (r) { return r.t < 0.3; });
    S.sparks.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }); S.sparks = S.sparks.filter(function (p) { return p.life > 0; });
    S.pops.forEach(function (p) { p.t += dt; }); S.pops = S.pops.filter(function (p) { return p.t < 1.5; });
    S.petals.forEach(function (p) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > S.H + 10) { p.y = -10; p.x = Math.random() * S.W; }
      if (p.x > S.W + 10) p.x = -10;
    });

    if (S.timeLeft <= 0) { finish(); return; }
    if (S.resolved >= S.total) {
      if (S.endDelay < 0) S.endDelay = 0.9;
      S.endDelay -= dt;
      if (S.endDelay <= 0) { finish(); return; }
    }

    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function drawButterfly(c, b) {
    var flap = b.state === 'rest' ? 0.55 + 0.25 * Math.sin(b.phase * 4) : 0.25 + 0.75 * Math.abs(Math.sin(b.phase * (b.state === 'flee' ? 26 : 16)));
    var ang = b.state === 'rest' ? -Math.PI / 2 : b.hd + Math.PI / 2;
    var sz = b.rare ? 19 : 16;
    c.save(); c.translate(b.x, b.y); c.rotate(ang);
    if (b.rare) {   // 금빛 나비 빛
      var g = c.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, 'rgba(255,230,120,0.55)'); g.addColorStop(1, 'rgba(255,230,120,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 34, 0, 6.3); c.fill();
    }
    [-1, 1].forEach(function (sd) {
      c.save(); c.scale(sd * flap, 1);
      c.fillStyle = b.col[0]; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(sz * 0.75, -sz * 0.5, sz * 0.8, sz * 0.5, -0.55, 0, 6.3); c.fill(); c.stroke();
      c.fillStyle = b.col[1];
      c.beginPath(); c.ellipse(sz * 0.55, sz * 0.5, sz * 0.55, sz * 0.4, 0.45, 0, 6.3); c.fill(); c.stroke();
      c.restore();
    });
    c.fillStyle = '#5a3a5e'; c.beginPath(); c.ellipse(0, 0, 2.4, sz * 0.8, 0, 0, 6.3); c.fill();
    c.strokeStyle = '#5a3a5e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -sz * 0.7); c.lineTo(-sz * 0.3, -sz * 1.1); c.moveTo(0, -sz * 0.7); c.lineTo(sz * 0.3, -sz * 1.1); c.stroke();
    c.restore();
  }

  function draw() {
    if (!S || S.ended) return;
    var c = S.ctx, W = S.W, H = S.H;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    if (S.bgOk) c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    else { c.fillStyle = '#6b8f5a'; c.fillRect(0, 0, W, H); }

    // 꽃잎
    S.petals.forEach(function (p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = 'rgba(255,200,225,0.8)';
      c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.3); c.fill(); c.restore();
    });

    // 나비 (앉은 나비는 아래에)
    S.bfs.slice().sort(function (a, b) { return (a.state === 'rest' ? 0 : 1) - (b.state === 'rest' ? 0 : 1); }).forEach(function (b) { drawButterfly(c, b); });

    // 잡기 번쩍
    S.rings.forEach(function (r) {
      c.globalAlpha = 1 - r.t / 0.3; c.lineWidth = 3; c.strokeStyle = '#fff';
      c.beginPath(); c.arc(r.x, r.y, 8 + r.t * 90, 0, 6.3); c.stroke();
    });
    S.sparks.forEach(function (p) { c.globalAlpha = Math.max(0, p.life * 2); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 3, 0, 6.3); c.fill(); });
    c.globalAlpha = 1;

    // 팝업
    S.pops.forEach(function (p) {
      c.globalAlpha = Math.max(0, 1 - p.t / 1.5);
      c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.65)';
      var tx = Math.max(70, Math.min(W - 70, p.x)), ty = p.y - p.t * 40;
      c.strokeText(p.text, tx, ty);
      c.fillStyle = p.dim ? '#ddd' : '#fff'; c.fillText(p.text, tx, ty);
    });
    c.globalAlpha = 1;

    // 상단 HUD
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 10, 10, 92, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('← 나가기', 56, 28);
    var tw = Math.max(0, S.timeLeft / SESSION_SEC);
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 112, 20, W - 112 - 90, 16, 8); c.fill();
    c.fillStyle = tw < 0.25 ? '#ff6b6b' : '#ff9ec7';
    if (tw > 0.01) { roundRect(c, 114, 22, (W - 112 - 90 - 4) * tw, 12, 6); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W - 76, 10, 66, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif';
    c.fillText('🦋 ' + S.collected.length + '/' + S.total, W - 43, 28);

    if (S.msgT > 0 && S.msg) {
      c.font = '700 14px "Noto Sans KR",sans-serif';
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
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 잡았어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🦋</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">나비 잡기 끝!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="park-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🦋 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="park-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('park-close').onclick = function () { ov.remove(); };
    document.getElementById('park-again').onclick = function () { ov.remove(); startPark(); };
  }

  window.startPark = startPark;
  window.__parkTest = { planButterflies: planButterflies, rollDrop: rollDrop, get S() { return S; } };

  // ── 공원 "산책" 버튼만 새 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__parkHooked) return;
    window.__parkHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'park') { startPark(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
