import { prisma } from './prisma';

const FRANKFURTER_API = 'https://api.frankfurter.app';
const FALLBACK_API = 'https://open.er-api.com/v6/latest';

export async function fetchExchangeRate(
  base: string,
  target: string,
  date?: string
): Promise<number> {
  if (base === target) return 1;

  const dateStr = date || new Date().toISOString().split('T')[0];

  // Check cache first
  const cached = await prisma.exchangeRateCache.findUnique({
    where: {
      baseCurrency_targetCurrency_date: {
        baseCurrency: base,
        targetCurrency: target,
        date: dateStr,
      },
    },
  });

  if (cached) {
    return cached.rate;
  }

  // Try frankfurter.app first
  let rate: number | null = null;
  try {
    const endpoint = date ? `/${date}` : '/latest';
    const res = await fetch(
      `${FRANKFURTER_API}${endpoint}?from=${base}&to=${target}`,
      { next: { revalidate: 3600 } }
    );

    if (res.ok) {
      const data = await res.json();
      rate = data.rates?.[target] ?? null;
    }
  } catch {
    // frankfurter failed, try fallback
  }

  // Fallback to open.er-api.com (supports more currencies, latest only)
  if (!rate) {
    try {
      const res = await fetch(`${FALLBACK_API}/${base}`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        rate = data.rates?.[target] ?? null;
      }
    } catch {
      // fallback also failed
    }
  }

  if (rate) {
    // Cache the result
    await prisma.exchangeRateCache.upsert({
      where: {
        baseCurrency_targetCurrency_date: {
          baseCurrency: base,
          targetCurrency: target,
          date: dateStr,
        },
      },
      update: { rate },
      create: {
        baseCurrency: base,
        targetCurrency: target,
        rate,
        date: dateStr,
      },
    });
    return rate;
  }

  // Last resort: try most recent cached rate
  const fallback = await prisma.exchangeRateCache.findFirst({
    where: { baseCurrency: base, targetCurrency: target },
    orderBy: { date: 'desc' },
  });
  if (fallback) return fallback.rate;

  throw new Error(`Exchange rate not available for ${base} -> ${target}`);
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRateAtPurchase?: number | null
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  // Use the recorded exchange rate at purchase time if available
  if (exchangeRateAtPurchase) {
    return amount * exchangeRateAtPurchase;
  }

  const rate = await fetchExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}
