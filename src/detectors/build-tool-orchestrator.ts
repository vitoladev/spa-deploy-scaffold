import { BuildToolNotFoundError } from '../errors/scaffold-errors.js';
import { detectEsbuild } from './esbuild-detector.js';
import { detectRollup } from './rollup-detector.js';
import { detectVite } from './vite-detector.js';
import type { PackageJson } from '../types/config.js';
import type { BuildToolConfig } from '../types/detector.js';

export async function detectBuildTool(
  projectPath: string,
  packageJson: PackageJson
): Promise<BuildToolConfig> {
  const [viteConfig, rollupConfig, esbuildConfig] = await Promise.all([
    detectVite(projectPath, packageJson),
    detectRollup(projectPath, packageJson),
    detectEsbuild(projectPath, packageJson),
  ]);

  if (viteConfig) {
    return viteConfig;
  }

  if (rollupConfig) {
    return rollupConfig;
  }

  if (esbuildConfig) {
    return esbuildConfig;
  }

  throw new BuildToolNotFoundError([
    'vite (devDependencies)',
    'rollup (devDependencies)',
    'esbuild (devDependencies)',
  ]);
}
