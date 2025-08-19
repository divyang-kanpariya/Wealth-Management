import React from 'react';
import Layout from '@/components/layout/Layout';
import { AccountsDataPreparator } from '@/lib/server/data-preparators';
import { AccountListView } from '@/components/accounts';

// Enable dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic'

const AccountsPage: React.FC = async () => {
  const preparator = new AccountsDataPreparator();
  const pageData = await preparator.prepare();

  return (
    <Layout>
      <AccountListView data={pageData} />
    </Layout>
  );
};

export default AccountsPage;