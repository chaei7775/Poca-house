// 🛡️ 서버 저장 안전장치
//  1) 서버에 더 진행된(레벨 높은) 데이터가 있는데 이 폰은 낮으면 → 자동저장을 멈추고 물어봄 (좋은 데이터를 새 데이터가 덮어쓰는 사고 방지)
//  2) 서버 저장이 연속 실패하면 → 화면에 알려주고, 알아서 다시 시도 + [지금 저장] 버튼
(function () {
  'use strict';
  var FAIL_SHOW = 2, RETRY_MS = 30000;
  var blocked = false, checked = false, checking = null, fails = 0, retryT = null;
  function $(id) { return document.getElementById(id); }
  function lv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }

  function banner(html) {
    var b = $('sg-banner');
    if (!html) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'sg-banner';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top));z-index:9500;width:calc(100% - 20px);max-width:410px;background:rgba(120,30,30,.96);color:#fff;border:1.5px solid #ff9a9a;border-radius:14px;padding:9px 12px;font-size:12px;line-height:1.5;font-family:inherit;box-shadow:0 4px 14px #0008;';
      document.body.appendChild(b);
    }
    b.innerHTML = html;
  }

  function askRestore(server) {
    blocked = true;
    var old = $('sg-ask'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'sg-ask';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px;';
    ov.innerHTML = '<div style="background:#1a1a2e;border:2px solid #FF6B9D;border-radius:20px;padding:22px 18px;width:100%;max-width:320px;text-align:center;color:#fff;font-family:inherit;">' +
      '<div style="font-size:30px;">☁️</div>' +
      '<div style="font-size:15px;font-weight:900;margin:6px 0;">서버에 더 진행된 데이터가 있어요</div>' +
      '<div style="font-size:12.5px;line-height:1.7;color:#ddd;margin-bottom:14px;">서버: <b>Lv.' + (server.playerLevel || '?') + '</b> · 🍔 ' + Number(server.coins || 0).toLocaleString() + '<br>이 폰: <b>Lv.' + lv() + '</b> · 🍔 ' + Number(typeof coins !== 'undefined' ? coins : 0).toLocaleString() + '<br><span style="color:#ffd6e8;">보통은 서버 데이터를 불러오는 게 맞아요.</span></div>' +
      '<button id="sg-load" style="width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;">서버 데이터 불러오기</button>' +
      '<button id="sg-keep" style="width:100%;padding:9px;border:1px solid #666;border-radius:12px;background:none;color:#aaa;font-size:12px;">이 폰 데이터로 계속 (서버를 덮어써요)</button></div>';
    document.body.appendChild(ov);
    $('sg-load').onclick = function () {
      try { if (typeof restorePocaDataFromServer === 'function') restorePocaDataFromServer(server); } catch (e) {}
      ov.querySelector('div').innerHTML = '<div style="padding:20px;color:#fff;">불러왔어요! 새로고침할게요 ✨</div>';
      setTimeout(function () { location.reload(); }, 900);
    };
    $('sg-keep').onclick = function () {
      if (!confirm('정말 서버의 더 진행된 데이터를 이 폰 데이터로 덮어쓸까요?\n되돌릴 수 없어요.')) return;
      blocked = false; ov.remove();
    };
  }

  // 서버 데이터를 한 번 읽어서 비교
  function checkServer() {
    if (checked) return Promise.resolve(!blocked);
    if (checking) return checking;
    checking = (async function () {
      try {
        var F = window.pocaFirebase;
        if (!F || !F.getDoc || !F.doc || !F.db || !window.pocaLoggedInUid) return true;
        var snap = await F.getDoc(F.doc(F.db, 'users', (typeof getPocaServerUid === 'function' ? getPocaServerUid() : window.pocaLoggedInUid)));
        checked = true;
        if (snap.exists()) {
          var d = snap.data() || {};
          if (Number(d.playerLevel || 0) > lv() + 1) { askRestore(d); return false; }
        }
        return true;
      } catch (e) { return true; }   // 읽기 실패는 막지 않음 (저장 쪽에서 실패 처리)
      finally { checking = null; }
    })();
    return checking;
  }

  function scheduleRetry() {
    if (retryT) return;
    retryT = setTimeout(function () { retryT = null; if (typeof savePocaUserToServer === 'function') savePocaUserToServer('retry'); }, RETRY_MS);
  }
  function showFail() {
    banner('⚠️ <b>서버 저장이 안 되고 있어요</b><br>인터넷 연결을 확인해주세요. 연결되면 자동으로 다시 저장해요 (이 폰에는 계속 저장돼요).' +
      '<br><button id="sg-now" style="margin-top:6px;padding:5px 12px;border:none;border-radius:8px;background:#fff;color:#a00;font-size:12px;font-weight:900;">지금 저장 시도</button>');
    var n = $('sg-now'); if (n) n.onclick = function () { n.textContent = '저장 중...'; savePocaUserToServer('manual'); };
  }

  function install() {
    if (typeof window.savePocaUserToServer !== 'function' || window.savePocaUserToServer.__sg) return false;
    var orig = window.savePocaUserToServer;
    var w = async function (reason) {
      if (!window.pocaLoggedInUid || !window.pocaFirebaseReady || !window.pocaFirebase) return orig.call(this, reason);
      if (blocked) return false;
      var ok = await checkServer();
      if (!ok || blocked) return false;
      var res = await orig.call(this, reason);
      if (res) { fails = 0; window.__lastServerSave = Date.now(); banner(null); }
      else { fails++; if (fails >= FAIL_SHOW) showFail(); scheduleRetry(); }
      return res;
    };
    w.__sg = true;
    window.savePocaUserToServer = w;
    try { savePocaUserToServer = w; } catch (e) {}
    return true;
  }
  var tries = 0, t = setInterval(function () { if (install() || ++tries > 60) clearInterval(t); }, 300);
})();
