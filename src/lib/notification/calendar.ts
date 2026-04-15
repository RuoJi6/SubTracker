import icalGenerator, { ICalEventRepeatingFreq, ICalAlarmType } from 'ical-generator';
import { Subscription } from '@prisma/client';
import { getCycleDays } from '../currency';

export function generateICalendar(subscriptions: Subscription[]): string {
  const calendar = icalGenerator({
    name: 'SubTracker Subscriptions',
    timezone: process.env.TZ || 'Asia/Shanghai',
    prodId: { company: 'SubTracker', product: 'Subscription Reminders' },
  });

  for (const sub of subscriptions) {
    if (!sub.isActive) continue;

    const cycleDays = getCycleDays(sub.cycle, sub.customCycleDays ?? undefined);
    const renewalDate = new Date(sub.nextRenewalDate);

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
      summary: `🔔 ${sub.name} 续费`,
      description: `订阅续费提醒\n金额: ${sub.currency} ${sub.amount}\n周期: ${sub.cycle}`,
      repeating,
      alarms: [
        { type: ICalAlarmType.display, trigger: 86400 },
        { type: ICalAlarmType.display, trigger: 0 },
      ],
    });
  }

  return calendar.toString();
}
