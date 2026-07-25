import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { QuasarProvider } from "./store";
import { registerServiceWorker } from "./lib/service-worker-registration";
import "./styles.css";
import "./dashboard.css";

const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={base === "/" ? undefined : base}>
      <QuasarProvider>
        <App />
      </QuasarProvider>
    </BrowserRouter>
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => registerServiceWorker().catch(() => {}));
}
