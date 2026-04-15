'use client';

import React from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/hooks/useI18n';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider initialLocale="zh">
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </I18nProvider>
  );
}
