'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Input, Select, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useI18n } from '@/hooks/useI18n';
import SubscriptionList from '@/components/subscription/SubscriptionList';
import SubscriptionForm from '@/components/subscription/SubscriptionForm';

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const { subscriptions, loading, fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | undefined>();

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteSubscription(id);
    if (ok) fetchSubscriptions();
  }, [deleteSubscription, fetchSubscriptions]);

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    if (editingId) {
      await updateSubscription(editingId, values);
    } else {
      await createSubscription(values);
    }
    fetchSubscriptions();
  }, [editingId, updateSubscription, createSubscription, fetchSubscriptions]);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
  }, []);

  const editingData = editingId
    ? subscriptions.find((s) => s.id === editingId)
    : null;

  const initialValues = editingData
    ? {
        ...editingData,
        notifyDaysBefore: editingData.notificationConfigs?.[0]
          ? JSON.parse(editingData.notificationConfigs[0].daysBefore)
          : [1],
        notifyTime: editingData.notificationConfigs?.[0]?.notifyTime || '09:00',
        notifyEnabled: editingData.notificationConfigs?.some((n) => n.enabled) ?? false,
      }
    : null;

  const filtered = subscriptions.filter((s) => {
    const matchSearch = !searchText || s.name.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = !filterCategory || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const categoryOptions = ['development', 'design', 'productivity', 'entertainment', 'cloud', 'communication', 'education', 'other'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('common.search')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder={t('subscription.category')}
            value={filterCategory}
            onChange={setFilterCategory}
            allowClear
            style={{ width: 150 }}
            options={categoryOptions.map((c) => ({
              value: c,
              label: t(`subscription.categories.${c}`),
            }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          {t('subscription.addNew')}
        </Button>
      </div>

      <SubscriptionList
        subscriptions={filtered}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <SubscriptionForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleSubmit}
        initialValues={initialValues}
      />
    </div>
  );
}
