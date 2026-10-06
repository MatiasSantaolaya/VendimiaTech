export type PresignedUpload = { uploadUrl: string; storageKey: string; publicUrl?: string; headers?: Record<string,string>; expiresAt: string };
export interface ObjectStorageProvider {
  createPresignedUpload(input: { key: string; contentType: string; sizeBytes: number }): Promise<PresignedUpload>;
}
