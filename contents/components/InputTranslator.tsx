import React, { useState } from 'react';
import { useEffect } from 'react';
import '../index.css';
import { 
  Card, 
  Input, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Divider
} from 'antd';
import { 
  TranslationOutlined, 
  SwapOutlined, 
  CloseOutlined 
} from '@ant-design/icons';

// 自定义翻译SVG图标组件
const MyTranslationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="#2386e1" d="m19.713 8.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319a4.37 4.37 0 0 0 2.251-2.326l.253-.611a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251M22.9 21l-4.4-11h-2l-4.399 11h2.154l1.199-3h4.09l1.201 3zm-6.647-5l1.247-3.115L18.745 16zm-8.706-3.696A18.3 18.3 0 0 1 4.723 8h2.24a16.3 16.3 0 0 0 2.021 2.91A15.5 15.5 0 0 0 11.996 6H2V4h6V2h2v2h4.65q-.131.645-.309 1.272a17.5 17.5 0 0 1-3.952 7.066a16.3 16.3 0 0 0 2.325 1.743l-.753 1.882a18.3 18.3 0 0 1-3.01-2.23a17.5 17.5 0 0 1-6.148 3.449l-.606-1.906a15.5 15.5 0 0 0 5.35-2.972"/>
  </svg>
);

const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

interface InputTranslatorProps {
  onClose: () => void;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
}

const InputTranslator: React.FC<InputTranslatorProps> = ({ onClose, showMessage }) => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');
  const [isTranslating, setIsTranslating] = useState(false);
  const [engine, setEngine] = useState('google');

  // 按下Esc关闭悬浮窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const languages = [
    { code: 'auto', name: '自动检测' },
    { code: 'zh', name: '中文' },
    { code: 'en', name: '英语' },
    { code: 'ja', name: '日语' },
    { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' },
    { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' },
    { code: 'ru', name: '俄语' },
    { code: 'pt', name: '葡萄牙语' }
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      showMessage('warning', '请输入要翻译的文字');
      return;
    }
    
    setIsTranslating(true);
    try {
      // 这里可以调用翻译API，暂时使用模拟翻译
      const mockTranslation = `翻译结果: ${inputText}`;
      setTranslatedText(mockTranslation);
      showMessage('success', '翻译完成');
    } catch (error) {
      setTranslatedText('翻译失败，请重试');
      showMessage('error', '翻译失败，请重试');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
      showMessage('success', '已交换语言');
    }
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    showMessage('success', '已清空内容');
  };

  return (
    <Card
      className="input-translator-card"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        maxWidth: '90vw',
        zIndex: 2147483647,
        borderRadius: '12px'
      }}
      styles={{ body: { padding: '8px 8px' } }}
      title={
        <Space className="custom-card-header" align="center">
          <MyTranslationIcon />
          <Title level={4} style={{ margin: 0, lineHeight: '36px', height: 36 }}>翻译工具</Title>
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={onClose}
          size="small"
        />
      }
    >
      <div className="input-translator-content" style={{ width: '100%' }}>
        {/* 语言选择 */}
        <Space size={4} className="input-translator-language-selector">
          <Select
            value={sourceLang}
            onChange={setSourceLang}
            style={{ width: 120 }}
            placeholder="源语言"
            getPopupContainer={triggerNode => triggerNode.parentNode}
            size="small"
            className="custom-select"
          >
            {languages.map(lang => (
              <Option key={lang.code} value={lang.code}>{lang.name}</Option>
            ))}
          </Select>

          <Button 
            type="default" 
            icon={<SwapOutlined />} 
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            size="small"
          />

          <Select
            value={targetLang}
            onChange={setTargetLang}
            style={{ width: 120 }}
            placeholder="目标语言"
            getPopupContainer={triggerNode => triggerNode.parentNode}
            size="small"
            className="custom-select"
          >
            {languages.filter(lang => lang.code !== 'auto').map(lang => (
              <Option key={lang.code} value={lang.code}>{lang.name}</Option>
            ))}
          </Select>

          {/* 搜索引擎选择器 */}
          <Select
            value={engine}
            onChange={setEngine}
            style={{ width: 100 }}
            placeholder="搜索引擎"
            size="small"
            className="custom-select"
            getPopupContainer={triggerNode => triggerNode.parentNode}
          >
            <Option value="google">谷歌</Option>
            <Option value="bing">必应</Option>
            <Option value="baidu">百度</Option>
          </Select>
        </Space>

        <Divider style={{ margin: '8px 0' }} />

        {/* 翻译区域 */}
        <div className="input-translator-translation-area" style={{ width: '100%', display: 'flex', gap: '16px' }}>
          <div className="input-translator-text-area" style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入要翻译的文字..."
              rows={6}
              showCount
              maxLength={1000}
            />
          </div>

          <div className="input-translator-result-area" style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <TextArea
              value={translatedText}
              placeholder="翻译结果..."
              rows={6}
              readOnly
              className="input-translator-result-textarea"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="input-translator-actions" style={{ marginTop: '40px', width: '100%' }}>
          <Space className="input-translator-actions-space" style={{ justifyContent: 'center', width: '100%' }}>
            { !translatedText.trim() ? (
              <Button 
                type="primary" 
                onClick={handleTranslate}
                loading={isTranslating}
                disabled={!inputText.trim()}
              >
                {isTranslating ? "翻译中..." : "翻译"}
              </Button>
            ) : (
              <Button 
                type="primary"
                onClick={handleClear}
                disabled={!inputText.trim() && !translatedText.trim()}
              >
                清空
              </Button>
            )}
            <Button
              onClick={() => {
                if (translatedText.trim()) {
                  navigator.clipboard.writeText(translatedText);
                  showMessage('success', '已复制');
                } else {
                  showMessage('warning', '没有可复制的内容');
                }
              }}
              disabled={!translatedText.trim()}
            >
              复制
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default InputTranslator; 