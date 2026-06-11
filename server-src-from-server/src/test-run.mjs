console.log('[TEST] Starting...');
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import cookieParser from 'cookie-parser';
import express from 'express';
import multer from 'multer';
import * as tar from 'tar';
import unzipper from 'unzipper';
console.log('[TEST] All imports loaded');
const app = express();
const port = 3001;
app.listen(port, () => {
  console.log('[TEST] Server listening on ' + port);
});
