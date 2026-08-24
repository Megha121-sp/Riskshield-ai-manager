import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({
  children,
  currentTab,
  setTab,
  onOpenScenarios,
  onDataReset,
  currentUser,
  onRoleSwitch,
  alertCount,
  onOpenCopilot,
  onOpenTransaction,
  onOpenCustomer,
  onOpenDevice
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setTab={setTab}
        onOpenScenarios={onOpenScenarios}
        alertCount={alertCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenScenarios={onOpenScenarios}
          onDataReset={onDataReset}
          currentUser={currentUser}
          onRoleSwitch={onRoleSwitch}
          onOpenCopilot={onOpenCopilot}
          onOpenTransaction={onOpenTransaction}
          onOpenCustomer={onOpenCustomer}
          onOpenDevice={onOpenDevice}
          onNavigateTab={setTab}
        />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
