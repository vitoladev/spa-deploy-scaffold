import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { detectBuildTool } from '../../../src/detectors/build-tool-orchestrator.js';
import { BuildToolNotFoundError } from '../../../src/errors/scaffold-errors.js';
import type { PackageJson } from '../../../src/types/config.js';
import type { BuildToolConfig } from '../../../src/types/detector.js';

jest.mock('../../../src/detectors/vite-detector.js');
jest.mock('../../../src/detectors/rollup-detector.js');
jest.mock('../../../src/detectors/esbuild-detector.js');

import { detectVite } from '../../../src/detectors/vite-detector.js';
import { detectRollup } from '../../../src/detectors/rollup-detector.js';
import { detectEsbuild } from '../../../src/detectors/esbuild-detector.js';

describe('BuildToolOrchestrator', () => {
  const mockPackageJson: PackageJson = {
    name: 'test-project',
    version: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectBuildTool', () => {
    it('should return Vite config when Vite is detected (priority)', async () => {
      const viteConfig: BuildToolConfig = {
        name: 'vite',
        outputDir: 'dist',
      };

      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(viteConfig);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(null);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(null);

      const result = await detectBuildTool('/fake/path', mockPackageJson);

      expect(result).toEqual(viteConfig);
      expect(detectVite).toHaveBeenCalledWith('/fake/path', mockPackageJson);
    });

    it('should return Rollup config when only Rollup is detected', async () => {
      const rollupConfig: BuildToolConfig = {
        name: 'rollup',
        outputDir: 'dist',
      };

      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(null);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(rollupConfig);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(null);

      const result = await detectBuildTool('/fake/path', mockPackageJson);

      expect(result).toEqual(rollupConfig);
    });

    it('should return esbuild config when only esbuild is detected', async () => {
      const esbuildConfig: BuildToolConfig = {
        name: 'esbuild',
        outputDir: 'out',
      };

      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(null);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(null);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(
        esbuildConfig
      );

      const result = await detectBuildTool('/fake/path', mockPackageJson);

      expect(result).toEqual(esbuildConfig);
    });

    it('should prioritize Vite over Rollup when both detected', async () => {
      const viteConfig: BuildToolConfig = {
        name: 'vite',
        outputDir: 'dist',
      };
      const rollupConfig: BuildToolConfig = {
        name: 'rollup',
        outputDir: 'dist',
      };

      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(viteConfig);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(rollupConfig);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(null);

      const result = await detectBuildTool('/fake/path', mockPackageJson);

      expect(result).toEqual(viteConfig);
    });

    it('should throw BuildToolNotFoundError when no build tool detected', async () => {
      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(null);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(null);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(null);

      await expect(detectBuildTool('/fake/path', mockPackageJson)).rejects.toThrow(
        BuildToolNotFoundError
      );
    });

    it('should run all detectors in parallel', async () => {
      (detectVite as jest.MockedFunction<typeof detectVite>).mockResolvedValue(null);
      (detectRollup as jest.MockedFunction<typeof detectRollup>).mockResolvedValue(null);
      (detectEsbuild as jest.MockedFunction<typeof detectEsbuild>).mockResolvedValue(null);

      try {
        await detectBuildTool('/fake/path', mockPackageJson);
      } catch {
        // Expected to throw
      }

      expect(detectVite).toHaveBeenCalled();
      expect(detectRollup).toHaveBeenCalled();
      expect(detectEsbuild).toHaveBeenCalled();
    });
  });
});
