// ════════════════════════════════════════════════════════════
// 🌟 히든카드 효과 적용 (hidden-effects.js)
// 지금까지 진짜 히든카드 12장(레어/에픽)의 효과는 그림과 표에만 있고 게임에 적용되지 않았음 → 여기서 실제로 켠다.
//
//  · 갖고 있는 동안 효과가 켜진다 (카드 그림의 숫자 = 강화 전 "기본값")
//  · 강화(+1~+10) · 초월(1~3단계)을 올릴수록 효과가 커진다
//      진행도 p = 초월단계×11 + 강화단계 (0~43, 초월 1번 = 강화 1칸 보너스) → 배율 = 1 + (MAX_MULT-1) × p/43
//      초월 3단계 완료(+10강) = 기본값의 MAX_MULT배 (10배: 알바코인 +6% → +60%)
//  · 효과마다 상한(CAPS)이 있어서 너무 세지지 않는다
//
// 연결된 효과 (나머지는 아직 게임에 연결할 곳이 없어서 표에 "준비 중"으로 표시)
//   알바 코인 / 호감도 / 수업 점수 : getEquippedStat 에 더함 (의상 효과와 같은 방식)
//   희귀재료 : getEquippedStat('luck') 에 더함 (탐험들이 희귀 확률 = 0.30 + 행운/100)
//   스태미나 소모 : saveStamina 에서 10 이상 줄 때 일부 돌려줌
//   소원조각 획득 : checkWishFragment 확률에 더함
//   제작 대성공 : craftCloth(재봉)을 부를 때만 SEWING_RATES.great 를 잠깐 올림
//
// 값을 바꾸려면 아래 [설정]만 고치면 됨. 강화/초월 정보는 localStorage 'ph_enhance' 를 읽기만 한다.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var MAX_MULT = 10;          // 초월 3단계 완료 시 기본값의 몇 배
  var MAX_PROGRESS = 43;      // 초월 3단계 완료(+10강) = 3×11 + 10
  // 효과 종류별 상한 (단위는 %, 소원조각은 %p)
  var CAPS = { coin: 100, luck: 15, affection: 50, study: 50, stamina: 50, wish: 2, great: 40 };
  // 카드별 효과: stat 은 위 종류 / v = 카드 그림의 기본값 / live=false 면 아직 연결 안 됨
  var FX = {
    hidden_minjun_rare: [{ stat: 'coin', v: 6, label: '알바 코인' }],
    hidden_minjun_epic: [{ stat: 'coin', v: 12, label: '알바 코인' }, { stat: 'exp', v: 10, label: '알바 경험치', live: false }],
    hidden_sion_rare:   [{ stat: 'stamina', v: 5, label: '스태미나 소모', neg: true }],
    hidden_sion_epic:   [{ stat: 'stamina', v: 10, label: '스태미나 소모', neg: true }, { stat: 'time', v: 1, label: '탐험 시간', live: false }],
    hidden_yuna_rare:   [{ stat: 'luck', v: 0.7, label: '희귀재료 획득' }],
    hidden_yuna_epic:   [{ stat: 'luck', v: 1, label: '희귀재료 획득' }, { stat: 'affection', v: 1, label: 'NPC 호감도 획득' }],
    hidden_harin_rare:  [{ stat: 'wish', v: 0.5, label: '소원조각 획득' }],
    hidden_harin_epic:  [{ stat: 'wish', v: 0.8, label: '소원조각 획득' }, { stat: 'npc', v: 1, label: '희귀 NPC 조우율', live: false }],
    hidden_doyun_rare:  [{ stat: 'exam', v: 5, label: '시험 등급 상승', live: false }],
    hidden_doyun_epic:  [{ stat: 'exam', v: 10, label: '시험 등급 상승', live: false }, { stat: 'study', v: 5, label: '수업 점수' }],
    hidden_ara_rare:    [{ stat: 'great', v: 3, label: '제작 대성공 확률' }],
    hidden_ara_epic:    [{ stat: 'great', v: 3, label: '제작 대성공 확률' }, { stat: 'mat', v: 2, label: '제작 재료 소모', live: false }]
  };

  // ════════ 순수 로직 ════════
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function owned(id) { try { return typeof ownedHiddenCards !== 'undefined' && ownedHiddenCards.indexOf(id) !== -1; } catch (e) { return false; } }
  function progress(id) {
    var st = J('ph_enhance', {}) || {};
    var L = Number(st.level && st.level[id]) || 0, S = Number(st.stage && st.stage[id]) || 0;
    return pFor(L, S);
  }
  function pFor(L, S) { return Math.max(0, Math.min(MAX_PROGRESS, S * 11 + L)); }
  function multAt(p) { return 1 + (MAX_MULT - 1) * p / MAX_PROGRESS; }
  // 다음 강화/초월 뒤의 진행도 (더 못 올리면 null)
  function nextP(id) {
    var st = J('ph_enhance', {}) || {};
    var L = Number(st.level && st.level[id]) || 0, S = Number(st.stage && st.stage[id]) || 0;
    if (L < 10) return pFor(L + 1, S);
    if (S < 3) return (S + 1 >= 3) ? pFor(10, S + 1) : pFor(0, S + 1);
    return null;
  }
  function multOf(id) { return multAt(progress(id)); }
  function r1(n) { return Math.round(n * 10) / 10; }
  // 지금 켜져 있는 효과 합계 { coin:.., luck:.. } (상한 적용)
  function totals() {
    var t = {};
    Object.keys(FX).forEach(function (id) {
      if (!owned(id)) return;
      var m = multOf(id);
      FX[id].forEach(function (e) { if (e.live === false) return; t[e.stat] = (t[e.stat] || 0) + e.v * m; });
    });
    Object.keys(t).forEach(function (k) { if (CAPS[k] !== undefined) t[k] = Math.min(CAPS[k], t[k]); t[k] = r1(t[k]); });
    return t;
  }
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() { var ok = false; try { ok = test(); } catch (e) {} if (ok) { fn(); return; } if (++tries < 200) setTimeout(attempt, 100); })();
  }

  // ════════ 효과 연결 ════════
  // 1) 알바 코인 · 호감도 · 수업 점수 · 희귀재료(행운)
  var STAT_MAP = { coin: 'coin', affection: 'affection', study: 'study', luck: 'luck' };
  whenReady(function () { return typeof window.getEquippedStat === 'function'; }, function () {
    var orig = window.getEquippedStat;
    var w = function (stat) {
      var v = Number(orig.apply(this, arguments)) || 0;
      if (STAT_MAP[stat]) { try { v += totals()[STAT_MAP[stat]] || 0; } catch (e) {} }
      return v;
    };
    window.getEquippedStat = w;
  });

  // 2) 스태미나 소모 -N% : 10 이상 줄어들 때 그만큼 돌려줌 (체험 카드와 같은 방식)
  whenReady(function () { return typeof window.saveStamina === 'function' && typeof stamina !== 'undefined'; }, function () {
    var orig = window.saveStamina, last = stamina;
    window.saveStamina = function () {
      try {
        var diff = last - stamina, f = totals().stamina || 0;
        if (f > 0 && diff >= 10 && diff <= 60) { var back = Math.floor(diff * f / 100); if (back > 0) stamina += back; }
      } catch (e) {}
      var r = orig.apply(this, arguments);
      last = stamina;
      return r;
    };
  });

  // 3) 소원조각 획득 확률 +N%p
  whenReady(function () { return typeof window.checkWishFragment === 'function'; }, function () {
    var orig = window.checkWishFragment;
    window.checkWishFragment = function (rate) {
      var base = (typeof rate === 'number') ? rate : 0.005;
      var add = 0; try { add = (totals().wish || 0) / 100; } catch (e) {}
      return orig.call(this, base + add);
    };
  });

  // 4) 제작(재봉) 대성공 확률 +N%p : 그 한 번 동안만 great 비율을 올리고 success 에서 뺀다
  whenReady(function () { return typeof window.craftCloth === 'function' && typeof SEWING_RATES !== 'undefined'; }, function () {
    var orig = window.craftCloth;
    window.craftCloth = function () {
      var add = 0; try { add = (totals().great || 0) / 100; } catch (e) {}
      if (add <= 0) return orig.apply(this, arguments);
      var g = SEWING_RATES.great, s = SEWING_RATES.success;
      var move = Math.min(add, Math.max(0, s));
      SEWING_RATES.great = g + move; SEWING_RATES.success = s - move;
      try { return orig.apply(this, arguments); }
      finally { SEWING_RATES.great = g; SEWING_RATES.success = s; }
    };
  });

  // ════════ 화면: 더보기 > 🌟 히든 효과 ════════
  var ACC = '#C084FC', FONT = "font-family:'Noto Sans KR',sans-serif;";
  function fmtVal(e, v) { return (e.neg ? '-' : '+') + r1(v) + (e.stat === 'time' ? '초' : '%'); }
  function openPanel() {
    var old = document.getElementById('hfx-overlay'); if (old) old.remove();
    var list = (typeof HIDDEN_CARDS !== 'undefined' ? HIDDEN_CARDS : []).filter(function (h) { return owned(h.id) && FX[h.id]; });
    var rows = list.map(function (h) {
      var p = progress(h.id), m = multOf(h.id);
      var eff = FX[h.id].map(function (e) {
        if (e.live === false) return '<div style="font-size:12px;color:#888;margin-top:3px;">' + e.label + ' ' + fmtVal(e, e.v) + ' <span style="font-size:10px;">(준비 중)</span></div>';
        var cur = Math.min(CAPS[e.stat] !== undefined ? CAPS[e.stat] : 1e9, e.v * m);
        return '<div style="font-size:12px;color:#ddd;margin-top:3px;">' + e.label + ' <span style="color:#888;">' + fmtVal(e, e.v) + '</span> → <b style="color:#FFD700;">' + fmtVal(e, cur) + '</b></div>';
      }).join('');
      return '<div style="background:rgba(255,255,255,.07);border:1px solid #ffffff22;border-radius:12px;padding:10px 12px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:#fff;"><span>' + h.name + '</span><span style="color:' + ACC + ';font-size:11px;">진행 ' + p + '/' + MAX_PROGRESS + ' · ×' + r1(m) + '</span></div>' + eff + '</div>';
    }).join('') || '<div style="font-size:12px;color:#aaa;text-align:center;padding:20px 0;">아직 히든카드가 없어요</div>';
    var ov = document.createElement('div');
    ov.id = 'hfx-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:rgba(10,5,20,.95);overflow-y:auto;padding:18px;' + FONT;
    ov.innerHTML = '<div style="max-width:340px;margin:0 auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:18px;font-weight:900;color:#fff;">🌟 히든카드 효과</div>' +
      '<button id="hfx-x" style="padding:7px 12px;border:none;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="font-size:11px;color:#bbb;line-height:1.6;margin-bottom:12px;">카드 그림의 숫자는 강화 전 기본값이에요.<br>강화 · 초월할수록 효과가 커져서, 초월 3단계를 끝내면 기본값의 <b style="color:#FFD700;">' + MAX_MULT + '배</b>까지 올라가요. (효과마다 상한이 있어요)</div>' + rows + '</div>';
    document.body.appendChild(ov);
    document.getElementById('hfx-x').onclick = function () { ov.remove(); };
  }
  window.openHiddenEffects = openPanel;

  // ════════ 트레이닝룸 화면에 효과를 바로 보여주기 ════════
  function capped(e, m) { return Math.min(CAPS[e.stat] !== undefined ? CAPS[e.stat] : 1e9, e.v * m); }
  function detailBox(id) {
    var lines = FX[id].map(function (e) {
      if (e.live === false) return '<div style="display:flex;justify-content:space-between;font-size:12px;color:#777;padding:2px 0;"><span>' + e.label + '</span><span>' + fmtVal(e, e.v) + ' (준비 중)</span></div>';
      var cur = capped(e, multOf(id)), np = nextP(id), nx = np === null ? null : capped(e, multAt(np));
      var tail = nx === null ? ' <span style="font-size:10px;color:#6ee7a0;">최대!</span>' : (nx > cur ? ' <span style="font-size:11px;color:#6ee7a0;">→ ' + fmtVal(e, nx) + '</span>' : '');
      return '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:#fff;padding:2px 0;"><span>' + e.label + '</span><span><span style="color:#888;font-size:11px;">기본 ' + fmtVal(e, e.v) + '</span> <b style="color:#FFD700;">' + fmtVal(e, cur) + '</b>' + tail + '</span></div>';
    }).join('');
    return '<div class="hfx-box" style="background:rgba(255,215,0,.07);border:1px solid #FFD70044;border-radius:12px;padding:9px 12px;margin-bottom:10px;"><div style="font-size:12px;font-weight:900;color:#FFD700;margin-bottom:4px;">🌟 카드 효과 <span style="font-weight:400;color:#aaa;">(강화할수록 커져요)</span></div>' + lines + '</div>';
  }
  function decorate() {
    var det = document.getElementById('enhance-detail');
    if (det && !det.querySelector('.hfx-box')) {
      var title = det.querySelector('#enh-go') || det.querySelector('#enh-back');
      var h = (typeof HIDDEN_CARDS !== 'undefined' ? HIDDEN_CARDS : []).filter(function (x) { return det.innerHTML.indexOf(x.name) !== -1 && owned(x.id) && FX[x.id]; });
      // 같은 이름(레어/에픽)이 있어서 이미지 주소로 정확히 구분
      var exact = h.filter(function (x) { return det.innerHTML.indexOf(x.img) !== -1; })[0] || h[0];
      if (title && exact) title.insertAdjacentHTML('beforebegin', detailBox(exact.id));
    }
    var ov = document.getElementById('enhance-overlay');
    if (ov) ov.querySelectorAll('[data-open]').forEach(function (el) {
      if (el.querySelector('.hfx-mini')) return;
      var id = el.getAttribute('data-open'), e = FX[id] && FX[id].filter(function (x) { return x.live !== false; })[0];
      if (!e) return;
      var bar = el.lastElementChild; if (!bar) return;
      bar.insertAdjacentHTML('beforeend', '<div class="hfx-mini" style="font-size:9px;color:#9fe8b0;font-weight:900;">' + e.label + ' ' + fmtVal(e, capped(e, multOf(id))) + '</div>');
    });
  }
  try { new MutationObserver(function () { try { decorate(); } catch (e) {} }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}

  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    window.openMoreMenu = function () {
      var res = orig.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-hfx-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🌟', '히든 효과', ACC, 'openHiddenEffects()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-hfx-tile';
      }
      return res;
    };
  });

  window.__hiddenFxTest = { FX: FX, CAPS: CAPS, progress: progress, multOf: multOf, totals: totals, MAX_MULT: MAX_MULT };
})();
