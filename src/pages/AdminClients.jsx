import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function AdminClients() {
  const [clients, setClients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '' })
  const [editClientId, setEditClientId] = useState(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*')
    if (!error) setClients(data)
  }

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.email) return

    if (editClientId) {
      await supabase.from('clients').update(newClient).eq('id', editClientId)
    } else {
      await supabase.from('clients').insert([newClient])
    }

    setShowModal(false)
    setNewClient({ name: '', email: '' })
    setEditClientId(null)
    fetchClients()
  }

  const handleDelete = async (id) => {
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const handleEdit = (client) => {
    setNewClient({ name: client.name, email: client.email })
    setEditClientId(client.id)
    setShowModal(true)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Client Management</h2>
      <button onClick={() => { setNewClient({ name: '', email: '' }); setEditClientId(null); setShowModal(true) }}>Add Client</button>

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>{editClientId ? 'Edit Client' : 'Add New Client'}</h3>
            <input
              type="text"
              placeholder="Client name"
              value={newClient.name}
              onChange={e => setNewClient({ ...newClient, name: e.target.value })}
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Client email"
              value={newClient.email}
              onChange={e => setNewClient({ ...newClient, email: e.target.value })}
              style={styles.input}
            />
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleSaveClient} style={styles.button}>Save</button>
              <button onClick={() => setShowModal(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}

<table style={styles.table}>
        <thead>
          <tr>
          <th style={styles.th}>Name</th>
<th style={styles.th}>Email</th>
<th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id}>
              <td style={styles.td}>{client.name}</td>
<td style={styles.td}>{client.email}</td>
<td style={styles.td}>
  <button onClick={() => handleEdit(client)} style={{marginRight: '0.5rem'}}>Edit</button>
  <button onClick={() => handleDelete(client.id)} style={{ backgroundColor: '#e53935', color: 'white' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '300px',
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    marginBottom: '1rem',
    padding: '0.5rem',
    fontSize: '14px'
  },
  button: {
    padding: '0.5rem 1rem',
    marginRight: '1rem',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ccc',
    border: 'none',
    borderRadius: '4px'
  },
  table: {
    marginTop: '2rem',
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  
  th: {
    borderBottom: '1px solid #ccc',
    padding: '0.75rem',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    textAlign: 'center',
  }
}

export default AdminClients