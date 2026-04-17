import { NextResponse } from 'next/server';
import { checkAndSendNotifications } from '@/lib/notification/scheduler';
import { advanceExpiredRenewals } from '@/lib/renewal';

// Manual trigger endpoint for notification checks
export async function GET(request: Request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Send notifications FIRST (so "today" / expired reminders fire before dates are advanced)
  const notifResult = await checkAndSendNotifications();
  // 2. Then advance expired auto-renew subscriptions
  const renewalResult = await advanceExpiredRenewals();

  return NextResponse.json({
    success: true,
    data: {
      ...notifResult,
      renewalsAdvanced: renewalResult.advanced,
      ratesUpdated: renewalResult.ratesUpdated,
    },
    timestamp: new Date().toISOString(),
  });
}
