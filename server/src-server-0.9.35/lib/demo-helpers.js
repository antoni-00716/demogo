// DemoGo - Shared demo data access helpers
// Eliminates repeated readJson + findIndex patterns across route handlers

/**
 * Load all demos from storage.
 * @param {Function} readJson
 * @param {string} demosFile
 * @returns {Promise<Array>}
 */
export async function loadAllDemos(readJson, demosFile) {
  return await readJson(demosFile, []);
}

/**
 * Find a demo by ID and user ID, returning both the demo and its array index.
 * Returns null if not found (does NOT send response - caller decides).
 * @param {Array} demos
 * @param {string} demoId
 * @param {string} userId
 * @returns {{ demo: object, index: number } | null}
 */
export function findUserDemo(demos, demoId, userId) {
  const index = demos.findIndex((d) => d.id === demoId && d.userId === userId);
  if (index === -1) return null;
  return { demo: demos[index], index };
}

/**
 * Persist updated demos array back to storage.
 * @param {Function} writeJson
 * @param {string} demosFile
 * @param {Array} demos
 */
export async function saveAllDemos(writeJson, demosFile, demos) {
  await writeJson(demosFile, demos);
}


/**
 * Save demos with optimistic locking.
 * Re-reads the demos array, verifies the target demo has not been modified
 * since it was read (via updatedAt comparison), applies the update, and persists.
 * 
 * @param {Function} writeJson
 * @param {string} demosFile
 * @param {Function} readJson
 * @param {string} demoId - ID of the demo being updated
 * @param {string|null} expectedUpdatedAt - The updatedAt value expected (or null to skip check)
 * @param {Function} applyUpdate - (demos: Array, target: object) => void - mutates the demos array
 * @returns {Promise<object>} The updated demo
 */
export async function saveAllDemosWithLock(writeJson, demosFile, readJson, demoId, expectedUpdatedAt, applyUpdate) {
  const freshDemos = await readJson(demosFile, []);
  const target = freshDemos.find((d) => d.id === demoId);

  if (!target) {
    throw Object.assign(new Error("Demo not found"), { statusCode: 404 });
  }

  if (expectedUpdatedAt !== null && expectedUpdatedAt !== undefined && target.updatedAt !== expectedUpdatedAt) {
    throw Object.assign(
      new Error("Concurrent update conflict: this demo was modified by another request. Please refresh and try again."),
      { statusCode: 409, code: "CONCURRENT_UPDATE_CONFLICT" }
    );
  }

  applyUpdate(freshDemos, target);

  target.updatedAt = new Date().toISOString();

  await writeJson(demosFile, freshDemos);
  return target;
}
