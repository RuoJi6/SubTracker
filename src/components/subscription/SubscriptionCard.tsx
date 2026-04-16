'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Pencil, Trash2, ExternalLink, Clock, Wallet, ShoppingBag, RotateCw } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleLabel } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const PRESET_PAYMENT_METHODS = ['alipay', 'wechat', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer', 'crypto'];

interface SubscriptionCardProps {
  subscription: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    cycle: string;
    customCycleDays?: number | null;
    cycleMultiplier?: number | null;
    endDate?: string | null;
    autoRenew?: boolean;
    startDate: string;
    nextRenewalDate: string;
    isActive: boolean;
    category?: string | null;
    paymentMethod?: string | null;
    url?: string | null;
    description?: string | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRenew?: () => void;
}

const urgencyClasses = {
  red: 'border-l-red-500 text-red-500',
  orange: 'border-l-orange-400 text-orange-400',
  blue: 'border-l-blue-500 text-blue-500',
  green: 'border-l-green-500 text-green-500',
  purple: 'border-l-purple-600 text-purple-600',
} as const;

function getUrgencyKey(cycle: string, daysUntil: number) {
  if (cycle === 'ONE_TIME') return 'purple';
  if (daysUntil <= 0) return 'red';
  if (daysUntil <= 3) return 'orange';
  if (daysUntil <= 7) return 'blue';
  return 'green';
}

const progressColorMap: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-400',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
};

export default function SubscriptionCard({ subscription, onEdit, onDelete, onRenew }: SubscriptionCardProps) {
  const { t, locale } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const now = dayjs();
  const nextRenewal = dayjs(subscription.nextRenewalDate);
  const daysUntil = nextRenewal.diff(now, 'day');

  const getCycleDaysLocal = () => {
    const m = subscription.cycleMultiplier || 1;
    switch (subscription.cycle) {
      case 'WEEKLY': return 7 * m;
      case 'MONTHLY': return 30 * m;
      case 'QUARTERLY': return 90 * m;
      case 'YEARLY': return 365 * m;
      case 'CUSTOM': return subscription.customCycleDays || 30;
      default: return 30;
    }
  };
  const cycleDays = getCycleDaysLocal();
  const elapsed = Math.max(0, cycleDays - Math.max(daysUntil, 0));
  const progressPercent = cycleDays > 0 ? Math.min(100, Math.round((elapsed / cycleDays) * 100)) : 0;

  const isOneTime = subscription.cycle === 'ONE_TIME';
  const urgencyKey = getUrgencyKey(subscription.cycle, daysUntil);
  const progressKey = daysUntil <= 0 ? 'red' : daysUntil <= 3 ? 'orange' : daysUntil <= 7 ? 'blue' : 'green';

  const handleRenew = async () => {
    setRenewing(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}/renew`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(locale === 'zh' ? '续费成功' : 'Renewed successfully');
        onRenew?.();
      } else {
        toast.error(data.error || 'Error');
      }
    } catch {
      toast.error(locale === 'zh' ? '续费失败' : 'Renew failed');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <Card
      className={cn(
        'glass-card rounded-xl border-l-4 gap-2 transition-shadow hover:shadow-lg',
        urgencyClasses[urgencyKey].split(' ')[0],
        !subscription.isActive && 'opacity-60',
      )}
    >
      <CardContent className="pt-3 pb-0">
        {/* Header: name + amount */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{subscription.name}</h3>
            {subscription.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subscription.description}</p>
            )}
          </div>
          <div className="ml-3 text-right shrink-0">
            <p className={cn('text-lg font-bold', urgencyClasses[urgencyKey].split(' ').slice(1).join(' '))}>
              {getCurrencySymbol(subscription.currency)}{subscription.amount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getCycleLabel(subscription.cycle, locale, subscription.cycleMultiplier || 1)}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {isOneTime ? (
            <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <ShoppingBag className="size-3" />
              {locale === 'zh' ? '买断' : 'One-time'}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={cn(
                'gap-1',
                urgencyKey === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                urgencyKey === 'orange' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                urgencyKey === 'blue' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                urgencyKey === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              )}
            >
              <Clock className="size-3" />
              {daysUntil <= 0
                ? (locale === 'zh' ? '已到期' : 'Expired')
                : daysUntil === 1
                  ? (locale === 'zh' ? '明天续费' : 'Tomorrow')
                  : (locale === 'zh' ? `${daysUntil}天后续费` : `${daysUntil} days left`)}
            </Badge>
          )}
          {isOneTime ? (
            <Badge variant="outline">
              {locale === 'zh' ? '购买于' : 'Purchased'} {dayjs(subscription.startDate).format('YYYY-MM-DD')}
            </Badge>
          ) : subscription.cycle === 'CUSTOM' ? (
            <Badge variant="outline">
              {locale === 'zh' ? '到期' : 'Expires'} {dayjs(subscription.endDate || subscription.nextRenewalDate).format('YYYY-MM-DD')}
            </Badge>
          ) : (
            <Badge variant="outline">
              {dayjs(subscription.nextRenewalDate).format('YYYY-MM-DD')}
            </Badge>
          )}
          {subscription.category && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {t(`subscription.categories.${subscription.category}`)}
            </Badge>
          )}
          {subscription.paymentMethod && (
            <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Wallet className="size-3" />
              {PRESET_PAYMENT_METHODS.includes(subscription.paymentMethod)
                ? t(`subscription.paymentMethods.${subscription.paymentMethod}`)
                : subscription.paymentMethod}
            </Badge>
          )}
          {!isOneTime && (
            <Badge variant="secondary" className={cn(
              'gap-1 text-xs',
              subscription.autoRenew
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400'
            )}>
              {subscription.autoRenew
                ? (locale === 'zh' ? '自动订阅' : 'Auto')
                : (locale === 'zh' ? '手动付款' : 'Manual')}
            </Badge>
          )}
          {!subscription.isActive && (
            <Badge variant="outline" className="text-muted-foreground">{t('common.inactive')}</Badge>
          )}
        </div>

        {/* Progress bar (only for recurring) */}
        {!isOneTime && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="mt-3 block w-full cursor-default">
                <Progress value={progressPercent} className="gap-1">
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {elapsed}/{cycleDays}d
                  </span>
                  <ProgressTrack className="h-1.5">
                    <ProgressIndicator className={cn(progressColorMap[progressKey])} />
                  </ProgressTrack>
                </Progress>
              </TooltipTrigger>
              <TooltipContent>
                {locale === 'zh' ? `已过 ${elapsed}/${cycleDays} 天` : `${elapsed}/${cycleDays} days elapsed`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="justify-around border-t px-2 py-1.5">
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(subscription.id)}>
          <Pencil className="size-4" />
        </Button>

        {!isOneTime && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-blue-500 hover:text-blue-600"
                  disabled={renewing}
                  onClick={handleRenew}
                />
              }
            >
              <RotateCw className={cn('size-4', renewing && 'animate-spin')} />
            </TooltipTrigger>
            <TooltipContent>
              {locale === 'zh' ? '手动续费' : 'Renew'}
            </TooltipContent>
          </Tooltip>
        )}

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger render={
            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" />
          }>
            <Trash2 className="size-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('subscription.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {locale === 'zh' ? '此操作不可撤销。' : 'This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDelete(subscription.id);
                  setDeleteOpen(false);
                }}
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {subscription.url && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.open(subscription.url!, '_blank')}
          >
            <ExternalLink className="size-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
