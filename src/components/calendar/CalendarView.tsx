'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Card, Modal, Typography, Spin, Tag, Button, Space, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleDays, getCycleLabel } from '@/lib/currency';

const { Text, Title } = Typography;

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

/**
 * Expand all renewal dates for a subscription within [rangeStart, rangeEnd].
 * Starting from nextRenewalDate, step forward/backward by cycle.
 */
function getRenewalDatesInRange(
  sub: Subscription,
  rangeStart: Dayjs,
  rangeEnd: Dayjs
): Dayjs[] {
  const cycleDays = getCycleDays(sub.cycle, sub.customCycleDays ?? undefined);
  const next = dayjs(sub.nextRenewalDate).startOf('day');
  const dates: Dayjs[] = [];

  // Go backward from nextRenewalDate to cover rangeStart
  let d = next;
  while (d.isAfter(rangeStart) || d.isSame(rangeStart, 'day')) {
    if (d.isBefore(rangeEnd) || d.isSame(rangeEnd, 'day')) {
      dates.push(d);
    }
    d = d.subtract(cycleDays, 'day');
    if (d.isBefore(rangeStart.subtract(1, 'day'))) break;
  }

  // Go forward from nextRenewalDate
  d = next.add(cycleDays, 'day');
  while (d.isBefore(rangeEnd) || d.isSame(rangeEnd, 'day')) {
    if (d.isAfter(rangeStart) || d.isSame(rangeStart, 'day')) {
      dates.push(d);
    }
    d = d.add(cycleDays, 'day');
  }

  return dates;
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

  // Touch/swipe state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/subscriptions?active=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSubscriptions(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build renewal events map for the current displayed month range
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

  // Navigation
  const goToday = () => setCurrentMonth(dayjs().startOf('month'));
  const goPrev = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const goNext = () => setCurrentMonth((m) => m.add(1, 'month'));

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe > 60px and more horizontal than vertical
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  // Mouse drag support for desktop
  const mouseStartX = useRef<number>(0);
  const isDragging = useRef(false);

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

  // Build calendar grid
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

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />;

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <CalendarOutlined />
              <span>{t('calendar.title')}</span>
            </Space>
            <Space>
              <Button size="small" icon={<LeftOutlined />} onClick={goPrev} />
              <Title level={5} style={{ margin: 0, minWidth: 140, textAlign: 'center' }}>
                {currentMonth.format(locale === 'zh' ? 'YYYY年MM月' : 'MMMM YYYY')}
              </Title>
              <Button size="small" icon={<RightOutlined />} onClick={goNext} />
              <Button size="small" type="link" onClick={goToday}>
                {t('calendar.today')}
              </Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('calendar.swipeHint')}
            </Text>
          </div>
        }
        styles={{ body: { padding: '8px 12px 12px' } }}
      >
        {/* Calendar Grid */}
        <div
          ref={calendarRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ userSelect: 'none', cursor: 'grab' }}
        >
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {weekdays.map((wd, i) => (
              <div key={i} style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, padding: '6px 0', color: i === 0 || i === 6 ? '#ff4d4f' : '#333' }}>
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {week.map((day) => {
                const events = getEventsForDate(day);
                const isToday = day.isSame(today, 'day');
                const isCurrentMonth = day.month() === currentMonth.month();
                const hasEvents = events.length > 0;

                return (
                  <div
                    key={day.format('YYYY-MM-DD')}
                    onClick={() => handleDateClick(day)}
                    style={{
                      minHeight: 80,
                      padding: '4px 6px',
                      borderRadius: 6,
                      border: isToday ? '2px solid #1677ff' : '1px solid #f0f0f0',
                      background: !isCurrentMonth ? '#fafafa' : hasEvents ? '#f6ffed' : '#fff',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      opacity: isCurrentMonth ? 1 : 0.45,
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#1677ff' : day.day() === 0 || day.day() === 6 ? '#ff4d4f' : '#333',
                      marginBottom: 2,
                    }}>
                      {day.date()}
                    </div>

                    {/* Event badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {events.slice(0, 3).map((ev) => {
                        const daysUntil = ev.date.diff(today, 'day');
                        const color = daysUntil < 0 ? '#ff4d4f' : daysUntil === 0 ? '#faad14' : daysUntil <= 3 ? '#fa8c16' : '#52c41a';
                        return (
                          <Tooltip
                            key={ev.sub.id}
                            title={`${ev.sub.name} · ${getCurrencySymbol(ev.sub.currency)}${ev.sub.amount.toFixed(2)} · ${getCycleLabel(ev.sub.cycle, locale)}`}
                          >
                            <div style={{
                              fontSize: 11,
                              lineHeight: '16px',
                              padding: '0 4px',
                              borderRadius: 3,
                              background: color,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {ev.sub.name}
                            </div>
                          </Tooltip>
                        );
                      })}
                      {events.length > 3 && (
                        <Text style={{ fontSize: 10, color: '#999' }}>+{events.length - 3}</Text>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Date detail modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>{selectedDate?.format(locale === 'zh' ? 'YYYY年M月D日' : 'MMMM D, YYYY')}</span>
            {selectedEvents.length > 0 && (
              <Tag color="blue">{selectedEvents.length} {t('calendar.renewal')}</Tag>
            )}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={480}
      >
        {selectedEvents.length > 0 ? (
          <div>
            {selectedEvents.map((ev) => {
              const daysUntil = ev.date.diff(today, 'day');
              const statusText = daysUntil < 0
                ? t('calendar.overdue')
                : daysUntil === 0
                  ? t('calendar.dueToday')
                  : `${daysUntil} ${t('calendar.daysUntil')}`;
              const statusColor = daysUntil < 0 ? 'red' : daysUntil === 0 ? 'orange' : daysUntil <= 3 ? 'gold' : 'green';

              return (
                <div key={ev.sub.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ marginBottom: 4 }}>
                    <Space>
                      <Text strong>{ev.sub.name}</Text>
                      <Tag color={statusColor}>{statusText}</Tag>
                    </Space>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Text type="secondary">
                      {t('calendar.amount')}: <Text strong>{getCurrencySymbol(ev.sub.currency)}{ev.sub.amount.toFixed(2)}</Text>
                    </Text>
                    <Text type="secondary">
                      {t('calendar.cycle')}: {getCycleLabel(ev.sub.cycle, locale)}
                    </Text>
                    {ev.sub.category && <Tag>{ev.sub.category}</Tag>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type="secondary">{t('calendar.noEvents')}</Text>
          </div>
        )}
      </Modal>
    </>
  );
}
