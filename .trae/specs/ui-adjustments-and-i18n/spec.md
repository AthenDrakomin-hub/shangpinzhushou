# UI Adjustments and i18n Spec

## Why
1. 用户在正常 100% 大小的 H5 商品页面中发现底部的支付选项（如微信支付）被悬浮的“立即支付”按钮遮挡，导致无法正常点击。
2. 设置页面中存在冗余的“深色模式”菜单项（顶部导航栏已有该功能切换按钮）。
3. 用户希望实现全局多语言（i18n）切换功能（包括管理后台、H5 商品页、甚至是分享出去的海报等），并在设置页面开放“语言设置”菜单。

## What Changes
- **商品页底部遮挡修复**：进一步增加 `src/pages/H5ProductPage.tsx` 和 `src/pages/ProductCheckoutPage.tsx` 主内容区的 `padding-bottom`，确保在不同屏幕高度下，支付选项列表都能完全滚动到“立即支付”悬浮按钮上方。
- **移除冗余深色模式菜单**：在 `src/pages/SettingsPage.tsx` 中删除“应用设置”模块下的“深色模式”列表项。
- **国际化 (i18n) 架构规划与实施**：
  - 引入 `i18next` 和 `react-i18next` 库作为多语言核心。
  - 创建 `src/i18n/index.ts` 配置文件，设置默认语言（如 `zh-CN`），并配置持久化（存入 localStorage）。
  - 创建中英文语言包文件（`zh.json`, `en.json`），先覆盖设置页面和商品页面核心字段的翻译。
  - 在 `src/pages/SettingsPage.tsx` 中，将“语言设置（待开发）”更新为真实的语言切换组件（如下拉菜单或模态框），允许用户在“简体中文”和“English”之间切换，并触发生效。
  - **全局兼容性与海报多语言**：海报服务运行在 Node.js 后端，需要根据传入的 `lang` 参数读取对应的翻译文件，从而实现生成出来的海报也是多语言的。目前先在前端实现 i18n 框架和商品页/设置页的切换演示。

## Impact
- Affected specs: H5 支付页面布局、个人设置中心、前端全局文本展示。
- Affected code: `src/pages/H5ProductPage.tsx`, `src/pages/ProductCheckoutPage.tsx`, `src/pages/SettingsPage.tsx`, `package.json` (新增依赖), `src/i18n/*` (新增目录)。

## ADDED Requirements
### Requirement: 全局多语言支持 (i18n)
系统 SHALL 支持多语言切换，并在本地缓存用户偏好。
#### Scenario: 切换为英文
- **WHEN** 用户在设置中心点击“语言设置”并选择“English”
- **THEN** 系统立即将当前界面的文本切换为英文，并将 `lang=en` 存入 localStorage。

## MODIFIED Requirements
### Requirement: 商品页底部列表完整显示
H5 商品页的支付方式列表 SHALL 能够完全滚动到视口内，不被底部固定的支付按钮遮挡。

## REMOVED Requirements
### Requirement: 设置页的深色模式入口
**Reason**: 顶部导航栏已存在快捷切换按钮，无需在页面深处保留重复入口。
**Migration**: 直接从 `SettingsPage.tsx` 的 DOM 中删除该元素。