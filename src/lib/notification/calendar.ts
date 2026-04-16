import icalGenerator, { ICalEventRepeatingFreq } from 'ical-generator';
import { Subscription } from '@prisma/client';
import { getCycleDays, formatAmount, getCycleLabel } from '../currency';
import { renderTemplate, DEFAULT_CALENDAR_TITLE, DEFAULT_CALENDAR_DESC, TemplateData } from './template';

interface CalendarOptions {
  calendarTitle?: string | null;
  calendarDesc?: string | null;
  language?: string;
  refreshIntervalHours?: number;
  alarmDays?: number[];
}

export function generateICalendar(subscriptions: Subscription[], options?: CalendarOptions): string {
  const calendar = icalGenerator({
    name: 'SubTracker Subscriptions',
    timezone: process.env.TZ || 'Asia/Shanghai',
    prodId: { company: 'SubTracker', product: 'Subscription Reminders' },
    ttl: (options?.refreshIntervalHours ?? 6) * 3600,
  });

  const titleTemplate = options?.calendarTitle || DEFAULT_CALENDAR_TITLE;
  const descTemplate = options?.calendarDesc || DEFAULT_CALENDAR_DESC;
  const lang = options?.language || 'zh';
  const alarmDays = options?.alarmDays ?? [0, 1];

  for (const sub of subscriptions) {
    if (!sub.isActive) continue;

    const cycleDays = getCycleDays(sub.cycle, sub.customCycleDays ?? undefined);
    const renewalDate = new Date(sub.nextRenewalDate);

    const templateData: TemplateData = {
      name: sub.name,
      amount: formatAmount(sub.amount, sub.currency),
      renewalDate: renewalDate.toISOString().split('T')[0],
      daysUntil: 0,
      urgency: lang === 'zh' ? '📅 续费日' : '📅 Renewal Day',
      cycle: getCycleLabel(sub.cycle, lang),
      category: sub.category || '-',
      paymentMethod: sub.paymentMethod || '-',
    };

    const baseSummary = renderTemplate(titleTemplate, templateData);
    const baseDescription = renderTemplate(descTemplate, templateData);

    // ONE_TIME: single event on startDate
    if (sub.cycle === 'ONE_TIME') {
      calendar.createEvent({
        id: `${sub.id}-onetime`,
        start: new Date(sub.startDate),
        allDay: true,
        summary: baseSummary,
        description: baseDescription,
      });
      continue;
    }

    // Build repeating rule for auto-renew
    const repeating = sub.autoRenew
      ? (cycleDays <= 7
        ? { freq: ICalEventRepeatingFreq.WEEKLY, interval: cycleDays / 7 }
        : cycleDays <= 31
          ? { freq: ICalEventRepeatingFreq.MONTHLY, interval: 1 }
          : cycleDays <= 92
            ? { freq: ICalEventRepeatingFreq.MONTHLY, interval: 3 }
            : { freq: ICalEventRepeatingFreq.YEARLY, interval: 1 })
      : null;

    // Create a separate calendar event for each alarm day
    for (const daysBefore of alarmDays) {
      const eventDate = new Date(renewalDate);
      eventDate.setDate(eventDate.getDate() - daysBefore);

      let summary: string;
      let description: string;
      if (daysBefore === 0) {
        summary = baseSummary;
        description = baseDescription;
      } else {
        const label = lang === 'zh'
          ? `⏰ ${sub.name} ${daysBefore}天后续费`
          : `⏰ ${sub.name} renews in ${daysBefore} day${daysBefore > 1 ? 's' : ''}`;
        summary = label;
        description = baseDescription;
      }

      const eventId = `${sub.id}-d${daysBefore}-${eventDate.toISOString().split('T')[0]}`;

      if (repeating) {
        calendar.createEvent({
          id: eventId,
          start: eventDate,
          allDay: true,
          summary,
          description,
          repeating,
        });
      } else {
        calendar.createEvent({
          id: eventId,
          start: eventDate,
          allDay: true,
          summary,
          description,
        });
      }
    }
  }

  return calendar.toString();
}
