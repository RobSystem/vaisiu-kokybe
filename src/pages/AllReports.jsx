import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';


function AllReports({ setSelectedReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [page, setPage] = useState(1);
const pageSize = 20;
  const navigate = useNavigate();

  const handleDone = async (id) => {
    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'done' })
      .eq('id', id)
      .select();

    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

    const handleDelete = async (id) => {
    if (!window.confirm('Ar tikrai nori ištrinti šią ataskaitą?')) return;

    const { error } = await supabase.from('reports').delete().eq('id', id);

    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      alert('Ataskaita ištrinta sėkmingai!');
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (!error) {
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

  const filteredReports = reports.filter((r) =>
    [r.client, r.container_number, r.location, r.variety, r.client_ref, r.rochecks_ref]
      .some((field) => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
const total = filteredReports.length;
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const start = (page - 1) * pageSize;
const end = Math.min(start + pageSize, total);
const pageReports = filteredReports.slice(start, end);

useEffect(() => {
  if (page > totalPages) setPage(totalPages);
}, [totalPages, page]);
  return (
    <div className="w-full px-4 py-6 text-xs">
      <h2 className="text-lg font-semibold mb-4">All Reports</h2>

      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => {
  setSearchTerm(e.target.value);
  setPage(1);
}}
        className="mb-4 p-2 border border-gray-300 rounded w-full max-w-xs"
      />

      {loading ? (
        <p>Kraunama...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {['DATE', 'CONTAINER', 'CLIENT REF', 'ROCHECKS REF', 'CLIENT', 'VARIETY', 'LOCATION', 'ACTION', 'STATUS'].map(header => (
                  <th key={header} className="px-3 py-2 border-b text-center">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageReports.map(report => (
                <tr key={report.id} className="text-center">
                  <td className="px-3 py-2 border-b">{report.date}</td>
                  <td className="px-3 py-2 border-b">{report.container_number}</td>
                  <td className="px-3 py-2 border-b">{report.client_ref}</td>
                  <td className="px-3 py-2 border-b">{report.rochecks_ref}</td>
                  <td className="px-3 py-2 border-b">{report.client}</td>
                  <td className="px-3 py-2 border-b">{report.variety}</td>
                  <td className="px-3 py-2 border-b">{report.location}</td>
                                    <td className="px-3 py-2 border-b flex flex-wrap gap-1 justify-center">
  <button
    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
    onClick={() => {
      setSelectedReport(report);
      navigate(`/edit/${report.id}`);
    }}
  >
    Edit
  </button>

  <button
    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
    onClick={() => handleDone(report.id)}
  >
    Done
  </button>

  <button
    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
    onClick={() => handleDelete(report.id)}
  >
    Delete
  </button>
</td>
<td className="px-3 py-2 border-b">
  {report.sent ? (
    <span className="text-green-600 font-semibold">✅ Sent</span>
  ) : (
    <span className="text-gray-400 italic">Not sent</span>
  )}
</td>

                </tr>
              ))}
            </tbody>
          </table>
          <p className="italic mt-2">
  Showing {total === 0 ? 0 : start + 1}–{end} of {total} entries
</p>

<div className="flex items-center gap-2 mt-3 justify-center">
  <button
    className="px-3 py-1 rounded border disabled:opacity-50"
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
  >
    Previous
  </button>

  <span className="text-sm">
    Page {page} of {totalPages}
  </span>

  <button
    className="px-3 py-1 rounded border disabled:opacity-50"
    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
    disabled={page === totalPages}
  >
    Next
  </button>
</div>
        </div>
      )}
    </div>
  );
}

export default AllReports;
