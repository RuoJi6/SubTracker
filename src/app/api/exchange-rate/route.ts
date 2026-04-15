import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchExchangeRate } from '@/lib/exchange-rate';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const base = searchParams.get('base') || 'USD';
    const target = searchParams.get('target') || 'CNY';
    const date = searchParams.get('date') || undefined;

    const rate = await fetchExchangeRate(base, target, date);

    return NextResponse.json({
      success: true,
      data: { base, target, rate, date: date || new Date().toISOString().split('T')[0] },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
