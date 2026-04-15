'use client';

import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import SubscriptionCard from './SubscriptionCard';
import { useI18n } from '@/hooks/useI18n';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  nextRenewalDate: string;
  isActive: boolean;
  category?: string | null;
  url?: string | null;
  description?: string | null;
}

interface SubscriptionListProps {
  subscriptions: Subscription[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionList({ subscriptions, loading, onEdit, onDelete }: SubscriptionListProps) {
  const { t } = useI18n();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  if (subscriptions.length === 0) {
    return <Empty description={t('dashboard.noSubscriptions')} />;
  }

  return (
    <Row gutter={[16, 16]}>
      {subscriptions.map((sub) => (
        <Col key={sub.id} xs={24} sm={12} lg={8} xl={6}>
          <SubscriptionCard subscription={sub} onEdit={onEdit} onDelete={onDelete} />
        </Col>
      ))}
    </Row>
  );
}
