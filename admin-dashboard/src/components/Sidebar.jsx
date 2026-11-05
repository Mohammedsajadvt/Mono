import React from 'react';
import { 
  Wallet, 
  PieChart, 
  Users, 
  ArrowLeftRight, 
  Tags, 
  Rocket, 
  LogOut 
} from 'lucide-react';

export default function Sidebar({ currentTab, onSelectTab, onLogout }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'releases', label: 'App Updates', icon: Rocket },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Wallet size={20} color="#FFFFFF" />
          </div>
          <div className="brand-text">
            <h3>mono</h3>
            <span>React Admin</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <IconComponent size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-pulse">
          <span className="pulse-dot"></span>
          <div className="pulse-info">
            <strong>TiDB Cloud</strong>
            <span>gateway01-ap-ne1</span>
          </div>
        </div>

        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

