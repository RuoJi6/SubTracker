'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { currencies } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SubscriptionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  initialValues?: Record<string, unknown> | null;
}

const cycleOptions = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'CUSTOM'];
const categoryOptions = ['development', 'design', 'productivity', 'entertainment', 'cloud', 'communication', 'education', 'other'];
const paymentMethodOptions = ['alipay', 'wechat', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer', 'crypto'];

function calcNextRenewal(startDate: string, cycle: string, customDays?: number): string {
  const d = dayjs(startDate);
  switch (cycle) {
    case 'WEEKLY': return d.add(1, 'week').format('YYYY-MM-DD');
    case 'MONTHLY': return d.add(1, 'month').format('YYYY-MM-DD');
    case 'QUARTERLY': return d.add(3, 'month').format('YYYY-MM-DD');
    case 'YEARLY': return d.add(1, 'year').format('YYYY-MM-DD');
    case 'ONE_TIME': return d.format('YYYY-MM-DD');
    case 'CUSTOM': return d.add(customDays || 30, 'day').format('YYYY-MM-DD');
    default: return d.add(1, 'month').format('YYYY-MM-DD');
  }
}

const defaultForm = {
  name: '',
  amount: '',
  currency: 'USD',
  cycle: 'MONTHLY',
  customCycleDays: '30',
  startDate: dayjs().format('YYYY-MM-DD'),
  nextRenewalDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
  category: '',
  paymentMethod: '',
  url: '',
  description: '',
  notes: '',
  isActive: true,
  notifyEnabled: true,
  notifyDaysBefore: [1] as number[],
  notifyTime: '09:00',
};

export default function SubscriptionForm({ open, onClose, onSubmit, initialValues }: SubscriptionFormProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [customMethods, setCustomMethods] = useState<Array<{ id: string; name: string }>>([]);

  const updateField = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateNextRenewal = (startDate?: string, cycle?: string, customDays?: string) => {
    const s = startDate ?? form.startDate;
    const c = cycle ?? form.cycle;
    const d = parseInt(customDays ?? form.customCycleDays) || 30;
    setForm(prev => ({ ...prev, nextRenewalDate: calcNextRenewal(s, c, d) }));
  };

  useEffect(() => {
    if (open) {
      fetch('/api/payment-methods')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setCustomMethods(data.data);
        });
    }
  }, [open]);

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        name: (initialValues.name as string) || '',
        amount: String(initialValues.amount || ''),
        currency: (initialValues.currency as string) || 'USD',
        cycle: (initialValues.cycle as string) || 'MONTHLY',
        customCycleDays: String(initialValues.customCycleDays || '30'),
        startDate: initialValues.startDate ? dayjs(initialValues.startDate as string).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        nextRenewalDate: initialValues.nextRenewalDate ? dayjs(initialValues.nextRenewalDate as string).format('YYYY-MM-DD') : dayjs().add(1, 'month').format('YYYY-MM-DD'),
        category: (initialValues.category as string) || '',
        paymentMethod: (initialValues.paymentMethod as string) || '',
        url: (initialValues.url as string) || '',
        description: (initialValues.description as string) || '',
        notes: (initialValues.notes as string) || '',
        isActive: initialValues.isActive !== false,
        notifyEnabled: true,
        notifyDaysBefore: [1],
        notifyTime: '09:00',
      });
    } else if (open) {
      setForm({ ...defaultForm, startDate: dayjs().format('YYYY-MM-DD'), nextRenewalDate: dayjs().add(1, 'month').format('YYYY-MM-DD') });
    }
  }, [open, initialValues]);

  const handleCycleChange = (newCycle: string) => {
    updateField('cycle', newCycle);
    const nr = calcNextRenewal(form.startDate, newCycle, parseInt(form.customCycleDays) || 30);
    setForm(prev => ({ ...prev, cycle: newCycle, nextRenewalDate: nr }));
  };

  const handleStartDateChange = (date: string) => {
    updateField('startDate', date);
    updateNextRenewal(date);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        amount: parseFloat(form.amount),
        currency: form.currency,
        cycle: form.cycle,
        customCycleDays: form.cycle === 'CUSTOM' ? parseInt(form.customCycleDays) : null,
        startDate: dayjs(form.startDate).toISOString(),
        nextRenewalDate: dayjs(form.nextRenewalDate).toISOString(),
        category: form.category || null,
        paymentMethod: form.paymentMethod || null,
        url: form.url || null,
        description: form.description || null,
        notes: form.notes || null,
        isActive: form.isActive,
        notifications: form.notifyEnabled
          ? [
              { type: 'EMAIL', enabled: true, daysBefore: form.notifyDaysBefore, notifyTime: form.notifyTime },
              { type: 'DINGTALK', enabled: true, daysBefore: form.notifyDaysBefore, notifyTime: form.notifyTime },
            ]
          : [],
      };
      await onSubmit(payload);
      onClose();
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  const toggleDaysBefore = (day: number) => {
    setForm(prev => {
      const current = prev.notifyDaysBefore;
      return {
        ...prev,
        notifyDaysBefore: current.includes(day) ? current.filter(d => d !== day) : [...current, day],
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValues ? t('subscription.editTitle') : t('subscription.addNew')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t('subscription.name')} *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. GitHub Copilot"
              required
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('subscription.amount')} *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('subscription.currency')}</Label>
              <Select value={form.currency} onValueChange={(v) => updateField('currency', v ?? 'USD')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.nameZh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cycle */}
          <div className="space-y-1.5">
            <Label>{t('subscription.cycle')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {cycleOptions.map((c) => (
                <Badge
                  key={c}
                  variant={form.cycle === c ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all px-3 py-1.5 text-xs',
                    form.cycle === c && 'bg-primary text-primary-foreground',
                  )}
                  onClick={() => handleCycleChange(c)}
                >
                  {t(`subscription.cycles.${c}`)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {form.cycle === 'CUSTOM' && (
            <div className="space-y-1.5">
              <Label>{t('subscription.customDays')}</Label>
              <Input
                type="number"
                min="1"
                max="3650"
                value={form.customCycleDays}
                onChange={(e) => {
                  updateField('customCycleDays', e.target.value);
                  updateNextRenewal(undefined, undefined, e.target.value);
                }}
                className="w-40"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('subscription.startDate')}</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            {form.cycle !== 'ONE_TIME' && (
              <div className="space-y-1.5">
                <Label>{t('subscription.nextRenewal')}</Label>
                <Input
                  type="date"
                  value={form.nextRenewalDate}
                  onChange={(e) => updateField('nextRenewalDate', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{t('subscription.category')}</Label>
            <Select value={form.category || '_none'} onValueChange={(v) => updateField('category', (v ?? '') === '_none' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">-</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{t(`subscription.categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>{t('subscription.paymentMethod')}</Label>
            <Select value={form.paymentMethod || '_none'} onValueChange={(v) => updateField('paymentMethod', (v ?? '') === '_none' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">-</SelectItem>
                {paymentMethodOptions.map((p) => (
                  <SelectItem key={p} value={p}>{t(`subscription.paymentMethods.${p}`)}</SelectItem>
                ))}
                {customMethods.map((m) => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label>{t('subscription.url')}</Label>
            <Input
              value={form.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t('subscription.description')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('subscription.notes')}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => updateField('isActive', v)}
            />
            <Label>{t('subscription.active')}</Label>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.notifyEnabled}
                onCheckedChange={(v) => updateField('notifyEnabled', v)}
              />
              <Label>{t('notification.title')}</Label>
            </div>

            {form.notifyEnabled && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('notification.daysBefore')}</Label>
                  <div className="flex items-center gap-4">
                    {[
                      { label: t('notification.today'), value: 0 },
                      { label: t('notification.oneDayBefore'), value: 1 },
                      { label: t('notification.twoDaysBefore'), value: 2 },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.notifyDaysBefore.includes(opt.value)}
                          onCheckedChange={() => toggleDaysBefore(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('notification.notifyTime')}</Label>
                  <Input
                    type="time"
                    value={form.notifyTime}
                    onChange={(e) => updateField('notifyTime', e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-primary">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
