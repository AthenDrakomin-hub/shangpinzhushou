# Tasks

- [x] Task 1: Remove Redundant Menu Item and Fix Checkout Padding
  - [x] SubTask 1.1: In `src/pages/SettingsPage.tsx`, remove the entire `div` corresponding to the "深色模式" (Dark Mode) settings item.
  - [x] SubTask 1.2: In `src/pages/H5ProductPage.tsx`, change the bottom padding of the main wrapper from `pb-32` to `pb-48` or add a specific `min-height` invisible block to push the content up.
  - [x] SubTask 1.3: Apply similar padding fixes to `src/pages/ProductCheckoutPage.tsx`.

- [x] Task 2: Setup Frontend i18n Infrastructure
  - [x] SubTask 2.1: Install `i18next`, `react-i18next`, and `i18next-browser-languagedetector` using `npm install`.
  - [x] SubTask 2.2: Create `src/i18n/index.ts` to configure and initialize `i18next`.
  - [x] SubTask 2.3: Create basic translation files `src/i18n/locales/zh.json` and `src/i18n/locales/en.json` covering key phrases in the Settings and Checkout pages (e.g., "Settings", "Language", "Pay Now", "Original Price", "Quantity").
  - [x] SubTask 2.4: Import `src/i18n/index.ts` in `src/main.tsx` to load it globally.

- [x] Task 3: Implement Language Switcher in Settings Page
  - [x] SubTask 3.1: In `src/pages/SettingsPage.tsx`, modify the "语言设置 (待开发)" item to open a language selection modal or use a dropdown.
  - [x] SubTask 3.2: Allow the user to select between "简体中文" and "English". When changed, call `i18n.changeLanguage(lang)` and update the UI.

- [x] Task 4: Apply i18n to Checkout Pages (H5 and PC)
  - [x] SubTask 4.1: Use the `useTranslation()` hook in `src/pages/H5ProductPage.tsx` and replace hardcoded Chinese text with `t('key')`.
  - [x] SubTask 4.2: Apply the same to `src/pages/ProductCheckoutPage.tsx`.

- [x] Task 5: Pass Language Parameter to Poster Generation API (Backend Prep)
  - [x] SubTask 5.1: In `src/pages/ProductsPage.tsx` (or where the poster is requested), append `&lang=${i18n.language}` to the `/api/products/${product.id}/poster` endpoint.
  - [x] SubTask 5.2: In `server.ts` (the poster endpoint), extract `req.query.lang` and pass it to `generatePoster`. This sets up the backend for future poster localization without requiring full backend i18n implementation immediately.