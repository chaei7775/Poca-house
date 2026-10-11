// 🔐 로그인 오류 문구 보강 (auth-msg.js) — 비번을 여러 번 틀리면 파이어베이스가 잠깐 막는데(auth/too-many-requests) 영어 코드만 떠서 쉬운 말로 바꿈
(function () {
  'use strict';
  var orig = window.pocaAuthErrorText;
  if (typeof orig !== 'function') return;
  window.pocaAuthErrorText = function (err) {
    var code = (err && err.code) || '';
    if (code.indexOf('too-many-requests') !== -1) return '로그인 시도가 너무 많아서 잠깐 막혔어요. 15~30분 뒤에 다시 해보세요. (비밀번호는 그 사이에 천천히 확인!)';
    if (code.indexOf('network-request-failed') !== -1) return '인터넷 연결을 확인하고 다시 해보세요.';
    return orig.apply(this, arguments);
  };
})();

// ⏱️ 닉네임 중복 확인이 서버 응답을 못 받고 '확인 중...' 에서 멈추는 문제: 6초 안에 답이 없으면 통과시킴 (기존에도 확인 실패 시엔 막지 않는 방식)
(function () {
  'use strict';
  var orig = window.checkNicknameUnique;
  if (typeof orig !== 'function' || orig.__timed) return;
  var w = function () {
    var p = orig.apply(this, arguments);
    var t = new Promise(function (res) { setTimeout(function () { res(false); }, 6000); });
    return Promise.race([p, t]);
  };
  w.__timed = true;
  window.checkNicknameUnique = w;
})();
