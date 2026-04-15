import cron, { ScheduledTask } from 'node-cron';
import { checkAndSendNotifications } from './notification/scheduler';
import { advanceExpiredRenewals } from './renewal';

let cronJob: ScheduledTask | null = null;

export function startCronJobs() {
  if (cronJob) {
    console.log('Cron jobs already running');
    return;
  }

  // Run every 30 minutes to check for notifications
  cronJob = cron.schedule('*/30 * * * *', async () => {
    console.log(`[CRON] Running at ${new Date().toISOString()}`);

    // Advance expired renewals and refresh exchange rates
    const renewalResult = await advanceExpiredRenewals();
    console.log(`[CRON] Renewals advanced: ${renewalResult.advanced}, Rates updated: ${renewalResult.ratesUpdated}`);

    // Then check and send notifications
    const notifResult = await checkAndSendNotifications();
    console.log(`[CRON] Notifications checked: ${notifResult.checked}, Sent: ${notifResult.sent}, Errors: ${notifResult.errors.length}`);
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
