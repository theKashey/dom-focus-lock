(function () {
  const {default: moveFocusInside, focusInside, focusIsHidden} = require('focus-lock');

  let lastActiveTrap = 0;
  let lastActiveFocus = null;


  const focusOnBody = () => (
    document && document.activeElement === document.body
  );

  const isFreeFocus = () => focusOnBody() || focusIsHidden();


  const activateTrap = () => {
    let result = false;
    if (lastActiveTrap) {
      const observed = lastActiveTrap;
      if(!isFreeFocus()) {
        if (observed && !focusInside(observed)) {
          result = moveFocusInside(observed, lastActiveFocus);
        }
        lastActiveFocus = document.activeElement;
      }
    }
    return result;
  };

  const reducePropsToState = (propsList) => {
    return propsList
      .filter(node => node)
      .slice(-1)[0];
  };

  const handleStateChangeOnClient = (trap) => {
    lastActiveTrap = trap;
    if (trap) {
      activateTrap();
    }
  };

  let instances = [];

  const emitChange = (event) => {
    if (handleStateChangeOnClient(reducePropsToState(instances))) {
      event && event.preventDefault();
      return true;
    }
    return false;
  };

  const attachHandler = () => {
    document.addEventListener('focusin', emitChange);
  };

  const detachHandler = () => {
    document.removeEventListener('focusin', emitChange);
  };

  const focusLock = {
    on(domNode){
      if (instances.length === 0) {
        attachHandler();
      }
      if (instances.indexOf(domNode) < 0) {
        instances.push(domNode);
        emitChange();
      }
    },

    off(domNode){
      instances = instances.filter(node => node !== domNode);
      emitChange();
      if (instances.length === 0) {
        detachHandler();
      }
    }
  };

  module.exports = focusLock;
})();