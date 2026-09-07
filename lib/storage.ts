import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Local disk (public/uploads/) works for local dev but not on Vercel's
// serverless filesystem — swaps to Vercel Blob automatically once
// BLOB_READ_WRITE_TOKEN exists (set automatically when Blob storage is
// provisioned from the Vercel dashboard). No other code needs to know
// which one is active; both return a URL the browser can load directly.
export async function saveUploadedFile(file: File): Promise<string> {
  const extension = path.extname(file.name);
  const filename = `${crypto.randomUUID()}${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, file, { access: "public" });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), bytes);
  return `/uploads/${filename}`;
}
