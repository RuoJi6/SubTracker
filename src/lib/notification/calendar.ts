import icalGenerator, { ICalEventRepeatingFreq, ICalAlarmType } from 'ical-generator';
import { Subscription } from '@prisma/client';
import { getCycleDays, formatAmount, getCycleLabel } from '../currency';
import { renderTemplate, DEFAULT_CALENDAR_TITLE, DEFAULT_CALENDAR_DESC, TemplateData } from './template';

interface CalendarOptions {
  calendarTitle?: string | null;
  calendarDesc?: string | null;
  language?: string;
  refreshIntervalHours?: number;
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

    const summary = renderTemplate(titleTemplate, templateData);
    const description = renderTemplate(descTemplate, templateData);

    // ONE_TIME: single event, no repeating
    if (sub.cycle === 'ONE_TIME') {
      calendar.createEvent({
        id: `${sub.id}-onetime`,
        start: new Date(sub.startDate),
        allDay: true,
        summary,
        description,
        alarms: [
          { type: ICalAlarmType.display, trigger: 0 },
        ],
      });
      continue;
    }

    // Auto-renew subscriptions: recurring event with RRULE
    if (sub.autoRenew) {
      const repeating = cycleDays <= 7
        ? { freq: ICalEventRepeatingFreq.WEEKLY, interval: cycleDays / 7 }
        : cycleDays <= 31
          ? { freq: ICalEventRepeatingFreq.MONTHLY, interval: 1 }
          : cycleDays <= 92
            ? { freq: ICalEventRepeatingFreq.MONTHLY, interval: 3 }
            : { freq: ICalEventRepeatingFreq.YEARLY, interval: 1 };

      calendar.createEvent({
        id: `${sub.id}-${renewalDate.toISOString().split('T')[0]}`,
        start: renewalDate,
        allDay: true,
        summary,
        description,
        repeating,
        alarms: [
          { type: ICalAlarmType.display, trigger: 86400 },
          { type: ICalAlarmType.display, trigger: 0 },
        ],
      });
    } else {
      // Manual payment: single event at nextRenewalDate only
      calendar.createEvent({
        id: `${sub.id}-${renewalDate.toISOString().split('T')[0]}`,
        start: renewalDate,
        allDay: true,
        summary,
        description,
        alarms: [
          { type: ICalAlarmType.display, trigger: 86400 },
          { type: ICalAlarmType.display, trigger: 0 },
        ],
      });
    }
  }

  return calendar.toString();
}
