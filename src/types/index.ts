export type CycleType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type NotificationType = 'DINGTALK' | 'EMAIL' | 'CALENDAR';

export interface SubscriptionFormData {
  name: string;
  icon?: string;
  description?: string;
  amount: number;
  currency: string;
  cycle: CycleType;
  customCycleDays?: number;
  startDate: string;
  nextRenewalDate: string;
  url?: string;
  category?: string;
  isActive: boolean;
  notes?: string;
}

export interface NotificationConfigData {
  type: NotificationType;
  enabled: boolean;
  daysBefore: number[];
  notifyTime: string;
}

export interface GlobalSettingsData {
  displayCurrency: string;
  language: string;
  dingtalkWebhook?: string;
  dingtalkSecret?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  emailFrom?: string;
  emailTo?: string;
  timezone: string;
}

export interface ExchangeRateData {
  base: string;
  target: string;
  rate: number;
  date: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  nameZh: string;
  symbol: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
