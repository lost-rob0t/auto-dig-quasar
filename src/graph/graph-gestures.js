const GESTURE_SCRATCH = "quasar-graph-gestures";
const DESKTOP_DROP_PADDING = 14;
const TOUCH_DROP_PADDING = 30;
const DRAG_THRESHOLD_SQUARED = 36;
const USER_NAVIGATION_GUARD_MS = 360;

function distanceSquared(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function editableTarget(target) {
  return target instanceof HTMLElement
    && Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}

export function boxesOverlap(left, right, padding = 0) {
  return !(
    left.x2 + padding < right.x1
    || left.x1 - padding > right.x2
    || left.y2 + padding < right.y1
    || left.y1 - padding > right.y2
  );
}

export function relationDropPadding(pointerType = "") {
  return pointerType === "touch" || pointerType === "pen"
    ? TOUCH_DROP_PADDING
    : DESKTOP_DROP_PADDING;
}

export function shouldStartManualPan(event, spacePressed = false) {
  if (!event || event.pointerType === "touch" || event.pointerType === "pen") return false;
  return event.button === 1 || (spacePressed && event.button === 0);
}

export function shouldStartTouchPan(event) {
  return event?.pointerType === "touch" || event?.pointerType === "pen";
}

export function markUserNavigation(
  state,
  now = Date.now(),
  duration = USER_NAVIGATION_GUARD_MS
) {
  if (!state) return 0;
  state.userNavigationUntil = Math.max(state.userNavigationUntil || 0, now + duration);
  return state.userNavigationUntil;
}

export function isUserNavigationActive(state, now = Date.now()) {
  return Boolean(state && now < (state.userNavigationUntil || 0));
}

export function selectSingleNode(cy, node) {
  if (!cy || !node?.length) return false;

  const apply = () => {
    const otherNodes = cy.$("node:selected").not(node);
    if (otherNodes.length) otherNodes.unselect();
    if (!node.selected()) node.select();
  };

  if (typeof cy.batch === "function") cy.batch(apply);
  else apply();
  return true;
}

export function installUserNavigationGuard(cy, state) {
  const nativePanBy = cy.panBy.bind(cy);
  state.nativePanBy = nativePanBy;
  cy.panBy = (...args) => (
    isUserNavigationActive(state) ? cy : nativePanBy(...args)
  );

  return () => {
    cy.panBy = nativePanBy;
    state.nativePanBy = null;
  };
}

function installPanControls(cy, state) {
  const container = cy.container?.();
  if (!container) return () => {};

  const baseUserPanning = cy.userPanningEnabled();
  const previousTabIndex = container.getAttribute("tabindex");
  if (previousTabIndex === null) container.tabIndex = 0;

  const finishManualPan = (event) => {
    if (!state.manualPan || event.pointerId !== state.manualPan.pointerId) return;
    try {
      container.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    state.manualPan = null;
  };

  const releasePointer = (event) => {
    finishManualPan(event);
    if (!state.touchPointers.delete(event.pointerId)) return;
    if (!state.touchPointers.size) cy.userPanningEnabled(baseUserPanning);
  };

  const reset = () => {
    state.manualPan = null;
    state.touchPointers.clear();
    state.spacePressed = false;
    cy.userPanningEnabled(baseUserPanning);
  };

  const onPointerDown = (event) => {
    container.focus({ preventScroll: true });

    if (shouldStartTouchPan(event)) {
      state.touchPointers.add(event.pointerId);
      cy.userPanningEnabled(true);
      return;
    }

    if (!shouldStartManualPan(event, state.spacePressed)) return;
    state.manualPan = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    container.setPointerCapture?.(event.pointerId);
    markUserNavigation(state);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event) => {
    const pan = state.manualPan;
    if (!pan || event.pointerId !== pan.pointerId) return;
    const x = event.clientX;
    const y = event.clientY;
    const shift = { x: x - pan.x, y: y - pan.y };
    pan.x = x;
    pan.y = y;

    if (shift.x || shift.y) {
      markUserNavigation(state);
      state.nativePanBy?.(shift);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerEnter = () => { state.pointerInside = true; };
  const onPointerLeave = () => { state.pointerInside = false; };
  const onKeyDown = (event) => {
    if (
      event.code !== "Space"
      || event.repeat
      || editableTarget(event.target)
      || !state.pointerInside
    ) return;
    state.spacePressed = true;
    event.preventDefault();
  };
  const onKeyUp = (event) => {
    if (event.code === "Space") state.spacePressed = false;
  };

  container.addEventListener("pointerdown", onPointerDown, true);
  container.addEventListener("pointermove", onPointerMove, true);
  container.addEventListener("pointerenter", onPointerEnter);
  container.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", reset);

  return () => {
    container.removeEventListener("pointerdown", onPointerDown, true);
    container.removeEventListener("pointermove", onPointerMove, true);
    container.removeEventListener("pointerenter", onPointerEnter);
    container.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("pointerup", releasePointer);
    window.removeEventListener("pointercancel", releasePointer);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", reset);
    if (previousTabIndex === null) container.removeAttribute("tabindex");
    else container.setAttribute("tabindex", previousTabIndex);
    cy.userPanningEnabled(baseUserPanning);
  };
}

export function findRelationDropTarget(cy, sourceNode, padding = DESKTOP_DROP_PADDING) {
  if (!cy || !sourceNode?.length) return null;
  const sourceBox = sourceNode.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
  const sourcePosition = sourceNode.renderedPosition();
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  cy.nodes().forEach((candidate) => {
    if (
      candidate.id() === sourceNode.id()
      || candidate.data("unresolved")
      || !candidate.visible()
    ) return;

    const targetBox = candidate.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
    if (!boxesOverlap(sourceBox, targetBox, padding)) return;
    const distance = distanceSquared(sourcePosition, candidate.renderedPosition());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  });

  return best;
}

function pointerTypeFromEvent(event) {
  const originalEvent = event?.originalEvent;
  if (!originalEvent || !("pointerType" in originalEvent)) return "";
  return typeof originalEvent.pointerType === "string" ? originalEvent.pointerType : "";
}

function emitContextTap(event) {
  const target = event.target;
  if (!target?.emit) return;
  event.originalEvent?.preventDefault?.();
  target.emit({
    type: "cxttap",
    target,
    position: event.position,
    renderedPosition: event.renderedPosition,
    originalEvent: event.originalEvent,
    quasarGesture: "hold"
  });
}

function emitRelationDraft(cy, sourceNode, targetNode) {
  const sourceRendered = sourceNode.renderedPosition();
  const targetRendered = targetNode.renderedPosition();
  const renderedPosition = {
    x: (sourceRendered.x + targetRendered.x) / 2,
    y: (sourceRendered.y + targetRendered.y) / 2
  };
  const position = {
    x: (sourceNode.position().x + targetNode.position().x) / 2,
    y: (sourceNode.position().y + targetNode.position().y) / 2
  };
  const preview = cy.add({
    group: "edges",
    data: {
      id: `relation-preview-gesture-${sourceNode.id()}-${targetNode.id()}-${Date.now()}`,
      source: sourceNode.id(),
      target: targetNode.id()
    }
  });

  cy.emit({ type: "ehcomplete", target: cy, position, renderedPosition }, [
    sourceNode,
    targetNode,
    preview
  ]);
}

export function installGraphGestures(cy) {
  if (!cy || cy.scratch(GESTURE_SCRATCH)) return cy;

  const state = {
    armedNodeId: null,
    drag: null,
    panningEnabled: true,
    pointerInside: false,
    spacePressed: false,
    manualPan: null,
    touchPointers: new Set(),
    userNavigationUntil: 0,
    nativePanBy: null
  };
  cy.scratch(GESTURE_SCRATCH, state);

  const restorePanBy = installUserNavigationGuard(cy, state);
  const removePanControls = installPanControls(cy, state);

  cy.on("tap", (event) => {
    if (event.target === cy) state.armedNodeId = null;
  });
  cy.on("tap", "node", (event) => {
    if (!event.target.data("unresolved")) state.armedNodeId = event.target.id();
  });
  cy.on("unselect", "node", (event) => {
    if (state.armedNodeId === event.target.id()) state.armedNodeId = null;
  });
  cy.on("dragpan scrollzoom pinchzoom", () => {
    state.armedNodeId = null;
    markUserNavigation(state);
  });
  cy.on("cxttapstart cxttap", "node", (event) => {
    selectSingleNode(cy, event.target);
  });
  cy.on("grab", "node", (event) => {
    const node = event.target;
    if (node.data("unresolved")) return;
    const pointerType = pointerTypeFromEvent(event);
    state.panningEnabled = cy.panningEnabled();
    cy.panningEnabled(false);
    state.drag = {
      id: node.id(),
      position: { ...node.position() },
      renderedPosition: { ...node.renderedPosition() },
      relationArmed: state.armedNodeId === node.id() && node.selected(),
      pointerType,
      moved: false
    };
    if (!node.selected()) {
      cy.$("node:selected").unselect();
      node.select();
    }
  });
  cy.on("drag", "node", (event) => {
    if (!state.drag || state.drag.id !== event.target.id()) return;
    state.drag.moved = distanceSquared(
      state.drag.renderedPosition,
      event.target.renderedPosition()
    ) >= DRAG_THRESHOLD_SQUARED;
  });
  cy.on("dragfree", "node", (event) => {
    const sourceNode = event.target;
    const drag = state.drag;
    state.drag = null;
    cy.panningEnabled(state.panningEnabled);
    if (!drag || drag.id !== sourceNode.id()) return;

    state.armedNodeId = sourceNode.id();
    if (!drag.moved || !drag.relationArmed) return;

    const targetNode = findRelationDropTarget(
      cy,
      sourceNode,
      relationDropPadding(drag.pointerType)
    );
    if (!targetNode) return;

    sourceNode.position(drag.position);
    state.armedNodeId = null;
    emitRelationDraft(cy, sourceNode, targetNode);
  });
  cy.on("free", "node", () => {
    if (!state.drag) cy.panningEnabled(state.panningEnabled);
  });
  cy.on("taphold", (event) => {
    if (state.drag?.moved) return;
    emitContextTap(event);
  });
  cy.on("destroy", () => {
    removePanControls();
    restorePanBy();
  });

  return cy;
}
