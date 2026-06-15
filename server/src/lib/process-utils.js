// DemoGo - Process utilities (unified runCommand for all services)
import { execFile } from "node:child_process";
import process from "node:process";

/**
 * Run a command with options. Unified version replacing 4 duplicate implementations.
 *
 * @param {string} command - The command to run
 * @param {string[]} args - Command arguments
 * @param {object} options
 * @param {string} options.cwd - Working directory
 * @param {number} [options.timeout=60000] - Timeout in ms
 * @param {number} [options.maxBufferMB=4] - Max stdout buffer in MB
 * @param {object} [options.env] - Extra env vars (merged on top of process.env)
 * @param {boolean} [options.ci=true] - Whether to set CI=true
 */
export function runCommand(command, args, options = {}) {
  const {
    cwd,
    timeout = 60000,
    maxBufferMB = 4,
    env = {},
    ci = true,
  } = options;

  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd,
      shell: process.platform === "win32",
      timeout,
      maxBuffer: 1024 * 1024 * maxBufferMB,
      env: {
        ...process.env,
        ...env,
        ...(ci ? { CI: "true" } : {}),
      },
    }, (error, stdout, stderr) => {
      const output = [`$ ${command} ${args.join(" ")}`, stdout, stderr].filter(Boolean).join("\n");
      if (error) {
        error.buildLog = output;
        reject(error);
        return;
      }
      resolve(output);
    });
  });
}
