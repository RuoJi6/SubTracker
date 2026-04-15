'use client';

import AppLayout from '@/components/layout/AppLayout';
import StatsCards from '@/components/dashboard/StatsCards';

export default function Home() {
  return (
    <AppLayout>
      <StatsCards />
    </AppLayout>
  );
}
