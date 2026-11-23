/**
 * Reads an uploaded image file via FileReader and compresses it into a compact
 * JPEG data URL guaranteed to stay under 100KB for fast Firestore persistence.
 */
export function readAndResizeImageFile(file: File, maxSize = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose a valid image file (JPG, PNG, or WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the selected image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable for image compression.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        try {
          let quality = 0.8;
          let compressed = canvas.toDataURL('image/jpeg', quality);
          while (compressed.length > 105000 && quality > 0.35) {
            quality -= 0.12;
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressed);
        } catch {
          reject(new Error('Unable to compress image for upload.'));
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
