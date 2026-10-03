// ════════════════════════════════
// 💎 소원의 결정 → 레어히든 카드 1장 (선택 3 추가)
// game.js의 showWishCrystalUse / useWishCrystal 을 감싸서 동작
// index.html에서 recombine-patch.js 보다 뒤에 불러오기
// ════════════════════════════════
(function () {
  function getRareHiddenPool() {
    if (typeof HIDDEN_CARDS === 'undefined' || typeof ownedHiddenCards === 'undefined') return null;
    return HIDDEN_CARDS.filter(function (h) {
      return typeof h.grade === 'string' && h.grade.indexOf('레어') !== -1;
    });
  }

  // 소원 선택 팝업 (기존 2개 + 레어히든)
  window.showWishCrystalUse = function () {
    var hasCrystal = bagItems.find(function (i) { return i.name === '소원의 결정'; });
    if (!hasCrystal) { showBagToast('소원의 결정이 없어요!'); return; }
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:32px 24px;text-align:center;width:90%;max-width:320px;">'
      + '<div style="font-size:48px;margin-bottom:8px;">💎</div>'
      + '<div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">소원의 결정 사용</div>'
      + '<div style="font-size:14px;color:#aaa;margin-bottom:24px;">무엇을 소원하시겠습니까?</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px;">'
      + '<button onclick="useWishCrystal(\'premium\');this.closest(\'div[style*=fixed]\').remove();" style="padding:16px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:14px;color:#1a1a2e;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">✨ 프리미엄 카드 선택권<br><span style="font-size:11px;font-weight:400;">원하는 프리미엄 카드 1장 획득</span></button>'
      + '<button onclick="useWishCrystal(\'confession\');this.closest(\'div[style*=fixed]\').remove();" style="padding:16px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">💝 진심의 고백<br><span style="font-size:11px;font-weight:400;">원하는 NPC 호감도 MAX</span></button>'
      + '<button onclick="useWishCrystal(\'hidden\');this.closest(\'div[style*=fixed]\').remove();" style="padding:16px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🌟 레어히든 카드<br><span style="font-size:11px;font-weight:400;">레어히든 카드 랜덤 1장 획득</span></button>'
      + '</div>'
      + '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="margin-top:14px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">취소</button></div>';
    document.body.appendChild(popup);
  };

  // 기존 useWishCrystal 감싸기: hidden만 새로 처리
  var originalUse = window.useWishCrystal;
  window.useWishCrystal = function (type) {
    if (type !== 'hidden') return originalUse.apply(this, arguments);

    var pool = getRareHiddenPool();
    if (pool === null) { showBagToast('재조합기 데이터가 아직 로드되지 않았어요!'); return; }
    if (pool.length === 0) { showBagToast('레어히든 카드 데이터를 찾지 못했어요!'); return; }

    // 아직 없는 카드 중에서만 뽑기 (중복이면 아무 의미 없으니까)
    var candidates = pool.filter(function (h) { return !ownedHiddenCards.includes(h.id); });
    if (candidates.length === 0) { showBagToast('🌟 레어히든 카드를 이미 전부 갖고 있어요! (결정은 소모되지 않아요)'); return; }

    if (!useFromBag('소원의 결정', 1)) return;
    var pick = candidates[Math.floor(Math.random() * candidates.length)];
    ownedHiddenCards.push(pick.id);
    localStorage.setItem('ph_hiddenCards', JSON.stringify(ownedHiddenCards));
    saveAll();
    if (typeof renderBag === 'function') renderBag();

    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
    var imgHtml = pick.img ? '<img src="' + pick.img + '" style="width:200px;aspect-ratio:3/4;object-fit:cover;border-radius:16px;border:3px solid #C084FC;box-shadow:0 0 30px #C084FC88;margin-bottom:12px;" onerror="this.style.display=\'none\'">' : '<div style="font-size:64px;margin-bottom:12px;">🌟</div>';
    popup.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:28px 22px;text-align:center;width:88%;max-width:300px;">'
      + imgHtml
      + '<div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:4px;">레어히든 카드 획득!</div>'
      + '<div style="font-size:15px;color:#fff;margin-bottom:16px;">' + (pick.name || pick.id) + '</div>'
      + '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button></div>';
    document.body.appendChild(popup);
    if (typeof playFanfare === 'function') playFanfare();
  };

  // 조각 100개 → 결정 전환 때 가방에 남는 🧩 아이템 정리
  // 전환 직후에는 조각 카운트가 0이라서, 그 상태에서 결정이 들어오면 가방 🧩을 통째로 지운다.
  // (결정 직접 드랍 0.01%일 때는 카운트가 남아 있으니 건드리지 않음)
  var originalEarned = window.showWishCrystalEarned;
  window.showWishCrystalEarned = function () {
    if (wishFragments === 0) {
      var frag = bagItems.find(function (i) { return i.name === '소원의 조각'; });
      if (frag) useFromBag('소원의 조각', frag.qty);
    }
    return originalEarned.apply(this, arguments);
  };
})();
