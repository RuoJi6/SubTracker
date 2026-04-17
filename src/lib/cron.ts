import cron, { ScheduledTask } from 'node-cron';
import { checkAndSendNotifications } from './notification/scheduler';
import { advanceExpiredRenewals } from './renewal';

let cronJob: ScheduledTask | null = null;

export function startCronJobs() {
  if (cronJob) {
    console.log('Cron jobs already running');
    return;
  }

  // Run every 30 minutes
  cronJob = cron.schedule('*/30 * * * *', async () => {
    console.log(`[CRON] Running at ${new Date().toISOString()}`);

    // 1. Send notifications FIRST (so "today" / expired reminders fire before dates are advanced)
    const notifResult = await checkAndSendNotifications();
    console.log(`[CRON] Notifications checked: ${notifResult.checked}, Sent: ${notifResult.sent}, Errors: ${notifResult.errors.length}`);

    // 2. Then advance expired auto-renew subscriptions and refresh exchange rates
    const renewalResult = await advanceExpiredRenewals();
    console.log(`[CRON] Renewals advanced: ${renewalResult.advanced}, Rates updated: ${renewalResult.ratesUpdated}`);
  });

  console.log('Cron jobs started (every 30 minutes)');
}

export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('Cron jobs stopped');
  }
}
