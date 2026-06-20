
// CORE STABLE ENGINE
(function(){

window.AppState = {
  screen: "home"
};

window.showScreen = function(id){
  document.querySelectorAll(".screen").forEach(s=>s.style.display="none");
  const el = document.getElementById("screen-"+id);
  if(el) el.style.display="block";
  AppState.screen = id;
};

console.log("STABLE ARCH V3 LOADED");

})();
