import { useCallback, useRef, useState } from 'react';

import { getTTSLang } from '~lib/constants/languages';

interface SpeechConfig {
  speed: number;
  pitch: number;
  volume: number;
}

interface UseTranslatorSpeechOptions {
  speechConfig: SpeechConfig;
  translateFailedText: string;
  callTTSAPI: (
    text: string,
    lang: string
  ) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
  stopTTSAPI: () => Promise<void>;
}

type AudioContextConstructor = typeof AudioContext;
type WindowWithWebkitAudio = Window & {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
};

export function useTranslatorSpeech({
  speechConfig,
  translateFailedText,
  callTTSAPI,
  stopTTSAPI,
}: UseTranslatorSpeechOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingAudioRef = useRef(false);

  const stopSpeaking = useCallback(async () => {
    await stopTTSAPI();

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isPlayingAudioRef.current = false;
  }, [stopTTSAPI]);

  const speakWithWebSpeechAPI = useCallback(
    async (text: string, lang: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
          reject(new Error('Web Speech API is not supported'));
          return;
        }

        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = getTTSLang(lang);
          utterance.rate = speechConfig.speed || 1;
          utterance.pitch = speechConfig.pitch || 1;
          utterance.volume = speechConfig.volume || 1;

          utterance.onstart = () => {
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            resolve();
          };

          utterance.onerror = (event) => {
            setIsSpeaking(false);
            reject(new Error(`Web Speech API error: ${event.error}`));
          };

          window.speechSynthesis.speak(utterance);
        } catch (error) {
          reject(error);
        }
      }),
    [speechConfig.pitch, speechConfig.speed, speechConfig.volume]
  );

  const playAudioFromArrayBuffer = useCallback(
    (audioData: ArrayBuffer): Promise<void> =>
      new Promise((resolve, reject) => {
        if (isPlayingAudioRef.current) {
          reject(new Error('Audio is already playing'));
          return;
        }

        let audioContext: AudioContext | null = null;

        try {
          currentAudioRef.current?.pause();
          currentAudioRef.current = null;

          const audioWindow = window as WindowWithWebkitAudio;
          const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;

          if (!AudioContextClass) {
            reject(new Error('Web Audio API is not supported'));
            return;
          }

          isPlayingAudioRef.current = true;
          audioContext = new AudioContextClass();

          audioContext.decodeAudioData(audioData).then((audioBuffer) => {
            const source = audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext!.destination);

            source.onended = () => {
              setIsSpeaking(false);
              isPlayingAudioRef.current = false;
              if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch(() => {});
              }
              resolve();
            };

            setIsSpeaking(true);
            source.start(0);

            currentAudioRef.current = {
              pause: () => {
                source.stop();
                isPlayingAudioRef.current = false;
                if (audioContext && audioContext.state !== 'closed') {
                  audioContext.close().catch(() => {});
                }
                setIsSpeaking(false);
              },
            } as HTMLAudioElement;
          }, reject);
        } catch (error) {
          setIsSpeaking(false);
          isPlayingAudioRef.current = false;
          if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
          }
          reject(error);
        }
      }),
    []
  );

  const normalizeAudioBuffer = useCallback((audioData: unknown) => {
    if (audioData instanceof ArrayBuffer) {
      return audioData;
    }

    if (audioData instanceof Uint8Array) {
      return audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
    }

    if (audioData && typeof audioData === 'object') {
      const values = Object.values(audioData as Record<string, number>);
      if (values.length > 0) {
        return new Uint8Array(values).buffer;
      }
    }

    throw new Error('Unsupported audio data format');
  }, []);

  const speak = useCallback(
    async (text: string, lang: string) => {
      if (!text || text === translateFailedText) {
        throw new Error('No readable content');
      }

      if (!lang) {
        throw new Error('Target language is required');
      }

      try {
        const result = await callTTSAPI(text, lang);

        if (result.success && result.audioData) {
          try {
            const audioBuffer = normalizeAudioBuffer(result.audioData);
            if (audioBuffer.byteLength > 0) {
              await playAudioFromArrayBuffer(audioBuffer);
              return;
            }
          } catch (error) {
            console.warn('Falling back to Web Speech API:', error);
          }
        }

        if (result.error === 'browser_tts_required' || !result.success || !result.audioData) {
          await speakWithWebSpeechAPI(text, lang);
          return;
        }

        throw new Error(result.error || 'TTS failed');
      } catch (error) {
        console.error('TTS failed, falling back to Web Speech API:', error);
        await speakWithWebSpeechAPI(text, lang);
      }
    },
    [
      callTTSAPI,
      normalizeAudioBuffer,
      playAudioFromArrayBuffer,
      speakWithWebSpeechAPI,
      translateFailedText,
    ]
  );

  return {
    isSpeaking,
    setIsSpeaking,
    stopSpeaking,
    speak,
  };
}
