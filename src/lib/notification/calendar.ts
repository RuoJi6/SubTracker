import icalGenerator, { ICalEventRepeatingFreq } from 'ical-generator';
import { Subscription } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getCycleDays, formatAmount, getCycleLabel } from '../currency';
import { renderTemplate, DEFAULT_CALENDAR_TITLE, DEFAULT_CALENDAR_DESC, TemplateData } from './template';

dayjs.extend(utc);
dayjs.extend(timezone);

interface CalendarOptions {
  calendarTitle?: string | null;
  calendarDesc?: string | null;
  language?: string;
  alarmDays?: number[];
}

/**
 * Create a Date object at noon UTC for a given date string to avoid
 * timezone boundary issues with all-day calendar events.
 */
function dateAtNoonUTC(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

export function generateICalendar(subscriptions: Subscription[], options?: CalendarOptions): string {
  const tz = process.env.TZ || 'Asia/Shanghai';
  const calendar = icalGenerator({
    name: 'SubTracker Subscriptions',
    timezone: tz,
    prodId: { company: 'SubTracker', product: 'Subscription Reminders' },
    ttl: 60 * 15, // suggest 15-minute refresh to calendar clients
  });

  const titleTemplate = options?.calendarTitle || DEFAULT_CALENDAR_TITLE;
  const descTemplate = options?.calendarDesc || DEFAULT_CALENDAR_DESC;
  const lang = options?.language || 'zh';
  const alarmDays = options?.alarmDays ?? [0, 1];

  for (const sub of subscriptions) {
    if (!sub.isActive) continue;

    const cycleDays = getCycleDays(sub.cycle, sub.customCycleDays ?? undefined);
    // Extract date in the configured timezone to avoid UTC offset issues
    const renewalDateStr = dayjs(sub.nextRenewalDate).tz(tz).format('YYYY-MM-DD');

    const templateData: TemplateData = {
      name: sub.name,
      amount: formatAmount(sub.amount, sub.currency),
      renewalDate: renewalDateStr,
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
      const startStr = dayjs(sub.startDate).tz(tz).format('YYYY-MM-DD');
      calendar.createEvent({
        id: `${sub.id}-onetime`,
        start: dateAtNoonUTC(startStr),
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
      const eventDateStr = dayjs(renewalDateStr).subtract(daysBefore, 'day').format('YYYY-MM-DD');

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

      const eventId = `${sub.id}-d${daysBefore}-${eventDateStr}`;

      if (repeating) {
        calendar.createEvent({
          id: eventId,
          start: dateAtNoonUTC(eventDateStr),
          allDay: true,
          summary,
          description,
          repeating,
        });
      } else {
        calendar.createEvent({
          id: eventId,
          start: dateAtNoonUTC(eventDateStr),
          allDay: true,
          summary,
          description,
        });
      }
    }
  }

  return calendar.toString();
}
