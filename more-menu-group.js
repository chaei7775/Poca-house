// ════════════════════════════════════════════════════════════
// 🗂️ 더보기 메뉴 카테고리 정리 (more-menu-group.js)
// 더보기에 칸이 20개 넘게 쌓여서 찾기 어려웠음 → 맨 위에 카테고리 아이콘만 두고, 누르면 그 묶음의 메뉴만 아래에 보여준다.
//  · 칸은 여러 파일이 따로 붙이므로, 다 붙은 뒤(바뀔 때마다) 글자를 보고 카테고리를 정한다. 칸의 기능·잠금은 그대로.
//  · 더보기를 열면 아이콘 6개만 보이고, 아이콘을 누르면 그 묶음의 작은 메뉴가 아래에 펼쳐진다 (다시 누르면 접힘). 새로 열린 메뉴가 있는 카테고리 아이콘엔 빨간 점이 뜬다.
// ✏️ 고치는 법: GROUPS 의 [이름, 그림, 색, [칸 이름 정규식…]] 만 고치면 됨. 어디에도 안 맞는 칸은 '기타' 카테고리로 감.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var GROUPS = [
    ['카드 · 수집', 'cards', '#A78BFA', [/내 컬렉션/, /히든카드 도감/, /^칭호/, /해프닝 카드/, /프리미엄 카드/, /히든 효과/]],
    ['육성 · 활동', 'training', '#F472B6', [/트레이닝룸/, /팬 스킬 상점/, /카드 재조합기/, /스케줄 (관리|·)/, /로드 매니저/, /의상실/, /^그룹/]],
    ['음악', 'music', '#60A5FA', [/작곡/, /음원차트/]],
    ['상점 · 거래', 'shop', '#6EE7B7', [/잡화점/, /거래소/]],
    ['소통', 'chat', '#FDA48A', [/^친구/, /게시판/, /팬클럽/, /우편함/]],
    ['계정', 'account', '#B4BCD0', [/^계정/]]
  ];
  var ETC = ['기타', null, '#FBBF24'];
  var K_LAST = 'ph_moreCat', K_SEEN = 'ph_moreSeen';

  function jget(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function label(btn) {
    return String(btn.textContent || '').replace(/🔒\s*Lv\.\d+/g, '').replace(/[^\u0000-\u007F가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function isLocked(btn) {   // 잠금 글자는 늦게 붙으니, 레벨표로 직접 판단 (없으면 글자로)
    try {
      var g = window.__unlockGate;
      if (g && typeof g.ruleFor === 'function') { var r = g.ruleFor(label(btn)); return !!(r && r.lv > Number(playerLevel)); }
    } catch (e) {}
    return /🔒\s*Lv\./.test(btn.textContent || '');
  }

  var busy = false, obs = null, sel = null;

  function categorize(tiles) {
    var cats = GROUPS.map(function (g) { return { g: g, tiles: [] }; }), etc = [], used = new Array(tiles.length);
    GROUPS.forEach(function (g, gi) {
      g[3].forEach(function (re) {
        tiles.forEach(function (t, i) { if (!used[i] && re.test(label(t))) { used[i] = true; cats[gi].tiles.push(t); } });
      });
    });
    tiles.forEach(function (t, i) { if (!used[i]) etc.push(t); });
    if (etc.length) cats[1].tiles = cats[1].tiles.concat(etc);   // 어디에도 안 맞는 칸은 '육성 · 활동'에 합침 (아이콘은 6개만 유지)
    return cats.filter(function (c) { return c.tiles.length; });
  }

  function catBtn(c, on, dot) {
    var b = document.createElement('button');
    b.className = 'mm-cat'; b.type = 'button';
    var col = c.g[2];
    b.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px 7px;border-radius:16px;cursor:pointer;font-family:inherit;' +
      'background:' + col + (on ? '40' : '1f') + ';border:2px solid ' + (on ? col : col + '55') + ';' + (on ? 'box-shadow:0 0 14px ' + col + '66;' : '');
    var img = c.g[1] ? '<img src="mm-' + c.g[1] + '.webp" alt="" loading="lazy" decoding="async" style="width:60px;height:60px;object-fit:contain;display:block;pointer-events:none;">' : '<div style="width:60px;height:60px;font-size:34px;line-height:60px;">✨</div>';
    b.innerHTML = img + '<span style="font-size:13px;font-weight:900;color:#fff;">' + c.g[0] + '</span>' +
      (dot ? '<span style="position:absolute;top:6px;right:8px;width:12px;height:12px;border-radius:50%;background:#ff3b5c;border:2px solid #1a1a2e;"></span>' : '');
    return b;
  }

  function regroup(grid) {
    if (busy || !grid) return;
    var tiles = [].slice.call(grid.children).filter(function (e) { return !e.classList.contains('mm-bar') && !e.classList.contains('mm-h'); });
    if (!tiles.length) return;
    busy = true;
    if (obs) obs.disconnect();
    try {
      var cats = categorize(tiles);
      var seenRec = jget(K_SEEN, null), firstTime = !seenRec, seen = seenRec || {};
      var names = cats.map(function (c) { return c.g[0]; });
      if (sel && names.indexOf(sel) < 0) sel = null;   // 처음 열면 아무것도 안 눌린 상태 (아이콘 6개만 보임)
      // 새로 열린 메뉴(잠금이 풀렸는데 아직 안 본 것) 표시
      function fresh(c) { return c.tiles.some(function (t) { return !isLocked(t) && !seen[label(t)]; }); }
      if (firstTime) { cats.forEach(function (c) { c.tiles.forEach(function (t) { if (!isLocked(t)) seen[label(t)] = 1; }); }); jset(K_SEEN, seen); }

      // 카테고리 줄 (그리드 맨 앞)
      [].slice.call(grid.querySelectorAll('.mm-bar')).forEach(function (e) { e.remove(); });
      var bar = document.createElement('div');
      bar.className = 'mm-bar';
      bar.style.cssText = 'grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px;';
      cats.forEach(function (c) {
        var on = c.g[0] === sel;
        var b = catBtn(c, on, !on && !firstTime && fresh(c));
        b.onclick = function (ev) { ev.stopPropagation(); sel = (sel === c.g[0]) ? null : c.g[0]; regroup(grid); };
        bar.appendChild(b);
      });
      grid.insertBefore(bar, grid.firstChild);

      // 칸 순서를 카테고리 안 정해진 순서대로 맞춤
      cats.forEach(function (c) { c.tiles.forEach(function (t) { grid.appendChild(t); }); });
      // 고른 카테고리의 칸만 보이게 (칸은 그대로 두고 숨김만)
      cats.forEach(function (c) {
        var on = c.g[0] === sel;
        c.tiles.forEach(function (t) { if (t.__d === undefined) t.__d = (t.style.display === 'none' ? '' : t.style.display); t.style.display = on ? t.__d : 'none'; });   // 원래 display(flex 등)를 기억했다가 되돌림
        if (on) c.tiles.forEach(function (t) { if (!isLocked(t)) seen[label(t)] = 1; });
      });
      jset(K_SEEN, seen);
      // 고른 카테고리 안내 줄
      var old = grid.querySelector('.mm-h'); if (old) old.remove();
      var cur = cats.filter(function (c) { return c.g[0] === sel; })[0];
      if (cur) {
        var h = document.createElement('div'); h.className = 'mm-h';
        h.style.cssText = 'grid-column:1/-1;color:' + cur.g[2] + ';font-size:14px;font-weight:900;margin:4px 2px 0;';
        h.textContent = cur.g[0];
        grid.insertBefore(h, bar.nextSibling);
      }
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
        sel = null;
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
