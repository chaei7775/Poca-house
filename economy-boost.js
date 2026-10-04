// economy-boost.js
// 코인 경제 조정: 초반은 쉽게(재료값 ↑), 후반 코인 소모처는 크게(재조합 상위 단계 비용 ↑)
//  1) 탐험 재료 판매가 ×MATERIAL_MULT  (물고기·기타 별도 등록 품목은 그대로)
//  2) 재조합 코인 비용: 초반 단계는 그대로, SR 이상은 크게 올림
// ※ 강화(enhance.js)·초월 비용은 이미 충분히 커서 건드리지 않음
(function economyBoost() {
  // ── 여기 숫자만 바꾸면 됨 ──
  var MATERIAL_MULT = 2;     // 재료 판매가 배수 (일반 50→100, 희귀 200→400, 특별탐험 재료 300→600)
  var RC_COIN = {            // 재조합 코인 비용 (조합 단계별). 적지 않은 단계는 원래 값 유지
    'SR_SR':    30000,       // 원래 10,000
    'SR_SSR':   30000,       // 원래 10,000
    'SSR_SSR': 150000,       // 원래 35,000
    'SSR_UR':  150000,       // 원래 35,000
    'UR_UR':   500000        // 원래 100,000
  };
  // 재료값을 올릴 품목 (recombine.js 기본 표에 있던 탐험 재료들)
  var MATERIALS = [
    '반짝이는조개','달빛모래','별빛모래','맑은샘물','무지개꽃','장미꽃','나비가루','네잎클로버',
    '별빛나무','고급원목','신비버섯','새의깃털','빛나는돌','은빛거미줄','달빛수정','별의파편','무지개수정','해바라기',
    '바다진주','달의눈물','나비의날개','벚꽃결정','행운의잎','천사의깃털','구름조각',
    '별빛 털','반짝이는 날개가루','은빛 깃털','신비한 꽃가루','달빛 잎사귀','수정 조각'
  ];

  function ready() {
    try { return typeof MATERIAL_SELL_PRICES !== 'undefined' && typeof RC_TABLE !== 'undefined'; }
    catch (e) { return false; }
  }

  function init() {
    if (!ready()) { setTimeout(init, 100); return; }
    if (window.__economyBoostApplied) return;     // 두 번 로드돼도 배수가 겹치지 않게
    window.__economyBoostApplied = true;

    // 1) 재료 판매가
    MATERIALS.forEach(function (name) {
      if (typeof MATERIAL_SELL_PRICES[name] === 'number') MATERIAL_SELL_PRICES[name] = MATERIAL_SELL_PRICES[name] * MATERIAL_MULT;
    });

    // 2) 재조합 코인 비용
    Object.keys(RC_COIN).forEach(function (key) {
      if (RC_TABLE[key]) RC_TABLE[key].coin = RC_COIN[key];
    });
  }
  init();
})();
