import { NextRequest, NextResponse } from 'next/server';
import { sendDingTalkMessage } from '@/lib/notification/dingtalk';
import { sendEmail } from '@/lib/notification/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'dingtalk') {
      const { webhook, secret } = body;
      if (!webhook) {
        return NextResponse.json({ success: false, error: 'Webhook URL is required' }, { status: 400 });
      }

      const ok = await sendDingTalkMessage(webhook, secret || null, {
        msgtype: 'markdown',
        markdown: {
          title: '🔔 SubTracker 连接测试',
          text: [
            '### ✅ SubTracker 连接测试成功',
            '',
            '钉钉机器人配置正确，可以正常接收订阅续费提醒。',
            '',
            `> 测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
          ].join('\n'),
        },
      });

      if (ok) {
        return NextResponse.json({ success: true, message: 'DingTalk test message sent' });
      }
      return NextResponse.json({ success: false, error: 'Failed to send DingTalk message. Check webhook URL and secret.' }, { status: 500 });
    }

    if (type === 'email') {
      const { smtpHost, smtpPort, smtpUser, smtpPass, emailFrom, emailTo } = body;
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !emailFrom || !emailTo) {
        return NextResponse.json({ success: false, error: 'All SMTP fields are required' }, { status: 400 });
      }

      const html = `
        <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: linear-gradient(135deg, #52c41a 0%, #1890ff 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 20px;">✅ SubTracker 连接测试</h2>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 12px;">邮件推送配置正确！</p>
            <p style="color: #666; font-size: 14px; margin: 0;">您可以正常接收订阅续费提醒邮件。</p>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; color: #999; font-size: 12px;">
              测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
            </div>
          </div>
        </div>
      `;

      const ok = await sendEmail(
        { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from: emailFrom, to: emailTo },
        '🔔 SubTracker 连接测试',
        html
      );

      if (ok) {
        return NextResponse.json({ success: true, message: 'Test email sent' });
      }
      return NextResponse.json({ success: false, error: 'Failed to send email. Check SMTP configuration.' }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: 'Invalid type. Use "dingtalk" or "email".' }, { status: 400 });
  } catch (error) {
    console.error('Notification test error:', error);
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
  }
}
