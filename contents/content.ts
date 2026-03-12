import { sendToBackground } from "@plasmohq/messaging"
import { getEngineLangCode, getTTSLang } from "~lib/constants/languages"
import {
  hasExtensionContextBeenInvalidated,
  isExtensionContextInvalidatedError,
  logExtensionError,
} from "~lib/utils/extensionContext"

type HandleService = "translate" | "speech"

interface HandleRequestBody {
  service: HandleService
  action: string
  options?: Record<string, unknown>
  text?: string
}

interface HandleResponse<TData> {
  success: boolean
  data?: TData
  error?: string
}

interface TranslateResponseData {
  translation: string
  engine: string
}

interface SpeechResponseData {
  audioData?: Uint8Array | ArrayBuffer
}

const requestHandle = async <TData>(
  body: HandleRequestBody,
): Promise<HandleResponse<TData>> => {
  if (hasExtensionContextBeenInvalidated()) {
    throw toContextInvalidatedError()
  }

  const response = await sendToBackground({
    name: "handle" as never,
    body,
  })

  // Messaging can resolve to undefined when the target context disappears mid-flight.
  if (!response || typeof response !== "object") {
    throw new Error("Background response is unavailable")
  }

  return response as HandleResponse<TData>
}

const normalizeAudioBuffer = (audioData?: Uint8Array | ArrayBuffer) => {
  if (audioData instanceof Uint8Array) {
    return audioData.buffer.slice(
      audioData.byteOffset,
      audioData.byteOffset + audioData.byteLength,
    )
  }

  return audioData
}

const isFailedTranslationPayload = (translation: string) =>
  translation.toLowerCase().startsWith("translation failed:")

const toContextInvalidatedError = () =>
  new Error("Extension context invalidated. Reload the page and try again.")

export async function callTranslateAPI(
  text: string,
  from: string,
  to: string,
  engine = "bing",
): Promise<{ result: string; engine: string }> {
  const fromMapped = getEngineLangCode(from, engine)
  const toMapped = getEngineLangCode(to, engine)

  try {
    // Cache policy is resolved in the background service so content-side callers
    // only need to describe the translation request itself.
    const response = await requestHandle<TranslateResponseData>({
      service: "translate",
      action: "translate",
      text,
      options: {
        from: fromMapped,
        to: toMapped,
        engine,
        useCache: true,
      },
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || "Translation failed")
    }

    // Keep this guard while background callers are being normalized so legacy
    // "failure as translation text" payloads still surface as real errors.
    if (isFailedTranslationPayload(response.data.translation)) {
      throw new Error(response.data.translation)
    }

    return {
      result: response.data.translation,
      engine: response.data.engine,
    }
  } catch (error) {
    logExtensionError("Translation API call failed", error)
    throw (isExtensionContextInvalidatedError(error)
      ? toContextInvalidatedError()
      : error)
  }
}

export async function callTTSAPI(
  text: string,
  lang: string,
): Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }> {
  try {
    const response = await requestHandle<SpeechResponseData>({
      service: "speech",
      action: "speak",
      options: {
        text,
        lang: getTTSLang(lang),
      },
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "TTS request failed",
      }
    }

    return {
      success: true,
      audioData: normalizeAudioBuffer(response.data.audioData),
    }
  } catch (error) {
    logExtensionError("TTS API call failed", error)
    return {
      success: false,
      error: isExtensionContextInvalidatedError(error)
        ? toContextInvalidatedError().message
        : error instanceof Error
          ? error.message
          : "TTS request failed",
    }
  }
}

export async function stopTTSAPI(): Promise<void> {
  try {
    await requestHandle({
      service: "speech",
      action: "stop",
    })
  } catch (error) {
    logExtensionError("Failed to stop TTS", error)
  }
}
