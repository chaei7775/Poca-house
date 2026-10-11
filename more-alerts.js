// ════════════════════════════════
// 🔴 더보기 알림 점 (more-alerts.js) — 확인할 게 있으면 더보기 버튼·카테고리 아이콘·칸에 빨간 점
//  · 지금 알림이 되는 것: 📬 안 읽은 편지 / 🚗 로드 매니저 보상 대기 / 🧑‍🎤 그룹(오늘 활동 안 함·멤버 친밀도 낮음)
//    / 📅 스케줄 관리(뷰티·운동 쿨타임 끝남) / 📁 내 컬렉션(열 수 있는 💓 설렘 이벤트)
//  · 더 붙이고 싶으면 아래 ALERTS 에 { re: 칸 이름 정규식, fn: 알림이 있으면 true } 한 줄만 추가
//  · 칸/카테고리 점은 more-menu-group.js 가 이 목록을 읽어서 그리고, 아래 더보기 버튼(하단 메뉴) 점은 여기서 그린다
// ════════════════════════════════
(function () {
  'use strict';
  function money() { try { return Math.floor(coins); } catch (e) { return 0; } }
  function groupSt() { try { var s = window.__groupTest.load(); return s && s.group ? s : null; } catch (e) { return null; } }
  function groupFresh() {   // 그룹이 있고 오늘 활동을 아직 하나도 안 했을 때 (하루 체력이 가득 찬 상태)
    var s = groupSt(); if (!s) return false;
    var used = 0; try { Object.keys(s.used || {}).forEach(function (k) { used += Number(s.used[k]) || 0; }); } catch (e) {}
    return used === 0 && s.free > 0;
  }
  function groupLowBond() {   // 멤버 사이 평균 친밀도가 40 밑이면 (매니저가 케어해야 할 때)
    var s = groupSt(); if (!s || !window.__groupBond) return false;
    var m = s.group.members || [], sum = 0, n = 0;
    for (var i = 0; i < m.length; i++) for (var j = i + 1; j < m.length; j++) { sum += window.__groupBond.cur(m[i], m[j]); n++; }
    return n > 0 && sum / n < 40;
  }
  function spaReady() {   // 전에 뷰티·운동 관리를 받은 아이돌 중 쿨타임이 끝났고, 가장 싼 관리를 받을 코인도 있을 때
    try {
      var sp = window.__spaTest, s = sp.load(), min = 1e12;
      sp.FACILITIES.forEach(function (f) { if (f.price < min) min = f.price; });
      if (money() < min) return false;
      return Object.keys(s.next).some(function (c) { return (s.total[c] || 0) > 0 && s.next[c] > 0 && s.next[c] <= Date.now(); });
    } catch (e) { return false; }
  }
  var ALERTS = [
    { re: /로드 매니저/, fn: function () { try { return window.__roadMgrTest && window.__roadMgrTest.status() === 'ready'; } catch (e) { return false; } } },
    { re: /^그룹/, fn: function () { return groupFresh() || groupLowBond(); } },
    { re: /스케줄 관리/, fn: spaReady },
    { re: /내 컬렉션/, fn: function () { try { return window.PhRomance && window.PhRomance.readyAny(); } catch (e) { return false; } } }
  ];
  window.__moreAlerts = (window.__moreAlerts || []).concat(ALERTS);

  function mailUnread() { try { return window.__mailTest.load().inbox.some(function (m) { return !m.read; }); } catch (e) { return false; } }
  function any() { return mailUnread() || window.__moreAlerts.some(function (a) { try { return a.fn(); } catch (e) { return false; } }); }

  (function css() {
    var st = document.createElement('style');
    st.textContent = '#nav-shop.has-alert{position:relative;} #nav-shop.has-alert::after{content:"";position:absolute;top:3px;left:calc(50% + 8px);width:10px;height:10px;border-radius:50%;background:#ff4d6d;border:1.5px solid #fff;}';
    document.head.appendChild(st);
  })();
  setInterval(function () { var nav = document.getElementById('nav-shop'); if (nav) nav.classList.toggle('has-alert', any()); }, 1500);
})();
