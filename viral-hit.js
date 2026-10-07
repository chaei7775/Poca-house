// ════════════════════════════════
// 🚀 숏폼 떡상 (viral-hit.js) — 촬영(CF·드라마)이 끝나면 아주 가끔 "알고리즘 간택!" 연출과 함께 대박 보상
// - 터지는 확률: CF 별1 2% / 별2 5% / 별3 10%, 드라마 기본 3% (히든 카드·OK 컷이면 8%, 시청률 10%면 +3%p). 하루 최대 2번.
// - 보상: 출연료의 3배(최소 30만) 코인 + 🧩 소원의 조각 2개 + (50%) 🖼️ 프리미엄 조각 1개
// - 팬카페(fancafe.js): 그 아이돌 팬카페가 열려 있으면 팬 폭증 + 신규 회원 도배 글 + 대표 팬 감격 글 + 72시간 탈덕 고민 글 방지
// - 정산 버프: 기획사 정산금 +20% (12시간)
// - 시험: 주소 뒤에 ?viral=sion 처럼 붙이면 2초 뒤에 그 아이돌로 한 번 터짐 (하루 횟수는 안 세요)
// 등록: loader.js NEW_CONTENT_FILES 에 'viral-hit.js' 한 줄. 저장: localStorage 'ph_viral'
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_viral';

  // ── ⚙️ 설정 (숫자만 고치면 밸런스 조절) ──
  var CHANCE_CF = { 1: 0.02, 2: 0.05, 3: 0.10 };
  var CHANCE_DRAMA = 0.03, CHANCE_DRAMA_GOOD = 0.08, DRAMA_TOP_BONUS = 0.03;
  var DAILY_MAX = 2;
  var PAY_MULT = 3, PAY_MIN = 300000;       // 보너스 코인 = max(출연료 × PAY_MULT, PAY_MIN)
  var WISH_GIVE = 2, PIECE_CHANCE = 0.5;
  var BUFF_MULT = 1.2, BUFF_HOURS = 12;     // 기획사 정산금 버프
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function idolName(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function won(n) { return Number(n).toLocaleString('ko-KR'); }

  // ── 기획사 정산 버프: getEnhanceIncomeMult 를 감싸서 배율만 곱한다 ──
  function buffOn() { return Date.now() < (load().buffUntil || 0); }
  (function hookIncome(tries) {
    var o = window.getEnhanceIncomeMult;
    if (typeof o !== 'function' && tries < 40) { setTimeout(function () { hookIncome(tries + 1); }, 500); return; }
    if (o && o.__viral) return;
    var w = function () { var b = (typeof o === 'function') ? o.apply(this, arguments) : 1; return b * (buffOn() ? BUFF_MULT : 1); };
    w.__viral = true; window.getEnhanceIncomeMult = w;
  })(0);

  // ── 보상 지급 ──
  function grant(cid, pay, forced) {
    var st = load();
    if (!forced) { if (st.day !== today()) { st.day = today(); st.count = 0; } st.count = (st.count || 0) + 1; }
    st.total = (st.total || 0) + 1;
    st.buffUntil = Date.now() + BUFF_HOURS * 3600000;
    save(st);
    var coinGot = Math.round(Math.max((pay || 0) * PAY_MULT, PAY_MIN) / 100) * 100;
    try { coins += coinGot; if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
    var got = { coins: coinGot, wish: 0, piece: 0, fans: null, cafe: false };
    try {
      wishFragments += WISH_GIVE; localStorage.setItem('ph_wish', wishFragments);
      addToBag('🧩', '소원의 조각', 'wish', WISH_GIVE, '100개 모으면 소원의 결정! (현재: ' + wishFragments + '개)'); got.wish = WISH_GIVE;
    } catch (e) {}
    if (Math.random() < PIECE_CHANCE) {
      try { if (addToBag('🖼️', '프리미엄 조각', 'piece', 1, '프리미엄 카드 조각 · 100개를 모으면 더보기 > 프리미엄 카드에서 교환')) got.piece = 1; } catch (e) {}
    }
    try {
      if (typeof window.__fancafeHas === 'function' && window.__fancafeHas(cid) && typeof window.__fancafeViral === 'function') {
        var r = window.__fancafeViral(cid); if (r) { got.fans = r; got.cafe = true; }
      }
    } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return got;
  }

  // ── 연출 ──
  var css = false;
  function injectCss() {
    if (css) return; css = true;
    var s = document.createElement('style');
    s.textContent =
      '@keyframes vhFlash{0%{opacity:0;transform:scale(.6)}15%{opacity:1;transform:scale(1.08)}30%{transform:scale(.98)}100%{opacity:1;transform:scale(1)}}' +
      '@keyframes vhShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(4px,2px)}}' +
      '@keyframes vhGlow{0%,100%{box-shadow:0 0 0 rgba(255,60,120,0)}50%{box-shadow:0 0 60px rgba(255,60,120,.65),inset 0 0 60px rgba(167,80,255,.35)}}' +
      '@keyframes vhUp{0%{transform:translateY(0) scale(.7);opacity:0}15%{opacity:1}100%{transform:translateY(-260px) scale(1.25);opacity:0}}' +
      '@keyframes vhCm{0%{transform:translateY(24px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
      '@keyframes vhPop{0%{transform:scale(.7);opacity:0}100%{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
  var COMMENTS = ['미친 이 {idol} 누구냐? ㅋㅋㅋㅋ', '알고리즘이 나를 여기로 이끌었다...', '헐 3초 나오는 사람 누구임? 이름 좀', '입덕 완료. 소속사 열일하네', '이거 나만 보기 아까워서 공유함', '댓글 보고 정주행 시작했다'];

  function show(cid, source, pay, forced) {
    if (document.getElementById('vh-overlay')) return;
    injectCss();
    var idol = idolName(cid), got = grant(cid, pay, forced), timers = [], raf = 0, done = false;
    try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play('gachaHigh'); } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]); } catch (e) {}

    var ov = document.createElement('div'); ov.id = 'vh-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:3000;background:#08060f;display:flex;align-items:center;justify-content:center;overflow:hidden;' + FONT;
    ov.innerHTML =
      '<div id="vh-flash" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:vhGlow 0.7s ease 2;text-align:center;">' +
        '<div style="font-size:54px;animation:vhShake .5s ease 1;">🚨</div>' +
        '<div style="font-size:30px;font-weight:900;letter-spacing:1px;color:#fff;text-shadow:0 0 14px #ff3c78,0 0 34px #a855f7;animation:vhFlash .6s ease both;margin-top:6px;">ALGORITHM<br>BUSTED!</div>' +
        '<div style="font-size:15px;font-weight:900;color:#ffb3d1;margin-top:10px;animation:vhFlash .8s ease both;">알고리즘 간택!</div></div>' +
      '<div id="vh-feed" style="display:none;position:relative;width:100%;max-width:420px;height:100%;"></div>' +
      '<button id="vh-skip" style="position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:14px;z-index:5;background:rgba(255,255,255,.14);border:none;border-radius:99px;color:#fff;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer;' + FONT + '">건너뛰기 ›</button>';
    document.body.appendChild(ov);

    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function stop() { timers.forEach(clearTimeout); cancelAnimationFrame(raf); }

    function feed() {
      var f = ov.querySelector('#vh-feed'), fl = ov.querySelector('#vh-flash'); if (!f) return;
      fl.style.display = 'none'; f.style.display = 'block';
      f.innerHTML =
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a1033,#0b0817 60%,#000);"></div>' +
        '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-56%);width:62%;aspect-ratio:3/4;border-radius:18px;overflow:hidden;background:linear-gradient(135deg,#ff6b9d,#a855f7);box-shadow:0 0 40px rgba(255,60,120,.5);">' +
          '<img src="face-' + cid + '.png" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center top;" onerror="this.style.display=\'none\'">' +
          '<div style="position:absolute;left:0;right:0;bottom:0;padding:26px 12px 10px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;font-size:13px;font-weight:900;">@' + idol + ' <span style="font-weight:400;opacity:.8;">· ' + (source === 'cf' ? 'CF 비하인드' : '드라마 명장면') + '</span></div></div>' +
        '<div style="position:absolute;right:12px;bottom:34%;display:flex;flex-direction:column;gap:16px;align-items:center;color:#fff;font-size:11px;font-weight:700;text-align:center;">' +
          '<div style="font-size:30px;">❤️<div id="vh-like">0</div></div><div style="font-size:28px;">💬<div id="vh-cm">0</div></div><div style="font-size:28px;">↗️<div>공유</div></div></div>' +
        '<div style="position:absolute;left:0;right:0;top:calc(52px + env(safe-area-inset-top,0px));text-align:center;color:#fff;"><div style="font-size:11px;opacity:.7;">TIK-POCA · 실시간 조회수</div>' +
          '<div id="vh-views" style="font-size:34px;font-weight:900;text-shadow:0 0 16px #ff3c78;">👁️ 1,200</div></div>' +
        '<div id="vh-hearts" style="position:absolute;right:20px;bottom:30%;width:60px;height:10px;pointer-events:none;"></div>' +
        '<div id="vh-cms" style="position:absolute;left:12px;right:70px;bottom:calc(26px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:5px;"></div>';
      var views = f.querySelector('#vh-views'), like = f.querySelector('#vh-like'), cm = f.querySelector('#vh-cm'), hearts = f.querySelector('#vh-hearts');
      var steps = [1200, 45000, 890000, 5200000], t0 = Date.now(), DUR = 2000;
      (function tick() {
        if (done || !views.isConnected) return;
        var p = Math.min(1, (Date.now() - t0) / DUR), seg = Math.min(2, Math.floor(p * 3)), sp = p * 3 - seg;
        var e = sp * sp * (3 - 2 * sp), v = Math.round(steps[seg] + (steps[seg + 1] - steps[seg]) * e);
        views.textContent = '👁️ ' + won(v) + (p >= 1 ? '+' : '');
        like.textContent = won(Math.round(v * 0.11)); cm.textContent = won(Math.round(v * 0.006));
        if (Math.random() < 0.55) {
          var h = document.createElement('div'); h.textContent = ['❤️', '💖', '💗'][Math.floor(Math.random() * 3)];
          h.style.cssText = 'position:absolute;bottom:0;left:' + Math.round(Math.random() * 50) + 'px;font-size:' + (16 + Math.round(Math.random() * 16)) + 'px;animation:vhUp 1.1s ease-out forwards;';
          hearts.appendChild(h); setTimeout(function () { h.remove(); }, 1200);
        }
        if (p < 1) raf = requestAnimationFrame(tick);
      })();
      // 댓글: 2.0초 뒤부터 빠르게 올라옴
      T(function () {
        var box = f.querySelector('#vh-cms'); if (!box) return;
        COMMENTS.slice(0, 5).forEach(function (c, i) {
          T(function () {
            var d = document.createElement('div');
            d.textContent = '💬 ' + c.replace(/\{idol\}/g, idol);
            d.style.cssText = 'background:rgba(0,0,0,.55);border-radius:12px;padding:6px 10px;color:#fff;font-size:12px;animation:vhCm .25s ease both;';
            box.appendChild(d); while (box.children.length > 4) box.removeChild(box.firstChild);
          }, i * 260);
        });
      }, 2000);
    }

    function reward() {
      if (done) return; done = true; stop();
      var lines = [
        '<div style="display:flex;justify-content:space-between;"><span>🍔 보너스 정산금</span><b style="color:#FFD700;">+' + won(got.coins) + '</b></div>',
        got.wish ? '<div style="display:flex;justify-content:space-between;"><span>🧩 소원의 조각</span><b style="color:#FFD700;">+' + got.wish + '개</b></div>' : '',
        got.piece ? '<div style="display:flex;justify-content:space-between;"><span>🖼️ 프리미엄 조각</span><b style="color:#FFD700;">+' + got.piece + '개</b></div>' : '',
        got.cafe ? '<div style="display:flex;justify-content:space-between;"><span>☕ 팬카페 신규 회원</span><b style="color:#7CF3A8;">+' + won(got.fans.gain + got.fans.joined) + '명 (' + won(got.fans.before) + ' → ' + won(got.fans.after) + ')</b></div>' : '',
        '<div style="display:flex;justify-content:space-between;"><span>📈 기획사 정산금 ×' + BUFF_MULT + '</span><b style="color:#7CF3A8;">' + BUFF_HOURS + '시간</b></div>',
        got.cafe ? '<div style="display:flex;justify-content:space-between;"><span>🛡️ 팬 탈덕 고민 글</span><b style="color:#7CF3A8;">72시간 방지</b></div>' : ''
      ].join('');
      var hint = got.cafe ? '' : '<div style="font-size:11px;color:#bbb;margin-top:10px;">☕ 팬카페를 열어두면 이럴 때 팬도 한꺼번에 들어와요</div>';
      ov.innerHTML =
        '<div style="width:86%;max-width:330px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:20px;padding:22px 20px;text-align:center;color:#fff;animation:vhPop .35s ease both;">' +
          '<div style="font-size:40px;">🎉</div><div style="font-size:19px;font-weight:900;margin:4px 0 2px;">바이럴 보너스 획득!</div>' +
          '<div style="font-size:12px;color:#ddd;margin-bottom:14px;">' + idol + '의 영상이 알고리즘을 탔어요 · 조회수 5,200,000+</div>' +
          '<div style="display:flex;flex-direction:column;gap:7px;font-size:13px;text-align:left;">' + lines + '</div>' + hint +
          '<div style="display:flex;gap:8px;margin-top:16px;">' +
            (got.cafe ? '<button id="vh-cafe" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">☕ 팬카페 확인</button>' : '') +
            '<button id="vh-ok" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">확인</button></div></div>';
      var ok = ov.querySelector('#vh-ok'), cafe = ov.querySelector('#vh-cafe');
      if (ok) ok.onclick = function () { ov.remove(); };
      if (cafe) cafe.onclick = function () { ov.remove(); try { if (typeof window.openFanCafe === 'function') window.openFanCafe(cid); } catch (e) {} };
    }

    ov.querySelector('#vh-skip').onclick = function () { stop(); reward(); };
    T(feed, 600);        // 0.6초: 숏폼 화면 + 조회수 폭주 (2초)
    T(reward, 4600);     // 연출이 끝나면 보상
  }

  // ── 터질지 굴리기 ──
  function roll(p) {
    var st = load();
    if (st.day === today() && (st.count || 0) >= DAILY_MAX) return false;
    return Math.random() < p;
  }
  window.addEventListener('ph-drama-shot', function (e) {
    var d = (e && e.detail) || {}; if (!d.ch) return;
    var p = (d.hid || d.ok) ? CHANCE_DRAMA_GOOD : CHANCE_DRAMA;
    if ((d.r || 0) >= 10) p += DRAMA_TOP_BONUS;
    if (roll(p)) setTimeout(function () { show(d.ch, 'drama', d.pay || 0); }, 700);
  });
  window.addEventListener('ph-cf-shot', function (e) {
    var d = (e && e.detail) || {}; if (!d.cid || !d.stars) return;
    if (roll(CHANCE_CF[d.stars] || 0)) setTimeout(function () { show(d.cid, 'cf', d.pay || 0); }, 3200);   // CF 결과 화면이 뜬 뒤에
  });

  // ── 시험용 ──
  window.__viralTest = { show: function (cid, src, pay) { show(cid || 'sion', src || 'cf', pay || 100000, true); }, load: load };
  try {
    var m = /[?&]viral=([a-z_]+)/.exec(location.search);
    if (m) setTimeout(function () { show(m[1], 'cf', 100000, true); }, 2000);
  } catch (e) {}
})();
