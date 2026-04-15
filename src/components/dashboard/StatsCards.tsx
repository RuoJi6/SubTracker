'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Row, Col, Card, Statistic, Tag, Typography, Spin, Modal, Table, Descriptions } from 'antd';
import {
  DollarOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  ShoppingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import dayjs from 'dayjs';
import { useI18n } from '@/hooks/useI18n';
import { getCurrencySymbol, getCycleLabel } from '@/lib/currency';

const { Text } = Typography;

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  customCycleDays?: number | null;
  nextRenewalDate: string;
  startDate: string;
  isActive: boolean;
  category?: string | null;
  paymentMethod?: string | null;
  url?: string | null;
  description?: string | null;
  notes?: string | null;
  exchangeRateAtPurchase?: number | null;
}

interface Settings {
  displayCurrency: string;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'];

function convertAmount(amount: number, currency: string, displayCurrency: string, rate?: number | null): number {
  if (currency === displayCurrency) return amount;
  if (rate) return amount * rate;
  return amount;
}

export default function StatsCards() {
  const { t, locale } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<Settings>({ displayCurrency: 'CNY' });
  const [loading, setLoading] = useState(true);
  const [breakdownType, setBreakdownType] = useState<'monthly' | 'yearly' | 'onetime' | null>(null);
  const [detailSub, setDetailSub] = useState<Subscription | null>(null);
  const [showActiveList, setShowActiveList] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions?active=true').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([subsData, settingsData]) => {
      if (subsData.success) setSubscriptions(subsData.data);
      if (settingsData.success) setSettings(settingsData.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const displayCurrency = settings.displayCurrency || 'CNY';
  const symbol = getCurrencySymbol(displayCurrency);

  // Split subscriptions: recurring vs one-time
  const recurring = useMemo(() => subscriptions.filter(s => s.cycle !== 'ONE_TIME'), [subscriptions]);
  const oneTime = useMemo(() => subscriptions.filter(s => s.cycle === 'ONE_TIME'), [subscriptions]);

  // Recurring breakdown
  const breakdownData = useMemo(() => recurring.map((sub) => {
    let monthlyAmount = sub.amount;
    switch (sub.cycle) {
      case 'WEEKLY': monthlyAmount = sub.amount * 4.33; break;
      case 'QUARTERLY': monthlyAmount = sub.amount / 3; break;
      case 'YEARLY': monthlyAmount = sub.amount / 12; break;
    }
    if (sub.currency !== displayCurrency && sub.exchangeRateAtPurchase) {
      monthlyAmount *= sub.exchangeRateAtPurchase;
    }
    return {
      key: sub.id,
      name: sub.name,
      originalAmount: sub.amount,
      originalCurrency: sub.currency,
      cycle: sub.cycle,
      monthly: monthlyAmount,
      yearly: monthlyAmount * 12,
    };
  }).sort((a, b) => b.monthly - a.monthly), [recurring, displayCurrency]);

  // One-time breakdown
  const oneTimeData = useMemo(() => oneTime.map((sub) => {
    const converted = convertAmount(sub.amount, sub.currency, displayCurrency, sub.exchangeRateAtPurchase);
    return {
      key: sub.id,
      name: sub.name,
      originalAmount: sub.amount,
      originalCurrency: sub.currency,
      cycle: sub.cycle,
      converted,
      date: sub.startDate,
    };
  }).sort((a, b) => b.converted - a.converted), [oneTime, displayCurrency]);

  const monthlyTotal = breakdownData.reduce((sum, d) => sum + d.monthly, 0);
  const yearlyTotal = monthlyTotal * 12;
  const oneTimeTotal = oneTimeData.reduce((sum, d) => sum + d.converted, 0);

  // Upcoming renewals (within 7 days, recurring only)
  const upcoming = recurring
    .filter((s) => {
      const days = dayjs(s.nextRenewalDate).diff(dayjs(), 'day');
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => dayjs(a.nextRenewalDate).diff(dayjs(b.nextRenewalDate)));

  // Expired subscriptions (nextRenewalDate in the past, recurring only)
  const expired = recurring
    .filter((s) => dayjs(s.nextRenewalDate).isBefore(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.nextRenewalDate).diff(dayjs(b.nextRenewalDate)));

  // Non-expired active subscriptions (for the active count card)
  const nonExpired = subscriptions.filter((s) =>
    s.cycle === 'ONE_TIME' || !dayjs(s.nextRenewalDate).isBefore(dayjs(), 'day')
  );
  const activeCount = nonExpired.length;

  // Pie chart data: monthly cost by subscription
  const pieData = useMemo(() => breakdownData
    .filter(d => d.monthly > 0)
    .slice(0, 10)
    .map(d => ({ name: d.name, value: Math.round(d.monthly * 100) / 100 }))
  , [breakdownData]);

  // Bar chart data: monthly costs by category (next 6 months estimated)
  const barData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = dayjs();
    for (let i = 0; i < 6; i++) {
      const m = now.add(i, 'month');
      months.push({ month: m.format('YYYY-MM'), amount: monthlyTotal });
    }
    return months;
  }, [monthlyTotal]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => setBreakdownType('monthly')} style={{ cursor: 'pointer' }}>
            <Statistic
              title={t('dashboard.totalMonthly')}
              value={monthlyTotal}
              precision={2}
              prefix={<><DollarOutlined /> {symbol}</>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => setBreakdownType('yearly')} style={{ cursor: 'pointer' }}>
            <Statistic
              title={t('dashboard.totalYearly')}
              value={yearlyTotal}
              precision={2}
              prefix={<><RiseOutlined /> {symbol}</>}
            />
          </Card>
        </Col>
        {oneTime.length > 0 && (
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable onClick={() => setBreakdownType('onetime')} style={{ cursor: 'pointer' }}>
              <Statistic
                title={t('dashboard.totalOneTime')}
                value={oneTimeTotal}
                precision={2}
                prefix={<><ShoppingOutlined /> {symbol}</>}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => setShowActiveList(true)} style={{ cursor: 'pointer' }}>
            <Statistic
              title={t('dashboard.activeCount')}
              value={activeCount}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.upcomingRenewals')}
              value={upcoming.length}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: upcoming.length > 0 ? '#faad14' : '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      {recurring.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title={t('dashboard.expenseChart')}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${symbol}${Number(value).toFixed(2)}`, locale === 'zh' ? '预估花费' : 'Estimated']} />
                  <Bar dataKey="amount" fill="#1890ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={locale === 'zh' ? '订阅费用占比' : 'Expense Distribution'}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={(props) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${symbol}${Number(value).toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      {/* Upcoming renewals */}
      {upcoming.length > 0 && (
        <Card title={t('dashboard.upcomingRenewals')} style={{ marginTop: 16 }}>
          {upcoming.map((sub) => {
            const days = dayjs(sub.nextRenewalDate).diff(dayjs(), 'day');
            return (
              <div
                key={sub.id}
                onClick={() => setDetailSub(sub)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <Text strong>{sub.name}</Text>
                  <br />
                  <Text type="secondary">
                    {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)} · {dayjs(sub.nextRenewalDate).format('YYYY-MM-DD')}
                  </Text>
                </div>
                <Tag color={days <= 0 ? 'red' : days <= 3 ? 'orange' : 'blue'}>
                  {days <= 0 ? (locale === 'zh' ? '今天到期' : 'Due today') : `${days}d`}
                </Tag>
              </div>
            );
          })}
        </Card>
      )}

      {/* Expired subscriptions */}
      {expired.length > 0 && (
        <Card
          title={<><WarningOutlined style={{ color: '#f5222d', marginRight: 8 }} />{t('dashboard.expiredSubscriptions')}</>}
          style={{ marginTop: 16, borderColor: '#ffccc7' }}
        >
          {expired.map((sub) => {
            const days = dayjs().diff(dayjs(sub.nextRenewalDate), 'day');
            return (
              <div
                key={sub.id}
                onClick={() => setDetailSub(sub)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fff2f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <Text strong>{sub.name}</Text>
                  <br />
                  <Text type="secondary">
                    {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)} · {locale === 'zh' ? '到期' : 'Expired'}: {dayjs(sub.nextRenewalDate).format('YYYY-MM-DD')}
                  </Text>
                </div>
                <Tag color="red">
                  {locale === 'zh' ? `已过期 ${days} 天` : `${days}d overdue`}
                </Tag>
              </div>
            );
          })}
        </Card>
      )}

      {/* Breakdown Modal */}
      <Modal
        open={breakdownType !== null}
        onCancel={() => setBreakdownType(null)}
        footer={null}
        title={
          breakdownType === 'monthly' ? t('dashboard.totalMonthly')
            : breakdownType === 'yearly' ? t('dashboard.totalYearly')
              : t('dashboard.totalOneTime')
        }
        width={640}
      >
        {breakdownType === 'onetime' ? (
          <Table
            dataSource={oneTimeData}
            pagination={false}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>{locale === 'zh' ? '合计' : 'Total'}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3}>
                  <Text strong style={{ color: '#1890ff' }}>{symbol}{oneTimeTotal.toFixed(2)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            columns={[
              {
                title: t('subscription.name'),
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: locale === 'zh' ? '原始金额' : 'Original',
                key: 'original',
                render: (_: unknown, record: typeof oneTimeData[0]) => (
                  <Text>{getCurrencySymbol(record.originalCurrency)}{record.originalAmount.toFixed(2)}</Text>
                ),
              },
              {
                title: locale === 'zh' ? '购买日期' : 'Date',
                key: 'date',
                render: (_: unknown, record: typeof oneTimeData[0]) => (
                  <Text>{dayjs(record.date).format('YYYY-MM-DD')}</Text>
                ),
              },
              {
                title: locale === 'zh' ? '折算金额' : 'Converted',
                key: 'converted',
                sorter: (a: typeof oneTimeData[0], b: typeof oneTimeData[0]) => a.converted - b.converted,
                defaultSortOrder: 'descend' as const,
                render: (_: unknown, record: typeof oneTimeData[0]) => (
                  <Text style={{ color: '#1890ff', fontWeight: 600 }}>{symbol}{record.converted.toFixed(2)}</Text>
                ),
              },
            ]}
          />
        ) : (
          <Table
            dataSource={breakdownData}
            pagination={false}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>{locale === 'zh' ? '合计' : 'Total'}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3}>
                  <Text strong style={{ color: '#1890ff' }}>
                    {symbol}{(breakdownType === 'monthly' ? monthlyTotal : yearlyTotal).toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
            columns={[
              {
                title: t('subscription.name'),
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: locale === 'zh' ? '原始金额' : 'Original',
                key: 'original',
                render: (_: unknown, record: typeof breakdownData[0]) => (
                  <Text>{getCurrencySymbol(record.originalCurrency)}{record.originalAmount.toFixed(2)}</Text>
                ),
              },
              {
                title: t('subscription.cycle'),
                dataIndex: 'cycle',
                key: 'cycle',
                render: (cycle: string) => <Tag>{getCycleLabel(cycle, locale)}</Tag>,
              },
              {
                title: breakdownType === 'monthly' ? t('dashboard.totalMonthly') : t('dashboard.totalYearly'),
                key: 'converted',
                sorter: (a: typeof breakdownData[0], b: typeof breakdownData[0]) =>
                  breakdownType === 'monthly' ? a.monthly - b.monthly : a.yearly - b.yearly,
                defaultSortOrder: 'descend' as const,
                render: (_: unknown, record: typeof breakdownData[0]) => (
                  <Text style={{ color: '#1890ff', fontWeight: 600 }}>
                    {symbol}{(breakdownType === 'monthly' ? record.monthly : record.yearly).toFixed(2)}
                  </Text>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* Subscription Detail Modal */}
      <Modal
        open={detailSub !== null}
        onCancel={() => setDetailSub(null)}
        footer={null}
        title={detailSub?.name || ''}
        width={560}
      >
        {detailSub && (
          <Descriptions column={2} bordered size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label={t('subscription.amount')} span={1}>
              <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                {getCurrencySymbol(detailSub.currency)}{detailSub.amount.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('subscription.currency')} span={1}>
              {detailSub.currency}
            </Descriptions.Item>
            <Descriptions.Item label={t('subscription.cycle')} span={1}>
              <Tag color="blue">{getCycleLabel(detailSub.cycle, locale)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('subscription.active')} span={1}>
              <Tag color={detailSub.isActive ? 'green' : 'default'}>
                {detailSub.isActive ? (locale === 'zh' ? '活跃' : 'Active') : (locale === 'zh' ? '停用' : 'Inactive')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('subscription.startDate')} span={1}>
              {dayjs(detailSub.startDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            {detailSub.cycle !== 'ONE_TIME' && (
              <Descriptions.Item label={t('subscription.nextRenewal')} span={1}>
                <Text style={{ color: dayjs(detailSub.nextRenewalDate).isBefore(dayjs()) ? '#f5222d' : undefined }}>
                  {dayjs(detailSub.nextRenewalDate).format('YYYY-MM-DD')}
                </Text>
              </Descriptions.Item>
            )}
            {detailSub.category && (
              <Descriptions.Item label={t('subscription.category')} span={1}>
                <Tag>{t(`subscription.categories.${detailSub.category}`)}</Tag>
              </Descriptions.Item>
            )}
            {detailSub.paymentMethod && (
              <Descriptions.Item label={t('subscription.paymentMethod')} span={1}>
                {detailSub.paymentMethod}
              </Descriptions.Item>
            )}
            {detailSub.exchangeRateAtPurchase && detailSub.currency !== displayCurrency && (
              <Descriptions.Item label={locale === 'zh' ? '折算金额' : 'Converted'} span={1}>
                <Text strong>
                  {symbol}{(detailSub.amount * detailSub.exchangeRateAtPurchase).toFixed(2)}
                </Text>
              </Descriptions.Item>
            )}
            {detailSub.url && (
              <Descriptions.Item label={t('subscription.url')} span={2}>
                <a href={detailSub.url} target="_blank" rel="noopener noreferrer">{detailSub.url}</a>
              </Descriptions.Item>
            )}
            {detailSub.description && (
              <Descriptions.Item label={t('subscription.description')} span={2}>
                {detailSub.description}
              </Descriptions.Item>
            )}
            {detailSub.notes && (
              <Descriptions.Item label={t('subscription.notes')} span={2}>
                {detailSub.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Active Subscriptions List Modal */}
      <Modal
        open={showActiveList}
        onCancel={() => setShowActiveList(false)}
        footer={null}
        title={`${t('dashboard.activeCount')} (${activeCount})`}
        width={700}
      >
        <Table
          dataSource={nonExpired.map(s => ({ ...s, key: s.id }))}
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => { setShowActiveList(false); setDetailSub(record as Subscription); },
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: t('subscription.name'),
              dataIndex: 'name',
              key: 'name',
              render: (name: string) => <Text strong>{name}</Text>,
            },
            {
              title: t('subscription.amount'),
              key: 'amount',
              render: (_: unknown, record: Subscription) => (
                <Text>{getCurrencySymbol(record.currency)}{record.amount.toFixed(2)}</Text>
              ),
            },
            {
              title: t('subscription.cycle'),
              dataIndex: 'cycle',
              key: 'cycle',
              render: (cycle: string) => <Tag>{getCycleLabel(cycle, locale)}</Tag>,
            },
            {
              title: t('subscription.nextRenewal'),
              key: 'nextRenewal',
              render: (_: unknown, record: Subscription) => {
                if (record.cycle === 'ONE_TIME') return <Tag color="purple">{locale === 'zh' ? '买断' : 'One-time'}</Tag>;
                const days = dayjs(record.nextRenewalDate).diff(dayjs(), 'day');
                return (
                  <span>
                    {dayjs(record.nextRenewalDate).format('MM-DD')}
                    {' '}
                    <Tag color={days <= 0 ? 'red' : days <= 3 ? 'orange' : days <= 7 ? 'blue' : 'green'} style={{ marginLeft: 4 }}>
                      {days <= 0 ? (locale === 'zh' ? '已过期' : 'Overdue') : `${days}d`}
                    </Tag>
                  </span>
                );
              },
            },
            {
              title: locale === 'zh' ? '分类' : 'Category',
              key: 'category',
              render: (_: unknown, record: Subscription) =>
                record.category ? <Tag color="blue">{t(`subscription.categories.${record.category}`)}</Tag> : '-',
            },
          ]}
        />
      </Modal>
    </div>
  );
}
