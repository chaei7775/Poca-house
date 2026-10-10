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
    if (window.pocaLoggedInUid) {
      var t = prompt('⚠️ 지금 로그인된 계정(' + (window.pocaLoggedInEmail || '') + ')의 저장 데이터가 서버에서도 영구 삭제돼요. 되돌릴 수 없어요!\n정말 지우려면 "삭제"라고 입력하세요.');
      if (t !== '삭제') { say('취소했어요', true); return; }
    } else if (!confirm('정말 처음부터 다시 시작할까요?\n이 기기의 게임 진행이 전부 지워져요.')) return;
    say('지우는 중…');
    var serverOk = true;
    try {
      if (window.pocaLoggedInUid && window.pocaFirebase) {
        var F = window.pocaFirebase;
        await F.deleteDoc(F.doc(F.db, 'users', window.pocaLoggedInUid));
      }
    } catch (e) { serverOk = false; }
    try { if (window.pocaAuth && window.pocaLoggedInUid) await window.pocaAuth.signOut(window.pocaAuth.auth); } catch (e) {}
    // 지운 뒤 새로고침 전까지 게임이 메모리의 옛 진행(카드·알바 등)을 다시 저장하지 못하게 막는다
    try {
      var _set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k) {
        if (this === window.localStorage && k && (String(k).indexOf('ph_') === 0 || String(k).indexOf('poca') === 0)) return;
        return _set.apply(this, arguments);
      };
    } catch (e) {}
    wipeLocal();
    try { sessionStorage.setItem('tr_auto_guest', '1'); } catch (e) {}   // 새로고침 뒤 첫 화면을 건너뛰고 바로 게스트 시작
    try { if (window.indexedDB && indexedDB.databases) { var dbs = await indexedDB.databases(); dbs.forEach(function (d) { if (d.name && /poca|ph_/i.test(d.name)) indexedDB.deleteDatabase(d.name); }); } } catch (e) {}
    say(serverOk ? '완료! 새로 시작해요…' : '이 기기만 지웠어요 (서버 정보는 지우지 못했어요). 새로고침해요…', !serverOk);
    setTimeout(function () { wipeLocal(); location.reload(); }, 900);
  }
  window.pocaResetAll = resetAll;

  // 초기화 직후 새로고침이면: 환영 화면에서 '게스트로 시작하기'를 자동으로 눌러 바로 게임 시작 흐름(닉네임 입력)으로
  (function autoGuest() {
    var on = false; try { on = sessionStorage.getItem('tr_auto_guest') === '1'; } catch (e) {}
    if (!on) return;
    var n = 0;
    (function tryClick() {
      var ov = document.getElementById('onboarding-overlay');
      var btn = ov && Array.prototype.slice.call(ov.querySelectorAll('button')).filter(function (b) { return /게스트/.test(b.textContent); })[0];
      if (btn) { try { sessionStorage.removeItem('tr_auto_guest'); } catch (e) {} btn.click(); return; }
      if (++n < 60) setTimeout(tryClick, 150); else { try { sessionStorage.removeItem('tr_auto_guest'); } catch (e) {} }
    })();
  })();

  function decorate(ovId) {
    var ov = document.getElementById(ovId || 'auth-overlay');
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
  // 맨 처음 화면(회원가입/로그인 · 게스트로 시작하기)에도 같은 버튼
  (function hook2() {
    if (typeof window.openOnboardingOverlay !== 'function') { setTimeout(hook2, 100); return; }
    if (window.openOnboardingOverlay.__trHooked) return;
    var orig = window.openOnboardingOverlay;
    window.openOnboardingOverlay = function () { var r = orig.apply(this, arguments); try { decorate('onboarding-overlay'); } catch (e) {} return r; };
    window.openOnboardingOverlay.__trHooked = true;
    try { decorate('onboarding-overlay'); } catch (e) {}   // 이미 떠 있으면 바로 붙임
  })();
})();
