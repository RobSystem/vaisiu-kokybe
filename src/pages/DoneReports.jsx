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
  const ok = window.confirm('Are you sure you want to send the report?');
  if (!ok) return;

  try {
    // Kliento el. paštai
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('email, cc_emails')
      .eq('name', report.client)
      .single();

    if (clientErr || !clientData?.email) {
      alert('Client email not found.');
      return;
    }
    const toEmail = clientData.email;
    const ccList = Array.isArray(clientData.cc_emails)
      ? clientData.cc_emails.filter(Boolean).join(',')
      : '';

    // DB reikšmės (Done puslapyje paprastai jau galutinės)
    const qStr = report.qualityScore;
    const sStr = report.storageScore;
    const latestConclusion = (report.conclusion?.trim() || '—').replace(/\n/g, '<br>');

    // Spalvos
    const qc = levelColors(parseLevel(qStr) ?? 6);
    const sc = levelColors(parseLevel(sStr) ?? 6);

    // Siuntimas
    const response = await emailjs.send(
      'service_v9qenwn',
      'template_sf4fphk',
      {
        to_email: toEmail,
        cc: ccList,

        container_number: report.container_number || '—',
        client_ref: report.client_ref || '—',
        variety: report.variety || '—',

        qualityScore: qStr || '—',
        storageScore: sStr || '—',
        conclusion: latestConclusion,

        quality_bg: qc.bg, quality_border: qc.border, quality_text: qc.text,
        storage_bg: sc.bg, storage_border: sc.border, storage_text: sc.text,

        id: report.id,
      },
      'nBddtmb09-d6gjfcl'
    );

    if (response?.status === 200) {
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
  <div className="w-full px-6 py-6">
    {/* Page header */}
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Inspections
        </div>
        <h2 className="text-xl font-bold text-slate-900">Archive</h2>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search client, ref, container, location..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-400/60"
        />
      </div>
    </div>

    {/* Table card */}
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="p-6 text-sm text-slate-600">Loading…</div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  {[
                    "Date",
                    "Container",
                    "Client Ref",
                    "Rochecks Ref",
                    "Client",
                    "Variety",
                    "Location",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  pageReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/70">
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-800">
                        {report.date}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {report.container_number || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {report.client_ref || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {report.rochecks_ref || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                        {report.client}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {report.variety}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        {report.location}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(`/viewreport/${report.id}`, "_blank")}
                            className="rounded-lg border border-slate-300/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/edit/${report.id}`)}
                            className="rounded-lg border border-brand-400/40 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSend(report)}
                            className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                          >
                            Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {total === 0 ? 0 : start + 1}–{end} of {total} entries
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>

              <span className="text-sm text-slate-700">
                Page <span className="font-semibold">{page}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </span>

              <button
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

}
function parseLevel(val) {
  if (!val) return null;
  const m = String(val).trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}
function levelColors(level) {
  // 1–3 RED, 4–5 YELLOW, 6–7 GREEN
  if (level >= 1 && level <= 3) return { bg:'#fde2e2', border:'#fca5a5', text:'#b91c1c' };
  if (level >= 4 && level <= 5) return { bg:'#fef3c7', border:'#fcd34d', text:'#92400e' };
  return { bg:'#dcfce7', border:'#86efac', text:'#166534' };
}
export default DoneReports;
