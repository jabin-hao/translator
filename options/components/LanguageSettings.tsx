import React, {useState} from 'react';
import {Card, Select, Button, Tag, Space, Divider, App} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {LANGUAGES} from '~lib/constants/languages';
import {useTranslation} from 'react-i18next';
import {
    ALWAYS_LANGS_KEY,
    FAVORITE_LANGS_KEY,
    NEVER_LANGS_KEY,
    PAGE_LANG_KEY,
    TEXT_LANG_KEY
} from "~lib/constants/settings";
import {useStorage} from '~lib/utils/storage';

const LanguageSettings: React.FC = () => {
    const {t, i18n} = useTranslation();
    const {message} = App.useApp();
    
    // 使用 useStorage hook 替换手动的 storage 操作
    const [pageTargetLang, setPageTargetLang] = useStorage(PAGE_LANG_KEY, 'zh-CN');
    const [textTargetLang, setTextTargetLang] = useStorage(TEXT_LANG_KEY, '');
    const [favoriteLangs, setFavoriteLangs] = useStorage(FAVORITE_LANGS_KEY, []);
    const [neverLangs, setNeverLangs] = useStorage(NEVER_LANGS_KEY, []);
    const [alwaysLangs, setAlwaysLangs] = useStorage(ALWAYS_LANGS_KEY, []);
    
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
            setTextTargetLang(defaultTextLang);
        }
    }, [textTargetLang, favoriteLangs, setTextTargetLang]);

    // 偏好语言
    const handleAddFav = async () => {
        if (favoriteLangs.length >= 3) {
            message.warning('最多只能选择三种偏好语言');
            return;
        }
        if (addFav && !favoriteLangs.includes(addFav)) {
            const next = [...favoriteLangs, addFav];
            setFavoriteLangs(next);
            message.success('已保存');
            setAddFav('');
        }
    };
    const handleRemoveFav = async (lang: any) => {
        const next = favoriteLangs.filter(l => l !== lang);
        setFavoriteLangs(next);
        message.success('已保存');
    };

    // 永不翻译
    const handleAddNever = async () => {
        if (addNever && !neverLangs.includes(addNever)) {
            const next = [...neverLangs, addNever];
            setNeverLangs(next);
            message.success('已保存');
            setAddNever('');
        }
    };
    const handleRemoveNever = async (lang: any) => {
        const next = neverLangs.filter(l => l !== lang);
        setNeverLangs(next);
        message.success('已保存');
    };

    // 总是翻译
    const handleAddAlways = async () => {
        if (addAlways && !alwaysLangs.includes(addAlways)) {
            const next = [...alwaysLangs, addAlways];
            setAlwaysLangs(next);
            message.success('已保存');
            setAddAlways('');
        }
    };
    const handleRemoveAlways = async (lang: any) => {
        const next = alwaysLangs.filter(l => l !== lang);
        setAlwaysLangs(next);
        message.success('已保存');
    };

    return (
        <Card
            title={t('语言设置')}
            style={{
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: 'transparent',
                border: 'none'
            }}
            styles={{
                body: {
                    padding: 0, 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    backgroundColor: 'transparent'
                }
            }}
        >
            <div style={{flex: 1, overflow: 'auto', padding: '24px'}}>
                {/* 网页翻译目标语言 */}
                <div style={{marginBottom: 24}}>
                    <b>{t('网页翻译目标语言')}：</b>
                    <Select
                        key={i18n.language}
                        value={pageTargetLang}
                        options={LANGUAGES.map(l => ({label: t('lang.' + l.code), value: l.code}))}
                        onChange={val => {
                            setPageTargetLang(val);
                            message.success('已保存');
                        }}
                        style={{width: 200, marginLeft: 16}}
                    />
                    <div style={{fontSize: 13, color: 'var(--ant-color-text-secondary)', marginTop: 8}}>
                        {t('设置网页整体翻译的目标语言')}
                    </div>
                </div>
                {/* 划词翻译目标语言 */}
                <div style={{marginBottom: 24}}>
                    <b>{t('划词翻译目标语言')}：</b>
                    <Select
                        key={i18n.language}
                        value={textTargetLang}
                        options={LANGUAGES.map(l => ({label: t('lang.' + l.code), value: l.code}))}
                        onChange={val => {
                            setTextTargetLang(val);
                            message.success('已保存');
                        }}
                        style={{width: 200, marginLeft: 16}}
                    />
                    <div style={{fontSize: 13, color: 'var(--ant-color-text-secondary)', marginTop: 8}}>
                        {t('设置划词/输入翻译的默认目标语言')}
                    </div>
                </div>
                <Divider/>
                {/* 偏好语言 */}
                <div style={{marginBottom: 24}}>
                    <b>{t('偏好语言')}：</b>
                    <Space>
                        <Select
                            key={i18n.language}
                            value={addFav}
                            options={LANGUAGES.filter(l => !favoriteLangs.includes(l.code)).map(l => ({
                                label: t('lang.' + l.code),
                                value: l.code
                            }))}
                            onChange={setAddFav}
                            style={{width: 160}}
                            placeholder={t('选择语言')}
                            allowClear
                        />
                        <Button icon={<PlusOutlined/>} onClick={handleAddFav}
                                disabled={!addFav || favoriteLangs.length >= 3}>{t('添加')}</Button>
                    </Space>
                    <div style={{marginTop: 8}}>
                        {favoriteLangs.map(lang => (
                            <Tag
                                key={lang}
                                closable
                                onClose={() => handleRemoveFav(lang)}
                                color="blue"
                            >
                                {t('lang.' + lang)}
                            </Tag>
                        ))}
                    </div>
                    <div style={{fontSize: 13, color: 'var(--ant-color-text-secondary)', marginTop: 8}}>
                        {t('你常用的目标语言，优先用于自动选择')}
                    </div>
                </div>
                {/* 永不翻译语言 */}
                <div style={{marginBottom: 24}}>
                    <b>{t('永不翻译这些语言')}：</b>
                    <Space>
                        <Select
                            key={i18n.language}
                            value={addNever}
                            options={LANGUAGES.filter(l => !neverLangs.includes(l.code)).map(l => ({
                                label: t('lang.' + l.code),
                                value: l.code
                            }))}
                            onChange={setAddNever}
                            style={{width: 160}}
                            placeholder={t('选择语言')}
                            allowClear
                        />
                        <Button icon={<PlusOutlined/>} onClick={handleAddNever}
                                disabled={!addNever}>{t('添加')}</Button>
                    </Space>
                    <div style={{marginTop: 8}}>
                        {neverLangs.map(lang => (
                            <Tag
                                key={lang}
                                closable
                                onClose={() => handleRemoveNever(lang)}
                                color="red"
                            >
                                {t('lang.' + lang)}
                            </Tag>
                        ))}
                    </div>
                    <div style={{fontSize: 13, color: 'var(--ant-color-text-secondary)', marginTop: 8}}>
                        {t('这些语言不会被自动翻译')}
                    </div>
                </div>
                {/* 总是翻译语言 */}
                <div style={{marginBottom: 24}}>
                    <b>{t('总是翻译这些语言')}：</b>
                    <Space>
                        <Select
                            key={i18n.language}
                            value={addAlways}
                            options={LANGUAGES.filter(l => !alwaysLangs.includes(l.code)).map(l => ({
                                label: t('lang.' + l.code),
                                value: l.code
                            }))}
                            onChange={setAddAlways}
                            style={{width: 160}}
                            placeholder={t('选择语言')}
                            allowClear
                        />
                        <Button icon={<PlusOutlined/>} onClick={handleAddAlways}
                                disabled={!addAlways}>{t('添加')}</Button>
                    </Space>
                    <div style={{marginTop: 8}}>
                        {alwaysLangs.map(lang => (
                            <Tag
                                key={lang}
                                closable
                                onClose={() => handleRemoveAlways(lang)}
                                color="green"
                            >
                                {t('lang.' + lang)}
                            </Tag>
                        ))}
                    </div>
                    <div style={{fontSize: 13, color: 'var(--ant-color-text-secondary)', marginTop: 8}}>
                        {t('这些语言会被自动翻译为你的目标语言')}
                    </div>
                </div>
            </div>
            <div style={{padding: '0 24px 16px 24px', color: 'var(--ant-color-text-secondary)', fontSize: 13}}>
                {t('所有设置均会自动保存，无需手动操作。')}
            </div>
        </Card>
    );
};

export default LanguageSettings;
