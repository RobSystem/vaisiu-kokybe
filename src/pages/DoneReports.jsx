import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

function DoneReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [page, setPage] = useState(1);
const pageSize = 20;
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
const total = filteredReports.length;
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const start = (page - 1) * pageSize;
const end = Math.min(start + pageSize, total);
const pageReports = filteredReports.slice(start, end);
useEffect(() => {
  if (page > totalPages) setPage(totalPages);
}, [totalPages, page]);
  const handleSend = async (report) => {
  const confirmed = window.confirm('Are you sure you want to send the report?');
  if (!confirmed) return;

  try {
    // 1) Kliento email + CC
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('email, cc_emails')
      .eq('name', report.client) // naudok tą patį kriterijų kaip EditReport
      .single();

    if (error || !clientData?.email) {
      alert('Client email not found.');
      return;
    }

    const toEmail = clientData.email;
    const ccList = Array.isArray(clientData.cc_emails)
      ? clientData.cc_emails.filter(Boolean).join(',')
      : '';
// iš tekstų "3 - ..." pasiimam skaičių
const parseLevel = (val) => {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
};

// pagal lygį grąžinam spalvas (inline CSS-friendly)
const levelColors = (level) => {
  // 1–3 RED, 4–5 YELLOW, 6–7 GREEN
  if (level >= 1 && level <= 3) {
    return {
      bg:   '#fde2e2', // švelni raudona fono
      border: '#fca5a5',
      text: '#b91c1c', // tamsesnė raudona tekstui
    };
  }
  if (level >= 4 && level <= 5) {
    return {
      bg:   '#fef3c7', // švelni geltona
      border: '#fcd34d',
      text: '#92400e', // ruda/geltona tekstui
    };
  }
  // 6–7
  return {
    bg:   '#dcfce7', // švelni žalia
    border: '#86efac',
    text: '#166534', // tamsesnė žalia
  };
};

const qLevel = parseLevel(form?.qualityScore || report?.qualityScore);
const sLevel = parseLevel(form?.storageScore || report?.storageScore);

const qc = levelColors(qLevel ?? 6); // jei neranda – laikom „gerai“
const sc = levelColors(sLevel ?? 6);

    // 2) Siunčiam per EmailJS
    await emailjs.send(
  'service_v9qenwn',
  'template_sf4fphk',
  {
    to_email: toEmail,
    cc: ccList, // jei naudoji CC
    container_number: report.container_number || '—',
    client_ref: report.client_ref || '—',
    variety: report.variety || '—',

    qualityScore: form.qualityScore || report.qualityScore || '—',
    storageScore: form.storageScore || report.storageScore || '—',
    conclusion: latestConclusion, // kaip darėm anksčiau

    // 👇 nauji spalvų kintamieji šablonui
    quality_bg: qc.bg,
    quality_border: qc.border,
    quality_text: qc.text,
    storage_bg: sc.bg,
    storage_border: sc.border,
    storage_text: sc.text,

    id: report.id,
  },
  'nBddtmb09-d6gjfcl'
);

    if (response.status === 200) {
      // 🔹 Pažymim siųstą
      await supabase.from('reports').update({ sent: true }).eq('id', report.id);
      alert('Report sent successfully!');
    } else {
      alert('Email service returned non-200 response.');
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
  onChange={(e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  }}
/>
      {loading ? (
        <p>Loading...</p>
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
          <p className="italic mt-2">
  Showing {total === 0 ? 0 : start + 1}–{end} of {total} entries
</p>

<div className="flex items-center gap-2 mt-3 justify-center">
  <button
    className="px-3 py-1 rounded border disabled:opacity-50"
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
  >
    Previuos
  </button>

  <span className="text-sm">
    Page {page} from {totalPages}
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

export default DoneReports;
