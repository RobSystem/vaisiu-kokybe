import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function UploadPhotos() {
  const { sampleId } = useParams()
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [photos, setPhotos] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchPhotos()
  }, [sampleId])

  const fetchPhotos = async () => {
    const { data, error } = await supabase
  .from('sample_photos')
  .select('*')
  .eq('sample_id', sampleId)
  .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Klaida gaunant nuotraukas iš DB:', error.message)
    } else {
      setPhotos(data)
    }
  }

  const handleFileChange = (e) => {
    setFiles([...e.target.files])
  }

  const removeSelectedFile = (index) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  const handleUpload = async () => {
    let uploaded = 0
    for (const file of files) {
      const filePath = `samples/${sampleId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file)

      if (uploadError) {
        alert('Nepavyko įkelti: ' + file.name)
        continue
      }

      const publicUrl = supabase
        .storage
        .from('photos')
        .getPublicUrl(filePath).data.publicUrl

      await supabase
        .from('sample_photos')
        .insert({ sample_id: sampleId, url: publicUrl })

      uploaded++
      setUploadProgress(Math.round((uploaded / files.length) * 100))
    }

    alert('Nuotraukos įkeltos!')
    setFiles([])
    setUploadProgress(0)
    fetchPhotos()
  }

  const handleDelete = async (photoId, url) => {
    const path = url.split('/storage/v1/object/public/photos/')[1]

    const { error: deleteError } = await supabase.storage
      .from('photos')
      .remove([path])

    if (deleteError) {
      alert('Nepavyko ištrinti iš bucket')
      return
    }

    const { error: dbError } = await supabase
      .from('sample_photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      alert('Nepavyko ištrinti iš DB')
    } else {
      fetchPhotos()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 text-sm">
      <h2 className="text-lg font-semibold mb-4">Upload Photos</h2>

      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="mb-4"
      />

      {files.length > 0 && (
        <ul className="mb-4 text-gray-700 space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
              <span>{file.name}</span>
              <button
                onClick={() => removeSelectedFile(index)}
                className="bg-red-500 text-white text-xs px-2 py-1 rounded"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
      )}

      {uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded h-2 mb-4">
          <div
            className="bg-green-500 h-2 rounded"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleUpload}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Upload Photos
        </button>
        <button
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save and Back
        </button>
      </div>

      <h3 className="font-semibold mb-2">Uploaded Photos</h3>
      {photos.length === 0 && (
        <p className="text-gray-500">Nuotraukų kol kas nėra.</p>
      )}

      <div className="flex flex-wrap gap-4 mt-4">
        {photos.map(photo => (
          <div key={photo.id} className="relative">
            <img
              src={photo.url}
              alt="photo"
              className="w-40 h-40 object-cover rounded border border-gray-300 cursor-pointer"
              onClick={() => setPreviewUrl(photo.url)}
            />
            <button
              onClick={() => handleDelete(photo.id, photo.url)}
              className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
              title="Ištrinti"
            >
              ❌
            </button>
          </div>
        ))}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} alt="preview" className="max-w-[90%] max-h-[90%] rounded" />
        </div>
      )}
    </div>
  )
}

export default UploadPhotos
