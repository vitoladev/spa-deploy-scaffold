import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { detectEsbuild } from '../../../src/detectors/esbuild-detector.js';
import type { PackageJson } from '../../../src/types/config.js';

jest.mock('../../../src/utils/file-system-helpers.js', () => ({
  findConfigFile: jest.fn(),
}));

jest.mock('../../../src/utils/cli-logger.js', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

import { findConfigFile } from '../../../src/utils/file-system-helpers.js';

describe('EsbuildDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectEsbuild', () => {
    it('should detect esbuild from devDependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          esbuild: '^0.19.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('esbuild');
      expect(result?.outputDir).toBe('dist');
      expect(result?.configPath).toBeUndefined();
    });

    it('should detect esbuild from dependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          esbuild: '^0.19.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('esbuild');
    });

    it('should return null when esbuild is not present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeNull();
    });

    it('should parse outdir from build script', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          esbuild: '^0.19.0',
        },
        scripts: {
          build: 'esbuild src/index.js --outdir=build',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.outputDir).toBe('build');
    });

    it('should parse outdir with space separator', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          esbuild: '^0.19.0',
        },
        scripts: {
          build: 'esbuild src/index.js --outdir out',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.outputDir).toBe('out');
    });

    it('should detect config file when present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          esbuild: '^0.19.0',
        },
      };

      const configPath = '/fake/path/esbuild.config.js';
      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(
        configPath
      );

      const result = await detectEsbuild('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.configPath).toBe(configPath);
    });
  });
});
