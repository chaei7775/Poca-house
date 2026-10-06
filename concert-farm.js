// ════════════════════════════════
// 🎪 콘서트 파밍 (concert-farm.js) — 탑스타 세연과 함께 하는 첫 무대
//
// 위에서 내려다보는 큰 콘서트장을 돌아다니며(화면이 플레이어를 따라감) 관객석 팬들의 하트 게이지를 채우고,
// 마지막에 "앵콜 폭죽"으로 하트가 가득 찬 팬들이 재료를 터뜨리게 하는 파밍. 튜토리얼 전용이라 스태미나는 안 든다.
//
// 조작: 화면을 누르거나 끌면 그쪽으로 걸어간다. 아래 스킬 버튼 3개를 누르면 범위 안 팬들의 하트가 찬다.
//   🎤 하이라이트 부르기 : 내 주변(작은 범위) 하트 +50
//   💖 윙크 샤워         : 넓은 범위 하트 +30
//   ✨ 앵콜 폭죽         : 하트가 가득 찬 팬 전원이 재료를 떨어뜨림 (한 번 터뜨린 팬은 끝). 시간이 끝나면 자동으로 한 번 더 터짐
// 재료는 신비의 섬 재료(별·수정 계열) 그대로: 달빛수정, 별의파편, 천사의깃털, 무지개수정 / 희귀: 벚꽃결정, 구름조각, 행운의잎.
//
// 시작하는 법:  window.startConcertFarm({ grantCard: true })   ← 끝나고 세연의 체험용 히든카드를 지급 (trial-card.js)
// 테스트용 주소 파라미터:  ?concert=1 (체험카드 지급까지)  /  ?concert=2 (카드 없이 파밍만)
// 그림은 없어도 동작한다 (색 칸으로 대신 그림). 그림을 올리면 자동 적용:
//   map-concert.png   콘서트장 탑뷰 배경 (세로로 긴 큰 그림. 가로:세로 = 1000:1900 정도)
//   face-seyeon.png   세연 얼굴 (원형으로 잘려서 표시, 200px 정도)
//   fan-1.png ~ fan-8.png  관객 (이미 게임에 있는 팬 이미지)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SESSION_SEC = 75;        // 무대 시간
  var FAN_DROP_P = 0.28;       // 앵콜 때 하트 가득 찬 팬 한 명이 재료를 떨어뜨릴 확률 (봇 시뮬레이션 평균 약 10개)
  var EXTRA_DROP = 0.0;        // (예비) 재료가 2개 나올 확률
  var STONE_DROP = 0.18;       // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var WORLD_W = 1000, WORLD_H = 1900;      // 월드 크기 (화면 픽셀이 아니라 그림 좌표)
  var VIEW_W = 520;            // 화면 가로로 보이는 월드 폭 (작을수록 확대)
  var SPEED = 270;             // 걷는 속도 (월드 단위/초)
  var BG_FILE = 'map-concert.png';
  var SEYEON_FACE = 'face-seyeon.png';
  var FAN_FILES = ['fan-1.png', 'fan-2.png', 'fan-3.png', 'fan-4.png', 'fan-5.png', 'fan-6.png', 'fan-7.png', 'fan-8.png'];
  var START = { x: 520, y: 1760 };
  var STAGE = { x0: 120, x1: 880, y0: 40, y1: 400 };
  // 관객석: 왼쪽/오른쪽 블록, 가운데는 통로
  var BLOCK_X = [[140, 240, 340], [660, 760, 860]];
  var ROW_Y = [560, 710, 860, 1010, 1160, 1310];
  var FAN_R = 28;              // 팬 크기(반지름)
  var SKILLS = [
    { id: 'highlight', name: '하이라이트 부르기', short: '하이라이트', icon: '🎤', radius: 250, gain: 50, cd: 5,  rgb: '255,120,170', sfx: 'concertHigh' },
    { id: 'wink',      name: '윙크 샤워',         short: '윙크 샤워', icon: '💖', radius: 430, gain: 30, cd: 8,  rgb: '255,205,90',  sfx: 'concertWink' },
    { id: 'encore',    name: '앵콜 폭죽',         short: '앵콜 폭죽', icon: '✨', radius: 0,   gain: 0,  cd: 14, rgb: '190,140,255', sfx: 'concertEncore', finale: true }
  ];
  var INTRO = [
    '어? 연습생이네! 오늘 내 무대 같이 볼래? 따라와!',
    '객석 위에 하트 게이지가 보이지? 스킬로 팬들의 하트를 가득 채워봐.',
    '하트가 가득 찬 팬들은 ✨앵콜 폭죽으로 선물을 터뜨려 줘! 화면을 눌러서 움직이고, 아래 스킬을 써봐!'
  ];
  var CHEERS = ['좋아, 더 크게!', '팬들 반응 봐!', '그렇지!', '앵콜 타이밍!', '오늘 무대 최고야!', '조금만 더!'];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['달빛수정', '별의파편', '천사의깃털', '무지개수정'],
    rare: ['벚꽃결정', '구름조각', '행운의잎']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.mystery) return EXPLORE_MATERIALS.mystery;
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
  function makeFans(rng) {
    rng = rng || Math.random;
    var fans = [];
    BLOCK_X.forEach(function (cols) {
      ROW_Y.forEach(function (y) {
        cols.forEach(function (x) {
          fans.push({ x: x + (rng() - 0.5) * 30, y: y + (rng() - 0.5) * 30, g: 0, vis: 0, done: false, img: Math.floor(rng() * FAN_FILES.length), pulse: rng() * 6.28, wasFull: false });
        });
      });
    });
    return fans;
  }
  // 스킬 범위 안의 (아직 안 끝난) 팬 번호들
  function inRange(fans, x, y, r) {
    var out = [];
    fans.forEach(function (f, i) { if (!f.done && Math.hypot(f.x - x, f.y - y) <= r) out.push(i); });
    return out;
  }
  function applyGain(fans, x, y, skill) {
    var hit = inRange(fans, x, y, skill.radius);
    hit.forEach(function (i) { fans[i].g = Math.min(100, fans[i].g + skill.gain); });
    return hit;
  }
  // 앵콜: 하트 가득 찬 팬을 끝내고, 재료를 떨어뜨리는 팬 번호와 재료를 돌려줌
  function encore(fans, luck, rng) {
    rng = rng || Math.random;
    var res = { fulls: [], drops: [] };
    fans.forEach(function (f, i) {
      if (f.done || f.g < 100) return;
      f.done = true; res.fulls.push(i);
      if (rng() < FAN_DROP_P) {
        res.drops.push({ fan: i, d: rollDrop(luck, rng) });
        if (rng() < EXTRA_DROP) res.drops.push({ fan: i, d: rollDrop(luck, rng) });
      }
    });
    return res;
  }

  var S = null;
  var IMGS = {};
  function loadImg(name) {
    if (IMGS[name]) return IMGS[name];
    var im = new Image(); var rec = { im: im, ok: false };
    im.onload = function () { rec.ok = true; };
    im.src = (typeof B !== 'undefined' ? B : '') + name;
    IMGS[name] = rec; return rec;
  }
  function sfx(name) { try { if (window.pocaSfx) window.pocaSfx.play(name); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ════════ 화면 ════════
  function startConcert(opts) {
    if (document.getElementById('concert-overlay')) return;
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.id = 'concert-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#140a24;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    exploreCollected = [];
    FAN_FILES.forEach(loadImg); loadImg(BG_FILE); loadImg(SEYEON_FACE);

    S = {
      opts: opts, overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'),
      W: 0, H: 0, dpr: 1, s: 1,
      fans: makeFans(), px: START.x, py: START.y, tx: START.x, ty: START.y, moving: false,
      nx: START.x - 70, ny: START.y + 20,                       // 세연
      camX: START.x, camY: START.y,
      cd: [0, 0, 0], phase: 'intro', introIdx: 0, timeLeft: SESSION_SEC, t: 0,
      rings: [], parts: [], floats: [], banner: null, flash: 0, shake: 0,
      collected: [], drops: 0, finaleT: 0, bubble: null, bubbleT: 4, dragging: false, exitDown: false,
      last: performance.now(), raf: 0, ended: false
    };
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    S.raf = requestAnimationFrame(loop);
  }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = S.W / VIEW_W;
  }
  function toWorld(sx, sy) { return [S.camX + (sx - S.W / 2) / S.s, S.camY + (sy - S.H / 2) / S.s]; }
  function pos(e) { var r = S.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  // 스킬 버튼 (화면 좌표)
  function btnRect(i) {
    var size = 76, gap = 14, total = size * 3 + gap * 2, x0 = (S.W - total) / 2;
    return { x: x0 + i * (size + gap), y: S.H - size - 18, w: size, h: size };
  }
  function hitBtn(x, y) {
    for (var i = 0; i < 3; i++) { var b = btnRect(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; }
    return -1;
  }

  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var p = pos(e);
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (S.phase === 'intro') { advanceIntro(); return; }
    if (S.phase !== 'play') return;
    if (p[0] < 110 && p[1] < 56) { S.exitDown = true; return; }
    var b = hitBtn(p[0], p[1]);
    if (b >= 0) { castSkill(b); return; }
    S.dragging = true; setTarget(p);
  }
  function onMove(e) { if (!S || S.ended || !S.dragging) return; e.preventDefault(); setTarget(pos(e)); }
  function onUp(e) {
    if (!S || S.ended) return;
    if (S.exitDown) { var p = pos(e); S.exitDown = false; if (p[0] < 110 && p[1] < 56) { endNow(false); } return; }
    S.dragging = false;
  }
  function setTarget(p) {
    var w = toWorld(p[0], p[1]);
    S.tx = clamp(w[0], 40, WORLD_W - 40); S.ty = clamp(w[1], STAGE.y1 + 40, WORLD_H - 40);
    S.moving = true;
  }
  function advanceIntro() {
    S.introIdx++;
    if (S.introIdx >= INTRO.length) { S.phase = 'play'; showBanner('🎪 무대 시작!', '255,205,90'); sfx('cheer'); }
  }

  // ── 스킬 ──
  function castSkill(i) {
    var k = SKILLS[i];
    if (S.cd[i] > 0) { floatText(S.px, S.py - 60, '재사용 대기 ' + Math.ceil(S.cd[i]) + '초', '#ddd'); return; }
    if (k.finale) {
      var any = S.fans.some(function (f) { return !f.done && f.g >= 100; });
      if (!any) { floatText(S.px, S.py - 60, '하트가 가득 찬 팬이 없어요', '#ffb4c8'); return; }
      doEncore(k);
      S.cd[i] = k.cd; return;
    }
    S.cd[i] = k.cd;
    var hit = applyGain(S.fans, S.px, S.py, k);
    S.rings.push({ x: S.px, y: S.py, r0: 20, r1: k.radius, t: 0, dur: 0.6, rgb: k.rgb });
    S.rings.push({ x: S.px, y: S.py, r0: 10, r1: k.radius * 0.7, t: -0.1, dur: 0.55, rgb: '255,255,255' });
    hit.forEach(function (n) {
      var f = S.fans[n];
      for (var q = 0; q < 3; q++) S.parts.push({ x: S.px, y: S.py, tx: f.x, ty: f.y - 10, t: -q * 0.08, dur: 0.55, ch: k.id === 'wink' ? '💖' : '✨', sz: 22 });
    });
    showBanner(k.icon + ' ' + k.name + '!', k.rgb);
    S.flash = 0.35; S.flashRgb = k.rgb; S.shake = 0.25;
    sfx(k.sfx);
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    if (hit.length === 0) floatText(S.px, S.py - 60, '근처에 팬이 없어요 — 객석 쪽으로!', '#ffb4c8');
  }
  function doEncore(k) {
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var res = encore(S.fans, luck);
    showBanner(k.icon + ' ' + k.name + '!', k.rgb);
    S.flash = 0.5; S.flashRgb = k.rgb; S.shake = 0.5;
    sfx(k.sfx);
    S.rings.push({ x: S.px, y: S.py, r0: 30, r1: 900, t: 0, dur: 0.9, rgb: k.rgb });
    res.fulls.forEach(function (n, idx) {
      var f = S.fans[n];
      S.parts.push({ x: f.x, y: f.y, burst: true, t: -idx * 0.05, dur: 0.8, ch: '🎆', sz: 34 });
    });
    res.drops.forEach(function (dr, idx) {
      var f = S.fans[dr.fan];
      setTimeout(function () { if (S && !S.ended) giveDrop(dr.d, f.x, f.y); }, 300 + idx * 140);
    });
    if (res.fulls.length) floatText(S.px, S.py - 90, '💖 ' + res.fulls.length + '명 만족!', '#ffd1e6');
  }
  function giveDrop(d, x, y) {
    var label = null, emoji = '✨', before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label); S.drops++;
    floatText(x, y - 40, emoji + (d.isRare ? ' 희귀!' : ''), d.isRare ? '#ffd700' : '#fff', d.isRare ? 30 : 24);
    sfx(d.isRare ? 'reward' : 'concertDrop');
  }

  function showBanner(text, rgb) { S.banner = { text: text, rgb: rgb, t: 0, dur: 1.1 }; }
  function floatText(x, y, text, color, size) { S.floats.push({ x: x, y: y, text: text, color: color || '#fff', size: size || 18, t: 0, dur: 1.4 }); }

  // ── 진행 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    update(dt);
    if (!S || S.ended) return;
    draw();
    if (S && !S.ended) S.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake -= dt;
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
    S.rings = S.rings.filter(function (r) { r.t += dt; return r.t < r.dur; });
    S.parts = S.parts.filter(function (q) { q.t += dt; return q.t < q.dur; });
    S.floats = S.floats.filter(function (f) { f.t += dt; return f.t < f.dur; });
    S.fans.forEach(function (f) {
      f.vis += (f.g - f.vis) * Math.min(1, dt * 8);
      if (!f.done && f.g >= 100 && !f.wasFull) { f.wasFull = true; sfx('concertFull'); S.parts.push({ x: f.x, y: f.y - 30, burst: true, t: 0, dur: 0.5, ch: '💖', sz: 22 }); }
    });

    if (S.phase === 'play' || S.phase === 'finale') {
      // 이동
      var dx = S.tx - S.px, dy = S.ty - S.py, d = Math.hypot(dx, dy);
      if (S.moving && d > 6) { var st = Math.min(d, SPEED * dt); S.px += dx / d * st; S.py += dy / d * st; }
      else S.moving = false;
      // 세연은 플레이어를 살짝 뒤따라옴
      var gx = S.px - 64, gy = S.py + 28, nd = Math.hypot(gx - S.nx, gy - S.ny);
      if (nd > 4) { var ns = Math.min(nd, Math.max(nd * 4, 60) * dt); S.nx += (gx - S.nx) / nd * ns; S.ny += (gy - S.ny) / nd * ns; }
    }
    if (S.phase === 'play') {
      S.timeLeft -= dt;
      for (var i = 0; i < 3; i++) if (S.cd[i] > 0) S.cd[i] = Math.max(0, S.cd[i] - dt);
      S.bubbleT -= dt;
      if (S.bubbleT <= 0) { S.bubble = CHEERS[Math.floor(Math.random() * CHEERS.length)]; S.bubbleT = 5 + Math.random() * 3; S.bubbleShow = 2.2; }
      if (S.bubbleShow > 0) { S.bubbleShow -= dt; if (S.bubbleShow <= 0) S.bubble = null; }
      if (S.timeLeft <= 0) { S.timeLeft = 0; startFinale(); }
      if (S.fans.every(function (f) { return f.done; })) startFinale();
    } else if (S.phase === 'finale') {
      S.finaleT -= dt;
      if (S.finaleT <= 0) endNow(true);
    }
    if (!S || S.ended) return;
    // 카메라
    var tx = clamp(S.px, VIEW_W / 2, WORLD_W - VIEW_W / 2);
    var viewH = S.H / S.s;
    var ty = clamp(S.py - viewH * 0.08, viewH / 2, Math.max(viewH / 2, WORLD_H - viewH / 2));
    S.camX += (tx - S.camX) * Math.min(1, dt * 6); S.camY += (ty - S.camY) * Math.min(1, dt * 6);
  }

  // 시간이 끝나면 자동으로 마지막 앵콜
  function startFinale() {
    if (S.phase !== 'play') return;
    S.phase = 'finale'; S.finaleT = 2.6;
    var any = S.fans.some(function (f) { return !f.done && f.g >= 100; });
    if (any) { showBanner('⏰ 마지막 앵콜!', '190,140,255'); doEncore(SKILLS[2]); }
    else { showBanner('⏰ 무대 끝!', '255,205,90'); S.finaleT = 1.2; }
  }

  // ── 그리기 ──
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function outlined(c, text, x, y, size, fill, stroke) {
    c.font = '900 ' + size + 'px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(3, size / 5); c.strokeStyle = stroke || 'rgba(40,0,50,0.9)'; c.lineJoin = 'round';
    c.strokeText(text, x, y); c.fillStyle = fill || '#fff'; c.fillText(text, x, y);
  }

  function drawWorld(c) {
    var bg = IMGS[BG_FILE];
    if (bg && bg.ok) { c.drawImage(bg.im, 0, 0, WORLD_W, WORLD_H); }
    else {
      // 임시 배경: 객석 바닥 + 통로 + 무대
      var g = c.createLinearGradient(0, 0, 0, WORLD_H);
      g.addColorStop(0, '#2a1450'); g.addColorStop(0.3, '#3a1c66'); g.addColorStop(1, '#1d1038');
      c.fillStyle = g; c.fillRect(0, 0, WORLD_W, WORLD_H);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      BLOCK_X.forEach(function (cols) { c.fillRect(cols[0] - 70, ROW_Y[0] - 80, cols[2] - cols[0] + 140, ROW_Y[ROW_Y.length - 1] - ROW_Y[0] + 160); });
      c.fillStyle = 'rgba(255,200,120,0.10)'; c.fillRect(400, STAGE.y1, 200, WORLD_H - STAGE.y1);   // 가운데 통로
      // 무대
      var sg = c.createLinearGradient(0, STAGE.y0, 0, STAGE.y1);
      sg.addColorStop(0, '#5b2a9a'); sg.addColorStop(1, '#a04cd0');
      c.fillStyle = sg; roundRect(c, STAGE.x0, STAGE.y0, STAGE.x1 - STAGE.x0, STAGE.y1 - STAGE.y0, 30); c.fill();
      c.strokeStyle = '#ffd1e6'; c.lineWidth = 6; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(STAGE.x0 + 30, STAGE.y0 + 30, STAGE.x1 - STAGE.x0 - 60, 14);
      c.font = '900 56px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText('🎪 STAGE', WORLD_W / 2, (STAGE.y0 + STAGE.y1) / 2 + 18);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(0, WORLD_H - 220, WORLD_W, 220);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.font = '900 34px "Noto Sans KR",sans-serif'; c.fillText('⬆ ENTRANCE', WORLD_W / 2, WORLD_H - 90);
    }
  }
  function drawFan(c, f) {
    var rec = IMGS[FAN_FILES[f.img]], bob = Math.sin(S.t * 3 + f.pulse) * 2;
    c.save(); c.translate(f.x, f.y + bob);
    c.globalAlpha = f.done ? 0.45 : 1;
    if (rec && rec.ok) c.drawImage(rec.im, -FAN_R, -FAN_R, FAN_R * 2, FAN_R * 2);
    else { c.fillStyle = f.done ? '#7a6a8c' : '#e9d5ff'; c.beginPath(); c.arc(0, 0, FAN_R * 0.8, 0, 6.283); c.fill(); c.font = '30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.done ? '😍' : '🙂', 0, 2); }
    c.restore();
    if (f.done) return;
    // 하트 게이지
    var w = 54, h = 9, x = f.x - w / 2, y = f.y - FAN_R - 18, p = clamp(f.vis / 100, 0, 1);
    c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, x - 2, y - 2, w + 4, h + 4, 6); c.fill();
    var col = p >= 0.999 ? '#ffd700' : (p > 0.5 ? '#ff6fa8' : '#ff9ccf');
    c.fillStyle = col; if (p > 0) { roundRect(c, x, y, w * p, h, 4); c.fill(); }
    if (f.g >= 100) { var pu = 1 + Math.sin(S.t * 8 + f.pulse) * 0.15; c.save(); c.translate(f.x, y - 14); c.scale(pu, pu); c.font = '24px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('💖', 0, 0); c.restore(); }
    else { c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🤍', x - 10, y + 5); }
  }
  function drawToken(c, x, y, rec, emoji, color, label) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, 26, 24, 9, 0, 0, 6.283); c.fill();
    c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.fillStyle = color; c.fill();
    if (rec && rec.ok) { c.save(); c.beginPath(); c.arc(0, 0, 25, 0, 6.283); c.clip(); c.drawImage(rec.im, -30, -29, 60, 60); c.restore(); }
    else { c.font = '32px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, 0, 2); }
    c.lineWidth = 4; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.stroke();
    outlined(c, label, 0, 44, 16, '#fff');
    c.restore();
  }

  function draw() {
    var c = S.ctx, W = S.W, H = S.H, s = S.s;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.fillStyle = '#140a24'; c.fillRect(0, 0, W, H);
    var shx = S.shake > 0 ? (Math.random() - 0.5) * 8 * S.shake * 4 : 0, shy = S.shake > 0 ? (Math.random() - 0.5) * 8 * S.shake * 4 : 0;
    c.save();
    c.translate(W / 2 + shx, H / 2 + shy); c.scale(s, s); c.translate(-S.camX, -S.camY);
    drawWorld(c);
    // 스킬 범위 미리보기 (플레이어 주변 은은한 원)
    if (S.phase === 'play') {
      SKILLS.forEach(function (k, i) { if (!k.finale && S.cd[i] <= 0) { c.strokeStyle = 'rgba(' + k.rgb + ',0.28)'; c.lineWidth = 3; c.setLineDash([14, 12]); c.beginPath(); c.arc(S.px, S.py, k.radius, 0, 6.283); c.stroke(); c.setLineDash([]); } });
    }
    // 이동 목표 표시
    if (S.moving) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(S.tx, S.ty, 14 + Math.sin(S.t * 8) * 3, 0, 6.283); c.stroke(); }
    // 팬 (위에서 아래 순서)
    S.fans.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (f) { drawFan(c, f); });
    // 스킬 링
    S.rings.forEach(function (r) {
      if (r.t < 0) return;
      var p = r.t / r.dur, rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - p, 3));
      c.strokeStyle = 'rgba(' + r.rgb + ',' + (1 - p).toFixed(2) + ')'; c.lineWidth = 16 * (1 - p) + 3;
      c.beginPath(); c.arc(r.x, r.y, rad, 0, 6.283); c.stroke();
      c.fillStyle = 'rgba(' + r.rgb + ',' + ((1 - p) * 0.14).toFixed(3) + ')'; c.beginPath(); c.arc(r.x, r.y, rad, 0, 6.283); c.fill();
    });
    // 세연 / 플레이어 (아래에 있는 쪽이 앞)
    var toks = [{ y: S.ny, f: function () { drawToken(c, S.nx, S.ny, IMGS[SEYEON_FACE], '🌟', '#f59e0b', '세연'); if (S.bubble) bubble(c, S.nx, S.ny - 48, S.bubble); } },
                { y: S.py, f: function () { drawToken(c, S.px, S.py, null, '🙋', '#ec4899', '나'); } }].sort(function (a, b) { return a.y - b.y; });
    toks.forEach(function (t) { t.f(); });
    // 파티클
    S.parts.forEach(function (q) {
      if (q.t < 0) return;
      var p = q.t / q.dur; c.globalAlpha = 1 - Math.pow(p, 3); c.font = q.sz + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (q.burst) { var sc = 0.6 + p * 1.2; c.save(); c.translate(q.x, q.y - p * 40); c.scale(sc, sc); c.fillText(q.ch, 0, 0); c.restore(); }
      else { var e = 1 - Math.pow(1 - p, 2); c.fillText(q.ch, q.x + (q.tx - q.x) * e, q.y + (q.ty - q.y) * e - Math.sin(p * 3.14) * 30); }
      c.globalAlpha = 1;
    });
    // 떠오르는 글씨
    S.floats.forEach(function (f) { var p = f.t / f.dur; c.globalAlpha = 1 - Math.pow(p, 2); outlined(c, f.text, f.x, f.y - p * 50, f.size, f.color); c.globalAlpha = 1; });
    c.restore();

    // ── 화면 고정 UI ──
    if (S.flash > 0) { c.fillStyle = 'rgba(' + S.flashRgb + ',' + (S.flash * 0.7).toFixed(2) + ')'; c.fillRect(0, 0, W, H); }
    drawHud(c);
    if (S.banner) {
      var b = S.banner, p = b.t / b.dur, sc = 1 + (1 - Math.min(1, p * 4)) * 0.6, a = p > 0.7 ? (1 - p) / 0.3 : 1;
      c.save(); c.globalAlpha = Math.max(0, a); c.translate(W / 2, H * 0.3); c.scale(sc, sc);
      var bs = Math.min(40, W / 9); c.font = '900 ' + bs + 'px "Noto Sans KR",sans-serif';
      var tw = c.measureText(b.text).width; if (tw > (W - 40) / sc) bs = Math.floor(bs * (W - 40) / sc / tw);
      outlined(c, b.text, 0, 0, bs, '#fff', 'rgba(' + b.rgb + ',0.95)'); c.restore();
    }
    if (S.phase === 'intro') drawIntro(c);
  }

  function bubble(c, x, y, text) {
    c.font = '900 16px "Noto Sans KR",sans-serif'; var w = c.measureText(text).width + 22;
    c.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(c, x - w / 2, y - 18, w, 30, 12); c.fill();
    c.fillStyle = '#4a1d6e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - 3);
  }

  function drawHud(c) {
    var W = S.W, H = S.H;
    // 위 바
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, 10, 10, 96, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('← 나가기', 58, 29);
    var full = S.fans.filter(function (f) { return !f.done && f.g >= 100; }).length, done = S.fans.filter(function (f) { return f.done; }).length;
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, W / 2 - 74, 10, 148, 36, 18); c.fill();
    c.fillStyle = S.timeLeft <= 10 ? '#ff7a7a' : '#fff'; c.font = '900 16px "Noto Sans KR",sans-serif';
    c.fillText('⏱ ' + Math.ceil(S.timeLeft) + '초', W / 2 - 20, 29);
    c.fillStyle = '#ffd700'; c.fillText('🎁 ' + S.drops, W / 2 + 46, 29);
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, W - 126, 10, 116, 36, 18); c.fill();
    c.fillStyle = '#ff9ccf'; c.fillText('💖 ' + full + ' · 😍 ' + done, W - 68, 29);
    // 스킬 버튼
    for (var i = 0; i < 3; i++) {
      var k = SKILLS[i], b = btnRect(i), cd = S.cd[i], ready = cd <= 0;
      var canEncore = !k.finale || full > 0;
      c.save();
      c.fillStyle = 'rgba(20,10,36,0.82)'; roundRect(c, b.x, b.y, b.w, b.h, 18); c.fill();
      c.lineWidth = ready && canEncore ? 4 : 2; c.strokeStyle = ready && canEncore ? 'rgb(' + k.rgb + ')' : 'rgba(255,255,255,0.25)'; c.stroke();
      c.font = '30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = ready ? 1 : 0.5; c.fillText(k.icon, b.x + b.w / 2, b.y + 28);
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.font = '900 10.5px "Noto Sans KR",sans-serif';
      c.fillText(k.short, b.x + b.w / 2, b.y + 58);
      if (!ready) { c.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(c, b.x, b.y + b.h * (1 - cd / k.cd), b.w, b.h * (cd / k.cd), 18); c.fill(); c.fillStyle = '#fff'; c.font = '900 18px "Noto Sans KR",sans-serif'; c.fillText(Math.ceil(cd), b.x + b.w / 2, b.y + 30); }
      else if (k.finale && full > 0) { c.fillStyle = '#ffd700'; c.font = '900 11px "Noto Sans KR",sans-serif'; c.fillText(full + '명 준비!', b.x + b.w / 2, b.y - 8); }
      c.restore();
    }
  }

  function drawIntro(c) {
    var W = S.W, H = S.H;
    c.fillStyle = 'rgba(10,5,20,0.55)'; c.fillRect(0, 0, W, H);
    var bw = Math.min(W - 24, 420), bh = 150, bx = (W - bw) / 2, by = H - bh - 30;
    c.fillStyle = 'rgba(30,14,54,0.96)'; roundRect(c, bx, by, bw, bh, 20); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#f59e0b'; c.stroke();
    drawToken(c, bx + 52, by - 6, IMGS[SEYEON_FACE], '🌟', '#f59e0b', '');
    c.fillStyle = '#f59e0b'; c.font = '900 15px "Noto Sans KR",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('🌟 세연', bx + 96, by + 14);
    c.fillStyle = '#fff'; c.font = '700 15px "Noto Sans KR",sans-serif';
    wrap(c, INTRO[S.introIdx], bx + 20, by + 44, bw - 40, 22);
    c.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(S.t * 5) * 0.3).toFixed(2) + ')'; c.font = '700 12px "Noto Sans KR",sans-serif'; c.textAlign = 'right';
    c.fillText('눌러서 계속 ▶ ' + (S.introIdx + 1) + '/' + INTRO.length, bx + bw - 16, by + bh - 22);
  }
  function wrap(c, text, x, y, maxW, lh) {
    var line = '', ly = y; c.textAlign = 'left';
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (c.measureText(t).width > maxW) { c.fillText(line, x, ly); ly += lh; line = text[i]; } else line = t;
    }
    c.fillText(line, x, ly);
  }

  // ── 종료 / 결과 ──
  function endNow(normal) {
    if (!S || S.ended) return;
    S.ended = true;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', resize);
    var got = S.collected.slice(), ov = S.overlay, opts = S.opts, left = S.fans.filter(function (f) { return !f.done && f.g >= 100; }).length;
    if (normal && Math.random() < STONE_DROP) {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var card = opts.grantCard && typeof window.grantTrialCard === 'function' && normal;
    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#4a1b6e);border:2px solid #f59e0b;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🎪</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">' + (normal ? '무대 대성공!' : '무대에서 나왔어요') + '</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin:12px 0 ' + (card ? '8' : '16') + 'px;">' + list + '</div>' +
      (card ? '<div style="font-size:12px;color:#fcd34d;margin-bottom:14px;">🌟 세연이 선물을 준비했대요!</div>' : '') +
      '<button id="concert-close" style="width:100%;padding:13px;background:linear-gradient(135deg,#f59e0b,#ec4899);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + (card ? '선물 받기 🎁' : '확인') + '</button>' +
      '</div></div>';
    document.getElementById('concert-close').onclick = function () {
      ov.remove();
      if (card) { try { window.grantTrialCard(); } catch (e) {} }
    };
  }

  window.startConcertFarm = startConcert;
  window.__concertTest = { rollDrop: rollDrop, makeFans: makeFans, applyGain: applyGain, encore: encore, SKILLS: SKILLS, get S() { return S; }, castSkill: castSkill, FAN_DROP_P: FAN_DROP_P };

  // 테스트용 주소 파라미터 (?concert=1 카드 지급까지 / ?concert=2 카드 없이)
  try {
    var q = new URLSearchParams(location.search).get('concert');
    if (q === '1' || q === '2') {
      (function wait() {
        if (typeof window.collectExploreItem !== 'function' || typeof window.addToBag !== 'function') { setTimeout(wait, 300); return; }
        setTimeout(function () { startConcert({ grantCard: q === '1' }); }, 2500);
      })();
    }
  } catch (e) {}
})();
