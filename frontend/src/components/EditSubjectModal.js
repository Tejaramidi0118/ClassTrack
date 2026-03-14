import React, { useState } from 'react';
import api from '../utils/api';
import { Settings } from 'lucide-react';

const EditSubjectModal = ({ subject, onClose, onSuccess }) => {
  const [name, setName] = useState(subject.name);
  const [threshold, setThreshold] = useState(subject.threshold);
  const [conducted, setConducted] = useState(subject.baseline_conducted || 0);
  const [present, setPresent] = useState(subject.baseline_present || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/subjects/${subject.id}`, { 
        name, 
        threshold: parseFloat(threshold),
        baseline_conducted: parseInt(conducted) || 0,
        baseline_present: parseInt(present) || 0
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal small">
        <div className="modal-header">
          <h3><Settings size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} /> Edit Subject</h3>
          <button onClick={onClose} className="icon-btn" style={{ border: 'none' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Subject Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="field">
            <label>Attendance Threshold (%)</label>
            <input 
              type="number" 
              required 
              min="0" max="100" step="0.1"
              value={threshold} 
              onChange={e => setThreshold(e.target.value)} 
            />
          </div>
          
          <div className="form-row" style={{ gap: '16px', marginBottom: '16px' }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Classes Conducted</label>
              <input 
                type="number" 
                min="0"
                value={conducted} 
                onChange={e => setConducted(e.target.value)} 
              />
            </div>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Classes Attended</label>
              <input 
                type="number" 
                min="0"
                value={present} 
                onChange={e => setPresent(e.target.value)} 
              />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
            These baseline numbers are added to your tracked attendance to calculate your total percentage.
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubjectModal;
