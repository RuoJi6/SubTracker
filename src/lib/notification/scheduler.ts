import { prisma } from '../prisma';
import { sendDingTalkMessage, buildRenewalMessage } from './dingtalk';
import { sendEmail, buildRenewalEmailHtml } from './email';
import { formatAmount } from '../currency';
import dayjs from 'dayjs';

export async function checkAndSendNotifications(): Promise<{
  checked: number;
  sent: number;
  errors: string[];
}> {
  const result = { checked: 0, sent: 0, errors: [] as string[] };

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'global' },
    });

    const now = dayjs();
    const subscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: { notificationConfigs: true },
    });

    for (const sub of subscriptions) {
      result.checked++;
      const renewalDate = dayjs(sub.nextRenewalDate);
      const daysUntil = renewalDate.diff(now, 'day');

      for (const config of sub.notificationConfigs) {
        if (!config.enabled) continue;

        const daysBefore: number[] = JSON.parse(config.daysBefore);
        if (!daysBefore.includes(daysUntil)) continue;

        // Check time
        const [targetHour, targetMinute] = config.notifyTime.split(':').map(Number);
        const currentHour = now.hour();
        const currentMinute = now.minute();
        if (Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute)) > 30) {
          continue;
        }

        const amount = formatAmount(sub.amount, sub.currency);
        const dateStr = renewalDate.format('YYYY-MM-DD');

        try {
          if (config.type === 'DINGTALK' && settings?.dingtalkWebhook) {
            const msg = buildRenewalMessage(sub.name, amount, dateStr, daysUntil);
            const ok = await sendDingTalkMessage(
              settings.dingtalkWebhook,
              settings.dingtalkSecret ?? null,
              msg
            );
            if (ok) result.sent++;
            else result.errors.push(`DingTalk failed for ${sub.name}`);
          }

          if (config.type === 'EMAIL' && settings?.smtpHost && settings?.emailTo) {
            const html = buildRenewalEmailHtml(sub.name, amount, dateStr, daysUntil);
            const ok = await sendEmail(
              {
                host: settings.smtpHost,
                port: settings.smtpPort || 465,
                user: settings.smtpUser || '',
                pass: settings.smtpPass || '',
                from: settings.emailFrom || settings.smtpUser || '',
                to: settings.emailTo,
              },
              `订阅续费提醒 - ${sub.name}`,
              html
            );
            if (ok) result.sent++;
            else result.errors.push(`Email failed for ${sub.name}`);
          }
        } catch (err) {
          result.errors.push(`Notification error for ${sub.name}: ${err}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Scheduler error: ${error}`);
  }

  return result;
}
