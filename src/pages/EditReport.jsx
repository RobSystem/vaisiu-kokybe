// Redesign of EditReport.jsx to match AllReports style
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useParams } from 'react-router-dom'
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

function EditReport() {
  const [form, setForm] = useState({
    brand: '', temperature: '', category: 'CLASS I',
    qualityScore: '', storageScore: '', conclusion: ''
  });
  const [report, setReport] = useState(null);
  const [samples, setSamples] = useState([]);
  const { reportId } = useParams();
  const [showEditModal, setShowEditModal] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [editInfo, setEditInfo] = useState({
    client_ref: '', container_number: '', rochecks_ref: '', variety: '',
    origin: '', location: '', total_pallets: '', type: 'Conventional',
    supplier: '', surveyor: '', date: ''
  });
  const [tab, setTab] = useState('samples');
const fetchPdfFiles = async () => {
      const files = [];
      for (let i = 1; i <= 3; i++) {
        const { data } = await supabase.storage.from('report-files').list(`${reportId}`, {
          search: `file${i}.pdf`,
        });
  
        if (data && data.length) {
          const { data: urlData } = await supabase.storage.from('report-files').getPublicUrl(`${reportId}/file${i}.pdf`);
          files[i - 1] = { name: `file${i}.pdf`, url: urlData.publicUrl };
        } else {
          files[i - 1] = null;
        }
      }
      setPdfFiles(files);
    };

  useEffect(() => {
    const fetchReport = async () => {
      const { data } = await supabase.from('reports').select('*').eq('id', reportId).single();
      if (data) {
        setReport(data);
        setForm({
          brand: data.brand || '', temperature: data.temperature || '', category: data.category || 'CLASS I',
          qualityScore: data.qualityScore || '', storageScore: data.storageScore || '', conclusion: data.conclusion || ''
        });
        fetchSamples(data.id);
      }
    }
    if (reportId) fetchReport();
  }, [reportId]);
  useEffect(() => {
    const fetchData = async () => {
    
    };
  
    const fetchPdfFiles = async () => {
      const files = [];
      for (let i = 1; i <= 3; i++) {
        const { data } = await supabase.storage.from('report-files').list(`${reportId}`, {
          search: `file${i}.pdf`,
        });
  
        if (data && data.length) {
          const { data: urlData } = await supabase.storage.from('report-files').getPublicUrl(`${reportId}/file${i}.pdf`);
          files[i - 1] = { name: `file${i}.pdf`, url: urlData.publicUrl };
        } else {
          files[i - 1] = null;
        }
      }
      setPdfFiles(files);
    };
  
    if (reportId) {
      fetchData();
      fetchPdfFiles(); // 🟢 ŠITA VIETA buvo trūkstama!
    }
  }, [reportId]);


  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('user_profiles').select('name');
      if (data) setUsers(data);
    }
    fetchUsers();

    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('user_profiles').select('name, role').eq('id', user.id).single();
      if (data) setUserProfile(data);
    }
    fetchUserProfile();
  }, []);

  const fetchSamples = async (reportId) => {
    const { data } = await supabase.from('samples').select('*').eq('report_id', reportId).order('position');
    if (data) setSamples(data);
  }

  const handleFormChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleEditInfoChange = e => setEditInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddSample = () => window.location.href = `/create-sample/${report.id}`;
  const handleEditSample = id => window.location.href = `/create-sample/${reportId}/${id}`;

  const handleCopySample = async (id) => {
    const { data: s } = await supabase.from('samples').select('*').eq('id', id).single();
    const { data: existing } = await supabase.from('samples').select('position').eq('report_id', s.report_id).order('position', { ascending: false }).limit(1);
    const nextPos = (existing?.[0]?.position || 0) + 1;
    const { id: _, position, ...copy } = s;
    await supabase.from('samples').insert([{ ...copy, position: nextPos }]);
    fetchSamples(s.report_id);
  }

  const handleDeleteSample = async (id) => {
    await supabase.from('samples').delete().eq('id', id);
    setSamples(samples.filter(s => s.id !== id));
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    for (let i = 0; i < files.length && i < 3; i++) {
      const file = files[i];
      await supabase.storage.from('report-files').upload(`${reportId}/file${i + 1}.pdf`, file, {
        cacheControl: '3600', upsert: true, contentType: 'application/pdf'
      });
    }
    setUploading(false);
    toast.success('Files uploaded successfully!');
  }

  const handleSave = async () => {
    const { error } = await supabase.from('reports').update({ ...form, samples }).eq('id', report.id);
    if (!error) toast.success('Report saved successfully!');
  }

  const handleOpenEditModal = () => {
    setEditInfo({
      client_ref: report?.client_ref || '', container_number: report?.container_number || '',
      rochecks_ref: report?.rochecks_ref || '', variety: report?.variety || '',
      origin: report?.origin || '', location: report?.location || '', total_pallets: report?.total_pallets || '',
      type: report?.type || 'Conventional', supplier: report?.supplier || '', surveyor: report?.surveyor || '',  date: report?.date || ''
    });
    setShowEditModal(true);
  }

  const handleSaveEditedInfo = async () => {
    await supabase.from('reports').update(editInfo).eq('id', report.id);
    setReport(prev => ({ ...prev, ...editInfo }));
    setShowEditModal(false);
    toast.success('Information updated successfully!');
  }
const handleSend = async () => {
  if (!report) return;
  const ok = window.confirm('Are you sure you want to send the report?');
  if (!ok) return;

  try {
    // jei turi "form" (redagavimo būseną) – sinchronizuojam į DB
    if (typeof form !== 'undefined') {
      await supabase
        .from('reports')
        .update({
          qualityScore: form.qualityScore,
          storageScore: form.storageScore,
          conclusion: form.conclusion,
        })
        .eq('id', report.id);
    }

    // Kliento el. paštai
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('email, cc_emails')
      .eq('name', report.client)
      .single();

    if (clientErr || !clientData?.email) {
      toast?.error?.('Client email not found.');
      return;
    }
    const toEmail = clientData.email;
    const ccList = Array.isArray(clientData.cc_emails)
      ? clientData.cc_emails.filter(Boolean).join(',')
      : '';

    // Vėliausios reikšmės: pirmiausia iš formos, jei jos nėra – iš report
    const qStr = (typeof form !== 'undefined' && form.qualityScore) ? form.qualityScore : report.qualityScore;
    const sStr = (typeof form !== 'undefined' && form.storageScore) ? form.storageScore : report.storageScore;
    const latestConclusion = (
      (typeof form !== 'undefined' && form.conclusion?.trim()) ||
      (report.conclusion?.trim()) ||
      '—'
    ).replace(/\n/g, '<br>');

    // Spalvos
    const qc = levelColors(parseLevel(qStr) ?? 6);
    const sc = levelColors(parseLevel(sStr) ?? 6);

    // Siuntimas
    const response = await emailjs.send(
      'service_v9qenwn',    // service ID
      'template_sf4fphk',   // template ID
      {
        to_email: toEmail,
        cc: ccList, // jei šablone pridėjai {{cc}} į CC lauką

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
      'nBddtmb09-d6gjfcl'   // public key
    );

    if (response?.status === 200) {
      await supabase.from('reports').update({ sent: true }).eq('id', report.id);
      toast?.success?.('Report sent successfully!');
    } else {
      toast?.error?.('Email service returned non-200 response.');
    }
  } catch (err) {
    console.error('Sending error:', err);
    toast?.error?.(`Error sending report: ${err?.message || 'Unknown error'}`);
  }
};

  
  // ===== UI presets (visual only) =====
  const cardClass = "rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";
  const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400/70";
  const selectClass = inputClass;
  const textareaClass = "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-400/70";

  const btnPrimary = "h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60";
  const btnSecondary = "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
  const btnDark = "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60";
  const btnDanger = "h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60";

return (
    <div className="w-full px-4 py-6">
      {/* UI presets (visual only) */}
      {/*
        cardClass / inputClass etc are defined above return. 
        Keeping markup consistent with the rest of the app.
      */}

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-4 md:mx-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px]">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Edit report</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {report
                ? `Container: ${report.container_number || '—'} • ${report.variety || '—'} • ${report.origin || '—'}`
                : 'Loading...'}
            </h2>
          </div>

          {/* Status chip */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              report?.sent ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {report?.sent ? 'Sent' : 'Not sent'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => report && window.open(`/viewreport/${report.id}`, '_blank')}
              className={btnSecondary}
            >
              View report
            </button>

            <button onClick={handleSend} className={btnPrimary}>
              Send report
            </button>

            <button onClick={handleOpenEditModal} className={btnDark}>
              Edit report info
            </button>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="mx-4 md:mx-6 mt-6">
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Basic info</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Brand</label>
              <input name="brand" value={form.brand} onChange={handleFormChange} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Temperature</label>
              <input
                name="temperature"
                value={form.temperature}
                onChange={handleFormChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select name="category" value={form.category} onChange={handleFormChange} className={selectClass}>
                <option value="">Choose category...</option>
                <option value="CLASS I">Class I</option>
                <option value="CLASS II">Class II</option>
                <option value="INDUSTRY CLASS">Industry Class</option>
                <option value="CLASS I & CLASS II">Class I & Class II</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="mx-4 md:mx-6 mt-6">
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Scores</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quality score</label>
              <select name="qualityScore" value={form.qualityScore} onChange={handleFormChange} className={selectClass}>
                <option value="">Choose quality score...</option>
                <option>7 - Good</option>
                <option>6 - Fair</option>
                <option>5 - Reasonable</option>
                <option>4 - Moderate</option>
                <option>3 - Less than moderate</option>
                <option>2 - Poor</option>
                <option>1 - Total loss</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Storage score</label>
              <select name="storageScore" value={form.storageScore} onChange={handleFormChange} className={selectClass}>
                <option value="">Choose storage score...</option>
                <option>7 - Good</option>
                <option>6 - Normal</option>
                <option>5 - Reduced</option>
                <option>4 - Moderate</option>
                <option>3 - Limited</option>
                <option>2 - Poor</option>
                <option>1 - No storage potential</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Conclusion */}
      <div className="mx-4 md:mx-6 mt-6">
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Conclusion</h3>
          <textarea name="conclusion" value={form.conclusion} onChange={handleFormChange} className={textareaClass} rows={4} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 md:mx-6 mt-8">
        <div className="flex gap-2 border-b border-slate-200">
          {['samples', 'files'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-brand-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'samples' ? 'Samples' : 'Files'}
            </button>
          ))}
        </div>

        <div className={`${cardClass} mt-4`}>
          {tab === 'samples' ? (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <button onClick={handleSave} className={btnDark}>
                  Save
                </button>
                <button onClick={handleAddSample} className={btnPrimary}>
                  Add sample
                </button>
              </div>

              {samples.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        {['#', 'Pallet number', 'Quality score', 'Storage score', 'Action'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {samples.map((s, i) => (
                        <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{s.pallet_number}</td>
                          <td className="px-3 py-2">{s.quality_score}</td>
                          <td className="px-3 py-2">{s.storage_score}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleEditSample(s.id)}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCopySample(s.id)}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => handleDeleteSample(s.id)}
                                className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No samples.</p>
              )}
            </>
          ) : (
            <>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Temperature recorders</h4>

              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center gap-3 p-3 border border-slate-200 rounded-xl">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setPdfFiles((prev) => {
                          const updated = [...prev];
                          updated[i] = file;
                          return updated;
                        });
                      }}
                      className="w-full md:flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!pdfFiles[i] || pdfFiles[i]?.url) {
                            toast.error('Please select a file first!');
                            return;
                          }
                          setUploading(true);
                          try {
                            await supabase.storage.from('report-files').upload(`${reportId}/file${i + 1}.pdf`, pdfFiles[i], {
                              cacheControl: '3600',
                              upsert: true,
                              contentType: 'application/pdf',
                            });
                            toast.success('File uploaded successfully!');
                            if (typeof fetchPdfFiles === 'function') {
                              await fetchPdfFiles();
                            }
                          } catch (err) {
                            console.error(err);
                            toast.error('Upload failed');
                          } finally {
                            setUploading(false);
                          }
                        }}
                        className={btnPrimary}
                        disabled={uploading}
                      >
                        Upload
                      </button>

                      <button
                        onClick={async () => {
                          setUploading(true);
                          try {
                            await supabase.storage.from('report-files').remove([`${reportId}/file${i + 1}.pdf`]);
                            toast.success('File deleted!');
                            if (typeof fetchPdfFiles === 'function') {
                              await fetchPdfFiles();
                            }
                          } catch (err) {
                            console.error(err);
                            toast.error('Delete failed');
                          } finally {
                            setUploading(false);
                          }
                        }}
                        className={btnDanger}
                        disabled={uploading}
                      >
                        Delete
                      </button>
                    </div>

                    {pdfFiles[i] && pdfFiles[i]?.url && (
                      <a
                        href={pdfFiles[i].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:text-brand-800 underline text-sm"
                      >
                        Preview PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit report modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit report info</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries({
                client_ref: 'Client Ref',
                container_number: 'Container Number',
                rochecks_ref: 'ROCHECKS Ref',
                variety: 'Variety',
                origin: 'Origin',
                location: 'Location',
                total_pallets: 'Total Pallets',
              }).map(([k, label]) => (
                <div key={k}>
                  <label className={labelClass}>{label}</label>
                  <input name={k} value={editInfo[k]} onChange={handleEditInfoChange} className={inputClass} />
                </div>
              ))}

              <div>
                <label className={labelClass}>Type</label>
                <select name="type" value={editInfo.type} onChange={handleEditInfoChange} className={selectClass}>
                  <option value="Conventional">Conventional</option>
                  <option value="Organic">Organic</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Supplier</label>
                <input name="supplier" value={editInfo.supplier} onChange={handleEditInfoChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Surveyor</label>
                <select name="surveyor" value={editInfo.surveyor} onChange={handleEditInfoChange} className={selectClass}>
                  <option value="">-- Select surveyor --</option>
                  {userProfile?.role === 'admin'
                    ? users.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))
                    : userProfile?.name && <option value={userProfile?.name}>{userProfile?.name}</option>}
                </select>
              </div>

              <div>
                <label className={labelClass}>Date</label>
                <input type="date" name="date" value={editInfo.date} onChange={handleEditInfoChange} className={inputClass} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowEditModal(false)} className={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveEditedInfo} className={btnPrimary}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
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
export default EditReport;
