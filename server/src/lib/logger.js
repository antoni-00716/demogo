// DemoGo - Structured logger based on pino
import pino from "pino";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const logger = pino({
  level,
  name: "demogo-server",
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;

export function childLogger(bindings) {
  return logger.child(bindings);
}
