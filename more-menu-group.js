// ════════════════════════════════════════════════════════════
// 🗂️ 더보기 메뉴 묶음 정리 (more-menu-group.js)
// 더보기에 칸이 20개 넘게 쌓여서 어디에 뭐가 있는지 찾기 어려웠음 → 종류별 제목을 붙여서 묶어 보여줌.
// 칸은 여러 파일이 따로 붙이므로, 다 붙은 뒤(바뀔 때마다) 글자를 보고 묶음 칸으로 옮긴다. 칸의 기능·잠금은 그대로.
// ✏️ 고치는 법: 아래 GROUPS 의 [제목, [칸 이름 정규식…]] 만 고치면 됨. 어디에도 안 맞는 칸은 맨 아래 '기타'로 감.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var GROUPS = [
    ['🎴 카드 · 수집', [/내 컬렉션/, /히든카드 도감/, /^칭호/, /해프닝 카드/, /프리미엄 카드/, /히든 효과/]],
    ['🎤 육성 · 활동', [/트레이닝룸/, /팬 스킬 상점/, /카드 재조합기/, /스케줄 (관리|·)/, /로드 매니저/, /의상실/, /^그룹/]],
    ['🎵 음악', [/작곡/, /음원차트/]],
    ['🛍️ 상점 · 거래', [/잡화점/, /거래소/]],
    ['💬 소통', [/^친구/, /게시판/, /팬클럽/, /우편함/]],
    ['⚙️ 계정', [/^계정/]]
  ];
  var ETC = '✨ 기타';

  function label(btn) {
    return String(btn.textContent || '').replace(/🔒\s*Lv\.\d+/g, '').replace(/[^\u0000-\u007F가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function headerEl(text) {
    var h = document.createElement('div');
    h.className = 'mm-h';
    h.textContent = text;
    h.style.cssText = 'grid-column:1/-1;color:#c9b8ff;font-size:12px;font-weight:900;margin:10px 2px 0;letter-spacing:.2px;';
    return h;
  }

  var busy = false, obs = null;
  function regroup(grid) {
    if (busy || !grid) return;
    var tiles = [].slice.call(grid.children).filter(function (e) { return !e.classList.contains('mm-h'); });
    if (!tiles.length) return;
    busy = true;
    if (obs) obs.disconnect();
    try {
      var buckets = GROUPS.map(function () { return []; }), etc = [], used = new Array(tiles.length);
      GROUPS.forEach(function (g, gi) {
        g[1].forEach(function (re) {
          tiles.forEach(function (t, i) { if (!used[i] && re.test(label(t))) { used[i] = true; buckets[gi].push(t); } });
        });
      });
      tiles.forEach(function (t, i) { if (!used[i]) etc.push(t); });
      [].slice.call(grid.querySelectorAll('.mm-h')).forEach(function (h) { h.remove(); });
      var frag = document.createDocumentFragment(), first = true;
      GROUPS.forEach(function (g, gi) {
        if (!buckets[gi].length) return;
        var h = headerEl(g[0]); if (first) { h.style.marginTop = '0'; first = false; }
        frag.appendChild(h); buckets[gi].forEach(function (t) { frag.appendChild(t); });
      });
      if (etc.length) { var he = headerEl(ETC); if (first) he.style.marginTop = '0'; frag.appendChild(he); etc.forEach(function (t) { frag.appendChild(t); }); }
      grid.appendChild(frag);
    } catch (e) { try { console.error('[more-menu-group]', e); } catch (x) {} }
    busy = false;
    watch(grid);
  }
  var timer = null;
  function watch(grid) {
    if (!obs) obs = new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(function () { regroup(grid); }, 60); });
    obs.observe(grid, { childList: true });
  }

  function install() {
    if (typeof window.openMoreMenu !== 'function' || window.openMoreMenu.__grouped) return false;
    var orig = window.openMoreMenu;
    var w = function () {
      var r = orig.apply(this, arguments);
      try {
        if (obs) { obs.disconnect(); obs = null; }
        var grid = document.getElementById('more-menu-grid');
        if (grid) { regroup(grid); setTimeout(function () { regroup(grid); }, 400); setTimeout(function () { regroup(grid); }, 1500); }
      } catch (e) {}
      return r;
    };
    w.__grouped = true;
    window.openMoreMenu = w;
    return true;
  }
  if (!install()) { var n = 0, iv = setInterval(function () { if (install() || ++n > 40) clearInterval(iv); }, 500); }
  window.__moreGroupTest = { GROUPS: GROUPS };
})();
