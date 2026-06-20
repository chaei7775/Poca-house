// POCA FULL RESET CORE
(function(){

const state = {
  screen: "home"
};

window.showScreen = function(name){
  document.querySelectorAll(".screen").forEach(s=>{
    s.style.display="none";
  });

  const el = document.getElementById("screen-"+name);
  if(el){
    el.style.display="block";
    state.screen = name;
  } else {
    document.getElementById("screen-home").style.display="block";
    state.screen = "home";
  }
};

console.log("🔥 POCA FULL RESET LOADED");

})();
