// ════════════════════════════════════════════════════════════
// ✨ 카드 뽑기 연출 (gacha-fx.js)
//  기존 결과창(이모지 불꽃 + 네모 상자)을 바꾼다: 카드 뒷면이 빛을 모으다가 → 번쩍 → 뒤집혀서 공개.
//  · 등급이 높을수록 빛줄기·입자가 많아지고, 뒤집히기 직전에 등급 색으로 오라가 바뀐다.
//  · 한 장 / 여러 장(3연·5연) 모두 같은 연출. 화면을 누르면 건너뛰기(바로 전부 공개).
//  · 이모지 없이 CSS와 캔버스로 직접 그림 (그림 파일 추가 없음)
//  showGachaResult / showGachaResultMulti 를 대신한다 (sfx.js 가 소리를 입히므로 loader 에서 sfx.js 보다 앞에 있어야 함).
// ✏️ 고치는 법: 아래 [설정] 숫자만 바꾸면 됨
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── [설정] ──
  var CHARGE_MS_ONE = 1500;     // 한 장: 뒤집히기 전 빛 모으는 시간
  var CHARGE_MS_MULTI = 800;    // 여러 장: 첫 카드가 뒤집히기 전
  var STEP_MS = 560;            // 여러 장: 다음 카드가 뒤집히는 간격
  var GR = {
    N:   { c: '#dbe4ee', c2: '#94a3b8', t: 'NICE PULL',          burst: 16,  rays: 0.16 },
    R:   { c: '#6ee7a0', c2: '#16a34a', t: 'RARE',               burst: 28,  rays: 0.26 },
    SR:  { c: '#7cb8ff', c2: '#2563eb', t: 'SUPER RARE',         burst: 48,  rays: 0.42 },
    SSR: { c: '#cf9bff', c2: '#7c3aed', t: 'SPECIAL SUPER RARE', burst: 80,  rays: 0.62 },
    UR:  { c: '#ffe27a', c2: '#ff7ac8', t: 'CONGRATULATIONS!',   burst: 130, rays: 0.9 },
    '레어히든': { c: '#d7a8ff', c2: '#a855f7', t: 'RARE HIDDEN',   burst: 90,  rays: 0.65 },   // 재조합 결과(히든 카드)
    '에픽히든': { c: '#ffe27a', c2: '#ff7ac8', t: 'EPIC HIDDEN!',  burst: 140, rays: 0.95 }
  };
  var BACK = (typeof B !== 'undefined' ? B : '') + 'gacha-back.webp';   // 카드 뒷면 그림 (504x672, 약 70KB). 못 받으면 코드로 그린 보석 모양이 보임
  var RANK = ['N', 'R', 'SR', 'SSR', 'UR'];
  function rk(g) { if (g === '레어히든') return 3; if (g === '에픽히든') return 4; var i = RANK.indexOf(g); return i < 0 ? 0 : i; }
  function gr(card) { return GR[card && card.grade] || GR.N; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ── 스타일 ──
  function css() {
    if (document.getElementById('gfx-css')) return;
    var st = document.createElement('style'); st.id = 'gfx-css';
    st.textContent =
      '.gfx-ov{position:fixed;inset:0;z-index:320;overflow:hidden;font-family:"Noto Sans KR",sans-serif;color:#fff;background:radial-gradient(ellipse at 50% 38%,#2a1856 0%,#120a2e 45%,#05030f 100%);animation:gfx-in .3s ease both;-webkit-tap-highlight-color:transparent;user-select:none}' +
      '@keyframes gfx-in{from{opacity:0}to{opacity:1}}' +
      '.gfx-rays{position:absolute;left:50%;top:40%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.4) 0deg 2.5deg,rgba(255,255,255,0) 2.5deg 15deg);-webkit-mask-image:radial-gradient(circle,#000 0%,rgba(0,0,0,.0) 55%);mask-image:radial-gradient(circle,#000 0%,rgba(0,0,0,.0) 55%);opacity:0;animation:gfx-spin 18s linear infinite;transition:opacity .5s,filter .5s;mix-blend-mode:screen;pointer-events:none}' +
      '@keyframes gfx-spin{to{transform:rotate(360deg)}}' +
      '.gfx-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
      '.gfx-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}' +
      '.gfx-main{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:18px 14px 26px}' +
      '.gfx-head{min-height:62px;text-align:center;opacity:0;transform:translateY(8px) scale(.96);transition:opacity .5s,transform .5s}' +
      '.gfx-head.on{opacity:1;transform:none}' +
      '.gfx-ttl{font-family:"Nunito","Noto Sans KR",sans-serif;font-weight:900;font-size:26px;letter-spacing:2px;line-height:1.1;background:linear-gradient(180deg,#fff 10%,var(--g1) 60%,var(--g2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px var(--gl))}' +
      '.gfx-sub{margin-top:6px;font-size:12px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.75)}' +
      '.gfx-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 10px;width:100%;max-width:400px}' +
      '.gfx-card{perspective:900px;position:relative;animation:gfx-rise .6s cubic-bezier(.2,.9,.3,1.2) both}' +
      '@keyframes gfx-rise{from{opacity:0;transform:translateY(30px) scale(.7)}to{opacity:1;transform:none}}' +
      '.gfx-aura{position:absolute;inset:-14%;border-radius:30px;background:radial-gradient(circle,var(--au) 0%,rgba(0,0,0,0) 68%);opacity:.75;filter:blur(8px);transition:background .25s,opacity .3s;animation:gfx-pulse 1.1s ease-in-out infinite}' +
      '@keyframes gfx-pulse{50%{transform:scale(1.12);opacity:1}}' +
      '.gfx-card.rev .gfx-aura{animation:none;opacity:.9}' +
      '.gfx-in2{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.3,1.25,.4,1)}' +
      '.gfx-card.rev .gfx-in2{transform:rotateY(180deg)}' +
      '.gfx-card.shake .gfx-in2{animation:gfx-shake .32s linear infinite}' +
      '@keyframes gfx-shake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-3px) rotate(-1.2deg)}75%{transform:translateX(3px) rotate(1.2deg)}}' +
      '.gfx-f{position:absolute;inset:0;border-radius:16px;overflow:hidden;-webkit-backface-visibility:hidden;backface-visibility:hidden}' +
      '.gfx-back{background:linear-gradient(150deg,#3a2480 0%,#1b1046 55%,#2a1768 100%);border:3px solid rgba(255,255,255,.55);box-shadow:inset 0 0 26px rgba(160,120,255,.45)}' +
      '.gfx-back.img{border:0;box-shadow:none;background:none}.gfx-back.img:before,.gfx-back.img .gem{display:none}.gfx-back .bk{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}' +
      '.gfx-back:before{content:"";position:absolute;inset:8px;border:1.5px solid rgba(255,255,255,.28);border-radius:11px}' +
      '.gfx-back .gem{position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1;transform:translate(-50%,-50%);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);background:linear-gradient(135deg,#fff,#ffd9f4 40%,#b9a2ff);filter:drop-shadow(0 0 10px rgba(255,255,255,.85));animation:gfx-gem 1.4s ease-in-out infinite}' +
      '@keyframes gfx-gem{50%{transform:translate(-50%,-50%) scale(1.14) rotate(8deg)}}' +
      '.gfx-back:after,.gfx-front:after{content:"";position:absolute;top:-20%;bottom:-20%;width:38%;left:-60%;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));transform:skewX(-18deg);animation:gfx-sweep 2.2s ease-in-out infinite;pointer-events:none}' +
      '@keyframes gfx-sweep{0%{left:-60%}60%,100%{left:130%}}' +
      '.gfx-front{transform:rotateY(180deg);background:#111;border:3px solid var(--g1);box-shadow:0 0 26px var(--gl),inset 0 0 14px rgba(255,255,255,.12)}' +
      '.gfx-front img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.gfx-badge{position:absolute;top:7px;left:7px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.5px;color:#1a1030;background:linear-gradient(135deg,#fff,var(--g1));box-shadow:0 0 10px var(--gl)}' +
      '.gfx-nm{position:absolute;left:0;right:0;bottom:0;padding:16px 6px 7px;text-align:center;font-size:12px;font-weight:900;text-shadow:0 1px 4px #000;background:linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,0))}' +
      '.gfx-extra{text-align:center;font-size:13px;line-height:1.7;color:#fff;opacity:0;transform:translateY(6px);transition:opacity .5s,transform .5s;margin-top:-6px}.gfx-extra.on{opacity:1;transform:none}.gfx-extra b{color:var(--g1)}' +
      '.gfx-btn{margin-top:4px;padding:14px 56px;border:0;border-radius:16px;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ff6b9d,#c084fc);box-shadow:0 6px 22px rgba(192,132,252,.5);opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .4s,transform .4s;font-family:inherit}' +
      '.gfx-btn.on{opacity:1;transform:none;pointer-events:auto}' +
      '.gfx-tap{position:absolute;left:0;right:0;bottom:14px;text-align:center;z-index:3;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.45);pointer-events:none}';
    document.head.appendChild(st);
  }

  // ── 입자 (캔버스) ──
  function Fx(cv) {
    var c = cv.getContext('2d'), parts = [], raf = 0, alive = true, last = 0, W = 0, H = 0;
    function size() { var d = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); }
    size();
    function shape(p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.6));
      c.fillStyle = p.col; c.shadowColor = p.col; c.shadowBlur = 10;
      var s = p.sz;
      if (p.k === 0) { c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * .14, -s * .14, s, 0); c.quadraticCurveTo(s * .14, s * .14, 0, s); c.quadraticCurveTo(-s * .14, s * .14, -s, 0); c.quadraticCurveTo(-s * .14, -s * .14, 0, -s); c.fill(); }
      else if (p.k === 1) { c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .6, 0); c.lineTo(0, s); c.lineTo(-s * .6, 0); c.closePath(); c.fill(); }
      else { c.beginPath(); c.arc(0, 0, s * .45, 0, 6.283); c.fill(); }
      c.restore();
    }
    function tick(t) {
      if (!alive) return; var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
      parts = parts.filter(function (p) {
        p.life -= dt; if (p.life <= 0) return false;
        p.vy += p.g * dt; p.vx *= (1 - p.drag * dt); p.vy *= (1 - p.drag * dt * 0.5); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; shape(p); return true;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    function rnd(a, b) { return a + Math.random() * (b - a); }
    return {
      burst: function (x, y, n, cols, spd) {
        for (var i = 0; i < n; i++) { var a = rnd(0, 6.283), v = rnd(spd * 0.25, spd); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.15, g: 160, drag: 1.6, rot: rnd(0, 6.28), vr: rnd(-6, 6), sz: rnd(4, 11), life: rnd(0.7, 1.5), max: 1.5, k: Math.floor(rnd(0, 3)), col: cols[i % cols.length] }); }
      },
      rain: function (n, cols) {
        for (var i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(-H * 0.2, -10), vx: rnd(-18, 18), vy: rnd(40, 120), g: 20, drag: 0.1, rot: rnd(0, 6.28), vr: rnd(-3, 3), sz: rnd(4, 9), life: rnd(2, 3.6), max: 3.6, k: Math.floor(rnd(0, 3)), col: cols[i % cols.length] });
      },
      resize: size,
      stop: function () { alive = false; cancelAnimationFrame(raf); }
    };
  }

  // ── 본체 ──
  function show(cards, multi, opts) {
    opts = opts || {};
    if (!cards || !cards.length) return;
    css();
    ['gacha-multi-overlay', 'gacha-single-fx'].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    var best = cards.reduce(function (b, c) { return rk(c.grade) > rk(b.grade) ? c : b; }, cards[0]);
    var B = gr(best), n = cards.length;
    var ov = document.createElement('div');
    ov.id = multi ? 'gacha-multi-overlay' : 'gacha-single-fx'; ov.className = 'gfx-ov';
    ov.style.cssText = '--g1:' + B.c + ';--g2:' + B.c2 + ';--gl:' + B.c2 + 'aa;';
    var cw = n === 1 ? 'min(250px,64vw)' : (n <= 3 ? 'min(112px,28vw)' : 'min(112px,28vw)');
    var cardsHtml = cards.map(function (cd, i) {
      var g = gr(cd);
      return '<div class="gfx-card" data-i="' + i + '" style="width:' + cw + ';aspect-ratio:3/4;--g1:' + g.c + ';--gl:' + g.c2 + 'aa;--au:rgba(255,255,255,.55);animation-delay:' + (i * 0.1) + 's">' +
        '<div class="gfx-aura"></div><div class="gfx-in2">' +
        '<div class="gfx-f gfx-back"><div class="gem"></div><img class="bk" src="' + BACK + '" alt="" decoding="async" onload="this.parentNode.classList.add(\'img\')" onerror="this.remove()"></div>' +
        '<div class="gfx-f gfx-front"><img src="' + esc(cd.img) + '" alt="" decoding="async" onerror="this.style.display=\'none\'"><span class="gfx-badge">' + esc(cd.grade) + '</span><div class="gfx-nm">' + esc(cd.name) + '</div></div>' +
        '</div></div>';
    }).join('');
    ov.innerHTML = '<div class="gfx-rays"></div><canvas class="gfx-cv"></canvas><div class="gfx-flash"></div>' +
      '<div class="gfx-main"><div class="gfx-head"><div class="gfx-ttl">' + esc(opts.title || B.t) + '</div><div class="gfx-sub">' + (opts.sub != null ? esc(opts.sub) : (multi ? n + ' DRAW' : esc(best.grade) + ' CARD GET')) + '</div></div>' +
      '<div class="gfx-row">' + cardsHtml + '</div>' +
      (cards[0] && cards[0].lines && cards[0].lines.length ? '<div class="gfx-extra">' + cards[0].lines.map(function (l) { return '<div>' + esc(l[0]) + ' <b>' + esc(l[1]) + '</b></div>'; }).join('') + '</div>' : '') +
      '<button class="gfx-btn" type="button">확인</button></div><div class="gfx-tap">TAP TO SKIP</div>';
    document.body.appendChild(ov);

    var rays = ov.querySelector('.gfx-rays'), flash = ov.querySelector('.gfx-flash'), head = ov.querySelector('.gfx-head'), btn = ov.querySelector('.gfx-btn'), tap = ov.querySelector('.gfx-tap');
    var els = [].slice.call(ov.querySelectorAll('.gfx-card'));
    var fx = Fx(ov.querySelector('.gfx-cv')), timers = [], revealed = 0, finished = false;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); }
    function close() { timers.forEach(clearTimeout); fx.stop(); ov.remove(); window.removeEventListener('resize', fx.resize); if (typeof opts.onClose === 'function') { try { opts.onClose(); } catch (e) {} } else { try { renderHomeIdols(); renderHomeSpeech(); } catch (e) {} } }
    window.addEventListener('resize', fx.resize);
    btn.addEventListener('click', function (e) { e.stopPropagation(); close(); });

    function flashAt(op, ms) { flash.style.transition = 'none'; flash.style.opacity = op; void flash.offsetWidth; flash.style.transition = 'opacity ' + ms + 'ms ease-out'; flash.style.opacity = 0; }
    function reveal(i, quiet) {
      var el = els[i]; if (!el || el.classList.contains('rev')) return;
      var cd = cards[i], g = gr(cd), r = rk(cd.grade);
      el.style.setProperty('--au', g.c + 'cc'); el.classList.remove('shake'); el.classList.add('rev');
      var b = el.getBoundingClientRect();
      var cols = [g.c, '#ffffff', g.c2, '#ffe9a8'];
      if (!quiet) { flashAt(r >= 3 ? 0.85 : r >= 2 ? 0.5 : 0.28, r >= 3 ? 700 : 450); }
      fx.burst(b.left + b.width / 2, b.top + b.height / 2, quiet ? Math.round(g.burst / 2) : g.burst, cols, 150 + r * 70);
      if (r === 4 && !quiet) { fx.rain(70, [g.c, '#fff', g.c2]); }
      revealed++;
      if (revealed >= n) finish();
    }
    function finish() {
      if (finished) return; finished = true; tap.style.display = 'none';
      rays.style.opacity = B.rays * 0.55;
      later(function () { head.classList.add('on'); var ex = ov.querySelector('.gfx-extra'); if (ex) ex.classList.add('on'); }, 250);
      later(function () { btn.classList.add('on'); }, 600);
      if (rk(best.grade) >= 3) { try { if (typeof playFanfare === 'function') playFanfare(); } catch (e) {} }
    }
    function skip() {
      if (finished) return;
      timers.forEach(clearTimeout); timers = [];
      els.forEach(function (el, i) { el.classList.remove('shake'); reveal(i, true); });
    }
    ov.addEventListener('click', function (e) { if (e.target === btn) return; skip(); });

    // 연출 타임라인: 빛 모으기 → 번쩍 → 공개
    rays.style.opacity = 0.12;
    var charge = opts.charge || (multi ? CHARGE_MS_MULTI : CHARGE_MS_ONE);
    later(function () { rays.style.opacity = 0.3; if (rk(best.grade) >= 2) els.forEach(function (el) { el.classList.add('shake'); }); }, Math.round(charge * 0.45));
    later(function () { rays.style.filter = 'brightness(1.6)'; }, Math.round(charge * 0.75));
    if (multi) {
      cards.forEach(function (cd, i) { later(function () { reveal(i); }, charge + i * STEP_MS); });
    } else {
      later(function () { reveal(0); }, charge);
    }
  }

  // 뽑기 화면에 들어갈 때 뒷면 그림을 미리 받아 둠 (처음 뽑을 때 깜빡이지 않게, 시작할 때는 안 받음)
  var pre = false;
  function preload() { if (pre) return; pre = true; try { var im = new Image(); im.decoding = 'async'; im.src = BACK; } catch (e) {} }
  function hookGo(tries) {
    if (typeof window.goTo !== 'function') { if (tries < 100) setTimeout(function () { hookGo(tries + 1); }, 200); return; }
    var o = window.goTo; if (o.__gfx) return;
    var w = function (id) { try { if (id === 'gacha') preload(); } catch (e) {} return o.apply(this, arguments); };
    w.__gfx = true; window.goTo = w;
  }
  hookGo(0);
  function install() {
    window.showGachaResult = function (card) { show([card], false); };
    window.showGachaResultMulti = function (cards) { show(cards, true); };
  }
  install();
  window.__gachaFxTest = { show: show };
})();
