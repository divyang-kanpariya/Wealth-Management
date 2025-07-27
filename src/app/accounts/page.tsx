'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { AccountList } from '@/components/accounts';

const AccountsPage: React.FC = () => {
  return (
    <Layout>
      <AccountList />
    </Layout>
  );
};

export default AccountsPage;