// ════════════════════════════════
// 🔴 더보기 알림 점 (more-alerts.js) — 확인할 게 있으면 더보기 버튼·카테고리 아이콘·칸에 빨간 점
//  · 지금 알림이 되는 것: 📬 안 읽은 편지(기존) / 🚗 로드 매니저가 다녀와서 받을 보상이 있을 때
//  · 더 붙이고 싶으면 아래 ALERTS 에 { re: 칸 이름 정규식, fn: 알림이 있으면 true } 한 줄만 추가
//  · 칸/카테고리 점은 more-menu-group.js 가 이 목록을 읽어서 그리고, 아래 더보기 버튼(하단 메뉴) 점은 여기서 그린다
// ════════════════════════════════
(function () {
  'use strict';
  var ALERTS = [
    { re: /로드 매니저/, fn: function () { try { return window.__roadMgrTest && window.__roadMgrTest.status() === 'ready'; } catch (e) { return false; } } }
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
