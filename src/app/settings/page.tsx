'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, Typography, Divider, Space, Alert, Popconfirm, App, Tag, Empty } from 'antd';
import { CopyOutlined, ReloadOutlined, PlusOutlined, WalletOutlined, SendOutlined } from '@ant-design/icons';
import { useI18n } from '@/hooks/useI18n';
import { currencies } from '@/lib/currency';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calendarToken, setCalendarToken] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);
  const [testingDingtalk, setTestingDingtalk] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const { message } = App.useApp();

  const calendarUrl = typeof window !== 'undefined' && calendarToken
    ? `${window.location.origin}/api/calendar?token=${calendarToken}`
    : '';

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          form.setFieldsValue(data.data);
          if (data.data.calendarToken) {
            setCalendarToken(data.data.calendarToken);
          }
        }
      });
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPaymentMethods(data.data);
      });
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success(t('settings.saved'));
      } else {
        message.error(data.error || t('common.error'));
      }
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateCalendarToken: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCalendarToken(data.data.calendarToken);
        message.success(t('settings.tokenRegenerated'));
      } else {
        message.error(data.error || t('common.error'));
      }
    } catch {
      message.error(t('common.error'));
    } finally {
      setRegenerating(false);
    }
  };

  const copyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    message.success('URL copied!');
  };

  const addPaymentMethod = async () => {
    const name = newMethodName.trim();
    if (!name) return;
    setAddingMethod(true);
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods((prev) => [...prev, data.data]);
        setNewMethodName('');
        message.success(t('settings.paymentMethodAdded'));
      } else if (res.status === 409) {
        message.error(t('settings.paymentMethodExists'));
      } else {
        message.error(data.error || t('common.error'));
      }
    } catch {
      message.error(t('common.error'));
    } finally {
      setAddingMethod(false);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
        message.success(t('settings.paymentMethodDeleted'));
      } else {
        message.error(data.error || t('common.error'));
      }
    } catch {
      message.error(t('common.error'));
    }
  };

  const testDingtalk = async () => {
    const values = form.getFieldsValue();
    if (!values.dingtalkWebhook) {
      message.error(t('settings.testFailed'));
      return;
    }
    setTestingDingtalk(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dingtalk', webhook: values.dingtalkWebhook, secret: values.dingtalkSecret }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(t('settings.testSuccess'));
      } else {
        message.error(data.error || t('settings.testFailed'));
      }
    } catch {
      message.error(t('settings.testFailed'));
    } finally {
      setTestingDingtalk(false);
    }
  };

  const testEmail = async () => {
    const values = form.getFieldsValue();
    if (!values.smtpHost || !values.smtpPort || !values.smtpUser || !values.smtpPass || !values.emailFrom || !values.emailTo) {
      message.error(t('settings.testFailed'));
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          smtpUser: values.smtpUser,
          smtpPass: values.smtpPass,
          emailFrom: values.emailFrom,
          emailTo: values.emailTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(t('settings.testSuccess'));
      } else {
        message.error(data.error || t('settings.testFailed'));
      }
    } catch {
      message.error(t('settings.testFailed'));
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>{t('settings.title')}</Title>

      <Form form={form} layout="vertical">
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>{t('settings.title')}</Title>
          <Space style={{ display: 'flex', flexWrap: 'wrap' }} size="large">
            <Form.Item name="displayCurrency" label={t('settings.displayCurrency')} style={{ minWidth: 200 }}>
              <Select
                showSearch
                optionFilterProp="label"
                options={currencies.map((c) => ({
                  value: c.code,
                  label: `${c.symbol} ${c.code} - ${c.nameZh}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="language" label={t('settings.language')} style={{ minWidth: 200 }}>
              <Select
                options={[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Form.Item>
            <Form.Item name="timezone" label={t('settings.timezone')} style={{ minWidth: 200 }}>
              <Select
                showSearch
                options={[
                  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
                  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
                  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
                  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
                  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
                  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1)' },
                ]}
              />
            </Form.Item>
          </Space>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>{t('settings.dingtalkConfig')}</Title>
            <Button
              icon={<SendOutlined />}
              onClick={testDingtalk}
              loading={testingDingtalk}
              size="small"
            >
              {t('settings.testConnection')}
            </Button>
          </div>
          <Form.Item name="dingtalkWebhook" label={t('notification.webhook')}>
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
          </Form.Item>
          <Form.Item name="dingtalkSecret" label={t('notification.secret')}>
            <Input.Password placeholder="SEC..." />
          </Form.Item>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>{t('settings.emailConfig')}</Title>
            <Button
              icon={<SendOutlined />}
              onClick={testEmail}
              loading={testingEmail}
              size="small"
            >
              {t('settings.testConnection')}
            </Button>
          </div>
          <Space style={{ display: 'flex', flexWrap: 'wrap' }} size="large">
            <Form.Item name="smtpHost" label={t('settings.smtpHost')} style={{ minWidth: 200 }}>
              <Input placeholder="smtp.gmail.com" />
            </Form.Item>
            <Form.Item name="smtpPort" label={t('settings.smtpPort')} style={{ minWidth: 120 }}>
              <InputNumber placeholder="465" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex', flexWrap: 'wrap' }} size="large">
            <Form.Item name="smtpUser" label={t('settings.smtpUser')} style={{ minWidth: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="smtpPass" label={t('settings.smtpPass')} style={{ minWidth: 200 }}>
              <Input.Password />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex', flexWrap: 'wrap' }} size="large">
            <Form.Item name="emailFrom" label={t('settings.emailFrom')} style={{ minWidth: 200 }}>
              <Input placeholder="noreply@example.com" />
            </Form.Item>
            <Form.Item name="emailTo" label={t('settings.emailTo')} style={{ minWidth: 200 }}>
              <Input placeholder="you@example.com" />
            </Form.Item>
          </Space>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>{t('notification.calendar')}</Title>
          <Alert
            type="info"
            title={t('notification.calendarHelp')}
            style={{ marginBottom: 12 }}
          />
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('settings.calendarTokenTip')}</Text>
          </div>
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={calendarUrl}
                readOnly
              />
              <Button icon={<CopyOutlined />} onClick={copyCalendarUrl} />
            </Space.Compact>
            <Popconfirm
              title={t('settings.regenerateConfirm')}
              onConfirm={regenerateToken}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button
                icon={<ReloadOutlined />}
                loading={regenerating}
                danger
                size="small"
              >
                {t('settings.regenerateToken')}
              </Button>
            </Popconfirm>
          </Space>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Title level={5}><WalletOutlined /> {t('settings.paymentMethods')}</Title>
          <div style={{ marginBottom: 12 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 400 }}>
              <Input
                placeholder={t('settings.paymentMethodName')}
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                onPressEnter={addPaymentMethod}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addPaymentMethod}
                loading={addingMethod}
              >
                {t('settings.addPaymentMethod')}
              </Button>
            </Space.Compact>
          </div>
          {paymentMethods.length === 0 ? (
            <Empty description={t('settings.noCustomPaymentMethods')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {paymentMethods.map((m) => (
                <Popconfirm
                  key={m.id}
                  title={t('settings.deletePaymentMethodConfirm')}
                  onConfirm={() => deletePaymentMethod(m.id)}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                >
                  <Tag
                    closable
                    onClose={(e) => e.preventDefault()}
                    color="purple"
                    style={{ cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}
                  >
                    <WalletOutlined /> {m.name}
                  </Tag>
                </Popconfirm>
              ))}
            </div>
          )}
        </Card>

        <Divider />
        <Button type="primary" onClick={handleSave} loading={loading} size="large">
          {t('common.save')}
        </Button>
      </Form>
    </div>
  );
}
