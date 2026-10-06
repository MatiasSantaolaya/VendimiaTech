import type { ObjectStorageProvider, PresignedUpload } from './types';

class HttpStorageProvider implements ObjectStorageProvider {
  async createPresignedUpload(input: { key: string; contentType: string; sizeBytes: number }) {
    const url = process.env.STORAGE_SIGNING_URL;
    const key = process.env.STORAGE_API_KEY;
    if (!url || !key) throw new Error('STORAGE_PROVIDER_NOT_CONFIGURED');
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
    if (!res.ok) throw new Error(`STORAGE_PROVIDER_ERROR_${res.status}`);
    const data = await res.json();
    return data as PresignedUpload;
  }
}

export const objectStorage: ObjectStorageProvider = new HttpStorageProvider();
