import * as QRCode from 'qrcode';


export async function getQRCode(otpauthUrl: string) {
  return await QRCode.toDataURL(otpauthUrl);
}