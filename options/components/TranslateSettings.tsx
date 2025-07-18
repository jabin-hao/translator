import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES } from '../../lib/engines';
const { Option } = Select;

const LOCAL_KEY = 'translate_settings';
const storage = new Storage();

const defaultSettings = {
  engine: 'google',
  autoRead: false,
  autoTranslate: true,
};

const TranslateSettings: React.FC = () => {
  const [engine, setEngine] = useState('google');
  const [autoRead, setAutoRead] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);

  useEffect(() => {
    // 读取全局设置
    storage.get(LOCAL_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
        setAutoTranslate((data as any)?.autoTranslate ?? true);
      }
    });
  }, []);

  useEffect(() => {
    // 保存全局设置
    storage.set(LOCAL_KEY, { engine, autoRead, autoTranslate });
  }, [engine, autoRead, autoTranslate]);

  const handleEngineChange = (val: string) => {
    setEngine(val);
    message.success('翻译引擎已保存');
  };

  const handleAutoReadChange = (checked: boolean) => {
    setAutoRead(checked);
    message.success('自动朗读设置已保存');
  };

  const handleAutoTranslateChange = (checked: boolean) => {
    setAutoTranslate(checked);
    message.success('自动翻译设置已保存');
  };

  return (
    <Card
      title="翻译设置"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <b>翻译引擎：</b>
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
            选择用于翻译的默认引擎，支持多引擎兜底
          </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 24 }}>
          <b>自动翻译：</b>
          <Switch checked={autoTranslate} onChange={handleAutoTranslateChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            开启后划词/输入内容将自动翻译，无需手动点击
          </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 24 }}>
          <b>自动朗读翻译结果：</b>
          <Switch checked={autoRead} onChange={handleAutoReadChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            翻译完成后自动朗读结果（如支持）
          </div>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        所有设置均会自动保存，无需手动操作。
      </div>
    </Card>
  );
};

export default TranslateSettings; 