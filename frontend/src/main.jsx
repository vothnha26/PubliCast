import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppInitializer } from "./components/AppInitializer";
import { Toaster } from "sonner";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import { logger } from "@/utils/logger";

// Override console toàn cục để kiểm soát log môi trường production
window.console.error = logger.error;
window.console.warn = logger.warn;
window.console.log = logger.info;
window.console.info = logger.info;
window.console.debug = logger.debug;

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AppInitializer />
      <App />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </BrowserRouter>
);
