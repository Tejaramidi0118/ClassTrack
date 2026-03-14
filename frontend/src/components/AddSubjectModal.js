import React, { useState } from 'react';
import api from '../utils/api';

const AddSubjectModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(75.0);
  const [conducted, setConducted] = useState(0);
  const [present, setPresent] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/subjects', { 
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
          <h3>Add New Subject</h3>
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
              placeholder="e.g. Data Structures" 
              autoFocus
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
            <span className="field-hint">Usually 75% for most universities.</span>
          </div>
          
          <div className="form-row" style={{ gap: '16px', marginBottom: '16px' }}>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Conducted So Far (Optional)</label>
              <input 
                type="number" 
                min="0"
                value={conducted} 
                onChange={e => setConducted(e.target.value)} 
              />
            </div>
            <div className="field" style={{ flex: 1, margin: 0 }}>
              <label>Attended So Far (Optional)</label>
              <input 
                type="number" 
                min="0"
                value={present} 
                onChange={e => setPresent(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal;
