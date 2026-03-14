import React, { useState } from 'react';
import { Settings, Calendar, Trash2 } from 'lucide-react';
import api from '../utils/api';
import EditSubjectModal from './EditSubjectModal';

const SubjectCard = ({ subject, onRefresh, onEditTimetable }) => {
  const [showEdit, setShowEdit] = useState(false);
  const isSafe = subject.percentage >= subject.threshold;

  const handleDelete = async () => {
    if (window.confirm(`Delete ${subject.name}? This removes all attendance records as well.`)) {
      try {
        await api.delete(`/subjects/${subject.id}`);
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };
  // Generate day dots
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const activeDays = new Set(subject.timetable_slots.map(s => s.day_of_week));

  return (
    <div className={`subject-card ${isSafe ? 'safe' : 'at-risk'}`}>
      <div className="subject-card-header">
        <div className="subject-info">
          <h3>{subject.name}</h3>
          <div className="threshold-badge">Req: {subject.threshold}%</div>
        </div>
        <div className="subject-actions">
          <button className="icon-btn" onClick={() => setShowEdit(true)} title="Edit Subject Details" style={{ color: 'var(--text)' }}>
            <Settings size={14} />
          </button>
          <button className="icon-btn" onClick={onEditTimetable} title="Edit Timetable">
            <Calendar size={14} />
          </button>
          <button className="icon-btn danger" onClick={handleDelete} title="Delete Subject">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="subject-card-body">
        <div className="circular-progress">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="var(--border2)" strokeWidth="4" />
            <circle 
              cx="30" cy="30" r="26" fill="none" 
              stroke={isSafe ? "var(--green)" : "var(--red)"} 
              strokeWidth="4" 
              strokeDasharray="163" 
              strokeDashoffset={163 - (163 * subject.percentage) / 100}
              transform="rotate(-90 30 30)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="progress-label">
            <div className="pct-value">{Math.round(subject.percentage)}%</div>
          </div>
        </div>

        <div className="subject-stats">
          <div className="stat-row">
            <span>Conducted</span>
            <strong>{subject.conducted}</strong>
          </div>
          <div className="stat-row">
            <span>Present</span>
            <strong>{subject.present}</strong>
          </div>
          <div className="stat-row">
            <span>Absent</span>
            <strong>{subject.conducted - subject.present}</strong>
          </div>
        </div>
      </div>

      <div className="day-dots">
        {days.map(d => (
          <div key={d} className={`day-dot ${activeDays.has(d) ? 'active' : ''}`}>
            {d.substring(0, 2).toUpperCase()}
          </div>
        ))}
      </div>



      {showEdit && (
        <EditSubjectModal 
          subject={subject} 
          onClose={() => setShowEdit(false)} 
          onSuccess={() => {
            setShowEdit(false);
            onRefresh();
          }} 
        />
      )}
    </div>
  );
};

export default SubjectCard;
