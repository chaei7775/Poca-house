// ════════════════════════════════
// 📸 CF 화보 팝업 (cf-photo.js)
// CF 촬영(cf-shoot.js)에서 "분양소 동물(강아지/고양이/아기돼지/새)"을 게스트로 데리고 가서
// 촬영에 성공하면, 그 멤버 × 동물 화보 사진을 큰 팝업으로 띄운다. (cf-shoot.js / game.js는 건드리지 않음)
//
// - 사진 위치: cf-photos/멤버id_동물id.png   예) cf-photos/sion_cat.png
//     멤버 id: minjun, sion, doyun, harin, ara, yuna
//     동물 id: dog, cat, pig, bird
// - 처음 찍은 사진이면 NEW 표시. 수집 기록은 'ph_cf_photos'에 저장 → 서버(cloud-extra.js)에도 자동으로 같이 올라감.
// - 촬영 실패(NG)이거나 게스트가 없으면 팝업은 안 뜸.
// - 결과 화면(포스터)이 뜨는 순간 그 위에 팝업이 덮이고, 닫으면 원래 결과 화면이 보임.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORAGE_KEY = 'ph_cf_photos';
  var PHOTO_DIR = 'cf-photos/';
  var MEMBERS = ['minjun', 'sion', 'doyun', 'harin', 'ara', 'yuna'];
  var ANIMALS = { dog: '강아지', cat: '고양이', pig: '아기돼지', bird: '새' };
  var FRESH_MS = 15000;          // 촬영한 지 이 시간 안에 뜬 결과 화면만 팝업 대상
  var LOAD_TIMEOUT_MS = 5000;    // 사진이 이 시간 안에 안 불러와지면 팝업 생략
  var TOTAL = MEMBERS.length * Object.keys(ANIMALS).length;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ════════ 저장 ════════
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.got || typeof s.got !== 'object') s.got = {};
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function countGot(s) {
    var n = 0;
    MEMBERS.forEach(function (m) {
      Object.keys(ANIMALS).forEach(function (a) { if (s.got[m + '_' + a]) n++; });
    });
    return n;
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function injectStyle() {
    if (document.getElementById('cfp-style')) return;
    var st = document.createElement('style');
    st.id = 'cfp-style';
    st.textContent =
      '@keyframes cfpIn{0%{transform:scale(0.8) rotate(-3deg);opacity:0}100%{transform:scale(1) rotate(-1deg);opacity:1}}' +
      '@keyframes cfpFlash{0%{opacity:0.95}100%{opacity:0}}' +
      '@keyframes cfpNew{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}' +
      '@keyframes cfpFade{0%{opacity:0}100%{opacity:1}}';
    document.head.appendChild(st);
  }

  // ════════ 팝업 ════════
  // charId: 'sion' 등 / animal: 'cat' 등 / opt: { stars: 1~3 }
  function showPhoto(charId, animal, opt) {
    opt = opt || {};
    if (MEMBERS.indexOf(charId) === -1 || !ANIMALS[animal]) return false;
    if (document.getElementById('cfp-overlay')) return false;
    var key = charId + '_' + animal;
    var src = PHOTO_DIR + key + '.png';

    // 사진을 먼저 불러오고, 다 불러오면 팝업을 연다 (빈 틀이 먼저 뜨는 걸 막음)
    var img = new Image();
    var done = false;
    var timer = setTimeout(function () { done = true; }, LOAD_TIMEOUT_MS);
    img.onload = function () {
      if (done) return;
      done = true; clearTimeout(timer);
      open(img);
    };
    img.onerror = function () { done = true; clearTimeout(timer); };
    img.src = src;

    function open(loaded) {
      if (document.getElementById('cfp-overlay')) return;
      injectStyle();
      var st = load();
      var isNew = !st.got[key];
      if (isNew) st.got[key] = { first: Date.now(), n: 1 };
      else st.got[key].n = (st.got[key].n || 1) + 1;
      save(st);
      var got = countGot(st);

      var ch = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId] : { name: charId };
      var stars = opt.stars || 0, starsTxt = '';
      for (var i = 0; i < 3; i++) starsTxt += i < stars ? '⭐' : '☆';
      var frame = stars >= 3 ? 'linear-gradient(135deg,#FFD700,#FF6B9D,#C084FC)' : stars === 2 ? 'linear-gradient(135deg,#C084FC,#6366F1)' : 'linear-gradient(135deg,#f5f5f5,#e6e6e6)';

      var ov = document.createElement('div');
      ov.id = 'cfp-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(10,6,22,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;animation:cfpFade 0.25s ease;' + FONT;
      ov.innerHTML =
        '<div style="position:relative;width:100%;max-width:560px;padding:5px;border-radius:14px;background:' + frame + ';box-shadow:0 12px 40px rgba(0,0,0,0.55);animation:cfpIn 0.5s ease forwards;">' +
          '<div style="position:relative;background:#fff;border-radius:10px;padding:10px 10px 0;overflow:hidden;">' +
            '<img src="' + esc(loaded.src) + '" alt="" style="display:block;width:100%;max-height:62vh;object-fit:contain;background:#fff;">' +
            (isNew ? '<div style="position:absolute;top:14px;left:14px;background:#FF3B6B;color:#fff;font-size:15px;font-weight:900;letter-spacing:1px;padding:5px 12px;border-radius:14px;box-shadow:0 2px 8px rgba(255,59,107,0.6);animation:cfpNew 0.9s ease infinite;">NEW</div>' : '') +
            '<div style="padding:12px 4px 14px;text-align:center;">' +
              '<div style="font-size:17px;font-weight:900;color:#2a1745;">' + esc(ch.name) + ' × ' + esc(ANIMALS[animal]) + '</div>' +
              '<div style="font-size:12px;color:#8a7aa6;margin-top:3px;">📸 CF 화보' + (stars ? ' · ' + starsTxt : '') + '</div>' +
            '</div>' +
            '<div style="position:absolute;inset:0;background:#fff;animation:cfpFlash 0.7s ease-out forwards;pointer-events:none;"></div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:12px;font-size:12px;color:#cdbfee;">📸 CF 화보 수집 ' + got + '/' + TOTAL + (isNew ? ' · 새 사진!' : '') + '</div>' +
        '<button id="cfp-close" style="width:100%;max-width:560px;margin-top:10px;min-height:50px;border:none;border-radius:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:16px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button>';

      function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
      ov.onclick = function (e) { if (e.target === ov || e.target.id === 'cfp-close') close(); };
      document.body.appendChild(ov);
    }
    return true;
  }

  // ════════ CF 촬영 결과 화면 감지 ════════
  // cf-shoot.js는 촬영이 끝나면 결과 화면에 "확인"(#cf-ok) 버튼을 만들고, 성공한 포스터를 'ph_cf'의 posters[0]에 저장함.
  // 그걸 보고: 방금 성공했고 + 게스트가 분양소 동물(k_dog 등)이면 → 화보 팝업.
  var lastTs = 0;
  function checkResult() {
    var ok = document.getElementById('cf-ok');
    if (!ok || ok.__cfpSeen) return;
    ok.__cfpSeen = true;
    var p = null;
    try {
      var cf = JSON.parse(localStorage.getItem('ph_cf') || 'null');
      p = cf && cf.posters && cf.posters[0];
    } catch (e) {}
    if (!p || !p.stars || p.stars < 1) return;                       // NG
    if (!p.ts || p.ts === lastTs || Date.now() - p.ts > FRESH_MS) return;   // 이미 본 것 / 옛날 것
    if (typeof p.creatureId !== 'string' || p.creatureId.indexOf('k_') !== 0) return;   // 분양소 동물 게스트가 아님
    lastTs = p.ts;
    showPhoto(p.charId, p.creatureId.slice(2), { stars: p.stars });
  }
  setInterval(checkResult, 300);

  window.showCfPhoto = showPhoto;
  window.__cfPhoto = { show: showPhoto, load: load, countGot: countGot, TOTAL: TOTAL };
})();
