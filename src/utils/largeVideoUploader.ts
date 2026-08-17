/// <reference types="vite/client" />

import { uploadFileToFirebaseStorage, UploadProgressInfo, UploadControlHolder, formatBytes } from './firebaseUploadService';

export type { UploadProgressInfo, UploadControlHolder };
export { formatBytes };

/**
 * Unified Video Uploading Service calling Firebase Storage directly.
 */
export async function uploadLargeVideo(
  file: File,
  onProgress?: (info: UploadProgressInfo) => void,
  cancelTaskHolder?: UploadControlHolder,
  courseId?: string,
  lessonId?: string,
  folder = 'videos'
): Promise<string> {
  if (!file) {
    throw new Error('لم يتم اختيار أي ملف فيديو.');
  }

  const fileName = file?.name || 'file';
  const fileType = file?.type || '';
  const fileSize = file?.size || 0;

  console.log('=== [VideoUpload] Processing Video File ===');
  console.log('File Name:', fileName);
  console.log('File Size:', fileSize, 'bytes (', formatBytes(fileSize), ')');
  console.log('File Type:', fileType);

  const fileNameLower = fileName.toLowerCase();
  const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|3gp|m4v|flv|wmv)$/i.test(fileNameLower);
  if (!isVideo) {
    throw new Error(`صيغة الملف (${fileType || fileName}) غير مدعومة! يرجى اختيار ملف فيديو صالح (MP4, MOV, MKV, WEBM).`);
  }

  return await uploadFileToFirebaseStorage({
    file,
    folder,
    courseId,
    lessonId,
    onProgress,
    cancelControlHolder: cancelTaskHolder
  });
}
