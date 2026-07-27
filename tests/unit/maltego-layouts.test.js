import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";
import {
  MALTEGO_LAYOUTS,
  installMaltegoLayouts,
  maltegoLayoutOptions,
  normalizeMaltegoLayout,
  organicLayoutTuning
} from "../../src/graph/maltego-layouts";

function createGraph() {
  return cytoscape({
    headless: true,
    styleEnabled: false,
    elements: [
      { data: { id: "root", dtype: "person", label: "Root", document: { weight: 8 } } },
      { data: { id: "org", dtype: "org", label: "Org", document: { weight: 5 } } },
      { data: { id: "event", dtype: "event", label: "Event", document: { weight: 2 } } },
      { data: { id: "leaf", dtype: "entity", label: "Leaf", document: { weight: 1 } } },
      { data: { id: "root-org", source: "root", target: "org", directed: true } },
      { data: { id: "root-event", source: "root", target: "event", directed: true } },
      { data: { id: "org-leaf", source: "org", target: "leaf", directed: true } }
    ]
  });
}

function createNodeSet(count) {
  return cytoscape({
    headless: true,
    styleEnabled: false,
    elements: Array.from({ length: count }, (_, index) => ({
      data: { id: `node-${index}` }
    }))
  });
}

describe("Maltego graph layouts", () => {
  it("exposes the complete Maltego layout set", () => {
    expect(MALTEGO_LAYOUTS.map(({ id }) => id)).toEqual([
      "block",
      "hierarchical",
      "circular",
      "organic",
      "interactive-organic",
      "orthogonal"
    ]);
  });

  it("migrates legacy Cytoscape workspace layouts", () => {
    expect(normalizeMaltegoLayout("cose")).toBe("organic");
    expect(normalizeMaltegoLayout("breadthfirst")).toBe("hierarchical");
    expect(normalizeMaltegoLayout("concentric")).toBe("circular");
    expect(normalizeMaltegoLayout("grid")).toBe("orthogonal");
  });

  it("applies the compact organic tuning to legacy cose calls", () => {
    const cy = createGraph();
    const options = maltegoLayoutOptions(cy, { name: "cose", fit: false });

    expect(options.name).toBe("cose");
    expect(options.idealEdgeLength()).toBeLessThan(90);
    expect(options.nodeRepulsion()).toBeLessThan(5200);
    expect(options.componentSpacing).toBeLessThan(90);

    cy.destroy();
  });

  it("compresses organic spacing as graph size grows", () => {
    const small = createNodeSet(20);
    const large = createNodeSet(200);
    const smallTuning = organicLayoutTuning(small.elements());
    const largeTuning = organicLayoutTuning(large.elements());

    expect(largeTuning.idealEdgeLength).toBeLessThan(smallTuning.idealEdgeLength);
    expect(largeTuning.nodeRepulsion).toBeLessThan(smallTuning.nodeRepulsion);
    expect(largeTuning.componentSpacing).toBeLessThan(smallTuning.componentSpacing);
    expect(largeTuning.gravity).toBeGreaterThan(smallTuning.gravity);

    small.destroy();
    large.destroy();
  });

  it.each(MALTEGO_LAYOUTS)("runs $label without invalid positions", ({ id }) => {
    const cy = installMaltegoLayouts(createGraph());
    expect(() => cy.layout({ name: id, animate: false, fit: false }).run()).not.toThrow();

    cy.nodes().forEach((node) => {
      expect(Number.isFinite(node.position("x"))).toBe(true);
      expect(Number.isFinite(node.position("y"))).toBe(true);
    });

    cy.destroy();
  });
});
