// ════════════════════════════════
// 🎵 포카하우스 배경음악 (BGM)
// ════════════════════════════════

const BGM_SRC = 'bgm-main.mp3';
const BGM_VOLUME_DEFAULT = 0.4;

let pocaBgmAudio = null;
let pocaBgmEnabled = (localStorage.getItem('ph_bgm_enabled') !== 'off');

function initBgm() {
  if (pocaBgmAudio) return;
  pocaBgmAudio = new Audio(BGM_SRC);
  pocaBgmAudio.loop = true;
  pocaBgmAudio.volume = BGM_VOLUME_DEFAULT;
}

function playBgm() {
  initBgm();
  if (!pocaBgmEnabled) return;
  pocaBgmAudio.play().catch(() => {
    // 브라우저가 첫 자동재생을 막으면, 사용자의 첫 터치/클릭 때 재생 시도
    const resumeOnce = () => {
      pocaBgmAudio.play().catch(() => {});
      document.removeEventListener('click', resumeOnce);
      document.removeEventListener('touchstart', resumeOnce);
    };
    document.addEventListener('click', resumeOnce, { once: true });
    document.addEventListener('touchstart', resumeOnce, { once: true });
  });
}

function pauseBgm() {
  if (pocaBgmAudio) pocaBgmAudio.pause();
}

function toggleBgm() {
  pocaBgmEnabled = !pocaBgmEnabled;
  localStorage.setItem('ph_bgm_enabled', pocaBgmEnabled ? 'on' : 'off');
  if (pocaBgmEnabled) {
    playBgm();
  } else {
    pauseBgm();
  }
  updateBgmButton();
}

function setBgmVolume(v) {
  initBgm();
  pocaBgmAudio.volume = Math.max(0, Math.min(1, v));
}

function updateBgmButton() {
  const btn = document.getElementById('bgm-toggle-btn');
  if (btn) btn.textContent = pocaBgmEnabled ? '🔊' : '🔇';
}

function addBgmButton() {
  if (document.getElementById('bgm-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'bgm-toggle-btn';
  btn.textContent = pocaBgmEnabled ? '🔊' : '🔇';
  btn.style.cssText =
    'position:fixed;right:10px;top:10px;z-index:1200;' +
    'width:36px;height:36px;border-radius:50%;border:none;' +
    'background:rgba(26,26,46,.75);color:#fff;font-size:16px;' +
    'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
    'box-shadow:0 2px 8px #0004;';
  btn.onclick = toggleBgm;
  document.body.appendChild(btn);
}

window.addEventListener('DOMContentLoaded', () => {
  addBgmButton();
  if (pocaBgmEnabled) playBgm();
});
