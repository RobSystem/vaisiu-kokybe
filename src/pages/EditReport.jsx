// Redesign of EditReport.jsx to match AllReports style
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useParams, useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

function EditReport() {
  const [form, setForm] = useState({
  
    qualityScore: '', storageScore: '', conclusion: ''
  });
  const [report, setReport] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState([]);
const [creatingNewReport, setCreatingNewReport] = useState(false);
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [samplePhotoMap, setSamplePhotoMap] = useState({});
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
  qualityScore: data.qualityScore || '',
  storageScore: data.storageScore || '',
  conclusion: data.conclusion || ''
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
  const { data, error } = await supabase
    .from('samples')
    .select('*')
    .eq('report_id', reportId)
    .order('position');

  if (error) {
    console.error('Fetch samples error:', error);
    setSamples([]);
    setSamplePhotoMap({});
    return;
  }

  setSamples(data || []);

  const sampleIds = (data || []).map((s) => s.id);

  if (!sampleIds.length) {
    setSamplePhotoMap({});
    return;
  }

  const { data: photoRows, error: photosError } = await supabase
    .from('sample_photos')
    .select('id, sample_id')
    .in('sample_id', sampleIds);

  if (photosError) {
    console.error('Fetch sample photos error:', photosError);
    setSamplePhotoMap({});
    return;
  }

  const map = {};
  (photoRows || []).forEach((photo) => {
    map[photo.sample_id] = true;
  });

  setSamplePhotoMap(map);
};

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

  const handleDeleteReport = async () => {
  if (!reportId) return;

  const ok = window.confirm(
    'Are you sure you want to delete this report? This will also delete all related samples, photos and files.'
  );
  if (!ok) return;

  try {
    // 1. Gauti visus sample šitam report
    const { data: sampleRows, error: sampleFetchError } = await supabase
      .from('samples')
      .select('id')
      .eq('report_id', reportId);

    if (sampleFetchError) throw sampleFetchError;

    const sampleIds = (sampleRows || []).map((s) => s.id);

    // 2. Gauti visas sample photos iš DB
    if (sampleIds.length > 0) {
      const { data: photoRows, error: photoFetchError } = await supabase
        .from('sample_photos')
        .select('id, url')
        .in('sample_id', sampleIds);

      if (photoFetchError) throw photoFetchError;

      // 3. Ištrinti photo failus iš storage
      const photoPaths = (photoRows || [])
        .map((p) => {
          const marker = '/storage/v1/object/public/photos/';
          return p.url?.includes(marker) ? p.url.split(marker)[1] : null;
        })
        .filter(Boolean);

      if (photoPaths.length > 0) {
        const { error: storagePhotoDeleteError } = await supabase
          .storage
          .from('photos')
          .remove(photoPaths);

        if (storagePhotoDeleteError) throw storagePhotoDeleteError;
      }

      // 4. Ištrinti photo įrašus iš DB
      const photoIds = (photoRows || []).map((p) => p.id);
      if (photoIds.length > 0) {
        const { error: photoDeleteError } = await supabase
          .from('sample_photos')
          .delete()
          .in('id', photoIds);

        if (photoDeleteError) throw photoDeleteError;
      }

      // 5. Ištrinti samples
      const { error: sampleDeleteError } = await supabase
        .from('samples')
        .delete()
        .in('id', sampleIds);

      if (sampleDeleteError) throw sampleDeleteError;
    }

    // 6. Ištrinti report PDF failus iš storage
    const reportFilePaths = [`${reportId}/file1.pdf`, `${reportId}/file2.pdf`, `${reportId}/file3.pdf`];

    const { error: reportFilesDeleteError } = await supabase
      .storage
      .from('report-files')
      .remove(reportFilePaths);

    if (reportFilesDeleteError) throw reportFilesDeleteError;

    // 7. Ištrinti patį report
    const { error: reportDeleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (reportDeleteError) throw reportDeleteError;

    toast.success('Report deleted successfully!');
    navigate('/all');
  } catch (err) {
    console.error('Delete report error:', err);
    toast.error(`Failed to delete report: ${err?.message || 'Unknown error'}`);
  }
};

const toggleSampleSelection = (sampleId) => {
  setSelectedSampleIds((prev) =>
    prev.includes(sampleId)
      ? prev.filter((id) => id !== sampleId)
      : [...prev, sampleId]
  );
};

const handleSelectAllSamples = () => {
  setSelectedSampleIds(samples.map((s) => s.id));
};

const handleClearSelectedSamples = () => {
  setSelectedSampleIds([]);
};

const handleCreateNewReportFromSelected = async () => {
  if (!report?.id) {
    toast.error('Report not loaded.');
    return;
  }

  if (!selectedSampleIds.length) {
    toast.error('Please select at least one sample.');
    return;
  }

  const confirmed = window.confirm(
    `Create a new report with ${selectedSampleIds.length} selected sample(s)?`
  );

  if (!confirmed) return;

  setCreatingNewReport(true);

  try {
    // 1. Kopijuojam report informaciją
    const {
      id: oldReportId,
      created_at,
      updated_at,
      ...reportData
    } = report;

    const newReportPayload = {
      ...reportData,
      sent: false,
      status: 'active',
    };

    const { data: newReport, error: newReportError } = await supabase
      .from('reports')
      .insert([newReportPayload])
      .select()
      .single();

    if (newReportError) throw newReportError;

    // 2. Pasiimam tik pažymėtus sample
    const selectedSamples = samples.filter((s) => selectedSampleIds.includes(s.id));

    if (!selectedSamples.length) {
      throw new Error('No selected samples found.');
    }

    // 3. Sukuriam naujus sample naujam reportui
    const oldSampleIdsInOrder = selectedSamples.map((s) => s.id);

    const newSamplesPayload = selectedSamples.map((sample, index) => {
      const {
        id,
        created_at,
        updated_at,
        report_id,
        ...sampleData
      } = sample;

      return {
        ...sampleData,
        report_id: newReport.id,
        position: index + 1,
      };
    });

    const { data: insertedSamples, error: insertedSamplesError } = await supabase
      .from('samples')
      .insert(newSamplesPayload)
      .select();

    if (insertedSamplesError) throw insertedSamplesError;

    // 4. Susiejam senus sample ID su naujais
    const oldToNewSampleIdMap = {};
    oldSampleIdsInOrder.forEach((oldId, index) => {
      oldToNewSampleIdMap[oldId] = insertedSamples[index]?.id;
    });

    // 5. Pasiimam senas nuotraukas
    const { data: oldPhotos, error: oldPhotosError } = await supabase
      .from('sample_photos')
      .select('*')
      .in('sample_id', oldSampleIdsInOrder);

    if (oldPhotosError) throw oldPhotosError;

    // 6. Sukuriam naujus photo įrašus naujiems sample
    if (oldPhotos?.length) {
      const newPhotosPayload = oldPhotos.map((photo) => {
        const {
          id,
          created_at,
          updated_at,
          sample_id,
          ...photoData
        } = photo;

        return {
          ...photoData,
          sample_id: oldToNewSampleIdMap[sample_id],
        };
      });

      const { error: insertPhotosError } = await supabase
        .from('sample_photos')
        .insert(newPhotosPayload);

      if (insertPhotosError) throw insertPhotosError;
    }

    toast.success('New report created successfully!');
    navigate(`/edit/${newReport.id}`);
  } catch (error) {
    console.error('Create new report failed:', error);
    toast.error(error.message || 'Failed to create new report.');
  } finally {
    setCreatingNewReport(false);
  }
};

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
  const { error } = await supabase
    .from('reports')
    .update({
      qualityScore: form.qualityScore,
      storageScore: form.storageScore,
      conclusion: form.conclusion,
    })
    .eq('id', report.id);

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
      'service_jg9emgi',    // service ID
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
  await supabase
    .from('reports')
    .update({
      sent: true,
      status: 'done',
    })
    .eq('id', report.id);

  toast?.success?.('Report sent successfully!');
  navigate('/all');
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

      <div className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:z-20 lg:bg-white/90 lg:backdrop-blur">
  <div className="mx-4 md:mx-6 py-4">
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Edit report
          </div>

          {report ? (
            <>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {report.container_number || "No container"} / {report.client_ref || "No client ref"}
              </h1>

              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <span className="font-medium text-slate-900">Supplier:</span>{" "}
                  {report.supplier || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Variety:</span>{" "}
                  {report.variety || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Origin:</span>{" "}
                  {report.origin || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Location:</span>{" "}
                  {report.location || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Rochecks ref:</span>{" "}
                  {report.rochecks_ref || "—"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Total pallets:</span>{" "}
                  {report.total_pallets || "—"}
                </div>
              </div>
            </>
          ) : (
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Loading...</h2>
          )}
        </div>

        {/* Right side */}
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[320px]">
          <div className="flex items-center justify-start xl:justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                report?.sent
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${report?.sent ? "bg-emerald-500" : "bg-amber-500"}`} />
              {report?.sent ? "Sent" : "Not sent"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
            <button
              onClick={() => report && window.open(`/viewreport/${report.id}`, "_blank")}
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

            <button onClick={handleDeleteReport} className={btnDanger}>
              Delete report
            </button>
          </div>
        </div>
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

    <textarea
      name="conclusion"
      value={form.conclusion}
      onChange={handleFormChange}
      className={textareaClass}
      rows={4}
    />

    <div className="flex justify-end mt-4">
      <button onClick={handleSave} className={btnDark}>
        Save
      </button>
    </div>
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
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
  <div>
    <h3 className="text-sm font-semibold text-slate-900">Samples</h3>
    <p className="text-xs text-slate-500">
      Manage samples, copy them, or create a new report from selected entries.
    </p>
  </div>

  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
    <button onClick={handleAddSample} className={btnPrimary}>
      Add sample
    </button>

    <button onClick={handleSelectAllSamples} className={btnSecondary}>
      Select all
    </button>

    <button onClick={handleClearSelectedSamples} className={btnSecondary}>
      Clear
    </button>

    <button
      onClick={handleCreateNewReportFromSelected}
      disabled={creatingNewReport || selectedSampleIds.length === 0}
      className={btnDark}
    >
      {creatingNewReport ? "Creating..." : "Create new report"}
    </button>
  </div>
</div>

              {samples.length > 0 ? (
  <>
    {/* Mobile cards */}
    <div className="block lg:hidden space-y-3">
      {samples.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {s.pallet_number || "No pallet number"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {s.variety || "—"} / {s.size || "—"} / {s.brand || "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedSampleIds.includes(s.id)}
                onChange={() => toggleSampleSelection(s.id)}
                className="h-4 w-4 rounded border-slate-300"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                GGN
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {s.ggn_number || "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Grower code
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {s.grower_code || "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Category
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {s.category || "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Photos
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {samplePhotoMap[s.id] ? "Yes" : "No"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                QC
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {s.quality_score || "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                SC
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {s.storage_score || "—"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => handleEditSample(s.id)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={() => handleCopySample(s.id)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Copy
            </button>
            <button
              onClick={() => handleDeleteSample(s.id)}
              className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Desktop table */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <th className="border-b border-slate-200 px-4 py-3">Select</th>
            <th className="border-b border-slate-200 px-4 py-3">Pallet number</th>
            <th className="border-b border-slate-200 px-4 py-3">GGN</th>
            <th className="border-b border-slate-200 px-4 py-3">Grower Code</th>
            <th className="border-b border-slate-200 px-4 py-3">Variety</th>
            <th className="border-b border-slate-200 px-4 py-3">Size</th>
            <th className="border-b border-slate-200 px-4 py-3">Brand</th>
            <th className="border-b border-slate-200 px-4 py-3">Category</th>
            <th className="border-b border-slate-200 px-4 py-3">QC</th>
            <th className="border-b border-slate-200 px-4 py-3">SC</th>
            <th className="border-b border-slate-200 px-4 py-3">Photos</th>
            <th className="border-b border-slate-200 px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {samples.map((s) => (
            <tr key={s.id} className="transition hover:bg-brand-50/30">
              <td className="border-b border-slate-100 px-4 py-3 align-middle">
                <input
                  type="checkbox"
                  checked={selectedSampleIds.includes(s.id)}
                  onChange={() => toggleSampleSelection(s.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </td>

              <td className="border-b border-slate-100 px-4 py-3 align-middle font-medium text-slate-900">
                {s.pallet_number || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
                {s.ggn_number || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-600">
                {s.grower_code || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.variety || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.size || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.brand || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.category || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.quality_score || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-slate-700">
                {s.storage_score || "—"}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 align-middle text-center">
                {samplePhotoMap[s.id] ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                    No
                  </span>
                )}
              </td>

              <td className="border-b border-slate-100 px-4 py-3 align-middle">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditSample(s.id)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCopySample(s.id)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteSample(s.id)}
                    className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100"
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
  </>
) : (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
    <div className="text-sm font-semibold text-slate-900">No samples yet</div>
    <p className="mt-1 text-sm text-slate-500">
      Add the first sample to start building this report.
    </p>
  </div>
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
