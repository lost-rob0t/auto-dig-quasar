import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boxesOverlap,
  installUserNavigationGuard,
  isUserNavigationActive,
  markUserNavigation,
  relationDropPadding,
  selectSingleNode,
  shouldStartManualPan,
  shouldStartTouchPan
} from "./graph-gestures";

afterEach(() => vi.restoreAllMocks());

describe("graph gestures", () => {
  it("detects a relation drop when node boxes overlap", () => {
    expect(boxesOverlap(
      { x1: 10, y1: 10, x2: 30, y2: 30 },
      { x1: 28, y1: 18, x2: 48, y2: 38 }
    )).toBe(true);
  });

  it("allows a small drop target margin", () => {
    expect(boxesOverlap(
      { x1: 10, y1: 10, x2: 30, y2: 30 },
      { x1: 38, y1: 10, x2: 58, y2: 30 },
      8
    )).toBe(true);
  });

  it("rejects separated node boxes", () => {
    expect(boxesOverlap(
      { x1: 10, y1: 10, x2: 30, y2: 30 },
      { x1: 60, y1: 60, x2: 80, y2: 80 },
      8
    )).toBe(false);
  });

  it("uses a larger relation target for touch dragging", () => {
    expect(relationDropPadding("touch")).toBeGreaterThan(relationDropPadding("mouse"));
    expect(relationDropPadding("pen")).toBe(relationDropPadding("touch"));
  });

  it("leaves ordinary left drag available for box selection", () => {
    expect(shouldStartManualPan({ pointerType: "mouse", button: 0 }, false)).toBe(false);
  });

  it("starts manual pan for middle drag or Space plus left drag", () => {
    expect(shouldStartManualPan({ pointerType: "mouse", button: 1 }, false)).toBe(true);
    expect(shouldStartManualPan({ pointerType: "mouse", button: 0 }, true)).toBe(true);
  });

  it("uses native panning for touch and pen input", () => {
    expect(shouldStartTouchPan({ pointerType: "touch" })).toBe(true);
    expect(shouldStartTouchPan({ pointerType: "pen" })).toBe(true);
    expect(shouldStartTouchPan({ pointerType: "mouse" })).toBe(false);
  });

  it("right-click selection replaces every other selected node", () => {
    const unselect = vi.fn();
    const select = vi.fn();
    const node = {
      length: 1,
      selected: vi.fn(() => false),
      select
    };
    const selected = {
      not: vi.fn(() => ({ length: 2, unselect }))
    };
    const cy = {
      $: vi.fn(() => selected),
      batch: vi.fn((callback) => callback())
    };

    expect(selectSingleNode(cy, node)).toBe(true);
    expect(cy.$).toHaveBeenCalledWith("node:selected");
    expect(selected.not).toHaveBeenCalledWith(node);
    expect(unselect).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
  });

  it("blocks viewport recentering while user navigation is active", () => {
    const nativePanBy = vi.fn();
    const cy = { panBy: nativePanBy };
    const state = { userNavigationUntil: 0, nativePanBy: null };
    const restore = installUserNavigationGuard(cy, state);

    markUserNavigation(state, 100, 360);
    expect(isUserNavigationActive(state, 459)).toBe(true);
    expect(isUserNavigationActive(state, 460)).toBe(false);

    vi.spyOn(Date, "now").mockReturnValue(200);
    expect(cy.panBy({ x: 10, y: 5 })).toBe(cy);
    expect(nativePanBy).not.toHaveBeenCalled();

    Date.now.mockReturnValue(500);
    cy.panBy({ x: 10, y: 5 });
    expect(nativePanBy).toHaveBeenCalledWith({ x: 10, y: 5 });

    restore();
  });
});
