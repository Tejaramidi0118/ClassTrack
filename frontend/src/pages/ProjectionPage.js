import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import api from '../utils/api';

const ProjectionPage = () => {
  const [tab, setTab] = useState('end-of-sem');
  
  // End of sem state
  const [endDate, setEndDate] = useState('');
  const [isDateSaved, setIsDateSaved] = useState(false);
  const [projections, setProjections] = useState([]);
  
  // Holiday plan state
  const [holidayStart, setHolidayStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [holidayEnd, setHolidayEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planResult, setPlanResult] = useState(null);

  const [loading, setLoading] = useState(false);

  // Load saved semester end date
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/auth/settings');
        if (res.data.semester_end_date) {
          setEndDate(res.data.semester_end_date);
          setIsDateSaved(true);
        } else {
          setEndDate(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
        }
      } catch (err) {
        setEndDate(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
      }
    };
    loadSettings();
  }, []);

  const saveSemesterDate = async () => {
    try {
      await api.put('/auth/settings', { semester_end_date: endDate });
      setIsDateSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjections = async () => {
    if (!endDate) return;
    setLoading(true);
    try {
      const res = await api.get(`/projection?end_date=${endDate}`);
      setProjections(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidayPlan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projection/holiday-plan?start=${holidayStart}&end=${holidayEnd}`);
      setPlanResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'end-of-sem' && endDate) fetchProjections();
  }, [endDate, tab]);

  useEffect(() => {
    if (tab === 'holiday-plan') {
      if (new Date(holidayStart) <= new Date(holidayEnd)) {
        fetchHolidayPlan();
      }
    }
  }, [holidayStart, holidayEnd, tab]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Attendance Intelligence</h2>
          <div className="subtitle">Forecast your attendance or plan your next vacation without failing.</div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${tab === 'end-of-sem' ? 'active' : ''}`} onClick={() => setTab('end-of-sem')}>
          Semester Projection
        </button>
        <button className={`tab ${tab === 'holiday-plan' ? 'active' : ''}`} onClick={() => setTab('holiday-plan')}>
          Holiday Planner
        </button>
      </div>

      {tab === 'end-of-sem' && (
        <div className="planner-section">
          <div className="planner-controls">
            <div className="field">
              <label>Semester End Date {isDateSaved && <span style={{ color: 'var(--green)', fontSize: '12px', marginLeft: '6px' }}>✓ Saved</span>}</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => { setEndDate(e.target.value); setIsDateSaved(false); }}
              />
            </div>
            {!isDateSaved ? (
              <button className="btn-primary" onClick={saveSemesterDate} style={{ width: 'auto' }}>
                Save Date
              </button>
            ) : (
              <button className="btn-secondary" onClick={() => setIsDateSaved(false)} style={{ width: 'auto' }}>
                Change
              </button>
            )}
          </div>

          {isDateSaved && (
            <div style={{ 
              background: 'var(--accent-light)', 
              border: '1px solid rgba(59,130,246,0.2)', 
              borderRadius: '10px', 
              padding: '10px 16px', 
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--accent-dark)',
              fontWeight: 500
            }}>
              📅 Semester ends on <strong>{new Date(endDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>. All projections are computed up to this date.
            </div>
          )}

          {loading ? <div className="loading">Calculating matrix...</div> : (
            <div className="projection-results">
              {projections.map(proj => (
                <div key={proj.subject_id} className={`projection-card ${proj.safe ? 'safe' : 'at-risk'}`}>
                  <div className="proj-header">
                    <h4>{proj.subject_name}</h4>
                    <div className={`status-badge ${proj.safe ? 'green' : 'red'}`}>
                      {proj.safe ? 'ON TRACK' : 'AT RISK'}
                    </div>
                  </div>
                  
                  <div className="proj-stats">
                    <div className="proj-stat">
                      <span>Current %</span>
                      <strong>{proj.percentage}%</strong>
                    </div>
                    <div className="proj-stat">
                      <span>Remaining</span>
                      <strong>{proj.remaining_classes}</strong>
                    </div>
                    <div className="proj-stat green">
                      <span>Can Skip</span>
                      <strong>{proj.can_skip}</strong>
                    </div>
                    <div className="proj-stat red">
                      <span>Must Attend</span>
                      <strong>{proj.must_attend_to_reach_threshold}</strong>
                    </div>
                  </div>

                  {proj.threshold_cross_date && (
                    <div style={{
                      marginTop: '14px',
                      background: 'var(--accent-light)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: 'var(--accent-dark)',
                      fontWeight: 500
                    }}>
                      📅 If you attend every class, you'll cross {proj.threshold}% on <strong>{new Date(proj.threshold_cross_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </div>
                  )}

                  {!proj.safe && proj.must_attend_to_reach_threshold > proj.remaining_classes && (
                    <div className="proj-warning">
                      ⚠️ Mathematical failure limit exceeded. You cannot reach {proj.threshold}% even if you attend all remaining {proj.remaining_classes} classes.
                    </div>
                  )}
                </div>
              ))}
              {projections.length === 0 && <p className="muted">No subjects found.</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'holiday-plan' && (
        <div className="planner-section">
          <div className="planner-controls">
            <div className="field">
              <label>Start Date</label>
              <input type="date" value={holidayStart} onChange={e => setHolidayStart(e.target.value)} max={endDate || undefined} />
            </div>
            <div className="field">
              <label>End Date</label>
              <input type="date" value={holidayEnd} onChange={e => setHolidayEnd(e.target.value)} min={holidayStart} max={endDate || undefined} />
            </div>
          </div>

          {loading ? <div className="loading">Consulting the oracle...</div> : planResult && (
            <div className="holiday-results">
              <div className={`verdict-banner ${planResult.overall_safe_to_leave ? 'green' : 'red'}`}>
                {planResult.overall_safe_to_leave 
                  ? "✅ Safe to go! You will remain above threshold in all subjects."
                  : `❌ Unsafe. Taking this leave will drop you below threshold in: ${planResult.blocking_subjects.join(', ')}`}
              </div>

              {planResult.subjects.map(sub => {
                if (sub.classes_in_range === 0) return null;
                return (
                  <div key={sub.subject_id} className={`projection-card ${sub.safe_to_take_full_leave ? 'safe' : 'at-risk'}`}>
                    <div className="proj-header" style={{ marginBottom: '8px' }}>
                      <h4>{sub.subject_name}</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                      You have <strong>{sub.classes_in_range}</strong> classes scheduled during this period.
                    </p>
                    
                    <div className="proj-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="proj-stat">
                        <span>Current %</span>
                        <strong>{sub.current_percentage}%</strong>
                      </div>
                      <div className="proj-stat green">
                        <span>Safe to Skip</span>
                        <strong>{sub.max_can_skip}</strong>
                      </div>
                      <div className="proj-stat red">
                        <span>New % if missed</span>
                        <strong>{sub.percentage_if_skip_all}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ProjectionPage;
