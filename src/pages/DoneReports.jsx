import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

function DoneReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (!error && data) setUserProfile(data);
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
        .eq('status', 'done')
        .order('date', { ascending: false });

      if (userProfile.role === 'user') {
        query = query.eq('surveyor', userProfile.name);
      }

      const { data, error } = await query;
      if (!error && data) setReports(data);
      setLoading(false);
    };

    fetchReports();
  }, [userProfile]);

  const filteredReports = reports.filter((report) =>
    [report.client, report.container_number, report.location, report.variety, report.client_ref, report.rochecks_ref]
      .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSend = async (report) => {
  const confirmed = window.confirm('Are you sure you want to send the report?');
  if (!confirmed) return;

  try {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('email')
      .ilike('name', `%${report.client}%`)
      .single();

    if (error || !clientData?.email) {
      alert("Client email not found.");
      return;
    }

    const response = await emailjs.send(
      'service_v9qenwn',            // tavo service ID (tokį naudoji AllReports)
      'template_sf4fphk',       // naujasis HTML šablono ID
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
      'nBddtmb09-d6gjfcl'           // tavo EmailJS public key
    );

    if (response.status === 200) {
      alert('Report sent successfully!');
    }
  } catch (err) {
    console.error('Sending error:', err);
    alert(`Error sending report:\n${err?.message || 'Unknown error'}`);
  }
};

  return (
    <div className="w-full px-4 py-6 text-xs">
      <h2 className="text-lg font-semibold mb-4">Done Reports</h2>
      <input
        type="text"
        placeholder="Search..."
        className="mb-4 p-2 border border-gray-300 rounded w-full max-w-xs"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
                      className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-800"
                      onClick={() => window.open(`/viewreport/${report.id}`, '_blank')}
                    >
                      View
                    </button>
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      onClick={() => navigate(`/edit/${report.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                      onClick={() => handleSend(report)}
                    >
                      Send
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

export default DoneReports;
