import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReport, fetchClients, fetchSurveyors } from '../utils/supabaseClient';

const CreateReport = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    client: '',
    client_ref: '',
    container_number: '',
    roche_ref: '',
    supplier: '',
    variety: '',
    origin: '',
    location: '',
    total_pallets: '',
    type: 'Conventional',
    surveyor: '',
  });

  useEffect(() => {
    fetchClients().then(setClients);
    fetchSurveyors().then(setSurveyors);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createReport(formData);
    navigate('/all');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '2rem',
          rowGap: '1.5rem',
          maxWidth: '900px',
          width: '100%',
        }}
      >
        <h2 style={{ gridColumn: 'span 2', textAlign: 'center' }}>Create Report</h2>

        <div>
          <label>DATE</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </div>

        <div>
          <label>VARIETY</label>
          <input type="text" name="variety" value={formData.variety} onChange={handleChange} />
        </div>

        <div>
          <label>CLIENT</label>
          <select name="client" value={formData.client} onChange={handleChange} required>
            <option value="">-- Select client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>SUPPLIER</label>
          <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} />
        </div>

        <div>
          <label>CLIENT REF</label>
          <input type="text" name="client_ref" value={formData.client_ref} onChange={handleChange} />
        </div>

        <div>
          <label>ORIGIN</label>
          <input type="text" name="origin" value={formData.origin} onChange={handleChange} />
        </div>

        <div>
          <label>CONTAINER NUMBER</label>
          <input type="text" name="container_number" value={formData.container_number} onChange={handleChange} />
        </div>

        <div>
          <label>LOCATION</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} />
        </div>

        <div>
          <label>ROCHECKS REF</label>
          <input type="text" name="roche_ref" value={formData.roche_ref} onChange={handleChange} />
        </div>

        <div>
          <label>TOTAL PALLETS</label>
          <input type="text" name="total_pallets" value={formData.total_pallets} onChange={handleChange} />
        </div>

        <div>
          <label>TYPE</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="Conventional">Conventional</option>
            <option value="Organic">Organic</option>
          </select>
        </div>

        <div>
          <label>SURVEYOR</label>
          <select name="surveyor" value={formData.surveyor} onChange={handleChange}>
            <option value="">-- Select surveyor --</option>
            {surveyors.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
          <button type="submit" style={{ padding: '0.75rem 2rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px' }}>Create Report</button>
        </div>
      </form>
    </div>
  );
};

export default CreateReport;
