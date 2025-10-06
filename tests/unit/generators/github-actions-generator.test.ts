import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import type { BuildToolConfig } from '../../../src/types/detector.js';
import type { PackageJson } from '../../../src/types/config.js';

// Mock fs/promises readFile for template loading
jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises') as typeof import('fs/promises');
  const readFileMock = jest.fn();
  
  (globalThis as any).__fsPromisesMocksGHActions = { 
    readFile: readFileMock,
    // Keep other functions from actual
    writeFile: actual.writeFile,
    mkdtemp: actual.mkdtemp,
    rm: actual.rm,
  };
  
  return {
    ...actual,
    readFile: readFileMock,
  };
});

jest.mock('../../../src/utils/file-system-helpers.js');

import {
  generateGitHubActionsWorkflow,
  generateGitHubActionsReadme,
  type GitHubActionsConfig,
} from '../../../src/generators/github-actions-generator.js';
import { writeFileWithDirectory } from '../../../src/utils/file-system-helpers.js';

const fsMock = (globalThis as any).__fsPromisesMocksGHActions as {
  readFile: jest.MockedFunction<typeof readFile>;
};

const mockWriteFileWithDirectory = writeFileWithDirectory as jest.MockedFunction<typeof writeFileWithDirectory>;

describe('GitHub Actions Generator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'github-actions-test-'));
    jest.clearAllMocks();
    
    // Setup default mock for template file reading
    fsMock.readFile.mockImplementation((async (path: any, encoding?: any) => {
      if (typeof path === 'string' && path.includes('github-actions-deploy.yml.hbs')) {
        return getMockWorkflowTemplate();
      }
      // For actual file reads in tests, use the real readFile
      const actual = jest.requireActual('fs/promises') as typeof import('fs/promises');
      return actual.readFile(path, encoding);
    }) as any);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function getMockWorkflowTemplate(): string {
    return '# GitHub Actions CI/CD Pipeline\n' +
'# For setup instructions and configuration details, see: DEPLOYMENT.md\n' +
'\n' +
'name: CI/CD Pipeline\n' +
'\n' +
'on:\n' +
'  push:\n' +
'    branches:\n' +
'      - main\n' +
'      - master\n' +
'  pull_request:\n' +
'    branches:\n' +
'      - main\n' +
'      - master\n' +
'\n' +
'permissions:\n' +
'  contents: read\n' +
'  id-token: write\n' +
'\n' +
'env:\n' +
'  NODE_VERSION: \'{{nodeVersion}}\'\n' +
'  AWS_REGION: {{awsRegion}}\n' +
'\n' +
'jobs:\n' +
'  ci:\n' +
'    name: Continuous Integration\n' +
'    runs-on: ubuntu-latest\n' +
'    \n' +
'    steps:\n' +
'      - name: Checkout code\n' +
'        uses: actions/checkout@v4\n' +
'\n' +
'      - name: Setup Node.js\n' +
'        uses: actions/setup-node@v4\n' +
'        with:\n' +
'          node-version: ${{ env.NODE_VERSION }}\n' +
'          cache: \'{{packageManager}}\'\n' +
'\n' +
'      {{#if isPnpm}}\n' +
'      - name: Install pnpm\n' +
'        uses: pnpm/action-setup@v4\n' +
'        with:\n' +
'          version: latest\n' +
'      {{/if}}\n' +
'\n' +
'      - name: Install dependencies\n' +
'        run: {{installCommand}}\n' +
'\n' +
'      {{#if hasTests}}\n' +
'      - name: Run linter\n' +
'        run: {{lintCommand}}\n' +
'\n' +
'      - name: Run tests\n' +
'        run: {{testCommand}}\n' +
'      {{/if}}\n' +
'\n' +
'      - name: Build application\n' +
'        run: {{buildCommand}}\n' +
'\n' +
'      - name: Upload build artifacts\n' +
'        uses: actions/upload-artifact@v4\n' +
'        with:\n' +
'          name: build-artifacts\n' +
'          path: {{outputDir}}\n' +
'\n' +
'  cd:\n' +
'    name: Continuous Deployment\n' +
'    needs: ci\n' +
'    runs-on: ubuntu-latest\n' +
'    if: github.event_name == \'push\'\n' +
'    \n' +
'    steps:\n' +
'      - name: Download build artifacts\n' +
'        uses: actions/download-artifact@v4\n' +
'\n' +
'      - name: Configure AWS credentials (OIDC - Recommended)\n' +
'        uses: aws-actions/configure-aws-credentials@v4\n' +
'        with:\n' +
'          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}\n' +
'\n' +
'      - name: Sync files to S3\n' +
'        run: |\n' +
'          aws s3 sync {{outputDir}} s3://${{ secrets.S3_BUCKET_NAME }} \\\n' +
'            --delete \\\n' +
'            --cache-control "public,max-age=31536000,immutable" \\\n' +
'            --exclude "*.html"\n' +
'          \n' +
'          aws s3 sync {{outputDir}} s3://${{ secrets.S3_BUCKET_NAME }} \\\n' +
'            --cache-control "public,max-age=0,must-revalidate" \\\n' +
'            --exclude "*" \\\n' +
'            --include "*.html"\n' +
'\n' +
'      - name: Invalidate CloudFront cache\n' +
'        run: |\n' +
'          aws cloudfront create-invalidation \\\n' +
'            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \\\n' +
'            --paths "/*"\n' +
'{{#if cloudfrontUrl}}\n' +
'      - name: Deployment URL\n' +
'        run: echo "https://{{cloudfrontUrl}}"\n' +
'{{/if}}\n';
  }

  const createMockConfig = (overrides?: Partial<GitHubActionsConfig>): GitHubActionsConfig => {
    const buildToolConfig: BuildToolConfig = {
      name: 'vite',
      outputDir: 'dist',
      configPath: 'vite.config.ts',
    };

    const packageJson: PackageJson = {
      name: 'test-app',
      version: '1.0.0',
      scripts: {
        build: 'vite build',
        test: 'jest',
        lint: 'eslint .',
      },
      devDependencies: {
        vite: '^5.0.0',
      },
    };

    return {
      projectName: 'test-app',
      outputDir: '.',
      buildToolConfig,
      packageJson,
      awsRegion: 'us-east-1',
      cloudfrontUrl: undefined,
      ...overrides,
    };
  };

  describe('generateGitHubActionsWorkflow', () => {
    it('should generate a workflow file with correct structure', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      expect(mockWriteFileWithDirectory).toHaveBeenCalledTimes(1);
      const [writtenPath, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(writtenPath).toContain('.github/workflows/deploy.yml');
      expect(content).toContain('name: CI/CD Pipeline');
      expect(content).toContain('jobs:');
      expect(content).toContain('ci:');
      expect(content).toContain('cd:');
    });

    it('should include CI steps for installing, testing, and building', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('Install dependencies');
      expect(content).toContain('Run linter');
      expect(content).toContain('Run tests');
      expect(content).toContain('Build application');
      expect(content).toContain('Upload build artifacts');
    });

    it('should include CD steps for deploying to S3 and invalidating CloudFront', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('Sync files to S3');
      expect(content).toContain('aws s3 sync');
      expect(content).toContain('Invalidate CloudFront cache');
      expect(content).toContain('aws cloudfront create-invalidation');
    });

    it('should detect pnpm as package manager', async () => {
      // Create pnpm-lock.yaml in the temp directory so detectPackageManager finds it
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');
      
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain("cache: 'pnpm'");
      expect(content).toContain('pnpm install --frozen-lockfile');
    });

    it('should use correct AWS region', async () => {
      const config = createMockConfig({ awsRegion: 'eu-west-1' });
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('AWS_REGION: eu-west-1');
    });

    it('should use correct output directory', async () => {
      const buildToolConfig: BuildToolConfig = {
        name: 'vite',
        outputDir: 'build',
        configPath: 'vite.config.ts',
      };

      const config = createMockConfig({ buildToolConfig });
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('path: build');
      expect(content).toContain('aws s3 sync build');
    });

    it('should include CloudFront URL when provided', async () => {
      const config = createMockConfig({ cloudfrontUrl: 'example.com' });
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('https://example.com');
    });

    it('should handle projects without test scripts', async () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        scripts: {
          build: 'vite build',
        },
      };

      const config = createMockConfig({ packageJson });
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      // Should still generate workflow but skip test steps
      expect(content).toContain('name: CI/CD Pipeline');
      expect(content).not.toContain('Run linter');
      expect(content).not.toContain('Run tests');
    });

    it('should configure OIDC authentication', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('id-token: write');
      expect(content).toContain('Configure AWS credentials (OIDC - Recommended)');
      expect(content).toContain('role-to-assume');
    });

    it('should implement smart cache strategy', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsWorkflow(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('max-age=31536000,immutable');
      expect(content).toContain('max-age=0,must-revalidate');
      expect(content).toContain('--exclude "*.html"');
    });
  });

  describe('generateGitHubActionsReadme', () => {
    it('should generate a DEPLOYMENT.md with setup instructions', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsReadme(config, tempDir);

      expect(mockWriteFileWithDirectory).toHaveBeenCalledTimes(1);
      const [writtenPath, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(writtenPath).toContain('DEPLOYMENT.md');
      expect(content).toContain('# Deployment Guide');
      expect(content).toContain('Required GitHub Secrets');
      expect(content).toContain('AWS_ROLE_ARN');
      expect(content).toContain('S3_BUCKET_NAME');
      expect(content).toContain('CLOUDFRONT_DISTRIBUTION_ID');
    });

    it('should include OIDC setup instructions', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsReadme(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('Setting Up AWS OIDC');
      expect(content).toContain('create-open-id-connect-provider');
      expect(content).toContain('token.actions.githubusercontent.com');
    });

    it('should include troubleshooting section', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsReadme(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('Troubleshooting');
      expect(content).toContain('Access Denied');
      expect(content).toContain('Build artifacts not found');
    });

    it('should include project-specific configuration', async () => {
      const config = createMockConfig({
        projectName: 'my-awesome-app',
        awsRegion: 'ap-southeast-1',
      });
      
      await generateGitHubActionsReadme(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('my-awesome-app');
      expect(content).toContain('ap-southeast-1');
    });

    it('should document the cache strategy', async () => {
      const config = createMockConfig();
      
      await generateGitHubActionsReadme(config, tempDir);

      const [, content] = mockWriteFileWithDirectory.mock.calls[0];

      expect(content).toContain('Cache Strategy');
      expect(content).toContain('max-age=31536000');
      expect(content).toContain('max-age=0, must-revalidate');
    });
  });
});

