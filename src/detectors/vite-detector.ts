import { logger } from '../utils/cli-logger.js';
import { findConfigFile } from '../utils/file-system-helpers.js';
import { isViteConfig } from '../utils/validation-helpers.js';
import type { PackageJson } from '../types/config.js';
import type { BuildToolConfig } from '../types/detector.js';

const DEFAULT_OUTPUT_DIR = 'dist';

export async function detectVite(
  projectPath: string,
  packageJson: PackageJson
): Promise<BuildToolConfig | null> {
  const hasVite =
    packageJson.devDependencies?.vite !== undefined ||
    packageJson.dependencies?.vite !== undefined;

  if (!hasVite) {
    return null;
  }

  logger.debug('Vite detected in dependencies');

  const configPath = await findConfigFile(projectPath, 'vite.config', [
    '.ts',
    '.js',
    '.mjs',
  ]);

  let outputDir = DEFAULT_OUTPUT_DIR;

  if (configPath) {
    logger.debug(`Found Vite config: ${configPath}`);
    outputDir = await parseViteConfig(configPath) ?? DEFAULT_OUTPUT_DIR;
  }

  return {
    name: 'vite',
    outputDir,
    configPath: configPath ?? undefined,
  };
}

async function parseViteConfig(configPath: string): Promise<string | null> {
  try {
    const configModule: unknown = await import(configPath);
    const config: unknown = (configModule as { default?: unknown }).default ?? configModule;

    if (isViteConfig(config)) {
      return config.build?.outDir ?? null;
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Failed to parse Vite config: ${errorMessage}`);
    return null;
  }
}
