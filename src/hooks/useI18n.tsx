'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import zhMessages from '@/i18n/zh.json';
import enMessages from '@/i18n/en.json';

type Locale = 'zh' | 'en';
type Messages = typeof zhMessages;

interface I18nContextType {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const messagesMap: Record<Locale, Messages> = { zh: zhMessages, en: enMessages };

const I18nContext = createContext<I18nContextType | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  return (localStorage.getItem('locale') as Locale) || 'zh';
}

function subscribeToLocale(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function I18nProvider({ children, initialLocale = 'zh' }: { children: React.ReactNode; initialLocale?: Locale }) {
  const storedLocale = useSyncExternalStore(subscribeToLocale, getStoredLocale, () => initialLocale);
  const [locale, setLocaleState] = useState<Locale>(storedLocale);
  const messages = messagesMap[locale];

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let current: unknown = messages;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  }, [messages]);

  return (
    <I18nContext.Provider value={{ locale, messages, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
