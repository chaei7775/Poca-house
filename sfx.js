// ════════════════════════════════
// 🔔 효과음 (sfx.js) — 브라우저가 직접 합성하는 소리라 소리 파일이 필요 없음
//  - 소리를 붙이는 곳: 뽑기 결과(등급별), 코인 획득, 레벨업, 스토리 퀘스트, 특별탐험 촬영 성공/실패, 데뷔 성공/탈락
//  - 왼쪽 아래 🔊 버튼을 누르면 [🎵 배경음악] / [🔔 효과음] 을 따로 켜고 끄고 크기도 조절할 수 있는 창이 열림
//  - 나중에 마음에 드는 소리 파일(mp3)이 생기면 아래 SFX_FILES에 한 줄 적으면 합성음 대신 그 파일이 나옴
//    예) var SFX_FILES = { coin: 'sfx-coin.mp3', levelup: 'sfx-levelup.mp3' };
//    쓸 수 있는 이름: coin reward levelup gachaLow gachaMid gachaHigh fail camera debutSuccess
//  - game.js 같은 기존 파일은 건드리지 않고, 기존 함수를 감싸서 소리만 얹음
// ════════════════════════════════
(function () {
  'use strict';

  var SFX_VOLUME = 1.0;     // 0 ~ 1 (효과음 전체 크기. 합성음 자체가 작아서 최대로 둠)
  var SFX_FILES = {};       // 소리 파일을 쓸 때만 채움 (비워두면 전부 합성음)
  var MIN_GAP_MS = 120;     // 같은 소리가 너무 자주 겹치지 않게
  var GAPS = { dig: 170, bfMiss: 160 };   // 소리별로 간격을 따로 주고 싶을 때

  var audioCtx = null;

  // 아이폰 무음(진동) 모드에서도 효과음이 나오게 함 (지원 안 하는 기기에선 그냥 무시됨)
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  var lastPlayed = {};
  var fileCache = {};

  function isOn() {   // 효과음 켜짐 여부 (배경음악과 따로 저장: ph_sfx_enabled)
    try { return localStorage.getItem('ph_sfx_enabled') !== 'off'; } catch (e) { return true; }
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
  function noise(t0, dur, vol, ftype, ffreq) {
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
    f.type = ftype || 'highpass';
    f.frequency.value = ffreq || 1800;
    if (f.type === 'bandpass') f.Q.value = 0.8;
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
    coin: function () { tone(1319, 0, 0.08, 'square', 0.22); tone(1760, 0.07, 0.16, 'square', 0.22); },
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
    // 숲: 나무 흔들 때 잎 부스럭 + 다 털리면 우수수
    shake: function () {
      noise(0, 0.22, 0.35, 'bandpass', 2600);
      noise(0.07, 0.2, 0.25, 'bandpass', 3400);
      tone(130, 0, 0.12, 'sine', 0.18, 90);
    },
    treeDrop: function () {
      noise(0, 0.55, 0.45, 'bandpass', 1700);
      noise(0.12, 0.4, 0.3, 'bandpass', 2800);
      tone(95, 0, 0.22, 'sine', 0.3, 50);
    },
    // 해변: 모래 파는 소리 + 뭔가 찾았을 때
    dig: function () {
      noise(0, 0.13, 0.5, 'lowpass', 900);
      noise(0.02, 0.07, 0.2, 'highpass', 3200);
    },
    digFind: function () {
      noise(0, 0.12, 0.3, 'lowpass', 1200);
      arp([784, 1047, 1319], 0.07, 0.16, 'triangle', 0.25);
    },
    // 공원: 나비 잡을 때 (휙 + 반짝), 헛탭은 작은 날갯짓
    bfCatch: function () {
      noise(0, 0.13, 0.3, 'bandpass', 1300);
      arp([1568, 2093, 2637], 0.055, 0.14, 'sine', 0.2);
    },
    bfMiss: function () {
      noise(0, 0.05, 0.16, 'highpass', 4200);
      noise(0.07, 0.05, 0.12, 'highpass', 4800);
    },
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
    if (lastPlayed[name] && now - lastPlayed[name] < (GAPS[name] || MIN_GAP_MS)) return;
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

  // ════════ 추가 효과음 ════════
  SYNTH.tap = function () { tone(1568, 0, 0.035, 'sine', 0.09); };
  SYNTH.page = function () { tone(880, 0, 0.05, 'triangle', 0.12); tone(1175, 0.04, 0.06, 'triangle', 0.1); };
  SYNTH.open = function () { noise(0, 0.1, 0.12, 'bandpass', 1800); tone(660, 0, 0.1, 'sine', 0.12, 990); };
  SYNTH.close = function () { tone(880, 0, 0.1, 'sine', 0.1, 560); };
  SYNTH.perfect = function () { arp([1047, 1319, 1568, 2093], 0.045, 0.14, 'triangle', 0.22); };
  SYNTH.munch = function () {   // 냠냠
    noise(0, 0.07, 0.28, 'bandpass', 900); tone(220, 0, 0.07, 'square', 0.1, 150);
    noise(0.16, 0.07, 0.28, 'bandpass', 1000); tone(240, 0.16, 0.07, 'square', 0.1, 160);
    noise(0.32, 0.07, 0.26, 'bandpass', 950); tone(230, 0.32, 0.07, 'square', 0.1, 150);
  };
  SYNTH.like = function () { arp([784, 988, 1319], 0.08, 0.16, 'sine', 0.22); tone(1760, 0.3, 0.25, 'sine', 0.12); };
  SYNTH.dislike = function () { tone(262, 0, 0.14, 'sawtooth', 0.12, 196); tone(196, 0.14, 0.26, 'sawtooth', 0.12, 130); };
  SYNTH.alarm = function () {   // 몰래 먹다 들킴
    tone(988, 0, 0.1, 'square', 0.2); tone(740, 0.12, 0.1, 'square', 0.2);
    tone(988, 0.26, 0.1, 'square', 0.2); tone(740, 0.38, 0.14, 'square', 0.2);
  };
  SYNTH.night = function () { arp([659, 523, 440, 330], 0.14, 0.3, 'sine', 0.2); };   // 하루 보내기
  SYNTH.stamp = function () { tone(110, 0, 0.1, 'sine', 0.35, 70); noise(0, 0.05, 0.3, 'lowpass', 700); tone(1319, 0.08, 0.14, 'triangle', 0.14); };
  SYNTH.cheer = function () { noise(0, 0.45, 0.2, 'bandpass', 2200); arp([523, 659, 784, 1047, 1319], 0.07, 0.2, 'triangle', 0.2); };

  window.pocaSfx.has = function (n) { return !!SYNTH[n]; };

  // 버튼/카드를 누르면 아주 작은 '톡' 소리 (이미 다른 효과음이 날 곳이라면 겹치지 않게 짧고 작음)
  var TAP_SEL = 'button, [onclick], [data-a], [data-r], [data-food], [data-cid], [data-type], [data-st], .card, .btn, .menu-btn, .nav-btn, .tab, .pc';
  document.addEventListener('click', function (e) {
    try {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#sfx-panel')) return;
      if (t.closest(TAP_SEL)) play('tap');
    } catch (err) {}
  }, true);

  // 퀘스트 완료(일반·스토리 모두)
  wrap('showQuestComplete', function () { play('reward'); });

  // 드라마 촬영: "PERFECT TIMING!" 이 뜨면 소리, 감독 OK 컷이면 환호
  (function watchDrama() {
    if (!document.body) { setTimeout(watchDrama, 100); return; }
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var added = list[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (!n || n.nodeType !== 1) continue;
          var tx = n.textContent || '';
          if (tx.length > 200) continue;
          if (tx.indexOf('PERFECT TIMING') !== -1) { play('perfect'); return; }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  })();

  // ════════ 낚시 · 강화 · 재조합 · 초월 효과음 ════════
  // 낚시: 물고기를 건져 올리는 순간 (첨벙 + 올라오는 소리 + 반짝)
  SYNTH.fishCatch = function () {
    noise(0, 0.28, 0.4, 'bandpass', 1400);
    tone(200, 0, 0.18, 'sine', 0.22, 90);
    arp([659, 880, 1175, 1568], 0.07, 0.16, 'triangle', 0.24);
    tone(2093, 0.32, 0.25, 'sine', 0.12);
  };
  // 긴장감: 강화·초월 (약 1초) — 낮은 울림이 올라가고 심장 소리가 빨라짐
  function heart(t) { tone(72, t, 0.13, 'sine', 0.38, 44); tone(60, t + 0.11, 0.12, 'sine', 0.28, 40); }
  SYNTH.tense = function () {
    tone(90, 0, 0.95, 'sawtooth', 0.11, 260);
    heart(0); heart(0.38); heart(0.65); heart(0.84);
    noise(0.3, 0.6, 0.1, 'highpass', 3500);
  };
  // 긴장감: 재조합 (약 3.4초) — 점점 높아지고 빨라지다가 결과 직전에 확 조용해짐
  SYNTH.tenseLong = function () {
    tone(110, 0, 3.3, 'sawtooth', 0.1, 520);
    tone(165, 0.4, 2.9, 'triangle', 0.08, 780);
    var t = 0, gap = 0.7;
    while (t < 3.0) { heart(t); t += gap; gap = Math.max(0.22, gap * 0.84); }
    noise(0.8, 2.4, 0.12, 'highpass', 4200);
    arp([1568, 1760, 1976, 2349], 0.1, 0.2, 'sine', 0.06);
  };
  SYNTH.enhOk = function () {
    noise(0, 0.1, 0.3); arp([523, 659, 784, 1047, 1319], 0.07, 0.2, 'triangle', 0.27);
    tone(2093, 0.4, 0.5, 'sine', 0.16);
  };
  SYNTH.transOk = function () {
    arp([392, 523, 659, 784, 1047, 1319, 1568, 2093], 0.09, 0.28, 'triangle', 0.26);
    tone(2637, 0.8, 0.8, 'sine', 0.16); tone(3136, 0.95, 0.8, 'sine', 0.1);
  };
  SYNTH.enhFail = function () { tone(392, 0, 0.2, 'triangle', 0.22, 294); tone(294, 0.18, 0.45, 'triangle', 0.22, 196); };
  SYNTH.shatter = function () {   // 카드가 사라짐
    noise(0, 0.35, 0.5, 'highpass', 2500); noise(0.04, 0.25, 0.3, 'bandpass', 5000);
    tone(180, 0.05, 0.6, 'sawtooth', 0.2, 50);
  };

  // 낚시: 물고기가 가방에 들어가는 순간
  wrap('addToBag', function (emoji, name, type, qty, desc) {
    if (desc && String(desc).indexOf('낚시로 잡은 물고기') !== -1) play('fishCatch');
  });

  // 재조합: 연출이 시작되면 긴장음 → 결과가 나오는 3.4초 뒤에 결과음
  wrap('playRecombineAnimation', function (result, card) {
    play('tenseLong');
    setTimeout(function () {
      if (result && result.type === 'hidden') play('gachaHigh');
      else if (card && card.grade) play(gachaSoundFor(card.grade));
      else play('gachaLow');
    }, 3450);
  });

  // 강화 · 초월: 결과 화면이 뜰 때 (enhance.js 는 건드리지 않고 화면 문구를 보고 소리를 냄)
  (function watchEnhance() {
    if (!document.body) { setTimeout(watchEnhance, 100); return; }
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var added = list[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (!n || n.nodeType !== 1) continue;
          var tx = n.textContent || '';
          if (!tx || tx.length > 260) continue;
          if (tx.indexOf('강화 중...') !== -1 || tx.indexOf('초월 중...') !== -1) { play('tense'); return; }
          if (tx.indexOf('카드가 사라졌어요') !== -1) { play('shatter'); return; }
          if (tx.indexOf('강화 성공!') !== -1) { play('enhOk'); return; }
          if (tx.indexOf('단계 완료!') !== -1 && tx.indexOf('초월') !== -1) { play('transOk'); return; }
          if (tx.indexOf('강화 실패') !== -1 || tx.indexOf('방지권이 대신') !== -1) { play('enhFail'); return; }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  })();

  // ════════ 🔊 소리 설정창 (왼쪽 아래 🔊 버튼) ════════
  function bgmOn() { try { return localStorage.getItem('ph_bgm_enabled') !== 'off'; } catch (e) { return true; } }
  function bgmVol() { var v = parseFloat(localStorage.getItem('ph_bgm_volume')); return isNaN(v) ? 0.4 : Math.max(0, Math.min(1, v)); }
  function applyBgmVol() { try { if (typeof setBgmVolume === 'function' && localStorage.getItem('ph_bgm_volume') !== null) setBgmVolume(bgmVol()); } catch (e) {} }

  function panelHtml() {
    var bOn = bgmOn(), sOn = isOn();
    function row(icon, name, on, id, vol) {
      return '<div style="margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<div style="font-size:13px;font-weight:700;color:#fff;">' + icon + ' ' + name + '</div>' +
        '<button id="' + id + '-t" style="min-width:56px;padding:5px 10px;border-radius:14px;border:none;font-weight:900;font-size:12px;cursor:pointer;' +
        (on ? 'background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;' : 'background:rgba(255,255,255,.15);color:#aaa;') + '">' + (on ? 'ON' : 'OFF') + '</button></div>' +
        '<input id="' + id + '-v" type="range" min="0" max="100" value="' + Math.round(vol * 100) + '" style="width:100%;' + (on ? '' : 'opacity:.4;') + '"></div>';
    }
    return '<div style="font-size:12px;color:#FFB3CC;font-weight:900;margin-bottom:10px;">🔊 소리 설정</div>' +
      row('🎵', '배경음악', bOn, 'sfx-bgm', bgmVol()) + row('🔔', '효과음', sOn, 'sfx-fx', getVolume());
  }
  function closePanel() { var p = document.getElementById('sfx-panel'); if (p) p.remove(); }
  function openPanel() {
    if (document.getElementById('sfx-panel')) { closePanel(); return; }
    var p = document.createElement('div');
    p.id = 'sfx-panel';
    p.style.cssText = 'position:fixed;left:10px;bottom:148px;z-index:1300;width:210px;padding:14px;border-radius:14px;background:rgba(26,26,46,.96);border:1.5px solid rgba(255,179,204,.5);box-shadow:0 6px 20px #0008;';
    function render() {
      p.innerHTML = panelHtml();
      p.querySelector('#sfx-bgm-t').onclick = function () {
        try { if (typeof toggleBgm === 'function') toggleBgm(); } catch (e) {}
        render();
      };
      p.querySelector('#sfx-bgm-v').oninput = function () {
        var v = this.value / 100; try { localStorage.setItem('ph_bgm_volume', String(v)); } catch (e) {}
        try { if (typeof setBgmVolume === 'function') setBgmVolume(v); } catch (e) {}
      };
      p.querySelector('#sfx-fx-t').onclick = function () {
        var on = isOn();
        try { localStorage.setItem('ph_sfx_enabled', on ? 'off' : 'on'); } catch (e) {}
        render(); if (!on) play('coin');
      };
      var fv = p.querySelector('#sfx-fx-v');
      fv.oninput = function () { window.pocaSfx.setVolume(this.value / 100); };
      fv.onchange = function () { play('coin'); };
    }
    render();
    document.body.appendChild(p);
    setTimeout(function () {
      document.addEventListener('click', function off(e) {
        if (e.target && e.target.closest && (e.target.closest('#sfx-panel') || e.target.closest('#bgm-toggle-btn'))) return;
        closePanel(); document.removeEventListener('click', off, true);
      }, true);
    }, 0);
  }
  (function hookButton(tries) {
    var b = document.getElementById('bgm-toggle-btn');
    if (!b) { if (tries < 100) setTimeout(function () { hookButton(tries + 1); }, 100); return; }
    b.onclick = function (e) { e.stopPropagation(); openPanel(); };
    applyBgmVol();
  })(0);
  window.pocaSfx.openPanel = openPanel;
})();
