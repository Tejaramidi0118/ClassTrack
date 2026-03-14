import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import SubjectCard from '../components/SubjectCard';
import TodayPanel from '../components/TodayPanel';
import AddSubjectModal from '../components/AddSubjectModal';
import TimetableModal from '../components/TimetableModal';
import UploadTimetableModal from '../components/UploadTimetableModal';

const Dashboard = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showUploadTimetable, setShowUploadTimetable] = useState(false);
  const [timetableSubject, setTimetableSubject] = useState(null);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">Overview of your attendance across all subjects</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowUploadTimetable(true)} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            + Add Timetable
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          {subjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No Subjects Yet</h3>
              <p>Add your first subject to start tracking attendance.</p>
              <button className="btn-primary" onClick={() => setShowAddSubject(true)}>
                Add Subject
              </button>
            </div>
          ) : (
            <div className="subjects-grid">
              {subjects.map(sub => (
                <SubjectCard 
                  key={sub.id} 
                  subject={sub} 
                  onRefresh={fetchSubjects}
                  onEditTimetable={() => setTimetableSubject(sub)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '340px', flexShrink: 0 }}>
          <TodayPanel 
            subjects={subjects} 
            onAttendanceMarked={fetchSubjects}
          />
        </div>
      </div>

      {showAddSubject && (
        <AddSubjectModal 
          onClose={() => setShowAddSubject(false)} 
          onSuccess={() => {
            setShowAddSubject(false);
            fetchSubjects();
          }} 
        />
      )}

      {showUploadTimetable && (
        <UploadTimetableModal 
          onClose={() => setShowUploadTimetable(false)} 
          onSuccess={() => {
            setShowUploadTimetable(false);
            fetchSubjects();
          }} 
        />
      )}

      {timetableSubject && (
        <TimetableModal 
          subject={timetableSubject}
          onClose={() => setTimetableSubject(null)}
          onSuccess={() => {
            fetchSubjects();
          }}
        />
      )}
    </>
  );
};

export default Dashboard;
