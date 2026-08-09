# Quasar design contract

Auto-Dig Quasar is an **Operate** surface: an investigation workbench used for dense, repeated tasks. The Quasar graph workspace is the visual authority for the rest of the product.

## Visual system

- Keep one visual language across Research, Graph, Documents, Import, Actors, Tipline, Settings, and About.
- Black & Gold is the default visual identity. Theme tokens may recolor data and controls, but route changes must not switch to a different layout language.
- Prefer flat surfaces separated by 1px rules. Use cards only when a bounded object truly needs a container; never build a page from nested cards.
- No landing-page treatment inside the product: no oversized hero headings, decorative gradient panels, glow halos, or giant CTA tiles.
- Product headings use a compact fixed scale. Dense data can be denser; prose should remain readable at roughly 65–75 characters per line.
- Use Lucide consistently for interface icons. Do not substitute emoji or Unicode symbols for control icons.

## Navigation and chrome

- Desktop workbench routes use the same 246px sidebar and 62px top bar.
- Active navigation uses the current theme accent as an inset marker plus a subtle raised surface.
- Auto-Dig may keep its graph-specific full-screen composition, but the graph's palette, control language, typography, borders, and density are the authority for the rest of the application.
- Notifications are compact toasts. Errors use semantic borders and recovery copy; they should not dominate the workspace.

## Dashboard

- Research/Home is an operational overview, not a marketing page.
- The graph entrypoint is a compact command row, not a hero card.
- Review state and corpus metrics use flat rows and separators. Distribution bars are legitimate data marks; decorative sparklines and progress ornaments are not.
- Reviewed and unreviewed data remain visually distinct without turning the unreviewed section into a second color theme.

## Graph

- Preserve the dense graph composition and give canvas space priority over decorative chrome.
- The canvas grid is allowed because it is a working spatial surface, not decorative page texture.
- Graph controls stay single-line at desktop widths.

## Interaction floor

Every interactive control needs visible hover, keyboard focus, active/selected, disabled, loading, and error behavior where applicable. Motion should communicate state and usually complete within 150–250 ms.

## Auto-Dig deployment

Auto-Dig keeps its host/service-worker integration and domain-specific routes. Deployment differences must not create a second visual system.
