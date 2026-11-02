import { Client } from "@replit/object-storage";

const imageFilenamePattern = /^\d+-\d+\.(?:jpe?g|png|gif|webp)$/i;

let client: Client | undefined;

export function getAppStorageClient(): Client {
  client ??= new Client();
  return client;
}

export function isSafeImageFilename(filename: string): boolean {
  return imageFilenamePattern.test(filename);
}

export function getImageObjectName(filename: string): string {
  if (!isSafeImageFilename(filename)) {
    throw new Error("Invalid uploaded image filename.");
  }

  return `uploads/images/${filename}`;
}
