// ════════════════════════════════════════════════════════════
// 🎰 재료 교환소 (material-exchange.js) — 남는 재료 3개를 넣고 돌리면 다른 재료가 랜덤으로 나와요
//  · 넣을 수 있는 재료: 공방의 원석 · 필름 · 현상액 · 재조합석 (가방에 있는 것만, 3개 단위)
//  · 나오는 것: 🔨 강화석(제일 흔함) · 🔹 재조합석 · 🔶 공방의 원석 · 🎞️ 필름 · 🧪 현상액 · 🧩 소원의 조각 · 🛡️ 방지권 · 💠 에픽 재조합석(아주 드묾)
//  · 평균적으로는 넣은 것보다 약간 손해 → 유저 거래가 생겨도 시세가 무너지지 않게 (비율은 아래 [설정]에서)
//  · 더보기 메뉴에 "재료 교환소" 칸이 생겨요
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var COST = 3;   // 한 번 돌릴 때 넣는 재료 개수
  var INPUTS = [   // 넣을 수 있는 재료 [이름, 이모지]
    ['공방의 원석', '🔶'], ['필름', '🎞️'], ['현상액', '🧪'], ['재조합석', '🔹']
  ];
  // 나오는 것: w = 확률 가중치 / kind = item | stone | wish | protect
  var POOL = [
    { w: 30, kind: 'stone', n: 1, txt: '🔨 강화석 ×1' },
    { w: 10, kind: 'stone', n: 2, txt: '🔨 강화석 ×2' },
    { w: 17, kind: 'item', n: 1, name: '재조합석', emoji: '🔹', cat: 'material', desc: '카드 재조합에 필요한 재료', txt: '🔹 재조합석 ×1' },
    { w: 14, kind: 'item', n: 2, name: '공방의 원석', emoji: '🔶', cat: 'material', desc: '굿즈 공방 제작 재료 · 탐험·원정에서 나와요', txt: '🔶 공방의 원석 ×2' },
    { w: 9, kind: 'item', n: 2, name: '필름', emoji: '🎞️', cat: 'film', desc: '시크릿 포토랩 현상 재료', txt: '🎞️ 필름 ×2' },
    { w: 7, kind: 'item', n: 2, name: '현상액', emoji: '🧪', cat: 'film', desc: '포토랩 옵션 강화 재료', txt: '🧪 현상액 ×2' },
    { w: 7, kind: 'wish', n: 1, txt: '🧩 소원의 조각 ×1' },
    { w: 4, kind: 'protect', n: 1, txt: '🛡️ 방지권 ×1' },
    { w: 2, kind: 'item', n: 1, name: '에픽 재조합석', emoji: '💠', cat: 'material', desc: 'SSR/UR 카드 재조합에 필요한 재료', txt: '💠 에픽 재조합석 ×1' }
  ];
  var RARE = { 4: 1, 2: 1 };   // 이 가중치(방지권·에픽)는 '대박' 연출
  var MAX_ROLLS = 20;   // 한 번에 최대 몇 번 돌릴 수 있는지

  function $(id) { return document.getElementById(id); }
  function toast(m) { try { showBagToast(m); } catch (e) {} }
  function have(name) { try { var it = bagItems.find(function (i) { return i.name === name; }); return it ? it.qty : 0; } catch (e) { return 0; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick() {
    var t = 0; POOL.forEach(function (p) { t += p.w; });
    var r = Math.random() * t;
    for (var i = 0; i < POOL.length; i++) { if (r < POOL[i].w) return POOL[i]; r -= POOL[i].w; }
    return POOL[0];
  }
  function give(res) {   // 결과 지급 (돌린 결과 목록)
    var stone = 0, protect = 0, wish = 0, items = {};
    res.forEach(function (p) {
      if (p.kind === 'stone') stone += p.n; else if (p.kind === 'protect') protect += p.n; else if (p.kind === 'wish') wish += p.n;
      else items[p.name] = { p: p, n: (items[p.name] ? items[p.name].n : 0) + p.n };
    });
    var lost = [];
    Object.keys(items).forEach(function (k) {
      var x = items[k]; try { if (!addToBag(x.p.emoji, x.p.name, x.p.cat, x.n, x.p.desc)) lost.push(x.p.txt); } catch (e) {}
    });
    if (stone || protect) {
      var e = {}; try { e = JSON.parse(localStorage.getItem('ph_enhance') || '{}') || {}; } catch (x) {}
      e.stone = Math.floor(Number(e.stone) || 0) + stone; e.protect = Math.floor(Number(e.protect) || 0) + protect;
      try { localStorage.setItem('ph_enhance', JSON.stringify(e)); } catch (x) {}
    }
    if (wish) { try { wishFragments = Math.floor(Number(wishFragments) || 0) + wish; localStorage.setItem('ph_wish', wishFragments); } catch (e) {} }
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return lost;
  }

  function open() {
    var old = $('mx-ov'); if (old) old.remove();
    var sel = {};   // 넣을 재료 개수
    INPUTS.forEach(function (x) { sel[x[0]] = 0; });
    var ov = document.createElement('div'); ov.id = 'mx-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1200;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);overflow-y:auto;-webkit-overflow-scrolling:touch;color:#fff;font-family:\'Noto Sans KR\',sans-serif;';
    document.body.appendChild(ov);

    function total() { var t = 0; Object.keys(sel).forEach(function (k) { t += sel[k]; }); return t; }
    function render(resultHtml) {
      var t = total(), rolls = Math.floor(t / COST);
      var rows = INPUTS.map(function (x) {
        var h = have(x[0]), s = sel[x[0]];
        return '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border-radius:13px;padding:10px 12px;margin-bottom:8px;">' +
          '<div style="font-size:26px;width:34px;text-align:center;">' + x[1] + '</div>' +
          '<div style="flex:1;"><div style="font-size:14px;font-weight:900;">' + esc(x[0]) + '</div><div style="font-size:11px;color:#c9b8e8;">가방 ' + h + '개</div></div>' +
          '<button data-m="' + esc(x[0]) + '" data-d="-1" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:18px;font-weight:900;cursor:pointer;">−</button>' +
          '<div style="min-width:26px;text-align:center;font-size:16px;font-weight:900;">' + s + '</div>' +
          '<button data-m="' + esc(x[0]) + '" data-d="1" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,215,0,.25);color:#fff;font-size:18px;font-weight:900;cursor:pointer;">＋</button></div>';
      }).join('');
      var pool = POOL.reduce(function (a, p) { return a + p.w; }, 0);
      var info = POOL.map(function (p) { return p.txt + ' ' + Math.round(p.w / pool * 100) + '%'; }).join(' · ');
      ov.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px;"><div style="font-size:18px;font-weight:900;">🎰 재료 교환소</div>' +
        '<button id="mx-x" aria-label="닫기" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:17px;font-weight:900;cursor:pointer;">✕</button></div>' +
        '<div style="padding:0 16px 80px;">' +
        '<div style="font-size:12px;color:#c9b8e8;line-height:1.6;margin-bottom:12px;">남는 재료를 <b style="color:#ffe08a;">' + COST + '개</b> 넣고 돌리면 다른 재료가 <b style="color:#ffe08a;">랜덤</b>으로 나와요. 뭐가 나올지는 돌려 봐야 알아요!</div>' +
        rows +
        '<div style="text-align:center;font-size:13px;margin:10px 0;color:#ffe08a;font-weight:900;">넣은 재료 ' + t + '개 → ' + rolls + '번 돌리기' + (t % COST ? ' <span style="color:#ff9aa8;">(' + COST + '개 단위로 맞춰요)</span>' : '') + '</div>' +
        '<div style="display:flex;gap:8px;"><button id="mx-auto" style="flex:1;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:900;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-family:inherit;">가진 만큼 넣기</button>' +
        '<button id="mx-go" style="flex:2;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:900;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#2a1a00;cursor:pointer;font-family:inherit;' + (rolls > 0 && t % COST === 0 ? '' : 'opacity:.4;') + '">🎰 돌리기</button></div>' +
        (resultHtml || '') +
        '<div style="font-size:10.5px;color:#9a8cc0;line-height:1.7;margin-top:16px;">나올 수 있는 것: ' + info + '<br>한 번에 최대 ' + MAX_ROLLS + '번까지 돌려요.</div></div>';
      $('mx-x').onclick = function () { ov.remove(); };
      ov.querySelectorAll('[data-m]').forEach(function (b) {
        b.onclick = function () {
          var m = b.getAttribute('data-m'), d = +b.getAttribute('data-d');
          var next = Math.max(0, Math.min(have(m), sel[m] + d));
          if (d > 0 && total() + 1 > MAX_ROLLS * COST) return;
          sel[m] = next; render();
        };
      });
      $('mx-auto').onclick = function () {   // 3개 단위로 가진 만큼 (위에서부터)
        var room = MAX_ROLLS * COST; INPUTS.forEach(function (x) { sel[x[0]] = 0; });
        INPUTS.forEach(function (x) { var n = Math.min(have(x[0]), room); sel[x[0]] = n; room -= n; });
        var extra = total() % COST; for (var i = INPUTS.length - 1; i >= 0 && extra > 0; i--) { var c = Math.min(sel[INPUTS[i][0]], extra); sel[INPUTS[i][0]] -= c; extra -= c; }
        render();
      };
      $('mx-go').onclick = go;
    }
    function go() {
      var t = total(); if (t <= 0 || t % COST) { toast('재료를 ' + COST + '개 단위로 넣어주세요'); return; }
      var ok = true; INPUTS.forEach(function (x) { if (sel[x[0]] > have(x[0])) ok = false; });
      if (!ok) { toast('재료가 모자라요'); render(); return; }
      INPUTS.forEach(function (x) { if (sel[x[0]] > 0) { try { useFromBag(x[0], sel[x[0]]); } catch (e) {} } });
      var res = []; for (var i = 0; i < t / COST; i++) res.push(pick());
      var lost = give(res);
      var cnt = {}, order = [];
      res.forEach(function (p) { if (!cnt[p.txt]) { cnt[p.txt] = 0; order.push(p); } cnt[p.txt]++; });
      var rare = res.some(function (p) { return RARE[p.w]; });
      try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play(rare ? 'levelup' : 'reward'); } catch (e) {}
      INPUTS.forEach(function (x) { sel[x[0]] = 0; });
      var html = '<div style="margin-top:14px;background:rgba(255,215,0,.12);border:1.5px solid ' + (rare ? '#ffe27a' : 'rgba(255,215,0,.5)') + ';border-radius:16px;padding:12px 14px;">' +
        '<div style="font-size:13px;font-weight:900;margin-bottom:6px;">' + (rare ? '🎉 대박! ' : '🎁 ') + res.length + '번 돌린 결과</div>' +
        order.map(function (p) { return '<div style="font-size:13.5px;line-height:1.8;' + (RARE[p.w] ? 'color:#ffe27a;font-weight:900;' : '') + '">' + esc(p.txt) + (cnt[p.txt] > 1 ? ' <b>× ' + cnt[p.txt] + '번</b>' : '') + '</div>'; }).join('') +
        (lost.length ? '<div style="font-size:11px;color:#ff9aa8;margin-top:6px;">가방이 가득 차서 못 받은 것: ' + esc(lost.join(', ')) + '</div>' : '') + '</div>';
      render(html);
    }
    render();
  }
  window.openMaterialExchange = open;
  window.__materialExchange = { open: open, POOL: POOL, pick: pick, COST: COST };

  // ── 더보기 메뉴 칸 ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu; if (orig.__mxWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-mx-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🎰', '재료 교환소', '#f59e0b', 'openMaterialExchange()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-mx-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__mxWrapped = true; window.openMoreMenu = w;
  });
})();
