export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // If it's not an image (e.g. PDF), just return original
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Fill background with white (useful for PNGs with transparent backgrounds being converted to JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            // Give it a generic name, forces .jpg extension since we are outputting image/jpeg
            const newFile = new File([blob], `upload_${Date.now()}.jpg`, { type: 'image/jpeg' });
            resolve(newFile);
          } else {
            resolve(file); // fallback
          }
        }, 'image/jpeg', 0.85); // 85% quality JPEG
      };
      
      img.onerror = () => resolve(file); // fallback on image load error
    };
    
    reader.onerror = () => resolve(file); // fallback on file read error
  });
};
