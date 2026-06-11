console.log('[TEST3] Starting...');
import express from 'express';
import { addDeploymentJob, deploymentQueue, closeQueue } from './queue/queue.js';
console.log('[TEST3] queue.js imported, deploymentQueue created');
const app = express();
app.listen(3001, () => console.log('[TEST3] LISTENING 3001'));
