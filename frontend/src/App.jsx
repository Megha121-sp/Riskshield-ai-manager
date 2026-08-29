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
import FacilityRiskPage from './pages/FacilityRiskPage';
import ScenarioModal from './components/common/ScenarioModal';
import RiskCopilot from './components/copilot/RiskCopilot';
import CustomerProfileModal from './components/customer/CustomerProfileModal';
import DeviceInvestigationModal from './components/device/DeviceInvestigationModal';
import { alertsAPI } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
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
    setSelectedCustomerId(null);
    setSelectedDeviceId(null);
  };

  const handleOpenCustomer = (custId) => {
    setSelectedCustomerId(custId);
  };

  const handleOpenDevice = (devId) => {
    setSelectedDeviceId(devId);
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
          onOpenCustomer={handleOpenCustomer}
          onOpenDevice={handleOpenDevice}
        />
      );
    }

    switch (currentTab) {
      case 'overview':
        return (
          <OverviewPage
            key={refreshKey}
            onOpenTransaction={handleOpenTransaction}
            onOpenCustomer={handleOpenCustomer}
            onOpenDevice={handleOpenDevice}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'facilities':
        return (
          <FacilityRiskPage
            key={refreshKey}
            currentUser={currentUser}
            onOpenAlerts={() => setCurrentTab('alerts')}
            onOpenAudit={() => setCurrentTab('audit')}
          />
        );
      case 'transactions':
        return <TransactionsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'alerts':
        return (
          <AlertsPage
            key={refreshKey}
            onOpenTransaction={handleOpenTransaction}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'investigations':
        return <InvestigationsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      case 'fraud':
        return (
          <FraudIntelligencePage
            key={refreshKey}
            onOpenTransaction={handleOpenTransaction}
            onOpenCustomer={handleOpenCustomer}
            onOpenDevice={handleOpenDevice}
          />
        );
      case 'analytics':
        return <AnalyticsPage key={refreshKey} />;
      case 'model':
        return <ModelPerformancePage key={refreshKey} />;
      case 'audit':
        return <AuditLogsPage key={refreshKey} onOpenTransaction={handleOpenTransaction} />;
      default:
        return (
          <OverviewPage
            key={refreshKey}
            onOpenTransaction={handleOpenTransaction}
            onOpenCustomer={handleOpenCustomer}
            onOpenDevice={handleOpenDevice}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
    }
  };


  return (
    <Layout
      currentTab={selectedTransactionId ? 'transactions' : currentTab}
      setTab={(tab) => {
        setSelectedTransactionId(null);
        setCurrentTab(tab);
      }}
      onOpenScenarios={() => setScenarioModalOpen(false || true)}
      onDataReset={handleDataReset}
      currentUser={currentUser}
      onRoleSwitch={handleRoleSwitch}
      alertCount={alertCount}
      onOpenCopilot={() => setCopilotOpen(true)}
      onOpenTransaction={handleOpenTransaction}
      onOpenCustomer={handleOpenCustomer}
      onOpenDevice={handleOpenDevice}
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

      {/* Risk Copilot AI Drawer */}
      <RiskCopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onOpenTransaction={handleOpenTransaction}
        onOpenCustomer={handleOpenCustomer}
        onOpenDevice={handleOpenDevice}
      />

      {/* Customer Profile & Timeline Modal */}
      <CustomerProfileModal
        customerId={selectedCustomerId}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onOpenTransaction={handleOpenTransaction}
      />

      {/* Device Investigation Modal */}
      <DeviceInvestigationModal
        deviceId={selectedDeviceId}
        isOpen={!!selectedDeviceId}
        onClose={() => setSelectedDeviceId(null)}
        onOpenTransaction={handleOpenTransaction}
        onOpenCustomer={handleOpenCustomer}
      />
    </Layout>
  );
}
