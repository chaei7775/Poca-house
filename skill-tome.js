// ════════════════════════════════
// 📖 스킬 습득서 (skill-tome.js)
//
// 팬 광역 스킬을 상점에서 사지 않고 '습득서' 아이템으로 배울 수 있게 한다.
//  - VIP 게이트 선물상자에서 아주 낮은 확률로 나옴 (vip-rush.js 가 window.__giveSkillTome 을 부름)
//  - 가방에서 습득서를 누르면 '📖 멤버에게 가르치기' → 멤버를 고르면 그 멤버가 그 스킬을 배움 (이미 배운 멤버는 못 고름)
//  - 거래소에 등록 가능 (trade.js 의 품목 키는 'bk_tome_<스킬id>' → 기존 'bk_.*' 규칙 그대로 적용, 가격 한도 500만)
// ════════════════════════════════
(function () {
  'use strict';
  var STORE_KEY = 'ph_fanskills';
  var TYPE = 'skilltome';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  function API() { return window.__fanSkillsAPI || null; }
  function aoeSkills() { var a = API(); return a ? a.SKILLS.filter(function (s) { return s.aoe; }) : []; }
  function tomeName(sk) { return sk.short + ' 습득서'; }
  function tomeSkill(name) { return aoeSkills().filter(function (k) { return tomeName(k) === name; })[0] || null; }
  function desc(sk) { return sk.icon + ' ' + sk.name + ' 배우기 · 가방에서 열어 멤버를 골라 가르쳐요 (멤버 1명 · 거래소 등록 가능)'; }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function charIds() {
    try { if (typeof CHARS === 'undefined') return []; return Array.isArray(CHARS) ? CHARS.map(function (c) { return c.id; }) : Object.keys(CHARS); } catch (e) { return []; }
  }
  function charName(cid) { try { return (CHARS[cid] && CHARS[cid].name) || cid; } catch (e) { return cid; } }

  function give(id) {
    var a = API(); if (!a || typeof addToBag !== 'function') return false;
    var sk = a.SKILLS.filter(function (k) { return k.id === id; })[0]; if (!sk) return false;
    var ok = false;
    try { ok = !!addToBag('📖', tomeName(sk), TYPE, 1, desc(sk)); } catch (e) {}
    if (ok) { try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} toast('📖 ' + tomeName(sk) + '을(를) 얻었어요!'); }
    return ok;
  }
  function learn(cid, sk) {
    var a = API();
    if (a && a.hasSkill(cid, sk.id)) return { ok: false, why: '이미 배운 스킬이에요' };
    if (typeof useFromBag !== 'function' || !useFromBag(tomeName(sk), 1)) return { ok: false, why: '습득서가 없어요' };
    var s = {}; try { s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) {}
    if (!s[cid] || typeof s[cid] !== 'object') s[cid] = { serves: 0 };
    if (!s[cid].owned || typeof s[cid].owned !== 'object') s[cid].owned = {};
    s[cid].owned[sk.id] = true;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return { ok: true };
  }
  function qty(sk) { try { var it = bagItems.find(function (i) { return i.name === tomeName(sk); }); return it ? it.qty : 0; } catch (e) { return 0; } }
  function picker(sk) {
    var old = document.getElementById('st-pick'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'st-pick';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function draw(msg) {
      var a = API(), q = qty(sk);
      var rows = charIds().map(function (cid) {
        var has = a && a.hasSkill(cid, sk.id);
        return '<button data-c="' + cid + '" ' + (has ? 'disabled' : '') + ' style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:7px;border:1.5px solid rgba(255,255,255,' + (has ? '.08' : '.25') + ');border-radius:12px;background:rgba(255,255,255,' + (has ? '.03' : '.09') + ');color:' + (has ? '#777' : '#fff') + ';font-size:14px;font-weight:700;cursor:' + (has ? 'default' : 'pointer') + ';' + FONT + '"><span>' + charName(cid) + '</span><span style="font-size:11px;color:' + (has ? '#7ee8a5' : '#ffd76a') + ';">' + (has ? '✅ 이미 배움' : '가르치기') + '</span></button>';
      }).join('');
      ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:86vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #ffd76a;border-radius:20px;padding:20px 16px;text-align:center;">' +
        '<div style="font-size:40px;">📖</div><div style="font-size:16px;font-weight:900;color:#fff;">' + tomeName(sk) + ' <span style="font-size:12px;color:#aaa;">×' + q + '</span></div>' +
        '<div style="font-size:12px;color:#c9d6ff;margin:4px 0 12px;">누가 ' + sk.icon + ' ' + sk.name + '을(를) 배울까요?</div>' +
        (msg ? '<div style="background:rgba(255,215,0,.16);border:1.5px solid #FFD700;border-radius:10px;padding:8px;margin-bottom:10px;font-size:12px;font-weight:900;color:#fff;">' + msg + '</div>' : '') + rows +
        '<button id="st-x" style="width:100%;margin-top:4px;padding:10px;border:none;border-radius:10px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;cursor:pointer;' + FONT + '">닫기</button></div>';
      ov.querySelector('#st-x').onclick = function () { ov.remove(); };
      Array.prototype.forEach.call(ov.querySelectorAll('[data-c]:not([disabled])'), function (b) {
        b.onclick = function () {
          var cid = b.getAttribute('data-c');
          if (!window.confirm(charName(cid) + '에게 ' + sk.name + '을(를) 가르칠까요? (습득서 1장 사용)')) return;
          var r = learn(cid, sk);
          if (!r.ok) { draw('⚠️ ' + r.why); return; }
          try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
          if (qty(sk) <= 0) { ov.remove(); toast('🎉 ' + charName(cid) + '이(가) ' + sk.name + '을(를) 배웠어요!'); var d = document.getElementById('bag-detail-overlay'); if (d) d.remove(); }
          else {
            draw('🎉 ' + charName(cid) + '이(가) ' + sk.name + '을(를) 배웠어요!');
            try { var bd = document.getElementById('bag-detail-overlay'); if (bd) Array.prototype.forEach.call(bd.querySelectorAll('div'), function (dv) { if (!dv.children.length && /^보유:/.test(dv.textContent)) dv.textContent = '보유: ' + qty(sk) + '개'; }); } catch (e) {}
          }
        };
      });
    }
    document.body.appendChild(ov); draw('');
  }

  // 가방 상세에 버튼
  (function hook() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hook, 150); return; }
    if (window.__stHooked) return; window.__stHooked = true;
    var orig = window.showBagItemDetail;
    window.showBagItemDetail = function (idx) {
      var r = orig.apply(this, arguments);
      try {
        var item = bagItems[idx], ov = document.getElementById('bag-detail-overlay'), sk = item && item.type === TYPE ? tomeSkill(item.name) : null;
        if (sk && ov && !ov.querySelector('#st-use')) {
          var b = document.createElement('button'); b.id = 'st-use'; b.textContent = '📖 멤버에게 가르치기';
          b.style.cssText = 'width:100%;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,#F5B942,#FB7185);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;';
          b.onclick = function () { picker(sk); };
          var close = ov.querySelector('button');
          if (close) close.parentNode.insertBefore(b, close); else ov.firstChild.appendChild(b);
        }
      } catch (e) {}
      return r;
    };
  })();

  // 거래소 품목 등록 (trade.js 가 먼저 불러와졌을 때를 위해 약간 기다림)
  window.__skillTomeItems = function () {
    var out = {};
    aoeSkills().forEach(function (sk) { out['bk_tome_' + sk.id] = { name: tomeName(sk), emoji: '📖', kind: 'bag', type: TYPE, desc: sk.icon + ' ' + sk.name + ' 배우기 (멤버 1명)', min: 2000, max: sk.id === 'finale' ? 10000000 : 5000000 }; });   // 불꽃쇼 습득서만 상한 1000만 (※ 서버 규칙의 가격 한도도 같이 올려야 함)
    return out;
  };
  window.__giveSkillTome = function (id) { return give(id); };
  window.__skillTomeTest = { give: give, learn: learn, tomeName: tomeName };
})();
