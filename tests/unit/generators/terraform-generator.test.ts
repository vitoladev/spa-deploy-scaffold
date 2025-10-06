import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { writeFileWithDirectory } from '../../../src/utils/file-system-helpers.js';
import type { TerraformGenerationOptions } from '../../../src/types/terraform.js';

// Mock fs-extra - create mocks in the factory to avoid hoisting issues
jest.mock('fs-extra', () => {
  // Create mocks inside factory to avoid hoisting issues
  const readFile = jest.fn();
  
  // Save reference for test access
  (globalThis as any).__fsMocksGenerator = { readFile };
  
  return {
    __esModule: true,
    default: {
      readFile,
    },
    readFile,
  };
});
jest.mock('../../../src/utils/file-system-helpers.js');
jest.mock('../../../src/utils/cli-logger.js', () => ({
  logger: {
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

import { generateTerraformFiles } from '../../../src/generators/terraform-generator.js';

// Get the mocked functions from global
const fsMock = (globalThis as any).__fsMocksGenerator as {
  readFile: jest.MockedFunction<(path: string, encoding: string) => Promise<string>>;
};

describe('TerraformGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTerraformFiles', () => {
    const mockOptions: TerraformGenerationOptions = {
      projectName: 'test-project',
      outputDir: '/fake/output',
      buildToolConfig: {
        name: 'vite',
        outputDir: 'dist',
      },
      awsRegion: 'us-east-1',
      environment: 'production',
      // Using default templatesDir (will use import.meta.url transformed by Jest)
    };

    beforeEach(() => {
      fsMock.readFile.mockResolvedValue('Template content {{projectName}}');
      (writeFileWithDirectory as jest.MockedFunction<typeof writeFileWithDirectory>).mockResolvedValue(
        undefined as never
      );
    });

    it('should generate all Terraform files including module files', async () => {
      await generateTerraformFiles(mockOptions);

      expect(writeFileWithDirectory).toHaveBeenCalledTimes(7);
      
      // Root files
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/main.tf',
        expect.any(String)
      );
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/variables.tf',
        expect.any(String)
      );
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/outputs.tf',
        expect.any(String)
      );
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/README.md',
        expect.any(String)
      );
      
      // Module files
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/modules/cloudfront-s3/main.tf',
        expect.any(String)
      );
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/modules/cloudfront-s3/variables.tf',
        expect.any(String)
      );
      expect(writeFileWithDirectory).toHaveBeenCalledWith(
        '/fake/output/modules/cloudfront-s3/outputs.tf',
        expect.any(String)
      );
    });

    it('should sanitize project name', async () => {
      const options = {
        ...mockOptions,
        projectName: 'My Project @123',
      };

      await generateTerraformFiles(options);

      const calls = (writeFileWithDirectory as jest.MockedFunction<typeof writeFileWithDirectory>)
        .mock.calls;
      const mainTfContent = calls[0][1];

      expect(mainTfContent).toContain('my-project-123');
    });

    it('should include domain configuration when provided', async () => {
      const options = {
        ...mockOptions,
        domainName: 'example.com',
        certificateArn: 'arn:aws:acm:...',
      };

      await generateTerraformFiles(options);

      // Verify templates were read
      expect(fsMock.readFile).toHaveBeenCalled();
    });

    it('should use default values when optional fields not provided', async () => {
      const minimalOptions: TerraformGenerationOptions = {
        projectName: 'test',
        outputDir: '/output',
        buildToolConfig: {
          name: 'vite',
          outputDir: 'dist',
        },
        awsRegion: 'us-east-1',
        // templatesDir omitted to test default behavior
      };

      await generateTerraformFiles(minimalOptions);

      expect(writeFileWithDirectory).toHaveBeenCalledTimes(7);
    });

    it('should generate README with correct content', async () => {
      await generateTerraformFiles(mockOptions);

      const readmeCall = (writeFileWithDirectory as jest.MockedFunction<typeof writeFileWithDirectory>)
        .mock.calls.find((call) => call[0].endsWith('README.md'));

      expect(readmeCall).toBeDefined();
      expect(readmeCall![1]).toContain('test-project');
      expect(readmeCall![1]).toContain('vite');
      expect(readmeCall![1]).toContain('dist');
      expect(readmeCall![1]).toContain('modular structure');
      expect(readmeCall![1]).toContain('modules/cloudfront-s3');
    });
  });
});
