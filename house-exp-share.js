// 🏠 플레이어 경험치의 일부를 포카하우스(가장 레벨 높은 보유 포카)가 같이 먹는 모듈
// 별도 모듈 — game.js / pocalevel.js 안 건드림. 비율은 SHARE 숫자만 바꾸면 됨.
(function () {
  'use strict';
  var SHARE = 0.5;   // 플레이어 EXP의 50%를 포카 EXP로 추가 지급
  var busy = false, tries = 0;

  function topCard() {
    try {
      var ids = Object.keys(CHARS).filter(function (cid) {
        return CARDS.some(function (c) { return c.charId === cid && owned.includes(c.id); });
      });
      var best = null, bl = -1, be = -1;
      ids.forEach(function (cid) {
        var l = getCardLevel(cid), e = getCardExp(cid);
        if (l > bl || (l === bl && e > be)) { best = cid; bl = l; be = e; }
      });
      return best;
    } catch (e) { return null; }
  }

  function patch() {
    if (typeof window.addPlayerExp !== 'function' || typeof window.addCardExp !== 'function') {
      if (++tries < 120) setTimeout(patch, 500);
      return;
    }
    if (window.__houseExpShare) return;
    window.__houseExpShare = true;
    var orig = window.addPlayerExp;
    window.addPlayerExp = function (amount) {
      var r = orig.apply(this, arguments);
      if (busy) return r;
      busy = true;
      try {
        var n = Math.floor(Number(amount) * SHARE);
        if (n >= 1) { var cid = topCard(); if (cid) addCardExp(cid, n); }
      } catch (e) {} finally { busy = false; }
      return r;
    };
  }
  patch();
})();
