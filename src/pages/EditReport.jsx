// Redesign of EditReport.jsx to match AllReports style
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useParams } from 'react-router-dom'

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
    supplier: '', surveyor: ''
  });

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
    alert('Failai įkelti');
  }

  const handleSave = async () => {
    const { error } = await supabase.from('reports').update({ ...form, samples }).eq('id', report.id);
    if (!error) alert('Sėkmingai įsaugota!');
  }

  const handleOpenEditModal = () => {
    setEditInfo({
      client_ref: report?.client_ref || '', container_number: report?.container_number || '',
      rochecks_ref: report?.rochecks_ref || '', variety: report?.variety || '',
      origin: report?.origin || '', location: report?.location || '', total_pallets: report?.total_pallets || '',
      type: report?.type || 'Conventional', supplier: report?.supplier || '', surveyor: report?.surveyor || ''
    });
    setShowEditModal(true);
  }

  const handleSaveEditedInfo = async () => {
    await supabase.from('reports').update(editInfo).eq('id', report.id);
    setReport(prev => ({ ...prev, ...editInfo }));
    setShowEditModal(false);
    alert('Informacija atnaujinta');
  }

  return (
    <div className="w-full px-4 py-6 text-xs">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-base font-semibold text-gray-700">
          {report
            ? `Container: ${report.container_number || '—'} | Variety: ${report.variety || '—'} | Origin: ${report.origin || '—'} | Total Pallets: ${report.total_pallets || '—'}`
            : 'Loading...'}
        </h2>
        <button
          onClick={handleOpenEditModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Edit Info
        </button>
      </div>
  
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <input name="brand" placeholder="Brand" value={form.brand} onChange={handleFormChange} className="p-2 border rounded w-full" />
        <input name="temperature" placeholder="Temperature" value={form.temperature} onChange={handleFormChange} className="p-2 border rounded w-full" />
        <select name="category" value={form.category} onChange={handleFormChange} className="p-2 border rounded w-full">
          <option>Class I</option><option>CLASS II</option><option>INDUSTRY CLASS</option><option>CLASS I & CLASS II</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <select name="qualityScore" value={form.qualityScore} onChange={handleFormChange} className="p-2 border rounded w-full">
          <option value="">Quality Score</option>
          <option>7 - Good</option><option>6 - Fair</option><option>5 - Reasonable</option>
          <option>4 - Moderate</option><option>3 - Less than moderate</option><option>2 - Poor</option><option>1 - Total loss</option>
        </select>
        <select name="storageScore" value={form.storageScore} onChange={handleFormChange} className="p-2 border rounded w-full">
          <option value="">Storage Score</option>
          <option>7 - Good</option><option>6 - Normal</option><option>5 - Reduced</option>
          <option>4 - Moderate</option><option>3 - Limited</option><option>2 - Poor</option><option>1 - No storage potential</option>
        </select>
      </div>

      <textarea name="conclusion" value={form.conclusion} onChange={handleFormChange} placeholder="Conclusion" className="w-full p-2 border rounded h-24 mb-6" />

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Samples</h3>
        <button onClick={handleAddSample} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-2">Add Sample</button>
        {samples.length > 0 ? (
          <table className="table-auto w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">#</th><th className="border px-2 py-1">Pallet</th><th className="border px-2 py-1">Quality</th><th className="border px-2 py-1">Storage</th><th className="border px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s, i) => (
                <tr key={s.id} className="text-center">
                  <td className="border px-2 py-1">{i + 1}</td><td className="border px-2 py-1">{s.pallet_number}</td><td className="border px-2 py-1">{s.quality_score}</td><td className="border px-2 py-1">{s.storage_score}</td>
                  <td className="border px-2 py-1 flex justify-center gap-2">
                    <button onClick={() => handleEditSample(s.id)} className="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                    <button onClick={() => handleCopySample(s.id)} className="bg-gray-400 text-white px-2 py-1 rounded">Copy</button>
                    <button onClick={() => handleDeleteSample(s.id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="italic">No samples.</p>}
      </div>

      <div className="flex gap-4 mb-4">
        <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save</button>
      </div>

      <div className="mb-4">
        <label className="font-semibold">Upload PDF files (max 3):</label>
        <input type="file" accept="application/pdf" multiple onChange={handleFileUpload} disabled={uploading} className="block mt-1" />
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Report Info</h3>
            {Object.entries({
              client_ref: 'Client Ref', container_number: 'Container Number', rochecks_ref: 'ROCHECKS Ref',
              variety: 'Variety', origin: 'Origin', location: 'Location', total_pallets: 'Total Pallets'
            }).map(([k, label]) => (
              <div key={k} className="mb-4">
                <label>{label}</label>
                <input name={k} value={editInfo[k]} onChange={handleEditInfoChange} className="w-full p-2 border rounded" />
              </div>
            ))}
            <div className="mb-4">
              <label>Type</label>
              <select name="type" value={editInfo.type} onChange={handleEditInfoChange} className="w-full p-2 border rounded">
                <option value="Conventional">Conventional</option>
                <option value="Organic">Organic</option>
              </select>
            </div>
            <div className="mb-4">
              <label>Supplier</label>
              <input name="supplier" value={editInfo.supplier} onChange={handleEditInfoChange} className="w-full p-2 border rounded" />
            </div>
            <div className="mb-4">
              <label>Surveyor</label>
              <select name="surveyor" value={editInfo.surveyor} onChange={handleEditInfoChange} className="w-full p-2 border rounded">
                <option value="">-- Pasirinkti surveyor --</option>
                {userProfile?.role === 'admin' ? users.map(u => <option key={u.name}>{u.name}</option>) : <option>{userProfile?.name}</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={handleSaveEditedInfo} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditReport;
