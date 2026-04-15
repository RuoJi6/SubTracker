'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useI18n } from '@/hooks/useI18n';
import SubscriptionList from '@/components/subscription/SubscriptionList';
import SubscriptionForm from '@/components/subscription/SubscriptionForm';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function SubscriptionsPage() {
  const { t, locale } = useI18n();
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
    if (ok) {
      toast.success(locale === 'zh' ? '已删除' : 'Deleted');
      fetchSubscriptions();
    }
  }, [deleteSubscription, fetchSubscriptions, locale]);

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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <InputGroup className="w-[200px]">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t('common.search')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>

          <Select
            value={filterCategory ?? ''}
            onValueChange={(val) => setFilterCategory(val || undefined)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('subscription.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{locale === 'zh' ? '全部分类' : 'All categories'}</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`subscription.categories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
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
