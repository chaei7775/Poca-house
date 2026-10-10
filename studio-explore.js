// ════════════════════════════════
// 🎹 작곡 스튜디오 탐험 (studio-explore.js)
// 새 탐험 맵. 처음부터 바로 들어갈 수 있고, 포카마을 지도에 "🎹 작곡 스튜디오" 버튼이 생긴다.
// game.js / index.html 은 건드리지 않고 이 파일이 장소 목록·버튼을 스스로 등록한다.
//
// 흐름: 스태미나 15 소모 → 20초 동안 스튜디오 곳곳(건반·기타·모니터·녹음 부스·소파…)에서 빛나는 구슬이 켜졌다 꺼진다.
//       구슬은 1.8초 안에 눌러야 줍는다. 구슬 안 그림을 보면 뭐가 나올지 알 수 있다.
//   🎵 음표조각 / 🎼 악보용지 / 📝 가사조각 / 💡 영감의불꽃(희귀, 행운 스탯이 높을수록 잘 나옴)
// 재료는 💿 앨범 제작(album-studio.js)에서 쓴다. 재조합석 18% 판정은 기존 탐험과 동일.
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var PLACE_ID = 'studio';
  var STAMINA_COST = 15;       // 신비의 섬과 동일
  var SESSION_SEC = 20;        // 탐험 시간
  var SPAWN_GAP = 1.5;         // 새 구슬이 켜지는 간격(초)
  var ORB_LIFE = 1.8;          // 구슬이 켜져 있는 시간(초)
  var ORB_MAX = 3;             // 동시에 켜져 있는 최대 수
  var STONE_DROP = 0.25;       // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var BG_FILE = 'map-studio.png';
  var IMG_W = 1536, IMG_H = 1024;

  // 재료 20종 (이름은 album-studio.js 와 같아야 함). weight = 구슬로 나올 비중, cat = 분류
  var KINDS = [
    { id: 'n1',  cat: 'note',  emoji: '⚪', name: '온음표',   weight: 5 },
    { id: 'n2',  cat: 'note',  emoji: '♩',  name: '2분음표',  weight: 7 },
    { id: 'n4',  cat: 'note',  emoji: '♪',  name: '4분음표',  weight: 9 },
    { id: 'n8',  cat: 'note',  emoji: '♫',  name: '8분음표',  weight: 8 },
    { id: 'n16', cat: 'note',  emoji: '♬',  name: '16분음표', weight: 6 },
    { id: 'gtr', cat: 'inst',  emoji: '🎸', name: '기타',     weight: 7 },
    { id: 'bas', cat: 'inst',  emoji: '🪕', name: '베이스',   weight: 6 },
    { id: 'drm', cat: 'inst',  emoji: '🥁', name: '드럼',     weight: 7 },
    { id: 'pno', cat: 'inst',  emoji: '🎹', name: '피아노',   weight: 7 },
    { id: 'syn', cat: 'inst',  emoji: '🎛️', name: '신스',     weight: 5 },
    { id: 'str', cat: 'inst',  emoji: '🎻', name: '스트링',   weight: 5 },
    { id: 'scr', cat: 'score', emoji: '🎼', name: '악보용지', weight: 14 },
    { id: 'lyr', cat: 'lyric', emoji: '📝', name: '가사조각', weight: 10 },
    { id: 'spk', cat: 'spark', emoji: '💡', name: '영감의불꽃', weight: 4, rare: true },
    // ── 새 재료 6종 (새 장르 R&B·스윙·시티팝·펑크·트로트 전용. 처음엔 잘 안 나와서 모으는 맛이 있음)
    { id: 'mic', cat: 'inst',  emoji: '🎤', name: '마이크',     weight: 4 },
    { id: 'sax', cat: 'inst',  emoji: '🎷', name: '색소폰',     weight: 4 },
    { id: 'tpt', cat: 'inst',  emoji: '🎺', name: '트럼펫',     weight: 4 },
    { id: 'trp', cat: 'note',  emoji: '🎶', name: '셋잇단음표', weight: 5 },
    { id: 'cho', cat: 'lyric', emoji: '🗣️', name: '코러스',     weight: 4 },
    { id: 'mix', cat: 'gear',  emoji: '🎚️', name: '믹싱콘솔',   weight: 3 }
  ];
  var MATS = {};
  KINDS.forEach(function (k) { k.desc = '앨범 제작 재료 · 🎼 작곡 테이블에서 곡을 만들어요'; MATS[k.id] = k; });
  window.STUDIO_KINDS = KINDS;

  // 구슬이 켜지는 자리 (이미지 비율 0~1)
  var SPOTS = [
    { x: 0.27, y: 0.40 },   // 왼쪽 신시사이저
    { x: 0.45, y: 0.36 },   // 메인 키보드
    { x: 0.52, y: 0.27 },   // 모니터
    { x: 0.80, y: 0.33 },   // 녹음 부스 마이크
    { x: 0.69, y: 0.46 },   // 어쿠스틱 기타
    { x: 0.92, y: 0.60 },   // 오른쪽 피아노·악보
    { x: 0.13, y: 0.64 },   // 소파
    { x: 0.37, y: 0.68 },   // 테이블 위 노트
    { x: 0.08, y: 0.24 }    // 창가 야경
  ];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function rollMaterial(luck, rng) {
    rng = rng || Math.random;
    var total = 0, w = KINDS.map(function (k) { var x = k.weight * (k.rare ? 1 + (luck || 0) / 100 : 1); total += x; return x; });
    var r = rng() * total;
    for (var i = 0; i < KINDS.length; i++) { if (r < w[i]) return KINDS[i].id; r -= w[i]; }
    return 'n4';
  }
  // 아직 안 쓰인 자리 중에서 하나 고르기
  function pickSpot(orbs, rng) {
    rng = rng || Math.random;
    var free = [];
    // 이미 켜진 구슬과 너무 가까운 자리(구슬끼리 겹침)는 피한다
    SPOTS.forEach(function (s, i) {
      if (orbs.some(function (o) { return o.spot === i || Math.hypot((SPOTS[o.spot].x - s.x) * 1.5, SPOTS[o.spot].y - s.y) < 0.2; })) return;
      free.push(i);
    });
    return free.length ? free[Math.floor(rng() * free.length)] : -1;
  }

  var S = null;

  function sfx(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ════════ 화면 ════════
  function startStudio() {
    if (document.getElementById('studio-overlay') || document.getElementById('explore-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (작곡 스튜디오 ' + STAMINA_COST + ')'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    try { localStorage.setItem('ph_studio_visited', '1'); } catch (e) {}   // 길잡이 퀘스트 완료 표시용
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'studio-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#140c08;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var bg = new Image(); bg.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;
    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false,
      W: 0, H: 0, dpr: 1, orbs: [], bursts: [], fly: [], misses: [], collected: [], t: 0, left: SESSION_SEC, spawnT: 0.4,
      bump: 0, combo: 0, last: performance.now(), raf: 0, ended: false
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    S.raf = requestAnimationFrame(loop);
  }
  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
  }
  // 스튜디오 전체가 한눈에 보이게 화면 너비에 맞춰(contain) 가운데에 그린다. 위아래 남는 곳은 어둡게 확대한 배경으로 채움
  function view() {
    var sc = Math.min(S.W / IMG_W, S.H / IMG_H), w = IMG_W * sc, h = IMG_H * sc;
    return { sc: sc, x: (S.W - w) / 2, y: (S.H - h) / 2, w: w, h: h };
  }
  function orbR() { return clamp(view().w * 0.075, 24, 42); }
  function spotPos(i) { var v = view(); return [v.x + SPOTS[i].x * v.w, v.y + SPOTS[i].y * v.h]; }

  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var r = S.canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, hit = null, best = 1e9;
    S.orbs.forEach(function (o) {
      var p = spotPos(o.spot), d = Math.hypot(px - p[0], py - p[1]);
      if (d < orbR() + 16 && d < best) { best = d; hit = o; }
    });
    if (hit) catchOrb(hit);
    else { S.combo = 0; S.bursts.push({ x: px, y: py, t: 0, dur: 0.35, rgb: '255,255,255', ring: true }); }
  }

  function catchOrb(o) {
    S.orbs.splice(S.orbs.indexOf(o), 1);
    var m = MATS[o.kind], p = spotPos(o.spot);
    var ok = true;
    if (typeof addToBag === 'function') ok = addToBag(m.emoji, m.name, 'material', 1, m.desc);
    if (!ok) { S.misses.push({ x: p[0], y: p[1], t: 0, text: '가방이 가득!' }); return; }
    exploreCollected.push(m.emoji + ' ' + m.name);
    S.collected.push(m.emoji + ' ' + m.name);
    if (typeof addPlayerExp === 'function') { try { addPlayerExp(10); } catch (e) {} }
    S.combo++;
    S.bursts.push({ x: p[0], y: p[1], t: 0, dur: 0.6, rgb: m.rare ? '255,215,90' : '255,190,230' });
    S.bursts.push({ x: p[0], y: p[1], t: 0, dur: 0.4, rgb: '255,255,255', ring: true });
    S.fly.push({ ch: m.emoji, nm: m.name, x: p[0], y: p[1], t: 0, dur: 0.7, rare: !!m.rare });
    S.misses.push({ x: p[0], y: p[1] - 30, t: 0, text: m.rare ? '✨ ' + m.name + '!' : '+1 ' + m.name, gold: !!m.rare });
    sfx(m.rare ? 'reward' : 'pick');
    if (m.rare && navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
  }

  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    update(dt);
    if (!S || S.ended) return;
    draw();
    if (S && !S.ended) S.raf = requestAnimationFrame(loop);
  }
  function update(dt) {
    S.left -= (window.__phHold && window.__phHold()) ? 0 : dt;
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.left > 0.6 && S.orbs.length < ORB_MAX) {
      var sp = pickSpot(S.orbs);
      if (sp >= 0) {
        var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
        S.orbs.push({ spot: sp, kind: rollMaterial(luck), t: 0, life: ORB_LIFE });
      }
      S.spawnT = SPAWN_GAP * rnd(0.75, 1.15);
    }
    S.orbs = S.orbs.filter(function (o) {
      o.t += dt;
      if (o.t >= o.life) { var p = spotPos(o.spot); S.misses.push({ x: p[0], y: p[1], t: 0, text: '💨', quiet: true }); S.combo = 0; return false; }
      return true;
    });
    S.bursts = S.bursts.filter(function (b) { b.t += dt; return b.t < b.dur; });
    S.misses = S.misses.filter(function (m) { m.t += dt; return m.t < 0.9; });
    S.fly = S.fly.filter(function (f) { f.t += dt; if (f.t >= f.dur) { S.bump = 1; return false; } return true; });
    if (S.bump > 0) S.bump = Math.max(0, S.bump - dt * 4);
    if (S.left <= 0) finish();
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function outlined(c, text, x, y, size, fill, stroke) {
    c.font = '900 ' + size + 'px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(3, size / 5); c.strokeStyle = stroke || 'rgba(40,15,0,0.9)'; c.lineJoin = 'round';
    c.strokeText(text, x, y); c.fillStyle = fill || '#fff'; c.fillText(text, x, y);
  }

  function draw() {
    var c = S.ctx, W = S.W, H = S.H, v = view();
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.fillStyle = '#140c08'; c.fillRect(0, 0, W, H);
    if (S.bgOk) {
      var cs = Math.max(W / IMG_W, H / IMG_H);          // 남는 곳을 채우는 확대 배경
      c.drawImage(S.bg, (W - IMG_W * cs) / 2, (H - IMG_H * cs) / 2, IMG_W * cs, IMG_H * cs);
      c.fillStyle = 'rgba(8,3,2,0.78)'; c.fillRect(0, 0, W, H);
      c.drawImage(S.bg, v.x, v.y, v.w, v.h);
    }
    c.fillStyle = 'rgba(10,4,2,0.3)'; c.fillRect(v.x, v.y, v.w, v.h);   // 구슬이 잘 보이게 살짝 어둡게
    // 시간 막대
    var p = clamp(S.left / SESSION_SEC, 0, 1);
    c.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(c, 16, 14, W - 32, 10, 5); c.fill();
    var g = c.createLinearGradient(16, 0, W - 16, 0); g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#ff6fb1');
    c.fillStyle = g; roundRect(c, 16, 14, Math.max(10, (W - 32) * p), 10, 5); c.fill();
    outlined(c, '🎹 ' + Math.ceil(S.left) + '초', W / 2, 44, 17, '#fff');

    // 구슬
    S.orbs.forEach(function (o) {
      var pos = spotPos(o.spot), m = MATS[o.kind], k = o.t / o.life, appear = clamp(o.t / 0.18, 0, 1);
      var rare = !!m.rare, rgb = rare ? '255,215,90' : (m.cat === 'note' ? '255,150,210' : m.cat === 'inst' ? '255,190,110' : m.cat === 'score' ? '150,200,255' : '190,255,200');
      var pulse = 1 + Math.sin(S.t * 8 + o.spot) * 0.06, r = orbR() * appear * pulse;
      c.save(); c.translate(pos[0], pos[1]);
      c.globalCompositeOperation = 'lighter';
      var gl = c.createRadialGradient(0, 0, 4, 0, 0, r * 2.1); gl.addColorStop(0, 'rgba(' + rgb + ',0.75)'); gl.addColorStop(1, 'rgba(' + rgb + ',0)');
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 2.1, 0, 6.283); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(20,10,30,0.82)'; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill();
      c.lineWidth = 4; c.strokeStyle = 'rgb(' + rgb + ')'; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.stroke();
      // 남은 시간 링
      c.lineWidth = 5; c.strokeStyle = k > 0.65 ? '#ff7a7a' : '#fff'; c.beginPath(); c.arc(0, 0, r + 7, -Math.PI / 2, -Math.PI / 2 + (1 - k) * 6.283); c.stroke();
      c.font = Math.round(r * 0.95) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      var mi = window.matImage && window.matImage(m.name);
      if (mi && mi._ok) { var isz = r * 1.55; c.drawImage(mi, -isz / 2, -isz / 2, isz, isz); } else c.fillText(m.emoji, 0, 2);
      c.restore();
      outlined(c, m.name, pos[0], pos[1] + r + 20, 12, '#fff');
    });
    // 터지는 효과
    c.save(); c.globalCompositeOperation = 'lighter';
    S.bursts.forEach(function (b) {
      var q = b.t / b.dur;
      if (b.ring) { c.strokeStyle = 'rgba(' + b.rgb + ',' + (0.8 * (1 - q)).toFixed(2) + ')'; c.lineWidth = 4 * (1 - q) + 1; c.beginPath(); c.arc(b.x, b.y, 14 + q * 60, 0, 6.283); c.stroke(); return; }
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * 6.283 + b.x, d = 10 + q * 70;
        c.fillStyle = 'rgba(' + b.rgb + ',' + (1 - q).toFixed(2) + ')'; c.beginPath(); c.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - q * 14, 4 * (1 - q) + 1, 0, 6.283); c.fill();
      }
    });
    c.restore();
    // 떠오르는 글씨
    S.misses.forEach(function (m) {
      var q = m.t / 0.9; c.globalAlpha = 1 - q * q;
      outlined(c, m.text, m.x, m.y - q * 40, m.quiet ? 22 : 17, m.gold ? '#ffe27a' : '#fff', m.gold ? 'rgba(120,60,0,0.95)' : 'rgba(50,20,0,0.9)'); c.globalAlpha = 1;
    });
    // 아래 카운터로 날아가는 재료
    var tx = W / 2, ty = H - 36;
    S.fly.forEach(function (f) {
      var q = 1 - Math.pow(1 - f.t / f.dur, 3), x = f.x + (tx - f.x) * q, y = f.y + (ty - f.y) * q - Math.sin(q * 3.14) * 70;
      c.font = (f.rare ? 34 : 28) * (1.2 - q * 0.4) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var fi = window.matImage && window.matImage(f.nm);
      if (fi && fi._ok) { var fz = (f.rare ? 44 : 38) * (1.2 - q * 0.4); c.drawImage(fi, x - fz / 2, y - fz / 2, fz, fz); } else c.fillText(f.ch, x, y);
    });
    c.save(); c.translate(tx, ty); var gb = 1 + S.bump * 0.4; c.scale(gb, gb);
    c.fillStyle = 'rgba(20,10,30,0.8)'; roundRect(c, -80, -20, 160, 40, 20); c.fill();
    c.fillStyle = '#ffd700'; c.font = '900 16px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🎁 ' + S.collected.length + '개 모음', 0, 1); c.restore();
    if (S.t < 3) { c.globalAlpha = Math.min(1, 3 - S.t); outlined(c, '빛나는 구슬을 톡톡! ✨', W / 2, H * 0.5, 22, '#fff'); c.globalAlpha = 1; }
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
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';
    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#4e2a1b);border:2px solid #ffb86b;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🎹</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">작곡 스튜디오 탐험 끝!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="studio-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#ffb86b,#ff6fb1);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🔁 다시 하기 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="studio-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('studio-close').onclick = function () { ov.remove(); };
    document.getElementById('studio-again').onclick = function () { ov.remove(); window.startStudio(); };
  }

  window.startStudio = startStudio;
  window.__studioTest = { rollMaterial: rollMaterial, pickSpot: pickSpot, MATS: MATS, SPOTS: SPOTS, get S() { return S; } };

  // ════════ 장소 등록 (game.js / index.html 은 그대로) ════════
  var BTN_ID = 'btn-explore-studio';
  function lockText() {
    return '🎹 작곡 스튜디오 탐험 (⚡' + STAMINA_COST + ')';
  }
  (function register() {
    if (typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined' || typeof PLACE_IMGS === 'undefined' || typeof PLACE_TITLES === 'undefined' ||
        typeof openPlace !== 'function' || typeof window.startExplore !== 'function' ||
        !document.getElementById('btn-explore-mystery') || !document.querySelector('#screen-map button')) { setTimeout(register, 100); return; }
    if (window.__studioRegistered) return;
    window.__studioRegistered = true;
    PLACE_BUTTONS[PLACE_ID] = [BTN_ID, 'btn-compose'];
    ALL_PLACE_BTNS.push(BTN_ID, 'btn-compose');
    PLACE_IMGS[PLACE_ID] = BG_FILE;
    PLACE_TITLES[PLACE_ID] = '🎹 작곡 스튜디오';

    // 장소 화면 안의 입장 버튼 (신비의 섬 버튼 모양을 그대로 빌림)
    var mb = document.getElementById('btn-explore-mystery');
    var eb = document.createElement('button');
    eb.id = BTN_ID;
    eb.setAttribute('style', mb.getAttribute('style').replace(/background:[^;]+;/, 'background:rgba(255,184,107,0.2);').replace(/border:[^;]+;/, 'border:1.5px solid rgba(255,184,107,0.6);'));
    eb.style.display = 'none';
    eb.textContent = lockText();
    eb.onclick = function () { window.startStudio(); };
    mb.parentNode.insertBefore(eb, mb.nextSibling);
    var cb = document.createElement('button');                 // 🎼 작곡 테이블로 이동
    cb.id = 'btn-compose';
    cb.setAttribute('style', eb.getAttribute('style'));
    cb.style.display = 'none';
    cb.textContent = '🎼 작곡 테이블로 이동';
    cb.onclick = function () { if (typeof window.openComposeTable === 'function') window.openComposeTable('make'); };
    eb.parentNode.insertBefore(cb, eb.nextSibling);

    // 포카마을 지도 위 버튼
    var mapBtn = document.querySelector('#screen-map button');
    var vb = document.createElement('button');
    vb.setAttribute('style', mapBtn.getAttribute('style').replace(/left:[^;]+;/, 'left:17%;').replace(/top:[^;]+;/, 'top:52%;').replace(/background:[^;]+;/, 'background:rgba(255,160,90,0.9);'));
    vb.textContent = '🎹 작곡 스튜디오';
    vb.onclick = function () { openPlace(PLACE_ID); };
    mapBtn.parentNode.appendChild(vb);

    // 장소 화면이 열릴 때 잠금 문구 갱신
    var origOpen = window.openPlace;
    window.openPlace = function (id) {
      var r = origOpen.apply(this, arguments);
      if (id === PLACE_ID) { var b = document.getElementById(BTN_ID); if (b) b.textContent = lockText(); }
      return r;
    };
  })();
})();
