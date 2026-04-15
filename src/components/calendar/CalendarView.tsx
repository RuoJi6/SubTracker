'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, Calendar, Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleLabel } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  nextRenewalDate: string;
  startDate: string;
  cycle: string;
  customCycleDays?: number | null;
  isActive: boolean;
  category?: string | null;
}

interface RenewalEvent {
  sub: Subscription;
  date: Dayjs;
}

// Only show the exact nextRenewalDate — no automatic projection.
// Users must manually renew to advance the date.
function getRenewalDatesInRange(
  sub: Subscription,
  rangeStart: Dayjs,
  rangeEnd: Dayjs
): Dayjs[] {
  const next = dayjs(sub.nextRenewalDate).startOf('day');
  if (
    (next.isAfter(rangeStart) || next.isSame(rangeStart, 'day')) &&
    (next.isBefore(rangeEnd) || next.isSame(rangeEnd, 'day'))
  ) {
    return [next];
  }
  return [];
}

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const { t, locale } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const mouseStartX = useRef<number>(0);
  const isDragging = useRef(false);

  const [renewingId, setRenewingId] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(() => {
    fetch('/api/subscriptions?active=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSubscriptions(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleRenew = async (subId: string) => {
    setRenewingId(subId);
    try {
      const res = await fetch(`/api/subscriptions/${subId}/renew`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(locale === 'zh' ? '续费成功' : 'Renewed successfully');
        fetchSubscriptions();
      } else {
        toast.error(data.error || 'Error');
      }
    } catch {
      toast.error(locale === 'zh' ? '续费失败' : 'Renew failed');
    } finally {
      setRenewingId(null);
    }
  };

  const renewalMap = useMemo(() => {
    const rangeStart = currentMonth.startOf('month').startOf('week');
    const rangeEnd = currentMonth.endOf('month').endOf('week');
    const map = new Map<string, RenewalEvent[]>();

    for (const sub of subscriptions) {
      if (!sub.isActive) continue;
      const dates = getRenewalDatesInRange(sub, rangeStart, rangeEnd);
      for (const d of dates) {
        const key = d.format('YYYY-MM-DD');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ sub, date: d });
      }
    }
    return map;
  }, [subscriptions, currentMonth]);

  const getEventsForDate = useCallback(
    (date: Dayjs): RenewalEvent[] => {
      return renewalMap.get(date.format('YYYY-MM-DD')) || [];
    },
    [renewalMap]
  );

  const goToday = () => setCurrentMonth(dayjs().startOf('month'));
  const goPrev = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const goNext = () => setCurrentMonth((m) => m.add(1, 'month'));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = e.clientX - mouseStartX.current;
    if (Math.abs(dx) > 80) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleDateClick = (date: Dayjs) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const calendarDays = useMemo(() => {
    const start = currentMonth.startOf('month').startOf('week');
    const end = currentMonth.endOf('month').endOf('week');
    const days: Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      days.push(d);
      d = d.add(1, 'day');
    }
    return days;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Dayjs[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const today = dayjs().startOf('day');
  const weekdays = locale === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              {t('calendar.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="min-w-[140px] text-center font-semibold text-lg">
                {currentMonth.format(locale === 'zh' ? 'YYYY年MM月' : 'MMMM YYYY')}
              </h3>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="link" size="sm" onClick={goToday}>
                {t('calendar.today')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('calendar.swipeHint')}</p>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className="select-none cursor-grab"
          >
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdays.map((wd, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-center text-xs font-semibold py-2',
                    (i === 0 || i === 6) ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const events = getEventsForDate(day);
                  const isToday = day.isSame(today, 'day');
                  const isCurrentMonth = day.month() === currentMonth.month();
                  const hasEvents = events.length > 0;

                  return (
                    <div
                      key={day.format('YYYY-MM-DD')}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'min-h-[80px] p-1.5 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm',
                        isToday ? 'border-primary border-2 bg-primary/5' : 'border-border/50',
                        !isCurrentMonth && 'opacity-40',
                        isCurrentMonth && hasEvents && 'bg-green-50 dark:bg-green-950/20',
                        isCurrentMonth && !hasEvents && 'bg-background',
                      )}
                    >
                      <div className={cn(
                        'text-xs mb-1',
                        isToday && 'font-bold text-primary',
                        !isToday && (day.day() === 0 || day.day() === 6) && 'text-destructive',
                      )}>
                        {day.date()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {events.slice(0, 3).map((ev) => {
                          const daysUntil = ev.date.diff(today, 'day');
                          return (
                            <Tooltip key={ev.sub.id}>
                              <TooltipTrigger
                                className={cn(
                                  'text-[11px] leading-4 px-1 rounded text-white truncate block text-left',
                                  daysUntil < 0 && 'bg-destructive',
                                  daysUntil === 0 && 'bg-amber-500',
                                  daysUntil > 0 && daysUntil <= 3 && 'bg-orange-500',
                                  daysUntil > 3 && 'bg-green-500',
                                )}
                              >
                                {ev.sub.name}
                              </TooltipTrigger>
                              <TooltipContent>
                                {ev.sub.name} · {getCurrencySymbol(ev.sub.currency)}{ev.sub.amount.toFixed(2)} · {getCycleLabel(ev.sub.cycle, locale)}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {events.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{events.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date Detail Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {selectedDate?.format(locale === 'zh' ? 'YYYY年M月D日' : 'MMMM D, YYYY')}
              {selectedEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedEvents.length} {t('calendar.renewal')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEvents.length > 0 ? (
            <div className="space-y-0">
              {selectedEvents.map((ev) => {
                const daysUntil = ev.date.diff(today, 'day');
                const statusText = daysUntil < 0
                  ? t('calendar.overdue')
                  : daysUntil === 0
                    ? t('calendar.dueToday')
                    : `${daysUntil} ${t('calendar.daysUntil')}`;

                return (
                  <div key={ev.sub.id} className="py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm">{ev.sub.name}</span>
                      <Badge
                        variant={daysUntil < 0 ? 'destructive' : 'outline'}
                        className={cn(
                          'text-xs',
                          daysUntil === 0 && 'bg-amber-100 text-amber-700 border-amber-200',
                          daysUntil > 0 && daysUntil <= 3 && 'bg-orange-100 text-orange-700 border-orange-200',
                          daysUntil > 3 && 'bg-green-100 text-green-700 border-green-200',
                        )}
                      >
                        {statusText}
                      </Badge>
                      {ev.sub.cycle !== 'ONE_TIME' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto h-7 gap-1 text-xs"
                          disabled={renewingId === ev.sub.id}
                          onClick={() => handleRenew(ev.sub.id)}
                        >
                          <RotateCw className={cn('size-3', renewingId === ev.sub.id && 'animate-spin')} />
                          {t('calendar.renew')}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      <p>{t('calendar.amount')}: <span className="font-medium text-foreground">{getCurrencySymbol(ev.sub.currency)}{ev.sub.amount.toFixed(2)}</span></p>
                      <p>{t('calendar.cycle')}: {getCycleLabel(ev.sub.cycle, locale)}</p>
                      {ev.sub.category && (
                        <Badge variant="outline" className="mt-1 text-xs">{ev.sub.category}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('calendar.noEvents')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
