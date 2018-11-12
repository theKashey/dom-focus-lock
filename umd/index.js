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
    var result = false;
    if (lastActiveTrap) {
      var observed = lastActiveTrap;
      if (observed && !focusInside(observed)) {
        result = moveFocusInside(observed, lastActiveFocus);
      }
      lastActiveFocus = document.activeElement;
    }
    return result;
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

  var emitChange = function emitChange(event) {
    if (handleStateChangeOnClient(reducePropsToState(instances))) {
      event && event.preventDefault();
      return true;
    }
    return false;
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
  // eslint-disable-next-line no-undef
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
},{"focus-lock":6}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var FOCUS_GROUP = exports.FOCUS_GROUP = 'data-focus-lock';
var FOCUS_DISABLED = exports.FOCUS_DISABLED = 'data-focus-lock-disabled';
var FOCUS_ALLOW = exports.FOCUS_ALLOW = 'data-no-focus-lock';
var FOCUS_AUTO = exports.FOCUS_AUTO = 'data-autofocus-inside';
},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _allAffected = require('./utils/all-affected');

var _allAffected2 = _interopRequireDefault(_allAffected);

var _array = require('./utils/array');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var focusInFrame = function focusInFrame(frame) {
  return frame === document.activeElement;
};

var focusInsideIframe = function focusInsideIframe(topNode) {
  return (0, _allAffected2.default)(topNode).reduce(function (result, node) {
    return result || !!(0, _array.arrayFind)((0, _array.toArray)(node.querySelectorAll('iframe')), focusInFrame);
  }, false);
};

var focusInside = function focusInside(topNode) {
  var activeElement = document && document.activeElement;

  if (!activeElement || activeElement.dataset && activeElement.dataset.focusGuard) {
    return false;
  }
  return (0, _allAffected2.default)(topNode).reduce(function (result, node) {
    return result || node.contains(activeElement) || focusInsideIframe(topNode);
  }, false);
};

exports.default = focusInside;
},{"./utils/all-affected":10,"./utils/array":11}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _array = require('./utils/array');

var _constants = require('./constants');

var focusIsHidden = function focusIsHidden() {
  return document && (0, _array.toArray)(document.querySelectorAll('[' + _constants.FOCUS_ALLOW + ']')).some(function (node) {
    return node.contains(document.activeElement);
  });
};

exports.default = focusIsHidden;
},{"./constants":2,"./utils/array":11}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newFocus = undefined;

var _DOMutils = require('./utils/DOMutils');

var _firstFocus = require('./utils/firstFocus');

var _firstFocus2 = _interopRequireDefault(_firstFocus);

var _allAffected = require('./utils/all-affected');

var _allAffected2 = _interopRequireDefault(_allAffected);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var findAutoFocused = function findAutoFocused(autoFocusables) {
  return function (node) {
    return !!node.autofocus || node.dataset && !!node.dataset.autofocus || autoFocusables.indexOf(node) >= 0;
  };
};

var newFocus = exports.newFocus = function newFocus(innerNodes, outerNodes, activeElement, lastNode, autoFocused) {
  var cnt = innerNodes.length;
  var firstFocus = innerNodes[0];
  var lastFocus = innerNodes[cnt - 1];

  // focus is inside
  if (innerNodes.indexOf(activeElement) >= 0) {
    return undefined;
  }

  var activeIndex = outerNodes.indexOf(activeElement);
  var lastIndex = outerNodes.indexOf(lastNode || activeIndex);
  var lastNodeInside = innerNodes.indexOf(lastNode);
  var indexDiff = activeIndex - lastIndex;
  var firstNodeIndex = outerNodes.indexOf(firstFocus);
  var lastNodeIndex = outerNodes.indexOf(lastFocus);

  // new focus
  if (activeIndex === -1 || lastNodeInside === -1) {
    return innerNodes.indexOf(autoFocused.length ? (0, _firstFocus2.default)(autoFocused) : (0, _firstFocus2.default)(innerNodes));
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

var getTopCommonParent = function getTopCommonParent(activeElement, entry, entries) {
  var topCommon = entry;
  entries.forEach(function (subEntry) {
    var common = (0, _DOMutils.getCommonParent)(activeElement, subEntry);
    if (common) {
      if (common.contains(topCommon)) {
        topCommon = common;
      } else {
        topCommon = (0, _DOMutils.getCommonParent)(common, topCommon);
      }
    }
  });
  return topCommon;
};

var allParentAutofocusables = function allParentAutofocusables(entries) {
  return entries.reduce(function (acc, node) {
    return acc.concat((0, _DOMutils.parentAutofocusables)(node));
  }, []);
};

var notAGuard = function notAGuard(node) {
  return !(node.dataset && node.dataset.focusGuard);
};

var getFocusMerge = function getFocusMerge(topNode, lastNode) {
  var activeElement = document && document.activeElement;
  var entries = (0, _allAffected2.default)(topNode).filter(notAGuard);

  var commonParent = getTopCommonParent(activeElement || topNode, topNode, entries);

  var innerElements = (0, _DOMutils.getTabbableNodes)(entries).filter(function (_ref) {
    var node = _ref.node;
    return notAGuard(node);
  });
  if (!innerElements[0]) {
    return undefined;
  }

  var innerNodes = innerElements.map(function (_ref2) {
    var node = _ref2.node;
    return node;
  });

  var outerNodes = (0, _DOMutils.getTabbableNodes)([commonParent]).map(function (_ref3) {
    var node = _ref3.node;
    return node;
  });

  var newId = newFocus(innerNodes, outerNodes, activeElement, lastNode, innerNodes.filter(findAutoFocused(allParentAutofocusables(entries))));

  if (newId === undefined) {
    return newId;
  }
  return innerElements[newId];
};

exports.default = getFocusMerge;
},{"./utils/DOMutils":9,"./utils/all-affected":10,"./utils/firstFocus":12}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllAffectedNodes = exports.constants = exports.focusMerge = exports.focusIsHidden = exports.focusInside = exports.tabHook = undefined;

var _tabHook = require('./tabHook');

var _tabHook2 = _interopRequireDefault(_tabHook);

var _focusMerge = require('./focusMerge');

var _focusMerge2 = _interopRequireDefault(_focusMerge);

var _focusInside = require('./focusInside');

var _focusInside2 = _interopRequireDefault(_focusInside);

var _focusIsHidden = require('./focusIsHidden');

var _focusIsHidden2 = _interopRequireDefault(_focusIsHidden);

var _setFocus = require('./setFocus');

var _setFocus2 = _interopRequireDefault(_setFocus);

var _constants = require('./constants');

var constants = _interopRequireWildcard(_constants);

var _allAffected = require('./utils/all-affected');

var _allAffected2 = _interopRequireDefault(_allAffected);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.tabHook = _tabHook2.default;
exports.focusInside = _focusInside2.default;
exports.focusIsHidden = _focusIsHidden2.default;
exports.focusMerge = _focusMerge2.default;
exports.constants = constants;
exports.getAllAffectedNodes = _allAffected2.default;
exports.default = _setFocus2.default;
},{"./constants":2,"./focusInside":3,"./focusIsHidden":4,"./focusMerge":5,"./setFocus":7,"./tabHook":8,"./utils/all-affected":10}],7:[function(require,module,exports){
(function (process){
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

var guardCount = 0;
var lockDisabled = false;

exports.default = function (topNode, lastNode) {
  var focusable = (0, _focusMerge2.default)(topNode, lastNode);

  if (lockDisabled) {
    return;
  }

  if (focusable) {
    if (guardCount > 2) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('FocusLock: focus-fighting detected. Only one focus management system could be active. ' + 'See https://github.com/theKashey/focus-lock/#focus-fighting');
        lockDisabled = true;
        setTimeout(function () {
          lockDisabled = false;
        }, 1);
      }
      return;
    }
    guardCount++;
    focusOn(focusable.node);
    guardCount--;
  }
};
}).call(this,require('_process'))
},{"./focusMerge":5,"_process":16}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  attach: function attach(node, enabled) {},
  detach: function detach() {}
};
},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parentAutofocusables = exports.getTabbableNodes = exports.filterFocusable = exports.getCommonParent = exports.notHiddenInput = exports.isVisible = undefined;

var _tabOrder = require('./tabOrder');

var _tabUtils = require('./tabUtils');

var _array = require('./array');

var isElementHidden = function isElementHidden(computedStyle) {
  if (!computedStyle || !computedStyle.getPropertyValue) {
    return false;
  }
  return computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('visibility') === 'hidden';
};

var isVisible = exports.isVisible = function isVisible(node) {
  return !node || node === document || !isElementHidden(window.getComputedStyle(node, null)) && isVisible(node.parentNode);
};

var notHiddenInput = exports.notHiddenInput = function notHiddenInput(node) {
  return !((node.tagName === 'INPUT' || node.tagName === 'BUTTON') && (node.type === 'hidden' || node.disabled));
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

var filterFocusable = exports.filterFocusable = function filterFocusable(nodes) {
  return (0, _array.toArray)(nodes).filter(function (node) {
    return isVisible(node);
  }).filter(function (node) {
    return notHiddenInput(node);
  });
};

var getTabbableNodes = exports.getTabbableNodes = function getTabbableNodes(topNodes) {
  return (0, _tabOrder.orderByTabIndex)(filterFocusable((0, _tabUtils.getFocusables)(topNodes)));
};

var parentAutofocusables = exports.parentAutofocusables = function parentAutofocusables(topNode) {
  return filterFocusable((0, _tabUtils.getParentAutofocusables)(topNode));
};
},{"./array":11,"./tabOrder":13,"./tabUtils":14}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _constants = require('../constants');

var _array = require('./array');

var filterNested = function filterNested(nodes) {
  var l = nodes.length;
  var i = void 0;
  var j = void 0;
  for (i = 0; i < l; i += 1) {
    for (j = 0; j < l; j += 1) {
      if (i !== j) {
        if (nodes[i].contains(nodes[j])) {
          return filterNested(nodes.filter(function (x) {
            return x !== nodes[j];
          }));
        }
      }
    }
  }
  return nodes;
};

var getTopParent = function getTopParent(node) {
  return node.parentNode ? getTopParent(node.parentNode) : node;
};

var getAllAffectedNodes = function getAllAffectedNodes(node) {
  var group = node.getAttribute(_constants.FOCUS_GROUP);
  if (group) {
    return filterNested((0, _array.toArray)(getTopParent(node).querySelectorAll('[' + _constants.FOCUS_GROUP + '="' + group + '"]:not([' + _constants.FOCUS_DISABLED + '="disabled"])')));
  }
  return [node];
};

exports.default = getAllAffectedNodes;
},{"../constants":2,"./array":11}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var toArray = exports.toArray = function toArray(a) {
  var ret = Array(a.length);
  for (var i = 0; i < a.length; ++i) {
    ret[i] = a[i];
  }
  return ret;
};

var arrayFind = exports.arrayFind = function arrayFind(array, search) {
  return array.filter(function (a) {
    return a === search;
  })[0];
};
},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var isRadio = function isRadio(node) {
  return node.tagName === 'INPUT' && node.type === 'radio';
};

var findSelectedRadio = function findSelectedRadio(node, nodes) {
  return nodes.filter(isRadio).filter(function (el) {
    return el.name === node.name;
  }).filter(function (el) {
    return el.checked;
  })[0] || node;
};

var pickFirstFocus = function pickFirstFocus(nodes) {
  if (nodes[0] && nodes.length > 1) {
    if (isRadio(nodes[0]) && nodes[0].name) {
      return findSelectedRadio(nodes[0], nodes);
    }
  }
  return nodes[0];
};

exports.default = pickFirstFocus;
},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.orderByTabIndex = exports.tabSort = undefined;

var _array = require('./array');

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
  return (0, _array.toArray)(nodes).map(function (node, index) {
    return {
      node: node,
      index: index,
      tabIndex: node.tabIndex
    };
  }).filter(function (data) {
    return data.tabIndex >= 0;
  }).sort(tabSort);
};
},{"./array":11}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getParentAutofocusables = exports.getFocusables = undefined;

var _tabbables = require('./tabbables');

var _tabbables2 = _interopRequireDefault(_tabbables);

var _array = require('./array');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getFocusables = exports.getFocusables = function getFocusables(parents) {
  return parents.reduce(function (acc, parent) {
    return acc.concat((0, _array.toArray)(parent.querySelectorAll(_tabbables2.default.join(','))));
  }, []);
};

var getParentAutofocusables = exports.getParentAutofocusables = function getParentAutofocusables(parent) {
  var parentFocus = parent.querySelectorAll('[' + _constants.FOCUS_AUTO + ']');
  return (0, _array.toArray)(parentFocus).map(function (node) {
    return getFocusables([node]);
  }).reduce(function (acc, nodes) {
    return acc.concat(nodes);
  }, []);
};
},{"../constants":2,"./array":11,"./tabbables":15}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ['button:enabled:not([readonly])', 'select:enabled:not([readonly])', 'textarea:enabled:not([readonly])', 'input:enabled:not([readonly])', 'a[href]', 'area[href]', 'iframe', 'object', 'embed', '[tabindex]', '[contenteditable]', '[autofocus]'];
},{}],16:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});