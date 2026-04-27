'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts';
import dayjs from 'dayjs';
import {
  DollarSign, TrendingUp, ShoppingBag, AppWindow,
  Clock, AlertTriangle, ExternalLink, Loader2, History,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleLabel } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  cycleMultiplier?: number | null;
  customCycleDays?: number | null;
  endDate?: string | null;
  nextRenewalDate: string;
  startDate: string;
  isActive: boolean;
  autoRenew?: boolean;
  category?: string | null;
  paymentMethod?: string | null;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  exchangeRateAtPurchase?: number | null;
}

interface Settings {
  displayCurrency: string;
}

const COLORS = [
  '#667eea', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
];

function convertAmount(
  amount: number, currency: string, displayCurrency: string, rate?: number | null
): number {
  if (currency === displayCurrency) return amount;
  if (rate) return amount * rate;
  return amount;
}

function StatCard({
  icon, title, value, onClick, accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick?: () => void;
  accent?: 'amber' | 'green';
}) {
  return (
    <Card
      className={cn(
        'glass-card transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={cn(
              'text-xl font-bold tracking-tight mt-0.5',
              accent === 'amber' && 'text-amber-500',
              accent === 'green' && 'text-green-500',
            )}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsCards() {
  const { t, locale } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>({ displayCurrency: 'CNY' });
  const [loading, setLoading] = useState(true);
  const [breakdownType, setBreakdownType] = useState<'monthly' | 'yearly' | 'onetime' | null>(null);
  const [detailSub, setDetailSub] = useState<Subscription | null>(null);
  const [showActiveList, setShowActiveList] = useState(false);
  const [showTotalSpent, setShowTotalSpent] = useState(false);
  const [barOffset, setBarOffset] = useState(0);
  const [selectedBarMonth, setSelectedBarMonth] = useState<BarMonth | null>(null);

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

  const displayCurrency = settings.displayCurrency || 'CNY';
  const symbol = getCurrencySymbol(displayCurrency);

  const recurring = useMemo(() => subscriptions.filter(s => s.cycle !== 'ONE_TIME'), [subscriptions]);
  const oneTime = useMemo(() => subscriptions.filter(s => s.cycle === 'ONE_TIME'), [subscriptions]);

  const breakdownData = useMemo(() => recurring.map((sub) => {
    let monthlyAmount = sub.amount;
    const mult = sub.cycleMultiplier || 1;
    switch (sub.cycle) {
      case 'WEEKLY': monthlyAmount = sub.amount * (4.33 / mult); break;
      case 'MONTHLY': monthlyAmount = sub.amount / mult; break;
      case 'QUARTERLY': monthlyAmount = sub.amount / (3 * mult); break;
      case 'YEARLY': monthlyAmount = sub.amount / (12 * mult); break;
    }
    if (sub.currency !== displayCurrency && sub.exchangeRateAtPurchase) {
      monthlyAmount *= sub.exchangeRateAtPurchase;
    }
    return {
      key: sub.id, name: sub.name, originalAmount: sub.amount,
      originalCurrency: sub.currency, cycle: sub.cycle,
      cycleMultiplier: mult,
      monthly: monthlyAmount, yearly: monthlyAmount * 12,
    };
  }).sort((a, b) => b.monthly - a.monthly), [recurring, displayCurrency]);

  const oneTimeData = useMemo(() => oneTime.map((sub) => {
    const converted = convertAmount(sub.amount, sub.currency, displayCurrency, sub.exchangeRateAtPurchase);
    return {
      key: sub.id, name: sub.name, originalAmount: sub.amount,
      originalCurrency: sub.currency, cycle: sub.cycle, converted, date: sub.startDate,
    };
  }).sort((a, b) => b.converted - a.converted), [oneTime, displayCurrency]);

  const monthlyTotal = breakdownData.reduce((sum, d) => sum + d.monthly, 0);
  const yearlyTotal = monthlyTotal * 12;
  const oneTimeTotal = oneTimeData.reduce((sum, d) => sum + d.converted, 0);

  // Total historical spent: sum of all payments made from startDate to today
  const totalSpentData = useMemo(() => {
    const now = dayjs();
    const items: {
      key: string; name: string; originalAmount: number; originalCurrency: string;
      cycle: string; cycleMultiplier: number; payments: number; totalSpent: number; startDate: string;
    }[] = [];

    for (const sub of subscriptions) {
      let amount = sub.amount;
      if (sub.currency !== displayCurrency && sub.exchangeRateAtPurchase) {
        amount *= sub.exchangeRateAtPurchase;
      }

      if (sub.cycle === 'ONE_TIME') {
        items.push({
          key: sub.id, name: sub.name, originalAmount: sub.amount,
          originalCurrency: sub.currency, cycle: sub.cycle, cycleMultiplier: 1,
          payments: 1, totalSpent: amount, startDate: sub.startDate,
        });
        continue;
      }

      const start = dayjs(sub.startDate);
      const daysSinceStart = now.diff(start, 'day');
      if (daysSinceStart < 0) continue;

      let cycleDays: number;
      const m = sub.cycleMultiplier || 1;
      switch (sub.cycle) {
        case 'WEEKLY': cycleDays = 7 * m; break;
        case 'MONTHLY': cycleDays = 30 * m; break;
        case 'QUARTERLY': cycleDays = 90 * m; break;
        case 'YEARLY': cycleDays = 365 * m; break;
        case 'CUSTOM': cycleDays = sub.customCycleDays || 30; break;
        default: cycleDays = 30;
      }

      const payments = Math.floor(daysSinceStart / cycleDays) + 1;
      items.push({
        key: sub.id, name: sub.name, originalAmount: sub.amount,
        originalCurrency: sub.currency, cycle: sub.cycle, cycleMultiplier: m,
        payments, totalSpent: amount * payments, startDate: sub.startDate,
      });
    }
    return items.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [subscriptions, displayCurrency]);

  const totalSpent = totalSpentData.reduce((sum, d) => sum + d.totalSpent, 0);

  const upcoming = recurring
    .filter((s) => {
      const days = dayjs(s.nextRenewalDate).diff(dayjs(), 'day');
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => dayjs(a.nextRenewalDate).diff(dayjs(b.nextRenewalDate)));

  const expired = recurring
    .filter((s) => dayjs(s.nextRenewalDate).isBefore(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.nextRenewalDate).diff(dayjs(b.nextRenewalDate)));

  const nonExpired = subscriptions.filter((s) =>
    s.cycle === 'ONE_TIME' || !dayjs(s.nextRenewalDate).isBefore(dayjs(), 'day')
  );
  const activeCount = nonExpired.length;

  const pieData = useMemo(() => breakdownData
    .filter(d => d.monthly > 0).slice(0, 10)
    .map(d => ({ name: d.name, value: Math.round(d.monthly * 100) / 100 }))
  , [breakdownData]);

  interface BarMonthItem {
    name: string; amount: number; originalAmount: number;
    originalCurrency: string; cycle: string; type: 'auto' | 'manual';
  }
  interface BarMonth {
    month: string; monthKey: string; amount: number; items: BarMonthItem[];
  }

  const barData = useMemo(() => {
    const now = dayjs();
    const months: BarMonth[] = [];
    for (let i = barOffset - 2; i < barOffset + 4; i++) {
      const monthStart = now.add(i, 'month').startOf('month');
      const monthEnd = monthStart.endOf('month');
      let total = 0;
      const items: BarMonthItem[] = [];
      for (const sub of recurring) {
        let converted = sub.amount;
        if (sub.currency !== displayCurrency && sub.exchangeRateAtPurchase) {
          converted *= sub.exchangeRateAtPurchase;
        }

        let subAmount = 0;
        if (sub.autoRenew) {
          const mult = sub.cycleMultiplier || 1;
          const start = dayjs(sub.startDate);
          // Months between startDate's month and this bar's month (could be negative for past)
          const monthsDiff =
            (monthStart.year() - start.year()) * 12 +
            (monthStart.month() - start.month());
          switch (sub.cycle) {
            case 'WEEKLY':
              // Weekly is shown as monthly amortized average (~4.33 weeks/month)
              subAmount = converted * (4.33 / mult);
              break;
            case 'MONTHLY':
              if (mult === 1) {
                subAmount = converted; // billed every month
              } else if (monthsDiff >= 0 && monthsDiff % mult === 0) {
                subAmount = converted; // billed in this exact month
              }
              break;
            case 'QUARTERLY': {
              const period = 3 * mult;
              if (monthsDiff >= 0 && monthsDiff % period === 0) {
                subAmount = converted;
              }
              break;
            }
            case 'YEARLY': {
              if (
                monthStart.month() === start.month() &&
                monthsDiff >= 0 &&
                (monthStart.year() - start.year()) % mult === 0
              ) {
                subAmount = converted;
              }
              break;
            }
            case 'CUSTOM': {
              const cycleDays = sub.customCycleDays || 30;
              // Amortize custom cycle to monthly
              subAmount = converted * (30 / cycleDays);
              break;
            }
            default:
              subAmount = converted;
          }
        } else {
          const renewal = dayjs(sub.nextRenewalDate);
          if (
            (renewal.isAfter(monthStart) || renewal.isSame(monthStart, 'day')) &&
            (renewal.isBefore(monthEnd) || renewal.isSame(monthEnd, 'day'))
          ) {
            subAmount = converted;
          }
        }

        if (subAmount > 0) {
          total += subAmount;
          items.push({
            name: sub.name,
            amount: Math.round(subAmount * 100) / 100,
            originalAmount: sub.amount,
            originalCurrency: sub.currency,
            cycle: sub.cycle,
            type: sub.autoRenew ? 'auto' : 'manual',
          });
        }
      }
      items.sort((a, b) => b.amount - a.amount);
      months.push({
        month: monthStart.format(locale === 'zh' ? 'M月' : 'MMM'),
        monthKey: monthStart.format('YYYY-MM'),
        amount: Math.round(total * 100) / 100,
        items,
      });
    }
    return months;
  }, [recurring, displayCurrency, locale, barOffset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<History className="h-5 w-5 text-emerald-500" />}
          title={t('dashboard.totalSpent')}
          value={`${symbol}${totalSpent.toFixed(2)}`}
          accent="green"
          onClick={() => setShowTotalSpent(true)}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          title={t('dashboard.totalMonthly')}
          value={`${symbol}${monthlyTotal.toFixed(2)}`}
          onClick={() => setBreakdownType('monthly')}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
          title={t('dashboard.totalYearly')}
          value={`${symbol}${yearlyTotal.toFixed(2)}`}
          onClick={() => setBreakdownType('yearly')}
        />
        {oneTime.length > 0 && (
          <StatCard
            icon={<ShoppingBag className="h-5 w-5 text-pink-500" />}
            title={t('dashboard.totalOneTime')}
            value={`${symbol}${oneTimeTotal.toFixed(2)}`}
            onClick={() => setBreakdownType('onetime')}
          />
        )}
        <StatCard
          icon={<AppWindow className="h-5 w-5 text-blue-500" />}
          title={t('dashboard.activeCount')}
          value={String(activeCount)}
          onClick={() => setShowActiveList(true)}
        />
        <StatCard
          icon={<Clock className={cn('h-5 w-5', upcoming.length > 0 ? 'text-amber-500' : 'text-green-500')} />}
          title={t('dashboard.upcomingRenewals')}
          value={String(upcoming.length)}
          accent={upcoming.length > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Expired Subscriptions */}
      {expired.length > 0 && (
        <Card className="glass-card border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t('dashboard.expiredSubscriptions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {expired.map((sub) => {
              const days = dayjs().diff(dayjs(sub.nextRenewalDate), 'day');
              return (
                <div
                  key={sub.id}
                  onClick={() => setDetailSub(sub)}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-destructive/5 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)} · {locale === 'zh' ? '到期' : 'Expired'}: {dayjs(sub.nextRenewalDate).format('YYYY-MM-DD')}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {locale === 'zh' ? `已过期 ${days} 天` : `${days}d overdue`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Renewals */}
      {upcoming.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('dashboard.upcomingRenewals')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {upcoming.map((sub) => {
              const days = dayjs(sub.nextRenewalDate).diff(dayjs(), 'day');
              return (
                <div
                  key={sub.id}
                  onClick={() => setDetailSub(sub)}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)} · {dayjs(sub.nextRenewalDate).format('YYYY-MM-DD')}
                    </p>
                  </div>
                  <Badge
                    variant={days <= 0 ? 'destructive' : 'outline'}
                    className={cn(
                      days > 0 && days <= 3 && 'bg-amber-100 text-amber-700 border-amber-200'
                    )}
                  >
                    {days <= 0
                      ? (locale === 'zh' ? '今天到期' : 'Due today')
                      : (locale === 'zh' ? `${days} 天` : `${days} days`)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {recurring.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('dashboard.expenseChart')}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBarOffset((o) => o - 3)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {barOffset !== 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setBarOffset(0)}>
                      {locale === 'zh' ? '当前' : 'Now'}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBarOffset((o) => o + 3)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barCategoryGap="20%" margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={50} />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 6 }}
                    formatter={(value) => [`${symbol}${Number(value).toFixed(2)}`, locale === 'zh' ? '预估花费' : 'Estimated']}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="url(#barGradient)"
                    activeBar={{ fill: 'url(#barGradientActive)' }}
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                    cursor="pointer"
                    onClick={(_data, index) => {
                      const month = barData[index];
                      if (month && month.items.length > 0) setSelectedBarMonth(month);
                    }}
                  >                    <LabelList
                      dataKey="amount"
                      position="top"
                      formatter={(v) => v != null ? `${symbol}${Number(v).toFixed(0)}` : ''}
                      style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{locale === 'zh' ? '订阅费用占比' : 'Expense Distribution'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={(props) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => `${symbol}${Number(value).toFixed(2)}`}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown Dialog */}
      <Dialog open={breakdownType !== null} onOpenChange={() => setBreakdownType(null)}>
        <DialogContent className="sm:max-w-2xl glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {breakdownType === 'monthly' ? t('dashboard.totalMonthly')
                : breakdownType === 'yearly' ? t('dashboard.totalYearly')
                  : t('dashboard.totalOneTime')}
            </DialogTitle>
          </DialogHeader>
          {breakdownType === 'onetime' ? (
            <div className="space-y-0">
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
                <span>{t('subscription.name')}</span>
                <span>{locale === 'zh' ? '原始金额' : 'Original'}</span>
                <span>{locale === 'zh' ? '购买日期' : 'Date'}</span>
                <span className="text-right">{locale === 'zh' ? '折算金额' : 'Converted'}</span>
              </div>
              {oneTimeData.map((d) => (
                <div key={d.key} className="grid grid-cols-4 text-sm py-2.5 px-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{getCurrencySymbol(d.originalCurrency)}{d.originalAmount.toFixed(2)}</span>
                  <span className="text-muted-foreground">{dayjs(d.date).format('YYYY-MM-DD')}</span>
                  <span className="text-right font-semibold text-primary">{symbol}{d.converted.toFixed(2)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between px-2 pt-1 font-bold">
                <span>{locale === 'zh' ? '合计' : 'Total'}</span>
                <span className="text-primary text-lg">{symbol}{oneTimeTotal.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
                <span>{t('subscription.name')}</span>
                <span>{locale === 'zh' ? '原始金额' : 'Original'}</span>
                <span>{t('subscription.cycle')}</span>
                <span className="text-right">{breakdownType === 'monthly' ? t('dashboard.totalMonthly') : t('dashboard.totalYearly')}</span>
              </div>
              {breakdownData.map((d) => (
                <div key={d.key} className="grid grid-cols-4 text-sm py-2.5 px-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{getCurrencySymbol(d.originalCurrency)}{d.originalAmount.toFixed(2)}</span>
                  <span>
                    <Badge variant="secondary" className="text-xs">{getCycleLabel(d.cycle, locale, d.cycleMultiplier || 1)}</Badge>
                  </span>
                  <span className="text-right font-semibold text-primary">
                    {symbol}{(breakdownType === 'monthly' ? d.monthly : d.yearly).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between px-2 pt-1 font-bold">
                <span>{locale === 'zh' ? '合计' : 'Total'}</span>
                <span className="text-primary text-lg">
                  {symbol}{(breakdownType === 'monthly' ? monthlyTotal : yearlyTotal).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Detail Dialog */}
      <Dialog open={detailSub !== null} onOpenChange={() => setDetailSub(null)}>
        <DialogContent className="glass-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailSub?.name || ''}</DialogTitle>
          </DialogHeader>
          {detailSub && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label={t('subscription.amount')}>
                <span className="text-lg font-bold text-primary">
                  {getCurrencySymbol(detailSub.currency)}{detailSub.amount.toFixed(2)}
                </span>
              </DetailRow>
              <DetailRow label={t('subscription.currency')}>{detailSub.currency}</DetailRow>
              <DetailRow label={t('subscription.cycle')}>
                <Badge variant="secondary">{getCycleLabel(detailSub.cycle, locale, detailSub.cycleMultiplier || 1)}</Badge>
              </DetailRow>
              <DetailRow label={t('subscription.active')}>
                <Badge variant={detailSub.isActive ? 'default' : 'secondary'} className={detailSub.isActive ? 'bg-green-100 text-green-700' : ''}>
                  {detailSub.isActive ? (locale === 'zh' ? '活跃' : 'Active') : (locale === 'zh' ? '停用' : 'Inactive')}
                </Badge>
              </DetailRow>
              <DetailRow label={t('subscription.startDate')}>
                {dayjs(detailSub.startDate).format('YYYY-MM-DD')}
              </DetailRow>
              {detailSub.cycle !== 'ONE_TIME' && (
                <DetailRow label={t('subscription.nextRenewal')}>
                  <span className={dayjs(detailSub.nextRenewalDate).isBefore(dayjs()) ? 'text-destructive font-medium' : ''}>
                    {dayjs(detailSub.nextRenewalDate).format('YYYY-MM-DD')}
                  </span>
                </DetailRow>
              )}
              {detailSub.category && (
                <DetailRow label={t('subscription.category')}>
                  <Badge variant="outline">{t(`subscription.categories.${detailSub.category}`)}</Badge>
                </DetailRow>
              )}
              {detailSub.paymentMethod && (
                <DetailRow label={t('subscription.paymentMethod')}>{detailSub.paymentMethod}</DetailRow>
              )}
              {detailSub.exchangeRateAtPurchase && detailSub.currency !== displayCurrency && (
                <DetailRow label={locale === 'zh' ? '折算金额' : 'Converted'}>
                  <span className="font-semibold">{symbol}{(detailSub.amount * detailSub.exchangeRateAtPurchase).toFixed(2)}</span>
                </DetailRow>
              )}
              {detailSub.url && (
                <div className="col-span-2">
                  <DetailRow label={t('subscription.url')}>
                    <a href={detailSub.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {detailSub.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </DetailRow>
                </div>
              )}
              {detailSub.description && (
                <div className="col-span-2">
                  <DetailRow label={t('subscription.description')}>{detailSub.description}</DetailRow>
                </div>
              )}
              {detailSub.notes && (
                <div className="col-span-2">
                  <DetailRow label={t('subscription.notes')}>{detailSub.notes}</DetailRow>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Subscriptions List Dialog */}
      <Dialog open={showActiveList} onOpenChange={setShowActiveList}>
        <DialogContent className="sm:max-w-4xl glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{`${t('dashboard.activeCount')} (${activeCount})`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-0">
            <div className="grid grid-cols-[2.5fr_1.2fr_1fr_2fr_1fr] text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
              <span>{t('subscription.name')}</span>
              <span>{t('subscription.amount')}</span>
              <span>{t('subscription.cycle')}</span>
              <span>{t('subscription.nextRenewal')}</span>
              <span className="text-right">{locale === 'zh' ? '分类' : 'Category'}</span>
            </div>
            {nonExpired.map((sub) => {
              const days = sub.cycle !== 'ONE_TIME' ? dayjs(sub.nextRenewalDate).diff(dayjs(), 'day') : null;
              return (
                <div
                  key={sub.id}
                  onClick={() => { setShowActiveList(false); setDetailSub(sub); }}
                  className="grid grid-cols-[2.5fr_1.2fr_1fr_2fr_1fr] items-center text-sm py-2.5 px-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <span className="font-medium break-words pr-2">{sub.name}</span>
                  <span className="tabular-nums">{getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)}</span>
                  <span>
                    <Badge variant="secondary" className="text-xs">{getCycleLabel(sub.cycle, locale, sub.cycleMultiplier || 1)}</Badge>
                  </span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {sub.cycle === 'ONE_TIME' ? (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">{locale === 'zh' ? '买断' : 'One-time'}</Badge>
                    ) : (
                      <>
                        <span className="tabular-nums">{dayjs(sub.nextRenewalDate).format('MM-DD')}</span>
                        <Badge
                          variant={days !== null && days <= 0 ? 'destructive' : 'outline'}
                          className={cn(
                            'text-xs shrink-0',
                            days !== null && days > 0 && days <= 3 && 'bg-amber-100 text-amber-700 border-amber-200',
                            days !== null && days > 3 && days <= 7 && 'bg-blue-100 text-blue-700 border-blue-200',
                            days !== null && days > 7 && 'bg-green-100 text-green-700 border-green-200'
                          )}
                        >
                          {days !== null && days <= 0
                            ? (locale === 'zh' ? '已过期' : 'Overdue')
                            : (locale === 'zh' ? `${days} 天` : `${days} days`)}
                        </Badge>
                      </>
                    )}
                  </span>
                  <span className="text-right">
                    {sub.category ? (
                      <Badge variant="outline" className="text-xs">{t(`subscription.categories.${sub.category}`)}</Badge>
                    ) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Spent Breakdown Dialog */}
      <Dialog open={showTotalSpent} onOpenChange={setShowTotalSpent}>
        <DialogContent className="sm:max-w-2xl glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dashboard.totalSpent')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-0">
            <div className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr_1.2fr] text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
              <span>{t('subscription.name')}</span>
              <span>{locale === 'zh' ? '单次金额' : 'Per Payment'}</span>
              <span>{t('subscription.cycle')}</span>
              <span className="text-center">{locale === 'zh' ? '次数' : 'Times'}</span>
              <span className="text-right">{locale === 'zh' ? '累计花费' : 'Total'}</span>
            </div>
            {totalSpentData.map((d) => (
              <div key={d.key} className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr_1.2fr] items-center text-sm py-2.5 px-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                <span className="font-medium truncate pr-2">{d.name}</span>
                <span className="text-muted-foreground">{getCurrencySymbol(d.originalCurrency)}{d.originalAmount.toFixed(2)}</span>
                <span>
                  <Badge variant="secondary" className="text-xs">{getCycleLabel(d.cycle, locale, d.cycleMultiplier || 1)}</Badge>
                </span>
                <span className="text-center tabular-nums">{d.payments}</span>
                <span className="text-right font-semibold text-primary tabular-nums">{symbol}{d.totalSpent.toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex items-center justify-between px-2 pt-1 font-bold">
              <span>{locale === 'zh' ? '合计' : 'Total'}</span>
              <span className="text-primary text-lg">{symbol}{totalSpent.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Expense Detail Dialog */}
      <Dialog open={!!selectedBarMonth} onOpenChange={(open) => { if (!open) setSelectedBarMonth(null); }}>
        <DialogContent className="sm:max-w-lg glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBarMonth?.month} {locale === 'zh' ? '消费明细' : 'Expense Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedBarMonth && (
            <div className="space-y-0">
              <div className="grid grid-cols-[2fr_1.2fr_1fr_1.2fr] text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
                <span>{t('subscription.name')}</span>
                <span>{locale === 'zh' ? '原始金额' : 'Original'}</span>
                <span>{locale === 'zh' ? '类型' : 'Type'}</span>
                <span className="text-right">{locale === 'zh' ? '折算金额' : 'Converted'}</span>
              </div>
              {selectedBarMonth.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1.2fr_1fr_1.2fr] items-center text-sm py-2.5 px-2 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <span className="font-medium truncate pr-2">{item.name}</span>
                  <span className="text-muted-foreground tabular-nums">{getCurrencySymbol(item.originalCurrency)}{item.originalAmount.toFixed(2)}</span>
                  <span>
                    <Badge variant={item.type === 'auto' ? 'default' : 'outline'} className="text-xs">
                      {item.type === 'auto' ? (locale === 'zh' ? '自动' : 'Auto') : (locale === 'zh' ? '手动' : 'Manual')}
                    </Badge>
                  </span>
                  <span className="text-right font-semibold text-primary tabular-nums">{symbol}{item.amount.toFixed(2)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between px-2 pt-1 font-bold">
                <span>{locale === 'zh' ? '合计' : 'Total'}</span>
                <span className="text-primary text-lg">{symbol}{selectedBarMonth.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}
