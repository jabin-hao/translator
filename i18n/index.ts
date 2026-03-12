import { Storage } from "@plasmohq/storage"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { GLOBAL_SETTINGS_KEY } from "~lib/settings/constants"
import type { GlobalSettings } from "~lib/constants/types"
import en from "./locales/en.json"
import zh from "./locales/zh.json"

const storage = new Storage()

const resources = {
  zh: { translation: zh },
  en: { translation: en },
}

const resolveUiLanguage = (settings?: GlobalSettings) => {
  return settings?.theme?.uiLanguage === "en" ? "en" : "zh"
}

export async function initI18n() {
  const globalSettings = await storage.get<GlobalSettings>(GLOBAL_SETTINGS_KEY)
  const language = resolveUiLanguage(globalSettings)

  if (i18n.isInitialized) {
    await i18n.changeLanguage(language)
    return
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "zh",
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  })
}

export default i18n
