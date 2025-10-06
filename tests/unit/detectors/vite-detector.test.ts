import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { detectVite } from '../../../src/detectors/vite-detector.js';
import type { PackageJson } from '../../../src/types/config.js';

// Mock the file-system-helpers module
jest.mock('../../../src/utils/file-system-helpers.js', () => ({
  findConfigFile: jest.fn(),
}));

// Mock the cli-logger module
jest.mock('../../../src/utils/cli-logger.js', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

import { findConfigFile } from '../../../src/utils/file-system-helpers.js';

describe('ViteDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectVite', () => {
    it('should detect Vite from devDependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          vite: '^4.0.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('vite');
      expect(result?.outputDir).toBe('dist');
      expect(result?.configPath).toBeUndefined();
    });

    it('should detect Vite from dependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          vite: '^4.0.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('vite');
    });

    it('should return null when Vite is not present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeNull();
    });

    it('should detect config file when present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          vite: '^4.0.0',
        },
      };

      const configPath = '/fake/path/vite.config.ts';
      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(
        configPath
      );

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.configPath).toBe(configPath);
      expect(findConfigFile).toHaveBeenCalledWith('/fake/path', 'vite.config', [
        '.ts',
        '.js',
        '.mjs',
      ]);
    });
  });
});
