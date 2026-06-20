
// ENGINE v2 - BOOTSTRAP
window.addEventListener("load", ()=>{
  console.log("🔥 ENGINE V2 ACTIVE");

  // kill unstable panels (old bug source)
  document.querySelectorAll("*").forEach(el=>{
    const t = (el.innerText||"").toLowerCase();
    if(t.includes("firebase test") || t.includes("서버저장")){
      el.remove();
    }
  });
});
