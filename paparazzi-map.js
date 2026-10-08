// ════════════════════════════════════════════════════════════
// 🕵️ 파파라치 탈출 (paparazzi-map.js) — 팬덤 원정 · 플레이어 Lv.30
// 위에서 내려다보는 거리. 카메라를 든 파파라치의 시야(부채꼴)를 피해 맨 위 출구까지 도망쳐요.
//  · 화면을 누른 채 끌면 그쪽으로 걸어가요. 시야 안에 오래 있으면 "찰칵!" (3번 찍히면 실패)
//  · 길 곳곳의 🎁 선물 상자를 먹으면 보너스. 출구에 닿으면 성공!
//  · 스킬 버튼: 💖 윙크 샤워(Lv.25~) 가장 가까운 카메라를 잠깐 멈춤 / ✨ 앵콜 폭죽(Lv.30~) 모든 카메라를 멈춤 / 🌹 장미 세례(Lv.35~) 오래 멈춤
// 보상: 🔨 강화석 · 🔶 굿즈 공방 재료 · 🧪 현상액 · 🛡️ 방지권 · 코인 · 카드 경험치
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 30;       // 열리는 플레이어 레벨
  var STAMINA = 110;         // 입장 스태미나
  var DAILY = 5;             // 하루 보상 100% 횟수
  var WORLD_H = 1700;        // 거리 길이 (px)
  var SPEED = 150;           // 걷는 속도 (px/초)
  var LIVES = 3;             // 찍혀도 되는 횟수
  var SPOT_TIME = 0.55;      // 시야 안에 이만큼(초) 있으면 찰칵
  var CAMS = 9;              // 파파라치 수
  var WIN_COIN = 90000, WIN_EXP = 1300;
  var STONE_WIN = 2, STONE_BONUS = 0.4;        // 성공 시 강화석 기본 개수, 한 개 더 줄 확률
  var PROTECT_WIN = 0.55;                      // 성공 시 방지권 확률
  var BOX_N = 4, BOX_COIN = 9000;
  var BOX_P_GOODS = 0.55, BOX_P_STONE = 0.25;   // 선물 상자: 굿즈 공방 재료 55% / 강화석 25% / 나머지는 코인
  var WIN_DEV = [2, 3], WIN_ONGSTONE = 3;       // 성공하면 🧪현상액 2~3개, 🔶공방의 원석 3개 보너스
  // 🎁 굿즈 공방 재료 (공방의 원석이 두 배로 잘 나옴)
  var GOODS = ['공방의 원석', '공방의 원석', '고급원목', '별빛나무', '빛나는돌', '해바라기', '별빛모래', '네잎클로버'];
  function goodsEmoji(n) { if (n === '공방의 원석') return '🔶'; try { return (typeof getMaterialEmoji === 'function' && getMaterialEmoji(n)) || '📦'; } catch (e) { return '📦'; } }
  function pickGoods() { return GOODS[Math.floor(Math.random() * GOODS.length)]; }
  var LOSE_RATE = 0.4;       // 실패 시 코인·경험치 비율
  var SKILLS = [
    { id: 'wink', lv: 25, icon: '💖', name: '윙크', cd: 8, dur: 3.5, near: true },
    { id: 'encore', lv: 30, icon: '✨', name: '폭죽', cd: 18, dur: 4, near: false },
    { id: 'rose', lv: 35, icon: '🌹', name: '장미', cd: 30, dur: 7, near: false }
  ];

  function play(ctx) {
    var root = ctx.root, W = ctx.W, H = ctx.H;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;';
    root.appendChild(cv);
    var c = cv.getContext('2d');
    var face = new Image(); face.crossOrigin = 'anonymous'; face.src = ctx.face;
    var P = { x: W / 2, y: WORLD_H - 90, r: 13, inv: 0 };
    function gfs(k) { try { return window.FanGear ? window.FanGear.sum(ctx.charId, k) : 0; } catch (e) { return 0; } }   // 🎀 소품 효과
    var G = { forgive: gfs('forgive'), extra: [], t: 0, lives: LIVES, meter: 0, boxes: 0, stone: 0, coin: 0, goods: {}, over: false, flash: 0, tx: null, ty: null, cd: {}, off: 0, msg: '', msgT: 0 };
    // 파파라치 배치: 아래→위로 줄을 서게, 서로 다른 움직임
    var cams = [];
    for (var i = 0; i < CAMS; i++) {
      var y = WORLD_H - 330 - i * ((WORLD_H - 520) / CAMS);
      var patrol = i % 3 === 1;
      cams.push({
        x: patrol ? W / 2 : (i % 2 ? W * 0.22 : W * 0.78), y: y, patrol: patrol, ph: Math.random() * 6.28,
        sp: 0.9 + Math.random() * 0.5, base: patrol ? Math.PI / 2 : (i % 2 ? 0.2 : Math.PI - 0.2), sweep: patrol ? 0.25 : 1.15,
        range: 170 + Math.min(40, (ctx.level - 30) * 4), half: 0.5, off: 0, ang: 0, px: 0
      });
    }
    var boxes = [];
    for (var b = 0; b < BOX_N; b++) boxes.push({ x: 40 + Math.random() * (W - 80), y: WORLD_H - 250 - b * ((WORLD_H - 500) / BOX_N) - Math.random() * 120, got: false });
    var EXIT = { x: W / 2, y: 70, r: 44 };
    function camTick(m, dt) {
      m.ph += dt * m.sp;
      m.ang = m.base + Math.sin(m.ph) * m.sweep;
      if (m.patrol) { m.x = W / 2 + Math.sin(m.ph * 0.8) * (W / 2 - 50); }
      if (m.off > 0) m.off -= dt;
    }
    function inCone(m) {
      if (m.off > 0) return false;
      var dx = P.x - m.x, dy = P.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > m.range || d < 8) return d < 8;
      var a = Math.atan2(dy, dx), da = Math.abs(((a - m.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return da < m.half;
    }
    function say(t) { G.msg = t; G.msgT = 1.3; }
    function useSkill(s) {
      if ((G.cd[s.id] || 0) > 0 || G.over) return;
      G.cd[s.id] = s.cd * (1 - gfs('cd') / 100);   // 🎀 쿨타임 소품
      if (s.near) {
        var best = null, bd = 99999, RR = gfs('reach') > 0 ? 130 * (1 + gfs('reach') / 100) : 0;   // 🎀 사거리 소품: 가까운 카메라 여러 대에 걸림
        cams.forEach(function (m) { var d = Math.hypot(m.x - P.x, m.y - P.y); if (RR && d <= RR) m.off = s.dur; if (d < bd) { bd = d; best = m; } });
        if (best) best.off = s.dur;
      } else cams.forEach(function (m) { m.off = s.dur; });
      say(s.icon + ' ' + s.name + '! 카메라가 잠깐 멈췄어요');
      refreshBtns();
    }
    // 스킬 버튼
    var bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:12px;pointer-events:none;';
    var btns = {};
    SKILLS.forEach(function (s) {
      if (ctx.level < s.lv) return;
      var el = document.createElement('button');
      el.style.cssText = 'pointer-events:auto;width:62px;height:62px;border-radius:50%;border:2px solid #fff;background:rgba(80,40,140,.85);color:#fff;font-size:24px;font-family:inherit;cursor:pointer;position:relative;overflow:hidden;';
      el.innerHTML = s.icon + '<div style="font-size:10px;font-weight:900;line-height:1;margin-top:-2px;">' + s.name + '</div>';
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); useSkill(s); });
      bar.appendChild(el); btns[s.id] = el;
    });
    root.appendChild(bar);
    function refreshBtns() { SKILLS.forEach(function (s) { var el = btns[s.id]; if (el) { var cd = G.cd[s.id] || 0; el.style.opacity = cd > 0 ? 0.45 : 1; } }); }
    // 입력
    function setTarget(e) { var r = cv.getBoundingClientRect(); G.sx = (e.clientX - r.left) / r.width * W; G.sy = (e.clientY - r.top) / r.height * H; G.tx = G.sx; G.ty = camY() + G.sy; }
    cv.addEventListener('pointerdown', function (e) { setTarget(e); G.drag = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (G.drag) setTarget(e); });
    cv.addEventListener('pointerup', function () { G.drag = false; });
    cv.addEventListener('pointercancel', function () { G.drag = false; });
    function camY() { return Math.max(0, Math.min(WORLD_H - H, P.y - H * 0.62)); }

    var last = performance.now(), raf = 0;
    function end(win) {
      if (G.over) return; G.over = true; cancelAnimationFrame(raf);
      var coin = G.coin + (win ? WIN_COIN : 0), exp = win ? WIN_EXP : 0, stone = G.stone, protect = 0;
      var items = Object.keys(G.goods).map(function (n) { return { emoji: goodsEmoji(n), name: n, cat: 'material', qty: G.goods[n], desc: n === '공방의 원석' ? '굿즈 공방 제작 재료 · 탐험·원정에서 나와요' : '굿즈 공방 제작 재료' }; });
      if (win) {
        stone += STONE_WIN + (Math.random() < STONE_BONUS ? 1 : 0); if (Math.random() < PROTECT_WIN) protect = 1;
        items.push({ emoji: '🧪', name: '현상액', cat: 'film', qty: WIN_DEV[0] + Math.floor(Math.random() * (WIN_DEV[1] - WIN_DEV[0] + 1)), desc: '포토랩 옵션 강화 재료' });
        items.push({ emoji: '🔶', name: '공방의 원석', cat: 'material', qty: WIN_ONGSTONE, desc: '굿즈 공방 제작 재료 · 탐험·원정에서 나와요' });
      }
      else { coin = Math.round(coin * LOSE_RATE); }
      setTimeout(function () {
        cv.remove(); bar.remove();
        ctx.finish(ExpKit.mergeLoot({
          win: win, title: win ? '무사히 탈출!' : '사진이 찍혔어요…', coin: coin, exp: exp, stone: stone, protect: protect, items: items,
          summary: win ? '선물 상자 ' + G.boxes + '/' + BOX_N + '개 · 남은 하트 ' + G.lives : '카메라에 ' + LIVES + '번 찍혔어요. 선물 상자 ' + G.boxes + '개는 챙겼어요.'
        }, G.extra));
      }, win ? 500 : 700);
    }
    function loop(now) {
      if (!root.isConnected) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
      if (!G.over) {
        // 이동
        if (G.drag && G.sx != null) { G.tx = G.sx; G.ty = camY() + G.sy; }   // 꾹 누르는 동안엔 손가락 위치를 계속 따라감 (화면이 스크롤돼도)
        if (G.tx != null) {
          var dx = G.tx - P.x, dy = G.ty - P.y, d = Math.hypot(dx, dy);
          if (d > 6) { var s = Math.min(d, SPEED * dt); P.x += dx / d * s; P.y += dy / d * s; }
          else if (!G.drag) { G.tx = null; G.ty = null; }   // 손 떼고 도착하면 멈춤 (톡 찍으면 거기까지 걸어감)
        }
        P.x = Math.max(P.r, Math.min(W - P.r, P.x)); P.y = Math.max(P.r, Math.min(WORLD_H - P.r, P.y));
        cams.forEach(function (m) { camTick(m, dt); });
        Object.keys(G.cd).forEach(function (k) { if (G.cd[k] > 0) { G.cd[k] -= dt; if (G.cd[k] <= 0) refreshBtns(); } });
        if (P.inv > 0) P.inv -= dt;
        var seen = P.inv <= 0 && cams.some(inCone);
        G.meter = Math.max(0, Math.min(1, G.meter + (seen ? dt / SPOT_TIME : -dt * 1.8)));
        if (G.meter >= 1) {
          G.meter = 0; if (G.forgive > 0) { G.forgive--; G.flash = 0.6; P.inv = 1.4; say('🎀 소품이 찰칵을 막아줬어요!'); } else {
          G.lives--; G.flash = 1; P.inv = 1.4; P.y = Math.min(WORLD_H - 40, P.y + 70); G.tx = null;
          say('📸 찰칵! 찍혔어요 (남은 하트 ' + Math.max(0, G.lives) + ')');
          if (G.lives <= 0) end(false); }
        }
        boxes.forEach(function (bx) {
          if (!bx.got && Math.hypot(bx.x - P.x, bx.y - P.y) < 28) {
            bx.got = true; G.boxes++;
            var rr = Math.random();
            if (rr < BOX_P_GOODS) { var gn = pickGoods(), gq = 2 + Math.floor(Math.random() * 2); G.goods[gn] = (G.goods[gn] || 0) + gq; say('🎁 ' + goodsEmoji(gn) + ' ' + gn + ' ×' + gq); }
            else if (rr < BOX_P_GOODS + BOX_P_STONE) { G.stone++; say('🎁 강화석을 찾았어요!'); }
            else { G.coin += BOX_COIN; say('🎁 코인 +' + BOX_COIN.toLocaleString('ko-KR')); }
            if (Math.random() < Math.min(1, gfs('box') / 100)) { var xl = ExpKit.rollLoot(); G.extra.push(xl); say('🎁 소품 덕분에 한 번 더! ' + xl.txt); }   // 🎀 상자 소품: 한 번 더 열림
          }
        });
        if (Math.hypot(EXIT.x - P.x, EXIT.y - P.y) < EXIT.r) end(true);
      }
      draw(); raf = requestAnimationFrame(loop);
    }
    function draw() {
      var cy = camY();
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16223f'); g.addColorStop(1, '#0a0f1f');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.save(); c.translate(0, -cy);
      // 길 + 레드카펫
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(0, 0, W, WORLD_H);
      c.fillStyle = 'rgba(160,30,50,.35)'; c.fillRect(W / 2 - 38, 0, 76, WORLD_H);
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.setLineDash([16, 18]); c.lineWidth = 3;
      c.beginPath(); c.moveTo(W * 0.12, 0); c.lineTo(W * 0.12, WORLD_H); c.moveTo(W * 0.88, 0); c.lineTo(W * 0.88, WORLD_H); c.stroke(); c.setLineDash([]);
      // 출구
      var eg = c.createRadialGradient(EXIT.x, EXIT.y, 4, EXIT.x, EXIT.y, EXIT.r * 1.6); eg.addColorStop(0, 'rgba(120,255,170,.9)'); eg.addColorStop(1, 'rgba(120,255,170,0)');
      c.fillStyle = eg; c.beginPath(); c.arc(EXIT.x, EXIT.y, EXIT.r * 1.6, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '900 15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚪 출구', EXIT.x, EXIT.y);
      // 상자
      boxes.forEach(function (bx) { if (!bx.got) { c.font = '26px sans-serif'; c.fillText('🎁', bx.x, bx.y + Math.sin(G.t * 3 + bx.x) * 2); } });
      // 카메라 시야
      cams.forEach(function (m) {
        var on = m.off <= 0;
        c.fillStyle = on ? 'rgba(255,235,120,.22)' : 'rgba(150,150,170,.1)';
        c.beginPath(); c.moveTo(m.x, m.y); c.arc(m.x, m.y, m.range, m.ang - m.half, m.ang + m.half); c.closePath(); c.fill();
        if (on) { c.strokeStyle = 'rgba(255,235,120,.55)'; c.lineWidth = 1.5; c.stroke(); }
        c.fillStyle = '#1f2937'; c.beginPath(); c.arc(m.x, m.y, 15, 0, 7); c.fill();
        c.font = '17px sans-serif'; c.fillStyle = '#fff'; c.fillText(on ? '📸' : '😵', m.x, m.y + 1);
      });
      // 플레이어
      c.globalAlpha = P.inv > 0 && Math.floor(G.t * 10) % 2 ? 0.4 : 1;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(P.x, P.y, P.r + 3, 0, 7); c.fill();
      if (face.complete && face.naturalWidth) { c.save(); c.beginPath(); c.arc(P.x, P.y, P.r + 1, 0, 7); c.clip(); c.drawImage(face, P.x - P.r - 1, P.y - P.r - 1, (P.r + 1) * 2, (P.r + 1) * 2); c.restore(); }
      else { c.fillStyle = '#f9a8d4'; c.beginPath(); c.arc(P.x, P.y, P.r, 0, 7); c.fill(); }
      c.globalAlpha = 1;
      // 들킴 게이지 (머리 위)
      if (G.meter > 0) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(P.x - 18, P.y - 28, 36, 6); c.fillStyle = '#ff4d4d'; c.fillRect(P.x - 17, P.y - 27, 34 * G.meter, 4); }
      c.restore();
      // HUD
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, 42);
      c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '900 15px sans-serif'; c.fillText('🕵️ 파파라치 탈출', 12, 21);
      c.textAlign = 'right'; c.font = '16px sans-serif'; var hs = ''; for (var h = 0; h < LIVES; h++) hs += h < G.lives ? '❤️' : '🖤'; c.fillText(hs + '  🎁' + G.boxes + '/' + BOX_N, W - 12, 21);
      // 진행도
      var prog = 1 - (P.y - EXIT.y) / (WORLD_H - 90 - EXIT.y);
      c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(0, 40, W, 3); c.fillStyle = '#6ee7b7'; c.fillRect(0, 40, W * Math.max(0, Math.min(1, prog)), 3);
      if (G.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + G.flash * 0.8 + ')'; c.fillRect(0, 0, W, H); G.flash = Math.max(0, G.flash - 0.07); }
      if (G.msgT > 0) { G.msgT -= 0.016; c.globalAlpha = Math.min(1, G.msgT * 2); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(W / 2 - 150, 56, 300, 30); c.fillStyle = '#fff'; c.font = '700 13px sans-serif'; c.textAlign = 'center'; c.fillText(G.msg, W / 2, 71); c.globalAlpha = 1; }
      if (G.t < 3.5) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(W / 2 - 150, H - 150, 300, 56); c.fillStyle = '#fff'; c.font = '700 13px sans-serif'; c.textAlign = 'center'; c.fillText('화면을 누른 채 끌어서 위쪽 출구까지!', W / 2, H - 130); c.fillText('노란 시야 안에 오래 있으면 찍혀요', W / 2, H - 110); }
    }
    refreshBtns(); raf = requestAnimationFrame(loop);
    window.__papaTest = { G: G, P: P, cams: cams, EXIT: EXIT, end: end, inCone: inCone };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'paparazzi_run', bg: 'special-paparazzi_run.jpg', name: '파파라치 탈출', emoji: '🕵️', color: '#38bdf8', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '시야를 피해 탈출! 강화석·굿즈 재료·현상액', gearChance: 0.3,
      intro: ['화면을 <b>누른 채 끌면</b> 걸어가요. 맨 위 <b>🚪 출구</b>가 목표!', '파파라치의 <b>노란 시야</b>에 오래 있으면 📸 찰칵! <b>3번</b> 찍히면 실패예요.', '길 위의 🎁 <b>선물 상자</b>를 먹으면 🔶 <b>굿즈 공방 재료</b>(원석·원목·모래 …), 강화석, 코인이 나와요.', '스킬 버튼: 💖<b>윙크</b>(Lv.25) 가까운 카메라 정지 · ✨<b>폭죽</b>(Lv.30) 전부 정지 · 🌹<b>장미</b>(Lv.35) 오래 정지', '성공하면 <b>강화석</b>, 🧪 <b>현상액</b>, 🔶 <b>원석</b>, 가끔 <b>방지권</b>이 나와요.'],
      play: play
    });
  }
  reg();
})();
