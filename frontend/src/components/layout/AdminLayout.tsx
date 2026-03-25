import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AdminLayout({ children, pageTitle }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-layout__content">
        {pageTitle ? <TopHeader title={pageTitle} /> : null}
        <div className="admin-layout__main">{children}</div>
      </main>
    </div>
  );
}
