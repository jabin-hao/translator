import {useImmer} from 'use-immer';
import React from 'react';
import { produce } from 'immer';
import { Switch, Select, Radio, Space, Card, Divider, Button, Input, Modal, Form, message, ConfigProvider, Segmented } from 'antd';
import Icon from '~lib/components/Icon';
import { useTranslation } from 'react-i18next';
import {
  useEngineSettings,
  useSpeechSettings,
} from '~lib/settings/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/theme/theme';

// 使用全局设置中的自定义引擎类型
import type { CustomEngine, TTSEngine } from '~lib/settings/settings';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '~lib/constants/engines';

const EngineSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  const { engineSettings, setDefaultEngine, updateApiKey, updateEngine } = useEngineSettings();
  const { speechSettings, updateSpeech } = useSpeechSettings();

  // 从全局设置中提取值
  const engine = engineSettings.default;
  const customEngines = engineSettings.customEngines;
  const deepLApiKey = engineSettings.apiKeys.deepl;
  const yandexApiKey = engineSettings.apiKeys.yandex;
  
  // TTS引擎设置（从全局设置中获取）
  const ttsEngine = speechSettings.engine;
  
  // 模态框状态
  const [engineModalVisible, setEngineModalVisible] = useImmer(false);
  const [editingEngine, setEditingEngine] = useImmer<CustomEngine | null>(null);
  const [form] = Form.useForm();

  const translateEngineOptions = [
    ...TRANSLATE_ENGINES,
    ...customEngines.filter(engine => engine.enabled).map(engine => ({
      value: engine.id,
      label: engine.name,
      icon: engine.type === 'llm' ? '🤖' : '🔧',
      description: engine.type === 'llm' ? '大语言模型' : '自定义API'
    }))
  ];


  const llmEngineTemplates = [
    {
      name: 'OpenAI GPT',
      type: 'llm' as const,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      prompt: 'Translate the following text to {targetLang}, only return the translation result without any explanation: {text}',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: 'Anthropic Claude',
      type: 'llm' as const,
      apiUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-sonnet-20240229',
      prompt: 'Translate this text to {targetLang}: {text}',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: '通义千问',
      type: 'llm' as const,
      apiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      model: 'qwen-turbo',
      prompt: '请将以下文本翻译成{targetLang}，只返回翻译结果：{text}',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: '百度文心一言',
      type: 'llm' as const,
      apiUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
      model: 'ernie-bot-turbo',
      prompt: '请翻译为{targetLang}：{text}',
      headers: { 'Content-Type': 'application/json' }
    }
  ];

  const handleEngineChange = async (value: string) => {
    await setDefaultEngine(value);
  };

  const testApiKey = async (str) => {
    message.info(t('API密钥测试功能正在开发中'));
  };

  const handleAddEngine = (template?: typeof llmEngineTemplates[0]) => {
    setEditingEngine(null);
    if (template) {
      form.setFieldsValue({
        name: template.name,
        type: template.type,
        apiUrl: template.apiUrl,
        model: template.model,
        prompt: template.prompt,
        headers: JSON.stringify(template.headers, null, 2)
      });
    } else {
      form.resetFields();
    }
    setEngineModalVisible(true);
  };

  const handleEditEngine = (engine: CustomEngine) => {
    setEditingEngine(engine);
    form.setFieldsValue({
      ...engine,
      headers: JSON.stringify(engine.headers || {}, null, 2)
    });
    setEngineModalVisible(true);
  };

  const handleSaveEngine = async () => {
    try {
      const values = await form.validateFields();
      let headers = {};
      try {
        headers = JSON.parse(values.headers || '{}');
      } catch (e) {
        message.error('请输入有效的JSON格式的请求头');
        return;
      }

      const newEngine: CustomEngine = {
        id: editingEngine?.id || `custom_${Date.now()}`,
        name: values.name,
        type: values.type,
        apiUrl: values.apiUrl,
        apiKey: values.apiKey,
        model: values.model,
        prompt: values.prompt,
        headers,
        enabled: true
      };

      if (editingEngine) {
        const newEngines = produce(customEngines, (draft) => {
          const index = draft.findIndex(engine => engine.id === editingEngine.id);
          if (index >= 0) {
            draft[index] = newEngine;
          }
        });
        await updateEngine({ customEngines: newEngines });
        message.success('引擎已更新');
      } else {
        const newEngines = produce(customEngines, (draft) => {
          draft.push(newEngine);
        });
        await updateEngine({ customEngines: newEngines });
        message.success('引擎已添加');
      }
      
      setEngineModalVisible(false);
      form.resetFields();
    } catch (error) {
      // 表单验证失败
    }
  };

  const handleDeleteEngine = async (engineId: string) => {
    // 使用 immer 优化引擎删除
    const newEngines = produce(customEngines, (draft) => {
      return draft.filter(engine => engine.id !== engineId);
    });
    await updateEngine({ customEngines: newEngines });
    
    // 如果删除的是当前选中的引擎，切换到Google
    if (engine === engineId) {
      await setDefaultEngine('google');
    }
    
    message.success('引擎已删除');
  };

  const toggleEngineEnabled = async (engineId: string) => {
    const newEngines = customEngines.map(engine => 
      engine.id === engineId ? { ...engine, enabled: !engine.enabled } : engine
    );
    await updateEngine({ customEngines: newEngines });
  };

  return (
    <SettingsPageContainer title={t('引擎设置')} description={t('配置翻译引擎的相关设置')}>
      {/* 全局翻译引擎设置 */}
      <SettingsGroup title={t('翻译引擎')} first>
        <SettingsItem
          label={t('默认翻译引擎')}
          description={t('选择全局默认的翻译服务提供商')}
        >
          <Select
            value={engine}
            onChange={handleEngineChange}
            style={{ width: 250 }}
            options={translateEngineOptions.map(option => ({
              value: option.value,
              label: (
                <Space>
                  {option.icon && <Icon name={option.icon} size={16} />}
                  <span>{option.label}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{option.description}</span>
                </Space>
              ),
            }))}
          />
        </SettingsItem>

        {engine === 'deepl' && (
          <SettingsItem
            label={t('DeepL API 密钥')}
            description={t('输入您的 DeepL API 密钥以使用稳定的 DeepL 服务')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={deepLApiKey}
                onChange={(e) => updateApiKey('deepl', e.target.value)}
                placeholder={t('请输入 DeepL API 密钥')}
                style={{ width: 300 }}
              />
              <Button onClick={() => testApiKey('deepl')}>
                {t('测试')}
              </Button>
            </div>
          </SettingsItem>
        )}

        {engine === 'bing' && (
          <SettingsItem
            label={t('Bing 翻译 API 密钥')}
            description={t('输入您的 Bing 翻译 API 密钥')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={engineSettings.apiKeys.bing || ''}
                onChange={(e) => updateApiKey('bing', e.target.value)}
                placeholder={t('请输入 Bing API 密钥')}
                style={{ width: 300 }}
              />
              <Button onClick={() => testApiKey('bing')}>
                {t('测试')}
              </Button>
            </div>
          </SettingsItem>
        )}

        {engine === 'yandex' && (
          <SettingsItem
            label={t('Yandex API 密钥')}
            description={t('输入您的 Yandex API 密钥')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={yandexApiKey}
                onChange={(e) => updateApiKey('yandex', e.target.value)}
                placeholder={t('请输入 Yandex API 密钥')}
                style={{ width: 300 }}
              />
              <Button onClick={() => testApiKey('yandex')}>
                {t('测试')}
              </Button>
            </div>
          </SettingsItem>
        )}

      </SettingsGroup>

      {/* TTS 引擎设置 */}
      <SettingsGroup title={t('语音合成引擎')}>
        <SettingsItem
          label={t('语音合成引擎')}
          description={t('选择用于朗读的语音合成引擎')}
        >
          <ConfigProvider
            theme={{
              components: {
                Segmented: {
                  itemColor: isDark ? '#fff' : undefined,
                  itemHoverColor: isDark ? '#fff' : undefined,
                  itemSelectedColor: isDark ? '#fff' : undefined,
                }
              }
            }}
          >
            <Segmented
              value={speechSettings?.engine || 'google'}
              onChange={async (value) => {
                await updateSpeech({ engine: value as any });
                message.success(t('语音合成引擎已切换'));
              }}
              options={TTS_ENGINES.map(engine => ({
                label: engine.label,
                value: engine.value,
              }))}
            />
          </ConfigProvider>
        </SettingsItem>
      </SettingsGroup>

      {/* 自定义引擎管理 */}
      <SettingsGroup title={t('自定义引擎')}>
        <SettingsItem
          label={t('已添加的引擎')}
          description={t('管理您添加的自定义翻译引擎')}
        >
          <div style={{ marginBottom: 16 }}>
            {customEngines.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: isDark ? '#a6a6a6' : '#999999',
                padding: '20px 0'
              }}>
                {t('暂无自定义引擎')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customEngines.map(engine => (
                  <Card
                    key={engine.id}
                    size="small"
                    style={{
                      background: isDark ? '#1f1f1f' : '#ffffff',
                      border: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>
                            {engine.type === 'llm' ? '🤖' : '🔧'}
                          </span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{engine.name}</div>
                            <div style={{ 
                              fontSize: 12, 
                              color: isDark ? '#a6a6a6' : '#999999'
                            }}>
                              {engine.type === 'llm' ? t('大语言模型') : t('自定义API')} · {engine.model || engine.apiUrl}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Switch
                          size="small"
                          checked={engine.enabled}
                          onChange={() => toggleEngineEnabled(engine.id)}
                        />
                        <Button
                          size="small"
                          icon={<Icon name="edit" size={16} />}
                          onClick={() => handleEditEngine(engine)}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<Icon name="delete" size={16} />}
                          onClick={() => handleDeleteEngine(engine.id)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SettingsItem>

        <SettingsItem
          label={t('添加新引擎')}
          description={t('支持自定义API和大语言模型翻译')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button
              type="primary"
              icon={<Icon name="plus" size={16} />}
              onClick={() => handleAddEngine()}
            >
              {t('添加自定义引擎')}
            </Button>
            
            <Divider style={{ margin: '12px 0' }}>{t('快速添加大模型引擎')}</Divider>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {llmEngineTemplates.map((template, index) => (
                <Button
                  key={index}
                  size="small"
                  onClick={() => handleAddEngine(template)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4 
                  }}
                >
                  🤖 {template.name}
                </Button>
              ))}
            </div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      {/* 添加/编辑引擎模态框 */}
      <Modal
        title={editingEngine ? t('编辑引擎') : t('添加引擎')}
        open={engineModalVisible}
        onOk={handleSaveEngine}
        onCancel={() => setEngineModalVisible(false)}
        width={600}
        okText={t('保存')}
        cancelText={t('取消')}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'api',
            headers: '{\n  "Content-Type": "application/json"\n}'
          }}
        >
          <Form.Item
            name="name"
            label={t('引擎名称')}
            rules={[{ required: true, message: t('请输入引擎名称') }]}
          >
            <Input placeholder={t('例如：我的翻译API')} />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('引擎类型')}
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio value="api">{t('自定义API')}</Radio>
              <Radio value="llm">{t('大语言模型')}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="apiUrl"
            label={t('API地址')}
            rules={[{ required: true, message: t('请输入API地址') }]}
          >
            <Input placeholder="https://api.example.com/translate" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label={t('API密钥')}
            rules={[{ required: true, message: t('请输入API密钥') }]}
          >
            <Input.Password placeholder={t('请输入API密钥')} />
          </Form.Item>

          <Form.Item dependencies={['type']} noStyle>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'llm') {
                return (
                  <>
                    <Form.Item
                      name="model"
                      label={t('模型名称')}
                      rules={[{ required: true, message: t('请输入模型名称') }]}
                    >
                      <Input placeholder="gpt-3.5-turbo" />
                    </Form.Item>

                    <Form.Item
                      name="prompt"
                      label={t('翻译提示词')}
                      rules={[{ required: true, message: t('请输入翻译提示词') }]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Translate the following text to {targetLang}: {text}"
                      />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="headers"
            label={t('请求头 (JSON格式)')}
          >
            <Input.TextArea
              rows={4}
              placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer YOUR_TOKEN"\n}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </SettingsPageContainer>
  );
};

export default EngineSettings;
