// ════════════════════════════════
// 💿 앨범 제작 (album-studio.js)
// 🎹 작곡 스튜디오(studio-explore.js)에서 모은 음악 재료로 앨범을 만들고, 만든 앨범을 코인으로 판다.
// 열기: 더보기 메뉴 > 💿 앨범 제작
//
// 앨범은 3단계. 단계가 높을수록 재료는 많이 들지만 재료 하나당 값어치가 조금 더 높다.
//   💿 데모 앨범 / 💽 미니 앨범 / 📀 정규 앨범
// 만든 앨범은 가방에 쌓이고, 이 화면에서 판다. (재료는 못 팔고 앨범으로만 코인이 됨)
// 값을 바꾸고 싶으면 아래 ALBUMS 만 고치면 됨. 재료 이름은 studio-explore.js 와 같아야 함.
// ════════════════════════════════
(function () {
  'use strict';

  var ACC = '#ffb86b';
  var ALBUMS = [
    { id: 'demo', emoji: '💿', name: '데모 앨범',   price: 6000,  need: [['🎵', '음표조각', 25], ['🎼', '악보용지', 8]],
      desc: '첫 녹음을 담은 데모 CD' },
    { id: 'mini', emoji: '💽', name: '미니 앨범',   price: 18000, need: [['🎵', '음표조각', 60], ['🎼', '악보용지', 20], ['📝', '가사조각', 10]],
      desc: '타이틀곡이 있는 미니 앨범' },
    { id: 'full', emoji: '📀', name: '정규 앨범',   price: 45000, need: [['🎵', '음표조각', 120], ['🎼', '악보용지', 40], ['📝', '가사조각', 25], ['💡', '영감의불꽃', 10]],
      desc: '모든 걸 쏟아부은 정규 앨범' }
  ];
  var TITLES_A = ['달빛', '새벽', '반짝이는', '첫눈', '마지막', '푸른', '비밀', '여름밤', '별빛', '두근두근'];
  var TITLES_B = ['세레나데', '러브레터', '멜로디', '플레이리스트', '노래', '약속', '왈츠', '기억', '엔딩', '인사'];

  // ════════ 순수 로직 ════════
  function qtyOf(name, items) {
    var it = (items || []).filter(function (i) { return i.name === name; })[0];
    return it ? Math.max(0, Math.floor(Number(it.qty) || 0)) : 0;
  }
  function canCraft(album, items) { return album.need.every(function (n) { return qtyOf(n[1], items) >= n[2]; }); }
  function albumByName(a) { return ALBUMS.filter(function (x) { return x.name === a; })[0]; }
  function albumTitle(rng) {
    rng = rng || Math.random;
    return TITLES_A[Math.floor(rng() * TITLES_A.length)] + ' ' + TITLES_B[Math.floor(rng() * TITLES_B.length)];
  }

  function bag() { try { return bagItems; } catch (e) { return []; } }
  function toast(m) { try { showBagToast(m); } catch (e) {} }
  function sfx(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }

  function craft(id) {
    var a = ALBUMS.filter(function (x) { return x.id === id; })[0];
    if (!a) return false;
    if (!canCraft(a, bag())) { toast('재료가 부족해요! 🎹 작곡 스튜디오에서 모아봐요'); return false; }
    // 재료를 먼저 빼고 앨범을 넣는다 (가방이 꽉 차서 실패하면 재료를 돌려놓음)
    a.need.forEach(function (n) { useFromBag(n[1], n[2]); });
    var ok = addToBag(a.emoji, a.name, 'album', 1, '판매하면 코인 ' + a.price.toLocaleString() + ' · 더보기 > 💿 앨범 제작에서 팔아요');
    if (!ok) { a.need.forEach(function (n) { addToBag(n[0], n[1], 'material', n[2], ''); }); return false; }
    return albumTitle();
  }
  function sell(id, count) {
    var a = ALBUMS.filter(function (x) { return x.id === id; })[0];
    if (!a) return 0;
    var have = qtyOf(a.name, bag()), n = Math.min(count || have, have);
    if (n <= 0) return 0;
    useFromBag(a.name, n);
    coins += a.price * n;
    try { updateCoinsDisplay(); saveAll(); } catch (e) {}
    return a.price * n;
  }

  // ════════ 화면 ════════
  var ROOT = 'album-overlay';
  function openAlbum() {
    var old = document.getElementById(ROOT); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = ROOT;
    ov.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;font-family:\'Noto Sans KR\',sans-serif;';
    document.body.appendChild(ov);
    render(ov);
  }
  function chip(emoji, name, need) {
    var have = qtyOf(name, bag()), ok = have >= need;
    return '<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:900;background:' + (ok ? 'rgba(74,222,128,.18)' : 'rgba(248,113,113,.18)') + ';color:' + (ok ? '#86efac' : '#fca5a5') + ';">' +
      emoji + ' ' + name + ' ' + have + '/' + need + '</span>';
  }
  function render(ov, msg) {
    var rows = ALBUMS.map(function (a) {
      var can = canCraft(a, bag()), own = qtyOf(a.name, bag());
      return '<div style="background:rgba(255,255,255,0.06);border:1.5px solid ' + (can ? ACC : 'rgba(255,255,255,0.15)') + ';border-radius:14px;padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;"><div style="font-size:30px;">' + a.emoji + '</div>' +
        '<div style="flex:1;"><div style="font-size:15px;font-weight:900;color:#fff;">' + a.name + '</div><div style="font-size:11px;color:#aaa;">' + a.desc + '</div></div>' +
        '<div style="text-align:right;font-size:12px;font-weight:900;color:#FFD700;">🍔 ' + a.price.toLocaleString() + '</div></div>' +
        '<div style="margin-bottom:8px;">' + a.need.map(function (n) { return chip(n[0], n[1], n[2]); }).join('') + '</div>' +
        '<div style="display:flex;gap:8px;">' +
        '<button data-craft="' + a.id + '" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (can ? 'linear-gradient(135deg,#ffb86b,#ff6fb1)' : '#555') + ';">🎶 만들기</button>' +
        '<button data-sell="' + a.id + '" style="flex:1;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (own ? 'linear-gradient(135deg,#4ade80,#22c55e)' : '#555') + ';">💰 판매 (보유 ' + own + ')</button>' +
        '</div></div>';
    }).join('');
    ov.innerHTML = '<div style="width:92%;max-width:380px;max-height:88vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#3a2216);border:2px solid ' + ACC + ';border-radius:20px;padding:18px 16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;"><div style="font-size:18px;font-weight:900;color:#fff;">💿 앨범 제작</div>' +
      '<button id="album-x" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:12px;line-height:1.5;">🎹 작곡 스튜디오에서 모은 재료로 앨범을 만들고 팔아요.</div>' +
      (msg ? '<div style="background:rgba(255,184,107,.16);border-radius:10px;padding:8px 10px;font-size:12px;font-weight:900;color:#ffd9a8;margin-bottom:10px;">' + msg + '</div>' : '') +
      rows + '</div>';
    document.getElementById('album-x').onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-craft]'), function (b) {
      b.onclick = function () {
        var t = craft(b.getAttribute('data-craft'));
        if (t) { sfx('reward'); render(ov, '🎶 〈' + t + '〉 발매 완료! 앨범이 가방에 들어왔어요'); } else render(ov);
      };
    });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-sell]'), function (b) {
      b.onclick = function () {
        var got = sell(b.getAttribute('data-sell'));
        if (got) { sfx('coin'); render(ov, '💰 앨범 판매! 🍔 +' + got.toLocaleString()); } else toast('팔 앨범이 없어요');
      };
    });
  }

  window.openAlbumStudio = openAlbum;
  window.__albumTest = { ALBUMS: ALBUMS, canCraft: canCraft, qtyOf: qtyOf, craft: craft, sell: sell, albumTitle: albumTitle };

  // ════════ 더보기 메뉴 타일 ════════
  (function wait() {
    if (typeof window.openMoreMenu !== 'function' || typeof window.moreMenuTileHtml !== 'function') { setTimeout(wait, 100); return; }
    var original = window.openMoreMenu;
    if (original.__albumWrapped) return;
    var wrapped = function () {
      var res = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-album-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('💿', '앨범 제작', ACC, 'openAlbumStudio()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-album-tile';
      }
      return res;
    };
    wrapped.__albumWrapped = true;
    window.openMoreMenu = wrapped;
  })();
})();
