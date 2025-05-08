export function AdminPanel({ onAddUserClick, onManageClientsClick, onViewReportsClick }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button onClick={onAddUserClick} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded shadow text-left">
          ➕ Add User
        </button>
        <button onClick={onManageClientsClick} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded shadow text-left">
          👥 Manage Clients
        </button>
        <button onClick={onViewReportsClick} className="bg-green-600 hover:bg-green-700 text-white p-4 rounded shadow text-left">
          📄 View Reports
        </button>
      </div>
    </div>
  );
}
