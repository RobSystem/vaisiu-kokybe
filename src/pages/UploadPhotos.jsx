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
    <div style={wrapper}>
      <h2>Upload Photos</h2>

      <input type="file" multiple onChange={handleFileChange} />

      {files.length > 0 && (
        <ul style={fileList}>
          {files.map((file, index) => (
            <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {file.name}
              <button style={deleteButtonSmall} onClick={() => removeSelectedFile(index)}>❌</button>
            </li>
          ))}
        </ul>
      )}

      {uploadProgress > 0 && (
        <div style={progressContainer}>
          <div style={{ ...progressBar, width: `${uploadProgress}%` }} />
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button onClick={handleUpload} style={button}>UPLOAD PHOTOS</button>
        <button onClick={() => navigate(-1)} style={buttonSecondary}>SAVE AND BACK</button>
      </div>

      <hr style={{ margin: '2rem 0' }} />
      <h3>Uploaded Photos</h3>

      {photos.length === 0 && <p style={{ color: '#777' }}>Nuotraukų kol kas nėra.</p>}

      <div style={gallery}>
        {photos.map(photo => (
          <div key={photo.id} style={{ position: 'relative' }}>
            <img
              src={photo.url}
              alt="photo"
              style={photoStyle}
              onClick={() => setPreviewUrl(photo.url)}
            />
            <button
              onClick={() => handleDelete(photo.id, photo.url)}
              style={deleteButton}
              title="Ištrinti"
            >
              ❌
            </button>
          </div>
        ))}
      </div>

      {previewUrl && (
        <div style={modalOverlay} onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="preview" style={modalImage} />
        </div>
      )}
    </div>
  )
}

// STILIAI

const wrapper = {
  padding: '2rem',
  maxWidth: '800px',
  margin: '0 auto',
  boxSizing: 'border-box'
}

const button = {
  padding: '0.75rem 1.5rem',
  background: '#4caf50',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
}

const buttonSecondary = {
  ...button,
  background: '#1976d2'
}

const gallery = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  marginTop: '1rem'
}

const photoStyle = {
  width: '150px',
  height: '150px',
  objectFit: 'cover',
  borderRadius: '8px',
  border: '1px solid #ccc',
  cursor: 'pointer'
}

const deleteButton = {
  position: 'absolute',
  top: '5px',
  right: '5px',
  background: 'rgba(0,0,0,0.6)',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  padding: 0
}

const deleteButtonSmall = {
  ...deleteButton,
  position: 'static',
  width: '20px',
  height: '20px',
  fontSize: '12px',
  background: '#d32f2f'
}

const fileList = {
  marginTop: '0.5rem',
  paddingLeft: '1rem',
  fontSize: '14px',
  color: '#333'
}

const modalOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999
}

const modalImage = {
  maxWidth: '90%',
  maxHeight: '90%',
  borderRadius: '8px'
}

const progressContainer = {
  width: '100%',
  background: '#eee',
  borderRadius: '4px',
  height: '8px',
  overflow: 'hidden',
  marginTop: '0.5rem'
}

const progressBar = {
  height: '100%',
  background: '#4caf50',
  transition: 'width 0.3s ease'
}

export default UploadPhotos
