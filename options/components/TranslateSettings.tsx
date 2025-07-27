import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '../../lib/engines';
import { useTranslation } from 'react-i18next';
const { Option } = Select;

const LOCAL_KEY = 'translate_settings';
const SPEECH_KEY = 'speech_settings';
const storage = new Storage();

const TranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const [engine, setEngine] = useState('google');
  const [autoRead, setAutoRead] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);
  
  // 朗读引擎设置
  const [speechEngine, setSpeechEngine] = useState('edge');
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);

  useEffect(() => {
    // 读取翻译设置
    storage.get(LOCAL_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
        setAutoTranslate((data as any)?.autoTranslate ?? true);
      }
    });
    
    // 读取朗读设置
    storage.get(SPEECH_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setSpeechEngine((data as any)?.engine || 'edge');
        setSpeechSpeed((data as any)?.speed ?? 1);
        setSpeechPitch((data as any)?.pitch ?? 1);
        setSpeechVolume((data as any)?.volume ?? 1);
      }
    });
  }, []);

  useEffect(() => {
    // 保存翻译设置
    storage.set(LOCAL_KEY, { engine, autoRead, autoTranslate });
  }, [engine, autoRead, autoTranslate]);

  useEffect(() => {
    // 保存朗读设置
    storage.set(SPEECH_KEY, { 
      engine: speechEngine, 
      speed: speechSpeed, 
      pitch: speechPitch, 
      volume: speechVolume 
    });
  }, [speechEngine, speechSpeed, speechPitch, speechVolume]);

  const handleEngineChange = (val: string) => {
    setEngine(val);
    message.success(t('翻译引擎已保存'));
  };

  const handleAutoReadChange = (checked: boolean) => {
    setAutoRead(checked);
    message.success(t('自动朗读设置已保存'));
  };

  const handleAutoTranslateChange = (checked: boolean) => {
    setAutoTranslate(checked);
    message.success(t('自动翻译设置已保存'));
  };

  const handleSpeechEngineChange = (val: string) => {
    setSpeechEngine(val);
    message.success(t('朗读引擎已保存'));
  };

  const handleSpeechSpeedChange = (val: number) => {
    setSpeechSpeed(val);
    message.success(t('朗读速度已保存'));
  };

  const handleSpeechPitchChange = (val: number) => {
    setSpeechPitch(val);
    message.success(t('朗读音调已保存'));
  };

  const handleSpeechVolumeChange = (val: number) => {
    setSpeechVolume(val);
    message.success(t('朗读音量已保存'));
  };

  return (
    <Card
      title={t('翻译设置')}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 翻译引擎设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('翻译引擎')}：</b>
          <Select
            value={engine}
            onChange={handleEngineChange}
            style={{ width: 200, marginLeft: 16 }}
            size="middle"
          >
            {TRANSLATE_ENGINES.map(e => (
              <Option key={e.value} value={e.value} disabled={e.disabled}>
                {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />}
                {e.label}
              </Option>
            ))}
          </Select>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('选择用于翻译的默认引擎，支持多引擎兜底')}
          </div>
        </div>
        <Divider />
        
        {/* 朗读引擎设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('朗读引擎')}：</b>
          <Select
            value={speechEngine}
            onChange={handleSpeechEngineChange}
            style={{ width: 200, marginLeft: 16 }}
            size="middle"
          >
            {TTS_ENGINES.map(e => (
              <Option key={e.value} value={e.value} disabled={e.disabled}>
                {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />}
                {e.label}
              </Option>
            ))}
          </Select>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('选择用于朗读的默认引擎，Edge TTS 音质最佳，Google TTS 稳定，浏览器 TTS 无需网络')}
          </div>
        </div>
        
        {/* 朗读参数设置 */}
        <div style={{ marginBottom: 24, marginLeft: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读速度')}：</span>
            <Select
              value={speechSpeed}
              onChange={handleSpeechSpeedChange}
              style={{ width: 120, marginLeft: 8 }}
              size="small"
            >
              <Option value={0.5}>0.5x</Option>
              <Option value={0.75}>0.75x</Option>
              <Option value={1}>1x</Option>
              <Option value={1.25}>1.25x</Option>
              <Option value={1.5}>1.5x</Option>
              <Option value={2}>2x</Option>
            </Select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读音调')}：</span>
            <Select
              value={speechPitch}
              onChange={handleSpeechPitchChange}
              style={{ width: 120, marginLeft: 8 }}
              size="small"
            >
              <Option value={0.5}>低音</Option>
              <Option value={0.75}>中低音</Option>
              <Option value={1}>正常</Option>
              <Option value={1.25}>中高音</Option>
              <Option value={1.5}>高音</Option>
            </Select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读音量')}：</span>
            <Select
              value={speechVolume}
              onChange={handleSpeechVolumeChange}
              style={{ width: 120, marginLeft: 8 }}
              size="small"
            >
              <Option value={0.25}>25%</Option>
              <Option value={0.5}>50%</Option>
              <Option value={0.75}>75%</Option>
              <Option value={1}>100%</Option>
            </Select>
          </div>
        </div>
        <Divider />
        
        {/* 自动翻译设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('自动翻译')}：</b>
          <Switch checked={autoTranslate} onChange={handleAutoTranslateChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('开启后划词/输入内容将自动翻译，无需手动点击')}
          </div>
        </div>
        <Divider />
        
        {/* 自动朗读设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('自动朗读翻译结果')}：</b>
          <Switch checked={autoRead} onChange={handleAutoReadChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('翻译完成后自动朗读结果（如支持）')}
          </div>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('所有设置均会自动保存，无需手动操作。')}
      </div>
    </Card>
  );
};

export default TranslateSettings; 