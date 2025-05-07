import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../utils/supabaseClient';

const EditReport = () => {
  const { id } = useParams();
  const [form, setForm] = useState({
    brand: '',
    temperature: '',
    category: '',
    qualityScore: '',
    storageScore: '',
    conclusion: '',
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase.from('reports').select('*').eq('id', id).single();
      if (data) {
        setForm(data);
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    await supabase.from('reports').update(form).eq('id', id);
    alert('Report updated');
  };

  const handleFileUpload = (e) => {
    // your file upload logic
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-sm">
      <h2 className="text-2xl font-bold mb-6">Edit Report</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block font-semibold mb-1">Brand</label>
          <input name="brand" value={form.brand} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Temperature</label>
          <input name="temperature" value={form.temperature} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Category</label>
          <input name="category" value={form.category} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-semibold mb-1">Quality Score</label>
          <select name="qualityScore" value={form.qualityScore} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded">
            <option value="">Pasirinkti</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Storage Score</label>
          <select name="storageScore" value={form.storageScore} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded">
            <option value="">Pasirinkti</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-1">Conclusion</label>
        <textarea name="conclusion" value={form.conclusion} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded" rows={4} />
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-2">Upload PDF files (max 3):</label>
        <input type="file" accept="application/pdf" multiple onChange={handleFileUpload} disabled={uploading} />
      </div>

      <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
        Save
      </button>
    </div>
  );
};

export default EditReport;
