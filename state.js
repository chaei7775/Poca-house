
// ENGINE v2 - STATE MANAGER
window.PocaState = (function(){
  const state = {
    coins: 0,
    level: 1,
    exp: 0,
    inventory: [],
    equipped: {},
  };

  return {
    get: (k) => state[k],
    set: (k,v) => { state[k]=v; },
    all: () => state
  };
})();
