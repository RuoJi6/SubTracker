export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only start in-process cron when not deployed to Vercel (Vercel uses its own cron routes)
    if (process.env.VERCEL || process.env.DISABLE_CRON === '1') {
      console.log('[INSTRUMENTATION] In-process cron disabled (Vercel / DISABLE_CRON).');
      return;
    }
    try {
      const { startCronJobs } = await import('./lib/cron');
      startCronJobs();
      console.log('[INSTRUMENTATION] Cron jobs started.');
    } catch (err) {
      console.error('[INSTRUMENTATION] Failed to start cron jobs:', err);
    }
  }
}
