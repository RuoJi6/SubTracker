'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, DatePicker, Switch, Radio, Checkbox, TimePicker, Space,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useI18n } from '@/hooks/useI18n';
import { currencies } from '@/lib/currency';

interface SubscriptionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  initialValues?: Record<string, unknown> | null;
}

const cycleOptions = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'CUSTOM'];
const categoryOptions = ['development', 'design', 'productivity', 'entertainment', 'cloud', 'communication', 'education', 'other'];
const paymentMethodOptions = ['alipay', 'wechat', 'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer', 'crypto'];

function calcNextRenewal(startDate: Dayjs, cycle: string, customDays?: number): Dayjs {
  switch (cycle) {
    case 'WEEKLY': return startDate.add(1, 'week');
    case 'MONTHLY': return startDate.add(1, 'month');
    case 'QUARTERLY': return startDate.add(3, 'month');
    case 'YEARLY': return startDate.add(1, 'year');
    case 'ONE_TIME': return startDate; // No renewal for one-time
    case 'CUSTOM': return startDate.add(customDays || 30, 'day');
    default: return startDate.add(1, 'month');
  }
}

export default function SubscriptionForm({ open, onClose, onSubmit, initialValues }: SubscriptionFormProps) {
  const [form] = Form.useForm();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState('MONTHLY');
  const [customMethods, setCustomMethods] = useState<Array<{ id: string; name: string }>>([]);

  const updateNextRenewal = (newCycle?: string, newStart?: Dayjs, newCustomDays?: number) => {
    const c = newCycle ?? form.getFieldValue('cycle') ?? 'MONTHLY';
    const s = newStart ?? form.getFieldValue('startDate');
    const d = newCustomDays ?? form.getFieldValue('customCycleDays');
    if (s) {
      form.setFieldsValue({ nextRenewalDate: calcNextRenewal(s, c, d) });
    }
  };

  useEffect(() => {
    if (open) {
      fetch('/api/payment-methods')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setCustomMethods(data.data);
        });
    }
  }, [open]);

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        startDate: initialValues.startDate ? dayjs(initialValues.startDate as string) : dayjs(),
        nextRenewalDate: initialValues.nextRenewalDate ? dayjs(initialValues.nextRenewalDate as string) : dayjs().add(1, 'month'),
        notifyDaysBefore: initialValues.notifyDaysBefore || [1],
        notifyTime: initialValues.notifyTime ? dayjs(initialValues.notifyTime as string, 'HH:mm') : dayjs('09:00', 'HH:mm'),
        paymentMethod: initialValues.paymentMethod || undefined,
      });
      setCycle((initialValues.cycle as string) || 'MONTHLY');
    } else if (open) {
      form.resetFields();
      const now = dayjs();
      form.setFieldsValue({
        currency: 'USD',
        cycle: 'MONTHLY',
        isActive: true,
        startDate: now,
        nextRenewalDate: calcNextRenewal(now, 'MONTHLY'),
        notifyDaysBefore: [1],
        notifyTime: dayjs('09:00', 'HH:mm'),
        notifyEnabled: true,
      });
      setCycle('MONTHLY');
    }
  }, [open, initialValues, form]);

  const handleCycleChange = (newCycle: string) => {
    setCycle(newCycle);
    updateNextRenewal(newCycle);
  };

  const handleStartDateChange = (date: Dayjs | null) => {
    if (date) updateNextRenewal(undefined, date);
  };

  const handleCustomDaysChange = (days: number | null) => {
    if (days) updateNextRenewal(undefined, undefined, days);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        paymentMethod: values.paymentMethod || null,
        startDate: (values.startDate as Dayjs).toISOString(),
        nextRenewalDate: (values.nextRenewalDate as Dayjs).toISOString(),
        notifications: values.notifyEnabled
          ? [
              {
                type: 'EMAIL',
                enabled: true,
                daysBefore: values.notifyDaysBefore || [1],
                notifyTime: (values.notifyTime as Dayjs).format('HH:mm'),
              },
              {
                type: 'DINGTALK',
                enabled: true,
                daysBefore: values.notifyDaysBefore || [1],
                notifyTime: (values.notifyTime as Dayjs).format('HH:mm'),
              },
            ]
          : [],
      };

      delete payload.notifyDaysBefore;
      delete payload.notifyTime;
      delete payload.notifyEnabled;

      await onSubmit(payload);
      onClose();
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialValues ? t('subscription.editTitle') : t('subscription.addNew')}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      width={600}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
        <Form.Item name="name" label={t('subscription.name')} rules={[{ required: true }]}>
          <Input placeholder="e.g. GitHub Copilot" />
        </Form.Item>

        <Space style={{ display: 'flex' }} align="start">
          <Form.Item name="amount" label={t('subscription.amount')} rules={[{ required: true }]} style={{ width: 200 }}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="currency" label={t('subscription.currency')} rules={[{ required: true }]} style={{ width: 200 }}>
            <Select
              showSearch
              optionFilterProp="label"
              options={currencies.map((c) => ({
                value: c.code,
                label: `${c.symbol} ${c.code} - ${c.nameZh}`,
              }))}
            />
          </Form.Item>
        </Space>

        <Space style={{ display: 'flex' }} align="start">
          <Form.Item name="cycle" label={t('subscription.cycle')} rules={[{ required: true }]} style={{ width: 200 }}>
            <Radio.Group onChange={(e) => handleCycleChange(e.target.value)}>
              {cycleOptions.map((c) => (
                <Radio.Button key={c} value={c}>
                  {t(`subscription.cycles.${c}`)}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
        </Space>

        {cycle === 'CUSTOM' && (
          <Form.Item name="customCycleDays" label={t('subscription.customDays')} rules={[{ required: true }]}>
            <InputNumber min={1} max={3650} style={{ width: 200 }} onChange={handleCustomDaysChange} />
          </Form.Item>
        )}

        <Space style={{ display: 'flex' }} align="start">
          <Form.Item name="startDate" label={t('subscription.startDate')} rules={[{ required: true }]} style={{ width: 200 }}>
            <DatePicker style={{ width: '100%' }} onChange={handleStartDateChange} />
          </Form.Item>
          {cycle !== 'ONE_TIME' && (
            <Form.Item name="nextRenewalDate" label={t('subscription.nextRenewal')} rules={[{ required: cycle !== 'ONE_TIME' }]} style={{ width: 200 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Space>

        <Form.Item name="category" label={t('subscription.category')}>
          <Select
            allowClear
            options={categoryOptions.map((c) => ({
              value: c,
              label: t(`subscription.categories.${c}`),
            }))}
          />
        </Form.Item>

        <Form.Item name="paymentMethod" label={t('subscription.paymentMethod')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={[
              ...paymentMethodOptions.map((p) => ({
                value: p,
                label: t(`subscription.paymentMethods.${p}`),
              })),
              ...customMethods.map((m) => ({
                value: m.name,
                label: m.name,
              })),
            ]}
          />
        </Form.Item>

        <Form.Item name="url" label={t('subscription.url')}>
          <Input placeholder="https://..." />
        </Form.Item>

        <Form.Item name="description" label={t('subscription.description')}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="notes" label={t('subscription.notes')}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="isActive" label={t('subscription.active')} valuePropName="checked">
          <Switch />
        </Form.Item>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
          <Form.Item name="notifyEnabled" label={t('notification.title')} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="notifyDaysBefore" label={t('notification.daysBefore')}>
            <Checkbox.Group
              options={[
                { label: t('notification.today'), value: 0 },
                { label: t('notification.oneDayBefore'), value: 1 },
                { label: t('notification.twoDaysBefore'), value: 2 },
              ]}
            />
          </Form.Item>

          <Form.Item name="notifyTime" label={t('notification.notifyTime')}>
            <TimePicker format="HH:mm" style={{ width: 200 }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
