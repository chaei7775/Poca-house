// ════════════════════════════════════════════════════════════
// 🎧 음악방송 리허설장 (rhythm-map.js) — 팬덤 원정 · 플레이어 Lv.25
// 4줄 리듬 터치. 내려오는 음표가 아래 선에 닿을 때 그 줄을 눌러요. 한 곡이 한 판 (약 45초).
// 보상: 작곡 재료(🎸🥁🎹🎤 · 음표 · 악보 …) + 코인 + 카드 경험치. 점수가 높을수록 재료가 많아요.
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 25;        // 열리는 플레이어 레벨
  var STAMINA = 90;           // 입장 스태미나
  var DAILY = 5;              // 하루 보상 100% 횟수 (넘으면 30%)
  var SONG_SEC = 42;          // 곡 길이 (초)
  var BPM = 124;              // 빠르기
  var FALL = 1.45;            // 음표가 위에서 선까지 내려오는 시간 (짧을수록 어려움)
  var PERFECT = 0.075, GOOD = 0.15;   // 판정 범위 (초)
  var COIN = { S: 70000, A: 52000, B: 36000, C: 18000 };
  var EXP = { S: 1100, A: 800, B: 520, C: 250 };
  var MATS_N = { S: 8, A: 6, B: 4, C: 2 };   // 작곡 재료 개수
  var LANE_MATS = ['기타', '드럼', '피아노', '마이크'];   // 줄 아래 아이콘(재료 그림)
  var LANE_EMO = ['🎸', '🥁', '🎹', '🎤'];
  var LANE_COL = ['#f59e0b', '#ef4444', '#38bdf8', '#a78bfa'];

  function rollKinds(n, luck) {
    var K = window.STUDIO_KINDS || [], out = {};
    if (!K.length) return [];
    var total = 0; K.forEach(function (k) { total += k.weight * (k.rare ? 1 + luck : 1); });
    for (var i = 0; i < n; i++) {
      var r = Math.random() * total, pick = K[0];
      for (var j = 0; j < K.length; j++) { var w = K[j].weight * (K[j].rare ? 1 + luck : 1); if (r < w) { pick = K[j]; break; } r -= w; }
      out[pick.id] = (out[pick.id] || 0) + 1;
    }
    return Object.keys(out).map(function (id) { var k = K.filter(function (x) { return x.id === id; })[0]; return { emoji: k.emoji, name: k.name, cat: 'material', qty: out[id], desc: k.desc || '' }; });
  }
  function makeSong(level) {
    var beat = 60 / BPM, notes = [], last = -1, run = 0, t = 1.8;
    var dens = Math.min(0.78, 0.5 + (level - 25) * 0.008), off = Math.min(0.3, 0.1 + (level - 25) * 0.006);
    while (t < SONG_SEC) {
      if (Math.random() < dens) {
        var lane = Math.floor(Math.random() * 4);
        if (lane === last) { run++; if (run >= 2) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4; } else run = 0;
        notes.push({ lane: lane, t: t, hit: 0 }); last = lane;
        if (Math.random() < off * 0.4) { var l2 = (lane + 1 + Math.floor(Math.random() * 3)) % 4; notes.push({ lane: l2, t: t, hit: 0 }); }   // 동시 노트
      }
      if (Math.random() < off) { var l3 = Math.floor(Math.random() * 4); notes.push({ lane: l3, t: t + beat / 2, hit: 0 }); }
      t += beat;
    }
    notes.sort(function (a, b) { return a.t - b.t; });
    return notes;
  }

  function play(ctx) {
    var root = ctx.root, W = ctx.W, H = ctx.H;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;';
    root.appendChild(cv);
    var c = cv.getContext('2d');
    var notes = makeSong(ctx.level), total = notes.length;
    var LINE = H - 150, LW = W / 4;
    var st = { t0: performance.now(), t: -1.2, perfect: 0, good: 0, miss: 0, combo: 0, best: 0, fx: [], flash: [0, 0, 0, 0], over: false, shake: 0 };
    var face = new Image(); face.crossOrigin = 'anonymous'; face.src = ctx.face;
    var iconImgs = LANE_MATS.map(function (n) { try { return window.matImage ? window.matImage(n) : null; } catch (e) { return null; } });
    function hit(lane) {
      st.flash[lane] = 1;
      var best = null, bd = 9;
      notes.forEach(function (n) { if (n.lane === lane && !n.hit) { var d = Math.abs(n.t - st.t); if (d < bd) { bd = d; best = n; } } });
      if (!best || bd > GOOD + 0.05) return;
      best.hit = bd <= PERFECT ? 1 : 2;
      if (best.hit === 1) st.perfect++; else st.good++;
      st.combo++; st.best = Math.max(st.best, st.combo);
      st.fx.push({ x: lane * LW + LW / 2, y: LINE, txt: best.hit === 1 ? 'PERFECT' : 'GOOD', col: best.hit === 1 ? '#ffe27a' : '#8be9ff', a: 1 });
    }
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      hit(Math.max(0, Math.min(3, Math.floor(x / LW))));
      e.preventDefault();
    });
    function finish() {
      if (st.over) return; st.over = true;
      var acc = (st.perfect + st.good * 0.6) / Math.max(1, total);
      var g = acc >= 0.92 ? 'S' : acc >= 0.8 ? 'A' : acc >= 0.6 ? 'B' : 'C';
      var luck = g === 'S' ? 0.6 : g === 'A' ? 0.3 : 0;
      cancelAnimationFrame(raf);
      setTimeout(function () {
        cv.remove();
        ctx.finish({
          win: g !== 'C', title: '랭크 ' + g, coin: COIN[g], exp: EXP[g], items: rollKinds(MATS_N[g], luck),
          summary: 'PERFECT ' + st.perfect + ' · GOOD ' + st.good + ' · MISS ' + st.miss + '<br>최대 콤보 ' + st.best + ' · 정확도 ' + Math.round(acc * 100) + '%'
        });
      }, 400);
    }
    var raf = 0;
    function loop(now) {
      if (!root.isConnected) return;
      st.t = (now - st.t0) / 1000 - 1.2;
      notes.forEach(function (n) { if (!n.hit && st.t - n.t > GOOD + 0.05) { n.hit = -1; st.miss++; st.combo = 0; st.shake = 1; } });
      if (st.t > SONG_SEC + 1.2) { draw(); finish(); return; }
      draw(); raf = requestAnimationFrame(loop);
    }
    function draw() {
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b0f3a'); g.addColorStop(1, '#07040f');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 무대 조명
      var beatP = ((st.t * BPM / 60) % 1 + 1) % 1;
      for (var i = 0; i < 4; i++) {
        var lg = c.createLinearGradient(0, 0, 0, LINE);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, LANE_COL[i] + (st.flash[i] > 0 ? '66' : '22'));
        c.fillStyle = lg; c.fillRect(i * LW + 3, 0, LW - 6, LINE + 60);
        st.flash[i] = Math.max(0, st.flash[i] - 0.08);
      }
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
      for (var k = 1; k < 4; k++) { c.beginPath(); c.moveTo(k * LW, 0); c.lineTo(k * LW, H); c.stroke(); }
      // 판정선
      c.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.25 * (1 - beatP)) + ')'; c.fillRect(0, LINE - 2, W, 4);
      // 노트
      notes.forEach(function (n) {
        if (n.hit > 0) return;
        var y = LINE - (n.t - st.t) / FALL * LINE;
        if (y < -40 || y > H + 40) return;
        var x = n.lane * LW + LW / 2, r = Math.min(LW * 0.36, 30);
        c.globalAlpha = n.hit < 0 ? 0.3 : 1;
        c.fillStyle = LANE_COL[n.lane]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
        var im = iconImgs[n.lane];
        if (im && im._ok) c.drawImage(im, x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
        else { c.font = Math.round(r) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(LANE_EMO[n.lane], x, y + 1); }
        c.globalAlpha = 1;
      });
      // 아래 줄 버튼
      for (var b = 0; b < 4; b++) {
        var bx = b * LW + LW / 2, by = LINE + 62, br = Math.min(LW * 0.38, 34), on = st.flash[b] > 0;
        c.fillStyle = on ? LANE_COL[b] : 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
        c.strokeStyle = LANE_COL[b]; c.lineWidth = 3; c.stroke();
        var ii = iconImgs[b];
        if (ii && ii._ok) c.drawImage(ii, bx - br * 0.7, by - br * 0.7, br * 1.4, br * 1.4);
        else { c.font = Math.round(br) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(LANE_EMO[b], bx, by + 1); }
      }
      // 이펙트
      st.fx.forEach(function (f) { f.y -= 1.2; f.a -= 0.035; if (f.a > 0) { c.globalAlpha = f.a; c.fillStyle = f.col; c.font = '900 16px sans-serif'; c.textAlign = 'center'; c.fillText(f.txt, f.x, f.y - 30); c.globalAlpha = 1; } });
      st.fx = st.fx.filter(function (f) { return f.a > 0; });
      // HUD
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, 54);
      c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '900 15px sans-serif';
      c.fillText('🎧 리허설', 12, 18);
      var cnt = st.perfect + st.good; c.font = '700 12px sans-serif'; c.fillStyle = '#ffd76a'; c.fillText('성공 ' + cnt + ' / ' + total, 12, 38);
      c.textAlign = 'center'; c.font = '900 ' + (22 + Math.min(10, st.combo / 5)) + 'px sans-serif'; c.fillStyle = st.combo >= 10 ? '#ffe27a' : '#fff';
      if (st.combo >= 2) c.fillText(st.combo + ' COMBO', W / 2, 28);
      // 진행 바
      c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(0, 52, W, 3); c.fillStyle = '#a78bfa'; c.fillRect(0, 52, W * Math.max(0, Math.min(1, st.t / SONG_SEC)), 3);
      // 얼굴
      if (face.complete && face.naturalWidth) { var fs = 46 + (1 - beatP) * 4; c.drawImage(face, W - fs - 10, 4, fs, fs); }
      if (st.t < 0) { c.fillStyle = '#fff'; c.font = '900 30px sans-serif'; c.textAlign = 'center'; c.fillText(st.t > -0.6 ? 'GO!' : '준비…', W / 2, H / 2); }
      if (st.shake > 0) { c.fillStyle = 'rgba(255,0,0,' + st.shake * 0.12 + ')'; c.fillRect(0, 0, W, H); st.shake = Math.max(0, st.shake - 0.1); }
    }
    raf = requestAnimationFrame(loop);
    window.__rhythmTest = { st: st, notes: notes, hit: hit };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'rhythm_stage', bg: 'special-rhythm_stage.jpg', name: '음악방송 리허설장', emoji: '🎧', color: '#a78bfa', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '리듬에 맞춰 터치! 작곡 재료 파밍',
      intro: ['내려오는 <b>음표</b>가 아래 선에 닿을 때 그 줄을 <b>눌러요</b> (4줄).', '정확할수록 <b>PERFECT</b>! 점수가 높으면 랭크 S·A·B·C.', '랭크가 높을수록 🎼 <b>작곡 재료</b>가 많이 나와요. S 랭크는 <b>영감의불꽃</b>도 잘 나와요.', '한 곡은 약 45초. 코인과 카드 경험치도 받아요.'],
      play: play
    });
  }
  reg();
})();
