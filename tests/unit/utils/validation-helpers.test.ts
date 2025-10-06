import { describe, it, expect } from '@jest/globals';
import {
  validateOutputPath,
  isViteConfig,
  isRollupConfig,
  isEsbuildConfig,
  sanitizeProjectName,
} from '../../../src/utils/validation-helpers.js';
import { SecurityError } from '../../../src/errors/scaffold-errors.js';

describe('ValidationHelpers', () => {
  describe('validateOutputPath', () => {
    it('should return resolved path within project root', () => {
      const projectRoot = '/home/user/project';
      const outputPath = './terraform';

      const result = validateOutputPath(outputPath, projectRoot);

      expect(result).toBe('/home/user/project/terraform');
    });

    it('should throw SecurityError for path traversal attempt', () => {
      const projectRoot = '/home/user/project';
      const outputPath = '../../etc/passwd';

      expect(() => validateOutputPath(outputPath, projectRoot)).toThrow(SecurityError);
    });

    it('should allow absolute path within project root', () => {
      const projectRoot = '/home/user/project';
      const outputPath = '/home/user/project/output';

      const result = validateOutputPath(outputPath, projectRoot);

      expect(result).toBe('/home/user/project/output');
    });
  });

  describe('isViteConfig', () => {
    it('should return true for valid Vite config', () => {
      const config = {
        build: {
          outDir: 'dist',
        },
      };

      expect(isViteConfig(config)).toBe(true);
    });

    it('should return true for empty config object', () => {
      const config = {};

      expect(isViteConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isViteConfig(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isViteConfig('string')).toBe(false);
      expect(isViteConfig(123)).toBe(false);
    });
  });

  describe('isRollupConfig', () => {
    it('should return true for valid Rollup config with output.dir', () => {
      const config = {
        output: {
          dir: 'dist',
        },
      };

      expect(isRollupConfig(config)).toBe(true);
    });

    it('should return true for valid Rollup config with output.file', () => {
      const config = {
        output: {
          file: 'dist/bundle.js',
        },
      };

      expect(isRollupConfig(config)).toBe(true);
    });

    it('should return true for empty config object', () => {
      const config = {};

      expect(isRollupConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRollupConfig(null)).toBe(false);
    });
  });

  describe('isEsbuildConfig', () => {
    it('should return true for valid esbuild config with outdir', () => {
      const config = {
        outdir: 'dist',
      };

      expect(isEsbuildConfig(config)).toBe(true);
    });

    it('should return true for valid esbuild config with outfile', () => {
      const config = {
        outfile: 'dist/bundle.js',
      };

      expect(isEsbuildConfig(config)).toBe(true);
    });

    it('should return true for empty config object', () => {
      const config = {};

      expect(isEsbuildConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isEsbuildConfig(null)).toBe(false);
    });
  });

  describe('sanitizeProjectName', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeProjectName('MyProject')).toBe('myproject');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeProjectName('my project')).toBe('my-project');
    });

    it('should replace invalid characters with hyphens', () => {
      expect(sanitizeProjectName('my@project#123')).toBe('my-project-123');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeProjectName('--my-project--')).toBe('my-project');
    });

    it('should truncate to 63 characters', () => {
      const longName = 'a'.repeat(100);
      const result = sanitizeProjectName(longName);

      expect(result.length).toBe(63);
    });

    it('should handle complex names', () => {
      expect(sanitizeProjectName('My Super Cool Project! v2.0')).toBe(
        'my-super-cool-project-v2-0'
      );
    });
  });
});
