import path from 'path';
import { SecurityError } from '../errors/scaffold-errors.js';

export function validateOutputPath(outputPath: string, projectRoot: string): string {
  const resolved = path.resolve(projectRoot, outputPath);

  if (!resolved.startsWith(projectRoot)) {
    throw new SecurityError(
      'Output path must be within project directory. Path traversal detected.'
    );
  }

  return resolved;
}

export function isViteConfig(config: unknown): config is { build?: { outDir?: string } } {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('build' in config || Object.keys(config).length === 0)
  );
}

export function isRollupConfig(config: unknown): config is {
  output?: { dir?: string; file?: string } | Array<{ dir?: string; file?: string }>;
} {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('output' in config || Object.keys(config).length === 0)
  );
}

export function isEsbuildConfig(config: unknown): config is {
  outdir?: string;
  outfile?: string;
} {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('outdir' in config || 'outfile' in config || Object.keys(config).length === 0)
  );
}

export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);
}
