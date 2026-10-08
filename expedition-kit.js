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
    intro.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;background:radial-gradient(circle at 50% 20%,' + cfg.color + '33,#0b0716 70%);';
    intro.innerHTML = '<div style="width:100%;max-width:340px;text-align:center;">' +
      '<div style="font-size:46px;">' + cfg.emoji + '</div>' +
      '<div style="font-size:20px;font-weight:900;margin:4px 0 2px;">' + cfg.name + '</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:12px;">' + cfg.tagline + '</div>' +
      '<div style="text-align:left;background:rgba(255,255,255,.08);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.75;color:#f1e9ff;">' + cfg.intro.map(function (l) { return '· ' + l; }).join('<br>') + '</div>' +
      '<div style="font-size:11.5px;color:#ffd76a;margin:10px 0;">오늘 보상 ' + (d.left > 0 ? '<b>' + d.left + '번</b> 남음 (넘으면 ' + Math.round(EXTRA_RATE * 100) + '%)' : '<b>다 썼어요</b> · 지금부턴 ' + Math.round(EXTRA_RATE * 100) + '%만 받아요') + ' · ⚡ ' + cfg.stamina + '</div>' +
      '<button id="xk-go" style="width:100%;padding:14px;border:none;border-radius:13px;background:linear-gradient(135deg,' + cfg.color + ',#8b5cf6);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">시작하기</button>' +
      '<button id="xk-back" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;cursor:pointer;' + FONT + '">나가기</button></div>';
    root.appendChild(intro);
    $('xk-back').onclick = function () { root.remove(); };
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
    var coin = Math.round((res.coin || 0) * rate), exp = Math.round((res.exp || 0) * rate);
    var items = [];
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

    var rows = [];
    if (coin > 0) rows.push('<div>🍔 코인 <b style="color:#ffd76a;">+' + fmt(coin) + '</b></div>');
    if (exp > 0) rows.push('<div>⭐ 카드 경험치 <b style="color:#ffd76a;">+' + fmt(exp) + '</b></div>');
    items.forEach(function (it) { if (!it.lost) rows.push('<div style="display:flex;align-items:center;gap:6px;justify-content:center;">' + itemIcon(it, 22) + ' ' + it.name + ' <b style="color:#ffd76a;">×' + it.qty + '</b></div>'); });
    if (stone > 0) rows.push('<div>🔨 강화석 <b style="color:#ffd76a;">×' + stone + '</b></div>');
    if (protect > 0) rows.push('<div>🛡️ 방지권 <b style="color:#ffd76a;">×' + protect + '</b></div>');
    if (wish > 0) rows.push('<div>🧩 소원의 조각 <b style="color:#ffd76a;">×' + wish + '</b></div>');
    if (!rows.length) rows.push('<div style="color:#bbb;">받은 보상이 없어요</div>');
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;z-index:5;background:rgba(6,3,14,.9);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;' + FONT;
    box.innerHTML = '<div style="width:100%;max-width:320px;text-align:center;background:linear-gradient(160deg,#241547,#120a26);border:2px solid ' + cfg.color + ';border-radius:20px;padding:22px 18px;">' +
      '<div style="font-size:40px;">' + (res.win ? '🏆' : '😢') + '</div>' +
      '<div style="font-size:19px;font-weight:900;margin:4px 0;">' + (res.title || (res.win ? '성공!' : '아쉬워요')) + '</div>' +
      '<div style="font-size:12px;color:#d9ccff;margin-bottom:10px;line-height:1.6;">' + (res.summary || '') + '</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:12px;padding:10px;font-size:13px;line-height:1.9;margin-bottom:10px;">' + rows.join('') + '</div>' +
      (rate < 1 ? '<div style="font-size:11px;color:#ffb4b4;margin-bottom:8px;">오늘 보상 횟수를 넘겨서 ' + Math.round(rate * 100) + '%만 받았어요</div>' : '') +
      (bagFull ? '<div style="font-size:11px;color:#ffb4b4;margin-bottom:8px;">가방이 가득 차서 일부 재료를 못 받았어요</div>' : '') +
      '<button id="xk-again" style="width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:12px;background:linear-gradient(135deg,' + cfg.color + ',#8b5cf6);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">한 번 더 (⚡ ' + cfg.stamina + ')</button>' +
      '<button id="xk-out" style="width:100%;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.1);color:#ccc;font-size:14px;cursor:pointer;' + FONT + '">나가기</button></div>';
    root.appendChild(box);
    $('xk-out').onclick = function () { root.remove(); };
    $('xk-again').onclick = function () { root.remove(); enter(cfg, charId, true); };
  }

  // ── 팬덤 원정 칸에 끼워 넣기 ──
  function install(cfg) {
    if (typeof window.startSpecialExplore !== 'function' || typeof SPECIAL_LOCATIONS === 'undefined' || typeof window.openSpecialCardSelect !== 'function') { setTimeout(function () { install(cfg); }, 80); return; }
    if (window['__xkInst_' + cfg.id]) return;
    window['__xkInst_' + cfg.id] = true;
    if (!SPECIAL_LOCATIONS.some(function (l) { return l.id === cfg.id; })) SPECIAL_LOCATIONS.push({ id: cfg.id, name: cfg.name, emoji: cfg.emoji, color: cfg.color, bg: IMG_BASE + (cfg.bg || 'map-fanrush.png') });
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
        b.setAttribute('onclick', "openSpecialCardSelect('" + cfg.id + "')");
        b.style.cssText = 'width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:9px;background:' + cfg.color + '1f;border:1.5px solid ' + cfg.color + ';border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;';
        b.innerHTML = '<span style="font-size:24px;">' + cfg.emoji + '</span><span>' + cfg.name + ' <span style="font-size:10px;color:#ffe;font-weight:700;">NEW · Lv.' + cfg.needLevel + '</span><br><span style="font-size:10px;font-weight:400;opacity:.85;">' + cfg.tagline + '</span></span>';
        var pad = sec.lastElementChild;
        sec.insertBefore(b, pad);
      }
      setTimeout(addBtn, 600);
    })();
  }

  window.ExpKit = {
    register: function (cfg) { REG[cfg.id] = cfg; ORDER.push(cfg.id); install(cfg); },
    enter: function (id, charId) { return enter(REG[id], charId); },
    get: function (id) { return REG[id]; }, IMG_BASE: IMG_BASE, plv: plv
  };
})();
