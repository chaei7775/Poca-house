
/* =========================================
  POCA STRUCTURE RESET PATCH v1
  - UI 생성 단일화 강제
  - 서버버튼/타임라인 부활 차단
  - render 충돌 완화
========================================= */

(function(){

// ===============================
// 1. Firebase test panel 완전 차단
// ===============================
window.addFirebaseTestPanel = function(){};

// ===============================
// 2. timeline 클릭 무력화
// ===============================
document.addEventListener('click', function(e){
  const t = (e.target?.innerText || "").toLowerCase();
  if (t.includes("timeline") || t.includes("타임라인")) {
    e.preventDefault();
    e.stopPropagation();
    alert("타임라인은 현재 비활성화 상태입니다.");
  }
}, true);

// ===============================
// 3. DOM 재생성 방어 (server button 재부활 차단)
// ===============================
const observer = new MutationObserver(() => {
  document.querySelectorAll("*").forEach(el => {
    const t = (el.innerText || "").toLowerCase();
    if (t.includes("서버저장") || t.includes("firebase test")) {
      el.remove();
    }
  });
});

observer.observe(document.body, { childList:true, subtree:true });

// ===============================
// 4. setTimeout 후킹 (UI 생성 억제)
// ===============================
const _st = window.setTimeout;
window.setTimeout = function(fn, t){
  const s = String(fn);
  if (s.includes("firebase") || s.includes("addFirebaseTestPanel")) {
    return 0;
  }
  return _st(fn, t);
};

console.log("🔥 STRUCTURE RESET PATCH LOADED");

})();
