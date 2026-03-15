import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Ban, Sun, Tag, Plus, X } from 'lucide-react';
import api from '../utils/api';

const EVENT_TYPES = [
  { value: 'exam', label: '📝 Exam', color: '#ef4444' },
  { value: 'event', label: '📌 Event', color: '#3b82f6' },
  { value: 'holiday', label: '🎉 Holiday', color: '#22c55e' },
];

const TodayPanel = ({ subjects, onAttendanceMarked }) => {
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dayData, setDayData] = useState({ classes: [], is_holiday: false });
  const [holidayId, setHolidayId] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('exam');
  const [loading, setLoading] = useState(true);
  const [semesterEnd, setSemesterEnd] = useState(null);

  // Load semester end date
  useEffect(() => {
    const loadSemEnd = async () => {
      try {
        const res = await api.get('/auth/settings');
        if (res.data.semester_end_date) setSemesterEnd(res.data.semester_end_date);
      } catch (err) { /* ignore */ }
    };
    loadSemEnd();
  }, []);

  const isPastSemester = semesterEnd && currentDate > semesterEnd;

  const fetchDayData = async (dateStr) => {
    setLoading(true);
    try {
      const [attRes, calRes] = await Promise.all([
        api.get(`/attendance/date/${dateStr}`),
        api.get('/calendar')
      ]);
      setDayData(attRes.data);

      const eventsForDay = calRes.data.filter(e => e.date === dateStr);
      setDayEvents(eventsForDay);
      const hol = eventsForDay.find(e => e.event_type === 'holiday');
      setHolidayId(hol ? hol.id : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData(currentDate);
  }, [currentDate, subjects]);

  const handleToggleHoliday = async () => {
    try {
      if (holidayId) {
        // Optimistic UI Update
        setDayData(prev => ({ ...prev, is_holiday: false }));
        setDayEvents(prev => prev.filter(e => e.id !== holidayId));
        setHolidayId(null);
        await api.delete(`/calendar/${holidayId}`);
      } else {
        // Optimistic UI Update
        setDayData(prev => ({ ...prev, is_holiday: true }));
        const res = await api.post('/calendar', {
          date: currentDate,
          name: 'Holiday',
          event_type: 'holiday'
        });
        setHolidayId(res.data.id);
        setDayEvents(prev => [...prev, res.data]);
      }
      onAttendanceMarked();
    } catch (err) {
      console.error("Failed to toggle holiday", err);
    }
  };

  const handleAddEvent = async () => {
    const name = eventName.trim();
    if (!name) return;
    setEventName(''); // Clear instantly to prevent double-submit with fast enter/click
    try {
      const res = await api.post('/calendar', {
        date: currentDate,
        name: name,
        event_type: eventType
      });
      setDayEvents(prev => [...prev, res.data]);
      setShowAddEvent(false);
    } catch (err) {
      setEventName(name); // Restore if failed
      console.error("Failed to add event", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.delete(`/calendar/${eventId}`);
      setDayEvents(prev => prev.filter(e => e.id !== eventId));
      if (eventId === holidayId) {
        setHolidayId(null);
        setDayData(prev => ({ ...prev, is_holiday: false }));
        onAttendanceMarked();
      }
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  const handleMark = async (subjectId, slotId, status, currentStatus) => {
    try {
      // Optimistic Update
      setDayData(prev => ({
        ...prev,
        classes: prev.classes.map(c => 
          c.slot_id === slotId ? { ...c, status: status === currentStatus ? null : status } : c
        )
      }));
      // We don't wait for onAttendanceMarked to trigger the visual change anymore
      // We call it async in the background to update the overall Dashboard subject percentages
      
      if (status === currentStatus) {
        await api.delete('/attendance', { data: { subject_id: subjectId, slot_id: slotId, date: currentDate } });
      } else {
        await api.post('/attendance', {
          subject_id: subjectId,
          slot_id: slotId,
          date: currentDate,
          status
        });
      }
      onAttendanceMarked(); // Refreshes the parent Dashboard state in the background
    } catch (err) {
      console.error("Failed to mark attendance", err);
      // Revert optimistic update on failure
      fetchDayData(currentDate); 
    }
  };

  const shiftDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(format(d, 'yyyy-MM-dd'));
  };

  const nonHolidayEvents = dayEvents.filter(e => e.event_type !== 'holiday');
  const eventEmoji = { exam: '📝', event: '📌', holiday: '🎉' };
  const eventColor = { exam: '#ef4444', event: '#3b82f6', holiday: '#22c55e' };

  return (
    <div className="today-panel">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => shiftDate(-1)}><ChevronLeft size={16}/></button>
        <div className="date-display">
          <input 
            type="date" 
            className="date-input" 
            value={currentDate} 
            onChange={e => setCurrentDate(e.target.value)}
            max={semesterEnd || undefined}
          />
          <span className="date-label">
            {currentDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(new Date(currentDate), 'EEEE, MMM d')}
          </span>
        </div>
        <button className="icon-btn" onClick={() => shiftDate(1)}><ChevronRight size={16}/></button>
      </div>

      {isPastSemester ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--muted)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎓</div>
          <h3 style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '6px' }}>Semester Ended</h3>
          <p style={{ fontSize: '14px' }}>Your semester ended on {new Date(semesterEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. No classes after this date.</p>
        </div>
      ) : (
      <>
      {/* Holiday Toggle + Add Event Row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button 
          onClick={handleToggleHoliday}
          style={{
            flex: 1,
            padding: '9px 14px',
            borderRadius: '10px',
            border: dayData.is_holiday ? '2px solid var(--green)' : '1px dashed var(--border)',
            background: dayData.is_holiday ? 'rgba(34,197,94,0.08)' : 'var(--surface)',
            color: dayData.is_holiday ? 'var(--green)' : 'var(--muted)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
        >
          <Sun size={14} />
          {dayData.is_holiday ? '🎉 Holiday' : 'Mark Holiday'}
        </button>
        <button
          onClick={() => setShowAddEvent(!showAddEvent)}
          style={{
            padding: '9px 14px',
            borderRadius: '10px',
            border: showAddEvent ? '2px solid var(--accent)' : '1px dashed var(--border)',
            background: showAddEvent ? 'var(--accent-light)' : 'var(--surface)',
            color: showAddEvent ? 'var(--accent-dark)' : 'var(--muted)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
        >
          <Tag size={14} />
          Add Event
        </button>
      </div>

      {/* Add Event Inline Form */}
      {showAddEvent && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {EVENT_TYPES.filter(t => t.value !== 'holiday').map(t => (
              <button
                key={t.value}
                onClick={() => setEventType(t.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: eventType === t.value ? `2px solid ${t.color}` : '1px solid var(--border)',
                  background: eventType === t.value ? `${t.color}10` : 'var(--surface2)',
                  color: eventType === t.value ? t.color : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Mid Exam - DBMS"
              onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleAddEvent}
              disabled={!eventName.trim()}
              style={{ width: 'auto', padding: '8px 14px' }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Display Events for this Day */}
      {nonHolidayEvents.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {nonHolidayEvents.map(ev => (
            <div key={ev.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: `${eventColor[ev.event_type] || 'var(--accent)'}10`,
              border: `1px solid ${eventColor[ev.event_type] || 'var(--accent)'}30`,
              fontSize: '13px',
              fontWeight: 500,
              color: eventColor[ev.event_type] || 'var(--accent)'
            }}>
              <span>{eventEmoji[ev.event_type] || '📌'}</span>
              <span>{ev.name}</span>
              <button
                onClick={() => handleDeleteEvent(ev.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '0 2px',
                  color: 'inherit',
                  opacity: 0.6,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading...</div>
      ) : dayData.is_holiday ? (
        <div className="holiday-banner">
          🎉 This day is a holiday! No classes will be counted.
        </div>
      ) : dayData.is_exam ? (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#ef4444',
          fontWeight: 500
        }}>
          📝 Exam day — {dayData.exam_names?.join(', ')}. No regular classes.
        </div>
      ) : dayData.classes.length === 0 ? (
        <div className="empty-state small">
          <div className="empty-icon" style={{ fontSize: '24px' }}>🛋️</div>
          <p>No classes scheduled for this day.</p>
        </div>
      ) : (
        <div className="attendance-list">
          {dayData.classes.map(cls => (
            <div key={cls.slot_id} className={`attendance-item ${cls.status || ''}`}>
              <div className="att-subject">
                <strong>{cls.subject_name}</strong>
                <span className="att-time">{cls.slot_time || 'Time not set'}</span>
              </div>
              <div className="att-actions">
                <button 
                  className={`status-btn ${cls.status === 'present' ? 'selected' : ''}`}
                  onClick={() => handleMark(cls.subject_id, cls.slot_id, 'present', cls.status)}
                  style={{ '--btn-color': 'var(--green)', color: cls.status === 'present' ? 'var(--green)' : 'var(--muted)' }}
                  title="Present"
                >
                  ✓
                </button>
                <button 
                  className={`status-btn ${cls.status === 'absent' ? 'selected' : ''}`}
                  onClick={() => handleMark(cls.subject_id, cls.slot_id, 'absent', cls.status)}
                  style={{ '--btn-color': 'var(--red)', color: cls.status === 'absent' ? 'var(--red)' : 'var(--muted)' }}
                  title="Absent"
                >
                  ✗
                </button>
                <button 
                  className={`status-btn ${cls.status === 'cancelled' ? 'selected' : ''}`}
                  onClick={() => handleMark(cls.subject_id, cls.slot_id, 'cancelled', cls.status)}
                  style={{ '--btn-color': 'var(--yellow)', color: cls.status === 'cancelled' ? 'var(--yellow)' : 'var(--muted)' }}
                  title="Class Cancelled"
                >
                  <Ban size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && !dayData.is_holiday && dayData.classes.length > 0 && (
        <div className="day-summary">
          {dayData.classes.filter(c => c.status).length} of {dayData.classes.length} mapped
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default TodayPanel;
