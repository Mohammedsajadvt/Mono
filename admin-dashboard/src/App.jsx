import React, { useState, useEffect } from 'react';
import { getAdminToken, setAdminToken, getAdminUser, setAdminUser } from './api';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import OverviewView from './components/OverviewView';
import UsersView from './components/UsersView';
import TransactionsView from './components/TransactionsView';
import CategoriesView from './components/CategoriesView';
import AppReleaseView from './components/AppReleaseView';
import LoginView from './components/LoginView';
import Toast from './components/Toast';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminToken());
  const [adminName, setAdminName] = useState(getAdminUser());
  const [currentTab, setCurrentTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
      showToast('Admin session expired. Please log in again.', 'error');
    };
    window.addEventListener('mono_admin_logout', handleLogoutEvent);
    return () => window.removeEventListener('mono_admin_logout', handleLogoutEvent);
  }, []);

  const handleLoginSuccess = (name) => {
    setAdminName(name || 'Administrator');
    setIsAuthenticated(true);
    showToast('Welcome to Mono Admin Console!', 'success');
  };

  const handleLogout = () => {
    setAdminToken('');
    setAdminUser('');
    setIsAuthenticated(false);
    showToast('Signed out of Admin Console.', 'neutral');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    showToast('Dashboard refreshed with latest data.', 'success');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <Toast toast={toast} />
      </>
    );
  }

  const tabTitles = {
    overview: 'Dashboard Overview',
    users: 'User Account Directory',
    transactions: 'Global Transactions Ledger',
    categories: 'Categories & Allocations',
    releases: 'Push Notifications & App Releases',
  };

  return (
    <div className="app-wrapper">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Topbar
          title={tabTitles[currentTab] || 'Admin Console'}
          adminName={adminName}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          showToast={showToast}
          onAdminUpdated={(name) => setAdminName(name)}
        />

        <div className="view-container" key={refreshKey}>
          {currentTab === 'overview' && (
            <OverviewView onNavigate={setCurrentTab} showToast={showToast} />
          )}
          {currentTab === 'users' && <UsersView showToast={showToast} />}
          {currentTab === 'transactions' && (
            <TransactionsView showToast={showToast} />
          )}
          {currentTab === 'categories' && (
            <CategoriesView showToast={showToast} />
          )}
          {currentTab === 'releases' && (
            <AppReleaseView showToast={showToast} />
          )}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
