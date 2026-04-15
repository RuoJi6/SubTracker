import cron, { ScheduledTask } from 'node-cron';
import { checkAndSendNotifications } from './notification/scheduler';

let cronJob: ScheduledTask | null = null;

export function startCronJobs() {
  if (process.env.DEPLOY_MODE === 'vercel') {
    console.log('Vercel mode: skipping node-cron, using Vercel Cron instead');
    return;
  }

  if (cronJob) {
    console.log('Cron jobs already running');
    return;
  }

  // Run every 30 minutes to check for notifications
  cronJob = cron.schedule('*/30 * * * *', async () => {
    console.log(`[CRON] Checking notifications at ${new Date().toISOString()}`);
    const result = await checkAndSendNotifications();
    console.log(`[CRON] Checked: ${result.checked}, Sent: ${result.sent}, Errors: ${result.errors.length}`);
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
