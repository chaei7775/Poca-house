// ════════════════════════════════════════════════════════════
// ✨ 고급 뽑기 (premium-gacha.js) — 후반 코인 소모처
//  · 카드 뽑기 화면 아래에 "고급 뽑기" 칸이 생긴다. 일반 뽑기는 그대로.
//  · 확률이 훨씬 좋은 대신 비싸다. 5연은 SR 이상 1장 보장.
//  · 카드를 얻는 처리(보유 수, 인연 경험치, 퀘스트 등)는 기존 drawOne()을 그대로 쓴다. (등급 구간만 골라서 호출)
// ✏️ 고치는 법: 아래 [설정]의 숫자만 바꾸면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ───────── [설정] ─────────
  var NEED_LEVEL = 20;                     // 플레이어 레벨 (이전에는 잠겨 있어요)
  var PRICE_ONE = 20000;                   // 한 번
  var PRICE_FIVE = 90000;                  // 5연 (10% 할인 · SR 이상 1장 보장)
  var RATES = { UR: 5, SSR: 15, SR: 30, R: 25, N: 25 };   // 합이 100. (일반 뽑기: UR 2 / SSR 7 / SR 20 / R 15 / N 56)
  // 일반 drawOne() 의 등급 구간(0~100 중). 이 안의 값을 넘겨주면 그 등급이 나온다.
  var BAND = { UR: [0, 2], SSR: [2, 9], SR: [9, 29], R: [29, 44], N: [44, 100] };
  var ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

  function fmt(n) { return Math.round(n).toLocaleString(); }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); else alert(m); } catch (e) {} }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function rollGrade() {
    var r = Math.random() * 100, acc = 0, keys = ['UR', 'SSR', 'SR', 'R', 'N'];
    for (var i = 0; i < keys.length; i++) { acc += RATES[keys[i]]; if (r < acc) return keys[i]; }
    return 'N';
  }
  function drawGrade(grade) {
    var real = Math.random, b = BAND[grade], v = b[0] + real() * (b[1] - b[0]);
    var first = true;
    Math.random = function () { if (first) { first = false; Math.random = real; return v / 100; } return real(); };   // 첫 난수만 등급 구간으로
    try { return window.drawOne(); } finally { Math.random = real; }
  }
  function draw(count) {
    if (plv() < NEED_LEVEL) { toast('✨ 고급 뽑기는 플레이어 Lv.' + NEED_LEVEL + '부터 열려요'); return null; }
    var cost = count === 1 ? PRICE_ONE : PRICE_FIVE;
    if (coins < cost) { toast('코인이 부족해요! 🍔 ' + fmt(cost) + ' 필요 (현재: ' + fmt(coins) + ')'); return null; }
    if (typeof window.drawOne !== 'function') return null;
    var grades = [];
    for (var i = 0; i < count; i++) grades.push(rollGrade());
    if (count >= 5 && !grades.some(function (g) { return ORDER.indexOf(g) >= 2; })) grades[grades.length - 1] = 'SR';   // SR 이상 보장
    coins -= cost; try { saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
    var results = grades.map(drawGrade);
    try { if (count === 1) window.showGachaResult(results[0]); else window.showGachaResultMulti(results); } catch (e) {}
    return results;
  }

  function panelHtml() {
    var lock = plv() < NEED_LEVEL, base = 'flex:1;padding:12px 6px;border-radius:14px;font-size:14px;font-weight:900;font-family:\'Noto Sans KR\',sans-serif;cursor:pointer;';
    return '<div style="font-size:15px;font-weight:900;color:#FFD700;letter-spacing:1px;">✨ 고급 뽑기</div>' +
      '<div style="font-size:11px;color:#e8d9a8;margin:3px 0 8px;line-height:1.5;">UR ' + RATES.UR + '% · SSR ' + RATES.SSR + '% · SR ' + RATES.SR + '% — 일반 뽑기보다 확률이 훨씬 좋아요</div>' +
      (lock ? '<div style="text-align:center;font-size:12px;color:#ff9aa8;padding:10px;background:rgba(0,0,0,.3);border-radius:12px;">🔒 플레이어 Lv.' + NEED_LEVEL + ' 이상부터 (지금 Lv.' + plv() + ')</div>' :
        '<div style="display:flex;gap:10px;">' +
        '<button id="pg-one" style="' + base + 'background:rgba(255,215,0,0.15);border:1.5px solid #FFD700;color:#FFD700;">한 번<br><span style="font-size:11px;font-weight:400;opacity:.85;">🍔 ' + fmt(PRICE_ONE) + '</span></button>' +
        '<button id="pg-five" style="' + base + 'background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;color:#2a1d08;box-shadow:0 4px 16px #FFD70055;">5연<br><span style="font-size:11px;font-weight:700;">🍔 ' + fmt(PRICE_FIVE) + ' · SR↑ 보장</span></button></div>');
  }
  function mount() {
    var scr = document.getElementById('screen-gacha'); if (!scr) return false;
    var anchor = scr.querySelector('.gacha-btn-3'); if (!anchor || !anchor.parentNode) return false;
    var p = document.getElementById('prem-gacha');
    if (!p) {
      p = document.createElement('div'); p.id = 'prem-gacha';
      p.style.cssText = 'width:100%;max-width:360px;margin-top:12px;padding:12px;border-radius:16px;background:linear-gradient(160deg,rgba(60,44,12,.78),rgba(26,18,6,.78));border:1.5px solid #FFD700;box-shadow:0 0 18px rgba(255,215,0,.22);box-sizing:border-box;';
      anchor.parentNode.parentNode.insertBefore(p, anchor.parentNode.nextSibling);
    }
    p.innerHTML = panelHtml();
    var a = document.getElementById('pg-one'), b = document.getElementById('pg-five');
    if (a) a.onclick = function () { draw(1); refresh(); };
    if (b) b.onclick = function () { draw(5); refresh(); };
    return true;
  }
  function refresh() { var p = document.getElementById('prem-gacha'); if (p) p.innerHTML = panelHtml(), rebind(); }
  function rebind() {
    var a = document.getElementById('pg-one'), b = document.getElementById('pg-five');
    if (a) a.onclick = function () { draw(1); refresh(); };
    if (b) b.onclick = function () { draw(5); refresh(); };
  }
  (function wait(n) { if (!mount() && n < 100) setTimeout(function () { wait(n + 1); }, 200); })(0);
  setInterval(function () { var s = document.getElementById('screen-gacha'); if (s && s.classList.contains('active')) { if (!document.getElementById('prem-gacha')) mount(); else refresh(); } }, 2000);

  window.__premGachaTest = { draw: draw, RATES: RATES, BAND: BAND, drawGrade: drawGrade, mount: mount, PRICE_ONE: PRICE_ONE, PRICE_FIVE: PRICE_FIVE };
})();
