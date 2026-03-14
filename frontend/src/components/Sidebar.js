import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Compass, Calendar, LogOut, CheckCircle2, Bell } from 'lucide-react';
import api from '../utils/api';
import NotificationPanel from './NotificationPanel';

const Sidebar = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const count = res.data.filter(n => !n.is_read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  return (
    <>
    <aside className="sidebar">
      <div className="sidebar-brand">
        <CheckCircle2 className="brand-glyph" />
        <div className="brand-name">ClassTrack</div>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard className="nav-icon" />
          Dashboard
        </NavLink>
        <NavLink to="/projection" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Compass className="nav-icon" />
          Projection
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Calendar className="nav-icon" />
          Calendar
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar" style={{ position: 'relative' }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="user-name">{user?.name}</div>
            <div className="user-email" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </div>
          </div>
          <button 
            className="icon-btn" 
            onClick={() => setShowNotifications(true)}
            style={{ position: 'relative', width: '32px', height: '32px', padding: 0 }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 4, right: 4, width: 8, height: 8, 
                background: 'var(--accent)', borderRadius: '50%', border: '2px solid var(--surface)'
              }} />
            )}
          </button>
        </div>
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Log Out
        </button>
      </div>
    </aside>

    {showNotifications && (
      <NotificationPanel 
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount();
        }} 
      />
    )}
    </>
  );
};

export default Sidebar;
