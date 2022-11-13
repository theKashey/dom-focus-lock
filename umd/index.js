(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.focusLock = factory());
}(this, function () { 'use strict';

    /**
     * defines a focus group
     */
    var FOCUS_GROUP = 'data-focus-lock';
    /**
     * disables element discovery inside a group marked by key
     */
    var FOCUS_DISABLED = 'data-focus-lock-disabled';
    /**
     * allows uncontrolled focus within the marked area, effectively disabling focus lock for it's content
     */
    var FOCUS_ALLOW = 'data-no-focus-lock';
    /**
     * instructs autofocus engine to pick default autofocus inside a given node
     * can be set on the element or container
     */
    var FOCUS_AUTO = 'data-autofocus-inside';
    /**
     * instructs autofocus to ignore elements within a given node
     * can be set on the element or container
     */
    var FOCUS_NO_AUTOFOCUS = 'data-no-autofocus';

    /*
    IE11 support
     */
    var toArray = function (a) {
        var ret = Array(a.length);
        for (var i = 0; i < a.length; ++i) {
            ret[i] = a[i];
        }
        return ret;
    };
    var asArray = function (a) { return (Array.isArray(a) ? a : [a]); };

    var isElementHidden = function (node) {
        // we can measure only "elements"
        // consider others as "visible"
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        var computedStyle = window.getComputedStyle(node, null);
        if (!computedStyle || !computedStyle.getPropertyValue) {
            return false;
        }
        return (computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('visibility') === 'hidden');
    };
    var getParentNode = function (node) {
        // DOCUMENT_FRAGMENT_NODE can also point on ShadowRoot. In this case .host will point on the next node
        return node.parentNode && node.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                node.parentNode.host
            : node.parentNode;
    };
    var isTopNode = function (node) {
        // @ts-ignore
        return node === document || (node && node.nodeType === Node.DOCUMENT_NODE);
    };
    var isVisibleUncached = function (node, checkParent) {
        return !node || isTopNode(node) || (!isElementHidden(node) && checkParent(getParentNode(node)));
    };
    var isVisibleCached = function (visibilityCache, node) {
        var cached = visibilityCache.get(node);
        if (cached !== undefined) {
            return cached;
        }
        var result = isVisibleUncached(node, isVisibleCached.bind(undefined, visibilityCache));
        visibilityCache.set(node, result);
        return result;
    };
    var isAutoFocusAllowedUncached = function (node, checkParent) {
        return node && !isTopNode(node) ? (isAutoFocusAllowed(node) ? checkParent(getParentNode(node)) : false) : true;
    };
    var isAutoFocusAllowedCached = function (cache, node) {
        var cached = cache.get(node);
        if (cached !== undefined) {
            return cached;
        }
        var result = isAutoFocusAllowedUncached(node, isAutoFocusAllowedCached.bind(undefined, cache));
        cache.set(node, result);
        return result;
    };
    var getDataset = function (node) {
        // @ts-ignore
        return node.dataset;
    };
    var isHTMLButtonElement = function (node) { return node.tagName === 'BUTTON'; };
    var isHTMLInputElement = function (node) { return node.tagName === 'INPUT'; };
    var isRadioElement = function (node) {
        return isHTMLInputElement(node) && node.type === 'radio';
    };
    var notHiddenInput = function (node) {
        return !((isHTMLInputElement(node) || isHTMLButtonElement(node)) && (node.type === 'hidden' || node.disabled));
    };
    var isAutoFocusAllowed = function (node) {
        var attribute = node.getAttribute(FOCUS_NO_AUTOFOCUS);
        return ![true, 'true', ''].includes(attribute);
    };
    var isGuard = function (node) { var _a; return Boolean(node && ((_a = getDataset(node)) === null || _a === void 0 ? void 0 : _a.focusGuard)); };
    var isNotAGuard = function (node) { return !isGuard(node); };
    var isDefined = function (x) { return Boolean(x); };

    var tabSort = function (a, b) {
        var tabDiff = a.tabIndex - b.tabIndex;
        var indexDiff = a.index - b.index;
        if (tabDiff) {
            if (!a.tabIndex) {
                return 1;
            }
            if (!b.tabIndex) {
                return -1;
            }
        }
        return tabDiff || indexDiff;
    };
    var orderByTabIndex = function (nodes, filterNegative, keepGuards) {
        return toArray(nodes)
            .map(function (node, index) { return ({
            node: node,
            index: index,
            tabIndex: keepGuards && node.tabIndex === -1 ? ((node.dataset || {}).focusGuard ? 0 : -1) : node.tabIndex,
        }); })
            .filter(function (data) { return !filterNegative || data.tabIndex >= 0; })
            .sort(tabSort);
    };

    /**
     * list of the object to be considered as focusable
     */
    var tabbables = [
        'button:enabled',
        'select:enabled',
        'textarea:enabled',
        'input:enabled',
        // elements with explicit roles will also use explicit tabindex
        // '[role="button"]',
        'a[href]',
        'area[href]',
        'summary',
        'iframe',
        'object',
        'embed',
        'audio[controls]',
        'video[controls]',
        '[tabindex]',
        '[contenteditable]',
        '[autofocus]',
    ];

    var queryTabbables = tabbables.join(',');
    var queryGuardTabbables = "".concat(queryTabbables, ", [data-focus-guard]");
    var getFocusablesWithShadowDom = function (parent, withGuards) {
        var _a;
        return toArray(((_a = parent.shadowRoot) === null || _a === void 0 ? void 0 : _a.children) || parent.children).reduce(function (acc, child) {
            return acc.concat(child.matches(withGuards ? queryGuardTabbables : queryTabbables) ? [child] : [], getFocusablesWithShadowDom(child));
        }, []);
    };
    var getFocusables = function (parents, withGuards) {
        return parents.reduce(function (acc, parent) {
            return acc.concat(
            // add all tabbables inside and within shadow DOMs in DOM order
            getFocusablesWithShadowDom(parent, withGuards), 
            // add if node is tabbable itself
            parent.parentNode
                ? toArray(parent.parentNode.querySelectorAll(queryTabbables)).filter(function (node) { return node === parent; })
                : []);
        }, []);
    };
    /**
     * return a list of focusable nodes within an area marked as "auto-focusable"
     * @param parent
     */
    var getParentAutofocusables = function (parent) {
        var parentFocus = parent.querySelectorAll("[".concat(FOCUS_AUTO, "]"));
        return toArray(parentFocus)
            .map(function (node) { return getFocusables([node]); })
            .reduce(function (acc, nodes) { return acc.concat(nodes); }, []);
    };

    /**
     * given list of focusable elements keeps the ones user can interact with
     * @param nodes
     * @param visibilityCache
     */
    var filterFocusable = function (nodes, visibilityCache) {
        return toArray(nodes)
            .filter(function (node) { return isVisibleCached(visibilityCache, node); })
            .filter(function (node) { return notHiddenInput(node); });
    };
    var filterAutoFocusable = function (nodes, cache) {
        if (cache === void 0) { cache = new Map(); }
        return toArray(nodes).filter(function (node) { return isAutoFocusAllowedCached(cache, node); });
    };
    /**
     * only tabbable ones
     * (but with guards which would be ignored)
     */
    var getTabbableNodes = function (topNodes, visibilityCache, withGuards) {
        return orderByTabIndex(filterFocusable(getFocusables(topNodes, withGuards), visibilityCache), true, withGuards);
    };
    /**
     * actually anything "focusable", not only tabbable
     * (without guards, as long as they are not expected to be focused)
     */
    var getAllTabbableNodes = function (topNodes, visibilityCache) {
        return orderByTabIndex(filterFocusable(getFocusables(topNodes), visibilityCache), false);
    };
    /**
     * return list of nodes which are expected to be auto-focused
     * @param topNode
     * @param visibilityCache
     */
    var parentAutofocusables = function (topNode, visibilityCache) {
        return filterFocusable(getParentAutofocusables(topNode), visibilityCache);
    };
    /*
     * Determines if element is contained in scope, including nested shadow DOMs
     */
    var contains = function (scope, element) {
        if (scope.shadowRoot) {
            return contains(scope.shadowRoot, element);
        }
        else {
            if (Object.getPrototypeOf(scope).contains !== undefined &&
                Object.getPrototypeOf(scope).contains.call(scope, element)) {
                return true;
            }
            return toArray(scope.children).some(function (child) { return contains(child, element); });
        }
    };

    /**
     * in case of multiple nodes nested inside each other
     * keeps only top ones
     * this is O(nlogn)
     * @param nodes
     * @returns {*}
     */
    var filterNested = function (nodes) {
        var contained = new Set();
        var l = nodes.length;
        for (var i = 0; i < l; i += 1) {
            for (var j = i + 1; j < l; j += 1) {
                var position = nodes[i].compareDocumentPosition(nodes[j]);
                /* eslint-disable no-bitwise */
                if ((position & Node.DOCUMENT_POSITION_CONTAINED_BY) > 0) {
                    contained.add(j);
                }
                if ((position & Node.DOCUMENT_POSITION_CONTAINS) > 0) {
                    contained.add(i);
                }
                /* eslint-enable */
            }
        }
        return nodes.filter(function (_, index) { return !contained.has(index); });
    };
    /**
     * finds top most parent for a node
     * @param node
     * @returns {*}
     */
    var getTopParent = function (node) {
        return node.parentNode ? getTopParent(node.parentNode) : node;
    };
    /**
     * returns all "focus containers" inside a given node
     * @param node
     * @returns {T}
     */
    var getAllAffectedNodes = function (node) {
        var nodes = asArray(node);
        return nodes.filter(Boolean).reduce(function (acc, currentNode) {
            var group = currentNode.getAttribute(FOCUS_GROUP);
            acc.push.apply(acc, (group
                ? filterNested(toArray(getTopParent(currentNode).querySelectorAll("[".concat(FOCUS_GROUP, "=\"").concat(group, "\"]:not([").concat(FOCUS_DISABLED, "=\"disabled\"])"))))
                : [currentNode]));
            return acc;
        }, []);
    };

    var getNestedShadowActiveElement = function (shadowRoot) {
        return shadowRoot.activeElement
            ? shadowRoot.activeElement.shadowRoot
                ? getNestedShadowActiveElement(shadowRoot.activeElement.shadowRoot)
                : shadowRoot.activeElement
            : undefined;
    };
    /**
     * returns active element from document or from nested shadowdoms
     */
    var getActiveElement = function () {
        return (document.activeElement
            ? document.activeElement.shadowRoot
                ? getNestedShadowActiveElement(document.activeElement.shadowRoot)
                : document.activeElement
            : undefined); // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };

    var focusInFrame = function (frame) { return frame === document.activeElement; };
    var focusInsideIframe = function (topNode) {
        return Boolean(toArray(topNode.querySelectorAll('iframe')).some(function (node) { return focusInFrame(node); }));
    };
    /**
     * @returns {Boolean} true, if the current focus is inside given node or nodes
     */
    var focusInside = function (topNode) {
        var activeElement = document && getActiveElement();
        if (!activeElement || (activeElement.dataset && activeElement.dataset.focusGuard)) {
            return false;
        }
        return getAllAffectedNodes(topNode).some(function (node) { return contains(node, activeElement) || focusInsideIframe(node); });
    };

    /**
     * focus is hidden FROM the focus-lock
     * ie contained inside a node focus-lock shall ignore
     * @returns {boolean} focus is currently is in "allow" area
     */
    var focusIsHidden = function () {
        var activeElement = document && getActiveElement();
        if (!activeElement) {
            return false;
        }
        // this does not support setting FOCUS_ALLOW within shadow dom
        return toArray(document.querySelectorAll("[".concat(FOCUS_ALLOW, "]"))).some(function (node) { return contains(node, activeElement); });
    };

    var findSelectedRadio = function (node, nodes) {
        return nodes
            .filter(isRadioElement)
            .filter(function (el) { return el.name === node.name; })
            .filter(function (el) { return el.checked; })[0] || node;
    };
    var correctNode = function (node, nodes) {
        if (isRadioElement(node) && node.name) {
            return findSelectedRadio(node, nodes);
        }
        return node;
    };
    /**
     * giving a set of radio inputs keeps only selected (tabbable) ones
     * @param nodes
     */
    var correctNodes = function (nodes) {
        // IE11 has no Set(array) constructor
        var resultSet = new Set();
        nodes.forEach(function (node) { return resultSet.add(correctNode(node, nodes)); });
        // using filter to support IE11
        return nodes.filter(function (node) { return resultSet.has(node); });
    };

    var pickFirstFocus = function (nodes) {
        if (nodes[0] && nodes.length > 1) {
            return correctNode(nodes[0], nodes);
        }
        return nodes[0];
    };
    var pickFocusable = function (nodes, index) {
        if (nodes.length > 1) {
            return nodes.indexOf(correctNode(nodes[index], nodes));
        }
        return index;
    };

    var NEW_FOCUS = 'NEW_FOCUS';
    /**
     * Main solver for the "find next focus" question
     * @param innerNodes
     * @param outerNodes
     * @param activeElement
     * @param lastNode
     * @returns {number|string|undefined|*}
     */
    var newFocus = function (innerNodes, outerNodes, activeElement, lastNode) {
        var cnt = innerNodes.length;
        var firstFocus = innerNodes[0];
        var lastFocus = innerNodes[cnt - 1];
        var isOnGuard = isGuard(activeElement);
        // focus is inside
        if (activeElement && innerNodes.indexOf(activeElement) >= 0) {
            return undefined;
        }
        var activeIndex = activeElement !== undefined ? outerNodes.indexOf(activeElement) : -1;
        var lastIndex = lastNode ? outerNodes.indexOf(lastNode) : activeIndex;
        var lastNodeInside = lastNode ? innerNodes.indexOf(lastNode) : -1;
        var indexDiff = activeIndex - lastIndex;
        var firstNodeIndex = outerNodes.indexOf(firstFocus);
        var lastNodeIndex = outerNodes.indexOf(lastFocus);
        var correctedNodes = correctNodes(outerNodes);
        var correctedIndex = activeElement !== undefined ? correctedNodes.indexOf(activeElement) : -1;
        var correctedIndexDiff = correctedIndex - (lastNode ? correctedNodes.indexOf(lastNode) : activeIndex);
        var returnFirstNode = pickFocusable(innerNodes, 0);
        var returnLastNode = pickFocusable(innerNodes, cnt - 1);
        // new focus
        if (activeIndex === -1 || lastNodeInside === -1) {
            return NEW_FOCUS;
        }
        // old focus
        if (!indexDiff && lastNodeInside >= 0) {
            return lastNodeInside;
        }
        // first element
        if (activeIndex <= firstNodeIndex && isOnGuard && Math.abs(indexDiff) > 1) {
            return returnLastNode;
        }
        // last element
        if (activeIndex >= lastNodeIndex && isOnGuard && Math.abs(indexDiff) > 1) {
            return returnFirstNode;
        }
        // jump out, but not on the guard
        if (indexDiff && Math.abs(correctedIndexDiff) > 1) {
            return lastNodeInside;
        }
        // focus above lock
        if (activeIndex <= firstNodeIndex) {
            return returnLastNode;
        }
        // focus below lock
        if (activeIndex > lastNodeIndex) {
            return returnFirstNode;
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

    var findAutoFocused = function (autoFocusables) {
        return function (node) {
            var _a;
            var autofocus = (_a = getDataset(node)) === null || _a === void 0 ? void 0 : _a.autofocus;
            return (
            // @ts-expect-error
            node.autofocus ||
                //
                (autofocus !== undefined && autofocus !== 'false') ||
                //
                autoFocusables.indexOf(node) >= 0);
        };
    };
    var pickAutofocus = function (nodesIndexes, orderedNodes, groups) {
        var nodes = nodesIndexes.map(function (_a) {
            var node = _a.node;
            return node;
        });
        var autoFocusable = filterAutoFocusable(nodes.filter(findAutoFocused(groups)));
        if (autoFocusable && autoFocusable.length) {
            return pickFirstFocus(autoFocusable);
        }
        return pickFirstFocus(filterAutoFocusable(orderedNodes));
    };

    var getParents = function (node, parents) {
        if (parents === void 0) { parents = []; }
        parents.push(node);
        if (node.parentNode) {
            getParents(node.parentNode.host || node.parentNode, parents);
        }
        return parents;
    };
    /**
     * finds a parent for both nodeA and nodeB
     * @param nodeA
     * @param nodeB
     * @returns {boolean|*}
     */
    var getCommonParent = function (nodeA, nodeB) {
        var parentsA = getParents(nodeA);
        var parentsB = getParents(nodeB);
        // tslint:disable-next-line:prefer-for-of
        for (var i = 0; i < parentsA.length; i += 1) {
            var currentParent = parentsA[i];
            if (parentsB.indexOf(currentParent) >= 0) {
                return currentParent;
            }
        }
        return false;
    };
    var getTopCommonParent = function (baseActiveElement, leftEntry, rightEntries) {
        var activeElements = asArray(baseActiveElement);
        var leftEntries = asArray(leftEntry);
        var activeElement = activeElements[0];
        var topCommon = false;
        leftEntries.filter(Boolean).forEach(function (entry) {
            topCommon = getCommonParent(topCommon || entry, entry) || topCommon;
            rightEntries.filter(Boolean).forEach(function (subEntry) {
                var common = getCommonParent(activeElement, subEntry);
                if (common) {
                    if (!topCommon || contains(common, topCommon)) {
                        topCommon = common;
                    }
                    else {
                        topCommon = getCommonParent(common, topCommon);
                    }
                }
            });
        });
        // TODO: add assert here?
        return topCommon;
    };
    /**
     * return list of nodes which are expected to be autofocused inside a given top nodes
     * @param entries
     * @param visibilityCache
     */
    var allParentAutofocusables = function (entries, visibilityCache) {
        return entries.reduce(function (acc, node) { return acc.concat(parentAutofocusables(node, visibilityCache)); }, []);
    };

    var reorderNodes = function (srcNodes, dstNodes) {
        var remap = new Map();
        // no Set(dstNodes) for IE11 :(
        dstNodes.forEach(function (entity) { return remap.set(entity.node, entity); });
        // remap to dstNodes
        return srcNodes.map(function (node) { return remap.get(node); }).filter(isDefined);
    };
    /**
     * given top node(s) and the last active element return the element to be focused next
     * @param topNode
     * @param lastNode
     */
    var getFocusMerge = function (topNode, lastNode) {
        var activeElement = document && getActiveElement();
        var entries = getAllAffectedNodes(topNode).filter(isNotAGuard);
        var commonParent = getTopCommonParent(activeElement || topNode, topNode, entries);
        var visibilityCache = new Map();
        var anyFocusable = getAllTabbableNodes(entries, visibilityCache);
        var innerElements = getTabbableNodes(entries, visibilityCache).filter(function (_a) {
            var node = _a.node;
            return isNotAGuard(node);
        });
        if (!innerElements[0]) {
            innerElements = anyFocusable;
            if (!innerElements[0]) {
                return undefined;
            }
        }
        var outerNodes = getAllTabbableNodes([commonParent], visibilityCache).map(function (_a) {
            var node = _a.node;
            return node;
        });
        var orderedInnerElements = reorderNodes(outerNodes, innerElements);
        var innerNodes = orderedInnerElements.map(function (_a) {
            var node = _a.node;
            return node;
        });
        var newId = newFocus(innerNodes, outerNodes, activeElement, lastNode);
        if (newId === NEW_FOCUS) {
            return { node: pickAutofocus(anyFocusable, innerNodes, allParentAutofocusables(entries, visibilityCache)) };
        }
        if (newId === undefined) {
            return newId;
        }
        return orderedInnerElements[newId];
    };

    var focusOn = function (target, focusOptions) {
        if ('focus' in target) {
            target.focus(focusOptions);
        }
        if ('contentWindow' in target && target.contentWindow) {
            target.contentWindow.focus();
        }
    };
    var guardCount = 0;
    var lockDisabled = false;
    /**
     * Sets focus at a given node. The last focused element will help to determine which element(first or last) should be focused.
     * HTML markers (see {@link import('./constants').FOCUS_AUTO} constants) can control autofocus
     * @param topNode
     * @param lastNode
     * @param options
     */
    var setFocus = function (topNode, lastNode, options) {
        if (options === void 0) { options = {}; }
        var focusable = getFocusMerge(topNode, lastNode);
        if (lockDisabled) {
            return;
        }
        if (focusable) {
            if (guardCount > 2) {
                // tslint:disable-next-line:no-console
                console.error('FocusLock: focus-fighting detected. Only one focus management system could be active. ' +
                    'See https://github.com/theKashey/focus-lock/#focus-fighting');
                lockDisabled = true;
                setTimeout(function () {
                    lockDisabled = false;
                }, 1);
                return;
            }
            guardCount++;
            focusOn(focusable.node, options.focusOptions);
            guardCount--;
        }
    };

    /* eslint-disable */

    //

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
