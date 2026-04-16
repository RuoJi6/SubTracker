import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateICalendar } from '@/lib/notification/calendar';
import crypto from 'crypto';

async function getOrCreateCalendarToken(): Promise<string> {
  const settings = await prisma.globalSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });

  if (settings.calendarToken) return settings.calendarToken;

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.globalSettings.update({
    where: { id: 'global' },
    data: { calendarToken: token },
  });
  return token;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing token. Use /api/calendar?token=YOUR_TOKEN' },
        { status: 401 }
      );
    }

    const validToken = await getOrCreateCalendarToken();
    if (token !== validToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 403 }
      );
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
    });

    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'global' },
    });

    const ical = generateICalendar(subscriptions, {
      calendarTitle: settings?.calendarTitle,
      calendarDesc: settings?.calendarDesc,
      language: settings?.language,
      refreshIntervalMinutes: settings?.calendarRefreshMinutes ?? 360,
      alarmDays: settings?.calendarAlarmDays ? JSON.parse(settings.calendarAlarmDays) : [0, 1],
    });

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="subtracker.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
