import { describe, it, expect } from '@jest/globals';
import { detectVite } from '../../../src/detectors/vite-detector.js';
import type { PackageJson } from '../../../src/types/config.js';

describe('ViteDetector', () => {
  describe('detectVite', () => {
    it('should detect Vite from devDependencies', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          vite: '^4.0.0',
        },
      };

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeDefined();
      expect(result?.name).toBe('vite');
      expect(result?.outputDir).toBe('dist');
    });

    it('should return null when Vite is not present', async () => {
      const packageJson: PackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      const result = await detectVite('/fake/path', packageJson);

      expect(result).toBeNull();
    });
  });
});
