import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boxesOverlap,
  relationDropPadding,
  suspendSelectionForUserPan
} from "./graph-gestures";

afterEach(() => vi.useRealTimers());

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

  it("restores selected nodes after user panning settles", () => {
    vi.useFakeTimers();
    let selected = true;
    const node = {
      id: () => "node-a",
      selected: () => selected,
      select: vi.fn(() => { selected = true; })
    };
    const selectedCollection = {
      get length() { return selected ? 1 : 0; },
      map: (callback) => selected ? [callback(node)] : [],
      unselect: vi.fn(() => { selected = false; })
    };
    const cy = {
      $: vi.fn(() => selectedCollection),
      $id: vi.fn(() => ({ length: 1, selected: node.selected, select: node.select }))
    };
    const state = { panSelectionIds: [], panRestoreTimer: null };

    expect(suspendSelectionForUserPan(cy, state, 180)).toBe(true);
    expect(selected).toBe(false);

    vi.advanceTimersByTime(100);
    expect(suspendSelectionForUserPan(cy, state, 180)).toBe(true);
    vi.advanceTimersByTime(179);
    expect(selected).toBe(false);

    vi.advanceTimersByTime(1);
    expect(selected).toBe(true);
    expect(node.select).toHaveBeenCalledOnce();
  });

  it("does nothing when a canvas pan has no selected nodes", () => {
    const cy = {
      $: vi.fn(() => ({ length: 0, map: vi.fn(), unselect: vi.fn() }))
    };
    const state = { panSelectionIds: [], panRestoreTimer: null };

    expect(suspendSelectionForUserPan(cy, state)).toBe(false);
  });
});
