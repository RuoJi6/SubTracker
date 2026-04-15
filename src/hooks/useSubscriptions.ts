'use client';

import { useState, useCallback } from 'react';
import { message } from 'antd';

interface Subscription {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  amount: number;
  currency: string;
  cycle: string;
  customCycleDays?: number | null;
  startDate: string;
  nextRenewalDate: string;
  url?: string | null;
  category?: string | null;
  isActive: boolean;
  exchangeRateAtPurchase?: number | null;
  notes?: string | null;
  notificationConfigs: Array<{
    id: string;
    type: string;
    enabled: boolean;
    daysBefore: string;
    notifyTime: string;
  }>;
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptions = useCallback(async (params?: { active?: boolean; category?: string }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.active !== undefined) searchParams.set('active', String(params.active));
      if (params?.category) searchParams.set('category', params.category);

      const res = await fetch(`/api/subscriptions?${searchParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data);
      } else {
        message.error(data.error || 'Failed to fetch subscriptions');
      }
    } catch {
      message.error('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubscription = useCallback(async (body: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success('订阅创建成功');
        return data.data;
      } else {
        message.error(data.error || 'Failed');
        return null;
      }
    } catch {
      message.error('Network error');
      return null;
    }
  }, []);

  const updateSubscription = useCallback(async (id: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        message.success('订阅更新成功');
        return data.data;
      } else {
        message.error(data.error || 'Failed');
        return null;
      }
    } catch {
      message.error('Network error');
      return null;
    }
  }, []);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('订阅已删除');
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        return true;
      } else {
        message.error(data.error || 'Failed');
        return false;
      }
    } catch {
      message.error('Network error');
      return false;
    }
  }, []);

  return {
    subscriptions,
    loading,
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
  };
}
