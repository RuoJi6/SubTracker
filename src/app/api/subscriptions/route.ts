import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { fetchExchangeRate } from '@/lib/exchange-rate';
import dayjs from 'dayjs';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (active !== null) where.isActive = active === 'true';
    if (category) where.category = category;

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: { notificationConfigs: true },
      orderBy: { nextRenewalDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: subscriptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();

    // Fetch and store exchange rate at purchase time
    let exchangeRateAtPurchase: number | undefined;
    const displayCurrency = (
      await prisma.globalSettings.findUnique({ where: { id: 'global' } })
    )?.displayCurrency || 'CNY';

    if (body.currency !== displayCurrency) {
      try {
        exchangeRateAtPurchase = await fetchExchangeRate(
          body.currency,
          displayCurrency,
          dayjs(body.startDate).format('YYYY-MM-DD')
        );
      } catch {
        // If rate fetch fails, proceed without it
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        name: body.name,
        icon: body.icon || null,
        description: body.description || null,
        amount: body.amount,
        currency: body.currency,
        cycle: body.cycle,
        cycleMultiplier: body.cycleMultiplier || 1,
        customCycleDays: body.customCycleDays || null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        startDate: new Date(body.startDate),
        nextRenewalDate: new Date(body.nextRenewalDate),
        url: body.url || null,
        category: body.category || null,
        paymentMethod: body.paymentMethod || null,
        autoRenew: body.autoRenew ?? false,
        isActive: body.isActive ?? true,
        exchangeRateAtPurchase: exchangeRateAtPurchase ?? null,
        notes: body.notes || null,
        notificationConfigs: body.notifications
          ? {
              create: body.notifications.map((n: { type: string; enabled: boolean; daysBefore: number[]; notifyTime: string }) => ({
                type: n.type,
                enabled: n.enabled,
                daysBefore: JSON.stringify(n.daysBefore),
                notifyTime: n.notifyTime,
              })),
            }
          : undefined,
      },
      include: { notificationConfigs: true },
    });

    return NextResponse.json({ success: true, data: subscription }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
