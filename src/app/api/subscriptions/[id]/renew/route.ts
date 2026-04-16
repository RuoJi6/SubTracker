import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import dayjs from 'dayjs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (sub.cycle === 'ONE_TIME') {
      return NextResponse.json(
        { success: false, error: 'Cannot renew a one-time purchase' },
        { status: 400 }
      );
    }

    const base = dayjs(sub.nextRenewalDate);
    const today = dayjs().startOf('day');
    const current = base.isBefore(today) ? today : base;
    let next: dayjs.Dayjs;
    const m = sub.cycleMultiplier || 1;

    switch (sub.cycle) {
      case 'WEEKLY':
        next = current.add(1 * m, 'week');
        break;
      case 'MONTHLY':
        next = current.add(1 * m, 'month');
        break;
      case 'QUARTERLY':
        next = current.add(3 * m, 'month');
        break;
      case 'YEARLY':
        next = current.add(1 * m, 'year');
        break;
      case 'CUSTOM':
        next = current.add(sub.customCycleDays || 30, 'day');
        break;
      default:
        next = current.add(1, 'month');
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { nextRenewalDate: next.toDate() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
