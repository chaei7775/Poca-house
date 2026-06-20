
// ENGINE v2 - UI CORE (single render lock system)
window.PocaUI = (function(){
  let renderLocked = false;

  function lock(){ renderLocked = true; }
  function unlock(){ renderLocked = false; }

  function safeRender(fn){
    if(renderLocked) return;
    lock();
    try { fn(); } finally { unlock(); }
  }

  function removeByText(text){
    document.querySelectorAll("*").forEach(el=>{
      if((el.innerText||"").includes(text)) el.remove();
    });
  }

  return { safeRender, removeByText };
})();
