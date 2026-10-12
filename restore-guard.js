// ════════════════════════════════════════════════════════════
// 🛟 불러오기 안전장치 (restore-guard.js)
// 서버에서 데이터를 불러오면 이 폰의 코인·카드가 서버 저장 시점으로 되돌아가는 사고를 막는다.
//  ① 폰 데이터가 서버보다 더 진행됐으면 (레벨·카드 수·코인이 더 많음) 덮어쓰기 전에 물어봄 → [취소]면 이 폰 데이터 유지
//  ② 불러오기 직전의 폰 데이터 백업을 3개까지 돌려가며 보관 (예전엔 1개뿐이라 두 번 로그인하면 사라졌음)
//  ③ 계정 창에 "🛟 이 폰의 이전 데이터" 칸: 백업 목록을 보고 골라서 되돌릴 수 있음 (되돌리기 직전 상태도 백업됨)
// 백업은 'poca_restore_bk1/2' 와 기존 'ph_prerestore_backup' 에 들어가요 (서버에는 올라가지 않음)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var SLOTS = ['ph_prerestore_backup', 'poca_restore_bk1', 'poca_restore_bk2'];   // 최신 → 오래된 순
  var BK_KEYS = SLOTS;
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function num(x) { return Number(x) || 0; }

  // 지금 폰 상태 요약
  function localInfo() { return { lv: num(localStorage.getItem('ph_playerLevel')) || 1, coins: num(localStorage.getItem('ph_coins')), owned: (jget('ph_owned', []) || []).length }; }
  function serverInfo(d) { return { lv: num(d.playerLevel) || 1, coins: num(d.coins), owned: Array.isArray(d.owned) ? d.owned.length : 0 }; }
  function moreAdvanced(L, S) { return L.lv > S.lv || L.owned > S.owned || L.coins > S.coins * 1.5 + 100000; }

  function rotate() {   // 새 백업이 들어갈 자리를 만들려고 한 칸씩 밀기 (맨 오래된 건 사라짐)
    try {
      var cur = localStorage.getItem(SLOTS[0]), mid = localStorage.getItem(SLOTS[1]);
      if (mid) localStorage.setItem(SLOTS[2], mid);
      if (cur) localStorage.setItem(SLOTS[1], cur);
    } catch (e) {}
  }
  function snapshotNow() {   // 지금 ph_ 데이터를 통째로 최신 칸에 저장
    var snap = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('ph_') === 0 && BK_KEYS.indexOf(k) < 0) snap[k] = localStorage.getItem(k); }
    localStorage.setItem(SLOTS[0], JSON.stringify({ at: Date.now(), coins: snap.ph_coins, lv: snap.ph_playerLevel, data: snap }));
  }

  function install() {
    var orig = window.restorePocaDataFromServer;
    if (typeof orig !== 'function') { setTimeout(install, 200); return; }
    if (orig.__rg) return;
    var w = function (data) {
      try {
        if (data) {
          var L = localInfo(), S = serverInfo(data);
          if (moreAdvanced(L, S)) {
            var ok = confirm('⚠️ 이 폰의 데이터가 서버보다 더 진행돼 있어요!\n\n이 폰: Lv.' + L.lv + ' · 코인 ' + L.coins.toLocaleString() + ' · 카드 ' + L.owned + '장\n서버: Lv.' + S.lv + ' · 코인 ' + S.coins.toLocaleString() + ' · 카드 ' + S.owned + '장\n\n서버 데이터로 덮어쓸까요?\n[확인] 서버로 덮어씀 (이 폰 데이터는 백업돼요)\n[취소] 이 폰 데이터를 그대로 둠');
            if (!ok) { try { alert('이 폰 데이터를 그대로 뒀어요.'); } catch (e) {} return; }
          }
          rotate();   // 백업 한 칸 밀고, 아래에서 원래 백업 코드가 최신 칸에 새로 저장
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    w.__rg = true; window.restorePocaDataFromServer = w;
    try { restorePocaDataFromServer = w; } catch (e) {}
  }
  setTimeout(install, 1500);   // 다른 파일들의 불러오기 처리(cloud-extra 등)보다 바깥에서 먼저 실행되도록 마지막에 감쌈

  // ── 되돌리기 화면 ──
  function entries() {
    return SLOTS.map(function (k, i) {
      var b = jget(k, null); if (!b || !b.data) return null;
      var owned = 0; try { owned = (JSON.parse(b.data.ph_owned || '[]') || []).length; } catch (e) {}
      var d = new Date(b.at || 0);
      return { k: k, b: b, label: (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2), lv: num(b.lv) || 1, coins: num(b.coins), owned: owned };
    }).filter(Boolean);
  }
  function revert(e) {
    if (!confirm('이 폰의 지금 데이터를 백업해 두고,\n' + e.label + ' 데이터(Lv.' + e.lv + ' · 코인 ' + e.coins.toLocaleString() + ' · 카드 ' + e.owned + '장)로 되돌릴까요?')) return;
    try {
      var data = e.b.data;
      rotate(); snapshotNow();   // 되돌리기 전 상태도 백업 (되돌린 걸 다시 되돌릴 수 있게)
      Object.keys(data).forEach(function (k) { try { localStorage.setItem(k, data[k]); } catch (x) {} });
      alert('되돌렸어요! 새로고침할게요.');
      location.reload();
    } catch (x) { alert('실패했어요: ' + x.message); }
  }
  function decorate() {
    var ov = document.getElementById('auth-overlay');
    if (!ov || ov.querySelector('#rg-box')) return;
    var card = ov.firstElementChild; if (!card) return;
    var list = entries(); if (!list.length) return;
    var box = document.createElement('div'); box.id = 'rg-box'; box.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px dashed #ddd;';
    box.innerHTML = '<div style="font-size:12.5px;font-weight:900;color:#0f766e;margin-bottom:6px;">🛟 이 폰의 이전 데이터</div>' +
      '<div style="font-size:10.5px;color:#777;line-height:1.5;margin-bottom:6px;">서버에서 불러오기 전에 자동으로 백업해 둔 데이터예요. 코인·카드가 줄었다면 여기서 되돌려요.</div>' +
      list.map(function (e, i) { return '<div style="display:flex;align-items:center;gap:8px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:8px 10px;margin-bottom:6px;"><div style="flex:1;font-size:11.5px;color:#134e4a;line-height:1.5;"><b>' + e.label + '</b><br>Lv.' + e.lv + ' · 🍔 ' + e.coins.toLocaleString() + ' · 카드 ' + e.owned + '장</div><button data-rg="' + i + '" style="border:none;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:800;background:#14b8a6;color:#fff;cursor:pointer;font-family:inherit;">되돌리기</button></div>'; }).join('');
    var tr = card.querySelector('#tr-box'); if (tr) card.insertBefore(box, tr); else card.appendChild(box);
    box.querySelectorAll('[data-rg]').forEach(function (b) { b.onclick = function () { revert(list[+b.getAttribute('data-rg')]); }; });
  }
  (function hook() {
    if (typeof window.openAuthOverlay !== 'function') { setTimeout(hook, 150); return; }
    if (window.openAuthOverlay.__rgHooked) return;
    var orig = window.openAuthOverlay;
    window.openAuthOverlay = function () { var r = orig.apply(this, arguments); try { decorate(); } catch (e) {} return r; };
    window.openAuthOverlay.__rgHooked = true;
  })();
  window.__restoreGuard = { entries: entries, rotate: rotate, moreAdvanced: moreAdvanced };
})();
