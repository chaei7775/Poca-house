// ════════════════════════════════
// 📋 아이돌 한눈에 보기 + 체력 경고 (idol-board.js)
//  · 📅 스케줄·식사 화면에 "📋 전체 한눈에" 버튼 → 데뷔한 아이돌 전원의 체력·기분·비주얼·능력치·오늘 레슨·일정을 한 화면에서 비교
//  · 줄을 누르면 그 아이돌 화면으로 이동
//  · 체력이 낮은 아이돌이 있으면 게임을 켠 뒤 한 번 알려줌 (보드에서도 빨간 표시)
//  · 저장하는 건 없음 (meal.js / lesson.js 가 저장한 값을 읽기만 함). 등록: loader.js 에서 lesson.js 뒤.
// ════════════════════════════════
(function () {
  'use strict';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var LOW_STAMINA = 25;      // 이보다 낮으면 경고
  var TYPE_LABEL = { drama: '🎬 드라마', comeback: '💿 컴백', music: '📺 음방', rest: '🛌 휴식' };
  var BARS = [
    { k: 'v', name: '비주얼', color: '#ff9ec7' },
    { k: 's', name: '체력', color: '#7fd1ae' },
    { k: 'm', name: '기분', color: '#ffcf4a' }
  ];

  function ico(name, px, emo) {   // 🖼️ meal-assets/ui/<이름>.png (없으면 이모지)
    return '<img src="meal-assets/ui/' + name + '.png" alt="" draggable="false" decoding="async" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML=\'' + emo + '\'">';
  }
  function M() { return window.__mealTest || null; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }

  function debuted() {
    var m = M(); if (!m) return [];
    var a = null, out = [];
    try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    if (!a) return out;
    var done = a.done || {}, deb = a.debut || {};
    Object.keys(m.CH).forEach(function (cid) { if (done[cid] || deb[cid]) out.push(cid); });
    return out;
  }
  function rows() {
    var m = M(); if (!m) return [];
    var st = m.load(), tr = null;
    try { tr = JSON.parse(localStorage.getItem('ph_training') || 'null'); } catch (e) {}
    tr = tr || {};
    return debuted().map(function (cid) {
      var c = m.statOf(st, cid), sc = st.sched[cid] || null, total = 0, hasStat = false;
      if (tr.stat && tr.stat[cid]) { hasStat = true; Object.keys(tr.stat[cid]).forEach(function (k) { total += Number(tr.stat[cid][k]) || 0; }); }
      else total = 50;   // 레슨을 안 했으면 시작값(10×5)
      var sched = '';
      if (sc) sched = sc.type === 'rest' ? TYPE_LABEL.rest : (TYPE_LABEL[sc.type] || '') + ' D-' + Math.max(0, sc.day - st.day);
      return { cid: cid, name: m.CH[cid].name, color: m.CH[cid].color, v: c.v, s: c.s, m: c.m, total: total,
        lessonDone: !!(tr.last && tr.last[cid] === st.day), sched: sched, low: c.s < LOW_STAMINA };
    });
  }

  function barHtml(b, val) {
    var low = b.k === 's' && val < LOW_STAMINA;
    return '<div style="flex:1;min-width:0;"><div style="display:flex;justify-content:space-between;font-size:9.5px;color:' + (low ? '#ff8a8a' : '#aab4d6') + ';font-weight:800;"><span>' + b.name + '</span><span>' + val + '</span></div>' +
      '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="width:' + Math.max(0, Math.min(100, val)) + '%;height:100%;background:' + (low ? '#ff6b6b' : b.color) + ';"></div></div></div>';
  }

  function openBoard() {
    var old = document.getElementById('idol-board'); if (old) old.remove();
    var list = rows();
    var ov = document.createElement('div');
    ov.id = 'idol-board';
    ov.style.cssText = 'position:fixed;inset:0;z-index:840;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    var lowN = list.filter(function (r) { return r.low; }).length;
    var body = list.length ? list.map(function (r) {
      return '<div data-go="' + r.cid + '" style="cursor:pointer;background:rgba(255,255,255,0.07);border:1.5px solid ' + (r.low ? '#ff6b6b99' : r.color + '66') + ';border-radius:14px;padding:10px;margin-bottom:8px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">' +
          '<span style="font-size:14px;font-weight:900;color:' + r.color + ';">' + esc(r.name) + '</span>' +
          (r.low ? '<span style="font-size:10px;font-weight:900;color:#ff9d9d;background:rgba(255,107,107,0.18);border-radius:8px;padding:2px 6px;">' + ico('lowstam', 13, '😵') + ' 체력 낮음</span>' : '') +
          '<span style="margin-left:auto;font-size:10.5px;color:#cfd3ee;font-weight:800;">' + ico('lesson', 14, '🎓') + ' ' + r.total + '/500</span></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:6px;">' + BARS.map(function (b) { return barHtml(b, r[b.k]); }).join('') + '</div>' +
        '<div style="display:flex;gap:8px;font-size:10.5px;font-weight:800;color:#c9d0f5;">' +
          '<span>' + (r.lessonDone ? '✅ 오늘 레슨 완료' : '⬜ 오늘 레슨 전') + '</span>' +
          '<span style="margin-left:auto;">' + (r.sched ? esc(r.sched) : '일정 없음') + '</span></div></div>';
    }).join('') : '<div style="text-align:center;color:#aab4d6;font-size:12px;padding:30px 8px;line-height:1.7;">아직 데뷔한 아이돌이 없어요.<br>기획사에서 데뷔시키면 여기서 한눈에 볼 수 있어요.</div>';
    ov.innerHTML = '<div style="width:100%;max-width:360px;max-height:88vh;overflow-y:auto;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #b793ff;border-radius:20px;padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div style="font-size:16px;font-weight:900;color:#fff;">' + ico('board', 22, '📋') + ' 아이돌 한눈에</div>' +
      '<button id="ib-x" style="' + BTN + 'padding:6px 12px;background:rgba(255,255,255,0.12);color:#fff;font-size:12px;">닫기</button></div>' +
      '<div style="font-size:11px;color:#aab4d6;margin-bottom:10px;">' + (lowN ? '<span style="color:#ff9d9d;font-weight:900;">' + ico('lowstam', 14, '😵') + ' 체력이 낮은 아이돌 ' + lowN + '명</span> · ' : '') + '줄을 누르면 그 아이돌 화면으로 가요</div>' + body + '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#ib-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-go]'), function (el) {
      el.onclick = function () {
        var cid = el.getAttribute('data-go'); ov.remove();
        var chip = document.querySelector('#meal-chips [data-cid="' + cid + '"]');
        if (chip) chip.click();
      };
    });
  }

  // ── 스케줄·식사 화면에 버튼 붙이기 ──
  function inject(ov) {
    if (!ov || !M() || ov.querySelector('#idol-board-btn')) return;
    var anchor = ov.querySelector('#meal-cal'); if (!anchor) return;
    var lowN = rows().filter(function (r) { return r.low; }).length;
    var b = document.createElement('button');
    b.id = 'idol-board-btn';
    b.style.cssText = BTN + 'width:100%;margin:-4px 0 12px;padding:10px;background:rgba(183,147,255,0.14);border:1.5px solid rgba(183,147,255,0.5);color:#fff;font-size:13px;';
    b.innerHTML = ico('board', 20, '📋') + ' 전체 한눈에 보기' + (lowN ? ' <span style="color:#ff9d9d;">· ' + ico('lowstam', 15, '😵') + ' 체력 낮음 ' + lowN + '</span>' : '');
    b.onclick = openBoard;
    anchor.insertAdjacentElement('afterend', b);
  }
  function watch() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return; watched = ov; inject(ov);
      new MutationObserver(function () { inject(ov); }).observe(ov, { childList: true });
    }
    var first = document.getElementById('meal-overlay'); if (first) attach(first);
    new MutationObserver(function () { var ov = document.getElementById('meal-overlay'); if (ov) attach(ov); }).observe(document.body, { childList: true });
  }

  // ── 체력 경고: 켠 뒤 한 번 ──
  function warnOnce() {
    try { if (sessionStorage.getItem('ib_warned')) return; } catch (e) {}
    var low = rows().filter(function (r) { return r.low; });
    if (!low.length) return;
    try { sessionStorage.setItem('ib_warned', '1'); } catch (e) {}
    toast('😵 체력이 낮은 아이돌: ' + low.slice(0, 3).map(function (r) { return r.name + '(' + r.s + ')'; }).join(', ') + (low.length > 3 ? ' 외 ' + (low.length - 3) + '명' : '') + ' · 식사나 휴식으로 채워주세요');
  }

  function boot() { watch(); setTimeout(warnOnce, 4500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.__idolBoard = { rows: rows, openBoard: openBoard, LOW_STAMINA: LOW_STAMINA };
})();
