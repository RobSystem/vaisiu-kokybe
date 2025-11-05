// AdminClients.jsx
import React, { useEffect, useState } from 'react';
// ⬇️ Pritaikyk importo kelią pagal savo projektą
// pvz: import { supabase } from '@/lib/supabaseClient';
import { supabase } from '../supabaseClient';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editClientId, setEditClientId] = useState(null);

  // forma (naujas / redaguojamas klientas)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    ccEmails: [''], // dinaminiai CC laukai UI, DB’e saugoma kaip cc_emails: text[]
  });

  // --- Helpers ---
  const sanitizeCc = (arr) =>
    (arr || [])
      .map((e) => (e || '').trim())
      .filter((e) => e.length > 0);

  const isEmail = (s) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

  // --- Fetch ---
  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (!error) setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // --- Open Modal (add) ---
  const handleOpenAdd = () => {
    setEditClientId(null);
    setNewClient({ name: '', email: '', ccEmails: [''] });
    setShowModal(true);
  };

  // --- Open Modal (edit) ---
  const handleEdit = (client) => {
    setEditClientId(client.id);
    setNewClient({
      name: client.name || '',
      email: client.email || '',
      ccEmails:
        Array.isArray(client.cc_emails) && client.cc_emails.length > 0
          ? client.cc_emails
          : [''],
    });
    setShowModal(true);
  };

  // --- Delete ---
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  // --- Save (insert / update) ---
  const handleSaveClient = async () => {
    const name = (newClient.name || '').trim();
    const email = (newClient.email || '').trim();
    const cc_emails = sanitizeCc(newClient.ccEmails);

    if (!name || !email) {
      alert('Name and main email are required.');
      return;
    }
    if (!isEmail(email)) {
      alert('Main email is invalid.');
      return;
    }
    // validuojam CC
    for (const cc of cc_emails) {
      if (!isEmail(cc)) {
        alert(`Invalid CC email: ${cc}`);
        return;
      }
    }

    const payload = { name, email, cc_emails };

    if (editClientId) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editClientId);
      if (error) {
        alert('Failed to update client.');
        return;
      }
    } else {
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) {
        alert('Failed to create client.');
        return;
      }
    }

    setShowModal(false);
    setEditClientId(null);
    setNewClient({ name: '', email: '', ccEmails: [''] });
    fetchClients();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Clients</h2>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Add Client
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-sm font-semibold text-gray-600 p-3">
                Name
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 p-3">
                Email
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 p-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={3}>
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={3}>
                  No clients yet.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-t">
                  <td className="p-3">{client.name}</td>
                  <td className="p-3">
                    <div>{client.email}</div>
                    {Array.isArray(client.cc_emails) &&
                      client.cc_emails.length > 0 && (
                        <div className="text-xs text-gray-500">
                          CC: {client.cc_emails.join(', ')}
                        </div>
                      )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-[360px]">
            <h3 className="text-lg font-semibold mb-4">
              {editClientId ? 'Edit Client' : 'Add New Client'}
            </h3>

            <label className="block text-sm font-medium mb-1">Client name</label>
            <input
              type="text"
              placeholder="Client name"
              value={newClient.name}
              onChange={(e) =>
                setNewClient({ ...newClient, name: e.target.value })
              }
              className="w-full mb-3 p-2 border rounded"
            />

            <label className="block text-sm font-medium mb-1">Client email</label>
            <input
              type="email"
              placeholder="Client email"
              value={newClient.email}
              onChange={(e) =>
                setNewClient({ ...newClient, email: e.target.value })
              }
              className="w-full mb-3 p-2 border rounded"
            />

            {/* CC emails */}
            <label className="block text-sm font-medium mb-1">
              CC emails (optional)
            </label>
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
              onClick={() =>
                setNewClient({
                  ...newClient,
                  ccEmails: [...(newClient.ccEmails || []), ''],
                })
              }
              className="mb-3 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              + Add CC
            </button>

            <div className="flex justify-between mt-4">
              <button
                onClick={handleSaveClient}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditClientId(null);
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
