import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import GraphContextRadialBridge from "../components/GraphContextRadialBridge.jsx";
import GraphObjectTypePickerBridge from "../components/GraphObjectTypePickerBridge.jsx";
import MobileGraphToolTray from "../components/MobileGraphToolTray.jsx";
import OperatorUiEnhancer from "../components/OperatorUiEnhancer.jsx";
import ProviderBrandIcons from "../components/ProviderBrandIcons.jsx";
import { AutoDigProvider } from "../auto-dig/bridge/context.jsx";
import { isAutoDigEmbedded } from "../auto-dig/bridge/client";
import AutoDigRuntime from "../auto-dig/components/AutoDigRuntime.jsx";
import {
  CorrectionActionSurface,
  CorrectionReportProvider
} from "../auto-dig/correction-reports/CorrectionReports.jsx";
import { QuasarProvider } from "../store.jsx";
import { registerServiceWorker } from "../lib/service-worker-registration.js";
import { initializeTheme } from "../lib/themes.js";
import { routerBasename } from "./base-path";
import "../styles.css";
import "../dashboard.css";
import "../dashboard-theme.css";
import "../mobile.css";
import "../mobile-editor.css";
import "../gesture-menu.css";
import "../operator-ui.css";
import "../graph-fullscreen.css";
import "../mobile-graph-tools.css";
import "../mobile-graph-empty-state.css";
import "../graph-editors.css";
import "../graph-editors-extra.css";
import "../auto-dig/auto-dig.css";
import "../agent-tab-icons.css";
import "../kinpaku-shell.css";

initializeTheme();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Quasar root element was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
      <AutoDigProvider>
        <QuasarProvider>
          <CorrectionReportProvider>
            <App />
            <AutoDigRuntime />
            <CorrectionActionSurface />
            <OperatorUiEnhancer />
            <ProviderBrandIcons />
            <MobileGraphToolTray />
            <GraphContextRadialBridge />
            <GraphObjectTypePickerBridge />
          </CorrectionReportProvider>
        </QuasarProvider>
      </AutoDigProvider>
    </BrowserRouter>
  </StrictMode>
);

// Auto-Dig fork: the host owns offline shell updates while Quasar is embedded.
if ("serviceWorker" in navigator && import.meta.env.PROD && !isAutoDigEmbedded()) {
  window.addEventListener("load", () => registerServiceWorker().catch(() => {}));
}
