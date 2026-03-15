import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { Calendar as CalIcon, Trash2 } from 'lucide-react';
import api from '../utils/api';

const EVENT_TYPES = {
  holiday: { label: 'Holiday', emoji: '🌴', color: 'var(--green)' },
  exam: { label: 'Exam', emoji: '📝', color: 'var(--red)' },
  event: { label: 'Event', emoji: '✨', color: 'var(--accent)' }
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('holiday');
  const [adding, setAdding] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/calendar');
      setEvents(res.data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/calendar', { date, name, event_type: type });
      setDate('');
      setName('');
      fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/calendar/${id}`);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date();
  const upcomingHolidays = events.filter(e => e.event_type === 'holiday' && isAfter(parseISO(e.date), today));
  const upcomingExams = events.filter(e => e.event_type === 'exam' && isAfter(parseISO(e.date), today));

  // Group events by month for display
  const groupedEvents = events.reduce((acc, ev) => {
    const month = format(parseISO(ev.date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(ev);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Academic Calendar</h2>
          <div className="subtitle">Manage holidays, exams, and key events. Holidays automatically exempt classes from attendance calculation.</div>
        </div>
      </div>

      <div className="calendar-layout">
        <div>
          {upcomingHolidays.length > 0 && (
            <div className="upcoming-holidays">
              <h4>Upcoming Holidays</h4>
              <div className="holiday-chips">
                {upcomingHolidays.slice(0, 5).map(h => (
                  <div key={h.id} className="holiday-chip">
                    {h.name} ({format(parseISO(h.date), 'MMM d')})
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingExams.length > 0 && (
            <div className="upcoming-holidays" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
              <h4 style={{ color: 'var(--red)' }}>Upcoming Exams</h4>
              <div className="holiday-chips">
                {upcomingExams.slice(0, 5).map(ex => (
                  <div key={ex.id} className="holiday-chip" style={{ 
                    background: 'rgba(239,68,68,0.08)', 
                    border: '1px solid rgba(239,68,68,0.2)', 
                    color: 'var(--red)' 
                  }}>
                    📝 {ex.name} ({format(parseISO(ex.date), 'MMM d')})
                  </div>
                ))}
              </div>
            </div>
          )}
          <form className="add-event-panel" onSubmit={handleAdd}>
            <h4>Add New Event</h4>
            <div className="field">
              <label>Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="full-width" />
            </div>
            <div className="field">
              <label>Event Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali / Mid-terms" className="full-width" />
            </div>
            <div className="field">
              <label>Type</label>
              <div className="type-selector">
                {Object.entries(EVENT_TYPES).map(([k, v]) => (
                  <button 
                    key={k} 
                    type="button"
                    className={`type-btn ${type === k ? 'active' : ''}`}
                    style={{ '--type-color': v.color }}
                    onClick={() => setType(k)}
                  >
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? 'Adding...' : 'Save Event'}
            </button>
          </form>
        </div>

        <div>
          {loading ? <div className="loading">Loading calendar...</div> : Object.keys(groupedEvents).length === 0 ? (
            <div className="empty-state">
              <CalIcon className="empty-icon" />
              <h3>No Events Scheduled</h3>
              <p>Add your first holiday or exam to see it here.</p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month} className="month-group">
                <div className="month-header">{month}</div>
                {monthEvents.map(ev => {
                  const meta = EVENT_TYPES[ev.event_type];
                  return (
                    <div key={ev.id} className="event-row" style={{ '--event-color': meta.color }}>
                      <div className="event-date">
                        <div className="event-day">{format(parseISO(ev.date), 'd')}</div>
                        <div className="event-weekday">{format(parseISO(ev.date), 'E')}</div>
                      </div>
                      <div className="event-info">
                        <span className="event-emoji">{meta.emoji}</span>
                        <span className="event-name">{ev.name}</span>
                        <span className="event-type-label">{meta.label}</span>
                      </div>
                      <button className="icon-btn" onClick={() => handleDelete(ev.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
