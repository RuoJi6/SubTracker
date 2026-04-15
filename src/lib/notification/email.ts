import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export async function sendEmail(
  config: EmailConfig,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function buildRenewalEmailHtml(
  subscriptionName: string,
  amount: string,
  renewalDate: string,
  daysUntil: number
): string {
  const urgencyColor = daysUntil === 0 ? '#ff4d4f' : daysUntil === 1 ? '#faad14' : '#1890ff';
  const urgencyText = daysUntil === 0 ? '今天到期' : daysUntil === 1 ? '明天到期' : `${daysUntil}天后到期`;

  return `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 20px;">📢 订阅续费提醒</h2>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="display: inline-block; padding: 4px 12px; border-radius: 12px; background: ${urgencyColor}; color: white; font-size: 13px; margin-bottom: 16px;">
          ${urgencyText}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 80px;">软件名称</td>
            <td style="padding: 8px 0; font-weight: 600;">${subscriptionName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">续费金额</td>
            <td style="padding: 8px 0; font-weight: 600; color: ${urgencyColor};">${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">续费日期</td>
            <td style="padding: 8px 0;">${renewalDate}</td>
          </tr>
        </table>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
          此邮件由 SubTracker 自动发送
        </div>
      </div>
    </div>
  `;
}
