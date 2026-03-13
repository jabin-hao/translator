import React from "react"
import { Button, InputNumber, Radio, Select, Slider, Space, Switch } from "antd"
import { useTranslation } from "react-i18next"
import Icon from "~lib/components/Icon"
import SettingsPageContainer from "../../components/SettingsPageContainer"
import SettingsGroup from "../../components/SettingsGroup"
import SettingsItem from "../../components/SettingsItem"

const { Option } = Select

type SubtitleDisplayMode = "overlay" | "replace" | "dual"
type SubtitlePlatform = "youtube" | "bilibili" | "netflix" | "prime"
type SubtitleSpeechLanguage = "auto" | "zh-CN" | "en" | "ja" | "ko"
type SubtitleSpeechAccuracy = "fast" | "balanced" | "high"
type SubtitlePosition = "top" | "center" | "bottom"

interface SubtitlePlatforms {
  youtube: boolean
  bilibili: boolean
  netflix: boolean
  prime: boolean
}

interface SubtitleSpeechToTextSettings {
  enabled: boolean
  language: SubtitleSpeechLanguage
  accuracy: SubtitleSpeechAccuracy
}

interface SubtitleStyleSettings {
  fontSize: number
  fontColor: string
  backgroundColor: string
  position: SubtitlePosition
  fontFamily: string
}

interface SubtitleSettingsState {
  enabled: boolean
  autoDetectLanguage: boolean
  autoTranslate: boolean
  supportedPlatforms: SubtitlePlatforms
  speechToText: SubtitleSpeechToTextSettings
  subtitleStyle: SubtitleStyleSettings
  displayMode: SubtitleDisplayMode
  showOriginal: boolean
  realTimeTranslate: boolean
  cacheDuration: number
}

const SubtitleTranslateSettings: React.FC = () => {
  const { t } = useTranslation()

  // This page is still a product-facing prototype. Keep the state local and typed
  // until subtitle translation is backed by a real settings/storage module.
  const [subtitleSettings, setSubtitleSettings] =
    React.useState<SubtitleSettingsState>({
      enabled: true,
      autoDetectLanguage: true,
      autoTranslate: true,
      supportedPlatforms: {
        youtube: true,
        bilibili: true,
        netflix: false,
        prime: false,
      },
      speechToText: {
        enabled: true,
        language: "auto",
        accuracy: "high",
      },
      subtitleStyle: {
        fontSize: 16,
        fontColor: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.8)",
        position: "bottom",
        fontFamily: "Arial",
      },
      displayMode: "overlay",
      showOriginal: true,
      realTimeTranslate: true,
      cacheDuration: 7,
    })

  const updateSetting = <K extends keyof SubtitleSettingsState>(
    key: K,
    value: SubtitleSettingsState[K],
  ) => {
    setSubtitleSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updatePlatform = (platform: SubtitlePlatform, enabled: boolean) => {
    setSubtitleSettings((prev) => ({
      ...prev,
      supportedPlatforms: {
        ...prev.supportedPlatforms,
        [platform]: enabled,
      },
    }))
  }

  const updateSpeechSetting = <K extends keyof SubtitleSpeechToTextSettings>(
    key: K,
    value: SubtitleSpeechToTextSettings[K],
  ) => {
    setSubtitleSettings((prev) => ({
      ...prev,
      speechToText: {
        ...prev.speechToText,
        [key]: value,
      },
    }))
  }

  const updateStyleSetting = <K extends keyof SubtitleStyleSettings>(
    key: K,
    value: SubtitleStyleSettings[K],
  ) => {
    setSubtitleSettings((prev) => ({
      ...prev,
      subtitleStyle: {
        ...prev.subtitleStyle,
        [key]: value,
      },
    }))
  }

  return (
    <SettingsPageContainer
      title={t("Subtitle Translation")}
      description={t(
        "Configure subtitle translation, speech-to-text subtitles, and display behavior for supported video platforms.",
      )}>
      <SettingsGroup title={t("Basic settings")} first>
        <SettingsItem
          label={t("Enable Subtitle Translation")}
          description={t(
            "Turn on subtitle translation and speech-generated subtitles for supported video platforms.",
          )}>
          <Switch
            checked={subtitleSettings.enabled}
            onChange={(checked) => updateSetting("enabled", checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {subtitleSettings.enabled && (
        <>
          <SettingsGroup title={t("Supported Platforms")}>
            <SettingsItem
              label={t("YouTube")}
              description={t("Translate subtitles automatically on YouTube.")}>
              <Switch
                checked={subtitleSettings.supportedPlatforms.youtube}
                onChange={(checked) => updatePlatform("youtube", checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t("Bilibili")}
              description={t(
                "Translate subtitles automatically on Bilibili video pages.",
              )}>
              <Switch
                checked={subtitleSettings.supportedPlatforms.bilibili}
                onChange={(checked) => updatePlatform("bilibili", checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t("Netflix")}
              description={t(
                "Translate subtitles automatically on Netflix video pages.",
              )}>
              <Switch
                checked={subtitleSettings.supportedPlatforms.netflix}
                onChange={(checked) => updatePlatform("netflix", checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t("Prime Video")}
              description={t(
                "Translate subtitles automatically on Amazon Prime Video.",
              )}>
              <Switch
                checked={subtitleSettings.supportedPlatforms.prime}
                onChange={(checked) => updatePlatform("prime", checked)}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t("Translation settings")}>
            <SettingsItem
              label={t("Auto Detect Language")}
              description={t(
                "Detect the source language of the current subtitle stream automatically.",
              )}>
              <Switch
                checked={subtitleSettings.autoDetectLanguage}
                onChange={(checked) =>
                  updateSetting("autoDetectLanguage", checked)
                }
              />
            </SettingsItem>

            <SettingsItem
              label={t("Auto Translate")}
              description={t(
                "Translate subtitles as they appear during video playback.",
              )}>
              <Switch
                checked={subtitleSettings.autoTranslate}
                onChange={(checked) => updateSetting("autoTranslate", checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t("Real-time Translation")}
              description={t(
                "Translate each subtitle line immediately instead of waiting for a larger segment.",
              )}>
              <Switch
                checked={subtitleSettings.realTimeTranslate}
                onChange={(checked) =>
                  updateSetting("realTimeTranslate", checked)
                }
              />
            </SettingsItem>

            <SettingsItem
              label={t("Display Mode")}
              description={t("Choose how translated subtitles are rendered.")}>
              <Radio.Group
                value={subtitleSettings.displayMode}
                onChange={(event) =>
                  updateSetting("displayMode", event.target.value)
                }>
                <Radio value="overlay">{t("Overlay")}</Radio>
                <Radio value="replace">{t("Replace Original")}</Radio>
                <Radio value="dual">{t("Dual Language")}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t("Show Original Text")}
              description={t(
                "Keep the source subtitle visible alongside the translation when possible.",
              )}>
              <Switch
                checked={subtitleSettings.showOriginal}
                onChange={(checked) => updateSetting("showOriginal", checked)}
                disabled={subtitleSettings.displayMode === "dual"}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t("Speech Recognition")}>
            <SettingsItem
              label={t("Enable Speech-to-Text")}
              description={t(
                "Generate subtitles from speech when the platform does not provide them.",
              )}>
              <Switch
                checked={subtitleSettings.speechToText.enabled}
                onChange={(checked) =>
                  updateSpeechSetting("enabled", checked)
                }
              />
            </SettingsItem>

            <SettingsItem
              label={t("Recognition Language")}
              description={t(
                "Select the source language used for speech recognition.",
              )}>
              <Select
                value={subtitleSettings.speechToText.language}
                onChange={(value: SubtitleSpeechLanguage) =>
                  updateSpeechSetting("language", value)
                }
                style={{ width: 120 }}
                disabled={!subtitleSettings.speechToText.enabled}>
                <Option value="auto">{t("Auto Detect")}</Option>
                <Option value="zh-CN">{t("Chinese")}</Option>
                <Option value="en">{t("English")}</Option>
                <Option value="ja">{t("Japanese")}</Option>
                <Option value="ko">{t("Korean")}</Option>
              </Select>
            </SettingsItem>

            <SettingsItem
              label={t("Recognition Accuracy")}
              description={t(
                "Balance speed and accuracy for speech recognition.",
              )}>
              <Select
                value={subtitleSettings.speechToText.accuracy}
                onChange={(value: SubtitleSpeechAccuracy) =>
                  updateSpeechSetting("accuracy", value)
                }
                style={{ width: 120 }}
                disabled={!subtitleSettings.speechToText.enabled}>
                <Option value="fast">{t("Fast")}</Option>
                <Option value="balanced">{t("Balanced")}</Option>
                <Option value="high">{t("High Accuracy")}</Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t("Subtitle Style")}>
            <SettingsItem
              label={t("Font Size")}
              description={t("Adjust the size of translated subtitles.")}>
              <Slider
                min={12}
                max={32}
                value={subtitleSettings.subtitleStyle.fontSize}
                onChange={(value) => updateStyleSetting("fontSize", value)}
                style={{ width: 200 }}
              />
            </SettingsItem>

            <SettingsItem
              label={t("Font Family")}
              description={t("Choose the subtitle font family.")}>
              <Select
                value={subtitleSettings.subtitleStyle.fontFamily}
                onChange={(value: string) => updateStyleSetting("fontFamily", value)}
                style={{ width: 150 }}>
                <Option value="Arial">Arial</Option>
                <Option value="SimSun">{t("SimSun")}</Option>
                <Option value="SimHei">{t("SimHei")}</Option>
                <Option value="Microsoft YaHei">{t("Microsoft YaHei")}</Option>
              </Select>
            </SettingsItem>

            <SettingsItem
              label={t("Subtitle Position")}
              description={t("Choose where translated subtitles are shown.")}>
              <Radio.Group
                value={subtitleSettings.subtitleStyle.position}
                onChange={(event) =>
                  updateStyleSetting("position", event.target.value)
                }>
                <Radio value="top">{t("Top")}</Radio>
                <Radio value="center">{t("Center")}</Radio>
                <Radio value="bottom">{t("Bottom")}</Radio>
              </Radio.Group>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t("Cache Settings")}>
            <SettingsItem
              label={t("Cache Duration")}
              description={t(
                "Cache translated subtitle segments to reduce repeated requests.",
              )}>
              <InputNumber
                min={0}
                max={30}
                value={subtitleSettings.cacheDuration}
                onChange={(value) => {
                  if (value !== null) {
                    updateSetting("cacheDuration", value)
                  }
                }}
                addonAfter={t("days")}
                style={{ width: 120 }}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t("Quick Actions")}>
            <SettingsItem
              label={t("Common Actions")}
              description={t(
                "Placeholder actions for the upcoming subtitle workflow.",
              )}>
              <Space wrap>
                <Button
                  icon={<Icon name="reload" size={16} />}
                  disabled={!subtitleSettings.enabled}>
                  {t("Re-detect Subtitles")}
                </Button>
                <Button
                  icon={<Icon name="download" size={16} />}
                  disabled={!subtitleSettings.enabled}>
                  {t("Export Translated Subtitles")}
                </Button>
                <Button
                  icon={<Icon name="settings" size={16} />}
                  disabled={!subtitleSettings.enabled}>
                  {t("Open Style Settings")}
                </Button>
                <Button type="link" disabled={!subtitleSettings.enabled}>
                  {t("View Translation History")}
                </Button>
              </Space>
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  )
}

export default SubtitleTranslateSettings
