export class ScaffoldError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BuildToolNotFoundError extends ScaffoldError {
  constructor(checkedLocations: string[]) {
    super(
      `No build tool detected. Checked: ${checkedLocations.join(', ')}. Please ensure you have vite, rollup, or esbuild installed.`,
      'BUILD_TOOL_NOT_FOUND'
    );
  }
}

export class ConfigParseError extends ScaffoldError {
  constructor(filePath: string, cause: unknown) {
    super(
      `Failed to parse config file: ${filePath}`,
      'CONFIG_PARSE_ERROR'
    );
    this.cause = cause;
  }
}

export class FileNotFoundError extends ScaffoldError {
  constructor(filePath: string) {
    super(
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND'
    );
  }
}

export class ValidationError extends ScaffoldError {
  constructor(message: string, public readonly errors?: unknown) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class SecurityError extends ScaffoldError {
  constructor(message: string) {
    super(message, 'SECURITY_ERROR');
  }
}
