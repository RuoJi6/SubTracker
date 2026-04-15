import { prisma } from './prisma';

const FRANKFURTER_API = 'https://api.frankfurter.app';

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

  // Fetch from API
  try {
    const endpoint = date ? `/${date}` : '/latest';
    const res = await fetch(
      `${FRANKFURTER_API}${endpoint}?from=${base}&to=${target}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      throw new Error(`Exchange rate API error: ${res.status}`);
    }

    const data = await res.json();
    const rate = data.rates[target];

    if (!rate) {
      throw new Error(`Rate not found for ${base} -> ${target}`);
    }

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
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    // Fallback: try to find most recent cached rate
    const fallback = await prisma.exchangeRateCache.findFirst({
      where: { baseCurrency: base, targetCurrency: target },
      orderBy: { date: 'desc' },
    });
    if (fallback) return fallback.rate;
    throw error;
  }
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
