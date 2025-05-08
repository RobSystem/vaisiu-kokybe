export function AdminClients({ clients, onEdit, onDelete }) {
  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Client List</h2>
      <table className="w-full border-collapse bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border-b">Client Name</th>
            <th className="p-3 border-b">Contact</th>
            <th className="p-3 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{client.name}</td>
              <td className="p-3">{client.contact}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => onEdit(client)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => onDelete(client.id)} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}