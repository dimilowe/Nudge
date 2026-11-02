import { readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { Client } from "@replit/object-storage";
import { getImageObjectName, isSafeImageFilename } from "../server/services/app-storage";

const uploadDir = path.join(process.cwd(), "uploads", "images");
const client = new Client();

async function migrateLocalImages() {
  let entries: Dirent[];
  try {
    entries = await readdir(uploadDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("No local uploads/images directory found; nothing to migrate.");
      return;
    }
    throw error;
  }

  const files = entries.filter((entry) => entry.isFile());
  const invalidFiles = files.filter((entry) => !isSafeImageFilename(entry.name));
  if (invalidFiles.length) {
    throw new Error(`Unsupported image filenames: ${invalidFiles.map((entry) => entry.name).join(", ")}`);
  }

  const storage = client;
  let migrated = 0;
  let alreadyPresent = 0;

  for (const entry of files) {
    const objectName = getImageObjectName(entry.name);
    const exists = await storage.exists(objectName);
    if (!exists.ok) {
      throw new Error(`Could not check App Storage for ${entry.name}: ${exists.error.message}`);
    }
    if (exists.value) {
      alreadyPresent++;
      continue;
    }

    const result = await storage.uploadFromFilename(objectName, path.join(uploadDir, entry.name));
    if (!result.ok) {
      throw new Error(`Could not migrate ${entry.name}: ${result.error.message}`);
    }
    migrated++;
  }

  console.log(`Migrated ${migrated} image(s); ${alreadyPresent} already existed in App Storage.`);
  console.log("Local source files were left untouched.");
}

migrateLocalImages().catch((error) => {
  console.error("Image migration failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
