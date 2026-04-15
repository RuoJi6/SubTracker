import zhMessages from './zh.json';
import enMessages from './en.json';

export type Locale = 'zh' | 'en';

const messages: Record<Locale, typeof zhMessages> = {
  zh: zhMessages,
  en: enMessages,
};

export function getMessages(locale: Locale) {
  return messages[locale] || messages.zh;
}

export function getDefaultLocale(): Locale {
  return (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as Locale) || 'zh';
}
