import { describe, expect, it, vi } from "vitest";
import {
  boxesOverlap,
  clearSelectionForUserPan,
  relationDropPadding
} from "./graph-gestures";

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

  it("releases selection for a user canvas pan", () => {
    const unselect = vi.fn();
    const cy = {
      $: vi.fn(() => ({ length: 1, unselect }))
    };

    expect(clearSelectionForUserPan(cy)).toBe(true);
    expect(cy.$).toHaveBeenCalledWith("node:selected");
    expect(unselect).toHaveBeenCalledOnce();
  });

  it("does nothing when a canvas pan has no selected nodes", () => {
    const cy = {
      $: vi.fn(() => ({ length: 0, unselect: vi.fn() }))
    };

    expect(clearSelectionForUserPan(cy)).toBe(false);
  });
});
