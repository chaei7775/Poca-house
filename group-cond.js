// ════════════════════════════════════════════════════════════
// 😴 그룹 활동 컨디션 소모 (group-cond.js)
// 그룹 활동에 나온 멤버마다 관리탭의 체력·기분(meal.js)이 깎인다. 체력 음료(코인)로는 풀 수 없고 식사·휴식으로만 회복된다.
//  · 활동마다 소모량이 다르다 (COST). 기분은 잘할수록 덜 깎이고 못할수록 더 깎인다 (예능은 오히려 기분이 오른다)
//  · 체력이 EXHAUST_S 미만인 멤버는 그날 활동에 못 나온다 (남은 멤버가 2명 미만이면 활동 불가)
//  · 체력 < LOW_S / 기분 < LOW_M 인 멤버가 있으면 보상 점수가 깎인다 (사고 확률 증가는 group-report.js 에 이미 있음)
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var COST = {                           // [체력 소모, 기분 변화 (음수=깎임, 양수=오름)]
    stage: [10, -5], dance: [10, -5], drama: [10, -5],
    album: [6, -4], photo: [6, -4], variety: [3, 4]
  };
  var EXHAUST_S = 15;                    // 이 체력 미만이면 활동 불가 (레슨 MIN_STAMINA 와 같음)
  var LOW_S = 35, LOW_M = 30;            // 이 아래면 컨디션 불량
  var LOW_S_MULT = 0.85, LOW_M_MULT = 0.9;   // 컨디션 불량 멤버 1명당 점수 배율 (멤버 평균을 적용)

  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function M() { return window.__mealTest || null; }
  function get(cid) { var m = M(); if (!m) return null; try { var st = m.statOf(m.load(), cid); return { s: st.s, m: st.m }; } catch (e) { return null; } }
  function ok(cid) { var c = get(cid); return !c || c.s >= EXHAUST_S; }
  function tired(list) { return list.filter(function (c) { return !ok(c); }); }
  function mult(list) {
    var t = 0, n = 0; list.forEach(function (c) { var g = get(c); if (!g) return; n++; t += (g.s < LOW_S ? LOW_S_MULT : 1) * (g.m < LOW_M ? LOW_M_MULT : 1); });
    return n ? t / n : 1;
  }
  function spend(list, actId, perf) {
    var m = M(), cost = COST[actId]; if (!m || !cost) return null;
    var p = (typeof perf === 'number') ? perf : 0.5, dm = cost[1] < 0 ? Math.round(cost[1] * (1.5 - p)) : Math.round(cost[1] * (0.5 + p));
    try {
      var st = m.load();
      list.forEach(function (c) { var x = m.statOf(st, c); x.s = clamp(x.s - cost[0]); x.m = clamp(x.m + dm); });
      m.save(st);
    } catch (e) { return null; }
    try { if (window.__mealRefresh) window.__mealRefresh(); } catch (e) {}
    return { s: -cost[0], m: dm };
  }
  window.__groupCond = { get: get, ok: ok, tired: tired, mult: mult, spend: spend, COST: COST, EXHAUST_S: EXHAUST_S };
})();
