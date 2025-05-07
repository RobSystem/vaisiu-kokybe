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
  const [showGeneralInfo, setShowGeneralInfo] = useState(false);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
const [boxWeightExtra, setBoxWeightExtra] = useState([]);
const [fruitWeightExtra, setFruitWeightExtra] = useState([]);
const [pressuresExtra, setPressuresExtra] = useState([]);
const [brixExtra, setBrixExtra] = useState([]);
const [diameterExtra, setDiameterExtra] = useState([]);

useEffect(() => {
  const fetchSample = async () => {
    if (!sampleId) return;
    const { data } = await supabase.from('samples').select('*').eq('id', sampleId).single();
    if (data) {
      setForm(data);
      setCreatedAt(data.created_at);
      setFruitWeightsExtra(Array.isArray(data.fruit_weights_extra) ? data.fruit_weights_extra : []);
      setBoxWeightExtra(Array.isArray(data.box_weight_extra) ? data.box_weight_extra : []);
      setFruitWeightExtra(Array.isArray(data.fruit_weight_extra) ? data.fruit_weight_extra : []);
      setPressuresExtra(Array.isArray(data.pressures_extra) ? data.pressures_extra : []);
      setBrixExtra(Array.isArray(data.brix_extra) ? data.brix_extra : []);
      setDiameterExtra(Array.isArray(data.diameter_extra) ? data.diameter_extra : []);
      setExternalColoration(Array.isArray(data.external_coloration) ? data.external_coloration : []);
      setInternalColoration(Array.isArray(data.internal_coloration) ? data.internal_coloration : []);
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
      box_weight_extra: boxWeightExtra.length > 0 ? boxWeightExtra : null,
      pressures_extra: pressuresExtra.length > 0 ? pressuresExtra : null,
      brix_extra: brixExtra.length > 0 ? brixExtra : null,
      diameter_extra: diameterExtra.length > 0 ? diameterExtra : null,
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

      <div className="mb-4">
  <div
    onClick={() => setShowGeneralInfo(!showGeneralInfo)}
    className="flex items-center justify-between cursor-pointer bg-gray-100 px-4 py-2 rounded"
  >
   
    <h3 className="font-semibold">General Information</h3>
    <span className="text-lg">{showGeneralInfo ? '−' : '+'}</span>
  </div>

  {showGeneralInfo && (
  <div className="pl-4 border-l-4 border-blue-300 mt-4">
    <div className="space-y-4">
      {[
        'pallet_number',
        'ggn_number',
        'ggn_exp_date',
        'grower_code',
        'packing_code',
        'variety',
        'brand'
      ]
      .map(field => (
        <div key={field}>
          <label className="block text-gray-700 mb-1 capitalize">
            {field.replace(/_/g, ' ')}
          </label>
          <input
            name={field}
            value={form[field]}
            onChange={handleChange}
            className="p-2 border rounded w-full"
          />
        </div>
      ))}
    </div>
    <div className="flex justify-end mt-4">
  <button
    onClick={handleSave}
    className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
    type="button"
  >
    Save
  </button>
</div>
  </div>
)}
</div>

<div className="mb-4">
  <div
    onClick={() => setShowExtraInfo(!showExtraInfo)}
    className="flex items-center justify-between cursor-pointer bg-gray-100 px-4 py-2 rounded"
  >
    <h3 className="font-semibold">Extra Information</h3>
    <span className="text-lg">{showExtraInfo ? '−' : '+'}</span>
  </div>

  {showExtraInfo && (
    <div className="pl-4 border-l-4 border-blue-300 mt-4 space-y-4">
<div className="flex justify-end">
  <button
    onClick={handleSave}
    className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded"
    type="button"
  >
    Save
  </button>
</div>
      {/* Line 1 */}
      <div className="flex flex-wrap items-end gap-4">
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Box Weight Min</label>
    <input
      name="box_weight_min"
      value={form.box_weight_min}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Box Weight Max</label>
    <input
      name="box_weight_max"
      value={form.box_weight_max}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
</div>

{/* + Extra mygtukas */}
<div className="mt-2">
  <button
    onClick={() => setBoxWeightExtra(Array(10).fill(''))}
    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
    type="button"
  >
    Add extra 
  </button>
</div>

{/* Papildomi laukai su Delete mygtuku šalia jų */}
{Array.isArray(boxWeightExtra) && boxWeightExtra.length > 0 && (
  <div className="mt-2 flex flex-wrap items-start gap-2">
    <div className="flex flex-wrap gap-2">
      {boxWeightExtra.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={e => {
            const updated = [...boxWeightExtra];
            updated[i] = e.target.value;
            setBoxWeightExtra(updated);
          }}
          className="p-1 border rounded w-16"
        />
      ))}
    </div>

    {/* Delete Extra – šalia lauku */}
    <button
      onClick={() => setBoxWeightExtra([])}
      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded self-start"
      type="button"
    >
      Delete 
    </button>
  </div>
)}



      {/* Line 3: fruit weight */}
      <div className="flex flex-wrap items-end gap-4">
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Fruit Weight Min</label>
    <input
      name="fruit_weight_min"
      value={form.fruit_weight_min}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Fruit Weight Max</label>
    <input
      name="fruit_weight_max"
      value={form.fruit_weight_max}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
</div>

<div className="mt-2">
  <button
    onClick={() => setFruitWeightExtra(Array(10).fill(''))}
    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
    type="button"
  >
    Add extra
  </button>
</div>

{Array.isArray(fruitWeightExtra) && fruitWeightExtra.length > 0 && (
  <div className="mt-2 flex flex-wrap items-start gap-2">
    <div className="flex flex-wrap gap-2">
      {fruitWeightExtra.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={e => {
            const updated = [...fruitWeightExtra];
            updated[i] = e.target.value;
            setFruitWeightExtra(updated);
          }}
          className="p-1 border rounded w-16"
        />
      ))}
    </div>
    <button
      onClick={() => setFruitWeightExtra([])}
      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded self-start"
      type="button"
    >
      Delete 
    </button>
  </div>
)}

      {/* Line 4: pressures */}
      <div className="flex flex-wrap items-end gap-4">
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Pressures Min</label>
    <input
      name="pressures_min"
      value={form.pressures_min}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Pressures Max</label>
    <input
      name="pressures_max"
      value={form.pressures_max}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
</div>

<div className="mt-2">
  <button
    onClick={() => setPressuresExtra(Array(10).fill(''))}
    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
    type="button"
  >
    Add extra
  </button>
</div>

{Array.isArray(pressuresExtra) && pressuresExtra.length > 0 && (
  <div className="mt-2 flex flex-wrap items-start gap-2">
    <div className="flex flex-wrap gap-2">
      {pressuresExtra.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={e => {
            const updated = [...pressuresExtra];
            updated[i] = e.target.value;
            setPressuresExtra(updated);
          }}
          className="p-1 border rounded w-16"
        />
      ))}
    </div>
    <button
      onClick={() => setPressuresExtra([])}
      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded self-start"
      type="button"
    >
      Delete 
    </button>
  </div>
)}


      {/* Line 5: brix */}
      <div className="flex flex-wrap items-end gap-4">
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Brix Min</label>
    <input
      name="brix_min"
      value={form.brix_min}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Brix Max</label>
    <input
      name="brix_max"
      value={form.brix_max}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
</div>

<div className="mt-2">
  <button
    onClick={() => setBrixExtra(Array(10).fill(''))}
    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
    type="button"
  >
    Add extra
  </button>
</div>

{Array.isArray(brixExtra) && brixExtra.length > 0 && (
  <div className="mt-2 flex flex-wrap items-start gap-2">
    <div className="flex flex-wrap gap-2">
      {brixExtra.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={e => {
            const updated = [...brixExtra];
            updated[i] = e.target.value;
            setBrixExtra(updated);
          }}
          className="p-1 border rounded w-16"
        />
      ))}
    </div>
    <button
      onClick={() => setBrixExtra([])}
      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded self-start"
      type="button"
    >
      Delete 
    </button>
  </div>
)}

      {/* Line 6: diameter */}
      <div className="flex flex-wrap items-end gap-4">
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Fruit Diameter Min</label>
    <input
      name="fruit_diameter_min"
      value={form.fruit_diameter_min}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
  <div className="flex-1">
    <label className="block text-gray-700 mb-1">Fruit Diameter Max</label>
    <input
      name="fruit_diameter_max"
      value={form.fruit_diameter_max}
      onChange={handleChange}
      className="p-2 border rounded w-full"
    />
  </div>
</div>

<div className="mt-2">
  <button
    onClick={() => setDiameterExtra(Array(10).fill(''))}
    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
    type="button"
  >
    Add extra
  </button>
</div>

{Array.isArray(diameterExtra) && diameterExtra.length > 0 && (
  <div className="mt-2 flex flex-wrap items-start gap-2">
    <div className="flex flex-wrap gap-2">
      {diameterExtra.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={e => {
            const updated = [...diameterExtra];
            updated[i] = e.target.value;
            setDiameterExtra(updated);
          }}
          className="p-1 border rounded w-16"
        />
      ))}
    </div>
    <button
      onClick={() => setDiameterExtra([])}
      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded self-start"
      type="button"
    >
      Delete 
    </button>
  </div>
)}
    </div>
  )}
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
