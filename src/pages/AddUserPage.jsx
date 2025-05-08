export function AddUserPage({ onAddUser, onCancel }) {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Add New User</h2>
      <form onSubmit={onAddUser} className="space-y-4">
        <div>
          <label className="block mb-1">Email:</label>
          <input name="email" type="email" className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Role:</label>
          <select name="role" className="w-full p-2 border rounded">
            <option value="admin">Admin</option>
            <option value="client">Client</option>
          </select>
        </div>
        <div className="flex justify-between pt-2">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Add User
          </button>
          <button onClick={onCancel} type="button" className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}