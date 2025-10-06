import { describe, it, expect } from '@jest/globals';
import { PackageJsonSchema, CLIOptionsSchema } from '../../../src/types/config.js';

describe('ConfigTypes', () => {
  describe('PackageJsonSchema', () => {
    it('should validate valid package.json', () => {
      const valid = {
        name: 'test-project',
        version: '1.0.0',
      };

      const result = PackageJsonSchema.safeParse(valid);

      expect(result.success).toBe(true);
    });

    it('should validate package.json with optional fields', () => {
      const valid = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.17.1',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        scripts: {
          build: 'tsc',
        },
      };

      const result = PackageJsonSchema.safeParse(valid);

      expect(result.success).toBe(true);
    });

    it('should fail validation without required fields', () => {
      const invalid = {
        name: 'test-project',
        // missing version
      };

      const result = PackageJsonSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });
  });

  describe('CLIOptionsSchema', () => {
    it('should validate valid CLI options', () => {
      const valid = {
        tool: 'vite' as const,
        projectName: 'my-project',
        output: './terraform',
        region: 'us-east-1',
      };

      const result = CLIOptionsSchema.safeParse(valid);

      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const minimal = {};

      const result = CLIOptionsSchema.parse(minimal);

      expect(result.output).toBe('./terraform');
      expect(result.region).toBe('us-east-1');
      expect(result.yes).toBe(false);
    });

    it('should validate optional domain and certArn', () => {
      const valid = {
        domain: 'example.com',
        certArn: 'arn:aws:acm:...',
      };

      const result = CLIOptionsSchema.safeParse(valid);

      expect(result.success).toBe(true);
    });

    it('should fail validation for invalid tool', () => {
      const invalid = {
        tool: 'webpack', // not in enum
      };

      const result = CLIOptionsSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });
  });
});
