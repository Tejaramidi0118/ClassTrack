import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, Calendar as CalIcon, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

const NotificationPanel = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} color="var(--red)" />;
      case 'reminder': return <CalIcon size={18} color="var(--accent)" />;
      case 'info': return <Info size={18} color="var(--primary)" />;
      default: return <Bell size={18} color="var(--text-muted)" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, justifyContent: 'flex-end' }}>
      <div 
        className="notification-drawer" 
        onClick={e => e.stopPropagation()} 
        style={{
          width: '380px', height: '100%', background: 'var(--surface)', 
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', padding: '24px', 
          display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Notifications {unreadCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px' }}>{unreadCount} new</span>}
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead} 
            style={{ 
              background: 'none', border: 'none', color: 'var(--primary)', 
              textAlign: 'right', marginBottom: '16px', cursor: 'pointer', fontSize: '14px' 
            }}
          >
            Mark all as read <CheckCircle2 size={14} style={{ verticalAlign: 'middle' }}/>
          </button>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
              <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <div>You're all caught up!</div>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => !n.is_read && markAsRead(n.id)}
                style={{
                  padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)',
                  cursor: n.is_read ? 'default' : 'pointer', opacity: n.is_read ? 0.7 : 1,
                  display: 'flex', gap: '12px', position: 'relative', transition: 'all 0.2s'
                }}
              >
                {!n.is_read && (
                  <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                )}
                <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px', fontSize: '14px', paddingRight: '12px' }}>{n.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
