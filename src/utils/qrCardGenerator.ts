import QRCode from 'qrcode';
import { RestaurantSettings, RestaurantTable } from '../types/menu';
import { buildTableMenuUrl } from './menuLogic';

/**
 * Generates a high-resolution data URL of a raw QR code PNG for a table.
 */
export async function generateRawTableQrPng(
  origin: string,
  tableNumber: string
): Promise<string> {
  const targetUrl = buildTableMenuUrl(origin, tableNumber);
  return QRCode.toDataURL(targetUrl, {
    width: 600,
    margin: 2,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Renders a printable branded table tent QR card onto an HTML5 Canvas
 * and returns a downloadable PNG data URL.
 */
export async function generateBrandedTableCardPng(
  origin: string,
  table: RestaurantTable,
  settings: RestaurantSettings
): Promise<string> {
  const targetUrl = buildTableMenuUrl(origin, table.tableNumber);
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 520,
    margin: 2,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  const brandColor = settings.brandColor || '#1E40AF';
  const accentColor = settings.accentColor || '#FACC15';

  // Background fill
  ctx.fillStyle = '#EEF0F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header rounded banner
  ctx.fillStyle = brandColor;
  ctx.beginPath();
  ctx.roundRect(40, 40, 720, 250, 36);
  ctx.fill();

  // Brand Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 52px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(settings.name.slice(0, 28), 400, 135);

  // Tagline
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.font = '500 22px "Figtree", system-ui, sans-serif';
  ctx.fillText(settings.tagline.slice(0, 52), 400, 185);

  // Accent pill inside header
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(250, 212, 300, 48, 24);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 20px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText(`TABLE ${table.tableNumber.toUpperCase()}`, 400, 243);

  // White QR Frame Card
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(110, 330, 580, 580, 36);
  ctx.fill();

  // Draw QR Image
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = (err) => reject(err);
    qrImg.src = qrDataUrl;
  });
  ctx.drawImage(qrImg, 150, 355, 500, 500);

  // URL caption inside card
  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`/?table=${table.tableNumber}`, 400, 882);

  // Footer CTA
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 30px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.fillText('SCAN FOR DIGITAL MENU', 400, 975);

  ctx.fillStyle = '#475569';
  ctx.font = '500 20px "Figtree", system-ui, sans-serif';
  ctx.fillText('No app download required · Point your phone camera here', 400, 1015);

  return canvas.toDataURL('image/png');
}

/**
 * Triggers a browser file download for a data URL.
 */
export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Compresses an uploaded image file to a compact JPEG data URL (< 90KB)
 * so it can be stored safely in Firestore and localStorage.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 420
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
      img.src = String(reader.result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
