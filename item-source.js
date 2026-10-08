// ════════════════════════════════════════════════════════════
// 📍 가방 아이템 획득처 (item-source.js)
// 가방에서 아이템을 눌러 상세창이 뜨면 "📍 어디서 얻나요?" 줄을 붙여준다.
// 맵 재료는 mat-where.js 가 자동 계산하고, 나머지는 아래 SOURCES 표에 적힌 대로 보여준다.
// ✏️ 새 아이템 획득처를 추가하려면 SOURCES 에 '아이템 이름': '획득처' 한 줄만 넣으면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var SOURCES = {
    '사과주스': '상점 > 음료', '딸기스무디': '상점 > 음료', '에너지드링크': '상점 > 음료',
    '작은 회복약': '더보기 > 💖 팬 스킬 상점', '큰 회복약': '더보기 > 💖 팬 스킬 상점', '피로회복 드링크': '더보기 > 💖 팬 스킬 상점',
    '재조합석': '탐험 중 가끔 · 🎧 음악방송 리허설장 · 🏟️ 월드투어 스타디움',
    '에픽 재조합석': '신비의 섬 탐험 (아주 가끔) · 🏟️ 월드투어 스타디움',
    '공방의 원석': '탐험 맵 어디서나 (가끔) · 🕵️ 파파라치 탈출 · 🏟️ 월드투어 스타디움',
    '프리미엄 조각': '방송국 앞 (대만족 보너스) · 🏟️ 월드투어 스타디움',
    '필름': '공연장 · 🎧 음악방송 리허설장',
    '현상액': '🕵️ 파파라치 탈출'
  };
  var COMPOSE = '🎧 음악방송 리허설장 · 작곡 스튜디오 탐험';

  function where(name) {
    var it = null;
    try { it = bagItems.filter(function (b) { return b.name === name; })[0] || null; } catch (e) {}
    if (SOURCES[name]) return SOURCES[name];
    try { if (window.STUDIO_KINDS && window.STUDIO_KINDS.some(function (k) { return k.name === name; })) return COMPOSE; } catch (e) {}
    try { var w = window.matWhere && window.matWhere(name); if (w) return w; } catch (e) {}
    if (it && it.type === 'gift') return '상점 > 선물';
    if (it && it.type === 'drink') return '상점 > 음료';
    return '';
  }

  function decorate(ov) {
    if (!ov || ov.getAttribute('data-src')) return;
    var box = ov.firstElementChild;
    if (!box || box.children.length < 3) return;
    var name = (box.children[1].textContent || '').trim();
    ov.setAttribute('data-src', '1');
    var w = where(name);
    if (!w) return;
    var d = document.createElement('div');
    d.style.cssText = 'font-size:12px;color:#8fd3ff;font-weight:700;margin:2px 0 8px;line-height:1.5;';
    d.textContent = '📍 획득처: ' + w;
    box.children[2].insertAdjacentElement('afterend', d);
  }

  new MutationObserver(function (list) {
    list.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.id === 'bag-detail-overlay') decorate(n); });
    });
  }).observe(document.body, { childList: true });
})();
