'use client';

import React from 'react';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { I18nProvider } from '@/hooks/useI18n';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <I18nProvider initialLocale="zh">
        <App>{children}</App>
      </I18nProvider>
    </ConfigProvider>
  );
}
