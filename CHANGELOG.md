## [unreleased]

### ⚙️ Miscellaneous Tasks

- Add pnpm-workspace.yaml to allow native build scripts
## [0.0.1] - 2026-04-08

### 🚀 Features

- 新增双击ctrl快捷键
- 新增输入翻译悬浮窗
- 将组件拆分出来
- 优化翻译悬浮窗样式 | 新增Esc快捷键退出
- 优化结果悬浮窗样式
- 去掉popup页 | 开始构建option页
- 新增主题切换功能
- *(options)* 新增搜索引擎设置
- *(opton)* 抽象language文件
- *(api)* 集成bing翻译api、抽象language
- *(option)* 新增导入导出配置功能
- *(background)* 多引擎自动切换
- *(css)* 翻译引擎icon
- *(option)* 设置页面的样式更新
- *(option)* 一键清空配置
- *(option)* 新增快捷键设置
- *(cache)* 新增翻译缓存功能
- *(audio)* 朗读功能重构
- *(edge tts)* 新增微软翻译tts服务
- *(option)* Popup快捷设置
- *(content)* 网页翻译功能
- *(option)* 自定义词库
- *(content)* 细分url的网站自动翻译匹配
- *(option)* 更新使用说明
- *(engine)* 增加新翻译引擎
- *(content)* 新增全局翻译时的loading
- *(option)* 拆分翻译设置
- *(option)* 拓展功能
- *(option)* 删除冗余黑名单
- *(hotkey)* 新增快捷键逻辑
- *(translate)* 输入框翻译功能
- *(option)* 文件翻译和字幕翻译ui及功能设计
- Add custom engines and lobehub icons
- 第一次发版|暂时隐藏未完成功能

### 🐛 Bug Fixes

- 划词按钮和结果不显示的问题
- Antd组件样式无法正常显示的问题
- 修复复制按钮无法正常使用的问题 | 部分组件样式问题
- 去掉部分调试代码
- Message组件显示问题
- 修复翻译结果中按钮位置错乱问题
- 切换主题时页面闪烁的问题
- Icon图标不会自动消失的bug
- 部分antd使用bug
- 双击翻译icon不会自动消失的问题
- Input组件的输入框无法正常输入
- *(icon)* 修复选中文字不会出现icon的问题
- *(content)* 划词翻译option设置未生效
- *(option)* 解决部分选择器选择数据之后不会弹窗提示的问题
- *(content)* Input组件修复i18n
- *(content)* 没有正确展示翻译引擎
- *(tts)* 修复音调和音色设置不生效的问题
- *(clear)* 清理部分调试代码
- *(i18n)* 部分option页面的国际化支持问题
- *(lazy)* 懒加载网页翻译
- *(content)* 双语对照模式下出现循环回写的问题
- *(content)* 网页翻译优化1
- *(content)* 输入框光标丢失的bug
- *(content)* 网页翻译优化
- *(option)* 修复导入导出配置功能
- *(content)* 修复朗读音频拦截问题
- *(content)* 翻译/还原当前网页
- *(content)* 网页翻译优化、缓存优化
- *(popup)* 样式优化
- *(cache)* 缓存优化、popup通信
- *(content)* 修复input组件的样式问题
- *(storage)* 自动监听配置问题
- *(option)* 样式优化
- *(style)* 修复option和contnet样式
- *(speech)* 修复朗读问题
- (content):icon位置以及message组件
- *(content)* 修复划词自动翻译未生效问题 | 网页自动翻译未生效问题
- *(tts)* 修复tts服务
- *(cache)* 修复缓存bug
- *(style)* 优化按钮样式 | 修复popup唤起input组件问题
- *(translate)* 原文对照模式失效
- *(option)* 删除白名单时，一并删除词库
- *(content)* 修复全局配置集成
- *(option)* 不合理的设置项以及页面逻辑
- *(settings)* 重构设置逻辑
- *(settings)* Fix
- *(immer)* 使用immer优化代码逻辑
- *(optimization)* 优化indexedb逻辑
- 重整代码
- *(content)* 调整代码逻辑
- *(popup)* 去掉黑名单
- *(style)* 修复缓存设置页面的内容显示
- *(style)* 修复部分页面样式 | 重构收藏夹和缓存等存储逻辑
- *(style)* 更换图标
- *(style)* 修复样式 | 修复语音引擎逻辑
- *(style)* 修复部分样式 | 新增划词翻译的快捷功能
- *(translate)* 去掉双击翻译，完善划词翻译逻辑
- *(style)* 修复翻译结果的位置样式
- *(translate)* 选词快捷键翻译
- *(translate)* 输入框翻译重构
- *(input_translate)* 修复输入框翻译样式 | 快捷键逻辑
- *(popup)* 修复popup的错误
- Improve speech engine flow and i18n
- Refine theme and custom engine settings

### 💼 Other

- *(audio)* Tts服务暂时只有本地可用

### 📚 Documentation

- Restructure bilingual readme
- 修改版本号

### 🎨 Styling

- 冗余代码去除1

### ⚙️ Miscellaneous Tasks

- 划词翻译测试
- *(storage)* 更新为plasmo/storage存储服务并配置google和bing引擎
- *(background)* 重构消息handle
- *(i18)* 国际化改造
- *(storage)* 全部使用plasmo/storage库
- *(content)* 拆分index.tsx
- *(clear)* 去掉调试代码，重构逻辑
- *(clear)* 去掉调试代码，重构逻辑
- *(storage | ui)* 重构存储逻辑 | 优化样式
- *(option)* 自定义词库迁移
- *(option)* 全局配置重构
- *(immer)* 使用immer重构代码逻辑
- *(option)* 重构indexed逻辑
- *(storage)* 使用chrome storage替换indeedb
- *(settings)* 拆分设置hooks以及type
- Ts编译报错
- Git排除
- Remove unused engine assets
