// ════════════════════════════════
// ✨ 반짝이 가루 (sparkle-dust.js)
// 낚시로 잡은 물고기를 모아 "반짝이 가루"를 만들고, 카드 재조합할 때 써서 히든 확률을 올리는 소모품.
//  - 제작: 재조합 화면의 [만들기] 버튼. 물고기를 "점수"로 환산해서 6점 = 가루 1개.
//          손해가 가장 적은 조합(싼 물고기 위주)을 자동으로 골라 보여주고, 확인하면 만든다.
//  - 사용: [사용] 버튼을 켜고 재조합하면 가루 1개를 쓰고 이번 한 번만 레어히든 확률 +DUST_BONUS %p
//          (천장이 적용되는 SR_SR 이상 조합에서만 효과. 낮은 조합에선 안 쓰이고 안 사라짐)
// 필요: recombine-patch.js (천장 패치)가 같이 있어야 함. 값은 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  var DUST_NAME = '반짝이 가루';
  var DUST_EMOJI = '✨';
  var DUST_BONUS = 3;          // 가루 1개 사용 시 레어히든 확률 증가(%p)
  var POINTS_PER_DUST = 6;     // 가루 1개에 필요한 물고기 점수
  // 물고기 점수 (비싼 물고기일수록 높음). 판매가(price)는 fishing.js와 같은 값
  var FISH = [
    { name: '별빛 송사리', emoji: '🐟', points: 1, price: 20 },
    { name: '은빛 붕어',   emoji: '🐟', points: 1, price: 30 },
    { name: '달빛 잉어',   emoji: '🐠', points: 2, price: 50 },
    { name: '꽃잎 금붕어', emoji: '🐠', points: 3, price: 90 },
    { name: '황금 잉어',   emoji: '🐡', points: 6, price: 180 }
  ];

  // ════ 순수 로직 ════
  // counts: { 물고기이름: 보유수 } → 가루 n개를 만들 때 "판매가 합이 가장 적은" 조합 {이름: 개수} (불가능하면 null)
  function planCraft(counts, n) {
    var need = POINTS_PER_DUST * n;
    var units = [];
    FISH.forEach(function (f) {
      var have = counts[f.name] || 0, cap = Math.min(have, Math.ceil(need / f.points));
      for (var i = 0; i < cap; i++) units.push(f);
    });
    var INF = 1e12, dp = [], pick = [];
    for (var p = 0; p <= need; p++) { dp.push(INF); pick.push(null); }
    dp[0] = 0;
    // 0/1 배낭: need 이상이면 need로 합침. 같은 물고기 여러 마리는 unit 단위로 처리
    var ids = [];
    units.forEach(function (u, idx) {
      for (var q = need; q >= 0; q--) {
        if (dp[q] >= INF) continue;
        var np = Math.min(need, q + u.points), cost = dp[q] + u.price;
        if (cost < dp[np]) { dp[np] = cost; pick[np] = { from: q, unit: idx, prev: pick[q] }; }
      }
    });
    if (dp[need] >= INF) return null;
    // 역추적 (각 칸이 마지막으로 갱신된 unit 기준이라 사슬을 따라가며 같은 unit 중복 사용 방지)
    var plan = {}, used = {}, node = pick[need], guard = 0;
    while (node && guard++ < 1000) {
      if (used[node.unit]) return planFallback(counts, n);
      used[node.unit] = true;
      var name = units[node.unit].name; plan[name] = (plan[name] || 0) + 1;
      node = node.prev;
    }
    var pts = 0; Object.keys(plan).forEach(function (k) { pts += plan[k] * pointsOf(k); });
    return pts >= need ? plan : planFallback(counts, n);
  }
  function pointsOf(name) { for (var i = 0; i < FISH.length; i++) if (FISH[i].name === name) return FISH[i].points; return 0; }
  // 역추적이 꼬였을 때를 위한 단순 대체: 싼 물고기부터 채움
  function planFallback(counts, n) {
    var need = POINTS_PER_DUST * n, got = 0, plan = {};
    FISH.slice().sort(function (a, b) { return a.price - b.price; }).forEach(function (f) {
      var have = counts[f.name] || 0;
      while (have > 0 && got < need) { plan[f.name] = (plan[f.name] || 0) + 1; have--; got += f.points; }
    });
    return got >= need ? plan : null;
  }
  function maxCraft(counts) {
    var total = 0; FISH.forEach(function (f) { total += (counts[f.name] || 0) * f.points; });
    var n = Math.floor(total / POINTS_PER_DUST);
    while (n > 0 && !planCraft(counts, n)) n--;
    return n;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FISH: FISH, planCraft: planCraft, maxCraft: maxCraft, POINTS_PER_DUST: POINTS_PER_DUST };
  }
  if (typeof document === 'undefined') return;

  // ════ 게임 연동 ════
  var useDust = false;   // [사용] 켜짐 여부 (화면을 나가면 다시 꺼짐)

  function qty(name) {
    var it = bagItems.find(function (i) { return i.name === name; });
    return it ? it.qty : 0;
  }
  function fishCounts() {
    var c = {}; FISH.forEach(function (f) { c[f.name] = qty(f.name); });
    return c;
  }
  function planText(plan) {
    return FISH.filter(function (f) { return plan[f.name]; }).map(function (f) { return f.emoji + ' ' + f.name + ' ×' + plan[f.name]; }).join('<br>');
  }

  function craft(n) {
    var plan = planCraft(fishCounts(), n);
    if (!plan) { showBagToast('물고기가 부족해요!'); return; }
    // 가방 자리 확인 (가루 칸이 없고 가방이 꽉 찬 경우, 물고기 칸이 비면 자리가 생기므로 일단 진행 후 결과 확인)
    FISH.forEach(function (f) { if (plan[f.name]) useFromBag(f.name, plan[f.name]); });
    if (!addToBag(DUST_EMOJI, DUST_NAME, 'material', n, '재조합 히든 확률 +' + DUST_BONUS + '%p (SR_SR 이상 조합, 1회 1개)')) {
      FISH.forEach(function (f) { if (plan[f.name]) addToBag(f.emoji, f.name, 'material', plan[f.name], '낚시로 잡은 물고기 · 재료 상점에서 팔 수 있어요'); });
      return;
    }
    if (typeof MATERIAL_EMOJI_MAP !== 'undefined') MATERIAL_EMOJI_MAP[DUST_NAME] = DUST_EMOJI;
    showBagToast('✨ 반짝이 가루 ' + n + '개를 만들었어요!');
    var ov = document.getElementById('dust-craft-overlay'); if (ov) ov.remove();
    refreshPanel();
  }

  function openCraft() {
    var old = document.getElementById('dust-craft-overlay'); if (old) old.remove();
    var counts = fishCounts(), max = maxCraft(counts), one = planCraft(counts, 1);
    var ov = document.createElement('div');
    ov.id = 'dust-craft-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:985;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;';
    var have = FISH.map(function (f) { return counts[f.name] ? f.emoji + ' ' + f.name + ' ' + counts[f.name] + '마리 (' + f.points + '점)' : ''; }).filter(Boolean).join('<br>') || '물고기가 없어요. 호수에서 낚시해봐요 🎣';
    var body = '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:24px 20px;text-align:center;width:86%;max-width:310px;">' +
      '<div style="font-size:34px;margin-bottom:4px;">✨</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:6px;">반짝이 가루 만들기</div>' +
      '<div style="font-size:12px;color:#aaa;line-height:1.6;margin-bottom:12px;">물고기 ' + POINTS_PER_DUST + '점 = 가루 1개<br>쓰면 재조합 히든 확률 +' + DUST_BONUS + '%p (SR_SR 이상)</div>' +
      '<div style="font-size:13px;color:#ddd;line-height:1.7;margin-bottom:12px;text-align:left;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px 12px;">' + have + '</div>';
    if (one) {
      body += '<div style="font-size:12px;color:#FFD700;margin-bottom:10px;">1개 만들 때 사라지는 물고기<br>' + planText(one) + '</div>' +
        '<button id="dust-make-1" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">1개 만들기</button>';
      if (max > 1) body += '<button id="dust-make-max" style="width:100%;padding:12px;margin-bottom:8px;background:rgba(192,132,252,0.2);border:1px solid #C084FC;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">최대 ' + max + '개 만들기</button>';
    } else {
      body += '<div style="font-size:12px;color:#FF6B9D;margin-bottom:10px;">점수가 모자라요 (현재 ' + FISH.reduce(function (a, f) { return a + (counts[f.name] || 0) * f.points; }, 0) + '점 / ' + POINTS_PER_DUST + '점 필요)</div>';
    }
    body += '<button id="dust-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button></div>';
    ov.innerHTML = body;
    document.body.appendChild(ov);
    var m1 = document.getElementById('dust-make-1'); if (m1) m1.onclick = function () { craft(1); };
    var mm = document.getElementById('dust-make-max'); if (mm) mm.onclick = function () { craft(max); };
    document.getElementById('dust-close').onclick = function () { ov.remove(); };
  }

  // 재조합 화면의 가루 패널
  function refreshPanel() {
    var btn = document.getElementById('rc-start-btn');
    if (!btn || !btn.parentNode) return;
    var box = document.getElementById('rc-dust-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rc-dust-box';
      box.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:auto 0 6px;font-size:12px;font-weight:700;color:#fff;';
      var info = document.getElementById('rc-pity-info');
      btn.parentNode.insertBefore(box, info || btn);
      if (info) info.style.marginTop = '0';
      else btn.style.marginTop = '0';
    }
    var n = qty(DUST_NAME), recipe = null, eligible = true;
    try {
      recipe = getRcCurrentRecipe();
      eligible = recipe ? rcPityApplies(recipe.key) : true;
    } catch (e) {}
    if (n <= 0) useDust = false;
    var on = useDust && n > 0 && eligible;
    var style = 'padding:6px 10px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';
    box.innerHTML = '<span>✨ 반짝이 가루 ' + n + '개</span>' +
      '<button id="rc-dust-use" style="' + style + 'background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.12)') + ';border:' + (on ? 'none' : '1px solid rgba(255,255,255,0.25)') + ';color:#fff;">' + (on ? '사용 중 (+' + DUST_BONUS + '%p)' : '사용 안 함') + '</button>' +
      '<button id="rc-dust-make" style="' + style + 'background:rgba(192,132,252,0.2);border:1px solid #C084FC;color:#fff;">만들기</button>' +
      (recipe && !eligible ? '<div style="width:100%;text-align:center;font-size:11px;font-weight:400;color:#aaa;">이 조합은 가루 효과 없음 (SR_SR 이상부터)</div>' : '');
    document.getElementById('rc-dust-use').onclick = function () {
      if (qty(DUST_NAME) <= 0) { showBagToast('반짝이 가루가 없어요. [만들기]로 만들어봐요 ✨'); return; }
      if (recipe && !eligible) { showBagToast('SR_SR 이상 조합에서만 쓸 수 있어요'); return; }
      useDust = !useDust; refreshPanel();
    };
    document.getElementById('rc-dust-make').onclick = openCraft;
  }

  (function applyDustPatch() {
    // recombine-patch.js가 doRecombine을 먼저 덮어쓴 뒤에 그 위에 얹어야 해서 기다림
    if (!window.__rcPatchApplied || typeof window.doRecombine !== 'function' || typeof window.updateRcStartButton !== 'function') {
      setTimeout(applyDustPatch, 50);
      return;
    }
    if (window.__dustPatchApplied) return;
    window.__dustPatchApplied = true;
    if (typeof MATERIAL_EMOJI_MAP !== 'undefined') MATERIAL_EMOJI_MAP[DUST_NAME] = DUST_EMOJI;

    var patchedDoRecombine = window.doRecombine;
    window.doRecombine = function () {
      var spent = false;
      try {
        var recipe = getRcCurrentRecipe();
        if (useDust && recipe && rcPityApplies(recipe.key) && qty(DUST_NAME) >= 1 && canDoRecombine()) {
          useFromBag(DUST_NAME, 1);
          window.__rcExtraRare = DUST_BONUS;
          spent = true;
        }
      } catch (e) {}
      try {
        return patchedDoRecombine.apply(this, arguments);
      } finally {
        window.__rcExtraRare = 0;
        if (spent && qty(DUST_NAME) <= 0) useDust = false;
      }
    };

    var prevUpdate = window.updateRcStartButton;
    window.updateRcStartButton = function () {
      var r = prevUpdate.apply(this, arguments);
      try { refreshPanel(); } catch (e) {}
      return r;
    };
  })();
})();
