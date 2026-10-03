// ════════════════════════════════
// ☁️ 서버 저장 확장 (cloud-extra.js)
// game.js / auth.js는 건드리지 않고, 지금까지 서버에 안 올라가던 데이터를 같이 올린다.
//
// - 기존에 서버에 올라가던 것(코인, 카드, 가방, 레벨 등)은 그대로 두고,
//   그 밖의 'ph_' 로 시작하는 저장값 전부(히든카드, 기획사, 팬카페, CF, 강화, 화보집, 칭호, 퀘스트 …)를
//   서버 문서의 extraStorage 칸에 한 묶음으로 같이 저장한다.
//   → 앞으로 새로 만드는 기능도 'ph_' 로 시작하는 이름으로 저장하면 자동으로 같이 올라감.
// - 로그인해서 서버 데이터를 불러올 때(원래 있던 동작) 이 묶음도 같이 되돌린다. (불러온 뒤 새로고침되는 건 그대로)
// - 로그인한 상태에서만 서버에 올라간다 (원래 규칙 그대로. 게스트는 이 기기에만 저장)
// - 저장 시점: 기존처럼 saveAll()이 불릴 때 + 'ph_' 저장값이 바뀐 뒤 몇 초 안에 (saveAll을 안 부르는 기능도 빠지지 않게)
//
// 주의: 한 번에 한 기기에서만 플레이한다고 가정함. 두 기기에서 번갈아 하면 나중에 저장한 쪽이 이김.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var PREFIX = 'ph_';
  // 이미 game.js의 서버 저장 목록에 있는 것 (여기서 또 올리지 않음)
  var ALREADY = ['ph_nickname', 'ph_coins', 'ph_owned', 'ph_cardCounts', 'ph_bagSlots', 'ph_bagItems', 'ph_inventory',
    'ph_wish', 'ph_stamina', 'ph_currentRoom', 'ph_affection', 'ph_ownedRooms', 'ph_hints', 'ph_learnedSkills',
    'ph_alba', 'ph_playerLevel', 'ph_playerExp', 'ph_cardLevels', 'ph_cardExp', 'ph_storyProgress'];
  // 기기마다 달라야 하는 것 (서버로 옮기면 안 됨)
  var DEVICE_ONLY = ['ph_server_uid', 'ph_lastStaminaRegen', 'ph_bgm_enabled', 'ph_sfx_volume'];
  var MAX_VALUE = 300000;        // 값 하나가 이 글자 수를 넘으면 올리지 않음 (서버 문서 크기 제한 보호)
  var MAX_TOTAL = 700000;        // 전체 합이 이 글자 수를 넘으면 나머지는 올리지 않음
  var SAVE_THROTTLE_MS = 4000;   // 저장값이 바뀐 뒤 서버 저장을 부르는 간격(최대 이 간격에 한 번)

  // ════════ 순수 로직 ════════
  function isExtraKey(k) {
    return typeof k === 'string' && k.indexOf(PREFIX) === 0 && ALREADY.indexOf(k) === -1 && DEVICE_ONLY.indexOf(k) === -1;
  }

  function collect() {                                       // 지금 기기의 'ph_' 저장값 중 올릴 것들
    var out = {}, total = 0, skipped = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!isExtraKey(k)) continue;
        var v = localStorage.getItem(k);
        if (v === null) continue;
        if (v.length > MAX_VALUE || total + v.length > MAX_TOTAL) { skipped.push(k); continue; }
        out[k] = v; total += v.length;
      }
    } catch (e) {}
    if (skipped.length) { try { console.warn('☁️ 너무 커서 서버에 못 올린 저장값:', skipped.join(', ')); } catch (e) {} }
    return out;
  }

  function applyExtra(data) {                                // 서버에서 받은 묶음을 이 기기에 되돌림
    var n = 0;
    if (!data || typeof data.extraStorage !== 'object' || !data.extraStorage) return n;
    Object.keys(data.extraStorage).forEach(function (k) {
      var v = data.extraStorage[k];
      if (!isExtraKey(k) || typeof v !== 'string') return;
      try { localStorage.setItem(k, v); n++; } catch (e) {}
    });
    return n;
  }

  // ════════ 기존 함수에 연결 ════════
  // (함수가 아직 로드 안 됐으면 잠깐 기다렸다가 시도 — 로더가 파일을 순서 없이 불러오기 때문)
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  var restoring = false;   // 서버에서 불러오는 중에는 저장을 부르지 않음 (불러오다 말고 덮어쓰는 사고 방지)

  // 1) 서버에 올리는 데이터에 extraStorage 추가
  whenReady(function () { return typeof window.getPocaServerPayload === 'function'; }, function () {
    var original = window.getPocaServerPayload;
    if (original.__cloudExtraWrapped) return;
    var wrapped = function () {
      var payload = original.apply(this, arguments);
      try {
        payload.extraStorage = collect();
        payload.extraSavedAt = new Date().toISOString();
      } catch (e) {}
      return payload;
    };
    wrapped.__cloudExtraWrapped = true;
    window.getPocaServerPayload = wrapped;
  });

  // 2) 서버 데이터를 불러올 때 extraStorage도 되돌림
  whenReady(function () { return typeof window.restorePocaDataFromServer === 'function'; }, function () {
    var original = window.restorePocaDataFromServer;
    if (original.__cloudExtraWrapped) return;
    var wrapped = function (data) {
      restoring = true;
      setTimeout(function () { restoring = false; }, 8000);
      var r = original.apply(this, arguments);
      try { applyExtra(data); } catch (e) {}
      return r;
    };
    wrapped.__cloudExtraWrapped = true;
    window.restorePocaDataFromServer = wrapped;
  });

  // 3) 'ph_' 저장값이 바뀌면 (saveAll을 안 부르는 기능도) 서버 저장을 부름
  var saveTimer = null;
  function queueSave() {
    if (saveTimer || restoring) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      if (restoring) return;
      if (typeof window.schedulePocaServerSave === 'function') window.schedulePocaServerSave('extra');
    }, SAVE_THROTTLE_MS);
  }
  try {
    var proto = (typeof Storage !== 'undefined') ? Storage.prototype : null;
    if (proto && typeof proto.setItem === 'function' && !proto.setItem.__cloudExtraWrapped) {
      var originalSetItem = proto.setItem;
      var wrappedSetItem = function (k) {
        var r = originalSetItem.apply(this, arguments);
        try { if (this === window.localStorage && isExtraKey(String(k))) queueSave(); } catch (e) {}
        return r;
      };
      wrappedSetItem.__cloudExtraWrapped = true;
      proto.setItem = wrappedSetItem;
    }
  } catch (e) {}

  window.__cloudExtraTest = { isExtraKey: isExtraKey, collect: collect, applyExtra: applyExtra, SAVE_THROTTLE_MS: SAVE_THROTTLE_MS };
})();
