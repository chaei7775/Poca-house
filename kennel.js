// ════════════════════════════════
// 🐾 분양소 (kennel.js)
// 광장 메뉴에 "🐾 분양소" 버튼을 붙인다. (game.js / index.html은 건드리지 않음)
//
// - 마당(탑뷰)을 탭해서 먹이를 놓으면 동물이 다가와 냄새를 맡아요.
// - 맞는 먹이면 클로즈업 화면에서 타이밍을 맞춰 분양! 틀린 먹이면 킁킁하다 가버려요.
// - 분양받은 동물은 드라마 촬영의 조연으로 쓸 예정 (window.__kennel.owned() 로 목록 확인)
// - 먹이는 분양소 안 가게에서 코인으로 구매 → 가방(재료)에 들어가요.
// - 저장 키: ph_kennel   /  이미지: kennel/<id>_top.png (탑뷰), kennel/<id>_close.png (클로즈업)
//   이미지가 없으면 이모지로 대신 보여요.
// ════════════════════════════════
(function () {
'use strict';
if (window.__kennelLoaded) return; window.__kennelLoaded = true;

// ───────── ⚙️ 설정 (숫자/이름만 고치면 됨) ─────────
const ANIMALS = [
  { id: 'dog',  emoji: '🐶', name: '강아지', food: '육포' },
  { id: 'cat',  emoji: '🐱', name: '고양이', food: '멸치' },
  { id: 'pig',  emoji: '🐷', name: '아기돼지', food: '고구마' },
  { id: 'bird', emoji: '🐦', name: '새',    food: '곡식' }
];
const FOODS = [
  { name: '육포',   emoji: '🍖', price: 500, desc: '강아지가 좋아하는 간식' },
  { name: '멸치',   emoji: '🐟', price: 500, desc: '고양이가 좋아하는 간식' },
  { name: '고구마', emoji: '🍠', price: 500, desc: '아기돼지가 좋아하는 간식' },
  { name: '곡식',   emoji: '🌾', price: 500, desc: '새가 좋아하는 간식' }
];
const CFG = { RIGHT_RATE: 0.65, ARRIVE_DELAY: 1.2, SPEED: 80, ZONE: 0.34, METER_SPEED: 1.5 };
const KEY = 'ph_kennel';
const IMG = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/kennel/';

// ───────── 저장 ─────────
let S;
function load() { try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} if (!S || !S.got) S = { got: {}, tries: 0, food: FOODS[0].name }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
load();
const byId = id => ANIMALS.find(a => a.id === id);
const foodOf = n => FOODS.find(f => f.name === n);
function bagQty(name) { try { const it = bagItems.find(i => i.name === name); return it ? it.qty : 0; } catch (e) { return 0; } }
function coinsNow() { try { return coins; } catch (e) { return 0; } }

// ───────── 화면 ─────────
const CSS = `#kn-root{position:fixed;inset:0;z-index:781;background:#1b2a1d;color:#fff;font-family:"Noto Sans KR",system-ui,sans-serif;display:flex;flex-direction:column;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
#kn-root[hidden],#kn-root [hidden]{display:none!important}
#kn-root,#kn-root *{box-sizing:border-box}
#kn-root button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
#kn-top{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.35)}
#kn-top b{font-size:16px}
#kn-top .x{font-size:20px;padding:4px 8px}
#kn-wrap{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;background:#2f5a35}
#kn-cv{display:block;max-width:100%;max-height:100%;touch-action:manipulation}
#kn-msg{position:absolute;left:0;right:0;top:10px;text-align:center;font-size:13px;pointer-events:none;text-shadow:0 1px 3px #000}
#kn-bar{background:rgba(0,0,0,.45);padding:8px 10px 12px}
#kn-foods{display:flex;gap:6px;margin-bottom:8px}
#kn-foods button{flex:1;padding:7px 2px;border-radius:10px;background:rgba(255,255,255,.1);border:2px solid transparent;font-size:12px;line-height:1.3}
#kn-foods button.on{border-color:#ffd54a;background:rgba(255,213,74,.2)}
#kn-foods button.no{opacity:.45}
#kn-foods .e{font-size:22px;display:block}
#kn-acts{display:flex;gap:6px}
#kn-acts button{flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,.14);font-size:13px;font-weight:700}
#kn-close{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#4a3a28,#1c140d);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;z-index:3}
#kn-close .face{font-size:120px;line-height:1;animation:knSniff .55s ease-in-out infinite}
#kn-close .face img{width:200px;height:200px;object-fit:contain}
#kn-close .food{font-size:46px;animation:knBob 1s ease-in-out infinite}
#kn-close .t{font-size:15px;min-height:22px}
#kn-meter{width:78%;max-width:320px;height:22px;border-radius:12px;background:rgba(255,255,255,.15);position:relative;overflow:hidden}
#kn-zone{position:absolute;top:0;bottom:0;background:rgba(79,227,193,.6)}
#kn-mk{position:absolute;top:-2px;bottom:-2px;width:6px;margin-left:-3px;background:#fff;border-radius:3px}
#kn-grab{padding:12px 36px;border-radius:14px;background:#ffd54a;color:#222;font-weight:900;font-size:16px}
#kn-shop,#kn-dex{position:absolute;inset:0;background:rgba(10,18,12,.96);z-index:4;padding:14px;overflow:auto}
#kn-shop h3,#kn-dex h3{margin:0 0 10px;font-size:16px}
.kn-row{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:8px;border-radius:12px;background:rgba(255,255,255,.08)}
.kn-row .e{font-size:30px;width:40px;text-align:center}
.kn-row .i{flex:1;font-size:13px}
.kn-row .i small{display:block;color:#aab;font-size:11px}
.kn-row button{padding:8px 12px;border-radius:10px;background:#ffd54a;color:#222;font-weight:800;font-size:12px}
.kn-row button:disabled{opacity:.4}
.kn-back{margin-top:6px;width:100%;padding:11px;border-radius:12px;background:rgba(255,255,255,.14);font-weight:700}
@keyframes knSniff{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.08) rotate(2deg)}}
@keyframes knBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.kn-img{width:100%;height:100%;object-fit:contain}`;

const R = document.createElement('div');
R.id = 'kn-root'; R.hidden = true;
R.innerHTML = '<style>' + CSS + '</style>' +
  '<div id="kn-top"><b>🐾 분양소</b><span id="kn-coin"></span><button class="x" id="kn-x">✕</button></div>' +
  '<div id="kn-wrap"><canvas id="kn-cv" width="360" height="480"></canvas><div id="kn-msg"></div>' +
  '<div id="kn-close" hidden></div><div id="kn-shop" hidden></div><div id="kn-dex" hidden></div></div>' +
  '<div id="kn-bar"><div id="kn-foods"></div><div id="kn-acts"><button id="kn-b-shop">🛒 먹이 가게</button><button id="kn-b-dex">📖 분양 도감</button></div></div>';
document.body.appendChild(R);
const $ = s => R.querySelector(s);
const cv = $('#kn-cv'), cx = cv.getContext('2d');

// 이미지 로더 (없으면 null → 이모지로 대체)
const IMGS = {};
function img(id, kind) {
  const k = id + '_' + kind;
  if (!(k in IMGS)) {
    IMGS[k] = null;
    const im = new Image();
    im.onload = () => { IMGS[k] = im; };
    im.src = IMG + k + '.png';
  }
  return IMGS[k];
}
function faceHtml(a) {
  return '<img src="' + IMG + a.id + '_close.png" onerror="this.outerHTML=\'' + a.emoji + '\'">';
}

// ───────── 마당 ─────────
let food = null;       // {x,y,name}
let ani = null;        // {id,x,y,tx,ty,t,dir,state:'wait'|'come'|'sniff'|'leave'}
let spawnAt = 0, last = 0, raf = 0, busy = false;

function msg(t) { $('#kn-msg').textContent = t || ''; }
function say(t, ms) { msg(t); if (ms) setTimeout(() => { if ($('#kn-msg').textContent === t) msg(''); }, ms); }
function coinText() { $('#kn-coin').textContent = '🍔 ' + coinsNow().toLocaleString(); }

function renderFoods() {
  $('#kn-foods').innerHTML = FOODS.map(f => {
    const q = bagQty(f.name);
    return '<button data-f="' + f.name + '" class="' + (S.food === f.name ? 'on ' : '') + (q < 1 ? 'no' : '') + '"><span class="e">' + f.emoji + '</span>' + f.name + ' ×' + q + '</button>';
  }).join('');
  coinText();
}
$('#kn-foods').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  S.food = b.dataset.f; save(); renderFoods();
});

function draw(ts) {
  raf = requestAnimationFrame(draw);
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
  const W = cv.width, H = cv.height;
  // 잔디
  const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3f7a45'); g.addColorStop(1, '#2f5a35');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  cx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % H; cx.fillRect(x, y, 3, 8); }
  // 울타리
  cx.fillStyle = '#7a5a36';
  cx.fillRect(0, 0, W, 10); cx.fillRect(0, H - 10, W, 10); cx.fillRect(0, 0, 10, H); cx.fillRect(W - 10, 0, 10, H);

  // 동물 등장 대기
  if (food && !ani && !busy && performance.now() / 1000 >= spawnAt) spawnAnimal();

  // 먹이
  if (food) {
    cx.font = '34px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = 'rgba(0,0,0,.25)'; cx.beginPath(); cx.ellipse(food.x, food.y + 16, 16, 6, 0, 0, 7); cx.fill();
    cx.fillStyle = '#fff'; cx.fillText(foodOf(food.name).emoji, food.x, food.y);
  }

  // 동물
  if (ani) {
    ani.t += dt;
    if (ani.state === 'come' && food) {
      const dx = food.x - ani.x, dy = (food.y + 6) - ani.y, d = Math.hypot(dx, dy);
      if (d < 22) { ani.state = 'sniff'; openClose(); }
      else { ani.x += dx / d * CFG.SPEED * dt; ani.y += dy / d * CFG.SPEED * dt; if (Math.abs(dx) > 2) ani.dir = dx < 0 ? -1 : 1; }
    }
    if (ani.state === 'leave') {
      ani.x += ani.dir * 200 * dt;
      if (ani.x < -60 || ani.x > W + 60) { ani = null; }
    }
    if (ani) {
      const moving = ani.state === 'come' || ani.state === 'leave';
      const hop = moving ? Math.abs(Math.sin(ani.t * 11)) : 0;
      const sq = moving ? 1 + Math.sin(ani.t * 22) * 0.05 : 1;
      const a = byId(ani.id), im = img(a.id, 'top'), S0 = 56;
      cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(ani.x, ani.y + 22, 22 - hop * 6, 7 - hop * 2, 0, 0, 7); cx.fill();
      cx.save(); cx.translate(ani.x, ani.y - hop * 12); cx.scale(ani.dir * (2 - sq), sq);
      if (im) cx.drawImage(im, -S0 / 2, -S0 / 2, S0, S0);
      else { cx.font = '48px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(a.emoji, 0, 0); }
      cx.restore();
    }
  }
}

function spawnAnimal() {
  const fav = ANIMALS.find(a => a.food === food.name);
  let pick = fav;
  if (!fav || Math.random() > CFG.RIGHT_RATE) {
    const others = ANIMALS.filter(a => !fav || a.id !== fav.id);
    pick = others[Math.floor(Math.random() * others.length)];
  }
  const side = Math.random() < 0.5 ? -1 : 1;
  ani = { id: pick.id, x: side < 0 ? -30 : cv.width + 30, y: 60 + Math.random() * (cv.height - 160), dir: -side, t: 0, state: 'come' };
  say('앗, 누가 먹이 냄새를 맡고 왔어요!', 2200);
}

cv.addEventListener('pointerdown', e => {
  if (busy || food) { if (food) say('먹이는 한 번에 하나만 놓을 수 있어요', 1500); return; }
  if (bagQty(S.food) < 1) { say('가방에 ' + S.food + '이(가) 없어요. 🛒 먹이 가게에서 사요!', 2200); return; }
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * cv.width, y = (e.clientY - r.top) / r.height * cv.height;
  const px = Math.max(40, Math.min(cv.width - 40, x)), py = Math.max(60, Math.min(cv.height - 60, y));
  try { useFromBag(S.food, 1); } catch (err) {}
  food = { x: px, y: py, name: S.food };
  spawnAt = performance.now() / 1000 + CFG.ARRIVE_DELAY + Math.random() * 1.2;
  msg('먹이를 놓았어요… 누가 올까요?'); renderFoods();
});

// ───────── 클로즈업 (냄새 맡는 화면) ─────────
let meter = null;
function openClose() {
  busy = true;
  const a = byId(ani.id), right = a.food === food.name;
  const box = $('#kn-close'); box.hidden = false;
  box.innerHTML = '<div class="face">' + faceHtml(a) + '</div><div class="food">' + foodOf(food.name).emoji + '</div><div class="t" id="kn-t">킁킁… 킁킁…</div>' +
    (right ? '<div id="kn-meter"><div id="kn-zone"></div><div id="kn-mk"></div></div><button id="kn-grab">지금이다!</button>' : '');
  if (!right) {
    setTimeout(() => finish(false, a, '냄새를 맡더니 고개를 저으며 가버렸어요…'), 2300);
    return;
  }
  const z = CFG.ZONE, zs = 0.2 + Math.random() * (0.6 - z);
  const zone = $('#kn-zone'); zone.style.left = zs * 100 + '%'; zone.style.width = z * 100 + '%';
  meter = { p: 0, v: 1, zs, z, done: false, t0: performance.now() };
  (function tick() {
    if (!meter || meter.done) return;
    const dt = 0.016; meter.p += meter.v * CFG.METER_SPEED * dt;
    if (meter.p >= 1) { meter.p = 1; meter.v = -1; } else if (meter.p <= 0) { meter.p = 0; meter.v = 1; }
    const mk = $('#kn-mk'); if (mk) mk.style.left = meter.p * 100 + '%';
    requestAnimationFrame(tick);
  })();
  $('#kn-grab').onclick = () => {
    if (!meter || meter.done) return; meter.done = true;
    const ok = meter.p >= meter.zs && meter.p <= meter.zs + meter.z;
    finish(ok, a, ok ? null : '타이밍이 어긋나서 놀라 도망쳤어요!');
  };
}

function finish(ok, a, failText) {
  S.tries = (S.tries || 0) + 1;
  const box = $('#kn-close');
  if (ok) {
    const first = !S.got[a.id]; S.got[a.id] = (S.got[a.id] || 0) + 1; save();
    box.innerHTML = '<div class="face">' + faceHtml(a) + '</div><div class="t" style="font-size:18px;font-weight:900">' + (first ? '🎉 ' + a.name + ' 분양 성공! (신규)' : '🐾 ' + a.name + ' 분양 성공!') + '</div>' +
      '<div class="t" style="color:#bcd">' + (first ? '분양 도감에 등록됐어요. 드라마 조연으로 쓸 수 있어요!' : '이미 분양받은 아이예요. (' + S.got[a.id] + '번째)') + '</div>' +
      '<button id="kn-ok" class="kn-back" style="width:auto;padding:11px 32px">확인</button>';
    $('#kn-ok').onclick = () => endClose(false);
    try { window.dispatchEvent(new CustomEvent('ph-kennel-got', { detail: { id: a.id, first } })); } catch (e) {}
  } else {
    save();
    box.innerHTML = '<div class="face" style="animation:none;opacity:.6">' + faceHtml(a) + '</div><div class="t">' + failText + '</div>' +
      '<button id="kn-ok" class="kn-back" style="width:auto;padding:11px 32px">확인</button>';
    $('#kn-ok').onclick = () => endClose(true);
  }
}
function endClose(leave) {
  $('#kn-close').hidden = true; meter = null; busy = false; food = null; msg('');
  if (leave && ani) ani.state = 'leave'; else ani = null;
  renderFoods();
}

// ───────── 가게 / 도감 ─────────
function renderShop() {
  const sh = $('#kn-shop');
  sh.innerHTML = '<h3>🛒 먹이 가게 <span style="font-size:12px;color:#ffd54a;float:right">🍔 ' + coinsNow().toLocaleString() + '</span></h3>' +
    FOODS.map(f => '<div class="kn-row"><div class="e">' + f.emoji + '</div><div class="i">' + f.name + ' <small>' + f.desc + ' · 보유 ' + bagQty(f.name) + '</small></div>' +
      '<button data-buy="' + f.name + '"' + (coinsNow() < f.price ? ' disabled' : '') + '>🍔' + f.price + '</button></div>').join('') +
    '<button class="kn-back" id="kn-shop-x">닫기</button>';
  $('#kn-shop-x').onclick = () => { sh.hidden = true; renderFoods(); };
}
$('#kn-shop').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
  const f = foodOf(b.dataset.buy);
  if (coinsNow() < f.price) return;
  let ok = false; try { ok = addToBag(f.emoji, f.name, 'material', 1, '분양소 먹이 · ' + f.desc, 1); } catch (err) {}
  if (!ok) return;
  coins -= f.price;
  try { if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (err) {}
  renderShop();
});
$('#kn-b-shop').onclick = () => { $('#kn-dex').hidden = true; renderShop(); $('#kn-shop').hidden = false; };
$('#kn-b-dex').onclick = () => {
  const d = $('#kn-dex'); $('#kn-shop').hidden = true;
  d.innerHTML = '<h3>📖 분양 도감 ' + Object.keys(S.got).length + '/' + ANIMALS.length + '</h3>' +
    ANIMALS.map(a => {
      const n = S.got[a.id] || 0;
      return '<div class="kn-row"><div class="e" style="' + (n ? '' : 'filter:grayscale(1) brightness(.4)') + '">' + a.emoji + '</div><div class="i">' + (n ? a.name : '???') +
        '<small>' + (n ? '좋아하는 먹이: ' + foodOf(a.food).emoji + a.food + ' · 분양 ' + n + '회' : '아직 만나지 못했어요') + '</small></div></div>';
    }).join('') + '<button class="kn-back" id="kn-dex-x">닫기</button>';
  d.hidden = false; $('#kn-dex-x').onclick = () => { d.hidden = true; };
};

// ───────── 열기 / 닫기 ─────────
function openKennel() {
  load(); food = null; ani = null; busy = false; meter = null;
  $('#kn-close').hidden = true; $('#kn-shop').hidden = true; $('#kn-dex').hidden = true;
  R.hidden = false; msg('마당을 탭해서 먹이를 놓아보세요'); renderFoods();
  last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
}
function closeKennel() { if (busy) return; R.hidden = true; cancelAnimationFrame(raf); food = null; ani = null; }
$('#kn-x').onclick = closeKennel;
window.openKennel = openKennel;
window.__kennel = { owned: () => Object.keys(S.got).filter(k => S.got[k] > 0), got: () => S.got, ANIMALS, FOODS, CFG, _state: () => ({ food, ani, busy }) };

// ───────── 광장 메뉴 버튼 (드라마 촬영 버튼 아래) ─────────
let tries = 0;
(function hook() {
  tries++;
  const anchor = document.getElementById('btn-drama-square') || (tries > 200 ? document.getElementById('btn-cf-square') : null);
  if (!anchor || typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined') { if (tries < 500) setTimeout(hook, 50); return; }
  if (document.getElementById('btn-kennel-square')) return;
  const b = document.createElement('button');
  b.id = 'btn-kennel-square'; b.textContent = '🐾 분양소';
  b.style.cssText = 'display:none;width:100%;padding:14px;margin-top:10px;background:rgba(120,220,140,0.15);border:1.5px solid #78dc8c;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;';
  b.onclick = openKennel;
  anchor.insertAdjacentElement('afterend', b);
  if (PLACE_BUTTONS.square.indexOf('btn-kennel-square') === -1) PLACE_BUTTONS.square.push('btn-kennel-square');
  if (ALL_PLACE_BTNS.indexOf('btn-kennel-square') === -1) ALL_PLACE_BTNS.push('btn-kennel-square');
})();
})();
