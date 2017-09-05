(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.focusLock = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {
  var _require = require('focus-lock'),
      moveFocusInside = _require.default,
      focusInside = _require.focusInside;

  var lastActiveTrap = 0;
  var lastActiveFocus = null;

  var activateTrap = function activateTrap() {
    if (lastActiveTrap) {
      var observed = lastActiveTrap;
      if (observed && !focusInside(observed)) {
        moveFocusInside(observed, lastActiveFocus);
      }
      lastActiveFocus = document.activeElement;
    }
  };

  var reducePropsToState = function reducePropsToState(propsList) {
    return propsList.filter(function (node) {
      return node;
    }).slice(-1)[0];
  };

  var handleStateChangeOnClient = function handleStateChangeOnClient(trap) {
    lastActiveTrap = trap;
    if (trap) {
      activateTrap();
    }
  };

  var instances = [];

  var emitChange = function emitChange() {
    handleStateChangeOnClient(reducePropsToState(instances));
  };

  var attachHandler = function attachHandler() {
    document.addEventListener('focusin', emitChange);
  };

  var detachHandler = function detachHandler() {
    document.removeEventListener('focusin', emitChange);
  };

  var focusLock = {
    on: function on(domNode) {
      if (instances.length === 0) {
        attachHandler();
      }
      if (instances.indexOf(domNode) < 0) {
        instances.push(domNode);
        emitChange();
      }
    },
    off: function off(domNode) {
      instances = instances.filter(function (node) {
        return node !== domNode;
      });
      emitChange();
      if (instances.length === 0) {
        detachHandler();
      }
    }
  };

  // export
  if (typeof define === 'function' && define.amd) {
    define(['focusLock'], function () {
      return focusLock;
    });
  } else if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module.exports) {
    module.exports = focusLock;
  } else if (window !== undefined) {
    window.focusLock = focusLock;
  }
})();
},{"focus-lock":4}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var focusInsideIframe = function focusInsideIframe(topNode) {
  return !![].concat(_toConsumableArray(topNode.querySelectorAll('iframe'))).find(function (frame) {
    return frame.contentWindow.document.hasFocus();
  });
};

exports.default = function (topNode) {
  return topNode.querySelector('*:focus') || focusInsideIframe(topNode);
};
},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newFocus = undefined;

var _tabOrder = require('./utils/tabOrder');

var _DOMutils = require('./utils/DOMutils');

var _tabUtils = require('./utils/tabUtils');

var newFocus = exports.newFocus = function newFocus(innerNodes, outerNodes, activeElement, lastNode) {
  var cnt = innerNodes.length;
  var firstFocus = innerNodes[0];
  var lastFocus = innerNodes[cnt - 1];

  var activeIndex = outerNodes.indexOf(activeElement);
  var lastIndex = outerNodes.indexOf(lastNode || activeIndex);
  var lastNodeInside = innerNodes.indexOf(lastNode);
  var indexDiff = activeIndex - lastIndex;
  var firstNodeIndex = outerNodes.indexOf(firstFocus);
  var lastNodeIndex = outerNodes.indexOf(lastFocus);

  // new focus
  if (activeIndex === -1 || lastNodeInside === -1) {
    return 0;
  }
  // old focus
  if (!indexDiff && lastNodeInside >= 0) {
    return lastNodeInside;
  }
  // jump out
  if (indexDiff && Math.abs(indexDiff) > 1) {
    return lastNodeInside;
  }
  // focus above lock
  if (activeIndex <= firstNodeIndex) {
    return cnt - 1;
  }
  // focus below lock
  if (activeIndex > lastNodeIndex) {
    return 0;
  }
  // index is inside tab order, but outside Lock
  if (indexDiff) {
    if (Math.abs(indexDiff) > 1) {
      return lastNodeInside;
    }
    return (cnt + lastNodeInside + indexDiff) % cnt;
  }
  // do nothing
  return undefined;
};

var getFocusMerge = function getFocusMerge(topNode, lastNode) {
  var activeElement = document.activeElement;

  var commonParent = (0, _DOMutils.getCommonParent)(activeElement || topNode, topNode) || topNode;

  var innerNodes = (0, _DOMutils.getTabbableNodes)(topNode);
  if (!innerNodes[0]) {
    return undefined;
  }

  var outerNodes = (0, _tabOrder.orderByTabIndex)((0, _tabUtils.getFocusables)(commonParent)).map(function (_ref) {
    var node = _ref.node;
    return node;
  });

  var newId = newFocus(innerNodes.map(function (_ref2) {
    var node = _ref2.node;
    return node;
  }), outerNodes, activeElement, lastNode);
  if (newId === undefined) {
    return newId;
  }
  return innerNodes[newId];
};

exports.default = getFocusMerge;
},{"./utils/DOMutils":7,"./utils/tabOrder":8,"./utils/tabUtils":9}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.focusMerge = exports.focusInside = exports.tabHook = undefined;

var _tabHook = require('./tabHook');

var _tabHook2 = _interopRequireDefault(_tabHook);

var _focusMerge = require('./focusMerge');

var _focusMerge2 = _interopRequireDefault(_focusMerge);

var _focusInside = require('./focusInside');

var _focusInside2 = _interopRequireDefault(_focusInside);

var _setFocus = require('./setFocus');

var _setFocus2 = _interopRequireDefault(_setFocus);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.tabHook = _tabHook2.default;
exports.focusInside = _focusInside2.default;
exports.focusMerge = _focusMerge2.default;
exports.default = _setFocus2.default;
},{"./focusInside":2,"./focusMerge":3,"./setFocus":5,"./tabHook":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.focusOn = undefined;

var _focusMerge = require('./focusMerge');

var _focusMerge2 = _interopRequireDefault(_focusMerge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var focusOn = exports.focusOn = function focusOn(target) {
  target.focus();
  if (target.contentWindow) {
    target.contentWindow.focus();
  }
};

exports.default = function (topNode, lastNode) {
  var focusable = (0, _focusMerge2.default)(topNode, lastNode);

  if (focusable) {
    focusOn(focusable.node);
  }
};
},{"./focusMerge":3}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _setFocus = require('./setFocus');

var _focusMerge = require('./focusMerge');

var target = void 0;

var handleTab = function handleTab(e) {
  if (!(e.key === 'Tab' || e.keyCode === 9) || !target.enabled) {
    return;
  }
  e.preventDefault();
  var tabbableNodes = (0, _focusMerge.getTabbableNodes)(target.node).map(function (_ref) {
    var node = _ref.node;
    return node;
  });
  var cnt = tabbableNodes.length;
  var currentFocusIndex = tabbableNodes.indexOf(e.target);
  var nextNode = (cnt + currentFocusIndex + (e.shiftKey ? -1 : +1)) % cnt;

  (0, _setFocus.focusOn)(tabbableNodes[nextNode]);
};

var _attach = function _attach() {
  return document.addEventListener('keydown', handleTab, true);
};
var _detach = function _detach() {
  return document.removeEventListener('keydown', handleTab, true);
};

exports.default = {
  attach: function attach(node, enabled) {
    if (enabled) {
      if (!target) {
        _attach();
      }
      target = {
        node: node, enabled: enabled
      };
    } else {
      this.detach();
    }
  },
  detach: function detach() {
    if (target) {
      _detach();
      target = null;
    }
  }
};
},{"./focusMerge":3,"./setFocus":5}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTabbableNodes = exports.getCommonParent = exports.notHiddenInput = exports.isVisible = undefined;

var _tabOrder = require('./tabOrder');

var _tabUtils = require('./tabUtils');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var isElementHidden = function isElementHidden(computedStyle) {
  return computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('visibility') === 'hidden';
};

var isVisible = exports.isVisible = function isVisible(node) {
  return !node || node === document || !isElementHidden(window.getComputedStyle(node, null)) && isVisible(node.parentNode);
};

var notHiddenInput = exports.notHiddenInput = function notHiddenInput(node) {
  return node.tagName !== 'INPUT' || node.type !== 'hidden';
};

var getParents = function getParents(node) {
  var parents = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  parents.push(node);
  if (node.parentNode) {
    getParents(node.parentNode, parents);
  }
  return parents;
};

var getCommonParent = exports.getCommonParent = function getCommonParent(nodea, nodeb) {
  var parentsA = getParents(nodea);
  var parentsB = getParents(nodeb);

  for (var i = 0; i < parentsA.length; i += 1) {
    var currentParent = parentsA[i];
    if (parentsB.indexOf(currentParent) >= 0) {
      return currentParent;
    }
  }
  return false;
};

var findFocusable = function findFocusable(nodes) {
  return [].concat(_toConsumableArray(nodes)).filter(function (node) {
    return isVisible(node);
  }).filter(function (node) {
    return notHiddenInput(node);
  });
};

var getTabbableNodes = exports.getTabbableNodes = function getTabbableNodes(topNode) {
  return (0, _tabOrder.orderByTabIndex)(findFocusable((0, _tabUtils.getFocusables)(topNode)));
};
},{"./tabOrder":8,"./tabUtils":9}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var tabSort = exports.tabSort = function tabSort(a, b) {
  var tabDiff = a.tabIndex - b.tabIndex;
  var indexDiff = a.index - b.index;

  if (tabDiff) {
    if (!a.tabIndex) return 1;
    if (!b.tabIndex) return -1;
  }

  return tabDiff || indexDiff;
};

var orderByTabIndex = exports.orderByTabIndex = function orderByTabIndex(nodes) {
  return [].concat(_toConsumableArray(nodes)).map(function (node, index) {
    return {
      node: node,
      index: index,
      tabIndex: node.tabIndex
    };
  }).filter(function (data) {
    return data.tabIndex >= 0;
  }).sort(tabSort);
};
},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFocusables = undefined;

var _tabbables = require('./tabbables');

var _tabbables2 = _interopRequireDefault(_tabbables);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getFocusables = exports.getFocusables = function getFocusables(parent) {
  return parent.querySelectorAll(_tabbables2.default.join(','));
};
},{"./tabbables":10}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ['button:enabled:not([readonly])', 'select:enabled:not([readonly])', 'textarea:enabled:not([readonly])', 'input:enabled:not([readonly])', 'a[href]', 'area[href]', 'iframe', '[tabindex]'];
},{}]},{},[1])(1)
});