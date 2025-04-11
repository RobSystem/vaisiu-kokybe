import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom';

function DoneReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
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
    
    const fetchReports = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'done')
        .order('date', { ascending: false })

      if (!error) {
        setReports(data)
      }
      setLoading(false)
    }

    fetchReports()
  }, [])
  const filteredReports = reports.filter((report) =>
    [report.client, report.container_number, report.location, report.variety, report.client_ref, report.rochecks_ref]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
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
