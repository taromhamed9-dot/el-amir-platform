const supabase = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const BUCKET = 'payment-proofs';

async function uploadFile(file, folder) {
  const ext = file.originalname.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error(`فشل رفع الملف: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

async function deleteFile(fileUrl) {
  if (!fileUrl) return;
  const path = fileUrl.split(`${BUCKET}/`)[1];
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
}

module.exports = { uploadFile, deleteFile };
