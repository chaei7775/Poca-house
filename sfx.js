// ════════════════════════════════
// 🔔 효과음 (sfx.js) — 브라우저가 직접 합성하는 소리라 소리 파일이 필요 없음
//  - 소리를 붙이는 곳: 뽑기 결과(등급별), 코인 획득, 레벨업, 스토리 퀘스트, 특별탐험 촬영 성공/실패, 데뷔 성공/탈락
//  - 기존 🔊 버튼(배경음악 켜기/끄기)으로 효과음도 같이 켜고 끔
//  - 나중에 마음에 드는 소리 파일(mp3)이 생기면 아래 SFX_FILES에 한 줄 적으면 합성음 대신 그 파일이 나옴
//    예) var SFX_FILES = { coin: 'sfx-coin.mp3', levelup: 'sfx-levelup.mp3' };
//    쓸 수 있는 이름: coin reward levelup gachaLow gachaMid gachaHigh fail camera debutSuccess
//  - game.js 같은 기존 파일은 건드리지 않고, 기존 함수를 감싸서 소리만 얹음
// ════════════════════════════════
(function () {
  'use strict';

  var SFX_VOLUME = 0.5;     // 0 ~ 1 (효과음 전체 크기. 배경음악보다 작게 시작)
  var SFX_FILES = {};       // 소리 파일을 쓸 때만 채움 (비워두면 전부 합성음)
  var MIN_GAP_MS = 120;     // 같은 소리가 너무 자주 겹치지 않게

  var audioCtx = null;
  var lastPlayed = {};
  var fileCache = {};

  function isOn() {
    try { return localStorage.getItem('ph_bgm_enabled') !== 'off'; } catch (e) { return true; }
  }
  function getVolume() {
    var v = parseFloat(localStorage.getItem('ph_sfx_volume'));
    return isNaN(v) ? SFX_VOLUME : Math.max(0, Math.min(1, v));
  }

  // 브라우저는 사용자가 화면을 누른 뒤에야 소리를 허용함 → 첫 터치 때 준비
  function ensureCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
    return audioCtx;
  }
  ['click', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () { ensureCtx(); }, { passive: true });
  });

  // ── 합성 도구 ──
  function tone(freq, t0, dur, type, vol, slideTo) {
    var c = ensureCtx();
    if (!c) return;
    var start = c.currentTime + t0;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    var v = Math.max(0.0001, (vol || 0.25) * getVolume());
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(v, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + dur + 0.03);
  }
  function noise(t0, dur, vol) {
    var c = ensureCtx();
    if (!c) return;
    var start = c.currentTime + t0;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    var g = c.createGain();
    var f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    src.buffer = buf;
    g.gain.value = Math.max(0.0001, (vol || 0.3) * getVolume());
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(start);
  }
  function arp(notes, step, dur, type, vol) {
    notes.forEach(function (f, i) { tone(f, i * step, dur, type, vol); });
  }

  // ── 소리 목록 ──
  var SYNTH = {
    coin: function () { tone(1319, 0, 0.08, 'square', 0.12); tone(1760, 0.07, 0.16, 'square', 0.12); },
    reward: function () { arp([523, 659, 784, 1047], 0.08, 0.18, 'triangle', 0.25); },
    levelup: function () {
      arp([523, 659, 784, 1047, 1319], 0.09, 0.22, 'triangle', 0.28);
      tone(1568, 0.45, 0.4, 'sine', 0.2);
    },
    gachaLow: function () { tone(880, 0, 0.12, 'sine', 0.2); tone(1175, 0.1, 0.2, 'sine', 0.2); },
    gachaMid: function () {
      arp([784, 988, 1175, 1568], 0.09, 0.2, 'triangle', 0.25);
      tone(2093, 0.38, 0.3, 'sine', 0.12);
    },
    gachaHigh: function () {
      arp([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 0.3, 'triangle', 0.28);
      tone(1568, 0.85, 0.5, 'sine', 0.22);
      tone(2093, 0.95, 0.6, 'sine', 0.16);
      tone(2637, 1.05, 0.7, 'sine', 0.12);
    },
    fail: function () { tone(330, 0, 0.18, 'triangle', 0.25, 247); tone(247, 0.16, 0.32, 'triangle', 0.25, 165); },
    camera: function () { noise(0, 0.05, 0.35); tone(2000, 0, 0.03, 'square', 0.1); noise(0.09, 0.07, 0.3); },
    debutSuccess: function () {
      arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.11, 0.28, 'triangle', 0.28);
      tone(2093, 0.95, 0.6, 'sine', 0.16);
    }
  };

  function playFile(name) {
    var src = SFX_FILES[name];
    if (!src) return false;
    try {
      var a = fileCache[name] || (fileCache[name] = new Audio(src));
      a.volume = getVolume();
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }

  function play(name) {
    if (!isOn() || getVolume() <= 0) return;
    var now = Date.now();
    if (lastPlayed[name] && now - lastPlayed[name] < MIN_GAP_MS) return;
    lastPlayed[name] = now;
    try {
      if (playFile(name)) return;
      if (SYNTH[name]) SYNTH[name]();
    } catch (e) { /* 소리 때문에 게임이 멈추면 안 됨 */ }
  }

  window.pocaSfx = {
    play: play,
    setVolume: function (v) { localStorage.setItem('ph_sfx_volume', String(Math.max(0, Math.min(1, v)))); },
    isOn: isOn
  };

  // ── 기존 함수 감싸기 (함수가 아직 없으면 잠깐 기다렸다가 시도) ──
  function wrap(fnName, before) {
    var tries = 0;
    (function attempt() {
      if (typeof window[fnName] !== 'function') {
        if (++tries < 100) setTimeout(attempt, 100);
        return;
      }
      if (window[fnName].__sfxWrapped) return;
      var original = window[fnName];
      var wrapped = function () {
        try { before.apply(this, arguments); } catch (e) {}
        return original.apply(this, arguments);
      };
      wrapped.__sfxWrapped = true;
      window[fnName] = wrapped;
    })();
  }

  function gachaSoundFor(grade) {
    if (grade === 'SSR' || grade === 'UR') return 'gachaHigh';
    if (grade === 'SR') return 'gachaMid';
    return 'gachaLow';
  }
  var RANK = ['N', 'R', 'SR', 'SSR', 'UR'];

  // 뽑기: 한 장은 그 카드 등급, 여러 장은 그중 제일 높은 등급 기준
  wrap('showGachaResult', function (card) { if (card) play(gachaSoundFor(card.grade)); });
  wrap('showGachaResultMulti', function (cards) {
    if (!Array.isArray(cards) || !cards.length) return;
    var best = 'N';
    cards.forEach(function (c) { if (c && RANK.indexOf(c.grade) > RANK.indexOf(best)) best = c.grade; });
    play(gachaSoundFor(best));
  });

  // 코인 획득(알바 등): 얻을 때만, 잃을 때는 소리 없음
  wrap('spawnCoinFloat', function (earn) { if (earn > 0) play('coin'); });

  // 레벨업(플레이어/포카), 스토리 퀘스트 완료
  wrap('showLevelUpPopup', function () { play('levelup'); });
  wrap('showCardLevelUpToast', function () { play('levelup'); });
  wrap('showStoryQuestToast', function () { play('reward'); });

  // 특별탐험 촬영: 성공이면 셔터 + 보상음, 실패면 실패음
  wrap('resolveSpecialCapture', function (success) {
    if (success) { play('camera'); setTimeout(function () { play('reward'); }, 220); }
    else play('fail');
  });

  // 기획사 데뷔 결과: 화면이 바뀌는 순간 문구를 보고 소리를 냄 (agency.js는 건드리지 않음)
  (function watchAgency() {
    if (!document.body) { setTimeout(watchAgency, 100); return; }
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (!t || t.id !== 'agency-overlay') continue;
        var text = t.textContent || '';
        if (text.indexOf('데뷔 성공!') !== -1) { play('debutSuccess'); return; }
        if (text.indexOf('이번엔 아쉽게 탈락') !== -1) { play('fail'); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  })();
})();
