// ════════════════════════════════
// 🏠 새 홈 (home-main.js) — 스크롤 없이 한 화면
//  · 가운데: 내가 고른 '대표 아이돌' 카드 + 말풍선 (누르면 새 대사, ⭐ 눌러서 대표 바꾸기)
//  · 아래: 🎯 지금 할 일 카드(home-goal.js) + 큰 버튼 2개(스케줄 가기 / 카드 뽑기)
//  · 배너·알바 버튼·내 아이돌 줄·일일퀘스트 한 줄은 홈에서 뺌 (알바는 더보기, 퀘스트는 퀘스트 탭)
//  · 퀘스트 탭 아이콘에 받을 게 있으면 빨간 점
// 대표 저장: localStorage 'ph_main_idol' = 카드 id  (큰 그림은 한 장만, cardthumb 작은 그림 사용)
// 되돌리려면 loader.js 에서 'home-main.js' 한 줄만 지우면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_main_idol', ACC = '#fbbf24';
  var css =
    '#screen-home.active{height:calc(100dvh - 60px);min-height:0 !important;padding-bottom:0 !important;overflow:hidden;}' +
    '#screen-home .home-banner,#screen-home .home-speech,#screen-home .home-actions,#screen-home .idol-preview,#screen-home #dq-home-card{display:none !important;}' +
    '#hm-hero{flex:1 1 auto;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;padding:6px 16px 0;}' +
    '#hm-card{height:100%;max-height:100%;aspect-ratio:2/3;border-radius:18px;overflow:hidden;position:relative;box-shadow:0 8px 26px rgba(0,0,0,.35),0 0 0 3px rgba(255,255,255,.55);background:#1a1a2e;}' +
    '#hm-card img{width:100%;height:100%;object-fit:cover;display:block;}' +
    '#hm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#fff;font-weight:900;text-align:center;padding:16px;height:100%;}' +
    '#hm-say{position:absolute;left:18px;right:18px;top:12px;background:rgba(255,255,255,.94);color:#3a2a44;border-radius:14px;padding:6px 10px;font-size:12px;line-height:1.35;box-shadow:0 3px 10px rgba(0,0,0,.2);z-index:2;pointer-events:none;font-family:"Noto Sans KR",sans-serif;}' +
    '#hm-say b{color:#e0457b;display:block;font-size:11px;}' +
    '#hm-pick{position:absolute;right:20px;bottom:6px;z-index:3;border:none;border-radius:16px;padding:7px 12px;font-size:11.5px;font-weight:900;background:rgba(0,0,0,.55);color:#fff;font-family:inherit;border:1.5px solid rgba(255,255,255,.5);}' +
    '#hm-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 14px 8px;}' +
    '#hm-btns button{border:none;border-radius:16px;padding:12px 6px;font-size:14px;font-weight:900;color:#fff;font-family:"Noto Sans KR",sans-serif;line-height:1.3;box-shadow:0 4px 12px rgba(0,0,0,.2);}' +
    '#hm-btns .a{background:linear-gradient(135deg,#ff6b9d,#c084fc);}#hm-btns .b{background:linear-gradient(135deg,#6366f1,#22d3ee);}' +
    '#screen-home #hg-home-card{margin:6px 14px 0 !important;}' +
    '#hm-hero #home-title-badge{position:absolute !important;left:0;right:0;bottom:44px;margin:0 !important;text-align:center;transform:scale(.82);transform-origin:50% 100%;z-index:3;pointer-events:none;}#hm-hero #home-title-badge>div:first-child{display:none !important;}' +
    '#hm-stam{position:absolute;left:12px;bottom:8px;z-index:3;padding:5px 9px;border-radius:12px;background:rgba(40,20,70,.78);color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 8px #0003;font-family:"Noto Sans KR",sans-serif;}' +
    '#screen-home .qg-card{margin:6px 14px !important;padding:8px 12px !important;}#screen-home .qg-hint{font-size:11px !important;line-height:1.4 !important;margin-bottom:6px !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
    '#hm-say{transition:opacity .6s;}#hm-say.off{opacity:0;}' +
    '.nav-dot{position:absolute;top:3px;right:calc(50% - 20px);min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 3px;box-shadow:0 0 0 2px #fff;}';
  var st = document.createElement('style'); st.id = 'hm-style'; st.textContent = css; document.head.appendChild(st);

  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function thumb(img) { try { return cardThumbSrc(img); } catch (e) { return img; } }

  // 가진 카드 목록 (UR/SSR + 히든) — 대표로 고를 수 있는 것들
  var GRADE_RANK = { UR: 9, '에픽히든': 8, '레어히든': 7, SSR: 6 };
  function myCards() {
    var out = [];
    try { CARDS.forEach(function (c) { if (owned.indexOf(c.id) >= 0 && (c.grade === 'UR' || c.grade === 'SSR')) out.push({ id: c.id, name: c.name, grade: c.grade, color: c.gradeColor, img: c.img, charId: c.charId }); }); } catch (e) {}
    try { HIDDEN_CARDS.forEach(function (h) { if (ownedHiddenCards.indexOf(h.id) >= 0) out.push({ id: h.id, name: h.name, grade: h.grade, color: '#f472b6', img: h.img, charId: h.charId }); }); } catch (e) {}
    out.sort(function (a, b) { return (GRADE_RANK[b.grade] || 0) - (GRADE_RANK[a.grade] || 0); });
    return out;
  }
  function mainCard() {
    var all = myCards(), id = ''; try { id = localStorage.getItem(KEY) || ''; } catch (e) {}
    var f = all.filter(function (c) { return c.id === id; })[0];
    return f || all[0] || null;
  }
  function lineOf(cid) {
    try { var ch = CHARS[cid]; return { name: ch.name, text: ch.homeLines[Math.floor(Math.random() * ch.homeLines.length)] }; } catch (e) { return { name: 'POCA HOUSE', text: '오늘도 같이 힘내자!' }; }
  }

  var cur = '';
  function heroHtml() {
    var c = mainCard();
    if (!c) return '<div id="hm-empty"><div style="font-size:64px;">🎴</div><div style="font-size:16px;">아직 대표 아이돌이 없어요</div><div style="font-size:12px;opacity:.85;">카드를 뽑으면 여기에 나와요!</div></div>';
    var ln = lineOf(c.charId);
    return '<div id="hm-card"><img src="' + esc(thumb(c.img)) + '" alt="" decoding="async" onerror="this.style.opacity=.2"></div>' +
      '<div id="hm-say"><b>' + esc(ln.name) + '</b>' + esc(ln.text) + '</div>' +
      '<button id="hm-pick">⭐ 대표 바꾸기</button>';
  }

  function build() {
    var home = document.getElementById('screen-home'); if (!home) return false;
    var hero = document.getElementById('hm-hero');
    if (!hero) {
      hero = document.createElement('div'); hero.id = 'hm-hero';
      var tb = home.querySelector('.topbar'); home.insertBefore(hero, tb ? tb.nextSibling : home.firstChild);
      hero.addEventListener('click', function (e) {
        if (e.target.id === 'hm-pick') { openPicker(); return; }
        if (e.target.closest('#hm-card')) refresh(true);
      });
      var bt = document.createElement('div'); bt.id = 'hm-btns';
      bt.innerHTML = '<button class="a" id="hm-go-map">🚐 스케줄 가기</button><button class="b" id="hm-go-gacha">✨ 카드 뽑기</button>';
      var act = home.querySelector('.home-actions'); home.insertBefore(bt, act || null);
      document.getElementById('hm-go-map').onclick = function () { goTo('map'); };
      document.getElementById('hm-go-gacha').onclick = function () { goTo('gacha'); };
    }
    // 목표 카드는 버튼 바로 위로
    var goal = document.getElementById('hg-home-card'), btns = document.getElementById('hm-btns');
    if (goal && btns && goal.nextSibling !== btns) home.insertBefore(goal, btns);
    var gd = document.getElementById('qg-home-card'); if (gd && btns && gd.nextSibling !== btns && gd.parentNode === home) home.insertBefore(gd, btns);   // 길잡이 카드도 버튼 위로
    return true;
  }
  function stamTxt() {
    var cur = null, max = 3000;
    try { if (typeof stamina === 'number') cur = Math.floor(stamina); } catch (e) {}
    try { if (typeof STAMINA_MAX === 'number') max = STAMINA_MAX; } catch (e) {}
    if (cur == null) { var v = parseFloat(localStorage.getItem('ph_stamina')); cur = isNaN(v) ? 0 : Math.floor(v); }
    return '⚡ ' + cur + '/' + max;
  }
  function attach() {   // 칭호 배지(카드 아래 이름표)와 스태미나 칩을 카드 영역 안으로
    var hero = document.getElementById('hm-hero'); if (!hero) return;
    var chip = document.getElementById('hm-stam');
    if (!chip) { chip = document.createElement('div'); chip.id = 'hm-stam'; }
    if (chip.parentNode !== hero) hero.appendChild(chip);
    var t = stamTxt(); if (chip.textContent !== t) chip.textContent = t;
    var badge = document.getElementById('home-title-badge');
    if (badge && badge.parentNode !== hero) hero.appendChild(badge);
  }
  function refresh(force) {
    if (!build()) return;
    var c = mainCard(), sig = c ? c.id : '-';
    if (!force && sig === cur && document.getElementById('hm-card')) { attach(); return; }
    cur = sig; document.getElementById('hm-hero').innerHTML = heroHtml(); attach();
    clearTimeout(window.__hmSayT); window.__hmSayT = setTimeout(function () { var e = document.getElementById('hm-say'); if (e) e.classList.add('off'); }, 4500);   // 말풍선은 잠깐 보였다가 사라져서 카드를 가리지 않음
  }

  // ── 대표 고르기 ──
  function openPicker() {
    var all = myCards(), sel = (mainCard() || {}).id;
    var ov = document.createElement('div'); ov.id = 'hm-picker';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(10,6,24,.88);display:flex;flex-direction:column;font-family:"Noto Sans KR",sans-serif;';
    ov.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;color:#fff;font-weight:900;"><span>⭐ 대표 아이돌 고르기</span><button id="hm-pk-x" style="border:none;background:rgba(255,255,255,.18);color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;">✕</button></div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 12px 24px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:start;">' +
      all.map(function (c) {
        return '<div data-id="' + esc(c.id) + '" style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:2/3;background:#1a1a2e;border:3px solid ' + (c.id === sel ? ACC : 'transparent') + ';">' +
          '<img src="' + esc(thumb(c.img)) + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;">' +
          '<span style="position:absolute;left:4px;top:4px;font-size:10px;font-weight:900;color:#fff;background:' + c.color + ';border-radius:6px;padding:1px 5px;">' + esc(c.grade) + '</span></div>';
      }).join('') + (all.length ? '' : '<div style="grid-column:1/-1;color:#fff;text-align:center;padding:40px 0;">고를 카드가 없어요. 카드를 뽑아봐요!</div>') + '</div>';
    document.body.appendChild(ov);
    document.getElementById('hm-pk-x').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-id]').forEach(function (d) {
      d.onclick = function () { try { localStorage.setItem(KEY, d.getAttribute('data-id')); } catch (e) {} ov.remove(); refresh(true); };
    });
  }

  // ── 퀘스트 탭 빨간 점 ──
  function dot() {
    var b = document.getElementById('nav-quest'); if (!b) return;
    var n = 0;
    try { n += window.__career ? window.__career.claimable() : 0; } catch (e) {}
    try { n += window.__dailyQuest && window.__dailyQuest.claimable ? window.__dailyQuest.claimable() : 0; } catch (e) {}
    var d = b.querySelector('.nav-dot');
    if (n > 0) { if (!d) { d = document.createElement('span'); d.className = 'nav-dot'; b.style.position = 'relative'; b.appendChild(d); } d.textContent = n > 9 ? '9+' : n; }
    else if (d) d.remove();
  }

  // 더보기에 알바 (홈에서 뺀 자리)
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu; if (orig.__hmWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-alba-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🍔', '알바', '#fb923c', "goTo('alba')"));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-alba-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__hmWrapped = true; window.openMoreMenu = w;
  });

  setInterval(function () { try { refresh(false); dot(); } catch (e) {} }, 1200);
  setTimeout(function () { refresh(true); dot(); }, 900);
  window.__homeMain = { mainCard: mainCard, myCards: myCards, refresh: refresh, openPicker: openPicker };
})();
