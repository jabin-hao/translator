import React from "react";
import PopupInner from "./components/PopupInner";
import "./index.css";

import { ThemeProvider } from "~lib/utils/theme";
import { THEME_MODE_KEY } from "~lib/constants/settings";

function Popup() {
  return (
    <ThemeProvider storageKey={THEME_MODE_KEY}>
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