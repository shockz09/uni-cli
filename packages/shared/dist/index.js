// src/errors.ts
class UniError extends Error {
  code;
  suggestion;
  constructor(message, code, suggestion) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.name = "UniError";
  }
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      suggestion: this.suggestion
    };
  }
}

class ServiceNotFoundError extends UniError {
  constructor(serviceName) {
    super(`Service '${serviceName}' not found`, "SERVICE_NOT_FOUND", `Run 'uni list' to see available services, or install with 'uni install ${serviceName}'`);
    this.name = "ServiceNotFoundError";
  }
}

class CommandNotFoundError extends UniError {
  constructor(serviceName, commandName, availableCommands) {
    const suggestions = availableCommands.length > 0 ? `Available commands: ${availableCommands.join(", ")}` : `Run 'uni ${serviceName} --help' for available commands`;
    super(`Command '${commandName}' not found in service '${serviceName}'`, "COMMAND_NOT_FOUND", suggestions);
    this.name = "CommandNotFoundError";
  }
}

class AuthRequiredError extends UniError {
  constructor(serviceName) {
    super(`Authentication required for '${serviceName}'`, "AUTH_REQUIRED", `Run 'uni auth login ${serviceName}' to authenticate`);
    this.name = "AuthRequiredError";
  }
}

class AuthFailedError extends UniError {
  constructor(serviceName, reason) {
    super(`Authentication failed for '${serviceName}'${reason ? `: ${reason}` : ""}`, "AUTH_FAILED", `Try 'uni auth login ${serviceName}' to re-authenticate`);
    this.name = "AuthFailedError";
  }
}

class ConfigError extends UniError {
  constructor(message, configPath) {
    super(message, "CONFIG_ERROR", configPath ? `Check your config at: ${configPath}` : undefined);
    this.name = "ConfigError";
  }
}

class ValidationError extends UniError {
  constructor(message, field) {
    super(message, "VALIDATION_ERROR", field ? `Check the '${field}' argument or option` : undefined);
    this.name = "ValidationError";
  }
}

class NetworkError extends UniError {
  constructor(message, url) {
    super(message, "NETWORK_ERROR", "Check your internet connection and try again");
    this.name = "NetworkError";
  }
}

class RateLimitError extends UniError {
  constructor(serviceName, retryAfter) {
    const suggestion = retryAfter ? `Wait ${retryAfter} seconds before retrying` : "Wait a moment before retrying";
    super(`Rate limit exceeded for '${serviceName}'`, "RATE_LIMIT", suggestion);
    this.name = "RateLimitError";
  }
}

class MissingArgumentError extends UniError {
  constructor(argName, command) {
    super(`Missing required argument: ${argName}`, "MISSING_ARGUMENT", `Usage: uni ${command} <${argName}>`);
    this.name = "MissingArgumentError";
  }
}

class InvalidOptionError extends UniError {
  constructor(optionName, value, expectedType) {
    super(`Invalid value for --${optionName}: '${value}'`, "INVALID_OPTION", `Expected ${expectedType}`);
    this.name = "InvalidOptionError";
  }
}
// src/helpers.ts
var {spawn} = (() => ({}));
function exec(command, args = []) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["inherit", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0
      });
    });
    proc.on("error", (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1
      });
    });
  });
}
function isTTY() {
  return process.stdout.isTTY ?? false;
}
function supportsColor() {
  if (process.env.NO_COLOR !== undefined)
    return false;
  if (process.env.FORCE_COLOR !== undefined)
    return true;
  if (process.env.CLICOLOR === "0")
    return false;
  return isTTY();
}
function truncate(str, maxLength) {
  if (str.length <= maxLength)
    return str;
  return str.slice(0, maxLength - 3) + "...";
}
function padRight(str, length) {
  if (str.length >= length)
    return str;
  return str + " ".repeat(length - str.length);
}
function formatDuration(ms) {
  if (ms < 1000)
    return `${ms}ms`;
  if (ms < 60000)
    return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000)
    return `${Math.floor(ms / 60000)}m ${Math.floor(ms % 60000 / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor(ms % 3600000 / 60000)}m`;
}
function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
function formatDate(date, relative = false) {
  if (relative) {
    const now = Date.now();
    const diff = now - date.getTime();
    if (diff < 60000)
      return "just now";
    if (diff < 3600000)
      return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)
      return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000)
      return `${Math.floor(diff / 86400000)}d ago`;
  }
  return date.toISOString().split("T")[0];
}
function deepMerge(target, ...sources) {
  const result = { ...target };
  for (const source of sources) {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];
      if (sourceValue !== null && typeof sourceValue === "object" && !Array.isArray(sourceValue) && targetValue !== null && typeof targetValue === "object" && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  }
  return result;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2
  } = options;
  let lastError;
  let delay = initialDelay;
  for (let attempt = 1;attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts)
        break;
      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }
  throw lastError;
}
function parseKeyValuePairs(pairs) {
  const result = {};
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    if (key) {
      result[key] = valueParts.join("=");
    }
  }
  return result;
}
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
export {
  truncate,
  toKebabCase,
  toCamelCase,
  supportsColor,
  sleep,
  retry,
  parseKeyValuePairs,
  padRight,
  isTTY,
  formatDuration,
  formatDate,
  formatBytes,
  exec,
  deepMerge,
  ValidationError,
  UniError,
  ServiceNotFoundError,
  RateLimitError,
  NetworkError,
  MissingArgumentError,
  InvalidOptionError,
  ConfigError,
  CommandNotFoundError,
  AuthRequiredError,
  AuthFailedError
};
