// ════════════════════════════════
// 🎶 리듬게임 (별도 모듈 — game.js 건드리지 않음)
// 의존: coins, saveAll(), addPlayerExp() — game.js에 이미 존재
// ════════════════════════════════

const RHYTHM_CONFIG = {
  easy:   { label:'😊 초급', bgm:'bgm-rhythm-easy.mp3',   duration:43, noteSpeedMs:1500, spawnIntervalMs:480, doubleNoteChance:0.06, maxCoin:3800 },
  normal: { label:'🔥 중급', bgm:'bgm-rhythm-normal.mp3', duration:45, noteSpeedMs:1150, spawnIntervalMs:380, doubleNoteChance:0.16, maxCoin:7800 },
  hard:   { label:'💀 고급', bgm:'bgm-rhythm-hard.mp3',   duration:59, noteSpeedMs:850,  spawnIntervalMs:300, doubleNoteChance:0.30, maxCoin:15000 },
};

const RHYTHM_JUDGE = {
  perfect: { window: 45,  label:'PERFECT', score:100, color:'#FFD700' },
  great:   { window: 90,  label:'GREAT',   score:60,  color:'#FF6B9D' },
  cool:    { window: 140, label:'COOL',    score:25,  color:'#7DD3FC' },
};

const RHYTHM_LANES = ['←', '↑', '↓', '→'];
const RHYTHM_LANE_KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];

let rhythmState = null; // 게임 진행 중 상태 객체 (게임 시작할 때마다 새로 생성)

function openRhythmGame() {
  goTo('rhythm-select');
}

function renderRhythmSelect() {
  const wrap = document.getElementById('rhythm-diff-list');
  if (!wrap) return;
  wrap.innerHTML = Object.entries(RHYTHM_CONFIG).map(([key, cfg]) => `
    <button class="rhythm-diff-btn" onclick="startRhythmGame('${key}')">
      <div class="rhythm-diff-label">${cfg.label}</div>
      <div class="rhythm-diff-sub">최고 보상 🪙 ${cfg.maxCoin.toLocaleString()}</div>
    </button>
  `).join('');
}

function startRhythmGame(difficultyKey) {
  const cfg = RHYTHM_CONFIG[difficultyKey];
  if (!cfg) return;

  goTo('rhythm-play');

  rhythmState = {
    difficulty: difficultyKey,
    cfg,
    combo: 0,
    maxCombo: 0,
    totalScore: 0,
    judgedNotes: 0,
    missCount: 0,
    notes: [],          // 살아있는 노트 DOM/데이터
    spawnTimer: null,
    tickTimer: null,
    startTime: 0,
    ended: false,
    audio: null,
    keyHandler: null,
  };

  setupRhythmTrack();
  setupRhythmInput();

  // BGM 재생 (메인 BGM은 잠깐 멈춤)
  pauseBgm();
  rhythmState.audio = new Audio(cfg.bgm);
  rhythmState.audio.volume = 0.55;
  rhythmState.audio.play().catch(() => {});

  rhythmState.startTime = performance.now();
  rhythmState.spawnTimer = setInterval(spawnRhythmNote, cfg.spawnIntervalMs);
  rhythmState.tickTimer = setInterval(updateRhythmNotes, 16);

  // 곡 길이만큼 진행 후 자동 종료
  setTimeout(() => {
    if (rhythmState && !rhythmState.ended) endRhythmGame();
  }, cfg.duration * 1000);

  updateRhythmHud();
}

function setupRhythmTrack() {
  const track = document.getElementById('rhythm-track');
  if (!track) return;
  track.innerHTML = `
    <div class="rhythm-lanes">
      ${RHYTHM_LANES.map((sym, i) => `
        <div class="rhythm-lane" id="rhythm-lane-${i}">
          <div class="rhythm-judge-line"></div>
          <div class="rhythm-key-icon" id="rhythm-key-${i}">${sym}</div>
        </div>
      `).join('')}
    </div>
    <div class="rhythm-judge-text" id="rhythm-judge-text"></div>
  `;
}

function setupRhythmInput() {
  removeRhythmInput();
  rhythmState.keyHandler = function(e) {
    const laneIndex = RHYTHM_LANE_KEYS.indexOf(e.key);
    if (laneIndex === -1) return;
    e.preventDefault();
    hitRhythmLane(laneIndex);
  };
  window.addEventListener('keydown', rhythmState.keyHandler);

  // 모바일 터치 지원: 레인 탭
  RHYTHM_LANES.forEach((_, i) => {
    const laneEl = document.getElementById('rhythm-lane-' + i);
    if (laneEl) {
      laneEl.ontouchstart = (e) => { e.preventDefault(); hitRhythmLane(i); };
      laneEl.onclick = () => hitRhythmLane(i);
    }
  });
}

function removeRhythmInput() {
  if (rhythmState && rhythmState.keyHandler) {
    window.removeEventListener('keydown', rhythmState.keyHandler);
  }
}

function spawnRhythmNote() {
  if (!rhythmState || rhythmState.ended) return;
  const track = document.getElementById('rhythm-track');
  if (!track) return;

  const lanesToSpawn = [Math.floor(Math.random() * 4)];
  if (Math.random() < rhythmState.cfg.doubleNoteChance) {
    let second = Math.floor(Math.random() * 4);
    if (second === lanesToSpawn[0]) second = (second + 1) % 4;
    lanesToSpawn.push(second);
  }

  lanesToSpawn.forEach(laneIndex => {
    const laneEl = document.getElementById('rhythm-lane-' + laneIndex);
    if (!laneEl) return;
    const noteEl = document.createElement('div');
    noteEl.className = 'rhythm-note';
    noteEl.style.cssText = `position:absolute;left:0;right:0;top:-40px;height:34px;border-radius:10px;background:linear-gradient(135deg,#FF6B9D,#C084FC);box-shadow:0 2px 10px #0005;`;
    laneEl.appendChild(noteEl);

    const noteData = {
      lane: laneIndex,
      el: noteEl,
      spawnTime: performance.now(),
      judged: false,
    };
    rhythmState.notes.push(noteData);
  });
}

function updateRhythmNotes() {
  if (!rhythmState || rhythmState.ended) return;
  const now = performance.now();
  const speed = rhythmState.cfg.noteSpeedMs;
  const trackHeight = document.getElementById('rhythm-lane-0')?.clientHeight || 480;
  const judgeLineY = trackHeight - 70; // 판정선은 하단에서 70px 위

  rhythmState.notes.forEach(note => {
    if (note.judged) return;
    const elapsed = now - note.spawnTime;
    const progress = elapsed / speed; // 0~1+
    const y = progress * judgeLineY;
    note.el.style.top = y + 'px';

    // 판정선을 한참 지나도록 안 맞추면 Miss 처리
    if (progress > 1.35) {
      judgeRhythmNote(note, 'miss');
    }
  });

  // 정리: 화면에서 제거된 노트는 배열에서 청소
  rhythmState.notes = rhythmState.notes.filter(n => !n.judged || n.el.isConnected);
}

function hitRhythmLane(laneIndex) {
  if (!rhythmState || rhythmState.ended) return;
  const track = document.getElementById('rhythm-lane-' + laneIndex);
  if (!track) return;
  const trackHeight = track.clientHeight || 480;
  const judgeLineY = trackHeight - 70;

  // 해당 레인에서 판정선에 가장 가까운, 아직 판정 안 된 노트 찾기
  let bestNote = null;
  let bestDist = Infinity;
  rhythmState.notes.forEach(note => {
    if (note.judged || note.lane !== laneIndex) return;
    const noteY = parseFloat(note.el.style.top) || 0;
    const dist = Math.abs(noteY - judgeLineY);
    if (dist < bestDist) { bestDist = dist; bestNote = note; }
  });

  if (!bestNote || bestDist > RHYTHM_JUDGE.cool.window) {
    flashRhythmKey(laneIndex, false);
    return; // 너무 멀면 입력 무시 (헛스윙)
  }

  let judgeKey = 'cool';
  if (bestDist <= RHYTHM_JUDGE.perfect.window) judgeKey = 'perfect';
  else if (bestDist <= RHYTHM_JUDGE.great.window) judgeKey = 'great';

  judgeRhythmNote(bestNote, judgeKey);
  flashRhythmKey(laneIndex, true);
}

function flashRhythmKey(laneIndex, hit) {
  const keyEl = document.getElementById('rhythm-key-' + laneIndex);
  if (!keyEl) return;
  keyEl.style.transform = 'scale(1.3)';
  keyEl.style.opacity = hit ? '1' : '0.4';
  setTimeout(() => { keyEl.style.transform = 'scale(1)'; keyEl.style.opacity = '0.8'; }, 120);
}

function judgeRhythmNote(note, judgeKey) {
  if (note.judged) return;
  note.judged = true;
  note.el.remove();
  rhythmState.judgedNotes++;

  if (judgeKey === 'miss') {
    rhythmState.combo = 0;
    rhythmState.missCount++;
    showRhythmJudgeText('MISS', '#888');
  } else {
    const judge = RHYTHM_JUDGE[judgeKey];
    rhythmState.combo++;
    rhythmState.maxCombo = Math.max(rhythmState.maxCombo, rhythmState.combo);
    const comboMult = 1 + Math.min(rhythmState.combo / 50, 1.5); // 콤보 쌓일수록 최대 2.5배까지
    rhythmState.totalScore += judge.score * comboMult;
    showRhythmJudgeText(judge.label, judge.color);
  }

  updateRhythmHud();
}

function showRhythmJudgeText(text, color) {
  const el = document.getElementById('rhythm-judge-text');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0px) scale(1.1)';
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px) scale(0.9)';
  }, 280);
}

function updateRhythmHud() {
  if (!rhythmState) return;
  const comboEl = document.getElementById('rhythm-combo');
  const scoreEl = document.getElementById('rhythm-score');
  if (comboEl) comboEl.textContent = rhythmState.combo + ' 콤보';
  if (scoreEl) scoreEl.textContent = Math.floor(rhythmState.totalScore) + ' 점';
}

function endRhythmGame() {
  if (!rhythmState || rhythmState.ended) return;
  rhythmState.ended = true;

  clearInterval(rhythmState.spawnTimer);
  clearInterval(rhythmState.tickTimer);
  removeRhythmInput();
  if (rhythmState.audio) { rhythmState.audio.pause(); }

  // 남아있는 노트는 모두 Miss 처리 (점수에는 영향 없음, 화면 정리용)
  rhythmState.notes.forEach(n => { if (!n.judged) { n.judged = true; n.el.remove(); } });

  // 점수 → 코인 환산: 이론상 최대 점수 대비 비율 계산
  const cfg = rhythmState.cfg;
  const estimatedMaxScore = (rhythmState.judgedNotes || 1) * RHYTHM_JUDGE.perfect.score * 2.5;
  const ratio = Math.max(0, Math.min(1, rhythmState.totalScore / estimatedMaxScore));
  const earnedCoins = Math.round(cfg.maxCoin * ratio);

  coins += earnedCoins;
  if (typeof saveAll === 'function') saveAll();
  if (typeof addPlayerExp === 'function') addPlayerExp(20);

  renderRhythmResult(earnedCoins, ratio);
  goTo('rhythm-result');

  // 메인 BGM 다시 재생
  if (typeof playBgm === 'function') playBgm();
}

function renderRhythmResult(earnedCoins, ratio) {
  const wrap = document.getElementById('rhythm-result-body');
  if (!wrap) return;
  let grade = 'C';
  if (ratio >= 0.9) grade = 'S';
  else if (ratio >= 0.75) grade = 'A';
  else if (ratio >= 0.55) grade = 'B';

  wrap.innerHTML = `
    <div class="rhythm-result-grade">${grade}</div>
    <div class="rhythm-result-row">최대 콤보: <b>${rhythmState.maxCombo}</b></div>
    <div class="rhythm-result-row">MISS: <b>${rhythmState.missCount}</b></div>
    <div class="rhythm-result-row">획득 코인: <b>🪙 ${earnedCoins.toLocaleString()}</b></div>
  `;
}

function exitRhythmGame() {
  if (rhythmState && !rhythmState.ended) {
    clearInterval(rhythmState.spawnTimer);
    clearInterval(rhythmState.tickTimer);
    removeRhythmInput();
    if (rhythmState.audio) rhythmState.audio.pause();
    if (typeof playBgm === 'function') playBgm();
  }
  rhythmState = null;
  goTo('map');
}

// ── game.js의 goTo()를 건드리지 않고, 후킹해서 리듬게임 화면 진입을 감지 ──
(function hookGoToForRhythm() {
  if (typeof window.goTo !== 'function') {
    // goTo가 아직 정의 안 됐으면 약간 뒤에 재시도
    setTimeout(hookGoToForRhythm, 50);
    return;
  }
  const originalGoTo = window.goTo;
  window.goTo = function(id) {
    const result = originalGoTo.apply(this, arguments);
    if (id === 'rhythm-select') renderRhythmSelect();
    return result;
  };
})();
