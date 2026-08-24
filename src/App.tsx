import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';
import { Layout, type PageKey } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { CataloguePage } from '@/pages/CataloguePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DocumentList } from '@/pages/DocumentList';
import { DocumentEditor } from '@/pages/DocumentEditor';
import { LoadingScreen } from '@/components/ui';
import type { DocumentRow, DocType } from '@/lib/types';

type View =
  | { kind: 'page'; page: PageKey }
  | { kind: 'editor'; docType: DocType; docId: string | null };

function AppContent() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<View>({ kind: 'page', page: 'dashboard' });

  // Reset to dashboard when user changes
  useEffect(() => {
    if (!session) {
      setView({ kind: 'page', page: 'dashboard' });
    }
  }, [session]);

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!session) {
    return <LoginPage />;
  }

  function navigate(page: PageKey) {
    setView({ kind: 'page', page });
  }

  function openDoc(doc: DocumentRow) {
    setView({ kind: 'editor', docType: doc.doc_type, docId: doc.id });
  }

  function newDoc(docType: DocType) {
    setView({ kind: 'editor', docType, docId: null });
  }

  function backToList(docType: DocType) {
    setView({ kind: 'page', page: docType === 'quote' ? 'quotes' : 'invoices' });
  }

  if (view.kind === 'editor') {
    return (
      <Layout
        current={view.docType === 'quote' ? 'quotes' : 'invoices'}
        onNavigate={navigate}
      >
        <DocumentEditor
          docId={view.docId}
          docType={view.docType}
          onBack={() => backToList(view.docType)}
          onOpenDoc={openDoc}
        />
      </Layout>
    );
  }

  let content: React.ReactNode;
  switch (view.page) {
    case 'dashboard':
      content = (
        <DashboardPage
          onNewQuote={() => newDoc('quote')}
          onNewInvoice={() => newDoc('invoice')}
          onOpenDoc={openDoc}
        />
      );
      break;
    case 'quotes':
      content = (
        <DocumentList
          docType="quote"
          onNew={() => newDoc('quote')}
          onOpen={openDoc}
        />
      );
      break;
    case 'invoices':
      content = (
        <DocumentList
          docType="invoice"
          onNew={() => newDoc('invoice')}
          onOpen={openDoc}
        />
      );
      break;
    case 'clients':
      content = <ClientsPage onOpenDoc={openDoc} />;
      break;
    case 'catalogue':
      content = <CataloguePage />;
      break;
    case 'settings':
      content = <SettingsPage />;
      break;
  }

  return (
    <Layout current={view.page} onNavigate={navigate}>
      {content}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
