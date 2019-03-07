(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.focusLock = factory());
}(this, function () { 'use strict';

  var toArray = function toArray(a) {
    var ret = Array(a.length);
    for (var i = 0; i < a.length; ++i) {
      ret[i] = a[i];
    }
    return ret;
  };

  var arrayFind = function arrayFind(array, search) {
    return array.filter(function (a) {
      return a === search;
    })[0];
  };

  var tabSort = function tabSort(a, b) {
    var tabDiff = a.tabIndex - b.tabIndex;
    var indexDiff = a.index - b.index;

    if (tabDiff) {
      if (!a.tabIndex) return 1;
      if (!b.tabIndex) return -1;
    }

    return tabDiff || indexDiff;
  };

  var orderByTabIndex = function orderByTabIndex(nodes, filterNegative) {
    return toArray(nodes).map(function (node, index) {
      return {
        node: node,
        index: index,
        tabIndex: node.tabIndex
      };
    }).filter(function (data) {
      return !filterNegative || data.tabIndex >= 0;
    }).sort(tabSort);
  };

  var tabbables = ['button:enabled:not([readonly])', 'select:enabled:not([readonly])', 'textarea:enabled:not([readonly])', 'input:enabled:not([readonly])', 'a[href]', 'area[href]', 'iframe', 'object', 'embed', '[tabindex]', '[contenteditable]', '[autofocus]'];

  var FOCUS_GROUP = 'data-focus-lock';
  var FOCUS_DISABLED = 'data-focus-lock-disabled';
  var FOCUS_ALLOW = 'data-no-focus-lock';
  var FOCUS_AUTO = 'data-autofocus-inside';

  var getFocusables = function getFocusables(parents) {
    return parents.reduce(function (acc, parent) {
      return acc.concat(toArray(parent.querySelectorAll(tabbables.join(','))));
    }, []);
  };

  var getParentAutofocusables = function getParentAutofocusables(parent) {
    var parentFocus = parent.querySelectorAll('[' + FOCUS_AUTO + ']');
    return toArray(parentFocus).map(function (node) {
      return getFocusables([node]);
    }).reduce(function (acc, nodes) {
      return acc.concat(nodes);
    }, []);
  };

  var isElementHidden = function isElementHidden(computedStyle) {
    if (!computedStyle || !computedStyle.getPropertyValue) {
      return false;
    }
    return computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('visibility') === 'hidden';
  };

  var isVisible = function isVisible(node) {
    return !node || node === document || !isElementHidden(window.getComputedStyle(node, null)) && isVisible(node.parentNode);
  };

  var notHiddenInput = function notHiddenInput(node) {
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

  var getCommonParent = function getCommonParent(nodea, nodeb) {
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

  var filterFocusable = function filterFocusable(nodes) {
    return toArray(nodes).filter(function (node) {
      return isVisible(node);
    }).filter(function (node) {
      return notHiddenInput(node);
    });
  };

  var getTabbableNodes = function getTabbableNodes(topNodes) {
    return orderByTabIndex(filterFocusable(getFocusables(topNodes)), true);
  };

  var getAllTabbableNodes = function getAllTabbableNodes(topNodes) {
    return orderByTabIndex(filterFocusable(getFocusables(topNodes)), false);
  };

  var parentAutofocusables = function parentAutofocusables(topNode) {
    return filterFocusable(getParentAutofocusables(topNode));
  };

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
    var group = node.getAttribute(FOCUS_GROUP);
    if (group) {
      return filterNested(toArray(getTopParent(node).querySelectorAll('[' + FOCUS_GROUP + '="' + group + '"]:not([' + FOCUS_DISABLED + '="disabled"])')));
    }
    return [node];
  };

  var findAutoFocused = function findAutoFocused(autoFocusables) {
    return function (node) {
      return !!node.autofocus || node.dataset && !!node.dataset.autofocus || autoFocusables.indexOf(node) >= 0;
    };
  };

  var newFocus = function newFocus(innerNodes, outerNodes, activeElement, lastNode, autoFocused) {
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
      return innerNodes.indexOf(autoFocused.length ? pickFirstFocus(autoFocused) : pickFirstFocus(innerNodes));
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
      var common = getCommonParent(activeElement, subEntry);
      if (common) {
        if (common.contains(topCommon)) {
          topCommon = common;
        } else {
          topCommon = getCommonParent(common, topCommon);
        }
      }
    });
    return topCommon;
  };

  var allParentAutofocusables = function allParentAutofocusables(entries) {
    return entries.reduce(function (acc, node) {
      return acc.concat(parentAutofocusables(node));
    }, []);
  };

  var notAGuard = function notAGuard(node) {
    return !(node.dataset && node.dataset.focusGuard);
  };

  var getFocusMerge = function getFocusMerge(topNode, lastNode) {
    var activeElement = document && document.activeElement;
    var entries = getAllAffectedNodes(topNode).filter(notAGuard);

    var commonParent = getTopCommonParent(activeElement || topNode, topNode, entries);

    var innerElements = getTabbableNodes(entries).filter(function (_ref) {
      var node = _ref.node;
      return notAGuard(node);
    });

    if (!innerElements[0]) {
      innerElements = getAllTabbableNodes(entries).filter(function (_ref2) {
        var node = _ref2.node;
        return notAGuard(node);
      });
      if (!innerElements[0]) {
        return undefined;
      }
    }

    var innerNodes = innerElements.map(function (_ref3) {
      var node = _ref3.node;
      return node;
    });

    var outerNodes = getTabbableNodes([commonParent]).map(function (_ref4) {
      var node = _ref4.node;
      return node;
    });

    var newId = newFocus(innerNodes, outerNodes, activeElement, lastNode, innerNodes.filter(findAutoFocused(allParentAutofocusables(entries))));

    if (newId === undefined) {
      return newId;
    }
    return innerElements[newId];
  };

  var focusInFrame = function focusInFrame(frame) {
    return frame === document.activeElement;
  };

  var focusInsideIframe = function focusInsideIframe(topNode) {
    return getAllAffectedNodes(topNode).reduce(function (result, node) {
      return result || !!arrayFind(toArray(node.querySelectorAll('iframe')), focusInFrame);
    }, false);
  };

  var focusInside = function focusInside(topNode) {
    var activeElement = document && document.activeElement;

    if (!activeElement || activeElement.dataset && activeElement.dataset.focusGuard) {
      return false;
    }
    return getAllAffectedNodes(topNode).reduce(function (result, node) {
      return result || node.contains(activeElement) || focusInsideIframe(topNode);
    }, false);
  };

  var focusIsHidden = function focusIsHidden() {
    return document && toArray(document.querySelectorAll('[' + FOCUS_ALLOW + ']')).some(function (node) {
      return node.contains(document.activeElement);
    });
  };

  var global$1 = (typeof global !== "undefined" ? global :
              typeof self !== "undefined" ? self :
              typeof window !== "undefined" ? window : {});

  // shim for using process in browser
  // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

  function defaultSetTimout() {
      throw new Error('setTimeout has not been defined');
  }
  function defaultClearTimeout () {
      throw new Error('clearTimeout has not been defined');
  }
  var cachedSetTimeout = defaultSetTimout;
  var cachedClearTimeout = defaultClearTimeout;
  if (typeof global$1.setTimeout === 'function') {
      cachedSetTimeout = setTimeout;
  }
  if (typeof global$1.clearTimeout === 'function') {
      cachedClearTimeout = clearTimeout;
  }

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
  function nextTick(fun) {
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
  }
  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  var title = 'browser';
  var platform = 'browser';
  var browser = true;
  var env = {};
  var argv = [];
  var version = ''; // empty string to avoid regexp issues
  var versions = {};
  var release = {};
  var config = {};

  function noop() {}

  var on = noop;
  var addListener = noop;
  var once = noop;
  var off = noop;
  var removeListener = noop;
  var removeAllListeners = noop;
  var emit = noop;

  function binding(name) {
      throw new Error('process.binding is not supported');
  }

  function cwd () { return '/' }
  function chdir (dir) {
      throw new Error('process.chdir is not supported');
  }function umask() { return 0; }

  // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
  var performance = global$1.performance || {};
  var performanceNow =
    performance.now        ||
    performance.mozNow     ||
    performance.msNow      ||
    performance.oNow       ||
    performance.webkitNow  ||
    function(){ return (new Date()).getTime() };

  // generate timestamp or delta
  // see http://nodejs.org/api/process.html#process_process_hrtime
  function hrtime(previousTimestamp){
    var clocktime = performanceNow.call(performance)*1e-3;
    var seconds = Math.floor(clocktime);
    var nanoseconds = Math.floor((clocktime%1)*1e9);
    if (previousTimestamp) {
      seconds = seconds - previousTimestamp[0];
      nanoseconds = nanoseconds - previousTimestamp[1];
      if (nanoseconds<0) {
        seconds--;
        nanoseconds += 1e9;
      }
    }
    return [seconds,nanoseconds]
  }

  var startTime = new Date();
  function uptime() {
    var currentTime = new Date();
    var dif = currentTime - startTime;
    return dif / 1000;
  }

  var process = {
    nextTick: nextTick,
    title: title,
    browser: browser,
    env: env,
    argv: argv,
    version: version,
    versions: versions,
    on: on,
    addListener: addListener,
    once: once,
    off: off,
    removeListener: removeListener,
    removeAllListeners: removeAllListeners,
    emit: emit,
    binding: binding,
    cwd: cwd,
    chdir: chdir,
    umask: umask,
    hrtime: hrtime,
    platform: platform,
    release: release,
    config: config,
    uptime: uptime
  };

  var focusOn = function focusOn(target) {
    target.focus();
    if (target.contentWindow) {
      target.contentWindow.focus();
    }
  };

  var guardCount = 0;
  var lockDisabled = false;

  var setFocus = (function (topNode, lastNode) {
    var focusable = getFocusMerge(topNode, lastNode);

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
  });

  var lastActiveTrap = 0;
  var lastActiveFocus = null;

  var focusOnBody = function focusOnBody() {
    return document && document.activeElement === document.body;
  };

  var isFreeFocus = function isFreeFocus() {
    return focusOnBody() || focusIsHidden();
  };

  var activateTrap = function activateTrap() {
    var result = false;
    if (lastActiveTrap) {
      var observed = lastActiveTrap;
      if (!isFreeFocus()) {
        if (observed && !focusInside(observed)) {
          result = setFocus(observed, lastActiveFocus);
        }
        lastActiveFocus = document.activeElement;
      }
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

  return focusLock;

}));
