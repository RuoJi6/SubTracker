import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { notificationConfigs: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Update notifications if provided
    if (body.notifications) {
      await prisma.notificationConfig.deleteMany({
        where: { subscriptionId: id },
      });

      for (const n of body.notifications) {
        await prisma.notificationConfig.create({
          data: {
            subscriptionId: id,
            type: n.type,
            enabled: n.enabled,
            daysBefore: JSON.stringify(n.daysBefore),
            notifyTime: n.notifyTime,
          },
        });
      }
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        name: body.name,
        icon: body.icon,
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        cycle: body.cycle,
        customCycleDays: body.customCycleDays,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        nextRenewalDate: body.nextRenewalDate ? new Date(body.nextRenewalDate) : undefined,
        url: body.url,
        category: body.category,
        isActive: body.isActive,
        exchangeRateAtPurchase: body.exchangeRateAtPurchase,
        notes: body.notes,
      },
      include: { notificationConfigs: true },
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.subscription.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
