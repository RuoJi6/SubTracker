// Placeholder keys available for notification templates
export const TEMPLATE_PLACEHOLDERS = [
  'name', 'amount', 'renewalDate', 'daysUntil', 'urgency', 'cycle', 'category', 'paymentMethod', 'autoRenew',
] as const;

export type TemplatePlaceholder = typeof TEMPLATE_PLACEHOLDERS[number];

export interface TemplateData {
  name: string;
  amount: string;
  renewalDate: string;
  daysUntil: number;
  urgency: string;
  cycle: string;
  category: string;
  paymentMethod: string;
  autoRenew?: string;
}

export const SAMPLE_DATA: TemplateData = {
  name: 'ChatGPT Plus',
  amount: '$20.00',
  renewalDate: '2026-05-01',
  daysUntil: 3,
  urgency: '📅 3天后',
  cycle: '月付',
  category: '开发工具',
  paymentMethod: '信用卡',
  autoRenew: '自动续费',
};

export const DEFAULT_DINGTALK_TEMPLATE = `### 📢 订阅续费提醒

**软件名称**: {name}
**续费金额**: {amount}
**续费日期**: {renewalDate}
**距离续费**: {urgency}
**计费周期**: {cycle}
**分类**: {category}
**支付方式**: {paymentMethod}

> 请及时处理您的订阅续费`;

export const DEFAULT_EMAIL_TEMPLATE = `<div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h2 style="color: white; margin: 0; font-size: 20px;">📢 订阅续费提醒</h2>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="display: inline-block; padding: 4px 12px; border-radius: 12px; background: #1890ff; color: white; font-size: 13px; margin-bottom: 16px;">
      {urgency}
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666; width: 80px;">软件名称</td><td style="padding: 8px 0; font-weight: 600;">{name}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">续费金额</td><td style="padding: 8px 0; font-weight: 600; color: #1890ff;">{amount}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">续费日期</td><td style="padding: 8px 0;">{renewalDate}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">计费周期</td><td style="padding: 8px 0;">{cycle}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">分类</td><td style="padding: 8px 0;">{category}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">支付方式</td><td style="padding: 8px 0;">{paymentMethod}</td></tr>
    </table>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
      此邮件由 SubTracker 自动发送
    </div>
  </div>
</div>`;

export const DEFAULT_CALENDAR_TITLE = `🔔 {name} 续费`;

export const DEFAULT_CALENDAR_DESC = `📋 订阅续费提醒
💰 金额: {amount}
🔄 周期: {cycle}
📌 续费方式: {autoRenew}
📂 分类: {category}
💳 支付方式: {paymentMethod}`;

export function renderTemplate(template: string, data: TemplateData): string {
  let result = template;
  for (const key of TEMPLATE_PLACEHOLDERS) {
    result = result.replaceAll(`{${key}}`, String(data[key] ?? ''));
  }
  return result;
}

// Server-side translation maps for categories and payment methods
const categoryMap: Record<string, Record<string, string>> = {
  zh: { development: '开发工具', design: '设计', productivity: '效率工具', entertainment: '娱乐', cloud: '云服务', communication: '通讯', education: '教育', other: '其他' },
  en: { development: 'Development', design: 'Design', productivity: 'Productivity', entertainment: 'Entertainment', cloud: 'Cloud', communication: 'Communication', education: 'Education', other: 'Other' },
};

const paymentMethodMap: Record<string, Record<string, string>> = {
  zh: { alipay: '支付宝', wechat: '微信支付', credit_card: '信用卡', debit_card: '借记卡', paypal: 'PayPal', apple_pay: 'Apple Pay', google_pay: 'Google Pay', bank_transfer: '银行转账', crypto: '加密货币' },
  en: { alipay: 'Alipay', wechat: 'WeChat Pay', credit_card: 'Credit Card', debit_card: 'Debit Card', paypal: 'PayPal', apple_pay: 'Apple Pay', google_pay: 'Google Pay', bank_transfer: 'Bank Transfer', crypto: 'Cryptocurrency' },
};

/** Translate a category key to a display label */
export function translateCategory(key: string, lang: string): string {
  return categoryMap[lang]?.[key] ?? categoryMap['en']?.[key] ?? key;
}

/** Translate a payment method key to a display label */
export function translatePaymentMethod(key: string, lang: string): string {
  return paymentMethodMap[lang]?.[key] ?? paymentMethodMap['en']?.[key] ?? key;
}
