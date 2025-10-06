import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  readPackageJson,
  fileExists,
  ensureDirectory,
  writeFileWithDirectory,
  findConfigFile,
} from '../../../src/utils/file-system-helpers.js';
import { FileNotFoundError, ConfigParseError } from '../../../src/errors/scaffold-errors.js';

// Mock fs-extra - create mocks in the factory to avoid hoisting issues
jest.mock('fs-extra', () => {
  // Create mocks inside factory to avoid hoisting issues
  const pathExists = jest.fn();
  const readJSON = jest.fn();
  const ensureDir = jest.fn();
  const writeFile = jest.fn();
  
  // Save references for test access
  (globalThis as any).__fsMocks = { pathExists, readJSON, ensureDir, writeFile };
  
  return {
    __esModule: true,
    default: {
      pathExists,
      readJSON,
      ensureDir,
      writeFile,
    },
    pathExists,
    readJSON,
    ensureDir,
    writeFile,
  };
});

// Get the mocked functions from global
const fsMock = (globalThis as any).__fsMocks as {
  pathExists: jest.MockedFunction<(path: string) => Promise<boolean>>;
  readJSON: jest.MockedFunction<(file: string) => Promise<unknown>>;
  ensureDir: jest.MockedFunction<(dir: string) => Promise<void>>;
  writeFile: jest.MockedFunction<(file: string, data: string, encoding: string) => Promise<void>>;
};

describe('FileSystemHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readPackageJson', () => {
    it('should read and validate package.json', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      fsMock.pathExists.mockResolvedValue(true);
      fsMock.readJSON.mockResolvedValue(mockPackageJson);

      const result = await readPackageJson('/fake/path');

      expect(result).toEqual(mockPackageJson);
      expect(fsMock.pathExists).toHaveBeenCalledWith('/fake/path/package.json');
    });

    it('should throw FileNotFoundError if package.json does not exist', async () => {
      fsMock.pathExists.mockResolvedValue(false);

      await expect(readPackageJson('/fake/path')).rejects.toThrow(FileNotFoundError);
    });

    it('should throw ConfigParseError if package.json is invalid', async () => {
      fsMock.pathExists.mockResolvedValue(true);
      fsMock.readJSON.mockResolvedValue({
        // Missing required fields
      });

      await expect(readPackageJson('/fake/path')).rejects.toThrow(ConfigParseError);
    });

    it('should throw ConfigParseError if readJSON fails', async () => {
      fsMock.pathExists.mockResolvedValue(true);
      fsMock.readJSON.mockRejectedValue(
        new Error('Read failed')
      );

      await expect(readPackageJson('/fake/path')).rejects.toThrow(ConfigParseError);
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      fsMock.pathExists.mockResolvedValue(true);

      const result = await fileExists('/fake/path/file.txt');

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      fsMock.pathExists.mockResolvedValue(false);

      const result = await fileExists('/fake/path/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    it('should ensure directory exists', async () => {
      fsMock.ensureDir.mockResolvedValue(undefined);

      await ensureDirectory('/fake/path/dir');

      expect(fsMock.ensureDir).toHaveBeenCalledWith('/fake/path/dir');
    });
  });

  describe('writeFileWithDirectory', () => {
    it('should ensure directory and write file', async () => {
      fsMock.ensureDir.mockResolvedValue(undefined);
      fsMock.writeFile.mockResolvedValue(undefined);

      await writeFileWithDirectory('/fake/path/dir/file.txt', 'content');

      expect(fsMock.ensureDir).toHaveBeenCalledWith('/fake/path/dir');
      expect(fsMock.writeFile).toHaveBeenCalledWith('/fake/path/dir/file.txt', 'content', 'utf-8');
    });
  });

  describe('findConfigFile', () => {
    it('should find config file with first matching extension', async () => {
      fsMock.pathExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await findConfigFile('/fake/path', 'vite.config', ['.ts', '.js']);

      expect(result).toBe('/fake/path/vite.config.js');
    });

    it('should return null if no config file found', async () => {
      fsMock.pathExists.mockResolvedValue(false);

      const result = await findConfigFile('/fake/path', 'vite.config', ['.ts', '.js', '.mjs']);

      expect(result).toBeNull();
    });

    it('should check all extensions in order', async () => {
      fsMock.pathExists.mockResolvedValue(false);

      await findConfigFile('/fake/path', 'config', ['.ts', '.js', '.mjs']);

      expect(fsMock.pathExists).toHaveBeenCalledTimes(3);
      expect(fsMock.pathExists).toHaveBeenNthCalledWith(1, '/fake/path/config.ts');
      expect(fsMock.pathExists).toHaveBeenNthCalledWith(2, '/fake/path/config.js');
      expect(fsMock.pathExists).toHaveBeenNthCalledWith(3, '/fake/path/config.mjs');
    });
  });
});
