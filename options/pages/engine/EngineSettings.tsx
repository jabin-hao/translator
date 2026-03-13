import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import { useTranslation } from 'react-i18next';

import EngineOptionLabel from '~lib/components/EngineOptionLabel';
import ProviderBrandIcon from '~lib/components/ProviderBrandIcon';
import { customTranslate } from '~background/translate/custom';
import { getLocalizedLangLabel, LANGUAGES } from '~lib/constants/languages';
import { CUSTOM_ENGINE_PROVIDER_OPTIONS, DEFAULT_CUSTOM_API_HEADERS, DEFAULT_LLM_PROMPT, getProviderOption, LLM_ENGINE_TEMPLATES } from '~lib/constants/customEngines';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '~lib/constants/engines';
import type { CustomEngine, CustomEngineProvider, TTSEngineType } from '~lib/constants/types';
import { useEngineSettings, useLanguageSettings, useSpeechSettings } from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type EngineFormValues = Omit<CustomEngine, 'id' | 'enabled' | 'headers'> & {
  headers: string;
};

const protocolCodeBlockStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 10,
  fontSize: 12,
  lineHeight: 1.55,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const normalizeCustomEngine = (engine: CustomEngine): CustomEngine => ({
  ...engine,
  provider: engine.provider || (engine.type === 'llm' ? 'openai' : 'custom-api'),
  headers: engine.headers || {},
});

const parseHeadersInput = (headersText: string) => JSON.parse(headersText || '{}') as Record<string, string>;

const buildCustomEnginePayload = (
  values: EngineFormValues,
  editingEngine: CustomEngine | null
): CustomEngine => ({
  id: editingEngine?.id || `custom_${Date.now()}`,
  name: values.name.trim(),
  type: values.type,
  provider: values.type === 'api' ? 'custom-api' : values.provider,
  apiUrl: values.apiUrl.trim(),
  apiKey: values.apiKey?.trim() || '',
  model: values.type === 'llm' ? values.model?.trim() || '' : '',
  prompt: values.type === 'llm' ? values.prompt?.trim() || DEFAULT_LLM_PROMPT : '',
  headers: parseHeadersInput(values.headers),
  enabled: editingEngine?.enabled ?? true,
});

const renderProviderLabel = (provider: CustomEngineProvider) => {
  const option = getProviderOption(provider);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ProviderBrandIcon provider={provider} size={16} />
      <span>{option.label}</span>
    </span>
  );
};

const EngineSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const {
    engineSettings,
    setDefaultEngine,
    addCustomEngine,
    removeCustomEngine,
    updateCustomEngine,
    setCustomEngineEnabled,
  } = useEngineSettings();
  const { languageSettings } = useLanguageSettings();
  const { speechSettings, setEngine: setSpeechEngine } = useSpeechSettings();

  const [engineModalVisible, setEngineModalVisible] = useState(false);
  const [editingEngine, setEditingEngine] = useState<CustomEngine | null>(null);
  const [testingEngine, setTestingEngine] = useState(false);
  const [testText, setTestText] = useState('Hello world');
  const [testResult, setTestResult] = useState('');
  const [testTargetLang, setTestTargetLang] = useState(languageSettings.textTarget || 'zh-CN');
  const [form] = Form.useForm<EngineFormValues>();

  const engine = engineSettings.default;
  const customEngines = useMemo(
    () => engineSettings.customEngines.map(normalizeCustomEngine),
    [engineSettings.customEngines]
  );

  const translateEngineOptions = useMemo(
    () => [
      ...TRANSLATE_ENGINES,
      ...customEngines
        .filter((customEngine) => customEngine.enabled)
        .map((customEngine) => ({
          value: customEngine.id,
          label: customEngine.name,
          provider: customEngine.provider,
        })),
    ],
    [customEngines]
  );

  const closeModal = () => {
    setEngineModalVisible(false);
    setEditingEngine(null);
    setTestingEngine(false);
    setTestResult('');
    setTestText('Hello world');
    setTestTargetLang(languageSettings.textTarget || 'zh-CN');
    form.resetFields();
  };

  const openCreateModal = (template?: (typeof LLM_ENGINE_TEMPLATES)[number]) => {
    setEditingEngine(null);
    form.setFieldsValue(
      template
        ? {
          name: template.name,
          type: template.type,
          provider: template.provider,
          apiUrl: template.apiUrl,
          model: template.model,
          prompt: template.prompt,
          apiKey: '',
          headers: JSON.stringify(template.headers, null, 2),
        }
        : {
          name: '',
          type: 'api',
          provider: 'custom-api',
          apiUrl: '',
          apiKey: '',
          model: '',
          prompt: DEFAULT_LLM_PROMPT,
          headers: JSON.stringify(DEFAULT_CUSTOM_API_HEADERS, null, 2),
        }
    );
    setEngineModalVisible(true);
  };

  const openEditModal = (customEngine: CustomEngine) => {
    const normalized = normalizeCustomEngine(customEngine);
    setEditingEngine(normalized);
    form.setFieldsValue({
      ...normalized,
      headers: JSON.stringify(normalized.headers || {}, null, 2),
    });
    setEngineModalVisible(true);
  };

  const handleTypeChange = (nextType: 'api' | 'llm') => {
    if (nextType === 'api') {
      form.setFieldsValue({
        type: 'api',
        provider: 'custom-api',
        model: '',
        prompt: '',
      });
      return;
    }

    const defaultTemplate = LLM_ENGINE_TEMPLATES[0];
    form.setFieldsValue({
      type: 'llm',
      provider: defaultTemplate.provider,
      apiUrl: defaultTemplate.apiUrl,
      model: defaultTemplate.model,
      prompt: defaultTemplate.prompt,
      headers: JSON.stringify(defaultTemplate.headers, null, 2),
    });
  };

  const handleProviderChange = (provider: CustomEngineProvider) => {
    const template = LLM_ENGINE_TEMPLATES.find((item) => item.provider === provider);
    if (!template) {
      return;
    }

    form.setFieldsValue({
      provider,
      apiUrl: template.apiUrl,
      model: template.model,
      prompt: form.getFieldValue('prompt') || template.prompt,
      headers: JSON.stringify(template.headers, null, 2),
    });
  };

  const handleSaveEngine = async () => {
    try {
      const values = await form.validateFields();
      let nextEngine: CustomEngine;

      try {
        nextEngine = buildCustomEnginePayload(values, editingEngine);
      } catch {
        message.error(t('Please provide valid JSON headers'));
        return;
      }

      if (editingEngine) {
        await updateCustomEngine(editingEngine.id, nextEngine);
        message.success(t('Engine updated'));
      } else {
        await addCustomEngine(nextEngine);
        message.success(t('Engine added'));
      }

      closeModal();
    } catch {
      return;
    }
  };

  const handleTestEngine = async () => {
    try {
      const values = await form.validateFields();
      let nextEngine: CustomEngine;

      try {
        nextEngine = buildCustomEnginePayload(values, editingEngine);
      } catch {
        message.error(t('Please provide valid JSON headers'));
        return;
      }

      if (!testText.trim()) {
        message.error(t('Please enter text to test'));
        return;
      }

      setTestingEngine(true);
      setTestResult('');

      const translatedText = await customTranslate(
        testText.trim(),
        'en',
        testTargetLang,
        normalizeCustomEngine(nextEngine)
      );

      setTestResult(translatedText);
      message.success(t('Test translation succeeded'));
    } catch (error) {
      console.error('Custom engine test failed:', error);
      setTestResult('');
      message.error(error instanceof Error ? error.message : t('Test translation failed'));
    } finally {
      setTestingEngine(false);
    }
  };

  const handleDeleteEngine = async (engineId: string) => {
    await removeCustomEngine(engineId);
    if (engine === engineId) {
      await setDefaultEngine('google');
    }
    message.success(t('Engine deleted'));
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
            onChange={(value) => void setDefaultEngine(value)}
            style={{ width: 280 }}
            options={translateEngineOptions.map((option) => ({
              value: option.value,
              label:
                'provider' in option ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <ProviderBrandIcon provider={option.provider} size={16} />
                    <span>{option.label}</span>
                  </span>
                ) : (
                  <EngineOptionLabel
                    value={option.value}
                    label={option.label}
                    icon={option.icon}
                  />
                ),
            }))}
          />
        </SettingsItem>

        <Divider style={{ margin: '8px 0 20px' }} />

        <SettingsItem
          label={t('Configured engines')}
          description={t('Manage custom translation providers')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {customEngines.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: isDark ? '#a6a6a6' : '#999999',
                  padding: '20px 0',
                }}
              >
                {t('No custom engines yet')}
              </div>
            ) : (
              customEngines.map((customEngine) => (
                <Card
                  key={customEngine.id}
                  size="small"
                  style={{
                    background: isDark ? '#1f1f1f' : '#ffffff',
                    border: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ProviderBrandIcon provider={customEngine.provider} size={18} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500 }}>{customEngine.name}</div>
                          <div
                            style={{
                              fontSize: 12,
                              color: isDark ? '#a6a6a6' : '#999999',
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                              marginTop: 4,
                            }}
                          >
                            <Tag color={customEngine.type === 'llm' ? 'purple' : 'blue'}>
                              {customEngine.type === 'llm' ? t('LLM') : t('Custom API')}
                            </Tag>
                            <Tag>{getProviderOption(customEngine.provider).label}</Tag>
                            {customEngine.model ? <Tag>{customEngine.model}</Tag> : null}
                            {!customEngine.model ? <span>{customEngine.apiUrl}</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Space size={8}>
                      <Switch
                        size="small"
                        checked={customEngine.enabled}
                        onChange={(checked) => void setCustomEngineEnabled(customEngine.id, checked)}
                      />
                      <Button
                        size="small"
                        onClick={() => openEditModal(customEngine)}
                      >
                        {t('Edit engine')}
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => void handleDeleteEngine(customEngine.id)}
                      >
                        {t('Delete')}
                      </Button>
                    </Space>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SettingsItem>

        <SettingsItem
          label={t('Add engine')}
          description={t('Support custom APIs and LLM-based translation engines')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Divider style={{ margin: '8px 0' }}>{t('Quick add templates')}</Divider>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button
                type="primary"
                size="small"
                onClick={() => openCreateModal()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {t('Add custom engine')}
              </Button>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                background: isDark ? '#141414' : '#fafafa',
                color: isDark ? '#d9d9d9' : '#1f1f1f',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                {t('Custom API protocol')}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#a6a6a6' : '#595959' }}>
                {t(
                  'The custom API will receive a POST JSON body with text, sourceLang, targetLang, from, and to. Return a JSON object with translation or translatedText.',
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LLM_ENGINE_TEMPLATES.map((template) => (
                <Button
                  key={template.name}
                  size="small"
                  onClick={() => openCreateModal(template)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ProviderBrandIcon provider={template.provider} size={14} />
                  {template.name}
                </Button>
              ))}
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: `1px solid ${isDark ? '#303030' : '#d6e4ff'}`,
                background: isDark ? '#111b26' : '#f7fbff',
                color: isDark ? '#d6e4ff' : '#1f1f1f',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                {t('Built-in LLM adapters')}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#adc6ff' : '#595959' }}>
                {t(
                  'OpenAI-compatible providers use chat completions, Anthropic uses the messages API, Gemini uses generateContent, and Ollama uses the chat API.',
                )}
              </div>
            </div>
          </div>
        </SettingsItem>
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
                  itemSelectedColor: isDark ? '#fff' : undefined,
                },
              },
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
                value: engineOption.value,
              }))}
            />
          </ConfigProvider>
        </SettingsItem>
      </SettingsGroup>

      <Modal
        title={editingEngine ? t('Edit engine') : t('Add engine')}
        open={engineModalVisible}
        onCancel={closeModal}
        width={720}
        footer={[
          <Button key="cancel" onClick={closeModal}>
            {t('Cancel')}
          </Button>,
          <Button key="save" type="primary" onClick={() => void handleSaveEngine()}>
            {t('Save')}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'api', provider: 'custom-api' }}>
          <Form.Item
            name="name"
            label={t('Engine name')}
            rules={[{ required: true, message: t('Please enter an engine name') }]}
          >
            <Input placeholder={t('Example: My Translation API')} />
          </Form.Item>

          <Form.Item name="type" label={t('Engine type')} rules={[{ required: true }]}>
            <Segmented
              options={[
                { label: t('Custom API'), value: 'api' },
                { label: t('LLM'), value: 'llm' },
              ]}
              onChange={(value) => handleTypeChange(value as 'api' | 'llm')}
            />
          </Form.Item>

          <Form.Item dependencies={['type']} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'llm' ? (
                <>
                  <Form.Item
                    name="provider"
                    label={t('Provider')}
                    rules={[{ required: true, message: t('Please choose a provider') }]}
                  >
                    <Select
                      options={CUSTOM_ENGINE_PROVIDER_OPTIONS.filter(
                        (item) => item.value !== 'custom-api'
                      ).map((item) => ({
                        value: item.value,
                        label: renderProviderLabel(item.value),
                      }))}
                      onChange={(value) => handleProviderChange(value as CustomEngineProvider)}
                    />
                  </Form.Item>
                </>
              ) : null
            }
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
            extra={t('If you leave custom Authorization headers empty, the API key will be injected automatically for supported providers.')}
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
                    <Input placeholder="gpt-4o-mini" />
                  </Form.Item>

                  <Form.Item
                    name="prompt"
                    label={t('Translation prompt')}
                    rules={[{ required: true, message: t('Please enter a prompt') }]}
                    extra={t('Use placeholders {text}, {sourceLang}, and {targetLang}.')}
                  >
                    <Input.TextArea rows={4} placeholder={DEFAULT_LLM_PROMPT} />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="headers"
            label={t('Headers (JSON)')}
            extra={t('Optional custom headers for the upstream provider or API gateway.')}
          >
            <Input.TextArea
              rows={4}
              placeholder={'{\n  "Content-Type": "application/json"\n}'}
            />
          </Form.Item>

          <Collapse
            ghost
            style={{ marginBottom: 16 }}
            items={[
              {
                key: 'test-translation',
                label: t('Test translation'),
                children: (
                  <div style={{ paddingTop: 4 }}>
                    <Form.Item
                      label={t('Target language')}
                      extra={t('The test request uses the current form values and sends English text to the selected target language.')}
                    >
                      <Select
                        value={testTargetLang}
                        onChange={setTestTargetLang}
                        options={LANGUAGES.map((language) => ({
                          value: language.code,
                          label: getLocalizedLangLabel(language.code, i18n.language),
                        }))}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>

                    <Form.Item label={t('Test text')}>
                      <Input.TextArea
                        rows={3}
                        value={testText}
                        onChange={(event) => setTestText(event.target.value)}
                        placeholder="Hello world"
                      />
                    </Form.Item>

                    <div style={{ marginBottom: 12 }}>
                      <Button
                        onClick={() => void handleTestEngine()}
                        loading={testingEngine}
                      >
                        {t('Test translation')}
                      </Button>
                    </div>

                    {testResult ? (
                      <div
                        style={{
                          marginBottom: 8,
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${isDark ? '#274916' : '#b7eb8f'}`,
                          background: isDark ? '#162312' : '#f6ffed',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? '#b7eb8f' : '#389e0d' }}>
                          {t('Test result')}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{testResult}</div>
                      </div>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />

          <Form.Item dependencies={['type']} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'api' ? (
                <div
                  style={{
                    border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                      fontWeight: 600,
                    }}
                  >
                    {t('Request and response contract')}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ marginBottom: 12, fontSize: 13, color: isDark ? '#d9d9d9' : '#555' }}>
                      {t('Custom API requests are fixed to POST JSON so the extension can validate and cache responses consistently.')}
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('Request body')}</div>
                        <pre
                          style={{
                            ...protocolCodeBlockStyle,
                            background: isDark ? '#141414' : '#fafafa',
                          }}
                        >{`{
  "text": "Hello world",
  "sourceLang": "en",
  "targetLang": "zh-CN",
  "from": "en",
  "to": "zh-CN"
}`}</pre>
                      </div>
                      <div>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('Response body')}</div>
                        <pre
                          style={{
                            ...protocolCodeBlockStyle,
                            background: isDark ? '#141414' : '#fafafa',
                          }}
                        >{`{
  "translation": "?????"
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </SettingsPageContainer>
  );
};

export default EngineSettings;
