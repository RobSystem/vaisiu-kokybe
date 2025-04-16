import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

function DoneReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfile, setUserProfile] = useState(null);
  const cellStyle = {
    padding: '0.5rem',
    verticalAlign: 'middle',
    textAlign: 'center'
  }
  const headerStyle = {
    padding: '0.5rem',
    borderBottom: '1px solid #ccc',
    textAlign: 'center'
  }
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('user_id', supabase.auth.user().id)
        .single();
  
      if (!error && data) {
        setUserProfile(data);
      }
    };
  
    fetchUserProfile();
  }, []);
  useEffect(() => {
    if (!userProfile) return;
  
    const fetchReports = async () => {
      setLoading(true);
  
      let query = supabase
        .from('reports')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: false });
  
      if (userProfile.role === 'user') {
        query = query.eq('surveyor', userProfile.name);
      }
  
      const { data, error } = await query;
  
      if (!error && data) {
        setReports(data);
      }
  
      setLoading(false);
    };
  
    fetchReports();
  }, [userProfile]);
  const filteredReports = reports.filter((report) =>
    [report.client, report.container_number, report.location, report.variety, report.client_ref, report.rochecks_ref]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const handleSend = async (report) => {
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('email')
        .eq('name', report.client)
        .single()
  
      if (error || !clientData?.email) {
        alert('Nepavyko rasti kliento el. pašto.')
        return
      }
  
      const reportUrl = `https://app.rochecks.nl/viewreport/${report.id}`
      const subject = `Report: ${report.container_number} | Ref: ${report.client_ref}`
      const message = `Quality Score: ${report.qualityScore || '—'}\nStorage Score: ${report.storageScore || '—'}\n\nConclusion:\n${report.conclusion || '—'}\n\nView full report: ${reportUrl}`
  
      const response = await emailjs.send(
        'service_t7xay1d',
        'template_cr4luhy',
        {
          to_email: clientData.email,
          subject: subject,
          message: message
        },
        'nBddtmb09-d6gjfcl'
      )
  
      alert('Ataskaita išsiųsta sėkmingai!')
      console.log('Email sent:', response.status)
    } catch (err) {
      console.error('Siuntimo klaida:', err)
      alert(`Klaida siunčiant ataskaitą:\n${err?.text || err?.message || 'Nežinoma klaida'}`)
    }
  }
  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <h2>Done Reports</h2>
      <input
  type="text"
  placeholder="Search..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{
    padding: '8px',
    marginBottom: '1rem',
    width: '100%',
    maxWidth: '300px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  }}
/>

      {loading ? (
        <p>Kraunama...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr>
                {['DATE', 'CONTAINER', 'CLIENT REF', 'ROCHECKS REF', 'CLIENT', 'VARIETY', 'LOCATION', 'ACTION'].map((header) => (
                  <th key={header} style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={cellStyle}>{report.date}</td>
                  <td style={cellStyle}>{report.container_number}</td>
<td style={cellStyle}>{report.client_ref}</td>
<td style={cellStyle}>{report.rochecks_ref}</td>
<td style={cellStyle}>{report.client}</td>
<td style={cellStyle}>{report.variety}</td>
<td style={cellStyle}>{report.location}</td>
<td style={{
  padding: '0.5rem',
  textAlign: 'center',
  verticalAlign: 'middle'
}}>
  <button
    onClick={() => window.open(`/viewreport/${report.id}`, '_blank')}
    style={{
      padding: '6px 12px',
      background: '#1976d2',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer'
    }}
  >
    View
  </button>
  <button
    onClick={() => navigate(`/edit/${report.id}`)}
    style={{
      padding: '6px 12px',
      background: '#4caf50',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginLeft: '0.5rem'
    }}
  >
    Edit
  </button>
  <button
    onClick={() => handleSend(report)}
    style={{
      padding: '6px 12px',
      background: '#ffa000',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginLeft: '0.5rem'
    }}
  >
    Send
  </button>
</td>

                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontStyle: 'italic' }}>
            Showing 1 to {reports.length} of {reports.length} entries
          </div>
        </>
      )}
    </div>
  )
}

export default DoneReports
