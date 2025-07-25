'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { AccountList } from '@/components/accounts';

const AccountsPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <AccountList />
      </div>
    </Layout>
  );
};

export default AccountsPage;