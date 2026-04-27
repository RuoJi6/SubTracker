import { prisma } from '../prisma';
import { sendDingTalkMessage, buildRenewalMessage } from './dingtalk';
import { sendEmail, buildRenewalEmailHtml } from './email';
import { renderTemplate, DEFAULT_DINGTALK_TEMPLATE, DEFAULT_EMAIL_TEMPLATE, TemplateData, translateCategory, translatePaymentMethod } from './template';
import { formatAmount, getCycleLabel } from '../currency';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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

    const tz = process.env.TZ || 'Asia/Shanghai';
    const now = dayjs().tz(tz);
    const subscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: { notificationConfigs: true },
    });

    for (const sub of subscriptions) {
      result.checked++;
      const renewalDate = dayjs(sub.nextRenewalDate).tz(tz);
      // Compare using date strings to avoid timezone boundary issues
      const todayStr = now.format('YYYY-MM-DD');
      const renewalStr = renewalDate.format('YYYY-MM-DD');
      const daysUntil = dayjs(renewalStr).diff(dayjs(todayStr), 'day');

      for (const config of sub.notificationConfigs) {
        if (!config.enabled) continue;

        const daysBefore: number[] = JSON.parse(config.daysBefore);
        if (!daysBefore.includes(daysUntil)) continue;

        // Time window: only fire when current time is in [notifyTime, notifyTime+30min)
        // Combined with the 30-min cron interval, this guarantees exactly one trigger.
        const [targetHour, targetMinute] = config.notifyTime.split(':').map(Number);
        const nowMinutes = now.hour() * 60 + now.minute();
        const targetMinutes = targetHour * 60 + targetMinute;
        const diff = nowMinutes - targetMinutes;
        if (diff < 0 || diff >= 30) {
          continue;
        }

        // Dedup: skip if we already sent for this (date, daysUntil) combination
        if (
          config.lastSentDate === todayStr &&
          config.lastSentDaysUntil === daysUntil
        ) {
          continue;
        }

        const amount = formatAmount(sub.amount, sub.currency);
        const dateStr = renewalDate.format('YYYY-MM-DD');
        const urgency = daysUntil === 0 ? '🔴 今天' : daysUntil === 1 ? '🟡 明天' : `📅 ${daysUntil}天后`;
        const lang = settings?.language || 'zh';
        const templateData: TemplateData = {
          name: sub.name,
          amount,
          renewalDate: dateStr,
          daysUntil,
          urgency,
          cycle: getCycleLabel(sub.cycle, lang, sub.cycleMultiplier ?? 1),
          category: translateCategory(sub.category || 'other', lang),
          paymentMethod: translatePaymentMethod(sub.paymentMethod || '', lang) || '-',
          autoRenew: sub.autoRenew
            ? (lang === 'zh' ? '自动续费' : 'Auto-renew')
            : (lang === 'zh' ? '手动续费' : 'Manual'),
        };

        try {
          let anySent = false;
          if (config.type === 'DINGTALK' && settings?.dingtalkWebhook) {
            let ok: boolean;
            if (settings.dingtalkTemplate) {
              const text = renderTemplate(settings.dingtalkTemplate, templateData);
              ok = await sendDingTalkMessage(
                settings.dingtalkWebhook,
                settings.dingtalkSecret ?? null,
                { msgtype: 'markdown', markdown: { title: `订阅续费提醒 - ${sub.name}`, text } }
              );
            } else {
              const msg = buildRenewalMessage(sub.name, amount, dateStr, daysUntil);
              ok = await sendDingTalkMessage(
                settings.dingtalkWebhook,
                settings.dingtalkSecret ?? null,
                msg
              );
            }
            if (ok) { result.sent++; anySent = true; }
            else result.errors.push(`DingTalk failed for ${sub.name}`);
          }

          if (config.type === 'EMAIL' && settings?.smtpHost && settings?.emailTo) {
            const html = settings?.emailTemplate
              ? renderTemplate(settings.emailTemplate, templateData)
              : buildRenewalEmailHtml(sub.name, amount, dateStr, daysUntil);
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
            if (ok) { result.sent++; anySent = true; }
            else result.errors.push(`Email failed for ${sub.name}`);
          }

          if (anySent) {
            await prisma.notificationConfig.update({
              where: { id: config.id },
              data: { lastSentDate: todayStr, lastSentDaysUntil: daysUntil },
            });
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
