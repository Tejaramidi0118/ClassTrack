import React, { useState } from 'react';
import { Upload, Plus, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import api from '../utils/api';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const UploadTimetableModal = ({ onClose, onSuccess }) => {
  const [slots, setSlots] = useState([]);
  const [subjectName, setSubjectName] = useState('');
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  const handleAdd = () => {
    if (!subjectName.trim()) return;
    setSlots(prev => [...prev, {
      subject_name: subjectName.trim(),
      day_of_week: day,
      slot_time: time.trim() || 'N/A'
    }]);
    setTime('');
  };

  const handleRemove = (idx) => {
    setSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (slots.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/timetable/bulk-save', { slots });
      setResultMsg(res.data.message);
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save');
      setLoading(false);
    }
  };

  // Group slots by subject for cleaner display
  const grouped = {};
  slots.forEach((s, idx) => {
    if (!grouped[s.subject_name]) grouped[s.subject_name] = [];
    grouped[s.subject_name].push({ ...s, idx });
  });

  return (
    <div className="modal-overlay">
      <div className="modal large">
        <div className="modal-header">
          <h3><Calendar size={18} style={{marginRight:'8px', verticalAlign:'text-bottom'}}/> Add Timetable</h3>
          <button onClick={onClose} className="icon-btn" style={{ border:'none' }}>✕</button>
        </div>

        {resultMsg ? (
          <div style={{ padding:'24px', textAlign:'center' }}>
            <CheckCircle2 size={40} style={{ color:'var(--green)', marginBottom:'12px' }}/>
            <div style={{ fontSize:'16px', fontWeight:600 }}>{resultMsg}</div>
          </div>
        ) : (
          <>
            <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'16px' }}>
              Add your class schedule below. Enter the subject, pick the day, and optionally add a time slot.
            </p>

            {/* Entry form */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px', alignItems:'flex-end', flexWrap:'wrap' }}>
              <div className="field" style={{ flex:'2', margin:0, minWidth:'140px' }}>
                <label>Subject</label>
                <input type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. 22AIE314" />
              </div>
              <div className="field" style={{ flex:'1', margin:0, minWidth:'100px' }}>
                <label>Day</label>
                <select value={day} onChange={e => setDay(e.target.value)}>
                  {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex:'1', margin:0, minWidth:'100px' }}>
                <label>Time (optional)</label>
                <input type="text" value={time} onChange={e => setTime(e.target.value)} placeholder="9:00-9:50" />
              </div>
              <button className="btn-primary" onClick={handleAdd} style={{ width:'auto', padding:'10px 16px', flexShrink:0 }}>
                <Plus size={16} />
              </button>
            </div>

            {/* Preview table */}
            {slots.length > 0 && (
              <div style={{ border:'1px solid var(--border)', borderRadius:'10px', overflowY:'auto', maxHeight:'300px', marginBottom:'16px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                  <thead style={{ background:'var(--surface2)', position:'sticky', top:0 }}>
                    <tr>
                      <th style={{ padding:'10px 14px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Subject</th>
                      <th style={{ padding:'10px 14px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Day</th>
                      <th style={{ padding:'10px 14px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Time</th>
                      <th style={{ padding:'10px 14px', width:'40px', borderBottom:'1px solid var(--border)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 14px', fontWeight:600 }}>{s.subject_name}</td>
                        <td style={{ padding:'10px 14px', color:'var(--accent)' }}>{DAY_LABELS[s.day_of_week]}</td>
                        <td style={{ padding:'10px 14px', color:'var(--muted)' }}><Clock size={12} style={{marginRight:'4px'}}/>{s.slot_time}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <button className="icon-btn danger" onClick={() => handleRemove(idx)} style={{ width:'24px', height:'24px' }}>
                            <Trash2 size={12}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ fontSize:'13px', color:'var(--muted)', marginBottom:'12px' }}>
              {slots.length} slot{slots.length !== 1 ? 's' : ''} added
            </div>

            {errorMsg && <div style={{ color:'var(--red)', fontSize:'14px', background:'rgba(239,68,68,0.08)', padding:'12px', borderRadius:'8px', marginBottom:'12px' }}>{errorMsg}</div>}

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={slots.length === 0 || loading}>
                {loading ? 'Saving...' : `Save ${slots.length} Slot${slots.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadTimetableModal;
