import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { detectRollup } from '../../../src/detectors/rollup-detector.js';
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

describe('RollupDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRollup', () => {
    it('should detect Rollup from devDependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          rollup: '^3.0.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectRollup('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('rollup');
      expect(result?.outputDir).toBe('dist');
      expect(result?.configPath).toBeUndefined();
    });

    it('should detect Rollup from dependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          rollup: '^3.0.0',
        },
      };

      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(null);

      const result = await detectRollup('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('rollup');
    });

    it('should return null when Rollup is not present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      const result = await detectRollup('/fake/path', packageJson);

      expect(result).toBeNull();
    });

    it('should detect config file when present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          rollup: '^3.0.0',
        },
      };

      const configPath = '/fake/path/rollup.config.js';
      (findConfigFile as jest.MockedFunction<typeof findConfigFile>).mockResolvedValue(
        configPath
      );

      const result = await detectRollup('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.configPath).toBe(configPath);
      expect(findConfigFile).toHaveBeenCalledWith('/fake/path', 'rollup.config', [
        '.ts',
        '.js',
        '.mjs',
      ]);
    });
  });
});
