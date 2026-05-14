import imageCompression from 'browser-image-compression';

export async function compressImage(
  file: File,
  type: 'thumbnail' | 'product' | 'profile' = 'product'
): Promise<File> {
  const options = {
    thumbnail: {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 200,
      useWebWorker: true,
    },
    product: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/webp' as const,
    },
    profile: {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 300,
      useWebWorker: true,
      fileType: 'image/webp' as const,
    },
  };

  try {
    return await imageCompression(file, options[type]);
  } catch {
    return file;
  }
}
