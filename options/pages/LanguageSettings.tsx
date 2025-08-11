import React, {useState} from 'react';
import {Select, Button, Tag, Space, App} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {LANGUAGES} from '~lib/constants/languages';
import {useTranslation} from 'react-i18next';
import {
    useLanguageSettings
} from '~lib/utils/globalSettingsHooks';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';

const LanguageSettings: React.FC = () => {
    const {t, i18n} = useTranslation();
    const {message} = App.useApp();
    
    // 使用专门的语言设置hook
    const { 
        languageSettings, 
        setPageTargetLanguage, 
        setTextTargetLanguage,
        addFavoriteLanguage,
        removeFavoriteLanguage,
        addNeverLanguage,
        removeNeverLanguage,
        addAlwaysLanguage,
        removeAlwaysLanguage
    } = useLanguageSettings();
    
    // 从语言设置中提取值
    const pageTargetLang = languageSettings.pageTarget;
    const textTargetLang = languageSettings.textTarget;
    const favoriteLangs = languageSettings.favorites;
    const neverLangs = languageSettings.never;
    const alwaysLangs = languageSettings.always;
    
    const [addFav, setAddFav] = useState('');
    const [addNever, setAddNever] = useState('');
    const [addAlways, setAddAlways] = useState('');

    // 初始化划词翻译目标语言的逻辑
    React.useEffect(() => {
        if (!textTargetLang) {
            let defaultTextLang;
            if (favoriteLangs && favoriteLangs.length > 0) {
                defaultTextLang = favoriteLangs[0];
            } else {
                defaultTextLang = navigator.language.startsWith('zh') ? 'zh-CN' : (navigator.language.startsWith('en') ? 'en' : 'zh-CN');
            }
            setTextTargetLanguage(defaultTextLang);
        }
    }, [textTargetLang, favoriteLangs, setTextTargetLanguage]);

    // 偏好语言
    const handleAddFav = async () => {
        if (favoriteLangs.length >= 3) {
            message.warning('最多只能选择三种偏好语言');
            return;
        }
        if (addFav && !favoriteLangs.includes(addFav)) {
            await addFavoriteLanguage(addFav);
            message.success('已保存');
            setAddFav('');
        }
    };
    const handleRemoveFav = async (lang: any) => {
        await removeFavoriteLanguage(lang);
        message.success('已保存');
    };

    // 永不翻译
    const handleAddNever = async () => {
        if (addNever && !neverLangs.includes(addNever)) {
            await addNeverLanguage(addNever);
            message.success('已保存');
            setAddNever('');
        }
    };
    const handleRemoveNever = async (lang: any) => {
        await removeNeverLanguage(lang);
        message.success('已保存');
    };

    // 总是翻译
    const handleAddAlways = async () => {
        if (addAlways && !alwaysLangs.includes(addAlways)) {
            await addAlwaysLanguage(addAlways);
            message.success('已保存');
            setAddAlways('');
        }
    };
    const handleRemoveAlways = async (lang: any) => {
        await removeAlwaysLanguage(lang);
        message.success('已保存');
    };

    return (
        <SettingsPageContainer
            title={t('语言设置')}
            description={t('配置翻译的目标语言和语言偏好')}
        >
            <SettingsGroup title={t('目标语言设置')} first>
                <SettingsItem
                    label={t('网页翻译目标语言')}
                    description={t('设置网页整体翻译的目标语言')}
                >
                    <Select
                        key={i18n.language}
                        value={pageTargetLang}
                        options={LANGUAGES.map(l => ({label: t('lang.' + l.code), value: l.code}))}
                        onChange={async val => {
                            await setPageTargetLanguage(val);
                            message.success('已保存');
                        }}
                        style={{width: 240}}
                        size="middle"
                    />
                </SettingsItem>

                <SettingsItem
                    label={t('划词翻译目标语言')}
                    description={t('设置划词/输入翻译的默认目标语言')}
                >
                    <Select
                        key={i18n.language}
                        value={textTargetLang}
                        options={LANGUAGES.map(l => ({label: t('lang.' + l.code), value: l.code}))}
                        onChange={async val => {
                            await setTextTargetLanguage(val);
                            message.success('已保存');
                        }}
                        style={{width: 240}}
                        size="middle"
                    />
                </SettingsItem>
            </SettingsGroup>

            <SettingsGroup title={t('语言偏好设置')}>
                <SettingsItem
                    label={t('偏好语言')}
                    description={t('你常用的目标语言，优先用于自动选择（最多3种）')}
                >
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
                            <Select
                                key={i18n.language}
                                value={addFav}
                                options={LANGUAGES.filter(l => !favoriteLangs.includes(l.code)).map(l => ({
                                    label: t('lang.' + l.code),
                                    value: l.code
                                }))}
                                onChange={setAddFav}
                                style={{width: 200}}
                                size="middle"
                                placeholder={t('选择语言')}
                                allowClear
                            />
                            <Button 
                                icon={<PlusOutlined/>} 
                                onClick={handleAddFav} 
                                disabled={!addFav || favoriteLangs.length >= 3}
                                size="middle"
                            >
                                {t('添加')}
                            </Button>
                        </div>
                        <div>
                            {favoriteLangs.map(lang => (
                                <Tag
                                    key={lang}
                                    closable
                                    onClose={() => handleRemoveFav(lang)}
                                    color="blue"
                                    style={{marginBottom: 4}}
                                >
                                    {t('lang.' + lang)}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </SettingsItem>

                <SettingsItem
                    label={t('永不翻译这些语言')}
                    description={t('这些语言不会被自动翻译')}
                >
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
                            <Select
                                key={i18n.language}
                                value={addNever}
                                options={LANGUAGES.filter(l => !neverLangs.includes(l.code)).map(l => ({
                                    label: t('lang.' + l.code),
                                    value: l.code
                                }))}
                                onChange={setAddNever}
                                style={{width: 200}}
                                size="middle"
                                placeholder={t('选择语言')}
                                allowClear
                            />
                            <Button 
                                icon={<PlusOutlined/>} 
                                onClick={handleAddNever} 
                                disabled={!addNever}
                                size="middle"
                            >
                                {t('添加')}
                            </Button>
                        </div>
                        <div>
                            {neverLangs.map(lang => (
                                <Tag
                                    key={lang}
                                    closable
                                    onClose={() => handleRemoveNever(lang)}
                                    color="red"
                                    style={{marginBottom: 4}}
                                >
                                    {t('lang.' + lang)}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </SettingsItem>

                <SettingsItem
                    label={t('总是翻译这些语言')}
                    description={t('这些语言会被自动翻译为你的目标语言')}
                >
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
                            <Select
                                key={i18n.language}
                                value={addAlways}
                                options={LANGUAGES.filter(l => !alwaysLangs.includes(l.code)).map(l => ({
                                    label: t('lang.' + l.code),
                                    value: l.code
                                }))}
                                onChange={setAddAlways}
                                style={{width: 200}}
                                size="middle"
                                placeholder={t('选择语言')}
                                allowClear
                            />
                            <Button 
                                icon={<PlusOutlined/>} 
                                onClick={handleAddAlways} 
                                disabled={!addAlways}
                                size="middle"
                            >
                                {t('添加')}
                            </Button>
                        </div>
                        <div>
                            {alwaysLangs.map(lang => (
                                <Tag
                                    key={lang}
                                    closable
                                    onClose={() => handleRemoveAlways(lang)}
                                    color="green"
                                    style={{marginBottom: 4}}
                                >
                                    {t('lang.' + lang)}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </SettingsItem>
            </SettingsGroup>
        </SettingsPageContainer>
    );
};

export default LanguageSettings;
