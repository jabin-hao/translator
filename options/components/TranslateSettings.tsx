import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES } from '../../lib/engines';

const LOCAL_KEY = 'translate_settings';
const storage = new Storage();

const defaultSettings = {
  engine: 'google',
  autoRead: false,
};

const TranslateSettings: React.FC = () => {
  const [engine, setEngine] = useState('google');
  const [autoRead, setAutoRead] = useState(false);

  useEffect(() => {
    // 读取全局设置
    storage.get(LOCAL_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
      }
    });
  }, []);

  useEffect(() => {
    // 保存全局设置
    storage.set(LOCAL_KEY, { engine, autoRead });
  }, [engine, autoRead]);

  const handleEngineChange = (val: string) => {
    setEngine(val);
    message.success('翻译引擎已保存');
  };

  const handleAutoReadChange = (checked: boolean) => {
    setAutoRead(checked);
    message.success('自动朗读设置已保存');
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
            options={TRANSLATE_ENGINES}
            onChange={handleEngineChange}
            style={{ width: 200, marginLeft: 16 }}
          />
        </div>
        <Divider />
        <div style={{ marginBottom: 24 }}>
          <b>自动朗读翻译结果：</b>
          <Switch checked={autoRead} onChange={handleAutoReadChange} style={{ marginLeft: 16 }} />
        </div>
      </div>
    </Card>
  );
};

export default TranslateSettings; 