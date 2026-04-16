import { CurrencyOption } from '@/types';

export const currencies: CurrencyOption[] = [
  { code: 'CNY', name: 'Chinese Yuan', nameZh: '人民币', symbol: '¥' },
  { code: 'USD', name: 'US Dollar', nameZh: '美元', symbol: '$' },
  { code: 'EUR', name: 'Euro', nameZh: '欧元', symbol: '€' },
  { code: 'GBP', name: 'British Pound', nameZh: '英镑', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', nameZh: '日元', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', nameZh: '韩元', symbol: '₩' },
  { code: 'HKD', name: 'Hong Kong Dollar', nameZh: '港币', symbol: 'HK$' },
  { code: 'TWD', name: 'Taiwan Dollar', nameZh: '新台币', symbol: 'NT$' },
  { code: 'SGD', name: 'Singapore Dollar', nameZh: '新加坡元', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', nameZh: '澳元', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', nameZh: '加元', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', nameZh: '瑞士法郎', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', nameZh: '印度卢比', symbol: '₹' },
  { code: 'RUB', name: 'Russian Ruble', nameZh: '俄罗斯卢布', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', nameZh: '巴西雷亚尔', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', nameZh: '墨西哥比索', symbol: 'Mex$' },
  { code: 'THB', name: 'Thai Baht', nameZh: '泰铢', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', nameZh: '土耳其里拉', symbol: '₺' },
  // Additional frankfurter.app supported currencies
  { code: 'NZD', name: 'New Zealand Dollar', nameZh: '新西兰元', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', nameZh: '瑞典克朗', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', nameZh: '挪威克朗', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', nameZh: '丹麦克朗', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', nameZh: '波兰兹罗提', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', nameZh: '捷克克朗', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', nameZh: '匈牙利福林', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', nameZh: '罗马尼亚列伊', symbol: 'lei' },
  { code: 'ISK', name: 'Icelandic Króna', nameZh: '冰岛克朗', symbol: 'kr' },
  { code: 'ILS', name: 'Israeli Shekel', nameZh: '以色列谢克尔', symbol: '₪' },
  { code: 'IDR', name: 'Indonesian Rupiah', nameZh: '印尼盾', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', nameZh: '马来西亚林吉特', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', nameZh: '菲律宾比索', symbol: '₱' },
  { code: 'ZAR', name: 'South African Rand', nameZh: '南非兰特', symbol: 'R' },
  // Other common currencies (not in frankfurter.app)
  { code: 'AED', name: 'UAE Dirham', nameZh: '阿联酋迪拉姆', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', nameZh: '沙特里亚尔', symbol: '﷼' },
  { code: 'VND', name: 'Vietnamese Dong', nameZh: '越南盾', symbol: '₫' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', nameZh: '乌克兰格里夫纳', symbol: '₴' },
  { code: 'ARS', name: 'Argentine Peso', nameZh: '阿根廷比索', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', nameZh: '智利比索', symbol: 'CLP$' },
  { code: 'COP', name: 'Colombian Peso', nameZh: '哥伦比亚比索', symbol: 'COL$' },
  { code: 'EGP', name: 'Egyptian Pound', nameZh: '埃及镑', symbol: 'E£' },
  { code: 'NGN', name: 'Nigerian Naira', nameZh: '尼日利亚奈拉', symbol: '₦' },
  { code: 'PKR', name: 'Pakistani Rupee', nameZh: '巴基斯坦卢比', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', nameZh: '孟加拉塔卡', symbol: '৳' },
  { code: 'KES', name: 'Kenyan Shilling', nameZh: '肯尼亚先令', symbol: 'KSh' },
];

export function getCurrencySymbol(code: string): string {
  return currencies.find((c) => c.code === code)?.symbol || code;
}

export function formatAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toFixed(2);
  return `${symbol}${formatted}`;
}

export function getCycleLabel(cycle: string, lang: string = 'zh'): string {
  const labels: Record<string, Record<string, string>> = {
    WEEKLY: { zh: '每周', en: 'Weekly' },
    MONTHLY: { zh: '每月', en: 'Monthly' },
    QUARTERLY: { zh: '每季度', en: 'Quarterly' },
    YEARLY: { zh: '每年', en: 'Yearly' },
    ONE_TIME: { zh: '买断', en: 'One-time' },
    CUSTOM: { zh: '固定期限', en: 'Fixed Period' },
  };
  return labels[cycle]?.[lang] || cycle;
}

export function getCycleDays(cycle: string, customDays?: number): number {
  switch (cycle) {
    case 'WEEKLY': return 7;
    case 'MONTHLY': return 30;
    case 'QUARTERLY': return 90;
    case 'YEARLY': return 365;
    case 'ONE_TIME': return 0;
    case 'CUSTOM': return customDays || 30;
    default: return 30;
  }
}

/**
 * Calculate the next renewal date from a given date based on cycle type.
 * Advances by one cycle period.
 */
export function calcNextRenewalDate(
  fromDate: Date,
  cycle: string,
  customCycleDays?: number | null
): Date {
  const d = new Date(fromDate);
  switch (cycle) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'CUSTOM':
      d.setDate(d.getDate() + (customCycleDays || 30));
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}
