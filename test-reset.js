// ════════════════════════════════
// 🧹 테스트 초기화 (test-reset.js)
// ☁️ 계정 창 맨 아래에 "처음부터 다시 시작" 버튼을 붙인다.
//  · 로그인 상태면 서버의 내 정보(users/내uid)를 지워서 쓰던 닉네임을 다시 쓸 수 있게 함
//  · 이 기기의 게임 진행(ph_ 로 시작하는 저장값)을 전부 지우고 새로고침 → 닉네임 입력부터 다시
//  · 로그인한 이메일 계정 자체는 남음 (다시 로그인하면 빈 상태로 시작)
// ════════════════════════════════
(function () {
  'use strict';
  function wipeLocal() {
    var keys = [];
    try { for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
    keys.forEach(function (k) { if (k && (k.indexOf('ph_') === 0 || k.indexOf('poca') === 0)) { try { localStorage.removeItem(k); } catch (e) {} } });
  }
  async function resetAll() {
    var msg = document.getElementById('tr-msg');
    function say(t, bad) { if (msg) { msg.textContent = t; msg.style.color = bad ? '#ef4444' : '#16a34a'; } }
    if (!confirm('정말 처음부터 다시 시작할까요?\n이 기기의 게임 진행이 전부 지워져요.' + (window.pocaLoggedInUid ? '\n(서버에 저장된 내 정보도 지워요)' : ''))) return;
    say('지우는 중…');
    var serverOk = true;
    try {
      if (window.pocaLoggedInUid && window.pocaFirebase) {
        var F = window.pocaFirebase;
        await F.deleteDoc(F.doc(F.db, 'users', window.pocaLoggedInUid));
      }
    } catch (e) { serverOk = false; }
    try { if (window.pocaAuth && window.pocaLoggedInUid) await window.pocaAuth.signOut(window.pocaAuth.auth); } catch (e) {}
    wipeLocal();
    try { if (window.indexedDB && indexedDB.databases) { var dbs = await indexedDB.databases(); dbs.forEach(function (d) { if (d.name && /poca|ph_/i.test(d.name)) indexedDB.deleteDatabase(d.name); }); } } catch (e) {}
    say(serverOk ? '완료! 새로 시작해요…' : '이 기기만 지웠어요 (서버 정보는 지우지 못했어요). 새로고침해요…', !serverOk);
    setTimeout(function () { location.reload(); }, 900);
  }
  window.pocaResetAll = resetAll;

  function decorate() {
    var ov = document.getElementById('auth-overlay');
    if (!ov || ov.querySelector('#tr-box')) return;
    var card = ov.firstElementChild; if (!card) return;
    var box = document.createElement('div');
    box.id = 'tr-box';
    box.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px dashed #ddd;';
    box.innerHTML = '<button id="tr-btn" style="width:100%;padding:11px;background:#fff1f2;border:1.5px solid #fca5a5;border-radius:10px;color:#dc2626;font-size:13px;font-weight:800;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🧹 처음부터 다시 시작 (테스트용)</button>' +
      '<div style="font-size:10px;color:#999;margin-top:6px;line-height:1.5;text-align:center;">이 기기의 진행을 모두 지우고, 쓰던 닉네임도 다시 쓸 수 있게 풀어줘요.</div>' +
      '<div id="tr-msg" style="font-size:12px;text-align:center;min-height:16px;margin-top:4px;"></div>';
    card.appendChild(box);
    box.querySelector('#tr-btn').onclick = resetAll;
  }
  (function hook() {
    if (typeof window.openAuthOverlay !== 'function') { setTimeout(hook, 100); return; }
    if (window.openAuthOverlay.__trHooked) return;
    var orig = window.openAuthOverlay;
    window.openAuthOverlay = function () { var r = orig.apply(this, arguments); try { decorate(); } catch (e) {} return r; };
    window.openAuthOverlay.__trHooked = true;
  })();
})();
