// POCA CORE ENGINE - STABLE VERSION
(function(){

window.App = {
  screen: "home"
};

window.showScreen = function(id){
  document.querySelectorAll(".screen").forEach(s=>{
    s.style.display="none";
  });

  const target = document.getElementById("screen-"+id);
  if(target){
    target.style.display="block";
    App.screen = id;
  } else {
    document.getElementById("screen-home").style.display="block";
    App.screen = "home";
  }
};

console.log("POCA STABLE RUNNER LOADED");

})();
