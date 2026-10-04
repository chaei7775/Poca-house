// ════════════════════════════════
// 🏠 내 집 테마 교체 (room-themes.js)
// 잡화점 '방' 탭의 기존 테마 3종(핑크덕질방·식물힐링방·인형컬렉터룸)을 판매 목록에서 내리고,
// 새 테마 3종으로 바꾼다. game.js / index.html은 건드리지 않는다.
//  - 이미 기존 테마를 산 사람: 보유 중인 건 '이전 테마'로 목록 맨 아래에 남아서 계속 적용 가능 (코인 손실 없음)
//  - 새 테마 이미지는 repo 맨 위 폴더에 room_stage.png / room_luxury.png / room_vintage.png 로 올리기
//  - 가격은 아래 PRICE만 고치면 됨
//  - 내 집의 '🛋️ 방 꾸미기' 버튼(원래 '준비 중이에요!')을 테마 사는 화면으로 연결 (포카 레벨 3부터)
// ════════════════════════════════
(function () {
  'use strict';

  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();
  var PRICE = { stage: 30000, luxury: 80000, vintage: 150000 };   // 코인
  var NEW_THEMES = {
    stage:   { name: '💜 마이스테이지룸',  img: IMG_BASE + 'room_stage.png',   emoji: '💜' },
    luxury:  { name: '👑 럭셔리 스위트',   img: IMG_BASE + 'room_luxury.png',  emoji: '👑' },
    vintage: { name: '📻 빈티지 덕질방',   img: IMG_BASE + 'room_vintage.png', emoji: '📻' }
  };
  var NEW_IDS = ['stage', 'luxury', 'vintage'];
  var OLD_IDS = ['pink', 'plant', 'doll'];

  function install() {
    if (typeof ROOM_THEMES === 'undefined' || typeof window.renderRoomShop !== 'function') { setTimeout(install, 80); return; }
    if (window.__roomThemesInstalled) return;
    window.__roomThemesInstalled = true;

    NEW_IDS.forEach(function (id) {
      ROOM_THEMES[id] = { name: NEW_THEMES[id].name, price: PRICE[id], img: NEW_THEMES[id].img + BUST };
    });

    window.renderRoomShop = function () {
      var sec = document.getElementById('section-room');
      if (!sec) return;
      var owned = (typeof ownedRooms !== 'undefined' && Array.isArray(ownedRooms)) ? ownedRooms : [];
      var oldOwned = OLD_IDS.filter(function (id) { return owned.indexOf(id) !== -1 && ROOM_THEMES[id]; });
      var ids = NEW_IDS.concat(oldOwned);
      var html = '<div style="font-size:11px;color:#888;margin-bottom:12px;">방 테마를 구매하고 내 방을 꾸며봐!</div>';
      ids.forEach(function (id) {
        var t = ROOM_THEMES[id];
        var fallback = (NEW_THEMES[id] && NEW_THEMES[id].emoji) || '🏠';
        var isOld = OLD_IDS.indexOf(id) !== -1;
        var isOwned = owned.indexOf(id) !== -1;
        var isCurrent = (typeof currentRoom !== 'undefined') && currentRoom === id;
        var badge = isCurrent ? '<div class="room-current-badge">현재 적용 중</div>' : '';
        var price = isCurrent ? '' : (isOwned ? (isOld ? '보유 중 (이전 테마)' : '보유 중') : '🍔 ' + t.price.toLocaleString() + '코인');
        var btns = isCurrent ? '<span style="font-size:12px;color:#4ade80;font-weight:700;">✓ 적용됨</span>'
          : isOwned ? '<button class="shop-btn shop-btn-apply" onclick="applyRoom(\'' + id + '\')">적용</button>'
          : '<button class="shop-btn shop-btn-buy" onclick="buyRoom(\'' + id + '\')">구매</button>';
        html += '<div class="room-card' + (isCurrent ? ' current' : '') + '" id="roomcard-' + id + '">' +
          '<div class="room-card-img"><img src="' + t.img + '" onerror="this.parentElement.innerHTML=\'' + fallback + '\'"></div>' +
          '<div id="badge-' + id + '">' + badge + '</div>' +
          '<div class="room-card-body"><div><div class="room-card-name">' + t.name + '</div><div class="room-card-price" id="price-' + id + '">' + price + '</div></div>' +
          '<div id="btns-' + id + '">' + btns + '</div></div></div>';
      });
      sec.innerHTML = html;
    };
    window.renderRoomShop();
  }

  // 🛋️ 내 집의 '방 꾸미기' 버튼: 포카 레벨 3부터 열리고, 누르면 잡화점 '방' 탭(테마 판매)으로 간다.
  //    (가구샵 Lv10 잠금은 이 버튼 경로에서는 건너뜀 — 테마 사기만 Lv3부터 가능)
  function openThemeShop() {
    if (typeof closePlace === 'function') closePlace();
    var ov = document.getElementById('shop-overlay');
    if (ov) ov.classList.add('show');
    if (typeof switchShopTab === 'function') switchShopTab('room');
    var cd = document.getElementById('shop-coin-display');
    if (cd && typeof coins !== 'undefined') cd.textContent = coins;
    window.renderRoomShop();
  }
  function patchDecoButton() {
    var btn = document.getElementById('btn-room-deco');
    if (!btn || !btn.dataset.pocaPatched || btn.dataset.rtPatched) return;
    btn.dataset.rtPatched = '1';
    btn.onclick = function () {
      try {
        if (typeof isPocaHouseFeatureUnlocked === 'function' && !isPocaHouseFeatureUnlocked('roomDeco')) {
          if (typeof showPocaHouseLockedPopup === 'function') showPocaHouseLockedPopup(POCAHOUSE_UNLOCK.roomDeco, '방꾸미기');
          return;
        }
      } catch (e) {}
      openThemeShop();
    };
  }
  setInterval(patchDecoButton, 500);
  install();
})();
