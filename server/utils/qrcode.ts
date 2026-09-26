import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generates an opaque random credential token (e.g. TKT-9a8b7c6d5e4f3a2b)
 * Free of any PII, user info, vehicle info, or raw booking details.
 */
export function generateOpaqueToken(): string {
  const randomBytes = crypto.randomBytes(12).toString('hex').toUpperCase();
  return `TKT-${randomBytes.slice(0, 4)}-${randomBytes.slice(4, 8)}-${randomBytes.slice(8, 12)}`;
}

/**
 * Computes SHA256 hash of opaque ticket token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates a high-quality PNG DataURL for the opaque token
 */
export async function generateQRCodeDataURL(token: string): Promise<string> {
  // Payload is ONLY the opaque credential JSON object or string token
  const payload = JSON.stringify({ ticket: token });

  const options: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    color: {
      dark: '#1e293b', // Sleek dark slate
      light: '#ffffff',
    },
    width: 320,
  };

  return QRCode.toDataURL(payload, options);
}
