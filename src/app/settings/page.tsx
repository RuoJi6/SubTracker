'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw, Plus, Wallet, Send, Eye, Undo2, Info, Inbox, X } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { currencies } from '@/lib/currency';
import { TEMPLATE_PLACEHOLDERS, SAMPLE_DATA, DEFAULT_DINGTALK_TEMPLATE, DEFAULT_EMAIL_TEMPLATE, DEFAULT_CALENDAR_TITLE, DEFAULT_CALENDAR_DESC, renderTemplate } from '@/lib/notification/template';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from '@/components/ui/input-group';

interface FormValues {
  displayCurrency?: string;
  language?: string;
  timezone?: string;
  dingtalkWebhook?: string;
  dingtalkSecret?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  emailFrom?: string;
  emailTo?: string;
  dingtalkTemplate?: string;
  emailTemplate?: string;
  calendarTitle?: string;
  calendarDesc?: string;
  calendarToken?: string;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [formValues, setFormValues] = useState<FormValues>({});
  const [loading, setLoading] = useState(false);
  const [calendarToken, setCalendarToken] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);
  const [testingDingtalk, setTestingDingtalk] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [previewType, setPreviewType] = useState<'dingtalk' | 'email' | 'calendar' | null>(null);

  const calendarUrl = typeof window !== 'undefined' && calendarToken
    ? `${window.location.origin}/api/calendar?token=${calendarToken}`
    : '';

  const updateField = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFormValues(data.data);
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
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('settings.saved'));
      } else {
        toast.error(data.error || t('common.error'));
      }
    } catch {
      // network error
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
        toast.success(t('settings.tokenRegenerated'));
      } else {
        toast.error(data.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setRegenerating(false);
    }
  };

  const copyCalendarUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    toast.success('URL copied!');
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
        toast.success(t('settings.paymentMethodAdded'));
      } else if (res.status === 409) {
        toast.error(t('settings.paymentMethodExists'));
      } else {
        toast.error(data.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
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
        toast.success(t('settings.paymentMethodDeleted'));
      } else {
        toast.error(data.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const testDingtalk = async () => {
    if (!formValues.dingtalkWebhook) {
      toast.error(t('settings.testFailed'));
      return;
    }
    setTestingDingtalk(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dingtalk', webhook: formValues.dingtalkWebhook, secret: formValues.dingtalkSecret }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('settings.testSuccess'));
      } else {
        toast.error(data.error || t('settings.testFailed'));
      }
    } catch {
      toast.error(t('settings.testFailed'));
    } finally {
      setTestingDingtalk(false);
    }
  };

  const testEmail = async () => {
    if (!formValues.smtpHost || !formValues.smtpPort || !formValues.smtpUser || !formValues.smtpPass || !formValues.emailFrom || !formValues.emailTo) {
      toast.error(t('settings.testFailed'));
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          smtpHost: formValues.smtpHost,
          smtpPort: formValues.smtpPort,
          smtpUser: formValues.smtpUser,
          smtpPass: formValues.smtpPass,
          emailFrom: formValues.emailFrom,
          emailTo: formValues.emailTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('settings.testSuccess'));
      } else {
        toast.error(data.error || t('settings.testFailed'));
      }
    } catch {
      toast.error(t('settings.testFailed'));
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="mx-auto max-w-[800px]">
      <h3 className="text-xl font-semibold mb-4">{t('settings.title')}</h3>

      {/* General Settings */}
      <Card className="glass-card mb-4">
        <CardContent>
          <h5 className="text-base font-medium mb-4">{t('settings.title')}</h5>
          <div className="flex flex-wrap gap-6">
            <div className="min-w-[200px] space-y-2">
              <Label>{t('settings.displayCurrency')}</Label>
              <Select value={formValues.displayCurrency ?? ''} onValueChange={(val) => updateField('displayCurrency', val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.displayCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.nameZh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] space-y-2">
              <Label>{t('settings.language')}</Label>
              <Select value={formValues.language ?? ''} onValueChange={(val) => updateField('language', val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] space-y-2">
              <Label>{t('settings.timezone')}</Label>
              <Select value={formValues.timezone ?? ''} onValueChange={(val) => updateField('timezone', val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.timezone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                  <SelectItem value="Europe/Berlin">Europe/Berlin (UTC+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DingTalk Config */}
      <Card className="glass-card mb-4">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-base font-medium">{t('settings.dingtalkConfig')}</h5>
            <Button variant="outline" size="sm" onClick={testDingtalk} disabled={testingDingtalk}>
              <Send className="size-4" />
              {testingDingtalk ? '...' : t('settings.testConnection')}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('notification.webhook')}</Label>
              <Input
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                value={formValues.dingtalkWebhook ?? ''}
                onChange={(e) => updateField('dingtalkWebhook', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('notification.secret')}</Label>
              <Input
                type="password"
                placeholder="SEC..."
                value={formValues.dingtalkSecret ?? ''}
                onChange={(e) => updateField('dingtalkSecret', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Config */}
      <Card className="glass-card mb-4">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-base font-medium">{t('settings.emailConfig')}</h5>
            <Button variant="outline" size="sm" onClick={testEmail} disabled={testingEmail}>
              <Send className="size-4" />
              {testingEmail ? '...' : t('settings.testConnection')}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>{t('settings.smtpHost')}</Label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={formValues.smtpHost ?? ''}
                  onChange={(e) => updateField('smtpHost', e.target.value)}
                />
              </div>
              <div className="min-w-[120px] space-y-2">
                <Label>{t('settings.smtpPort')}</Label>
                <Input
                  type="number"
                  placeholder="465"
                  value={formValues.smtpPort ?? ''}
                  onChange={(e) => updateField('smtpPort', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>{t('settings.smtpUser')}</Label>
                <Input
                  value={formValues.smtpUser ?? ''}
                  onChange={(e) => updateField('smtpUser', e.target.value)}
                />
              </div>
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>{t('settings.smtpPass')}</Label>
                <Input
                  type="password"
                  value={formValues.smtpPass ?? ''}
                  onChange={(e) => updateField('smtpPass', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>{t('settings.emailFrom')}</Label>
                <Input
                  placeholder="noreply@example.com"
                  value={formValues.emailFrom ?? ''}
                  onChange={(e) => updateField('emailFrom', e.target.value)}
                />
              </div>
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label>{t('settings.emailTo')}</Label>
                <Input
                  placeholder="you@example.com"
                  value={formValues.emailTo ?? ''}
                  onChange={(e) => updateField('emailTo', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card className="glass-card mb-4">
        <CardContent>
          <h5 className="text-base font-medium mb-2">
            {t('settings.dingtalkTemplate')} / {t('settings.emailTemplate')}
          </h5>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" role="alert">
            <Info className="size-4 shrink-0" />
            <span>{t('settings.templateHelp')}</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <span className="mr-2 text-sm text-muted-foreground">{t('settings.templatePlaceholders')}:</span>
            {TEMPLATE_PLACEHOLDERS.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => { navigator.clipboard.writeText(`{${p}}`); toast.success('Copied!'); }}
              >
                {`{${p}}`} - {t(`settings.placeholders.${p}`)}
              </Badge>
            ))}
          </div>
          <Tabs defaultValue="dingtalk">
            <TabsList>
              <TabsTrigger value="dingtalk">{t('settings.dingtalkTemplate')}</TabsTrigger>
              <TabsTrigger value="email">{t('settings.emailTemplate')}</TabsTrigger>
              <TabsTrigger value="calendar">{t('settings.calendarTemplate')}</TabsTrigger>
            </TabsList>
            <TabsContent value="dingtalk">
              <div className="space-y-3 pt-3">
                <Textarea
                  rows={10}
                  placeholder={DEFAULT_DINGTALK_TEMPLATE}
                  className="font-mono text-[13px]"
                  value={formValues.dingtalkTemplate ?? ''}
                  onChange={(e) => updateField('dingtalkTemplate', e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewType('dingtalk')}>
                    <Eye className="size-4" />
                    {t('settings.templatePreview')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => updateField('dingtalkTemplate', '')}>
                    <Undo2 className="size-4" />
                    {t('settings.templateReset')}
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="email">
              <div className="space-y-3 pt-3">
                <Textarea
                  rows={12}
                  placeholder={DEFAULT_EMAIL_TEMPLATE}
                  className="font-mono text-[13px]"
                  value={formValues.emailTemplate ?? ''}
                  onChange={(e) => updateField('emailTemplate', e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewType('email')}>
                    <Eye className="size-4" />
                    {t('settings.templatePreview')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => updateField('emailTemplate', '')}>
                    <Undo2 className="size-4" />
                    {t('settings.templateReset')}
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <span className="block text-sm text-muted-foreground">
                    {t('settings.calendarTitleLabel')}
                  </span>
                  <Input
                    placeholder={DEFAULT_CALENDAR_TITLE}
                    className="font-mono text-[13px]"
                    value={formValues.calendarTitle ?? ''}
                    onChange={(e) => updateField('calendarTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <span className="block text-sm text-muted-foreground">
                    {t('settings.calendarDescLabel')}
                  </span>
                  <Textarea
                    rows={6}
                    placeholder={DEFAULT_CALENDAR_DESC}
                    className="font-mono text-[13px]"
                    value={formValues.calendarDesc ?? ''}
                    onChange={(e) => updateField('calendarDesc', e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewType('calendar')}>
                    <Eye className="size-4" />
                    {t('settings.templatePreview')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { updateField('calendarTitle', ''); updateField('calendarDesc', ''); }}>
                    <Undo2 className="size-4" />
                    {t('settings.templateReset')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Calendar URL */}
      <Card className="glass-card mb-4">
        <CardContent>
          <h5 className="text-base font-medium mb-2">{t('notification.calendar')}</h5>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" role="alert">
            <Info className="size-4 shrink-0" />
            <span>{t('notification.calendarHelp')}</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{t('settings.calendarTokenTip')}</p>
          <div className="space-y-3">
            <InputGroup>
              <InputGroupInput
                value={calendarUrl}
                readOnly
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" onClick={copyCalendarUrl}>
                  <Copy className="size-3.5" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="destructive" size="sm" disabled={regenerating}>
                  <RefreshCw className={`size-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {t('settings.regenerateToken')}
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings.regenerateConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings.regenerateConfirm')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={regenerateToken}>
                    {t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="glass-card mb-4">
        <CardContent>
          <h5 className="text-base font-medium mb-3">
            <Wallet className="inline size-4 mr-1" />
            {t('settings.paymentMethods')}
          </h5>
          <div className="mb-3">
            <InputGroup className="max-w-[400px]">
              <InputGroupInput
                placeholder={t('settings.paymentMethodName')}
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addPaymentMethod(); }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={addPaymentMethod} disabled={addingMethod}>
                  <Plus className="size-3.5" />
                  {t('settings.addPaymentMethod')}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
          {paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="size-10 mb-2 opacity-40" />
              <span className="text-sm">{t('settings.noCustomPaymentMethods')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((m) => (
                <AlertDialog key={m.id}>
                  <AlertDialogTrigger render={
                    <Badge variant="secondary" className="cursor-pointer gap-1 py-1 px-2 text-sm">
                      <Wallet className="size-3" />
                      {m.name}
                      <X className="size-3 ml-1 opacity-60 hover:opacity-100" />
                    </Badge>
                  } />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.deletePaymentMethodConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.deletePaymentMethodConfirm')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => deletePaymentMethod(m.id)}>
                        {t('common.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-4" />
      <Button onClick={handleSave} disabled={loading} size="lg">
        {loading ? '...' : t('common.save')}
      </Button>

      {/* Template Preview Dialog */}
      <Dialog open={previewType !== null} onOpenChange={(open) => { if (!open) setPreviewType(null); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t('settings.templatePreview')}</DialogTitle>
          </DialogHeader>
          {previewType === 'dingtalk' && (
            <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-[13px]">
              {renderTemplate(
                formValues.dingtalkTemplate || DEFAULT_DINGTALK_TEMPLATE,
                SAMPLE_DATA
              )}
            </div>
          )}
          {previewType === 'email' && (
            <div
              dangerouslySetInnerHTML={{
                __html: renderTemplate(
                  formValues.emailTemplate || DEFAULT_EMAIL_TEMPLATE,
                  SAMPLE_DATA
                ),
              }}
            />
          )}
          {previewType === 'calendar' && (
            <div className="rounded-lg bg-muted p-4 font-mono text-[13px]">
              <div className="mb-3">
                <span className="block text-xs text-muted-foreground">{t('settings.calendarTitleLabel')}:</span>
                <div className="mt-1 text-base font-semibold">
                  {renderTemplate(
                    formValues.calendarTitle || DEFAULT_CALENDAR_TITLE,
                    SAMPLE_DATA
                  )}
                </div>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">{t('settings.calendarDescLabel')}:</span>
                <div className="mt-1 whitespace-pre-wrap">
                  {renderTemplate(
                    formValues.calendarDesc || DEFAULT_CALENDAR_DESC,
                    SAMPLE_DATA
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
