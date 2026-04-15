import crypto from 'crypto';

interface DingTalkMessage {
  msgtype: 'text' | 'markdown';
  text?: { content: string };
  markdown?: { title: string; text: string };
}

function generateSign(secret: string, timestamp: number): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return encodeURIComponent(hmac.digest('base64'));
}

export async function sendDingTalkMessage(
  webhook: string,
  secret: string | null,
  message: DingTalkMessage
): Promise<boolean> {
  try {
    let url = webhook;

    if (secret) {
      const timestamp = Date.now();
      const sign = generateSign(secret, timestamp);
      url += `&timestamp=${timestamp}&sign=${sign}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data = await res.json();
    if (data.errcode !== 0) {
      console.error('DingTalk send failed:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('DingTalk send error:', error);
    return false;
  }
}

export function buildRenewalMessage(
  subscriptionName: string,
  amount: string,
  renewalDate: string,
  daysUntil: number
): DingTalkMessage {
  const urgency = daysUntil === 0 ? '🔴 今天' : daysUntil === 1 ? '🟡 明天' : `📅 ${daysUntil}天后`;

  return {
    msgtype: 'markdown',
    markdown: {
      title: `订阅续费提醒 - ${subscriptionName}`,
      text: [
        `### 📢 订阅续费提醒`,
        ``,
        `**软件名称**: ${subscriptionName}`,
        `**续费金额**: ${amount}`,
        `**续费日期**: ${renewalDate}`,
        `**距离续费**: ${urgency}`,
        ``,
        `> 请及时处理您的订阅续费`,
      ].join('\n'),
    },
  };
}
