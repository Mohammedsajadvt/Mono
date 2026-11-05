import React, { useState, useEffect } from 'react';
import { RotateCw, Clock, ShieldCheck, User } from 'lucide-react';

export default function Topbar({ title, adminName, onRefresh, isRefreshing }) {
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      const hours = now.getHours();
      if (hours >= 5 && hours < 12) setGreeting('Good morning');
      else if (hours >= 12 && hours < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
        <div className="greeting-bar">
          <span>{greeting}, {adminName}</span>
          <span className="badge-time">
            <Clock size={12} />
            <span>{timeStr}</span>
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="chip-status">
          <span className="status-indicator"></span>
          <span>REST API v1.0.2 Live</span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RotateCw size={14} className={isRefreshing ? 'fa-spin' : ''} />
          <span>Refresh</span>
        </button>

        <div className="admin-profile-pill">
          <div className="admin-avatar">
            <User size={15} />
          </div>
          <div className="admin-details">
            <span className="admin-name">{adminName}</span>
            <span className="admin-role">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

