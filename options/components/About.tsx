import React from 'react';
import { Card } from 'antd';

const About: React.FC = () => {
  return (
    <Card title="关于" size="small" style={{ width: 400 }}>
      <p>本插件用于网页划词翻译，支持多语言切换和自动翻译。</p>
      <p>作者：你的名字</p>
      <p>开源地址：<a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      <p>版本：1.0.0</p>
    </Card>
  );
};

export default About; 