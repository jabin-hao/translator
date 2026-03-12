import React, { useEffect, useState } from "react"
import { App } from "antd"
import { I18nextProvider } from "react-i18next"

import { initI18n } from "~i18n"
import i18n from "../i18n"
import { ThemeProvider } from "~lib/theme/theme"
import PopupInner from "./PopupInner"
import "./styles/index.css"

function Popup() {
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    initI18n()
      .finally(() => {
        setI18nReady(true)
      })
  }, [])

  if (!i18nReady) {
    return null
  }

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <App>
          <div
            style={{
              width: "100%",
              height: "auto",
              margin: 0,
              padding: 0,
              overflow: "hidden",
            }}>
            <PopupInner />
          </div>
        </App>
      </I18nextProvider>
    </ThemeProvider>
  )
}

export default Popup
