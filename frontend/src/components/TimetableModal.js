import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import api from '../utils/api';

const TimetableModal = ({ subject, onClose, onSuccess }) => {
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const slotsByDay = days.reduce((acc, d) => {
    acc[d] = subject.timetable_slots.filter(s => s.day_of_week === d);
    return acc;
  }, {});

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/timetable/subjects/${subject.id}/timetable`, {
        day_of_week: day,
        slot_time: time || null
      });
      onSuccess(); // refresh parent which passes down new subject data
      setTime('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotId) => {
    try {
      await api.delete(`/timetable/${slotId}`);
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{subject.name} - Timetable</h3>
          <button onClick={onClose} className="icon-btn" style={{ border: 'none' }}>✕</button>
        </div>

        <div className="timetable-grid">
          {days.map(d => {
            const daySlots = slotsByDay[d];
            if (daySlots.length === 0) return null;
            return (
              <div key={d} className="timetable-day">
                <div className="day-label">{d}</div>
                <div className="day-slots">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="slot-chip">
                      <span>{slot.slot_time || 'Auto'}</span>
                      <button onClick={() => handleDelete(slot.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {subject.timetable_slots.length === 0 && (
            <div style={{ gridColumn: '1 / -1', color: 'var(--muted)', fontSize: '12px', padding: '10px 0' }}>
              No classes scheduled yet.
            </div>
          )}
        </div>

        <form onSubmit={handleAdd} className="add-slot-form" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <h4>Add Class Slot</h4>
          <div className="form-row">
            <div className="field" style={{ margin: 0 }}>
              <label>Day</label>
              <select value={day} onChange={e => setDay(e.target.value)}>
                {days.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Time (optional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '9px 12px' }}>
              <Plus size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimetableModal;
