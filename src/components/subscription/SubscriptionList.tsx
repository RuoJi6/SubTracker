'use client';

import React from 'react';
import { PackageOpen, Loader2 } from 'lucide-react';
import SubscriptionCard from './SubscriptionCard';
import { useI18n } from '@/hooks/useI18n';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  customCycleDays?: number | null;
  startDate: string;
  nextRenewalDate: string;
  isActive: boolean;
  category?: string | null;
  paymentMethod?: string | null;
  url?: string | null;
  description?: string | null;
}

interface SubscriptionListProps {
  subscriptions: Subscription[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRenew?: () => void;
}

export default function SubscriptionList({ subscriptions, loading, onEdit, onDelete, onRenew }: SubscriptionListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <PackageOpen className="mb-3 size-12 opacity-40" />
        <p className="text-sm">{t('dashboard.noSubscriptions')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {subscriptions.map((sub) => (
        <SubscriptionCard key={sub.id} subscription={sub} onEdit={onEdit} onDelete={onDelete} onRenew={onRenew} />
      ))}
    </div>
  );
}
