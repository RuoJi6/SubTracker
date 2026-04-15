'use client';

import React from 'react';
import { Card, Tag, Typography, Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, LinkOutlined, ClockCircleOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleLabel } from '@/lib/currency';

const PRESET_PAYMENT_METHODS = ['alipay', 'wechat', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer', 'crypto'];

const { Text, Title } = Typography;

interface SubscriptionCardProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    cycle: string;
    nextRenewalDate: string;
    isActive: boolean;
    category?: string | null;
    paymentMethod?: string | null;
    url?: string | null;
    description?: string | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionCard({ subscription, onEdit, onDelete }: SubscriptionCardProps) {
  const { t, locale } = useI18n();
  const daysUntil = dayjs(subscription.nextRenewalDate).diff(dayjs(), 'day');

  const urgencyColor = daysUntil <= 0 ? '#ff4d4f' : daysUntil <= 3 ? '#faad14' : daysUntil <= 7 ? '#1890ff' : '#52c41a';

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        opacity: subscription.isActive ? 1 : 0.6,
        borderLeft: `4px solid ${urgencyColor}`,
      }}
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEdit(subscription.id)} />,
        <Popconfirm
          key="delete"
          title={t('subscription.deleteConfirm')}
          onConfirm={() => onDelete(subscription.id)}
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
        subscription.url ? (
          <Button key="link" type="text" icon={<LinkOutlined />} onClick={() => window.open(subscription.url!, '_blank')} />
        ) : (
          <Button key="link" type="text" icon={<LinkOutlined />} disabled />
        ),
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>{subscription.name}</Title>
          {subscription.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>{subscription.description}</Text>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <Title level={4} style={{ margin: 0, color: urgencyColor }}>
            {getCurrencySymbol(subscription.currency)}{subscription.amount.toFixed(2)}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getCycleLabel(subscription.cycle, locale)}
          </Text>
        </div>
      </div>

      <Space style={{ marginTop: 12 }} wrap>
        <Tag icon={<ClockCircleOutlined />} color={urgencyColor}>
          {daysUntil <= 0
            ? (locale === 'zh' ? '已到期' : 'Expired')
            : daysUntil === 1
              ? (locale === 'zh' ? '明天续费' : 'Tomorrow')
              : (locale === 'zh' ? `${daysUntil}天后续费` : `${daysUntil} days left`)}
        </Tag>
        <Tag>{dayjs(subscription.nextRenewalDate).format('YYYY-MM-DD')}</Tag>
        {subscription.category && (
          <Tag color="blue">{t(`subscription.categories.${subscription.category}`)}</Tag>
        )}
        {subscription.paymentMethod && (
          <Tag icon={<WalletOutlined />} color="purple">
            {PRESET_PAYMENT_METHODS.includes(subscription.paymentMethod)
              ? t(`subscription.paymentMethods.${subscription.paymentMethod}`)
              : subscription.paymentMethod}
          </Tag>
        )}
        {!subscription.isActive && <Tag color="default">{t('common.inactive')}</Tag>}
      </Space>
    </Card>
  );
}
