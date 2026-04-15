'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  SettingOutlined,
  LogoutOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

const { Sider, Header, Content } = Layout;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/subscriptions', icon: <UnorderedListOutlined />, label: t('nav.subscriptions') },
    { key: '/calendar', icon: <CalendarOutlined />, label: t('nav.calendar') },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const languageMenu = {
    items: [
      { key: 'zh', label: '中文' },
      { key: 'en', label: 'English' },
    ],
    onClick: ({ key }: { key: string }) => setLocale(key as 'zh' | 'en'),
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 700,
          fontSize: collapsed ? 16 : 20,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {collapsed ? 'ST' : 'SubTracker'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname === '/' ? '/' : `/${pathname.split('/')[1]}`]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Dropdown menu={languageMenu}>
              <Button type="text" icon={<GlobalOutlined />}>
                {locale === 'zh' ? '中文' : 'EN'}
              </Button>
            </Dropdown>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              {t('auth.logout')}
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
