// Loads the strings file and fills in text. All visible text comes from
// /src/strings/en.json so the site can be translated later (D-011).

let strings = {};

export async function loadStrings(lang = 'en') {
  const res = await fetch(`/src/strings/${lang}.json`);
  strings = await res.json();
  document.documentElement.lang = lang;
  applyStrings(document);
}

// t('next.in', { min: 5 }) -> "in 5 min"
export function t(key, vars = {}) {
  const text = strings[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}

// Elements with data-i18n="key" get their text set; data-i18n-placeholder,
// data-i18n-aria-label and data-i18n-html work the same way for those properties.
export function applyStrings(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
  if (root === document && document.body.dataset.i18nTitle) {
    document.title = `${t(document.body.dataset.i18nTitle)} · ${t('app.name')}`;
  }
}
