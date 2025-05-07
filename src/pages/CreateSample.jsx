// CreateSample.jsx su EditReport stiliumi (Tailwind)
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function CreateSample() {
  const navigate = useNavigate();
  const { reportId, sampleId } = useParams();

  const [form, setForm] = useState({
    pallet_number: '', ggn_number: '', ggn_exp_date: '', grower_code: '',
    packing_code: '', variety: '', brand: '', packing_type: '', size: '',
    box_weight_min: '', box_weight_max: '', fruit_weight_min: '', fruit_weight_max: '',
    pressures_min: '', pressures_max: '', brix_min: '', brix_max: '',
    fruit_diameter_min: '', fruit_diameter_max: '', minor_defects: '', major_defects: '',
    quality_score: '', storage_score: '', created_at: null
  });

  const [createdAt, setCreatedAt] = useState(null);
  const [fruitWeightsExtra, setFruitWeightsExtra] = useState([]);
  const [externalColoration, setExternalColoration] = useState([]);
  const [internalColoration, setInternalColoration] = useState([]);
  const [consistency, setConsistency] = useState({ hard: '', sensitive: '', soft: '' });

  useEffect(() => {
    const fetchSample = async () => {
      if (!sampleId) return;
      const { data } = await supabase.from('samples').select('*').eq('id', sampleId).single();
      if (data) {
        setForm(data);
        setCreatedAt(data.created_at);
        setFruitWeightsExtra(data.fruit_weights_extra || []);
        setExternalColoration(data.external_coloration || []);
        setInternalColoration(data.internal_coloration || []);
        setConsistency(data.consistency || { hard: '', sensitive: '', soft: '' });
      }
    };
    fetchSample();
  }, [sampleId]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleConsistencyChange = (type, value) => setConsistency(prev => ({ ...prev, [type]: value }));

  const handleAddWeight = () => setFruitWeightsExtra(Array(10).fill(''));
  const handleWeightChange = (index, value) => {
    const updated = [...fruitWeightsExtra];
    updated[index] = value;
    setFruitWeightsExtra(updated);
  };
  const handleRemoveWeight = (index) => {
    const updated = [...fruitWeightsExtra];
    updated.splice(index, 1);
    setFruitWeightsExtra(updated);
  };

  const addColoration = (type) => {
    const setter = type === 'external' ? setExternalColoration : setInternalColoration;
    setter(prev => [...prev, { color: '', percent: '' }]);
  };
  const updateColoration = (type, index, field, value) => {
    const list = type === 'external' ? [...externalColoration] : [...internalColoration];
    list[index][field] = value;
    type === 'external' ? setExternalColoration(list) : setInternalColoration(list);
  };
  const removeColoration = (type, index) => {
    const list = type === 'external' ? [...externalColoration] : [...internalColoration];
    list.splice(index, 1);
    type === 'external' ? setExternalColoration(list) : setInternalColoration(list);
  };

  const handleSave = async () => {
    const cleanedForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === '' || value === 'Pasirinkti' ? null : value])
    );
    const updatePayload = {
      ...cleanedForm,
      fruit_weights_extra: fruitWeightsExtra.length > 0 ? fruitWeightsExtra : null,
      external_coloration: externalColoration.length > 0 ? externalColoration : null,
      internal_coloration: internalColoration.length > 0 ? internalColoration : null,
      consistency: consistency
    };

    let error;
    if (sampleId) {
      ({ error } = await supabase.from('samples').update(updatePayload).eq('id', sampleId));
    } else {
      const { data: existingSamples } = await supabase
        .from('samples')
        .select('position')
        .eq('report_id', reportId)
        .order('position', { ascending: false })
        .limit(1);
      const nextPosition = (existingSamples?.[0]?.position || 0) + 1;
      ({ error } = await supabase.from('samples').insert({
        report_id: reportId,
        position: nextPosition,
        ...updatePayload
      }));
    }

    if (error) alert('Nepavyko išsaugoti');
    else {
      alert('Išsaugota sėkmingai!');
      navigate(`/edit/${reportId}`);
    }
  };

  return (
    <div className="w-full px-4 py-6 text-sm">
      <h2 className="text-lg font-semibold mb-6">New Sample</h2>

      <h3 className="font-semibold mb-2">General Information</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {['pallet_number', 'ggn_number', 'ggn_exp_date', 'grower_code'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <input name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {['packing_code', 'variety', 'brand'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <input name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full" />
          </div>
        ))}
      </div>

      <h3 className="font-semibold mb-2">Extra Information</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {['packing_type', 'size'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <input name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {['box_weight_min', 'box_weight_max', 'fruit_weight_min', 'fruit_weight_max'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <input name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full" />
          </div>
        ))}
        <button onClick={handleAddWeight} className="bg-blue-500 text-white px-3 py-2 rounded">Add Weight</button>
      </div>
      {fruitWeightsExtra.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {fruitWeightsExtra.map((val, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={val} onChange={(e) => handleWeightChange(i, e.target.value)} className="p-1 border w-16 rounded" />
              <button onClick={() => handleRemoveWeight(i)} className="text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {['pressures_min', 'pressures_max', 'brix_min', 'brix_max', 'fruit_diameter_min', 'fruit_diameter_max'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <input name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full" />
          </div>
        ))}
      </div>

      <h3 className="font-semibold mb-2">Coloration</h3>
      <div className="mb-2">
        <button onClick={() => addColoration('external')} className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Add External</button>
        {externalColoration.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select value={item.color} onChange={(e) => updateColoration('external', i, 'color', e.target.value)} className="border p-2 rounded">
              <option>Pasirinkti</option>
              {['Green','Light Green','Yellow','Turning','Orange','Brown','White','Beige','Green Tinges','Red','Purple'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
            <select value={item.percent} onChange={(e) => updateColoration('external', i, 'percent', e.target.value)} className="border p-2 rounded">
              {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
            </select>
            <button onClick={() => removeColoration('external', i)} className="text-red-500">Delete</button>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <button onClick={() => addColoration('internal')} className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Add Internal</button>
        {internalColoration.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select value={item.color} onChange={(e) => updateColoration('internal', i, 'color', e.target.value)} className="border p-2 rounded">
              <option>Pasirinkti</option>
              {['Green','Light Green','Yellow','Orange','Light Yellow','White','Red','Purple','Grey'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
            <select value={item.percent} onChange={(e) => updateColoration('internal', i, 'percent', e.target.value)} className="border p-2 rounded">
              {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
            </select>
            <button onClick={() => removeColoration('internal', i)} className="text-red-500">Delete</button>
          </div>
        ))}
      </div>

      <h3 className="font-semibold mb-2">Consistency</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {['hard', 'sensitive', 'soft'].map(type => (
          <div key={type}>
            <label className="block text-gray-700 mb-1 capitalize">{type}</label>
            <select value={consistency[type]} onChange={(e) => handleConsistencyChange(type, e.target.value)} className="p-2 border rounded w-full">
              {[...Array(21)].map((_, i) => <option key={i}>{i * 5}%</option>)}
            </select>
          </div>
        ))}
      </div>

      <h3 className="font-semibold mb-2">Defects</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {['major_defects', 'minor_defects'].map(field => (
          <div key={field}>
            <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
            <textarea name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full h-24" />
          </div>
        ))}
      </div>

      <h3 className="font-semibold mb-2">Scoring</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
      {['quality_score', 'storage_score'].map(field => {
  const options = field === 'quality_score'
    ? ['7 - Good','6 - Fair','5 - Reasonable','4 - Moderate','3 - Less than moderate','2 - Poor','1 - Total Loss']
    : ['7 - Good','6 - Normal','5 - Reduced','4 - Moderate','3 - Limited','2 - Poor','1 - No storage potential'];

  return (
    <div key={field}>
      <label className="block text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
      <select name={field} value={form[field]} onChange={handleChange} className="p-2 border rounded w-full">
        <option value="">Pasirinkti</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
})}
      </div>

      <div className="flex gap-4">
  <button
    onClick={handleSave}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
  >
    Save and Back
    </button>
        {(sampleId || form.id) && (
          <button
            onClick={() => navigate(`/upload-photos/${sampleId || form.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Upload Photos
          </button>
  )}
</div>
    </div>
  );
}

export default CreateSample;
