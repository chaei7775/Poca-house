// ════════════════════════════════════════════════════════════
// 🔮 재조합 연출 (recombine-fx.js)
//  기존: 보라색 동그라미가 빙글빙글 → 번쩍. 바꾼 것: 카드 두 장이 빛을 끌어모으며 하나로 합쳐지는 연출.
//   0.0~0.7초  카드 두 장이 양쪽에서 들어옴
//   0.7~2.3초  서로를 향해 천천히 끌려오며 빛 입자가 중심으로 빨려 듦, 고리가 나타남
//   2.3~2.9초  두 장이 겹치며 하나의 빛 덩어리로
//   2.9~3.4초  빛이 수축·떨림 (긴장) → 3.4초에 폭발 (※ sfx.js 의 결과 소리 타이밍 3.45초와 같음)
//  결과 공개는 뽑기 연출(gacha-fx.js)을 그대로 써서 카드가 뒤집히며 나타남 (히든 카드는 효과 줄도 함께).
// 이모지 없이 캔버스·CSS 로 직접 그림. 카드 뒷면 그림(gacha-back.webp)을 재사용.
// playRecombineAnimation / showRecombineResult 를 대신한다 (loader 에서 sfx.js, gacha-fx.js 보다 뒤 / sfx.js 보다 앞).
// ✏️ 고치는 법: 아래 [설정] 숫자만 바꾸면 됨
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── [설정] ──
  var REVEAL_MS = 3400;        // 폭발·결과 공개 시점 (sfx.js 의 소리 타이밍과 맞춰져 있음)
  var BACK = (typeof B !== 'undefined' ? B : '') + 'gacha-back.webp';
  var MC_OUT = (typeof B !== 'undefined' ? B : '') + 'rc-circle-outer.webp';   // 마법진 바깥 고리 (그림 바꾸려면 같은 이름으로 덮어쓰기)
  var MC_IN = (typeof B !== 'undefined' ? B : '') + 'rc-circle-inner.webp';    // 마법진 안쪽 육망성
  var TEXTS = [[500, '재료를 흡수하는 중'], [2000, '두 카드가 하나로'], [2800, '운명이 결정되고 있어요']];

  function css() {
    if (document.getElementById('rfx-css')) return;
    var st = document.createElement('style'); st.id = 'rfx-css';
    st.textContent =
      '#rc-anim-overlay{position:fixed;inset:0;z-index:990;overflow:hidden;font-family:"Noto Sans KR",sans-serif;color:#fff;background:radial-gradient(ellipse at 50% 44%,#2b1a5e 0%,#120a30 48%,#04020c 100%);animation:rfx-in .35s ease both}' +
      '@keyframes rfx-in{from{opacity:0}to{opacity:1}}' +
      '#rc-anim-overlay .cv{position:absolute;inset:0;width:100%;height:100%}' +
      '#rc-anim-overlay .rc{position:absolute;left:0;top:0;border-radius:14px;overflow:hidden;will-change:transform,opacity;box-shadow:0 0 28px rgba(190,150,255,.65);background:linear-gradient(150deg,#3a2480,#1b1046)}' +
      '#rc-anim-overlay .rc img{width:100%;height:100%;object-fit:cover;display:block}' +
      '#rc-anim-overlay .mc{position:absolute;left:0;top:0;opacity:0;pointer-events:none;will-change:transform,opacity;mix-blend-mode:screen;filter:drop-shadow(0 0 10px rgba(170,120,255,.55))}' +
      '#rc-anim-overlay .core{position:absolute;left:0;top:0;border-radius:50%;will-change:transform,opacity;mix-blend-mode:screen}' +
      '#rc-anim-overlay .txt{position:absolute;left:0;right:0;bottom:17%;text-align:center;font-size:13px;letter-spacing:4px;font-weight:300;color:rgba(255,255,255,.82);transition:opacity .35s}' +
      '#rc-anim-overlay .ttl{position:absolute;left:0;right:0;top:13%;text-align:center;font-family:"Nunito","Noto Sans KR",sans-serif;font-size:13px;font-weight:800;letter-spacing:8px;color:rgba(255,255,255,.55)}' +
      '#rc-anim-overlay .fl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}';
    document.head.appendChild(st);
  }

  function play(result, card) {
    css();
    var old = document.getElementById('rc-anim-overlay'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'rc-anim-overlay';
    var hid = result && result.type === 'hidden', epic = hid && result.hidden && result.hidden.grade === '에픽히든';
    var hue = epic ? [255, 215, 90] : [190, 140, 255];            // 최종 빛 색 (에픽히든은 금빛)
    ov.innerHTML = '<canvas class="cv"></canvas><img class="mc mo" src="' + MC_OUT + '" alt="" decoding="async"><img class="mc mi" src="' + MC_IN + '" alt="" decoding="async"><div class="ttl">RECOMBINE</div><div class="txt"></div>' +
      '<div class="core"></div><div class="core c2"></div>' +
      '<div class="rc" data-s="-1"><img src="' + BACK + '" alt="" decoding="async" onerror="this.remove()" style="filter:hue-rotate(-35deg) saturate(1.15)"></div>' +
      '<div class="rc" data-s="1"><img src="' + BACK + '" alt="" decoding="async" onerror="this.remove()" style="filter:hue-rotate(35deg) saturate(1.15)"></div>' +
      '<div class="fl"></div>';
    document.body.appendChild(ov);
    var cv = ov.querySelector('canvas'), c = cv.getContext('2d'), txt = ov.querySelector('.txt'), ttl = ov.querySelector('.ttl');
    var cards = [].slice.call(ov.querySelectorAll('.rc')), core = ov.querySelector('.core'), core2 = ov.querySelector('.c2'), fl = ov.querySelector('.fl');
    var W, H, D, cx, cy, cw, ch;
    function size() {
      D = Math.min(2, window.devicePixelRatio || 1); W = ov.clientWidth; H = ov.clientHeight; cv.width = W * D; cv.height = H * D; c.setTransform(D, 0, 0, D, 0, 0);
      cx = W / 2; cy = H * 0.44; cw = Math.min(118, W * 0.3); ch = cw * 4 / 3;
      cards.forEach(function (e) { e.style.width = cw + 'px'; e.style.height = ch + 'px'; });
    }
    size();
    var parts = [], t0 = performance.now(), raf = 0, done = false, lastT = 0, spawnAcc = 0, burstDone = false;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
    function rgba(a) { return 'rgba(' + hue[0] + ',' + hue[1] + ',' + hue[2] + ',' + a + ')'; }
    var txtI = -1;
    function setText(i) { if (i === txtI) return; txtI = i; txt.style.opacity = 0; setTimeout(function () { if (!done) { txt.textContent = TEXTS[i][1]; txt.style.opacity = 1; } }, 120); }

    function spark(p) {   // 4각 반짝이
      var s = p.sz; c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .12, -s * .12, s, 0); c.quadraticCurveTo(s * .12, s * .12, 0, s); c.quadraticCurveTo(-s * .12, s * .12, -s, 0); c.quadraticCurveTo(-s * .12, -s * .12, 0, -s); c.fill();
    }
    function frame(now) {
      if (done) return;
      var t = (now - t0), dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
      var ts = t / 1000, sx = cw * 0.0;
      // 텍스트 단계
      for (var i = TEXTS.length - 1; i >= 0; i--) { if (t >= TEXTS[i][0]) { setText(i); break; } }
      ttl.style.opacity = ease(ts / 0.8) * (1 - ease((ts - 2.6) / 0.4));
      // 카드 위치 (단계별)
      var enter = ease(ts / 0.7), pull = ease((ts - 0.7) / 1.6), merge = ease((ts - 2.3) / 0.6), shrink = ease((ts - 2.3) / 0.6);
      var spread = W * 0.5 + cw * 0.5;                          // 화면 밖에서 시작
      var gap = cw * 0.62;                                      // 처음 멈추는 간격 (중심에서 각 카드까지)
      cards.forEach(function (e, k) {
        var sgn = +e.getAttribute('data-s');
        var dist = (1 - enter) * spread + enter * (gap + cw * 0.55) * (1 - pull * 0.78) * (1 - merge) + (1 - merge) * 0;
        var x = cx + sgn * (enter < 1 ? ((1 - enter) * spread + enter * (gap + cw * 0.55)) : (gap + cw * 0.55) * (1 - pull * 0.78) * (1 - merge));
        var bob = Math.sin(ts * 2.6 + k * 2) * 6 * (1 - merge) * enter;
        var y = cy + bob;
        var rot = sgn * (10 - pull * 10) * (1 - merge) + (1 - enter) * sgn * 20;
        var sc = 1 - shrink * 0.55 + Math.sin(ts * 9) * 0.01 * pull;
        var op = enter * (1 - ease((ts - 2.55) / 0.4));
        e.style.opacity = op;
        e.style.transform = 'translate(' + (x - cw / 2) + 'px,' + (y - ch / 2) + 'px) rotate(' + rot + 'deg) scale(' + sc + ')';
      });
      // 중앙 빛 덩어리
      var grow = ease((ts - 1.7) / 1.2), contract = ease((ts - 3.0) / 0.38), pulse = 1 + Math.sin(ts * (6 + grow * 14)) * 0.05 * grow;
      var csz = (60 + grow * 190) * (1 - contract * 0.55) * pulse;
      var shk = ts > 2.9 ? (ts - 2.9) * 5 : 0, jx = ts > 2.9 ? Math.sin(ts * 70) * shk : 0, jy = ts > 2.9 ? Math.cos(ts * 63) * shk : 0;
      var cop = ease((ts - 1.5) / 0.9);
      core.style.cssText += ';width:' + csz + 'px;height:' + csz + 'px;opacity:' + cop + ';transform:translate(' + (cx - csz / 2 + jx) + 'px,' + (cy - csz / 2 + jy) + 'px);background:radial-gradient(circle,rgba(255,255,255,.95) 0%,' + rgba(0.85) + ' 28%,' + rgba(0.25) + ' 58%,rgba(0,0,0,0) 72%)';
      var c2s = csz * 2.1;
      core2.style.cssText += ';width:' + c2s + 'px;height:' + c2s + 'px;opacity:' + (cop * 0.55) + ';transform:translate(' + (cx - c2s / 2) + 'px,' + (cy - c2s / 2) + 'px);background:radial-gradient(circle,' + rgba(0.28) + ' 0%,rgba(0,0,0,0) 65%)';

      // 캔버스: 입자 + 고리 + 십자 빛
      c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
      // 마법진 (0.7초부터 나타나 카드가 가까워질수록 작아지며 빠르게 돎)
      var ringA = ease((ts - 0.7) / 0.6) * (1 - ease((ts - 3.1) / 0.25));
      var mo = ov.querySelector('.mo'), mi = ov.querySelector('.mi');
      var msz = cw * 3.1 * (1 - pull * 0.28) * (1 - contract * 0.45), isz = msz * 0.74;
      var spin = ts * (0.35 + pull * 0.5);
      mo.style.width = mo.style.height = msz + 'px'; mi.style.width = mi.style.height = isz + 'px';
      mo.style.opacity = ringA * 0.9; mi.style.opacity = ringA;
      mo.style.transform = 'translate(' + (cx - msz / 2) + 'px,' + (cy - msz / 2) + 'px) rotate(' + (spin * 57.3) + 'deg)';
      mi.style.transform = 'translate(' + (cx - isz / 2) + 'px,' + (cy - isz / 2) + 'px) rotate(' + (-spin * 1.6 * 57.3) + 'deg)';
      // 십자 빛줄기 (덩어리가 커질 때)
      if (grow > 0) {
        var L = (80 + grow * 260) * (1 - contract * 0.7), a = 0.55 * grow * (1 - ease((ts - 3.2) / 0.2));
        c.save(); c.translate(cx, cy); c.rotate(ts * 0.25);
        for (var q = 0; q < 2; q++) { var g = c.createLinearGradient(-L, 0, L, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-L, -1.2, L * 2, 2.4); c.rotate(1.5708); }
        c.restore();
      }
      // 입자 생성: 카드 근처에서 나와 중심으로 휘감겨 들어감
      if (ts < 3.0) {
        spawnAcc += dt * (40 + pull * 70);
        while (spawnAcc >= 1) {
          spawnAcc -= 1; var side = Math.random() < 0.5 ? -1 : 1, ang = rnd(0, 6.283), rad = rnd(cw * 0.9, Math.min(W, H) * 0.46);
          parts.push({ a: ang, r: rad, w: rnd(1.4, 3.2) * (Math.random() < .5 ? 1 : -1), v: rnd(60, 140), sz: rnd(2, 5), life: rnd(1.0, 1.9), max: 1.9, k: Math.random() < 0.35 ? 1 : 0, mode: 0 });
        }
      }
      parts = parts.filter(function (p) {
        p.life -= dt; if (p.life <= 0) return false;
        if (p.mode === 0) {
          p.r -= p.v * dt * (1 + (ts * 0.35)); p.a += p.w * dt * (1 + (1 - p.r / 300) * 1.5); if (p.r < 6) return false;
          var x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r * 0.9;
          var al = Math.min(1, p.life / p.max * 2) * Math.min(1, (p.r) / 40);
          c.fillStyle = p.k ? 'rgba(255,255,255,' + al + ')' : rgba(al); c.shadowColor = rgba(1); c.shadowBlur = 8;
          c.save(); c.translate(x, y); if (p.k) { c.rotate(ts * 2); spark(p); } else { c.beginPath(); c.arc(0, 0, p.sz * 0.5, 0, 6.283); c.fill(); } c.restore();
        } else {   // 폭발 입자
          p.vx *= (1 - 1.5 * dt); p.vy = p.vy * (1 - 1.2 * dt) + 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, p.life / p.max * 1.8); c.fillStyle = p.col; c.shadowColor = p.col; c.shadowBlur = 10;
          if (p.k) spark(p); else { c.beginPath(); c.arc(0, 0, p.sz * 0.5, 0, 6.283); c.fill(); } c.restore();
        }
        return true;
      });
      c.shadowBlur = 0;

      // 폭발
      if (t >= REVEAL_MS && !burstDone) {
        burstDone = true;
        fl.style.transition = 'none'; fl.style.opacity = epic ? 1 : 0.9; void fl.offsetWidth; fl.style.transition = 'opacity .55s ease-out'; fl.style.opacity = 0;
        var cols = ['#ffffff', 'rgb(' + hue.join(',') + ')', '#ffe9a8', '#ffb3e6'];
        for (var n = 0; n < (epic ? 110 : hid ? 80 : 55); n++) { var an = rnd(0, 6.283), v = rnd(80, epic ? 480 : 380); parts.push({ mode: 1, x: cx, y: cy, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vr: rnd(-6, 6), rot: 0, sz: rnd(4, 11), life: rnd(0.7, 1.4), max: 1.4, k: Math.random() < 0.5 ? 1 : 0, col: cols[n % cols.length] }); }
        // 충격파 고리
        var sw = document.createElement('div'); sw.style.cssText = 'position:absolute;left:' + (cx - 20) + 'px;top:' + (cy - 20) + 'px;width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.9);box-shadow:0 0 30px ' + rgba(0.9) + ';opacity:1;transform:scale(1);transition:transform .7s cubic-bezier(.1,.7,.3,1),opacity .7s ease-out;pointer-events:none';
        ov.appendChild(sw); requestAnimationFrame(function () { sw.style.transform = 'scale(' + (Math.max(W, H) / 40) + ')'; sw.style.opacity = 0; });
        core.style.opacity = 0; core2.style.opacity = 0;
        setTimeout(function () { finish(); }, 260);
      }
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return; done = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size);
      try { window.showRecombineResult(result, card); } catch (e) { console.error('[rc-fx]', e); }
      setTimeout(function () { ov.remove(); }, 650);   // 결과 화면이 올라온 뒤 걷어냄 (번쩍임이 끊기지 않게)
    }
    window.addEventListener('resize', size);
    raf = requestAnimationFrame(function (n) { t0 = n; lastT = n; frame(n); });
  }

  // ── 결과 공개: 뽑기 연출과 같은 카드 뒤집기 ──
  function result(res, card) {
    var F = window.__gachaFxTest;
    var again = function () { try { renderRecombinePage(); } catch (e) {} };
    if (!F || !F.show) { return window.__rcOrigResult ? window.__rcOrigResult(res, card) : undefined; }
    var cd;
    if (res.type === 'hidden') {
      var h = res.hidden;
      cd = { grade: h.grade, name: h.name, img: h.img, lines: (h.effects || []).map(function (e) { return [e.label, e.value]; }) };
      F.show([cd], false, { charge: 520, title: h.grade === '에픽히든' ? 'EPIC HIDDEN!' : 'RARE HIDDEN', sub: h.grade + ' 등장', onClose: again });
    } else {
      cd = { grade: card.grade, name: card.name, img: card.img };
      F.show([cd], false, { charge: 520, sub: card.grade + ' 카드 획득', onClose: again });
    }
  }

  function install() {
    if (typeof window.playRecombineAnimation !== 'function' || typeof window.showRecombineResult !== 'function' || !window.__gachaFxTest) { setTimeout(install, 100); return; }
    if (window.playRecombineAnimation.__rfx) return;
    window.__rcOrigResult = window.showRecombineResult;
    window.showRecombineResult = result;
    play.__rfx = true; window.playRecombineAnimation = play;
  }
  install();
  window.__recombineFxTest = { play: play };
})();
