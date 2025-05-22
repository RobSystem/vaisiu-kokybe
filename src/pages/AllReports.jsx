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
  const confirmed = window.confirm('Are you sure you want to send the report?');
  if (!confirmed) return;

  try {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('email')
      .eq('name', report.client)
      .single();

    if (error || !clientData?.email) {
      alert("Client email not found.");
      return;
    }

    const response = await emailjs.send(
      'service_v9qenwn',              // Your EmailJS service ID
      'template_sf4fphk',         // Your new HTML template ID
      {
        to_email: clientData.email,
        container_number: report.container_number || '—',
        client_ref: report.client_ref || '—',
        variety: report.variety || '—',
        qualityScore: report.qualityScore || '—',
        storageScore: report.storageScore || '—',
        conclusion: report.conclusion || '—',
        id: report.id,
      },
      'nBddtmb09-d6gjfcl'             // Your EmailJS public key
    );

    if (response.status === 200) {
      setSentReports((prev) => [...prev, report.id]);
      alert('Report sent successfully!');
    }
  } catch (err) {
    console.error('Sending error:', err);
    alert(`Error sending report:\n${err?.message || 'Unknown error'}`);
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
    <div className="w-full px-4 py-6 text-xs">
      <h2 className="text-lg font-semibold mb-4">All Reports</h2>

      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border border-gray-300 rounded w-full max-w-xs"
      />

      {loading ? (
        <p>Kraunama...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {['DATE', 'CONTAINER', 'CLIENT REF', 'ROCHECKS REF', 'CLIENT', 'VARIETY', 'LOCATION', 'ACTION'].map(header => (
                  <th key={header} className="px-3 py-2 border-b text-center">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
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
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(report.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="italic mt-2">Showing 1 to {filteredReports.length} of {filteredReports.length} entries</p>
        </div>
      )}
    </div>
  );
}

export default AllReports;
