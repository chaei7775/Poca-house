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
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BIG_CHANCE = 0.10, BIG_MUL = 3;   // ✨ 대성공: 이 확률로 나온 개수가 BIG_MUL 배
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
  function roll() {   // 한 번 돌리기: 기본 결과 + 10% 확률로 3배
    var p = pick();
    if (Math.random() < BIG_CHANCE) { var n = p.n * BIG_MUL; p = Object.assign({}, p, { n: n, big: true, txt: p.txt.replace(/×\d+/, '×' + n) + ' ✨' + BIG_MUL + '배!' }); }
    return p;
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


  // ── 🧪 가마솥 연출: 재료가 날아 들어감 → 부글부글 → 펑! 아이템이 튀어나옴 ──
  var FLY_MS = 650, FLY_GAP = 240, BOIL_MS = 1900, MAX_FLY = 7, MAX_OUT = 7;
  function iconHtml(name, emoji, px) {
    try { if (window.matIcon) { var h = window.matIcon(name, px, emoji); if (h) return h; } } catch (e) {}
    return '<span style="font-size:' + Math.round(px * 0.85) + 'px;line-height:1;">' + emoji + '</span>';
  }
  function outIcon(p, px) {
    if (p.kind === 'stone') return iconHtml('강화석', '🔨', px);
    if (p.kind === 'wish') return iconHtml('소원의 조각', '🧩', px);
    if (p.kind === 'protect') return iconHtml('방지권', '🛡️', px);
    return iconHtml(p.name, p.emoji, px);
  }
  function brew(ins, outs, rare, done) {
    var ov = document.createElement('div'); ov.id = 'mx-brew';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1400;background:radial-gradient(circle at 50% 70%,#2a1450,#07030f 70%);display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:\'Noto Sans KR\',sans-serif;color:#fff;touch-action:manipulation;';
    ov.innerHTML = '<style>' +
      '@keyframes mxFlame{0%,100%{transform:scaleY(1) scaleX(1)}50%{transform:scaleY(1.25) scaleX(.9)}}' +
      '@keyframes mxWob{0%,100%{transform:rotate(0)}25%{transform:rotate(-2.5deg)}75%{transform:rotate(2.5deg)}}' +
      '@keyframes mxLiq{0%{background-color:#7c3aed}33%{background-color:#22c55e}66%{background-color:#f59e0b}100%{background-color:#7c3aed}}' +
      '@keyframes mxBub{0%{transform:translateY(0) scale(.5);opacity:.9}100%{transform:translateY(-120px) scale(1.2);opacity:0}}' +
      '@keyframes mxPulse{0%,100%{opacity:.6}50%{opacity:1}}' +
      '@keyframes mxFlash{0%{opacity:.95}100%{opacity:0}}' +
      '</style>' +
      '<div id="mx-b-box" style="position:relative;width:320px;height:460px;">' +
        '<div id="mx-b-pot" style="position:absolute;left:30px;top:110px;width:260px;height:340px;transform-origin:50% 60%;">' +
          '<img src="' + IMG_BASE + 'cauldron-fire.png" alt="" decoding="async" style="position:absolute;left:65px;top:175px;width:130px;transform-origin:50% 100%;animation:mxFlame .45s ease-in-out infinite;z-index:1;">' +
          '<img src="' + IMG_BASE + 'cauldron-pot.png" alt="" decoding="async" style="position:absolute;left:10px;top:10px;width:240px;z-index:2;">' +
          '<div id="mx-b-liq" style="position:absolute;left:66px;top:32px;width:128px;height:28px;border-radius:50%;z-index:3;background:radial-gradient(ellipse,rgba(255,255,255,.55),transparent 55%),#7c3aed;animation:mxLiq 1.6s linear infinite;box-shadow:0 0 14px rgba(167,139,250,.8);"></div></div>' +
        '<div id="mx-b-say" style="position:absolute;left:0;right:0;top:6px;text-align:center;font-size:17px;font-weight:900;color:#ffe08a;text-shadow:0 2px 8px #000;">재료를 넣는 중…</div>' +
      '</div>' +
      '<button id="mx-b-skip" style="position:absolute;top:14px;right:14px;border:none;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:900;font-family:inherit;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;">건너뛰기</button>';
    document.body.appendChild(ov);
    var box = ov.querySelector('#mx-b-box'), pot = ov.querySelector('#mx-b-pot'), say = ov.querySelector('#mx-b-say'), timers = [], finished = false;
    var PX = 160, PY = 158;   // 가마솥 입구 중심 (box 기준)
    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function sfx(n) { try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play(n); } catch (e) {} }
    function finish() {
      if (finished) return; finished = true; timers.forEach(clearTimeout);
      ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(function () { ov.remove(); done(); }, 260);
    }
    ov.querySelector('#mx-b-skip').onclick = finish;
    // ① 재료가 날아 들어옴
    var list = []; ins.forEach(function (x) { var n = Math.min(x.n, 3); for (var i = 0; i < n; i++) list.push(x); });
    while (list.length > MAX_FLY) list.splice(Math.floor(Math.random() * list.length), 1);
    list.forEach(function (x, i) {
      T(function () {
        var el = document.createElement('div'), sx = 30 + Math.random() * 260, sy = 30 + Math.random() * 40;
        el.style.cssText = 'position:absolute;left:' + (sx - 20) + 'px;top:' + sy + 'px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;pointer-events:none;';
        el.innerHTML = iconHtml(x.name, x.emoji, 38); box.appendChild(el);
        var a = el.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: 'translate(' + (PX - sx) * 0.55 + 'px,' + (PY - sy - 70) + 'px) scale(1.1) rotate(160deg)', opacity: 1, offset: 0.55 }, { transform: 'translate(' + (PX - sx) + 'px,' + (PY - sy - 8) + 'px) scale(.3) rotate(320deg)', opacity: .2 }], { duration: FLY_MS, easing: 'ease-in' });
        a.onfinish = function () { el.remove(); pot.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.04,.95)' }, { transform: 'scale(1,1)' }], { duration: 180 }); sfx('pop'); };
      }, i * FLY_GAP);
    });
    var t1 = list.length * FLY_GAP + FLY_MS + 150;
    // ② 부글부글
    T(function () {
      say.textContent = '부글부글… 🫧'; say.style.animation = 'mxPulse .5s ease-in-out infinite'; pot.style.animation = 'mxWob .22s ease-in-out infinite';
      var b = setInterval(function () {
        if (finished) { clearInterval(b); return; }
        var d = document.createElement('div'), sz = 8 + Math.random() * 16;
        d.style.cssText = 'position:absolute;left:' + (PX - 62 + Math.random() * 124 - sz / 2) + 'px;top:' + (PY - 6) + 'px;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:rgba(255,255,255,.55);border:1.5px solid rgba(255,255,255,.8);pointer-events:none;animation:mxBub ' + (0.8 + Math.random() * 0.6) + 's ease-out forwards;';
        box.appendChild(d); setTimeout(function () { d.remove(); }, 1500);
      }, 70);
      T(function () { clearInterval(b); }, BOIL_MS);
    }, t1);
    // ③ 펑! 아이템이 튀어나옴
    T(function () {
      pot.style.animation = ''; say.style.animation = ''; say.textContent = outs.some(function (p) { return p.big; }) ? '✨ 3배 대성공!' : rare ? '🎉 대박이 나왔어요!' : '완성!'; sfx(rare ? 'levelup' : 'reward');
      var fl = document.createElement('div'); fl.style.cssText = 'position:absolute;inset:0;background:' + (rare ? 'radial-gradient(circle,#fff6c2,#ffd24a 50%,transparent 80%)' : 'radial-gradient(circle,#fff,transparent 70%)') + ';pointer-events:none;animation:mxFlash .6s ease-out forwards;';
      ov.appendChild(fl); setTimeout(function () { fl.remove(); }, 650);
      var seen = {}, uniq = []; outs.forEach(function (p) { if (!seen[p.txt]) { seen[p.txt] = 1; uniq.push(p); } });
      uniq = uniq.slice(0, MAX_OUT);
      uniq.forEach(function (p, i) {
        var ang = (-160 + (140 * (uniq.length === 1 ? 0.5 : i / (uniq.length - 1)))) * Math.PI / 180, R = 95 + (i % 2) * 22;
        var el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:' + (PX - 26) + 'px;top:' + (PY - 40) + 'px;width:52px;height:52px;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 0 10px ' + (RARE[p.w] || p.big ? '#ffe27a' : '#fff') + ');';
        el.innerHTML = outIcon(p, 48); box.appendChild(el);
        var dx = Math.cos(ang) * R, dy = Math.sin(ang) * R - 40;
        var a = el.animate([{ transform: 'translate(0,0) scale(.2)', opacity: 0 }, { transform: 'translate(' + dx + 'px,' + (dy - 26) + 'px) scale(1.25)', opacity: 1, offset: .55 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'forwards', delay: i * 70 });
      });
      T(finish, 1500 + uniq.length * 70);
    }, t1 + BOIL_MS + 200);
  }

  var preDone = false;
  function open() {
    if (!preDone) { preDone = true; try { new Image().src = IMG_BASE + 'cauldron-pot.png'; setTimeout(function () { new Image().src = IMG_BASE + 'cauldron-fire.png'; }, 300); } catch (e) {} }
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
        '<div style="font-size:10.5px;color:#9a8cc0;line-height:1.7;margin-top:16px;">나올 수 있는 것: ' + info + '<br>✨ 돌릴 때마다 ' + Math.round(BIG_CHANCE * 100) + '% 확률로 개수가 ' + BIG_MUL + '배!<br>한 번에 최대 ' + MAX_ROLLS + '번까지 돌려요.</div></div>';
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
      var ins = []; INPUTS.forEach(function (x) { if (sel[x[0]] > 0) { ins.push({ name: x[0], emoji: x[1], n: sel[x[0]] }); try { useFromBag(x[0], sel[x[0]]); } catch (e) {} } });
      var res = []; for (var i = 0; i < t / COST; i++) res.push(roll());
      var lost = give(res);
      var cnt = {}, order = [];
      res.forEach(function (p) { if (!cnt[p.txt]) { cnt[p.txt] = 0; order.push(p); } cnt[p.txt]++; });
      var rare = res.some(function (p) { return RARE[p.w] || p.big; });
      INPUTS.forEach(function (x) { sel[x[0]] = 0; });
      var html = '<div style="margin-top:14px;background:rgba(255,215,0,.12);border:1.5px solid ' + (rare ? '#ffe27a' : 'rgba(255,215,0,.5)') + ';border-radius:16px;padding:12px 14px;">' +
        '<div style="font-size:13px;font-weight:900;margin-bottom:6px;">' + (rare ? '🎉 대박! ' : '🎁 ') + res.length + '번 돌린 결과</div>' +
        order.map(function (p) { return '<div style="font-size:13.5px;line-height:1.8;' + (RARE[p.w] || p.big ? 'color:#ffe27a;font-weight:900;' : '') + '">' + esc(p.txt) + (cnt[p.txt] > 1 ? ' <b>× ' + cnt[p.txt] + '번</b>' : '') + '</div>'; }).join('') +
        (lost.length ? '<div style="font-size:11px;color:#ff9aa8;margin-top:6px;">가방이 가득 차서 못 받은 것: ' + esc(lost.join(', ')) + '</div>' : '') + '</div>';
      render();   // 아래 화면은 가마솥 연출 동안 새 재료 수로 갱신해 두고, 연출이 끝나면 결과 표시
      brew(ins, res, rare, function () { render(html); });
    }
    render();
  }
  window.openMaterialExchange = open;
  window.__materialExchange = { open: open, POOL: POOL, pick: pick, roll: roll, COST: COST };

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
