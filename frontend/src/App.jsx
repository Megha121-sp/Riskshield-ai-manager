import React, { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import AlertsPage from './pages/AlertsPage';
import InvestigationsPage from './pages/InvestigationsPage';
import FraudIntelligencePage from './pages/FraudIntelligencePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ModelPerformancePage from './pages/ModelPerformancePage';
import AuditLogsPage from './pages/AuditLogsPage';
import ScenarioModal from './components/common/ScenarioModal';
import { alertsAPI, authAPI } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [currentUser, setCurrentUser] = useState({
    user_id: 'USR_ANALYST_01',
    username: 'analyst@riskshield.ai',
    role: 'ANALYST'
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Poll active open alerts
  const loadAlertCount = async () => {
    try {
      const data = await alertsAPI.list('OPEN');
      setAlertCount(data?.length || 0);
    } catch (e) {
      // Ignore initial error
    }
  };

  useEffect(() => {
    loadAlertCount();
    const interval = setInterval(loadAlertCount, 30000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleOpenTransaction = (txId) => {
    setSelectedTransactionId(txId);
  };

  const handleBackToQueue = () => {
    setSelectedTransactionId(null);
  };

  const handleDataReset = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedTransactionId(null);
    loadAlertCount();
  };

  const handleRoleSwitch = (newRole) => {
    if (newRole === 'ADMIN') {
      setCurrentUser({
        user_id: 'USR_ADMIN_01',
        username: 'admin@riskshield.ai',
        role: 'ADMIN'
      });
    } else {
      setCurrentUser({
        user_id: 'USR_ANALYST_01',
        username: 'analyst@riskshield.ai',
        role: 'ANALYST'
      });
    }
  };

  const renderContent = () => {
    if (selectedTransactionId) {
      return (
        <TransactionDetailPage
          key={`${selectedTransactionId}-${refreshKey}`}
          transactionId={selectedTransactionId}
          onBack={handleBackToQueue}
          onOpenTransaction={handleOpenTransaction}
        />
      );
    }

    switch (currentTab) {
      case 'overview':
        return <OverviewPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'transactions':
        return <TransactionsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'alerts':
        return <AlertsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'investigations':
        return <InvestigationsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'fraud':
        return <FraudIntelligencePage key={refreshKey} />;
      case 'analytics':
        return <AnalyticsPage key={refreshKey} />;
      case 'model':
        return <ModelPerformancePage key={refreshKey} />;
      case 'audit':
        return <AuditLogsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      default:
        return <OverviewPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
    }
  };

  return (
    <Layout
      currentTab={selectedTransactionId ? 'transactions' : currentTab}
      setTab={(tab) => {
        setSelectedTransactionId(null);
        setCurrentTab(tab);
      }}
      onOpenScenarios={() => setScenarioModalOpen(true)}
      onDataReset={handleDataReset}
      currentUser={currentUser}
      onRoleSwitch={handleRoleSwitch}
      alertCount={alertCount}
    >
      {renderContent()}

      {/* 1-Click Demo Scenarios Modal */}
      <ScenarioModal
        isOpen={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
        onSelectScenario={(txId) => {
          handleOpenTransaction(txId);
        }}
      />
    </Layout>
  );
}
