import { prisma } from './prisma';
import { fetchExchangeRate } from './exchange-rate';
import { calcNextRenewalDate } from './currency';

/**
 * Check for subscriptions whose nextRenewalDate has passed,
 * advance them to the next cycle, and refresh exchange rates.
 */
export async function advanceExpiredRenewals(): Promise<{
  advanced: number;
  ratesUpdated: number;
  errors: string[];
}> {
  const result = { advanced: 0, ratesUpdated: 0, errors: [] as string[] };

  try {
    const now = new Date();

    const expiredSubs = await prisma.subscription.findMany({
      where: {
        isActive: true,
        nextRenewalDate: { lte: now },
        NOT: { cycle: 'ONE_TIME' },
      },
    });

    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'global' },
    });
    const displayCurrency = settings?.displayCurrency || 'CNY';

    for (const sub of expiredSubs) {
      try {
        // Advance nextRenewalDate until it's in the future
        let nextDate = new Date(sub.nextRenewalDate);
        while (nextDate <= now) {
          nextDate = calcNextRenewalDate(nextDate, sub.cycle, sub.customCycleDays, sub.cycleMultiplier);
        }

        // Refresh exchange rate if currencies differ
        let newRate = sub.exchangeRateAtPurchase;
        if (sub.currency !== displayCurrency) {
          try {
            newRate = await fetchExchangeRate(sub.currency, displayCurrency);
            result.ratesUpdated++;
          } catch (err) {
            result.errors.push(`Rate fetch failed for ${sub.name}: ${err}`);
            // Keep old rate if fetch fails
          }
        }

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            nextRenewalDate: nextDate,
            exchangeRateAtPurchase: newRate,
          },
        });

        result.advanced++;
      } catch (err) {
        result.errors.push(`Failed to advance ${sub.name}: ${err}`);
      }
    }
  } catch (error) {
    result.errors.push(`Renewal advance error: ${error}`);
  }

  return result;
}
