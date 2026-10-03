// ════════════════════════════════
// 🛒 수량 선택 패치 (1~100개 한 번에 사고팔기)
// game.js / recombine.js / special-explore.js 는 건드리지 않고 아래 함수만 덮어쓴다.
//  - 상점 선물/음료 구매 (buyGift, buyDrink)
//  - 재료 판매 (재료 탭의 '판매' 버튼)
//  - 특별탐험 먹이/포획도구 구매 (buySpecialFood, buyCaptureTool)
// 한 번에 고를 수 있는 최대 수량만 바꾸고 싶으면 아래 한 줄만 수정.
// ════════════════════════════════

const QP_MAX = 100;

function qpEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function qpCanFit(name) {
  return bagItems.some(function(i) { return i.name === name; }) || bagItems.length < bagSlots;
}

function qpToast(msg) {
  if (typeof showShopToast === 'function') showShopToast(msg);
  else if (typeof showBagToast === 'function') showBagToast(msg);
}

function qpClose() {
  const o = document.getElementById('qp-overlay');
  if (o) o.remove();
}

// cfg: { mode:'buy'|'sell', emoji, name, unit, max, onConfirm(n) }
function qpOpen(cfg) {
  qpClose();
  const max = Math.min(QP_MAX, cfg.max);
  if (max < 1) {
    if (typeof showBagToast === 'function') showBagToast(cfg.mode === 'buy' ? '코인이 부족해요!' : '팔 수 있는 게 없어요!');
    return;
  }
  const isBuy = cfg.mode === 'buy';
  let n = 1;

  const ov = document.createElement('div');
  ov.id = 'qp-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.onclick = function(e) { if (e.target === ov) qpClose(); };

  const btn = 'border:none;border-radius:10px;font-family:\'Noto Sans KR\',sans-serif;font-weight:900;cursor:pointer;';
  ov.innerHTML =
    '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:22px 20px;text-align:center;">' +
      '<div style="font-size:44px;margin-bottom:4px;">' + qpEsc(cfg.emoji) + '</div>' +
      '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:2px;">' + qpEsc(cfg.name) + '</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:14px;">개당 🍔 ' + cfg.unit.toLocaleString() + '코인 · ' + (isBuy ? '최대 ' + max + '개' : '보유 ' + cfg.max + '개') + (cfg.max > QP_MAX ? ' · 한 번에 ' + QP_MAX + '개까지' : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
        '<button id="qp-minus" style="' + btn + 'width:40px;height:40px;background:rgba(255,255,255,0.1);color:#fff;font-size:20px;">−</button>' +
        '<input id="qp-range" type="range" min="1" max="' + max + '" value="1" step="1" style="flex:1;accent-color:#FF6B9D;height:28px;">' +
        '<button id="qp-plus" style="' + btn + 'width:40px;height:40px;background:rgba(255,255,255,0.1);color:#fff;font-size:20px;">+</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;">' +
        '<input id="qp-num" type="number" inputmode="numeric" min="1" max="' + max + '" value="1" style="width:84px;text-align:center;font-size:22px;font-weight:900;color:#FFD700;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;padding:6px 0;font-family:\'Noto Sans KR\',sans-serif;">' +
        '<span style="color:#aaa;font-size:14px;">개</span>' +
        '<button id="qp-max" style="' + btn + 'padding:9px 14px;background:rgba(192,132,252,0.25);color:#e9d5ff;font-size:12px;">최대</button>' +
      '</div>' +
      '<div id="qp-total" style="font-size:14px;font-weight:700;color:#fff;margin:10px 0 16px;"></div>' +
      '<button id="qp-ok" style="' + btn + 'width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;margin-bottom:8px;"></button>' +
      '<button id="qp-cancel" style="' + btn + 'width:100%;padding:11px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;">취소</button>' +
    '</div>';
  document.body.appendChild(ov);

  const range = ov.querySelector('#qp-range');
  const num = ov.querySelector('#qp-num');
  const total = ov.querySelector('#qp-total');
  const ok = ov.querySelector('#qp-ok');

  function setN(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = 1;
    n = Math.max(1, Math.min(max, v));
    range.value = n;
    num.value = n;
    const sum = n * cfg.unit;
    total.textContent = isBuy ? ('합계 🍔 ' + sum.toLocaleString() + '코인 (남는 코인 ' + (coins - sum).toLocaleString() + ')')
                              : ('합계 🍔 +' + sum.toLocaleString() + '코인');
    ok.textContent = n + '개 ' + (isBuy ? '구매' : '판매');
  }
  setN(1);

  range.oninput = function() { setN(range.value); };
  num.oninput = function() { if (num.value !== '') setN(num.value); };
  num.onchange = function() { setN(num.value); };
  ov.querySelector('#qp-minus').onclick = function() { setN(n - 1); };
  ov.querySelector('#qp-plus').onclick = function() { setN(n + 1); };
  ov.querySelector('#qp-max').onclick = function() { setN(max); };
  ov.querySelector('#qp-cancel').onclick = qpClose;
  ok.onclick = function() {
    const count = n;
    qpClose();
    cfg.onConfirm(count);
  };
}

function qpAfterShopBuy() {
  const el = document.getElementById('shop-coin-display');
  if (el) el.textContent = coins;
  if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
}

(function applyQtyPickerPatch() {
  const need = ['buyGift', 'buyDrink', 'renderMaterialShop', 'sellMaterial', 'buySpecialFood', 'buyCaptureTool', 'addToBag', 'saveAll'];
  for (let i = 0; i < need.length; i++) {
    if (typeof window[need[i]] !== 'function') { setTimeout(applyQtyPickerPatch, 50); return; }
  }
  if (window.__qtyPickerApplied) return;
  window.__qtyPickerApplied = true;

  // ── 선물 구매 ──
  window.buyGift = function(itemName, price) {
    const emoji = itemName.match(/[\u{1F300}-\u{1FFFF}]|[☀-⛿]/gu)?.[0] || '🎁';
    const cleanName = (itemName.replace(/[\u{1F300}-\u{1FFFF}]|[☀-⛿]/gu, '').trim()) || itemName;
    qpOpen({
      mode: 'buy', emoji: emoji, name: cleanName, unit: price, max: Math.floor(coins / price),
      onConfirm: function(n) {
        if (coins < price * n) { showBagToast('코인이 부족해요!'); return; }
        if (!qpCanFit(cleanName)) { showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요'); return; }
        const affExp = getGiftAffExp(itemName);
        if (!addToBag(emoji, cleanName, 'gift', n, '호감도 경험치 +' + affExp + ' 선물 아이템', affExp)) return;
        coins -= price * n;
        if (!inventory[itemName]) inventory[itemName] = 0;
        inventory[itemName] += n;
        saveAll();
        qpAfterShopBuy();
        renderInventoryDisplay();
        if (typeof spawnCoinFloat === 'function') spawnCoinFloat(-price * n);
        qpToast(itemName + ' ' + n + '개 구매 완료! 🎁');
      }
    });
  };

  // ── 음료 구매 ──
  window.buyDrink = function(itemName, price, staminaUp) {
    const emoji = itemName.match(/[\u{1F300}-\u{1FFFF}]|[☀-⛿]/gu)?.[0] || '🥤';
    const cleanName = (itemName.replace(/[\u{1F300}-\u{1FFFF}]|[☀-⛿]/gu, '').trim()) || itemName;
    qpOpen({
      mode: 'buy', emoji: emoji, name: cleanName, unit: price, max: Math.floor(coins / price),
      onConfirm: function(n) {
        if (coins < price * n) { showBagToast('코인이 부족해요!'); return; }
        if (!qpCanFit(cleanName)) { showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요'); return; }
        if (!addToBag(emoji, cleanName, 'drink', n, '스태미나 +' + staminaUp + ' 회복 음료')) return;
        coins -= price * n;
        saveAll();
        qpAfterShopBuy();
        if (typeof spawnCoinFloat === 'function') spawnCoinFloat(-price * n);
        qpToast(itemName + ' ' + n + '개 구매 완료! 🎒 가방에서 마실 수 있어요');
      }
    });
  };

  // ── 재료 판매: 목록은 원본이 그리고, 버튼만 수량 선택으로 바꾼다 ──
  const originalRenderMaterialShop = window.renderMaterialShop;
  window.renderMaterialShop = function() {
    const r = originalRenderMaterialShop.apply(this, arguments);
    const el = document.getElementById('material-shop-list');
    if (el) {
      el.querySelectorAll('button[onclick^="sellMaterial("]').forEach(function(b) {
        const m = b.getAttribute('onclick').match(/^sellMaterial\('(.*)',1\)$/);
        if (!m) return;
        const name = m[1];
        b.removeAttribute('onclick');
        b.textContent = '판매';
        b.onclick = function() { qpSell(name); };
      });
    }
    return r;
  };

  window.qpSell = function(name) {
    const item = bagItems.find(function(i) { return i.name === name && i.type === 'material'; });
    if (!item) { showBagToast('재료가 부족해요!'); return; }
    const price = (typeof MATERIAL_SELL_PRICES !== 'undefined' && MATERIAL_SELL_PRICES[name]) || 0;
    qpOpen({
      mode: 'sell', emoji: item.emoji, name: name, unit: price, max: item.qty,
      onConfirm: function(n) { window.sellMaterial(name, n); }
    });
  };

  // ── 특별탐험 먹이 구매 ──
  window.buySpecialFood = function(food) {
    qpOpen({
      mode: 'buy', emoji: '🍓', name: food, unit: SPECIAL_FOOD_PRICE, max: Math.floor(coins / SPECIAL_FOOD_PRICE),
      onConfirm: function(n) {
        if (coins < SPECIAL_FOOD_PRICE * n) { showBagToast('코인이 부족해요!'); return; }
        if (!qpCanFit(food)) { showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요'); return; }
        if (!addToBag('🍓', food, 'food', n, '특별탐험 먹이')) return;
        coins -= SPECIAL_FOOD_PRICE * n;
        saveAll();
        qpAfterShopBuy();
        openFoodShop();
        renderSpecialFeedScreen();
        showBagToast(food + ' ' + n + '개 구매!');
      }
    });
  };

  // ── 특별탐험 포획도구 구매 ──
  window.buyCaptureTool = function(toolId) {
    const tool = CAPTURE_TOOLS.find(function(t) { return t.id === toolId; });
    if (!tool) return;
    qpOpen({
      mode: 'buy', emoji: tool.emoji, name: tool.name, unit: tool.price, max: Math.floor(coins / tool.price),
      onConfirm: function(n) {
        if (coins < tool.price * n) { showBagToast('코인이 부족해요!'); return; }
        if (!qpCanFit(tool.name)) { showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요'); return; }
        if (!addToBag(tool.emoji, tool.name, 'tool', n, '레어 변종 포획 마무리용')) return;
        coins -= tool.price * n;
        saveAll();
        qpAfterShopBuy();
        openToolShop();
        renderCaptureToolScreen();
        showBagToast(tool.name + ' ' + n + '개 구매!');
      }
    });
  };
})();
