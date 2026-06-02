// DemoGo v0.9.30 - Storage abstraction layer
// Supports "local" (fs) and "minio" (S3-compatible) backends.
// Switch via DEMOGO_STORAGE_BACKEND env var (default: "local").

import fs from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  storageBackend,
  s3Endpoint,
  s3AccessKey,
  s3SecretKey,
  s3Bucket,
  s3UseSsl,
  s3Region,
  uploadDir,
  demoRoot,
} from "../config.js";
import logger from "./logger.js";

let _client = null;
let _bucketReady = false;

async function getMinioClient() {
  if (_client) return _client;
  const { Client } = await import("minio");
  _client = new Client({
    endPoint: new URL(s3Endpoint).hostname,
    port: Number(new URL(s3Endpoint).port) || (s3UseSsl ? 443 : 9000),
    useSSL: s3UseSsl,
    accessKey: s3AccessKey,
    secretKey: s3SecretKey,
    region: s3Region,
  });
  return _client;
}

async function ensureBucket() {
  if (_bucketReady) return;
  if (storageBackend !== "minio") { _bucketReady = true; return; }
  const client = await getMinioClient();
  const exists = await client.bucketExists(s3Bucket);
  if (!exists) await client.makeBucket(s3Bucket, s3Region);
  _bucketReady = true;
  logger.info({ bucket: s3Bucket }, "MinIO bucket ready");
}

// ====== Public API ======

/** Upload a local file to storage */
export async function putFile(key, localPath) {
  await ensureBucket();
  if (storageBackend !== "minio") {
    // Local mode: already on disk, nothing to do
    return `file://${localPath}`;
  }
  const client = await getMinioClient();
  await client.fPutObject(s3Bucket, key, localPath);
  return `${s3Endpoint}/${s3Bucket}/${key}`;
}

/** Upload a directory recursively to storage */
export async function putDirectory(prefix, localDir) {
  await ensureBucket();
  if (storageBackend !== "minio") {
    // Local mode: already on disk
    return;
  }
  const client = await getMinioClient();
  const files = await walkDir(localDir);
  for (const file of files) {
    const relativePath = path.relative(localDir, file).replace(/\\/g, "/");
    const key = `${prefix}/${relativePath}`;
    await client.fPutObject(s3Bucket, key, file);
  }
  logger.info({ prefix, count: files.length }, "Directory uploaded to MinIO");
}

/** Get a readable stream for a stored object */
export async function getFileStream(key) {
  await ensureBucket();
  if (storageBackend !== "minio") {
    // Local mode: key is actually a local path
    return createReadStream(key);
  }
  const client = await getMinioClient();
  return client.getObject(s3Bucket, key);
}

/** Download a stored object to local path */
export async function downloadFile(key, localPath) {
  await ensureBucket();
  if (storageBackend !== "minio") {
    // Local mode: key is already local path, just copy if different
    if (key !== localPath) {
      await fs.promises.cp(key, localPath, { recursive: true });
    }
    return;
  }
  const client = await getMinioClient();
  await client.fGetObject(s3Bucket, key, localPath);
}

/** Delete a single object */
export async function deleteFile(key) {
  if (storageBackend !== "minio") {
    try { await fs.promises.rm(key, { force: true }); } catch { /* ignore */ }
    return;
  }
  const client = await getMinioClient();
  try { await client.removeObject(s3Bucket, key); } catch { /* ignore */ }
}

/** Delete all objects under a prefix */
export async function deletePrefix(prefix) {
  if (storageBackend !== "minio") {
    try { await fs.promises.rm(prefix, { recursive: true, force: true }); } catch { /* ignore */ }
    return;
  }
  const client = await getMinioClient();
  const stream = client.listObjects(s3Bucket, prefix, true);
  const objects = [];
  for await (const obj of stream) {
    objects.push(obj.name);
    if (objects.length >= 1000) {
      await client.removeObjects(s3Bucket, objects);
      objects.length = 0;
    }
  }
  if (objects.length) await client.removeObjects(s3Bucket, objects);
}

/** Check if an object exists */
export async function fileExists(key) {
  if (storageBackend !== "minio") {
    try { await fs.promises.access(key); return true; } catch { return false; }
  }
  try {
    const client = await getMinioClient();
    await client.statObject(s3Bucket, key);
    return true;
  } catch {
    return false;
  }
}

/** Get presigned URL (MinIO) or local file URL (local) */
export async function getFileUrl(key, expirySeconds = 3600) {
  if (storageBackend !== "minio") {
    return `file://${key}`;
  }
  const client = await getMinioClient();
  return client.presignedGetObject(s3Bucket, key, expirySeconds);
}

// ====== Internal ======

async function walkDir(dir) {
  const result = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkDir(full)));
    } else {
      result.push(full);
    }
  }
  return result;
}

/** Check if storage backend is MinIO */
export function isMinioBackend() {
  return storageBackend === "minio";
}
