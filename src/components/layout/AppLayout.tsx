'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  List,
  Calendar,
  Settings,
  LogOut,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navItems = [
  { key: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { key: '/subscriptions', icon: List, labelKey: 'nav.subscriptions' },
  { key: '/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { key: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 1024px)').matches;
    }
    return false;
  });
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  // Listen for screen size changes
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const activeKey = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          'glass-sidebar fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border/50 px-4">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-bold text-xl tracking-tight">
            {collapsed ? 'ST' : 'SubTracker'}
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 p-2 pt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1 transition-all duration-300', collapsed ? 'ml-16' : 'ml-56')}>
        {/* Header */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                {locale === 'zh' ? '中文' : 'EN'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('zh')}>中文</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
