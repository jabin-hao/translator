import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  ConfigProvider,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Segmented,
  Select,
  Space,
  Switch
} from 'antd';
import { useTranslation } from 'react-i18next';

import EngineOptionLabel from '~lib/components/EngineOptionLabel';
import Icon from '~lib/components/Icon';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '~lib/constants/engines';
import type { CustomEngine, TTSEngineType, TranslateEngineType } from '~lib/constants/types';
import { useEngineSettings, useSpeechSettings } from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type EngineFormValues = Omit<CustomEngine, 'id' | 'enabled' | 'headers'> & {
  headers: string;
};

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
    name: 'Qwen',
    type: 'llm' as const,
    apiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-turbo',
    prompt: 'Translate the following text to {targetLang}: {text}',
    headers: { 'Content-Type': 'application/json' }
  },
  {
    name: 'ERNIE Bot',
    type: 'llm' as const,
    apiUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    model: 'ernie-bot-turbo',
    prompt: 'Translate the following text to {targetLang}: {text}',
    headers: { 'Content-Type': 'application/json' }
  }
];

const EngineSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const {
    engineSettings,
    setDefaultEngine,
    updateApiKey,
    addCustomEngine,
    removeCustomEngine,
    updateCustomEngine,
    setCustomEngineEnabled
  } = useEngineSettings();
  const { speechSettings, setEngine: setSpeechEngine } = useSpeechSettings();

  const [engineModalVisible, setEngineModalVisible] = useState(false);
  const [editingEngine, setEditingEngine] = useState<CustomEngine | null>(null);
  const [form] = Form.useForm<EngineFormValues>();

  const engine = engineSettings.default;
  const customEngines = engineSettings.customEngines;

  const translateEngineOptions = useMemo(
    () => [
      ...TRANSLATE_ENGINES,
      ...customEngines.filter((customEngine) => customEngine.enabled).map((customEngine) => ({
        value: customEngine.id,
        label: customEngine.name,
        icon: customEngine.type === 'llm' ? 'sparkles' : 'server',
        description: customEngine.type === 'llm' ? 'LLM' : 'Custom API'
      }))
    ],
    [customEngines]
  );

  const openCreateModal = (template?: (typeof llmEngineTemplates)[number]) => {
    setEditingEngine(null);
    form.setFieldsValue(
      template
        ? {
            name: template.name,
            type: template.type,
            apiUrl: template.apiUrl,
            model: template.model,
            prompt: template.prompt,
            apiKey: '',
            headers: JSON.stringify(template.headers, null, 2)
          }
        : {
            name: '',
            type: 'api',
            apiUrl: '',
            apiKey: '',
            model: '',
            prompt: '',
            headers: '{\n  "Content-Type": "application/json"\n}'
          }
    );
    setEngineModalVisible(true);
  };

  const openEditModal = (customEngine: CustomEngine) => {
    setEditingEngine(customEngine);
    form.setFieldsValue({
      ...customEngine,
      headers: JSON.stringify(customEngine.headers || {}, null, 2)
    });
    setEngineModalVisible(true);
  };

  const handleSaveEngine = async () => {
    try {
      const values = await form.validateFields();
      let headers: Record<string, string> = {};

      try {
        headers = JSON.parse(values.headers || '{}');
      } catch {
        message.error(t('Please provide valid JSON headers'));
        return;
      }

      const nextEngine: CustomEngine = {
        id: editingEngine?.id || `custom_${Date.now()}`,
        name: values.name,
        type: values.type,
        apiUrl: values.apiUrl,
        apiKey: values.apiKey,
        model: values.model,
        prompt: values.prompt,
        headers,
        enabled: editingEngine?.enabled ?? true
      };

      if (editingEngine) {
        await updateCustomEngine(editingEngine.id, nextEngine);
        message.success(t('Engine updated'));
      } else {
        await addCustomEngine(nextEngine);
        message.success(t('Engine added'));
      }

      setEngineModalVisible(false);
      setEditingEngine(null);
      form.resetFields();
    } catch {
      return;
    }
  };

  const handleDeleteEngine = async (engineId: string) => {
    await removeCustomEngine(engineId);
    if (engine === engineId) {
      await setDefaultEngine('google');
    }
    message.success(t('Engine deleted'));
  };

  const testApiKey = async () => {
    message.info(t('API key testing is not implemented yet'));
  };

  return (
    <SettingsPageContainer
      title={t('Engine settings')}
      description={t('Configure translation and speech engines')}
    >
      <SettingsGroup title={t('Translation engine')} first>
        <SettingsItem
          label={t('Default translation engine')}
          description={t('Choose the default provider for translation')}
        >
          <Select
            value={engine}
            onChange={(value) => setDefaultEngine(value as TranslateEngineType)}
            style={{ width: 250 }}
            options={translateEngineOptions.map((option) => ({
              value: option.value,
              label: (
                <EngineOptionLabel
                  value={option.value}
                  label={option.label}
                  icon={option.icon}
                />
              )
            }))}
          />
        </SettingsItem>

        {engine === 'deepl' && (
          <SettingsItem
            label={t('DeepL free web translation')}
            description={t('This engine uses the DeepL web endpoint and does not require an API key')}
          >
            <div style={{ color: isDark ? '#a6a6a6' : '#666666' }}>
              {t('Using an unofficial free web implementation inspired by open-source projects.')}
            </div>
          </SettingsItem>
        )}

        {engine === 'bing' && (
          <SettingsItem
            label={t('Bing API key')}
            description={t('Provide your Bing API key')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={engineSettings.apiKeys.bing || ''}
                onChange={(event) => updateApiKey('bing', event.target.value)}
                placeholder={t('Enter Bing API key')}
                style={{ width: 300 }}
              />
              <Button onClick={testApiKey}>{t('Test')}</Button>
            </div>
          </SettingsItem>
        )}

        {engine === 'yandex' && (
          <SettingsItem
            label={t('Yandex free web translation')}
            description={t('This engine uses the Yandex website widget endpoint and does not require an API key')}
          >
            <div style={{ color: isDark ? '#a6a6a6' : '#666666' }}>
              {t('Using an unofficial free web implementation inspired by open-source projects.')}
            </div>
          </SettingsItem>
        )}
      </SettingsGroup>

      <SettingsGroup title={t('Speech engine')}>
        <SettingsItem
          label={t('Speech synthesis engine')}
          description={t('Choose the engine used for reading text aloud')}
        >
          <ConfigProvider
            theme={{
              components: {
                Segmented: {
                  itemColor: isDark ? '#fff' : undefined,
                  itemHoverColor: isDark ? '#fff' : undefined,
                  itemSelectedColor: isDark ? '#fff' : undefined
                }
              }
            }}
          >
            <Segmented
              value={speechSettings.engine || 'google'}
              onChange={async (value) => {
                await setSpeechEngine(value as TTSEngineType);
                message.success(t('Speech engine updated'));
              }}
              options={TTS_ENGINES.map((engineOption) => ({
                label: engineOption.label,
                value: engineOption.value
              }))}
            />
          </ConfigProvider>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Custom engines')}>
        <SettingsItem
          label={t('Configured engines')}
          description={t('Manage custom translation providers')}
        >
          <div style={{ marginBottom: 16 }}>
            {customEngines.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: isDark ? '#a6a6a6' : '#999999',
                  padding: '20px 0'
                }}
              >
                {t('No custom engines yet')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customEngines.map((customEngine) => (
                  <Card
                    key={customEngine.id}
                    size="small"
                    style={{
                      background: isDark ? '#1f1f1f' : '#ffffff',
                      border: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name={customEngine.type === 'llm' ? 'sparkles' : 'server'} size={16} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{customEngine.name}</div>
                            <div
                              style={{
                                fontSize: 12,
                                color: isDark ? '#a6a6a6' : '#999999'
                              }}
                            >
                              {customEngine.type === 'llm' ? t('LLM') : t('Custom API')} ·{' '}
                              {customEngine.model || customEngine.apiUrl}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Switch
                          size="small"
                          checked={customEngine.enabled}
                          onChange={(checked) => setCustomEngineEnabled(customEngine.id, checked)}
                        />
                        <Button
                          size="small"
                          icon={<Icon name="edit" size={16} />}
                          onClick={() => openEditModal(customEngine)}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<Icon name="delete" size={16} />}
                          onClick={() => handleDeleteEngine(customEngine.id)}
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
          label={t('Add engine')}
          description={t('Support custom APIs and LLM-based translation engines')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button type="primary" icon={<Icon name="plus" size={16} />} onClick={() => openCreateModal()}>
              {t('Add custom engine')}
            </Button>

            <Divider style={{ margin: '12px 0' }}>{t('Quick add templates')}</Divider>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {llmEngineTemplates.map((template) => (
                <Button
                  key={template.name}
                  size="small"
                  onClick={() => openCreateModal(template)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="sparkles" size={14} />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <Modal
        title={editingEngine ? t('Edit engine') : t('Add engine')}
        open={engineModalVisible}
        onOk={handleSaveEngine}
        onCancel={() => setEngineModalVisible(false)}
        width={600}
        okText={t('Save')}
        cancelText={t('Cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('Engine name')}
            rules={[{ required: true, message: t('Please enter an engine name') }]}
          >
            <Input placeholder={t('Example: My Translation API')} />
          </Form.Item>

          <Form.Item name="type" label={t('Engine type')} rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="api">{t('Custom API')}</Radio>
              <Radio value="llm">{t('LLM')}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="apiUrl"
            label={t('API URL')}
            rules={[{ required: true, message: t('Please enter an API URL') }]}
          >
            <Input placeholder="https://api.example.com/translate" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label={t('API key')}
            rules={[{ required: true, message: t('Please enter an API key') }]}
          >
            <Input.Password placeholder={t('Enter API key')} />
          </Form.Item>

          <Form.Item dependencies={['type']} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'llm' ? (
                <>
                  <Form.Item
                    name="model"
                    label={t('Model name')}
                    rules={[{ required: true, message: t('Please enter a model name') }]}
                  >
                    <Input placeholder="gpt-3.5-turbo" />
                  </Form.Item>

                  <Form.Item
                    name="prompt"
                    label={t('Translation prompt')}
                    rules={[{ required: true, message: t('Please enter a prompt') }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Translate the following text to {targetLang}: {text}"
                    />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item name="headers" label={t('Headers (JSON)')}>
            <Input.TextArea
              rows={4}
              placeholder={'{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </SettingsPageContainer>
  );
};

export default EngineSettings;
