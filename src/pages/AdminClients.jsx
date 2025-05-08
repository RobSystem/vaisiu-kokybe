import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminClients() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '' });
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

    if (editClientId) {
      await supabase.from('clients').update(newClient).eq('id', editClientId);
    } else {
      await supabase.from('clients').insert([newClient]);
    }

    setShowModal(false);
    setNewClient({ name: '', email: '' });
    setEditClientId(null);
    fetchClients();
  };

  const handleDelete = async (id) => {
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  const handleEdit = (client) => {
    setNewClient({ name: client.name, email: client.email });
    setEditClientId(client.id);
    setShowModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Client Management</h2>
      <button
        onClick={() => {
          setNewClient({ name: '', email: '' });
          setEditClientId(null);
          setShowModal(true);
        }}
        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Add Client
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-[300px]">
            <h3 className="text-lg font-semibold mb-4">
              {editClientId ? 'Edit Client' : 'Add New Client'}
            </h3>
            <input
              type="text"
              placeholder="Client name"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full mb-3 p-2 border rounded"
            />
            <input
              type="email"
              placeholder="Client email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              className="w-full mb-3 p-2 border rounded"
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handleSaveClient}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                <td className="p-3">{client.email}</td>
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
