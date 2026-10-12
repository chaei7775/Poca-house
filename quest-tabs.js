// ════════════════════════════════
// 📋 퀘스트 탭 정리 (quest-tabs.js) — [메인] [서브] 두 탭으로 나눠서 보여줌
//  · 메인: 월드스타 로드맵(멤버별 8단계) + 길잡이 + 스토리 + 튜토리얼/메인 퀘스트 + 연대기
//  · 서브: 이번 주 테마 + 커리어 보상 + 일일퀘스트 + 서브 퀘스트
//  · 다른 파일들이 퀘스트 목록에 붙이는 카드는 그대로 두고, 어느 탭에 보일지만 표시해서 숨김/보임
// 저장: localStorage 'ph_qtab' (마지막으로 본 탭), 'ph_qroad' (로드맵으로 보는 멤버)
// 되돌리려면 loader.js 에서 'quest-tabs.js' 한 줄만 지우면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var ACC = '#fbbf24';
  var css =
    '#quest-list[data-tab="main"]>[data-qt="sub"]{display:none !important;}' +
    '#quest-list[data-tab="sub"]>[data-qt="main"]{display:none !important;}' +
    '#qt-tabs{display:flex;gap:8px;margin:0 0 12px;position:sticky;top:0;z-index:5;padding:6px 0;background:linear-gradient(180deg,#1a1a2e 70%,transparent);}' +
    '#qt-tabs button{flex:1;position:relative;border:none;border-radius:14px;padding:11px 0;font-size:14px;font-weight:900;font-family:"Noto Sans KR",sans-serif;background:rgba(255,255,255,.1);color:#cbbcf0;}' +
    '#qt-tabs button.on{background:linear-gradient(135deg,#C084FC,#FF6B9D);color:#fff;box-shadow:0 3px 12px rgba(192,132,252,.45);}' +
    '#qt-tabs .d{position:absolute;top:5px;right:22%;width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 2px #2d1b4e;}' +
    '.qt-card{background:rgba(255,255,255,.08);border:1.5px solid rgba(251,191,36,.45);border-radius:16px;padding:12px 14px;margin:0 0 12px;color:#fff;font-family:"Noto Sans KR",sans-serif;}' +
    '.qt-h{font-size:14px;font-weight:900;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}' +
    '.qt-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}' +
    '.qt-chips span{font-size:11px;font-weight:900;padding:4px 9px;border-radius:12px;background:rgba(255,255,255,.12);color:#d9ccff;}' +
    '.qt-chips span.on{background:' + ACC + ';color:#4a2a00;}' +
    '.qt-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08);font-size:12px;}' +
    '.qt-row .t{flex:1;min-width:0;}.qt-row .n{font-weight:900;font-size:12.5px;}.qt-row .s{color:#c9bbee;font-size:11px;line-height:1.35;}' +
    '.qt-row.done .n{color:#7dffa8;}' +
    '.qt-go{border:none;border-radius:10px;padding:8px 12px;font-weight:900;font-size:12px;font-family:inherit;background:linear-gradient(135deg,#ffd45e,#ff9d3d);color:#4a2a00;}' +
    '.qt-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:4px;}.qt-bar>div{height:100%;background:linear-gradient(90deg,#a78bfa,' + ACC + ');}';
  var st = document.createElement('style'); st.id = 'qt-style'; st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var tab = get('ph_qtab', 'main') === 'sub' ? 'sub' : 'main';

  function ws() { return window.__worldstar; }
  function nameOf(c) { try { return CHARS[c].name; } catch (e) { return c; } }
  function allMembers() { try { return ws().all(); } catch (e) { return []; } }
  function roadCid() {
    var all = allMembers(); if (!all.length) return null;
    var pick = get('ph_qroad', ''); var f = all.filter(function (s) { return s.cid === pick; })[0];
    if (f) return f;
    return all.slice().sort(function (a, b) { return b.score - a.score; })[0];
  }

  // ── 월드스타 로드맵 카드 (메인) ──
  function roadmapHtml() {
    var all = allMembers(); if (!all.length) return '';
    var cur = roadCid(), firstUndone = cur.steps.filter(function (x) { return !x.done; })[0];
    var chips = all.map(function (s) { return '<span data-rm="' + s.cid + '" class="' + (s.cid === cur.cid ? 'on' : '') + '">' + esc(nameOf(s.cid)) + (s.world ? ' 🌟' : '') + '</span>'; }).join('');
    var rows = cur.steps.map(function (x, i) {
      var pct = Math.round((x.ratio || 0) * 100);
      var go = (!x.done && x === firstUndone && !x.locked && x.fn) ? '<button class="qt-go" data-go="' + x.fn + '">가기</button>' : (x.locked && !x.done ? '<span style="font-size:15px;">🔒</span>' : '');
      return '<div class="qt-row ' + (x.done ? 'done' : '') + '"><div style="font-size:20px;">' + (x.done ? '✅' : x.icon) + '</div><div class="t"><div class="n">' + (i + 1) + '. ' + esc(x.name) + '</div><div class="s">' + esc(x.text || '') + '</div>' +
        (x.done ? '' : '<div class="qt-bar"><div style="width:' + pct + '%"></div></div>') + '</div>' + go + '</div>';
    }).join('');
    var head = cur.world ? '🌟 ' + esc(nameOf(cur.cid)) + ' 월드스타 달성!' : (cur.ready ? '🌟 ' + esc(nameOf(cur.cid)) + ' 월드스타 선언 가능!' : '🌏 월드스타 로드맵');
    var ready = (!cur.world && cur.ready) ? '<div style="text-align:center;padding:8px 0 2px;"><button class="qt-go" data-go="openWorldStar" style="padding:10px 22px;">월드스타 선언하러 가기</button></div>' : '';
    return '<div class="qt-h"><span>' + head + '</span><span style="font-size:11px;color:#ffe08a;">' + cur.done + ' / ' + cur.total + '</span></div><div class="qt-chips">' + chips + '</div>' + rows + ready;
  }

  // ── 이번 주 / 커리어 카드 (서브) ──
  function weekHtml() {
    var c = window.__career; if (!c) return '';
    var th, n = 0, claim = 0; try { th = c.theme(); n = Math.min(5, c.weekCount()); claim = c.claimable(); } catch (e) { return ''; }
    return '<div class="qt-h"><span>📅 이번 주 테마 · ' + esc(th.name) + '</span><span style="font-size:11px;color:#ffe08a;">' + n + ' / 5</span></div>' +
      '<div class="s" style="font-size:11.5px;color:#c9bbee;">' + esc(th.tip) + (th.map ? ' · 보상 ×1.5' : '') + '</div><div class="qt-bar"><div style="width:' + (n * 20) + '%"></div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;"><span style="font-size:12px;font-weight:900;">🏆 커리어 보상 ' + (claim > 0 ? '<b style="color:#ff8a8a;">' + claim + '개 받기 가능</b>' : '<span style="color:#c9bbee;">없음</span>') + '</span><button class="qt-go" data-go="openCareer">커리어 열기</button></div>';
  }

  function go(fn) { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {} }
  function bindCard(el) {
    el.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { set('ph_qroad', b.getAttribute('data-rm')); lastSig = ''; apply(); }; });
  }

  // ── 어느 탭에 보일지 표시 ──
  var MAIN_IDS = { 'qg-quest-card': 1, 'story-quest-section': 1, 'story-section': 1, 'ql-lock': 1, 'qt-roadmap': 1 };
  function classify(list) {
    var mode = 'main';
    Array.prototype.forEach.call(list.children, function (ch) {
      if (ch.id === 'qt-tabs') return;
      var t;
      if (ch.id === 'dq-quest-card' || ch.id === 'qt-week') t = 'sub';
      else if (MAIN_IDS[ch.id]) t = 'main';
      else {
        var tx = (ch.textContent || '').trim().slice(0, 12);
        if (tx.indexOf('🌿 서브 퀘스트') === 0) mode = 'sub';
        else if (tx.indexOf('📋 튜토리얼') === 0 || tx.indexOf('🌟 메인 퀘스트') === 0) mode = 'main';
        t = mode;
      }
      if (ch.getAttribute('data-qt') !== t) ch.setAttribute('data-qt', t);
    });
  }

  function dots() {
    var m = false, s = false;
    try { var a = allMembers(); m = a.some(function (x) { return x.ready; }); } catch (e) {}
    try { if (window.__career && window.__career.claimable() > 0) s = true; } catch (e) {}
    try { if (window.__dailyQuest && window.__dailyQuest.claimable && window.__dailyQuest.claimable() > 0) s = true; } catch (e) {}
    return { m: m, s: s };
  }

  var lastSig = '';
  function apply() {
    var list = document.getElementById('quest-list'), scr = document.getElementById('screen-quest');
    if (!list || !scr || !scr.classList.contains('active')) return;
    list.setAttribute('data-tab', tab);
    var tabs = document.getElementById('qt-tabs'), d = dots();
    if (!tabs) {
      tabs = document.createElement('div'); tabs.id = 'qt-tabs';
      tabs.innerHTML = '<button data-t="main">🌟 메인<i class="d" style="display:none"></i></button><button data-t="sub">🌿 서브<i class="d" style="display:none"></i></button>';
      tabs.querySelectorAll('button').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); set('ph_qtab', tab); apply(); try { window.scrollTo(0, 0); } catch (e) {} }; });
    }
    if (list.firstChild !== tabs) list.insertBefore(tabs, list.firstChild);
    tabs.querySelectorAll('button').forEach(function (b) { b.className = b.getAttribute('data-t') === tab ? 'on' : ''; });
    var dd = tabs.querySelectorAll('.d'); dd[0].style.display = d.m ? '' : 'none'; dd[1].style.display = d.s ? '' : 'none';
    // 새 카드 (내용이 바뀔 때만 다시 그림)
    var rm = document.getElementById('qt-roadmap'), wk = document.getElementById('qt-week');
    var hr = roadmapHtml(), hw = weekHtml(), sig = hr + '|' + hw;
    if (!rm) { rm = document.createElement('div'); rm.id = 'qt-roadmap'; rm.className = 'qt-card'; }
    if (!wk) { wk = document.createElement('div'); wk.id = 'qt-week'; wk.className = 'qt-card'; }
    if (tabs.nextSibling !== rm) list.insertBefore(rm, tabs.nextSibling);
    if (rm.nextSibling !== wk) list.insertBefore(wk, rm.nextSibling);
    if (sig !== lastSig) { rm.innerHTML = hr; wk.innerHTML = hw; bindCard(rm); bindCard(wk); lastSig = sig; }
    rm.style.display = hr ? '' : 'none'; wk.style.display = hw ? '' : 'none';
    classify(list);
  }
  (function hook() {   // 목록이 다시 그려질 때 바로 탭을 다시 붙임 (깜빡임 줄이기)
    if (typeof window.renderQuestList !== 'function') { setTimeout(hook, 200); return; }
    var o = window.renderQuestList; if (o.__qt) return;
    var w = function () { var r = o.apply(this, arguments); try { apply(); } catch (e) {} setTimeout(function () { try { apply(); } catch (e) {} }, 150); return r; };
    w.__qt = true; window.renderQuestList = w;
  })();
  // ── 퀘스트 카드를 누르면 자세한 내용을 팝업으로 ──
  function findQuest(card) {
    var tx = card.textContent || '';
    try {
      var ids = Object.keys(QUESTS);
      for (var i = 0; i < ids.length; i++) {
        var q = QUESTS[ids[i]]; if (!q || !q.desc) continue;
        if (tx.indexOf(q.title) >= 0 && tx.indexOf(String(q.desc).slice(0, 14)) >= 0) return { id: ids[i], q: q };
      }
    } catch (e) {}
    return null;
  }
  function typeLabel(q) { return q.type === 'tutorial' ? '📋 튜토리얼' : q.type === 'main' ? '🌟 메인 퀘스트' : '🌿 서브 퀘스트'; }
  function showDetail(f) {
    var q = f.q, done = false; try { done = questProgress[f.id] === 'done'; } catch (e) {}
    var old = document.getElementById('qt-pop'); if (old) old.remove();
    var rw = [];
    if (q.rewardCoins) rw.push('🍔 코인 ' + Number(q.rewardCoins).toLocaleString());
    if (q.rewardExp) rw.push('⭐ 경험치 ' + q.rewardExp);
    var lv = q.minLevel || q.reqLevel || q.unlockLevel || 0;
    var ov = document.createElement('div'); ov.id = 'qt-pop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(8,4,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Noto Sans KR",sans-serif;';
    ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(180deg,#2d1b4e,#1a1a2e);border:2px solid ' + ACC + ';border-radius:20px;padding:20px 18px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6);">' +
      '<div style="font-size:11px;font-weight:900;color:' + ACC + ';margin-bottom:6px;">' + typeLabel(q) + (done ? ' · ✅ 완료' : ' · 진행 중') + '</div>' +
      '<div style="font-size:18px;font-weight:900;margin-bottom:12px;">' + esc(q.title) + '</div>' +
      '<div style="font-size:13.5px;line-height:1.65;color:#e8defa;white-space:pre-wrap;">' + esc(q.desc) + '</div>' +
      (lv ? '<div style="margin-top:10px;font-size:12px;color:#c9bbee;">🔓 Lv.' + lv + ' 이상</div>' : '') +
      (rw.length ? '<div style="margin-top:12px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.08);font-size:12.5px;font-weight:900;color:#ffe08a;">🎁 보상 · ' + rw.join(' · ') + '</div>' : '') +
      '<button id="qt-pop-x" style="width:100%;margin-top:16px;padding:12px;border:none;border-radius:14px;font-weight:900;font-size:14px;font-family:inherit;background:linear-gradient(135deg,#C084FC,#FF6B9D);color:#fff;">확인</button></div>';
    document.body.appendChild(ov);
    var cl = function () { ov.remove(); };
    document.getElementById('qt-pop-x').onclick = cl;
    ov.addEventListener('click', function (e) { if (e.target === ov) cl(); });
  }
  (function bindDetail() {
    var l = document.getElementById('quest-list'); if (!l) { setTimeout(bindDetail, 300); return; }
    l.addEventListener('click', function (e) {
      if (e.target.closest('button,a,input,#qt-tabs,.qt-card,#dq-quest-card,#qg-quest-card,#story-quest-section,#story-section,#ql-lock')) return;
      var card = e.target; while (card && card.parentNode !== l) card = card.parentNode;
      if (!card || !card.getAttribute || !card.getAttribute('data-qt')) return;
      var f = findQuest(card); if (f) showDetail(f);
    });
  })();
  setInterval(function () { try { apply(); } catch (e) {} }, 700);
  window.__questTabs = { apply: apply, setTab: function (t) { tab = t; set('ph_qtab', t); apply(); } };
})();
