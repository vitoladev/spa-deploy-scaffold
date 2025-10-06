import { describe, it, expect } from '@jest/globals';
import {
  ScaffoldError,
  BuildToolNotFoundError,
  ConfigParseError,
  FileNotFoundError,
  ValidationError,
  SecurityError,
} from '../../../src/errors/scaffold-errors.js';

describe('ScaffoldErrors', () => {
  describe('ScaffoldError', () => {
    it('should create error with message and code', () => {
      const error = new ScaffoldError('Test error', 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ScaffoldError');
    });
  });

  describe('BuildToolNotFoundError', () => {
    it('should create error with checked locations', () => {
      const locations = ['vite', 'rollup', 'esbuild'];
      const error = new BuildToolNotFoundError(locations);

      expect(error).toBeInstanceOf(ScaffoldError);
      expect(error.code).toBe('BUILD_TOOL_NOT_FOUND');
      expect(error.message).toContain('vite');
      expect(error.message).toContain('rollup');
      expect(error.message).toContain('esbuild');
    });
  });

  describe('ConfigParseError', () => {
    it('should create error with file path and cause', () => {
      const filePath = '/path/to/config.js';
      const cause = new Error('Parse failed');
      const error = new ConfigParseError(filePath, cause);

      expect(error).toBeInstanceOf(ScaffoldError);
      expect(error.code).toBe('CONFIG_PARSE_ERROR');
      expect(error.message).toContain(filePath);
      expect(error.cause).toBe(cause);
    });
  });

  describe('FileNotFoundError', () => {
    it('should create error with file path', () => {
      const filePath = '/path/to/missing-file.txt';
      const error = new FileNotFoundError(filePath);

      expect(error).toBeInstanceOf(ScaffoldError);
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.message).toContain(filePath);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(ScaffoldError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
    });

    it('should create error with additional error details', () => {
      const errorDetails = { field: 'name', issue: 'required' };
      const error = new ValidationError('Validation failed', errorDetails);

      expect(error.errors).toEqual(errorDetails);
    });
  });

  describe('SecurityError', () => {
    it('should create error with security message', () => {
      const error = new SecurityError('Path traversal detected');

      expect(error).toBeInstanceOf(ScaffoldError);
      expect(error.code).toBe('SECURITY_ERROR');
      expect(error.message).toBe('Path traversal detected');
    });
  });
});
