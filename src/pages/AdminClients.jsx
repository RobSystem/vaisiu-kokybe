import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminClients() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', ccEmails: [''] });
  const [editClientId, setEditClientId] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (!error) setClients(data);
  };

  const handleSaveClient = async () => {
  if (!newClient.name || !newClient.email) return;

  const payload = {
    name: newClient.name,
    email: newClient.email,
    cc_emails: (newClient.ccEmails || []).map(e => e.trim()).filter(Boolean)
  };

  if (editClientId) {
    await supabase.from('clients').update(payload).eq('id', editClientId);
  } else {
    await supabase.from('clients').insert([payload]);
  }

  setShowModal(false);
  setNewClient({ name: '', email: '', ccEmails: [''] });
  setEditClientId(null);
  fetchClients();
};

  const handleDelete = async (id) => {
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  const handleEdit = (client) => {
  setNewClient({
    name: client.name,
    email: client.email,
    ccEmails: Array.isArray(client.cc_emails) && client.cc_emails.length ? client.cc_emails : [''],
  });
  setEditClientId(client.id);
  setShowModal(true);
};

  return (
    <div className="w-full px-4 mt-10">
      <h2 className="text-xl font-semibold mb-4">Client Management</h2>
      <button
        onClick={() => {
          setNewClient({ name: '', email: '', ccEmails: [''] });
          setEditClientId(null);
          setShowModal(true);
        }}
        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Add Client
      </button>

      <label className="block text-sm font-medium mb-1">CC emails (optional)</label>
{(newClient.ccEmails || []).map((cc, idx) => (
  <div key={idx} className="flex items-center gap-2 mb-2">
    <input
      type="email"
      placeholder={`cc email #${idx + 1}`}
      value={cc}
      onChange={(e) => {
        const copy = [...newClient.ccEmails];
        copy[idx] = e.target.value;
        setNewClient({ ...newClient, ccEmails: copy });
      }}
      className="flex-1 p-2 border rounded"
    />
    <button
      type="button"
      onClick={() => {
        const copy = [...newClient.ccEmails];
        copy.splice(idx, 1);
        if (copy.length === 0) copy.push('');
        setNewClient({ ...newClient, ccEmails: copy });
      }}
      className="px-2 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
      title="Remove"
    >
      −
    </button>
  </div>
))}
<button
  type="button"
  onClick={() => setNewClient({ ...newClient, ccEmails: [...(newClient.ccEmails || []), ''] })}
  className="mb-3 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
>
  + Add CC
</button>
      <div className="overflow-x-auto">
        <table className="w-full bg-white border rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left border-b">Name</th>
              <th className="p-3 text-left border-b">Email</th>
              <th className="p-3 text-center border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 border-b">
                <td className="p-3">{client.name}</td>
                <td className="p-3">
  <div>{client.email}</div>
  {Array.isArray(client.cc_emails) && client.cc_emails.length > 0 && (
    <div className="text-xs text-gray-500">
      CC: {client.cc_emails.join(', ')}
    </div>
  )}
</td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminClients;
