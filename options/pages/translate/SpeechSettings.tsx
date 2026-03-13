import { sendToBackground } from '@plasmohq/messaging';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Slider, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { TTS_ENGINES } from '~lib/constants/engines';
import { EDGE_TTS_VOICES, TTS_ENGINE_CAPABILITIES } from '~lib/constants/speech';
import type { SpeechService } from '~lib/constants/speech';
import type { GlobalSettings } from '~lib/constants/types';
import { useSpeechSettings } from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type SpeechSettingKey = 'enabled' | 'voice' | 'speed' | 'pitch' | 'volume' | 'autoPlay';

type SpeechTestResponse = {
  success: boolean;
  data?: {
    success: boolean;
    audioData?: Uint8Array | ArrayBuffer;
    error?: string;
  };
  error?: string;
};

const SpeechSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { speechSettings, updateSpeech } = useSpeechSettings();
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentAudioRef = useRef<{ stop: () => void } | null>(null);

  const engineKey = (speechSettings.engine || 'google') as SpeechService;
  const capabilities = TTS_ENGINE_CAPABILITIES[engineKey] || TTS_ENGINE_CAPABILITIES.google;

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      setBrowserVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  const voiceOptions = useMemo(() => {
    if (engineKey === 'edge') {
      return EDGE_TTS_VOICES.map((voice) => ({
        value: voice.value,
        label: `${voice.label} [${voice.lang}]`,
      }));
    }

    if (engineKey === 'browser' || engineKey === 'local') {
      return browserVoices.map((voice) => ({
        value: voice.name,
        label: `${voice.name} (${voice.lang})`,
      }));
    }

    return [];
  }, [browserVoices, engineKey]);

  const handleSettingChange = async (
    key: SpeechSettingKey,
    value: GlobalSettings['speech'][SpeechSettingKey]
  ) => {
    await updateSpeech({ [key]: value });
  };

  const normalizeAudioBuffer = (audioData: unknown): ArrayBuffer => {
    if (audioData instanceof ArrayBuffer) {
      return audioData;
    }

    if (audioData instanceof Uint8Array) {
      return audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
    }

    if (audioData && typeof audioData === 'object') {
      const values = Object.values(audioData as Record<string, number>);
      if (values.length > 0) {
        return new Uint8Array(values).buffer;
      }
    }

    throw new Error(t('Speech test failed'));
  };

  const resolveTestLanguage = () => {
    if (engineKey === 'edge' && speechSettings.voice && speechSettings.voice !== 'auto') {
      const matchedEdgeVoice = EDGE_TTS_VOICES.find((voice) => voice.value === speechSettings.voice);
      if (matchedEdgeVoice) {
        return matchedEdgeVoice.lang;
      }
    }

    if (
      (engineKey === 'browser' || engineKey === 'local') &&
      speechSettings.voice &&
      speechSettings.voice !== 'auto'
    ) {
      const matchedBrowserVoice = browserVoices.find((voice) => voice.name === speechSettings.voice);
      if (matchedBrowserVoice) {
        return matchedBrowserVoice.lang;
      }
    }

    return 'zh-CN';
  };

  const stopTestAudio = () => {
    currentAudioRef.current?.stop();
    currentAudioRef.current = null;
    window.speechSynthesis.cancel();
  };

  const playArrayBuffer = async (audioData: ArrayBuffer) => {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported');
    }

    const audioContext = new AudioContextClass();
    const decoded = await audioContext.decodeAudioData(audioData.slice(0));
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = decoded;
    source.playbackRate.value = speechSettings.speed || 1;
    gainNode.gain.value = speechSettings.volume ?? 1;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);

    currentAudioRef.current = {
      stop: () => {
        try {
          source.stop();
        } catch {
          // Ignore double-stop on completed preview audio.
        }
        audioContext.close().catch(() => {});
      },
    };

    source.onended = () => {
      currentAudioRef.current = null;
      audioContext.close().catch(() => {});
    };
  };

  const speakWithBrowserVoice = async (text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Your browser does not support speech synthesis');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechSettings.speed || 1.0;
    utterance.pitch = speechSettings.pitch || 1.0;
    utterance.volume = speechSettings.volume || 1.0;

    if (speechSettings.voice && speechSettings.voice !== 'auto') {
      const voice = browserVoices.find((item) => item.name === speechSettings.voice);
      if (voice) {
        utterance.voice = voice;
      }
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const testSpeech = async (text = t('This is a speech test')) => {
    try {
      message.info(t('Playing test speech...'));
      stopTestAudio();

      if (engineKey === 'browser' || engineKey === 'local') {
        await speakWithBrowserVoice(text);
        return;
      }

      const response = (await sendToBackground({
        name: 'handle' as never,
        body: {
          service: 'speech',
          action: 'speak',
          options: {
            text,
            lang: resolveTestLanguage(),
            voice: speechSettings.voice,
            speed: speechSettings.speed,
            pitch: speechSettings.pitch,
            volume: speechSettings.volume,
          },
        },
      })) as SpeechTestResponse;

      const audioData = response?.data?.audioData;
      if (!response?.success || !response.data?.success || !audioData) {
        throw new Error(response?.error || response?.data?.error || 'Speech test failed');
      }

      await playArrayBuffer(normalizeAudioBuffer(audioData));
    } catch (error) {
      console.error('Speech test failed:', error);
      message.error(error instanceof Error ? error.message : t('Speech test failed'));
    }
  };

  useEffect(() => () => stopTestAudio(), []);

  return (
    <SettingsPageContainer
      title={t('Speech settings')}
      description={t('Configure reading and playback behavior')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem label={t('Enable speech')} description={t('Read translated text aloud')}>
          <Switch
            checked={speechSettings.enabled}
            onChange={(checked) => void handleSettingChange('enabled', checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {speechSettings.enabled && (
        <>
          <SettingsGroup title={t('Voice settings')}>
            <SettingsItem
              label={t('Speech engine')}
              description={t('Engine selection is managed in engine settings')}
            >
              <span style={{ color: isDark ? '#999' : '#666' }}>
                {t('Current engine')}:{' '}
                {TTS_ENGINES.find((item) => item.value === speechSettings.engine)?.label || 'Google TTS'}
              </span>
            </SettingsItem>

            <SettingsItem
              label={t('Default voice')}
              description={
                engineKey === 'edge'
                  ? t('Choose the default Edge voice')
                  : engineKey === 'google'
                    ? t('Google TTS does not expose selectable voices')
                    : t('Choose the default browser voice')
              }
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={speechSettings.voice || 'auto'}
                  onChange={(value) => void handleSettingChange('voice', value)}
                  style={{ width: 320 }}
                  disabled={!capabilities.supportsVoices}
                  options={[
                    { value: 'auto', label: t('Auto select') },
                    ...voiceOptions,
                  ]}
                />
                <Button onClick={() => void testSpeech()}>{t('Test')}</Button>
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Playback')}>
            <SettingsItem label={t('Speed')} description={t('Adjust the reading speed')}>
              <div style={{ width: 300 }}>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={speechSettings.speed}
                  onChange={(value) => void handleSettingChange('speed', value)}
                  marks={{ 0.5: '0.5x', 1: '1.0x', 1.5: '1.5x', 2: '2.0x' }}
                  disabled={!capabilities.supportsSpeed}
                />
              </div>
            </SettingsItem>

            <SettingsItem label={t('Pitch')} description={t('Adjust the reading pitch')}>
              <div style={{ width: 300 }}>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={speechSettings.pitch}
                  onChange={(value) => void handleSettingChange('pitch', value)}
                  marks={{ 0.5: t('Low'), 1: t('Normal'), 1.5: t('High'), 2: t('Very high') }}
                  disabled={!capabilities.supportsPitch}
                />
              </div>
            </SettingsItem>

            <SettingsItem label={t('Volume')} description={t('Adjust the reading volume')}>
              <div style={{ width: 300 }}>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={speechSettings.volume}
                  onChange={(value) => void handleSettingChange('volume', value)}
                  marks={{ 0: '0%', 0.5: '50%', 1: '100%' }}
                  disabled={!capabilities.supportsVolume}
                />
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Auto play')}>
            <SettingsItem
              label={t('Auto play translated text')}
              description={t('Play speech automatically after translation completes')}
            >
              <Switch
                checked={speechSettings.autoPlay}
                onChange={(checked) => void handleSettingChange('autoPlay', checked)}
              />
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default SpeechSettings;
