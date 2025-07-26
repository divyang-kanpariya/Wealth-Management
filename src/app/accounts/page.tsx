'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { AccountList } from '@/components/accounts';

const AccountsPage: React.FC = () => {
  return (
    <Layout 
      title="Accounts" 
      subtitle="Manage your investment accounts and brokers"
    >
      <AccountList />
    </Layout>
  );
};

export default AccountsPage;