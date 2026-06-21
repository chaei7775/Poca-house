// ════════════════════════════════
// 🎀 팬클럽 의뢰소 (번호 색칠 장기 콘텐츠)
// ════════════════════════════════

const FANCLUBS = [
  { charId:'minjun', emoji:'👑', name:'민준 팬클럽' },
  { charId:'sion',   emoji:'🌙', name:'시온 팬클럽' },
  { charId:'doyun',  emoji:'📚', name:'도윤 팬클럽' },
  { charId:'harin',  emoji:'💜', name:'하린 팬클럽' },
  { charId:'yuna',   emoji:'👑', name:'윤아 팬클럽' },
  { charId:'ara',    emoji:'😼', name:'아라 팬클럽' }
];

const FAN_COMMISSIONS = [
  { id:'minjun_royalstar',    charId:'minjun', title:'Royal Star 응원 배너', sizeClass:'중형', npcLine:'정말 감사합니다! 덕분에 응원봉 준비를 무사히 마쳤어요!' },
  { id:'sion_starrynight',    charId:'sion',   title:'별밤 태피스트리',       sizeClass:'중형', npcLine:'이 작품… 마음에 쏙 들어요. 고마워요.' },
  { id:'doyun_grimoire',      charId:'doyun',  title:'금서관 마도서 표지',     sizeClass:'중형', npcLine:'지식이 곧 힘이 되는 순간이군요. 좋은 작업이었어요.' },
  { id:'harin_constellation', charId:'harin',  title:'성좌의 액자',          sizeClass:'중형', npcLine:'별들이 당신의 손끝에서 다시 빛나네요. 감사해요.' },
  { id:'yuna_rosecastle',     charId:'yuna',   title:'장미 성의 깃발',        sizeClass:'중형', npcLine:'정말 우아하게 완성됐네요! 전시회 준비를 무사히 마쳤어요!' },
  { id:'ara_moonlitcat',      charId:'ara',    title:'달빛 고양이 태피스트리', sizeClass:'중형', npcLine:'…나쁘지 않네. 고생했어.' }
];

const FAN_COMMISSION_REWARD = { coins:300000, wish:10, ticket:3, fanPoint:300 };
const FAN_LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000]; // Lv1~Lv5 필요 누적 팬포인트

let fanDesignCache = {};

function getFanPoints() {
  return JSON.parse(localStorage.getItem('ph_fanPoints') || '{}');
}
function addFanPoints(charId, amount) {
  const pts = getFanPoints();
  pts[charId] = (pts[charId] || 0) + amount;
  localStorage.setItem('ph_fanPoints', JSON.stringify(pts));
  if (typeof saveAll === 'function') saveAll();
}
function getFanLevel(charId) {
  const pts = getFanPoints()[charId] || 0;
  let lv = 1;
  for (let i = 1; i < FAN_LEVEL_THRESHOLDS.length; i++) {
    if (pts >= FAN_LEVEL_THRESHOLDS[i]) lv = i + 1;
  }
  return lv;
}
function getFanLevelProgress(charId) {
  const pts = getFanPoints()[charId] || 0;
  const lv = getFanLevel(charId);
  const next = FAN_LEVEL_THRESHOLDS[lv] != null ? FAN_LEVEL_THRESHOLDS[lv] : null;
  return { pts: pts, lv: lv, next: next };
}

function getCommissionProgressStore() {
  return JSON.parse(localStorage.getItem('ph_fanclub_progress') || '{}');
}
function saveCommissionProgressStore(store) {
  localStorage.setItem('ph_fanclub_progress', JSON.stringify(store));
}
function getFilledSet(designId) {
  const store = getCommissionProgressStore();
  return new Set(store[designId] || []);
}
function saveFilledSet(designId, filledSet) {
  const store = getCommissionProgressStore();
  store[designId] = Array.from(filledSet);
  saveCommissionProgressStore(store);
  if (typeof saveAll === 'function') saveAll();
}
function isCommissionDone(designId, totalCells) {
  return getFilledSet(designId).size >= totalCells;
}

async function loadFanDesign(designId) {
  if (fanDesignCache[designId]) return fanDesignCache[designId];
  try {
    const res = await fetch('https://raw.githubusercontent.com/chaei7775/Poca-house/main/design-' + designId + '.json');
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    fanDesignCache[designId] = data;
    return data;
  } catch (err) {
    return null;
  }
}

// ── 메인 팬클럽 목록 ──
function openFanclubOverlay() {
  const old = document.getElementById('fanclub-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'fanclub-overlay';
  overlay.style.cssText = 'position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:700;background:#1a1a2e;display:flex;flex-direction:column;';

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">🎀 팬클럽 의뢰소</div>' +
    '<button onclick="document.getElementById(\'fanclub-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button>' +
    '</div>' +
    '<div id="fanclub-list" style="flex:1;overflow-y:auto;padding:14px 16px 30px;"></div>';
  document.body.appendChild(overlay);

  const listEl = document.getElementById('fanclub-list');
  listEl.innerHTML = FANCLUBS.map(function(club) {
    const lv = getFanLevel(club.charId);
    const commission = FAN_COMMISSIONS.find(function(c) { return c.charId === club.charId; });
    return '<button onclick="openCommissionDetail(\'' + commission.id + '\')" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;margin-bottom:10px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.15);border-radius:16px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;">' +
      '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:28px;">' + club.emoji + '</span>' +
      '<div><div style="font-size:14px;font-weight:900;color:#fff;">' + club.name + '</div>' +
      '<div style="font-size:11px;color:#FFB3CC;margin-top:2px;">Lv.' + lv + ' 팬클럽</div></div></div>' +
      '<span style="color:#888;font-size:18px;">›</span></button>';
  }).join('');
}

// ── 의뢰 상세 (시작/이어하기) ──
async function openCommissionDetail(commissionId) {
  const commission = FAN_COMMISSIONS.find(function(c) { return c.id === commissionId; });
  if (!commission) return;
  const overlay = document.getElementById('fanclub-overlay');
  if (!overlay) return;
  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:13px;">불러오는 중...</div>';

  const design = await loadFanDesign(commissionId);
  const club = FANCLUBS.find(function(c) { return c.charId === commission.charId; });

  if (!design) {
    overlay.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#888;">' +
      '<div style="font-size:13px;margin-bottom:14px;">도안 데이터를 아직 불러올 수 없어요.<br>(design-' + commissionId + '.json 파일이 레포에 있는지 확인해주세요)</div>' +
      '<button onclick="document.getElementById(\'fanclub-overlay\').remove()" style="padding:10px 20px;background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;cursor:pointer;">닫기</button></div>';
    return;
  }

  const filled = getFilledSet(commissionId);
  const pct = Math.round(filled.size / design.totalCells * 100);
  const done = filled.size >= design.totalCells;

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">' +
    '<button onclick="openFanclubOverlay()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">← 뒤로</button>' +
    '<div style="color:#fff;font-size:14px;font-weight:900;">' + club.emoji + ' ' + club.name + '</div>' +
    '<div style="width:50px;"></div></div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px;text-align:center;">' +
    '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/fanclub-' + commissionId + '.jpg" style="width:200px;border-radius:14px;border:2px solid rgba(255,255,255,0.2);margin-bottom:10px;" onerror="this.style.display=\'none\'">' +
    '<div style="font-size:10px;color:#666;margin-bottom:4px;">완성하면 이 그림을 직접 색칠로 완성하게 돼요!</div>' +
    '<canvas id="fanclub-thumb-canvas" width="' + design.size + '" height="' + design.size + '" style="width:90px;height:90px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.2);image-rendering:pixelated;margin-bottom:14px;"></canvas>' +
    '<div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:4px;">' + commission.title + '</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:18px;">' + commission.sizeClass + ' · ' + design.colorCountUsed + '색 · ' + design.totalCells + '칸</div>' +
    '<div style="background:rgba(255,255,255,0.08);border-radius:10px;height:10px;overflow:hidden;margin-bottom:6px;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#FF6B9D,#C084FC);"></div></div>' +
    '<div style="font-size:12px;color:#FFB3CC;margin-bottom:20px;">' + filled.size + ' / ' + design.totalCells + ' (' + pct + '%)</div>' +
    (done ?
      '<div style="font-size:13px;color:#FFD700;font-weight:900;margin-bottom:14px;">✅ 완성된 의뢰예요!</div>' :
      '<button onclick="openColoringScreen(\'' + commissionId + '\')" style="width:100%;max-width:280px;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + (filled.size > 0 ? '이어서 색칠하기' : '색칠 시작하기') + '</button>'
    ) +
    '</div>';

  // 썸네일 캔버스 그리기 (현재 진행상태 그대로)
  const canvas = document.getElementById('fanclub-thumb-canvas');
  drawFanCanvas(canvas, design, filled, null);
}

// ── 도안 캔버스 그리기 ──
function drawFanCanvas(canvas, design, filled, activeColorId) {
  const ctx = canvas.getContext('2d');
  const size = design.size;
  const paletteMap = {};
  design.palette.forEach(function(p) { paletteMap[p.id] = p.hex; });

  // 1) 기본 칸 채우기 (채워진 칸=실제색, 안채워진 칸=회색)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const colorId = design.grid[y][x];
      const isFilled = filled.has(idx);
      ctx.fillStyle = isFilled ? (paletteMap[colorId] || '#888') : '#cfcfcf';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // 2) 선택된 번호의 미완료 칸은 테두리(점)로만 표시 (실제 색칠과 절대 안 헷갈리게)
  if (activeColorId != null) {
    ctx.fillStyle = '#FF2D8A';
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        if (filled.has(idx)) continue;
        if (design.grid[y][x] !== activeColorId) continue;
        ctx.fillRect(x + 0.25, y + 0.25, 0.5, 0.5);
      }
    }
  }
}

// ── 색칠 화면 ──
let fanColoringState = null;

async function openColoringScreen(commissionId) {
  const design = await loadFanDesign(commissionId);
  if (!design) return;
  const commission = FAN_COMMISSIONS.find(function(c) { return c.id === commissionId; });
  const filled = getFilledSet(commissionId);

  fanColoringState = { commissionId: commissionId, design: design, filled: filled, activeColorId: design.palette[0].id, zoom: 1, saveTimer: null };

  const overlay = document.getElementById('fanclub-overlay');
  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,0.5);flex-shrink:0;">' +
    '<button onclick="exitColoringScreen()" style="background:rgba(255,255,255,0.15);border:none;border-radius:10px;color:#fff;padding:7px 12px;font-size:12px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">← 나가기(자동저장)</button>' +
    '<div id="fan-progress-text" style="color:#FFD700;font-size:12px;font-weight:900;"></div>' +
    '<div>' +
    '<button onclick="showFanReference(\'' + commissionId + '\')" style="background:rgba(255,215,0,0.2);border:none;border-radius:8px;color:#FFD700;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px;">🖼️ 원본</button>' +
    '<button onclick="changeFanZoom(-1)" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;color:#fff;width:28px;height:28px;cursor:pointer;">－</button> ' +
    '<button onclick="changeFanZoom(1)" style="background:rgba(255,255,255,0.15);border:none;border-radius:8px;color:#fff;width:28px;height:28px;cursor:pointer;">＋</button>' +
    '</div></div>' +
    '<div id="fan-canvas-scroll" style="flex:1;min-height:0;min-width:0;overflow:auto;-webkit-overflow-scrolling:touch;background:#0d0d18;padding:20px;">' +
    '<canvas id="fan-main-canvas" width="' + design.size + '" height="' + design.size + '" style="image-rendering:pixelated;touch-action:none;display:block;margin:0;"></canvas>' +
    '</div>' +
    '<div id="fan-palette-bar" style="display:flex;gap:6px;padding:10px 12px;background:rgba(0,0,0,0.6);flex-shrink:0;overflow-x:auto;"></div>';

  renderFanPaletteBar();
  updateFanCanvasSize();
  redrawFanCanvas();

  const canvas = document.getElementById('fan-main-canvas');

  function cellFromClientXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = design.size / rect.width;
    const scaleY = design.size / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);
    return { x: x, y: y };
  }

  canvas.onclick = function(e) {
    if (Date.now() < (fanColoringState.suppressClickUntil || 0)) return;
    const cell = cellFromClientXY(e.clientX, e.clientY);
    handleFanCellTap(cell.x, cell.y);
  };

  let touchStartPos = null;
  let touchScrollStart = null;
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) { touchStartPos = null; return; }
    const scrollEl = document.getElementById('fan-canvas-scroll');
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchScrollStart = { left: scrollEl.scrollLeft, top: scrollEl.scrollTop };
  }, { passive: true });
  canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length !== 1 || !touchStartPos) return;
    const scrollEl = document.getElementById('fan-canvas-scroll');
    const dx = e.touches[0].clientX - touchStartPos.x;
    const dy = e.touches[0].clientY - touchStartPos.y;
    if (Math.hypot(dx, dy) > 6) {
      e.preventDefault();
      scrollEl.scrollLeft = touchScrollStart.left - dx;
      scrollEl.scrollTop = touchScrollStart.top - dy;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function(e) {
    if (!touchStartPos || Date.now() < (fanColoringState.suppressClickUntil || 0)) { touchStartPos = null; return; }
    const t = e.changedTouches[0];
    const moved = Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y);
    if (moved < 6) {
      const cell = cellFromClientXY(t.clientX, t.clientY);
      handleFanCellTap(cell.x, cell.y);
    }
    touchStartPos = null;
  }, { passive: true });

  setupFanPinchZoom();
  setupFanMouseDrag();
}

function setupFanMouseDrag() {
  const scrollEl = document.getElementById('fan-canvas-scroll');
  if (!scrollEl) return;
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0;
  scrollEl.addEventListener('mousedown', function(e) {
    dragging = true;
    moved = false;
    startX = e.clientX; startY = e.clientY;
    startScrollLeft = scrollEl.scrollLeft; startScrollTop = scrollEl.scrollTop;
    scrollEl.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 5) moved = true;
    scrollEl.scrollLeft = startScrollLeft - dx;
    scrollEl.scrollTop = startScrollTop - dy;
  });
  window.addEventListener('mouseup', function() {
    if (dragging && moved && fanColoringState) fanColoringState.suppressClickUntil = Date.now() + 150;
    dragging = false;
    scrollEl.style.cursor = 'grab';
  });
  scrollEl.style.cursor = 'grab';
}

function showFanReference(commissionId) {
  const old = document.getElementById('fan-reference-popup');
  if (old) { old.remove(); return; }
  const popup = document.createElement('div');
  popup.id = 'fan-reference-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.onclick = function() { popup.remove(); };
  popup.innerHTML = '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/fanclub-' + commissionId + '.jpg" style="max-width:90%;max-height:80%;border-radius:14px;border:2px solid #FFD700;box-shadow:0 0 30px #FFD70066;">';
  document.body.appendChild(popup);
}

function setupFanPinchZoom() {
  const scrollEl = document.getElementById('fan-canvas-scroll');
  if (!scrollEl || !fanColoringState) return;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  function getDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  scrollEl.ontouchstart = function(e) {
    if (e.touches.length === 2) {
      pinchStartDist = getDist(e.touches);
      pinchStartZoom = fanColoringState.zoom;
    }
  };
  scrollEl.ontouchmove = function(e) {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      e.preventDefault();
      const newDist = getDist(e.touches);
      const newZoom = Math.max(1, Math.min(6, pinchStartZoom * (newDist / pinchStartDist)));
      fanColoringState.zoom = newZoom;
      updateFanCanvasSize();
    }
  };
  scrollEl.ontouchend = function(e) {
    if (e.touches.length < 2) {
      pinchStartDist = 0;
      fanColoringState.suppressClickUntil = Date.now() + 250;
    }
  };
}

function updateFanCanvasSize() {
  const canvas = document.getElementById('fan-main-canvas');
  if (!canvas || !fanColoringState) return;
  const base = 5; // 기본 1칸당 5px
  const px = base * fanColoringState.zoom;
  canvas.style.width = (fanColoringState.design.size * px) + 'px';
  canvas.style.height = (fanColoringState.design.size * px) + 'px';
}

function changeFanZoom(dir) {
  if (!fanColoringState) return;
  fanColoringState.zoom = Math.max(1, Math.min(6, fanColoringState.zoom + dir));
  updateFanCanvasSize();
}

function renderFanPaletteBar() {
  const bar = document.getElementById('fan-palette-bar');
  if (!bar || !fanColoringState) return;
  const { design, filled, activeColorId } = fanColoringState;

  // 칸별 남은개수 계산
  const remainCount = {};
  for (let y = 0; y < design.size; y++) {
    for (let x = 0; x < design.size; x++) {
      const idx = y * design.size + x;
      if (filled.has(idx)) continue;
      const cid = design.grid[y][x];
      remainCount[cid] = (remainCount[cid] || 0) + 1;
    }
  }

  bar.innerHTML = design.palette.filter(function(p) { return (remainCount[p.id] || 0) > 0; }).map(function(p) {
    const active = p.id === activeColorId;
    return '<button onclick="selectFanColor(' + p.id + ')" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;border-radius:10px;border:2px solid ' + (active ? '#FFD700' : 'rgba(255,255,255,0.2)') + ';background:rgba(255,255,255,0.05);cursor:pointer;">' +
      '<div style="width:24px;height:24px;border-radius:6px;background:' + p.hex + ';border:1px solid rgba(255,255,255,0.4);"></div>' +
      '<div style="font-size:9px;color:#fff;font-weight:900;">' + p.id + '</div>' +
      '<div style="font-size:8px;color:#aaa;">' + remainCount[p.id] + '</div>' +
      '</button>';
  }).join('');
}

function selectFanColor(colorId) {
  if (!fanColoringState) return;
  fanColoringState.activeColorId = colorId;
  renderFanPaletteBar();
  redrawFanCanvas();
}

function redrawFanCanvas() {
  if (!fanColoringState) return;
  const canvas = document.getElementById('fan-main-canvas');
  if (!canvas) return;
  drawFanCanvas(canvas, fanColoringState.design, fanColoringState.filled, fanColoringState.activeColorId);
  const progressText = document.getElementById('fan-progress-text');
  if (progressText) progressText.textContent = fanColoringState.filled.size + ' / ' + fanColoringState.design.totalCells;
}

function handleFanCellTap(x, y) {
  if (!fanColoringState) return;
  const { design, filled, activeColorId } = fanColoringState;
  if (x < 0 || y < 0 || x >= design.size || y >= design.size) return;
  const idx = y * design.size + x;
  if (filled.has(idx)) return;
  const colorId = design.grid[y][x];
  if (colorId !== activeColorId) return;

  filled.add(idx);
  redrawFanCanvas();
  renderFanPaletteBar();

  if (fanColoringState.saveTimer) clearTimeout(fanColoringState.saveTimer);
  fanColoringState.saveTimer = setTimeout(function() {
    saveFilledSet(fanColoringState.commissionId, fanColoringState.filled);
  }, 600);

  if (filled.size >= design.totalCells) {
    saveFilledSet(fanColoringState.commissionId, filled);
    setTimeout(function() { completeFanCommission(fanColoringState.commissionId); }, 300);
  }
}

function exitColoringScreen() {
  if (fanColoringState) {
    saveFilledSet(fanColoringState.commissionId, fanColoringState.filled);
  }
  openCommissionDetail(fanColoringState ? fanColoringState.commissionId : null);
}

function completeFanCommission(commissionId) {
  const commission = FAN_COMMISSIONS.find(function(c) { return c.id === commissionId; });
  const design = fanColoringState.design;

  coins += FAN_COMMISSION_REWARD.coins;
  wishFragments += FAN_COMMISSION_REWARD.wish;
  localStorage.setItem('ph_wish', wishFragments);
  if (typeof schoolDaily !== 'undefined') {
    schoolDaily.tickets = (schoolDaily.tickets || 0) + FAN_COMMISSION_REWARD.ticket;
    if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
  }
  addFanPoints(commission.charId, FAN_COMMISSION_REWARD.fanPoint);
  saveAll();
  if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();

  const overlay = document.getElementById('fanclub-overlay');
  if (!overlay) return;
  overlay.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;">' +
    '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/fanclub-' + commissionId + '.jpg" style="width:240px;border-radius:16px;border:2px solid #FFD700;margin-bottom:10px;box-shadow:0 0 30px #FFD70066;" onerror="this.style.display=\'none\'">' +
    '<canvas id="fan-complete-canvas" width="' + design.size + '" height="' + design.size + '" style="width:80px;height:80px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.3);image-rendering:pixelated;margin-bottom:16px;"></canvas>' +
    '<div style="font-size:22px;font-weight:900;color:#FFD700;margin-bottom:8px;">✨ 제작 완료!</div>' +
    '<div style="font-size:14px;color:#fff;font-weight:900;margin-bottom:14px;">' + commission.title + '</div>' +
    '<div style="background:rgba(255,255,255,0.08);border-radius:14px;padding:14px 18px;margin-bottom:16px;max-width:280px;">' +
    '<div style="font-size:13px;color:#FFB3CC;line-height:1.6;">"' + commission.npcLine + '"</div></div>' +
    '<div style="font-size:12px;color:#ddd;line-height:1.8;margin-bottom:20px;">' +
    '🍔 코인 +' + FAN_COMMISSION_REWARD.coins.toLocaleString() + '<br>' +
    '🧩 소원의 조각 +' + FAN_COMMISSION_REWARD.wish + '<br>' +
    '🎫 등교권 +' + FAN_COMMISSION_REWARD.ticket + '<br>' +
    '💖 팬포인트 +' + FAN_COMMISSION_REWARD.fanPoint +
    '</div>' +
    '<button onclick="document.getElementById(\'fanclub-overlay\').remove()" style="width:100%;max-width:280px;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
    '</div>';
  const canvas = document.getElementById('fan-complete-canvas');
  drawFanCanvas(canvas, design, new Set(Array.from({length: design.totalCells}, function(_, i) { return i; })), null);

  fanColoringState = null;
}

// ── 더보기 메뉴에 팬클럽 타일 추가 ──
(function hookOpenMoreMenuForFanclub() {
  if (typeof window.openMoreMenu !== 'function') {
    setTimeout(hookOpenMoreMenuForFanclub, 50);
    return;
  }
  const originalOpenMoreMenu = window.openMoreMenu;
  window.openMoreMenu = function() {
    const result = originalOpenMoreMenu.apply(this, arguments);
    const overlay = document.getElementById('more-menu-overlay');
    if (overlay && !document.getElementById('more-menu-fanclub-btn')) {
      const grid = overlay.querySelector('#more-menu-grid');
      if (grid) {
        const btn = document.createElement('button');
        btn.id = 'more-menu-fanclub-btn';
        btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;aspect-ratio:1;padding:10px;background:#FF6B9D1f;border:1.5px solid #FF6B9D;border-radius:16px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:center;';
        btn.innerHTML = '<span style="font-size:28px;">🎀</span><span>팬클럽</span>';
        btn.onclick = function() { overlay.remove(); openFanclubOverlay(); };
        grid.appendChild(btn);
      }
    }
    return result;
  };
})();
