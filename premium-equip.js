// ════════════════════════════════
// 💎 프리미엄 카드 장착 (premium-equip.js)
//
// - 트레이닝룸 > '프리미엄 카드' 탭 아래에 "히든카드에 장착" 칸이 생긴다.
// - 히든카드 1장당 슬롯 2개. 프리미엄 카드는 6종이고 한 장은 히든카드 한 곳에만 끼울 수 있다.
//   (그래서 같은 효과는 절대 겹치지 않고, 켜지는 효과는 최대 6개)
// - 장착하거나 옮길 때마다 코인이 든다 (EQUIP_COIN). 빼는 건 공짜.
// - 장착한 히든카드를 갖고 있는 동안에만 효과가 켜진다.
//   강화하다 히든카드가 사라지면 장착이 풀려서 프리미엄 카드는 다시 빈 상태가 된다 (카드는 안 사라짐).
// - 효과 크기는 그 프리미엄 카드의 레벨(1~10)에 따라 EFFECTS의 min~max 사이로 커진다.
//
// 6종 효과 (바꾸고 싶으면 아래 PREMIUMS만 고치면 됨)
//   민준 재조합 히든 확률 / 시온 히든 강화 성공률 / 도윤 데뷔 정산금
//   하린 원정 스태미나 절약 / 윤아 원정 프리미엄 조각 +1 확률 / 아라 원정 코인
//
// 기존 파일은 하나도 안 고치고, 이미 열려 있는 함수/값에 끼워 넣는 방식으로 연결한다.
//   - 재조합: recombine-patch.js의 rcRollOutcome을 감싼다 (천장 적용 조합에서만)
//   - 강화 성공률: enhance.js의 확률표(RATE)를 직접 보정한다
//   - 정산금: enhance.js의 getEnhanceIncomeMult에 곱한다 (agency.js가 그대로 불러 씀)
//   - 원정 코인/스태미나/조각: photolab.js의 getEngraveBonus에 더한다
//
// 저장: localStorage 'ph_premiumEquip' (ph_ 로 시작)
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORE = 'ph_premiumEquip';
  var PREMIUM_STORE = 'ph_premiumCards';
  var ENH_STORE = 'ph_enhance';
  var MAX_LV = 10;                 // 프리미엄 카드 최대 레벨
  var SLOTS = 2;                   // 히든카드 1장당 슬롯
  var EQUIP_COIN = 50000;          // 장착/교체 1번당 코인
  var BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function n1(v) { return String(Math.round(v * 10) / 10); }

  // min = Lv.1 효과, max = Lv.10 효과
  var PREMIUMS = {
    minjun: { name: '민준', color: '#F59E0B', icon: '🔮', min: 0.5, max: 2,
      text: function (v) { return '재조합 히든 확률 +' + n1(v) + '%p'; } },
    sion:   { name: '시온', color: '#6366F1', icon: '⚒️', min: 2, max: 8,
      text: function (v) { return '히든 강화 성공률 +' + n1(v) + '%p'; } },
    doyun:  { name: '도윤', color: '#9D6B2A', icon: '🎤', min: 5, max: 30,
      text: function (v) { return '데뷔 정산금 +' + n1(v) + '%'; } },
    harin:  { name: '하린', color: '#7C3AED', icon: '⚡', min: 3, max: 15,
      text: function (v) { return '원정 스태미나 -' + n1(v) + '%'; } },
    yuna:   { name: '윤아', color: '#EC4899', icon: '🖼️', min: 5, max: 25,
      text: function (v) { return '원정 조각 +1 확률 +' + n1(v) + '%p'; } },
    ara:    { name: '아라', color: '#DC2626', icon: '🍔', min: 5, max: 30,
      text: function (v) { return '원정 코인 +' + n1(v) + '%'; } }
  };
  var ORDER = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];

  // ════════ 순수 로직 ════════
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function valueAt(pid, lv) {
    var p = PREMIUMS[pid];
    return p.min + (p.max - p.min) * (clamp(lv, 1, MAX_LV) - 1) / (MAX_LV - 1);
  }
  function isPid(x) { return typeof x === 'string' && PREMIUMS.hasOwnProperty(x); }

  // ════════ 저장 ════════
  function readJSON(key) {
    try { var d = JSON.parse(localStorage.getItem(key) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; }
  }
  function premiumLv(pid) { var d = readJSON(PREMIUM_STORE); return (d[pid] && Math.floor(d[pid].lv)) || 0; }
  function loadEq() {
    var d = readJSON(STORE), out = {};
    Object.keys(d).forEach(function (h) {
      var a = d[h]; if (!Array.isArray(a)) return;
      var s = [];
      for (var i = 0; i < SLOTS; i++) s.push(isPid(a[i]) ? a[i] : null);
      if (s.some(Boolean)) out[h] = s;
    });
    return out;
  }
  function saveEq(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} }

  // ════════ 게임 데이터 읽기 ════════
  function dataReady() { return typeof HIDDEN_CARDS !== 'undefined' && typeof ownedHiddenCards !== 'undefined'; }
  function hiddenList() { return (typeof HIDDEN_CARDS !== 'undefined' && Array.isArray(HIDDEN_CARDS)) ? HIDDEN_CARDS : []; }
  function hiddenById(id) { return hiddenList().filter(function (h) { return h.id === id; })[0] || null; }
  function isOwned(id) { return (typeof ownedHiddenCards !== 'undefined') && ownedHiddenCards.indexOf(id) !== -1; }
  function coinsNow() { return (typeof coins !== 'undefined') ? coins : 0; }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function imgUrl(pid) { return BASE + 'premium-' + pid + '.jpg' + BUST; }
  function afterChange() {
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
  }

  // 지금 켜져 있는 프리미엄 카드 { pid: true } — 장착한 히든카드를 갖고 있고, 프리미엄 카드도 갖고 있을 때만
  function activeSet() {
    var eq = loadEq(), set = {};
    if (!dataReady()) return set;
    Object.keys(eq).forEach(function (h) {
      if (!isOwned(h)) return;
      eq[h].forEach(function (pid) { if (pid && !set[pid] && premiumLv(pid) > 0) set[pid] = true; });
    });
    return set;
  }
  function bonusOf(pid) {
    var lv = premiumLv(pid);
    if (lv < 1 || !PREMIUMS[pid]) return 0;
    return activeSet()[pid] ? valueAt(pid, lv) : 0;
  }
  window.getPremiumEquipBonus = bonusOf;

  // 사라진 히든카드의 장착 / 중복 / 없는 프리미엄 카드 정리
  function sanitize() {
    if (!dataReady() || !ownedHiddenCards.length) return;
    var eq = loadEq(), raw = readJSON(STORE), seen = {}, out = {};
    Object.keys(eq).forEach(function (h) {
      if (!isOwned(h)) return;
      var s = eq[h].map(function (pid) {
        if (!pid || seen[pid] || premiumLv(pid) < 1) return null;
        seen[pid] = true; return pid;
      });
      if (s.some(Boolean)) out[h] = s;
    });
    if (JSON.stringify(out) !== JSON.stringify(raw)) saveEq(out);
  }

  // 프리미엄 카드가 지금 어느 (갖고 있는) 히든카드에 끼워져 있는지
  function whereIs(pid, eq) {
    var hit = null;
    Object.keys(eq).forEach(function (h) {
      if (hit || !isOwned(h)) return;
      if (eq[h].indexOf(pid) !== -1) hit = h;
    });
    return hit;
  }

  // ════════ 장착 / 해제 ════════
  function equip(hid, slot, pid) {
    if (!isOwned(hid) || !isPid(pid) || premiumLv(pid) < 1 || slot < 0 || slot >= SLOTS) return false;
    var eq = loadEq();
    if (eq[hid] && eq[hid][slot] === pid) return false;       // 이미 그 자리
    if (coinsNow() < EQUIP_COIN) { toast('코인이 부족해요! 🍔 ' + fmt(EQUIP_COIN) + ' 필요'); return false; }
    coins -= EQUIP_COIN;
    Object.keys(eq).forEach(function (h) {                    // 다른 곳에 끼워져 있었다면 거기서 빼기
      eq[h] = eq[h].map(function (x) { return x === pid ? null : x; });
    });
    if (!eq[hid]) eq[hid] = [null, null];
    eq[hid][slot] = pid;
    saveEq(eq); afterChange(); applyEnhanceRate();
    return true;
  }
  function unequip(hid, slot) {
    var eq = loadEq();
    if (!eq[hid] || !eq[hid][slot]) return false;
    eq[hid][slot] = null;
    saveEq(eq); afterChange(); applyEnhanceRate();
    return true;
  }
  function refresh() { if (typeof window.__pcAfterClose === 'function') { try { window.__pcAfterClose(); } catch (e) {} } }

  // ════════ 화면 ════════
  function slotHtml(h, i, pid) {
    var base = 'flex:1;min-width:0;display:flex;align-items:center;gap:6px;padding:6px;border-radius:10px;cursor:pointer;' + FONT + 'color:#fff;text-align:left;';
    if (pid && isPid(pid) && premiumLv(pid) > 0) {
      var p = PREMIUMS[pid], lv = premiumLv(pid);
      return '<button data-pe-slot="' + h.id + '|' + i + '" style="' + base + 'background:rgba(255,255,255,.08);border:1.5px solid ' + p.color + ';">' +
        '<span style="position:relative;flex:none;width:34px;height:48px;border-radius:6px;background:#222 url(\'' + imgUrl(pid) + '\') center/cover;">' +
        '<span style="position:absolute;left:1px;top:1px;background:rgba(0,0,0,.75);color:#FFD700;font-size:9px;font-weight:900;border-radius:5px;padding:0 3px;">Lv.' + lv + '</span></span>' +
        '<span style="font-size:10px;line-height:1.35;color:#ddd;">' + p.icon + ' ' + esc(p.text(valueAt(pid, lv))) + '</span></button>';
    }
    return '<button data-pe-slot="' + h.id + '|' + i + '" style="' + base + 'background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.25);justify-content:center;min-height:60px;color:#888;font-size:12px;">＋ 장착</button>';
  }

  function sectionHtml() {
    if (!dataReady()) return '';
    var hs = hiddenList().filter(function (h) { return isOwned(h.id); });
    var eq = loadEq(), act = activeSet();
    var enh = readJSON(ENH_STORE), lvMap = (enh.level && typeof enh.level === 'object') ? enh.level : {};

    var on = ORDER.filter(function (pid) { return act[pid]; }).map(function (pid) {
      var p = PREMIUMS[pid];
      return '<div style="font-size:12px;color:#fff;padding:2px 0;">' + p.icon + ' ' + esc(p.text(valueAt(pid, premiumLv(pid)))) + '</div>';
    }).join('');
    var summary = '<div style="background:rgba(255,215,0,.08);border:1.5px solid rgba(255,215,0,.35);border-radius:14px;padding:10px 12px;margin-bottom:10px;">' +
      '<div style="font-size:12px;font-weight:900;color:#FFD700;margin-bottom:5px;">지금 켜진 장착 효과</div>' +
      (on || '<div style="font-size:12px;color:#888;">아직 장착한 프리미엄 카드가 없어요</div>') + '</div>';

    var rows = hs.map(function (h) {
      var glow = h.grade === '에픽히든' ? '#FFD700' : '#C084FC';
      var slots = '';
      for (var i = 0; i < SLOTS; i++) slots += slotHtml(h, i, eq[h.id] ? eq[h.id][i] : null);
      return '<div style="display:flex;gap:8px;align-items:stretch;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px;margin-bottom:8px;">' +
        '<div style="width:52px;flex:none;text-align:center;">' +
        '<div style="width:52px;aspect-ratio:3/4;border-radius:8px;overflow:hidden;border:2px solid ' + glow + ';background:#111;"><img src="' + h.img + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
        '<div style="font-size:9px;color:#fff;margin-top:2px;font-weight:700;">+' + (lvMap[h.id] || 0) + '</div></div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:900;color:#fff;margin-bottom:5px;">' + esc(h.name) + '</div>' +
        '<div style="display:flex;gap:6px;">' + slots + '</div></div></div>';
    }).join('');

    return '<div style="margin-top:18px;">' +
      '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:6px;">🔧 히든카드에 장착</div>' +
      '<div style="font-size:11px;color:#aaa;line-height:1.6;margin-bottom:10px;">히든카드 1장에 프리미엄 카드 ' + SLOTS + '장까지! 프리미엄 카드는 한 장당 한 곳에만 끼울 수 있어요. ' +
      '장착하거나 옮길 때마다 🍔 ' + fmt(EQUIP_COIN) + ' 코인이 들고, 빼는 건 공짜예요. 장착한 히든카드가 사라지면 장착이 풀려요.</div>' +
      summary +
      (rows || '<div style="text-align:center;color:#888;font-size:12px;padding:16px 0;">장착할 히든카드가 아직 없어요</div>') + '</div>';
  }

  function openPicker(hid, slot) {
    var h = hiddenById(hid);
    if (!h || !isOwned(hid)) return;
    var old = document.getElementById('pe-picker'); if (old) old.remove();
    var eq = loadEq(), cur = (eq[hid] || [])[slot] || null;
    var ov = document.createElement('div');
    ov.id = 'pe-picker';
    ov.style.cssText = 'position:fixed;inset:0;z-index:975;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(ov);

    var list = ORDER.filter(function (pid) { return premiumLv(pid) > 0; });
    var rows = list.map(function (pid) {
      var p = PREMIUMS[pid], lv = premiumLv(pid), w = whereIs(pid, eq), wh = w ? hiddenById(w) : null;
      var status, btn;
      if (cur === pid) {
        status = '<span style="color:#4ade80;">✅ 이 슬롯에 장착 중</span>';
        btn = '';
      } else {
        status = wh ? '<span style="color:#fbbf24;">📍 ' + esc(wh.name) + '에 장착 중 (옮기면 거기서 빠져요)</span>' : '<span style="color:#888;">미장착</span>';
        btn = '<button data-pe-pick="' + pid + '" style="border:none;border-radius:10px;padding:9px 10px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + 'color:#fff;background:linear-gradient(135deg,#FF6B9D,#C084FC);flex:none;">' + (wh ? '옮기기' : '장착') + '<br><span style="font-size:10px;font-weight:700;">🍔 ' + fmt(EQUIP_COIN) + '</span></button>';
      }
      return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border:1.5px solid ' + p.color + ';border-radius:12px;padding:8px;margin-bottom:8px;">' +
        '<span style="position:relative;flex:none;width:44px;height:62px;border-radius:7px;background:#222 url(\'' + imgUrl(pid) + '\') center/cover;"><span style="position:absolute;left:2px;top:2px;background:rgba(0,0,0,.75);color:#FFD700;font-size:10px;font-weight:900;border-radius:6px;padding:0 4px;">Lv.' + lv + '</span></span>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">' + esc(p.name) + '</div>' +
        '<div style="font-size:11px;color:#ddd;margin:2px 0;">' + p.icon + ' ' + esc(p.text(valueAt(pid, lv))) + '</div>' +
        '<div style="font-size:10px;">' + status + '</div></div>' + btn + '</div>';
    }).join('');

    ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:92vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:18px 16px;">' +
      '<div style="text-align:center;margin-bottom:12px;"><div style="font-size:16px;font-weight:900;color:#fff;">💎 ' + esc(h.name) + '</div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:2px;">슬롯 ' + (slot + 1) + '에 끼울 프리미엄 카드를 골라요</div></div>' +
      (cur ? '<button id="pe-off" style="width:100%;border:none;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px;font-weight:900;cursor:pointer;' + FONT + 'color:#fff;background:rgba(239,68,68,.25);">장착 해제 (무료)</button>' : '') +
      (rows || '<div style="text-align:center;color:#888;font-size:12px;padding:16px 0;">아직 프리미엄 카드가 없어요<br>방송국 앞에서 조각을 모아 받아요</div>') +
      '<button id="pe-close" style="width:100%;border:none;border-radius:10px;padding:11px;margin-top:4px;font-size:13px;font-weight:900;cursor:pointer;' + FONT + 'color:#aaa;background:rgba(255,255,255,.08);">닫기</button></div>';

    function close() { ov.remove(); }
    ov.onclick = function (e) { if (e.target === ov) close(); };
    ov.querySelector('#pe-close').onclick = close;
    var off = ov.querySelector('#pe-off');
    if (off) off.onclick = function () { if (unequip(hid, slot)) toast('장착을 풀었어요'); close(); refresh(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-pe-pick]'), function (b) {
      b.onclick = function () {
        var pid = b.getAttribute('data-pe-pick');
        if (equip(hid, slot, pid)) { toast('💎 ' + PREMIUMS[pid].name + ' 프리미엄 카드를 장착했어요!'); close(); refresh(); }
      };
    });
  }

  function bindEquip(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-pe-slot]'), function (el) {
      el.onclick = function () {
        var parts = el.getAttribute('data-pe-slot').split('|');
        openPicker(parts[0], parseInt(parts[1], 10));
      };
    });
  }

  // ════════ 기존 시스템에 연결 ════════
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  // 1) 트레이닝룸 프리미엄 탭에 장착 칸 붙이기
  whenReady(function () { return typeof window.premiumTrainingHtml === 'function' && typeof window.premiumTrainingBind === 'function'; }, function () {
    if (window.premiumTrainingHtml.__peWrapped) return;
    var origHtml = window.premiumTrainingHtml, origBind = window.premiumTrainingBind;
    window.premiumTrainingHtml = function () { return origHtml.apply(this, arguments) + sectionHtml(); };
    window.premiumTrainingBind = function (root) { origBind.apply(this, arguments); bindEquip(root); };
    window.premiumTrainingHtml.__peWrapped = true;
  });

  // 2) 재조합 히든 확률 (천장 적용 조합에서만)
  whenReady(function () { return typeof window.rcRollOutcome === 'function'; }, function () {
    if (window.rcRollOutcome.__peWrapped) return;
    var orig = window.rcRollOutcome;
    var w = function (table, pityCount, rand, pityOn) {
      var b = bonusOf('minjun');
      if (pityOn && b > 0 && table) {
        var t = {};
        Object.keys(table).forEach(function (k) { t[k] = table[k]; });
        t.rareHidden = table.rareHidden + b;
        return orig.call(this, t, pityCount, rand, pityOn);
      }
      return orig.apply(this, arguments);
    };
    w.__peWrapped = true;
    window.rcRollOutcome = w;
  });
  whenReady(function () { return typeof window.rcUpdatePityInfo === 'function'; }, function () {
    if (window.rcUpdatePityInfo.__peWrapped) return;
    var orig = window.rcUpdatePityInfo;
    var w = function () {
      var r = orig.apply(this, arguments);
      try {
        var b = bonusOf('minjun'), el = document.getElementById('rc-pity-info');
        var recipe = (typeof getRcCurrentRecipe === 'function') ? getRcCurrentRecipe() : null;
        if (el && b > 0 && recipe && typeof rcPityApplies === 'function' && rcPityApplies(recipe.key)) {
          el.innerHTML += '<br><span style="color:#7dd3fc;">💎 프리미엄 장착 효과 히든 +' + n1(b) + '%p</span>';
        }
      } catch (e) {}
      return r;
    };
    w.__peWrapped = true;
    window.rcUpdatePityInfo = w;
  });

  // 3) 히든 강화 성공률: enhance.js 확률표를 직접 보정 (100%인 단계는 그대로)
  var baseRate = null;
  function applyEnhanceRate() {
    var T = window.__enhanceTest;
    if (!T || !T.CONST || !Array.isArray(T.CONST.RATE)) return false;
    var R = T.CONST.RATE;
    if (!baseRate) baseRate = R.slice();
    var b = bonusOf('sion');
    for (var i = 0; i < R.length; i++) {
      R[i] = baseRate[i] >= 100 ? 100 : Math.min(100, Math.round((baseRate[i] + b) * 10) / 10);
    }
    return true;
  }
  whenReady(function () { return applyEnhanceRate(); }, function () {});

  // 4) 데뷔 정산금: 기획사 수익 배율에 곱하기
  whenReady(function () { return typeof window.getEnhanceIncomeMult === 'function'; }, function () {
    if (window.getEnhanceIncomeMult.__peWrapped) return;
    var desc = Object.getOwnPropertyDescriptor(window, 'getEnhanceIncomeMult');
    var isAccessor = !!(desc && desc.get);          // meal.js가 getter/setter로 바꿔둔 경우
    var orig = window.getEnhanceIncomeMult;
    var w = function () {
      var m = orig.apply(this, arguments);
      var b = bonusOf('doyun');
      return b > 0 ? m * (1 + b / 100) : m;
    };
    w.__peWrapped = true;
    if (isAccessor) {
      // 그냥 대입하면 meal.js의 setter가 w를 base로 저장 → w가 다시 자기 자신을 부르는 무한 반복(오류)이 난다.
      // 그래서 getter만 감싸고, setter는 그대로 둔다.
      Object.defineProperty(window, 'getEnhanceIncomeMult', { configurable: true, get: function () { return w; }, set: desc.set });
    } else {
      window.getEnhanceIncomeMult = w;
    }
  });

  // 5) 원정 코인 / 스태미나 / 조각 +1 확률: 현상 효과 합계에 더하기
  whenReady(function () { return typeof window.getEngraveBonus === 'function'; }, function () {
    if (window.getEngraveBonus.__peWrapped) return;
    var orig = window.getEngraveBonus;
    var w = function () {
      var out = orig.apply(this, arguments);
      if (out && typeof out === 'object') {
        out.coin = (out.coin || 0) + bonusOf('ara') / 100;
        out.stamina = (out.stamina || 0) - bonusOf('harin') / 100;
        out.pieceExtra = (out.pieceExtra || 0) + bonusOf('yuna') / 100;
      }
      return out;
    };
    w.__peWrapped = true;
    window.getEngraveBonus = w;
  });

  // 히든카드가 사라졌을 때 장착 정리 + 강화 확률 갱신
  setInterval(function () { try { sanitize(); applyEnhanceRate(); } catch (e) {} }, 1000);

    // 장착된 프리미엄 카드들의 옛 효과(조각 확률 / 조각 +1)를 전부 합쳐서 돌려줌 (원정 멤버와 상관없음)
  window.getEquippedPremiumBonus = function () {
    if (typeof window.getPremiumBonus !== 'function') return null;
    var act = activeSet(), skill = 0, extra = 0, lv = 0, any = false;
    ORDER.forEach(function (pid) {
      if (!act[pid]) return;
      var b = window.getPremiumBonus(pid);
      if (!b) return;
      any = true; skill += b.skill; extra += b.extra; lv = Math.max(lv, b.lv);
    });
    if (!any) return null;
    return { lv: lv, skill: skill, extra: Math.min(0.95, extra), skillName: '화보의 온도', effectName: '프리미엄 장착 효과' };
  };
   // 맵 왼쪽 위에 보여줄, 지금 켜진 장착 효과 목록
  window.getPremiumEquipLines = function () {
    var act = activeSet();
    return ORDER.filter(function (pid) { return act[pid]; }).map(function (pid) {
      var p = PREMIUMS[pid];
      return p.icon + ' ' + p.text(valueAt(pid, premiumLv(pid)));
    });
  };
 
  window.__peTest = { equip: equip, unequip: unequip, bonusOf: bonusOf, valueAt: valueAt, loadEq: loadEq, activeSet: activeSet, sanitize: sanitize, applyEnhanceRate: applyEnhanceRate, sectionHtml: sectionHtml };
})();
