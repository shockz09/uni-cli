/**
 * Custom error classes for uni CLI
 */

export class UniError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'UniError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      suggestion: this.suggestion,
    };
  }
}

export class ServiceNotFoundError extends UniError {
  constructor(serviceName: string) {
    super(
      `Service '${serviceName}' not found`,
      'SERVICE_NOT_FOUND',
      `Run 'uni list' to see available services, or install with 'uni install ${serviceName}'`
    );
    this.name = 'ServiceNotFoundError';
  }
}

export class CommandNotFoundError extends UniError {
  constructor(serviceName: string, commandName: string, availableCommands: string[]) {
    const suggestions = availableCommands.length > 0
      ? `Available commands: ${availableCommands.join(', ')}`
      : `Run 'uni ${serviceName} --help' for available commands`;

    super(
      `Command '${commandName}' not found in service '${serviceName}'`,
      'COMMAND_NOT_FOUND',
      suggestions
    );
    this.name = 'CommandNotFoundError';
  }
}

export class AuthRequiredError extends UniError {
  constructor(serviceName: string) {
    super(
      `Authentication required for '${serviceName}'`,
      'AUTH_REQUIRED',
      `Run 'uni auth login ${serviceName}' to authenticate`
    );
    this.name = 'AuthRequiredError';
  }
}

export class AuthFailedError extends UniError {
  constructor(serviceName: string, reason?: string) {
    super(
      `Authentication failed for '${serviceName}'${reason ? `: ${reason}` : ''}`,
      'AUTH_FAILED',
      `Try 'uni auth login ${serviceName}' to re-authenticate`
    );
    this.name = 'AuthFailedError';
  }
}

export class ConfigError extends UniError {
  constructor(message: string, configPath?: string) {
    super(
      message,
      'CONFIG_ERROR',
      configPath ? `Check your config at: ${configPath}` : undefined
    );
    this.name = 'ConfigError';
  }
}

export class ValidationError extends UniError {
  constructor(message: string, field?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      field ? `Check the '${field}' argument or option` : undefined
    );
    this.name = 'ValidationError';
  }
}

export class NetworkError extends UniError {
  constructor(message: string, url?: string) {
    super(
      message,
      'NETWORK_ERROR',
      'Check your internet connection and try again'
    );
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends UniError {
  constructor(serviceName: string, retryAfter?: number) {
    const suggestion = retryAfter
      ? `Wait ${retryAfter} seconds before retrying`
      : 'Wait a moment before retrying';

    super(
      `Rate limit exceeded for '${serviceName}'`,
      'RATE_LIMIT',
      suggestion
    );
    this.name = 'RateLimitError';
  }
}

export class MissingArgumentError extends UniError {
  constructor(argName: string, command: string) {
    super(
      `Missing required argument: ${argName}`,
      'MISSING_ARGUMENT',
      `Usage: uni ${command} <${argName}>`
    );
    this.name = 'MissingArgumentError';
  }
}

export class InvalidOptionError extends UniError {
  constructor(optionName: string, value: string, expectedType: string) {
    super(
      `Invalid value for --${optionName}: '${value}'`,
      'INVALID_OPTION',
      `Expected ${expectedType}`
    );
    this.name = 'InvalidOptionError';
  }
}
