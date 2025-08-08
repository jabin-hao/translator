import React from "react";
import PopupInner from "./components/PopupInner";
import "./index.css";

import { ThemeProvider } from "~lib/utils/theme";

function Popup() {
  return (
    <ThemeProvider storageKey="plugin_theme_mode">
      <div style={{
        width: '100%',
        height: 'auto',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}>
        <PopupInner />
      </div>
    </ThemeProvider>
  );
}

export default Popup; 