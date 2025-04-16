import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser';

function AllReports({ setSelectedReport }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sentReports, setSentReports] = useState([]);

  const handleDone = async (id) => {
    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'done' })
      .eq('id', id)
      .select() // Kad gautume atnaujintą įrašą
  
    if (error) {
      console.error('Supabase klaida:', error.message)
    } else {
      console.log('Atnaujinta sėkmingai:', data)
  
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  }

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: false })

      console.log('Gauti duomenys:', data)
      console.log('Klaida:', error)

      if (!error) {
        setReports(data)
      }
      setLoading(false)
    }

    fetchReports()
  }, [])

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
  
      if (response.status === 200) {
        setSentReports(prev => [...prev, report.id]); // 👈 Pridedam ID
        alert('Ataskaita išsiųsta sėkmingai!');
      }
      console.log('Email sent:', response.status)
    } catch (err) {
      console.error('Siuntimo klaida:', err)
      alert(`Klaida siunčiant ataskaitą:\n${err?.text || err?.message || 'Nežinoma klaida'}`)
    }
  }
  const handleDelete = async (id) => {
    const confirm = window.confirm('Ar tikrai nori ištrinti šią ataskaitą?');
    if (!confirm) return;
  
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);
  
    if (error) {
      alert('Klaida trinant ataskaitą.');
      console.error('Trinimo klaida:', error.message);
    } else {
      setReports((prev) => prev.filter((r) => r.id !== id));
      alert('Ataskaita ištrinta sėkmingai!');
    }
  };
  const filteredReports = reports.filter((report) =>
    [report.client, report.container_number, report.location, report.variety, report.client_ref, report.rochecks_ref]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={styles.wrapper}>
      <h2>All Reports</h2>
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
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={styles.td}>{report.date}</td>
                  <td style={styles.td}>{report.container_number}</td>
                  <td style={styles.td}>{report.client_ref}</td>
                  <td style={styles.td}>{report.rochecks_ref}</td>
                  <td style={styles.td}>{report.client}</td>
                  <td style={styles.td}>{report.variety}</td>
                  <td style={styles.td}>{report.location}</td>
                  <td style={styles.td}>
                  <button
  style={styles.btn}
  onClick={() => window.open(`/viewreport/${report.id}`, '_blank')}
>
  View
</button>
                    <button
                      style={styles.btn}
                      onClick={() => {
                        setSelectedReport(report)
                        navigate(`/edit/${report.id}`)
                      }}
                    >
                      Edit
                    </button>
                    <button
  style={{
    ...styles.btn,
    background: sentReports.includes(report.id) ? '#4caf50' : '#1976d2'
  }}
  onClick={() => handleSend(report)}
>
  {sentReports.includes(report.id) ? 'Sent' : 'Send'}
</button>
                    <button style={styles.doneBtn} onClick={() => handleDone(report.id)}>Done</button>
                    <button
  style={{ ...styles.btn, background: '#e53935', marginLeft: '1.5rem' }}
  onClick={() => handleDelete(report.id)}
>
  Delete
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

const styles = {
  th: {
    textAlign: 'left',
    borderBottom: '2px solid #ccc',
    padding: '0.5rem',
    whiteSpace: 'nowrap'
  },
  td: {
    borderBottom: '1px solid #eee',
    padding: '0.5rem',
    whiteSpace: 'nowrap'
  },
  wrapper: {
    padding: '2rem',
    width: '100%',
    height: '100%',
    overflowX: 'auto',
    boxSizing: 'border-box'
  },
  btn: {
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    marginRight: '5px',
    cursor: 'pointer'
  },
  doneBtn: {
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer'
  }
}

export default AllReports