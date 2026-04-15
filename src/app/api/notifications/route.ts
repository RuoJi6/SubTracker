import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const subscriptionId = searchParams.get('subscriptionId');

    const where: Record<string, unknown> = {};
    if (subscriptionId) where.subscriptionId = subscriptionId;

    const configs = await prisma.notificationConfig.findMany({
      where,
      include: { subscription: true },
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
