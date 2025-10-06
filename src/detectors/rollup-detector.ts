import path from 'path';
import { logger } from '../utils/cli-logger.js';
import { findConfigFile } from '../utils/file-system-helpers.js';
import { isRollupConfig } from '../utils/validation-helpers.js';
import type { PackageJson } from '../types/config.js';
import type { BuildToolConfig } from '../types/detector.js';

const DEFAULT_OUTPUT_DIR = 'dist';

export async function detectRollup(
  projectPath: string,
  packageJson: PackageJson
): Promise<BuildToolConfig | null> {
  const hasRollup =
    packageJson.devDependencies?.rollup !== undefined ||
    packageJson.dependencies?.rollup !== undefined;

  if (!hasRollup) {
    return null;
  }

  logger.debug('Rollup detected in dependencies');

  const configPath = await findConfigFile(projectPath, 'rollup.config', [
    '.ts',
    '.js',
    '.mjs',
  ]);

  let outputDir = DEFAULT_OUTPUT_DIR;

  if (configPath) {
    logger.debug(`Found Rollup config: ${configPath}`);
    outputDir = await parseRollupConfig(configPath) ?? DEFAULT_OUTPUT_DIR;
  }

  return {
    name: 'rollup',
    outputDir,
    configPath: configPath ?? undefined,
  };
}

async function parseRollupConfig(configPath: string): Promise<string | null> {
  try {
    const configModule: unknown = await import(configPath);
    const config: unknown = (configModule as { default?: unknown }).default ?? configModule;

    if (isRollupConfig(config)) {
      const output = config.output;

      if (Array.isArray(output)) {
        return output[0]?.dir ?? extractDirectoryFromFilePath(output[0]?.file);
      }

      return output?.dir ?? extractDirectoryFromFilePath(output?.file);
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Failed to parse Rollup config: ${errorMessage}`);
    return null;
  }
}

function extractDirectoryFromFilePath(filePath: string | undefined): string | null {
  if (!filePath) {
    return null;
  }
  return path.dirname(filePath);
}
