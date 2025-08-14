import React from "react";
import PopupInner from "./PopupInner";
import "./styles/index.css";

import { ThemeProvider } from "~lib/theme/theme";

function Popup() {
  return (
    <ThemeProvider>
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