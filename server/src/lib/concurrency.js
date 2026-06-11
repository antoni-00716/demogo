// DemoGo v0.9.39 - Concurrency control for Docker operations
// Prevents OOM on 2C2G servers by limiting concurrent Docker operations

let activeDockerOps = 0;
const MAX_CONCURRENT_DOCKER = 1; // Single slot on 2C2G
const POLL_INTERVAL_MS = 500;

/**
 * Execute a function within the Docker concurrency slot.
 * Waits until fewer than MAX_CONCURRENT_DOCKER operations are active,
 * then runs the function and decrements the counter when done.
 */
export async function withDockerSlot(fn) {
  while (activeDockerOps >= MAX_CONCURRENT_DOCKER) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  activeDockerOps++;
  try {
    return await fn();
  } finally {
    activeDockerOps--;
  }
}
