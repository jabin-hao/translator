import React from 'react';
import { Card } from 'antd';

const About: React.FC = () => {
  return (
    <Card 
      title="关于" 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <p>本插件用于网页划词翻译，支持多语言切换和自动翻译。</p>
        <p>作者：Bugbyebyebye</p>
        <p>开源地址：<a href="https://github.com/Bugbyebyebye/translator" target="_blank" rel="noopener noreferrer">GitHub</a></p>
        <p>版本：0.0.0</p>
      </div>
    </Card>
  );
};

export default About; 