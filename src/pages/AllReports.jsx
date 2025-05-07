import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

function AllReports({ setSelectedReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentReports, setSentReports] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
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

  const handleSend = async (report) => {
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('email')
        .eq('name', report.client)
        .single();

      if (error || !clientData?.email) {
        alert('Nepavyko rasti kliento el. pašto.');
        return;
      }

      const reportUrl = `https://app.rochecks.nl/viewreport/${report.id}`;
      const subject = `Report: ${report.container_number} | Ref: ${report.client_ref}`;
      const message = `Quality Score: ${report.qualityScore || '—'}\nStorage Score: ${report.storageScore || '—'}\n\nConclusion:\n${report.conclusion || '—'}\n\nView full report: ${reportUrl}`;

      const response = await emailjs.send(
        'service_t7xay1d',
        'template_cr4luhy',
        {
          to_email: clientData.email,
          subject,
          message,
        },
        'nBddtmb09-d6gjfcl'
      );

      if (response.status === 200) {
        setSentReports((prev) => [...prev, report.id]);
        alert('Ataskaita išsiųsta sėkmingai!');
      }
    } catch (err) {
      console.error('Siuntimo klaida:', err);
      alert(`Klaida siunčiant ataskaitą:\n${err?.message || 'Nežinoma klaida'}`);
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

  return (
    <div className="p-6 w-full max-w-7xl px-4 text-xs">
      <h2 className="text-xl font-bold mb-4">All Reports</h2>

      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border px-3 py-2 mb-4 rounded w-full max-w-xs"
      />

      {loading ? (
        <p>Kraunama...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  {['DATE', 'CONTAINER', 'CLIENT REF', 'ROCHECKS REF', 'CLIENT', 'VARIETY', 'LOCATION', 'ACTION'].map(header => (
                    <th key={header} className="px-4 py-2 font-semibold text-gray-600 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{report.date}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.container_number}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.client_ref}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.rochecks_ref}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.client}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.variety}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{report.location}</td>
                    <td className="px-4 py-2 flex flex-wrap gap-1">
                      <button
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                        onClick={() => window.open(`/viewreport/${report.id}`, '_blank')}
                      >
                        View
                      </button>
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
                        className={`text-white px-3 py-1 rounded ${
                          sentReports.includes(report.id)
                            ? 'bg-green-500'
                            : 'bg-indigo-500 hover:bg-indigo-600'
                        }`}
                        onClick={() => handleSend(report)}
                      >
                        {sentReports.includes(report.id) ? 'Sent' : 'Send'}
                      </button>
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                        onClick={() => handleDone(report.id)}
                      >
                        Done
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2"
                        onClick={() => handleDelete(report.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 mt-4 italic">
            Showing 1 to {filteredReports.length} of {filteredReports.length} entries
          </p>
        </>
      )}
    </div>
  );
}

export default AllReports;
