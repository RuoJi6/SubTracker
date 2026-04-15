import { NextResponse } from 'next/server';
import { checkAndSendNotifications } from '@/lib/notification/scheduler';

// This endpoint is called by Vercel Cron or manually
export async function GET(request: Request) {
  // Verify cron secret for Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await checkAndSendNotifications();

  return NextResponse.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
}
