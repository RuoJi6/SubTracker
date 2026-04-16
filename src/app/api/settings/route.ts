import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { GlobalSettings } from '@prisma/client';
import crypto from 'crypto';

async function ensureCalendarToken(settings: GlobalSettings): Promise<GlobalSettings> {
  if (settings.calendarToken) return settings;
  const token = crypto.randomBytes(32).toString('hex');
  return prisma.globalSettings.update({
    where: { id: settings.id },
    data: { calendarToken: token },
  });
}

export async function GET() {
  try {
    await requireAuth();

    let settings = await prisma.globalSettings.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: { id: 'global' },
      });
    }

    settings = await ensureCalendarToken(settings);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Handle calendar token regeneration
    if (body.regenerateCalendarToken) {
      const token = crypto.randomBytes(32).toString('hex');
      const settings = await prisma.globalSettings.update({
        where: { id: 'global' },
        data: { calendarToken: token },
      });
      return NextResponse.json({ success: true, data: settings });
    }

    const settings = await prisma.globalSettings.upsert({
      where: { id: 'global' },
      update: {
        displayCurrency: body.displayCurrency,
        language: body.language,
        dingtalkWebhook: body.dingtalkWebhook,
        dingtalkSecret: body.dingtalkSecret,
        dingtalkTemplate: body.dingtalkTemplate ?? null,
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort,
        smtpUser: body.smtpUser,
        smtpPass: body.smtpPass,
        emailFrom: body.emailFrom,
        emailTo: body.emailTo,
        emailTemplate: body.emailTemplate ?? null,
        calendarTitle: body.calendarTitle ?? null,
        calendarDesc: body.calendarDesc ?? null,
        calendarAlarmDays: body.calendarAlarmDays,
        calendarRefreshHours: body.calendarRefreshHours,
        timezone: body.timezone,
      },
      create: {
        id: 'global',
        ...body,
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
