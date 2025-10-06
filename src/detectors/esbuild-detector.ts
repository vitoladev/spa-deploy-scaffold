import path from 'path';
import { logger } from '../utils/cli-logger.js';
import { findConfigFile } from '../utils/file-system-helpers.js';
import { isEsbuildConfig } from '../utils/validation-helpers.js';
import type { PackageJson } from '../types/config.js';
import type { BuildToolConfig } from '../types/detector.js';

const DEFAULT_OUTPUT_DIR = 'dist';

export async function detectEsbuild(
  projectPath: string,
  packageJson: PackageJson
): Promise<BuildToolConfig | null> {
  const hasEsbuild =
    packageJson.devDependencies?.esbuild !== undefined ||
    packageJson.dependencies?.esbuild !== undefined;

  if (!hasEsbuild) {
    return null;
  }

  logger.debug('esbuild detected in dependencies');

  const configPath = await findConfigFile(projectPath, 'esbuild.config', [
    '.ts',
    '.js',
    '.mjs',
  ]);

  let outputDir = DEFAULT_OUTPUT_DIR;

  if (configPath) {
    logger.debug(`Found esbuild config: ${configPath}`);
    outputDir = await parseEsbuildConfig(configPath) ?? DEFAULT_OUTPUT_DIR;
  } else {
    outputDir = parseEsbuildFromScript(packageJson) ?? DEFAULT_OUTPUT_DIR;
  }

  return {
    name: 'esbuild',
    outputDir,
    configPath: configPath ?? undefined,
  };
}

async function parseEsbuildConfig(configPath: string): Promise<string | null> {
  try {
    const configModule: unknown = await import(configPath);
    const config: unknown = (configModule as { default?: unknown }).default ?? configModule;

    if (isEsbuildConfig(config)) {
      return config.outdir ?? extractDirectoryFromFilePath(config.outfile);
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(`Failed to parse esbuild config: ${errorMessage}`);
    return null;
  }
}

function parseEsbuildFromScript(packageJson: PackageJson): string | null {
  const buildScript = packageJson.scripts?.build;

  if (!buildScript || typeof buildScript !== 'string' || !buildScript.includes('esbuild')) {
    return null;
  }

  const outdirMatch = buildScript.match(/--outdir[=\s]+([^\s]+)/);
  if (outdirMatch) {
    return outdirMatch[1];
  }

  return null;
}

function extractDirectoryFromFilePath(filePath: string | undefined): string | null {
  if (!filePath) {
    return null;
  }
  return path.dirname(filePath);
}
