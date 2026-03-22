import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, ArrowLeft, BookOpen, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const STEPS = ['Welcome', 'Semester End Date', 'Add Subjects'];

const SetupWizard = () => {
  const { completeWizard, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [semesterEnd, setSemesterEnd] = useState('');
  const [subjects, setSubjects] = useState([{ name: '', threshold: 75 }]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const addSubjectRow = () => setSubjects([...subjects, { name: '', threshold: 75 }]);

  const updateSubject = (i, field, value) => {
    const updated = [...subjects];
    updated[i][field] = value;
    setSubjects(updated);
  };

  const removeSubject = (i) => setSubjects(subjects.filter((_, idx) => idx !== i));

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save semester end date
      if (semesterEnd) {
        await api.put('/auth/settings', { semester_end_date: semesterEnd });
        updateUser({ semester_end_date: semesterEnd });
      }

      // Save subjects
      const validSubjects = subjects.filter(s => s.name.trim());
      for (const sub of validSubjects) {
        await api.post('/subjects', { name: sub.name.trim(), threshold: Number(sub.threshold) });
      }

      setDone(true);
      setTimeout(() => completeWizard(), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal" style={{ width: '520px', maxWidth: '95vw', padding: '32px' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                height: '4px', borderRadius: '2px',
                background: i <= step ? 'var(--primary)' : 'var(--border)',
                transition: 'background 0.3s'
              }} />
              <div style={{ fontSize: '11px', color: i === step ? 'var(--text)' : 'var(--muted)', marginTop: '6px' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
            <h2 style={{ marginBottom: '12px' }}>Welcome to ClassTrack</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              Let's set up your semester in 2 quick steps — your semester end date and your subjects. Takes less than a minute.
            </p>
            <button className="btn-primary" onClick={() => setStep(1)} style={{ width: '100%' }}>
              Get Started <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
            </button>
            <button onClick={completeWizard} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', marginTop: '16px', cursor: 'pointer' }}>
              Skip setup for now
            </button>
          </div>
        )}

        {/* Step 1 — Semester End Date */}
        {step === 1 && (
          <div>
            <Calendar size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>When does your semester end?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
              This is used to calculate how many classes you can skip and project your attendance.
            </p>
            <div className="field">
              <label>Semester End Date</label>
              <input
                type="date"
                value={semesterEnd}
                onChange={e => setSemesterEnd(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setStep(0)} style={{ flex: 1 }}>
                <ArrowLeft size={16} style={{ verticalAlign: 'middle' }} /> Back
              </button>
              <button className="btn-primary" onClick={() => setStep(2)} style={{ flex: 2 }}>
                Next <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Add Subjects */}
        {step === 2 && (
          <div>
            {done ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
                <h3>You're all set!</h3>
                <p style={{ color: 'var(--muted)' }}>Taking you to your dashboard...</p>
              </div>
            ) : (
              <>
                <BookOpen size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Add your subjects</h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                  Add the subjects you're enrolled in this semester. You can always add more later.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                  {subjects.map((sub, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Subject ${i + 1} (e.g. Data Structures)`}
                        value={sub.name}
                        onChange={e => updateSubject(i, 'name', e.target.value)}
                        style={{ flex: 3, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <Clock size={14} color="var(--muted)" />
                        <input
                          type="number"
                          value={sub.threshold}
                          onChange={e => updateSubject(i, 'threshold', e.target.value)}
                          min={0} max={100}
                          style={{ width: '56px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>%</span>
                      </div>
                      {subjects.length > 1 && (
                        <button onClick={() => removeSubject(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addSubjectRow}
                  style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--muted)', width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer', marginTop: '12px', fontSize: '14px' }}
                >
                  + Add another subject
                </button>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                    <ArrowLeft size={16} style={{ verticalAlign: 'middle' }} /> Back
                  </button>
                  <button className="btn-primary" onClick={handleFinish} disabled={saving} style={{ flex: 2 }}>
                    {saving ? 'Saving...' : 'Finish Setup'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;