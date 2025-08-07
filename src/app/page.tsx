import { DashboardDataPreparator } from '@/lib/server/data-preparators'
import { DashboardView } from '@/components/dashboard'
import { ErrorAwarePage } from '@/components/server/ErrorAwarePage'

// Enable dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

// Remove static revalidation to rely on cache invalidation system
// The DashboardDataPreparator handles its own caching and invalidation

export default async function Dashboard() {
  const preparator = new DashboardDataPreparator()
  const pageData = await preparator.prepare()
  
  return (
    <ErrorAwarePage 
      data={pageData}
      fallbackTitle="Dashboard Loading Issues"
      fallbackMessage="We're having trouble loading your dashboard data. Some information may be temporarily unavailable."
    >
      <DashboardView data={pageData} />
    </ErrorAwarePage>
  )
}