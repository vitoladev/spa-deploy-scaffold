import path from 'path';
import { pathExists, readJSON, ensureDir, writeFile } from 'fs-extra';
import { FileNotFoundError, ConfigParseError } from '../errors/scaffold-errors.js';
import { PackageJsonSchema, type PackageJson } from '../types/config.js';

export async function readPackageJson(projectPath: string): Promise<PackageJson> {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!(await pathExists(packageJsonPath))) {
    throw new FileNotFoundError(packageJsonPath);
  }

  try {
    const data = await readJSON(packageJsonPath);
    const result = PackageJsonSchema.safeParse(data);

    if (!result.success) {
      throw new ConfigParseError(packageJsonPath, result.error);
    }

    return result.data;
  } catch (error) {
    if (error instanceof FileNotFoundError || error instanceof ConfigParseError) {
      throw error;
    }
    throw new ConfigParseError(packageJsonPath, error);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  return pathExists(filePath);
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await ensureDir(dirPath);
}

export async function writeFileWithDirectory(
  filePath: string,
  content: string
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf-8');
}

export async function findConfigFile(
  projectPath: string,
  baseName: string,
  extensions: string[]
): Promise<string | null> {
  for (const ext of extensions) {
    const configPath = path.join(projectPath, `${baseName}${ext}`);
    if (await pathExists(configPath)) {
      return configPath;
    }
  }
  return null;
}
