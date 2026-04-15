'use client';

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol } from '@/lib/currency';

const { Text } = Typography;

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  nextRenewalDate: string;
  isActive: boolean;
  exchangeRateAtPurchase?: number | null;
}

interface Settings {
  displayCurrency: string;
}

export default function StatsCards() {
  const { t } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>({ displayCurrency: 'CNY' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions?active=true').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([subsData, settingsData]) => {
      if (subsData.success) setSubscriptions(subsData.data);
      if (settingsData.success) setSettings(settingsData.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />;

  const displayCurrency = settings.displayCurrency || 'CNY';
  const symbol = getCurrencySymbol(displayCurrency);

  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    let monthlyAmount = sub.amount;
    switch (sub.cycle) {
      case 'WEEKLY': monthlyAmount = sub.amount * 4.33; break;
      case 'QUARTERLY': monthlyAmount = sub.amount / 3; break;
      case 'YEARLY': monthlyAmount = sub.amount / 12; break;
    }
    if (sub.currency !== displayCurrency && sub.exchangeRateAtPurchase) {
      monthlyAmount *= sub.exchangeRateAtPurchase;
    }
    return sum + monthlyAmount;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;
  const activeCount = subscriptions.length;

  const upcoming = subscriptions
    .filter((s) => dayjs(s.nextRenewalDate).diff(dayjs(), 'day') <= 7)
    .sort((a, b) => dayjs(a.nextRenewalDate).diff(dayjs(b.nextRenewalDate)));

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.totalMonthly')}
              value={monthlyTotal}
              precision={2}
              prefix={<><DollarOutlined /> {symbol}</>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.totalYearly')}
              value={yearlyTotal}
              precision={2}
              prefix={<><RiseOutlined /> {symbol}</>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.activeCount')}
              value={activeCount}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.upcomingRenewals')}
              value={upcoming.length}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: upcoming.length > 0 ? '#faad14' : '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {upcoming.length > 0 && (
        <Card title={t('dashboard.upcomingRenewals')} style={{ marginTop: 16 }}>
          {upcoming.map((sub) => {
            const days = dayjs(sub.nextRenewalDate).diff(dayjs(), 'day');
            return (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <Text strong>{sub.name}</Text>
                  <br />
                  <Text type="secondary">
                    {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)} · {dayjs(sub.nextRenewalDate).format('YYYY-MM-DD')}
                  </Text>
                </div>
                <Tag color={days <= 0 ? 'red' : days <= 3 ? 'orange' : 'blue'}>
                  {days <= 0 ? (t('common.appName') === 'SubTracker' ? '已到期' : 'Expired') : `${days}d`}
                </Tag>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
