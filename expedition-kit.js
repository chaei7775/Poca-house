// ════════════════════════════════════════════════════════════
// 🧰 팬덤 원정 새 맵 공통 틀 (expedition-kit.js)
// 새 원정 맵(리듬 리허설장 · 파파라치 탈출 · 월드투어 스타디움)이 같이 쓰는 입장·보상·결과 화면.
//  · 팬덤 원정 목록에 칸을 끼우고, 입장 조건(플레이어 레벨·스태미나·히든카드)을 확인한다.
//  · 하루 보상 횟수 제한: 하루 daily 번까지는 보상 100%, 그다음부턴 EXTRA_RATE(30%).
//  · 맵 파일은 window.ExpKit.register({...}) 로 자기 정보와 play(ctx) 만 넘기면 된다.
// ✏️ 값 바꾸는 곳: 각 맵 파일 맨 위 설정 (레벨 / 스태미나 / 하루 횟수 / 보상)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var LOCKED = false;                 // true = 새 맵 3개를 전부 잠가 둠 (🔒 준비 중). false = 각 맵의 레벨(25/30/35)에 맞춰 열림
  var EXTRA_RATE = 0.3;               // 하루 횟수를 넘긴 뒤 보상 비율
  var REG = {}, ORDER = [];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function $(id) { return document.getElementById(id); }
  function toast(m) { try { showBagToast(m); } catch (e) {} }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function stam() { try { return Number(stamina) || 0; } catch (e) { return 0; } }
  function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function today() { try { return new Date().toLocaleDateString('sv'); } catch (e) { return String(Math.floor(Date.now() / 86400000)); } }
  function daily(cfg) {
    var k = 'ph_xk_' + cfg.id, o = {};
    try { o = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) {}
    if (o.d !== today()) o = { d: today(), n: 0 };
    return { k: k, o: o, left: Math.max(0, cfg.daily - o.n) };
  }
  function faceUrl(cid) { return IMG_BASE + 'face-' + cid + '.png'; }

  function itemIcon(it, px) {
    try { if (window.matIcon && it.name) { var h = window.matIcon(it.name, px, it.emoji); if (h) return h; } } catch (e) {}
    return it.emoji || '🎁';
  }

  // ── 입장 ──
  function enter(cfg, charId, again) {
    if (plv() < cfg.needLevel) { toast(cfg.emoji + ' ' + cfg.name + '은(는) 플레이어 Lv.' + cfg.needLevel + '부터 열려요 (지금 Lv.' + plv() + ')'); return false; }
    var ov = $('special-overlay'); if (!ov) return false;
    if (stam() < cfg.stamina) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (입장 ' + cfg.stamina + ')'); return false; }
    var old = $('xk-root'); if (old) old.remove();
    var root = document.createElement('div'); root.id = 'xk-root';
    root.style.cssText = 'position:absolute;inset:0;z-index:95;background:#0b0716;color:#fff;overflow:hidden;' + FONT;
    ov.appendChild(root);
    var d = daily(cfg);
    var intro = document.createElement('div');
    intro.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;background:linear-gradient(rgba(8,4,18,.78),rgba(8,4,18,.9)),url(' + IMG_BASE + (cfg.bg || 'map-fanrush.png') + ') center/cover;';
    intro.innerHTML = '<div style="width:100%;max-width:340px;text-align:center;">' +
      '<div style="font-size:46px;">' + cfg.emoji + '</div>' +
      '<div style="font-size:20px;font-weight:900;margin:4px 0 2px;">' + cfg.name + '</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:12px;">' + cfg.tagline + '</div>' +
      '<div style="text-align:left;background:rgba(255,255,255,.08);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.75;color:#f1e9ff;">' + cfg.intro.map(function (l) { return '· ' + l; }).join('<br>') + '</div>' +
      '<div style="font-size:11.5px;color:#ffd76a;margin:10px 0;">오늘 보상 ' + (d.left > 0 ? '<b>' + d.left + '번</b> 남음 (넘으면 ' + Math.round(EXTRA_RATE * 100) + '%)' : '<b>다 썼어요</b> · 지금부턴 ' + Math.round(EXTRA_RATE * 100) + '%만 받아요') + ' · ⚡ ' + cfg.stamina + '</div>' +
      '<button id="xk-go" style="width:100%;padding:14px;border:none;border-radius:13px;background:linear-gradient(135deg,' + cfg.color + ',#8b5cf6);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">시작하기</button>' +
      '<button id="xk-gear" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:rgba(192,132,252,.25);border:1.5px solid #C084FC;color:#fff;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">🎀 소품 장착</button>' +
      '<button id="xk-back" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;cursor:pointer;' + FONT + '">나가기</button></div>';
    root.appendChild(intro);
    $('xk-back').onclick = function () { root.remove(); };
    $('xk-gear').onclick = function () { try { if (window.FanGear) window.FanGear.open(charId); } catch (e) {} };
    $('xk-go').onclick = function () {
      if (stam() < cfg.stamina) { toast('스태미나가 부족해요!'); return; }
      try { stamina -= cfg.stamina; if (typeof saveStamina === 'function') saveStamina(); if (typeof saveAll === 'function') saveAll(); } catch (e) {}
      intro.remove();
      var rate = daily(cfg).left > 0 ? 1 : EXTRA_RATE;
      var dd = daily(cfg); dd.o.n++; try { localStorage.setItem(dd.k, JSON.stringify(dd.o)); } catch (e) {}
      var done = false;
      cfg.play({
        root: root, charId: charId, W: root.clientWidth || 390, H: root.clientHeight || 700, level: plv(), face: faceUrl(charId), imgBase: IMG_BASE,
        exit: function () { root.remove(); },
        finish: function (res) { if (done) return; done = true; settle(cfg, root, charId, res, rate); }
      });
    };
    return true;
  }

  // ── 보상 지급 + 결과 화면 ──
  function settle(cfg, root, charId, res, rate) {
    try { var cl = JSON.parse(localStorage.getItem('ph_xk_clears') || '{}') || {}; cl[cfg.id] = (cl[cfg.id] || 0) + 1; localStorage.setItem('ph_xk_clears', JSON.stringify(cl)); } catch (e) {}   // 퀘스트용 클리어 기록
    var gmR = 1; try { if (window.FanGear) gmR = window.FanGear.mult(charId, 'reward'); } catch (e) {}   // 🎀 소품 보상 증가
    var coin = Math.round((res.coin || 0) * rate * gmR), exp = Math.round((res.exp || 0) * rate * gmR);
    var items = [];
    try {   // 🎀 소품 드랍 (클리어했을 때만, cfg.gearChance)
      if (res.win && cfg.gearChance && Math.random() < cfg.gearChance && window.FanGear) { var gi = window.FanGear.roll(cfg.gearMin); if (gi) { res.items = (res.items || []).concat([gi]); } }
    } catch (e) {}
    (res.items || []).forEach(function (it) {
      var q = Math.max(0, Math.round((it.qty || 0) * rate));
      if (q <= 0 && rate < 1 && (it.qty || 0) > 0 && Math.random() < rate) q = 1;   // 낮은 비율이어도 가끔은 1개
      if (q > 0) items.push({ emoji: it.emoji, name: it.name, cat: it.cat || 'material', qty: q, desc: it.desc || '' });
    });
    var stone = Math.round((res.stone || 0) * rate), protect = Math.round((res.protect || 0) * rate), wish = Math.round((res.wish || 0) * rate);
    var bagFull = false;
    try {
      if (coin > 0 && typeof coins !== 'undefined') coins += coin;
      if (exp > 0) {
        if (typeof addCardExp === 'function') { try { addCardExp(charId, exp); } catch (e) {} }
        else { try { var cx = JSON.parse(localStorage.getItem('ph_cardExp') || '{}'); cx[charId] = (cx[charId] || 0) + exp; localStorage.setItem('ph_cardExp', JSON.stringify(cx)); } catch (e) {} }
      }
      items.forEach(function (it) { if (typeof addToBag === 'function' && !addToBag(it.emoji, it.name, it.cat, it.qty, it.desc)) { bagFull = true; it.lost = true; } });
      if (stone > 0 || protect > 0) {
        var e = {}; try { e = JSON.parse(localStorage.getItem('ph_enhance') || '{}') || {}; } catch (x) {}
        e.stone = Math.floor(Number(e.stone) || 0) + stone; e.protect = Math.floor(Number(e.protect) || 0) + protect;
        localStorage.setItem('ph_enhance', JSON.stringify(e));
      }
      if (wish > 0) { wishFragments = Math.floor(Number(wishFragments) || 0) + wish; localStorage.setItem('ph_wish', wishFragments); }
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      if (typeof saveAll === 'function') saveAll();
    } catch (e) { console.error('[xk]', e); }

    // 🎁 보상은 상자로 나와요: 상자를 하나씩 눌러서 열어요 (이미 지급은 끝났고, 여기는 보여주기만 해요)
    var IB = IMG_BASE, entries = [];
    function ic(file, emo) { return '<img src="' + IB + file + '" style="width:30px;height:30px;object-fit:contain;" onerror="this.outerHTML=\'<span style=&quot;font-size:26px;&quot;>' + emo + '</span>\'">'; }
    if (coin > 0) entries.push({ ic: ic('vip-coin.png', '🍔'), t: '코인', n: '+' + fmt(coin) });
    if (exp > 0) entries.push({ ic: ic('vip-exp.png', '⭐'), t: '카드 경험치', n: '+' + fmt(exp) });
    items.forEach(function (it) { if (!it.lost) entries.push({ ic: itemIcon(it, 30), t: it.name, n: '×' + it.qty }); });
    if (stone > 0) entries.push({ ic: '<span style="font-size:26px;">🔨</span>', t: '강화석', n: '×' + stone });
    if (protect > 0) entries.push({ ic: '<span style="font-size:26px;">🛡️</span>', t: '방지권', n: '×' + protect });
    if (wish > 0) entries.push({ ic: '<span style="font-size:26px;">🧩</span>', t: '소원의 조각', n: '×' + wish });
    var boxes = entries.map(function (e, i) {
      return '<div class="xk-box" data-i="' + i + '" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:92px;">' +
        '<div class="xk-bx" style="height:56px;display:flex;align-items:center;justify-content:center;animation:xkBob 1.2s ease-in-out ' + (i % 3) * 0.15 + 's infinite;">' +
        boxImgHtml(54) + '</div>' +
        '<div class="xk-lb" style="font-size:11px;font-weight:900;line-height:1.25;text-align:center;margin-top:2px;color:#cbb8ff;">눌러서 열기</div></div>';
    }).join('');
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;z-index:5;background:rgba(6,3,14,.9);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;' + FONT;
    box.innerHTML = '<style>@keyframes xkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes xkPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}</style>' +
      '<div style="width:100%;max-width:330px;text-align:center;background:linear-gradient(160deg,#241547,#120a26);border:2px solid ' + cfg.color + ';border-radius:20px;padding:20px 16px;">' +
      '<div style="font-size:40px;">' + (res.win ? '🏆' : '😢') + '</div>' +
      '<div style="font-size:19px;font-weight:900;margin:4px 0;">' + (res.title || (res.win ? '성공!' : '아쉬워요')) + '</div>' +
      '<div style="font-size:12px;color:#d9ccff;margin-bottom:10px;line-height:1.6;">' + (res.summary || '') + '</div>' +
      (entries.length ? '<div style="font-size:12px;color:#ffd76a;font-weight:900;margin-bottom:6px;">🎁 상자 <span id="xk-left">' + entries.length + '</span>개 · 눌러서 하나씩 열어봐요!</div>' +
        '<div id="xk-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:rgba(255,255,255,.06);border-radius:14px;padding:10px 6px;margin-bottom:8px;">' + boxes + '</div>' +
        '<button id="xk-all" style="width:100%;padding:8px;margin-bottom:10px;border:none;border-radius:10px;background:rgba(255,255,255,.12);color:#ddd;font-size:12px;cursor:pointer;' + FONT + '">한꺼번에 열기</button>'
        : '<div style="color:#bbb;margin:12px 0;">받은 보상이 없어요</div>') +
      (rate < 1 ? '<div style="font-size:11px;color:#ffb4b4;margin-bottom:8px;">오늘 보상 횟수를 넘겨서 ' + Math.round(rate * 100) + '%만 받았어요</div>' : '') +
      (bagFull ? '<div style="font-size:11px;color:#ffb4b4;margin-bottom:8px;">가방이 가득 차서 일부 재료를 못 받았어요</div>' : '') +
      '<button id="xk-again" style="width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:12px;background:linear-gradient(135deg,' + cfg.color + ',#8b5cf6);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">한 번 더 (⚡ ' + cfg.stamina + ')</button>' +
      '<button id="xk-out" style="width:100%;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:14px;cursor:pointer;' + FONT + '">나가기</button></div>';
    root.appendChild(box);
    var left = entries.length;
    function openBox(el) {
      if (!el || el.getAttribute('data-open')) return;
      var e = entries[Number(el.getAttribute('data-i'))]; if (!e) return;
      el.setAttribute('data-open', '1');
      var bx = el.querySelector('.xk-bx'), lb = el.querySelector('.xk-lb');
      bx.style.animation = 'xkPop .45s ease-out';
      bx.innerHTML = '<img src="' + IB + 'fx-box-open.png" style="width:54px;height:54px;object-fit:contain;">';
      setTimeout(function () { bx.style.animation = 'xkPop .45s ease-out'; bx.innerHTML = e.ic.replace('width:30px;height:30px', 'width:46px;height:46px'); }, 350);
      lb.style.color = '#fff'; lb.innerHTML = e.t + '<br><span style="color:#ffd76a;">' + e.n + '</span>';
      left--; var lf = $('xk-left'); if (lf) lf.textContent = left;
      if (left <= 0) { var al = $('xk-all'); if (al) al.style.display = 'none'; }
      try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play('reward'); } catch (x) {}
    }
    Array.prototype.forEach.call(box.querySelectorAll('.xk-box'), function (el) { el.onclick = function () { openBox(el); }; });
    var allBtn = $('xk-all');
    if (allBtn) allBtn.onclick = function () { Array.prototype.forEach.call(box.querySelectorAll('.xk-box'), function (el, i) { setTimeout(function () { openBox(el); }, i * 120); }); };
    $('xk-out').onclick = function () { root.remove(); };
    $('xk-again').onclick = function () { root.remove(); enter(cfg, charId, true); };
  }

  // ── 팬덤 원정 칸에 끼워 넣기 ──
  function isOpen() { if (!LOCKED) return true; try { return localStorage.getItem('ph_xk_open') === '1'; } catch (e) { return false; } }   // 테스트용: localStorage ph_xk_open=1 이면 열림
  function install(cfg) {
    if (typeof window.startSpecialExplore !== 'function' || typeof SPECIAL_LOCATIONS === 'undefined' || typeof window.openSpecialCardSelect !== 'function') { setTimeout(function () { install(cfg); }, 80); return; }
    if (window['__xkInst_' + cfg.id]) return;
    window['__xkInst_' + cfg.id] = true;
    if (isOpen() && !SPECIAL_LOCATIONS.some(function (l) { return l.id === cfg.id; })) SPECIAL_LOCATIONS.push({ id: cfg.id, name: cfg.name, emoji: cfg.emoji, color: cfg.color, bg: IMG_BASE + (cfg.bg || 'map-fanrush.png') });
    if (!window.__xkSelWrapped) {
      window.__xkSelWrapped = true;
      var origSel = window.openSpecialCardSelect;
      window.openSpecialCardSelect = function (id) {
        var c = REG[id];
        if (c && plv() < c.needLevel) { toast('🔒 ' + c.name + '은(는) 플레이어 Lv.' + c.needLevel + '부터 열려요 (지금 Lv.' + plv() + ')'); return; }
        return origSel.apply(this, arguments);
      };
    }
    var orig = window.startSpecialExplore;
    window.startSpecialExplore = function (locationId, charId) {
      if (locationId === cfg.id) { enter(cfg, charId); return; }
      return orig.apply(this, arguments);
    };
    (function addBtn() {
      var sec = $('bc-fandom-section');
      var bid = 'xk-btn-' + cfg.id;
      if (sec && !$(bid)) {
        var b = document.createElement('button'); b.id = bid;
        if (isOpen()) b.setAttribute('onclick', "openSpecialCardSelect('" + cfg.id + "')");
        else b.onclick = function () { toast('🔒 ' + cfg.name + '은(는) 준비 중이에요! 곧 열려요'); };
        b.style.cssText = 'width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:9px;background:' + cfg.color + '1f;border:1.5px solid ' + cfg.color + ';border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;';
        b.innerHTML = '<span style="font-size:24px;">' + cfg.emoji + '</span><span>' + cfg.name + ' <span class="xk-tag" style="font-size:10px;color:#ffe;font-weight:700;">NEW · Lv.' + cfg.needLevel + '</span><br><span style="font-size:10px;font-weight:400;opacity:.85;">' + cfg.tagline + '</span></span>';
        var pad = sec.lastElementChild;
        sec.insertBefore(b, pad);
      }
      var bb = $(bid);
      if (bb) {
        var lock = !isOpen() || plv() < cfg.needLevel;
        bb.style.opacity = lock ? '.55' : '1';
        var tag = bb.querySelector('.xk-tag'); if (tag) tag.textContent = !isOpen() ? '🔒 준비 중' : lock ? '🔒 Lv.' + cfg.needLevel : 'NEW · Lv.' + cfg.needLevel;
      }
      setTimeout(addBtn, 600);
    })();
  }


  // ── 🎁 팬이 떨어뜨리는 상자 (맵 안에서 줍는 보너스) ──
  // 맵 파일에서: var loot = ExpKit.rollLoot(); → loot.txt 를 보여주고, 끝날 때 res = ExpKit.mergeLoot(res, [loot, ...])
  var LOOT = [
    { w: 40, f: function () { var c = 3000 + Math.floor(Math.random() * 5001); return { txt: '🍔 코인 +' + fmt(c), coin: c }; } },
    { w: 15, f: function () { return { txt: '🔶 공방의 원석 ×1', item: { emoji: '🔶', name: '공방의 원석', cat: 'material', qty: 1, desc: '굿즈 공방 제작 재료 · 탐험·원정에서 나와요' } }; } },
    { w: 12, f: function () { return { txt: '🔹 재조합석 ×1', item: { emoji: '🔹', name: '재조합석', cat: 'material', qty: 1, desc: '카드 재조합에 필요한 재료' } }; } },
    { w: 10, f: function () { return { txt: '🎞️ 필름 ×1', item: { emoji: '🎞️', name: '필름', cat: 'film', qty: 1, desc: '시크릿 포토랩 현상 재료' } }; } },
    { w: 8, f: function () { return { txt: '🧪 현상액 ×1', item: { emoji: '🧪', name: '현상액', cat: 'film', qty: 1, desc: '포토랩 옵션 강화 재료' } }; } },
    { w: 8, f: function () { return { txt: '🔨 강화석 ×1', stone: 1 }; } },
    { w: 5, f: function () { return { txt: '🧩 소원의 조각 ×1', wish: 1 }; } },
    { w: 2, f: function () { return { txt: '🛡️ 방지권 ×1', protect: 1 }; } }
  ];
  function rollLoot() {
    var t = 0; LOOT.forEach(function (l) { t += l.w; });
    var r = Math.random() * t;
    for (var i = 0; i < LOOT.length; i++) { if (r < LOOT[i].w) return LOOT[i].f(); r -= LOOT[i].w; }
    return LOOT[0].f();
  }
  function mergeLoot(res, loots) {
    res = res || {}; res.items = (res.items || []).slice();
    (loots || []).forEach(function (l) {
      if (l.coin) res.coin = (res.coin || 0) + l.coin;
      if (l.stone) res.stone = (res.stone || 0) + l.stone;
      if (l.wish) res.wish = (res.wish || 0) + l.wish;
      if (l.protect) res.protect = (res.protect || 0) + l.protect;
      if (l.item) {
        var ex = res.items.filter(function (i) { return i.name === l.item.name; })[0];
        if (ex) ex.qty += l.item.qty; else res.items.push({ emoji: l.item.emoji, name: l.item.name, cat: l.item.cat, qty: l.item.qty, desc: l.item.desc });
      }
    });
    return res;
  }
  // 상자 그림(HTML). 새 그림(fx-box.png)이 있으면 그걸, 없으면 VIP 상자, 그것도 없으면 이모지
  var BOX_SVG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="58" rx="22" ry="4" fill="#000" opacity=".12"/><rect x="9" y="26" width="46" height="30" rx="5" fill="#fff" stroke="#d9d4e8" stroke-width="2"/><rect x="6" y="18" width="52" height="12" rx="5" fill="#fff" stroke="#d9d4e8" stroke-width="2"/><rect x="28" y="18" width="8" height="38" fill="#ffd76a"/><path d="M32 18C26 6 14 8 18 15c3 5 10 3 14 3zM32 18C38 6 50 8 46 15c-3 5-10 3-14 3z" fill="#ffd76a" stroke="#e0b030" stroke-width="1.5"/></svg>');
  function boxImgHtml(px) {
    return '<img src="' + IMG_BASE + 'fx-box.png" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;" onerror="this.onerror=null;this.src=\'' + BOX_SVG + '\'">';
  }

  window.ExpKit = {
    register: function (cfg) { REG[cfg.id] = cfg; ORDER.push(cfg.id); install(cfg); },
    enter: function (id, charId) { return enter(REG[id], charId); },
    get: function (id) { return REG[id]; }, IMG_BASE: IMG_BASE, plv: plv, rollLoot: rollLoot, mergeLoot: mergeLoot, boxImgHtml: boxImgHtml
  };
})();
