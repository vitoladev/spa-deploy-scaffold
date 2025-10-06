import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { writeFileWithDirectory } from '../utils/file-system-helpers.js';
import type { PackageJson } from '../types/config.js';
import type { BuildToolConfig } from '../types/detector.js';

export interface GitHubActionsConfig {
  projectName: string;
  outputDir: string;
  buildToolConfig: BuildToolConfig;
  packageJson: PackageJson;
  awsRegion: string;
  cloudfrontUrl?: string;
}

interface TemplateContext {
  nodeVersion: string;
  packageManager: string;
  isPnpm: boolean;
  isNpm: boolean;
  isYarn: boolean;
  installCommand: string;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
  hasTests: boolean;
  outputDir: string;
  awsRegion: string;
  cloudfrontUrl?: string;
}

/**
 * Detects the package manager from the project
 */
function detectPackageManager(projectPath: string): 'pnpm' | 'npm' | 'yarn' {
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

/**
 * Gets the appropriate install command for the package manager
 */
function getInstallCommand(packageManager: string): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm install --frozen-lockfile';
    case 'yarn':
      return 'yarn install --frozen-lockfile';
    default:
      return 'npm ci';
  }
}

/**
 * Gets the appropriate run command for the package manager
 */
function getRunCommand(packageManager: string, script: string): string {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    default:
      return `npm run ${script}`;
  }
}

/**
 * Detects Node.js version from package.json engines field or uses a default
 */
function detectNodeVersion(packageJson: PackageJson): string {
  // Try to extract from engines.node
  const packageJsonWithEngines = packageJson as PackageJson & { 
    engines?: { node?: string } 
  };
  const engines = packageJsonWithEngines.engines;
  
  if (engines?.node) {
    const nodeVersion = engines.node;
    // Extract numeric version if present (e.g., ">=18.0.0" -> "18")
    const match = nodeVersion.match(/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  // Default to LTS version
  return '20';
}

/**
 * Checks if the project has test scripts
 */
function hasTestScripts(packageJson: PackageJson): boolean {
  return !!(packageJson.scripts?.test || packageJson.scripts?.['test:ci']);
}

/**
 * Generates the GitHub Actions workflow file
 */
export async function generateGitHubActionsWorkflow(
  config: GitHubActionsConfig,
  projectPath: string = process.cwd()
): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const templatePath = join(currentDir, '../templates/github-actions-deploy.yml.hbs');
  const templateContent = await readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);

  const packageManager = detectPackageManager(projectPath);
  const nodeVersion = detectNodeVersion(config.packageJson);
  const hasTests = hasTestScripts(config.packageJson);

  // Get appropriate commands based on package manager and available scripts
  const installCommand = getInstallCommand(packageManager);
  const buildCommand = config.packageJson.scripts?.build 
    ? getRunCommand(packageManager, 'build')
    : 'echo "No build command found"';
  const testCommand = config.packageJson.scripts?.test
    ? getRunCommand(packageManager, 'test')
    : config.packageJson.scripts?.['test:ci']
    ? getRunCommand(packageManager, 'test:ci')
    : 'echo "No test command found"';
  const lintCommand = config.packageJson.scripts?.lint
    ? getRunCommand(packageManager, 'lint')
    : 'echo "No lint command found"';

  const templateContext: TemplateContext = {
    nodeVersion,
    packageManager,
    isPnpm: packageManager === 'pnpm',
    isNpm: packageManager === 'npm',
    isYarn: packageManager === 'yarn',
    installCommand,
    buildCommand,
    testCommand,
    lintCommand,
    hasTests,
    outputDir: config.buildToolConfig.outputDir,
    awsRegion: config.awsRegion,
    cloudfrontUrl: config.cloudfrontUrl,
  };

  const workflowContent = template(templateContext);

  // Create .github/workflows directory
  const workflowPath = join(projectPath, '.github', 'workflows', 'deploy.yml');

  await writeFileWithDirectory(workflowPath, workflowContent);
}

/**
 * Generates a comprehensive deployment guide with setup instructions for GitHub Actions
 */
export async function generateGitHubActionsReadme(
  config: GitHubActionsConfig,
  projectPath: string = process.cwd()
): Promise<string> {
  const readmePath = join(projectPath, 'DEPLOYMENT.md');
  
  const readmeContent = `# Deployment Guide - GitHub Actions CI/CD

This guide contains setup instructions for the GitHub Actions workflow that automates deployment of **${config.projectName}** to AWS CloudFront + S3.

> **Workflow Location**: \`.github/workflows/deploy.yml\`

## 🔧 Required GitHub Secrets

Before the workflow can run successfully, you need to configure the following secrets in your GitHub repository:

### AWS Authentication (Choose One Method)

#### Option 1: OIDC (Recommended - More Secure)
- \`AWS_ROLE_ARN\`: The ARN of the IAM role that GitHub Actions will assume
  - Example: \`arn:aws:iam::123456789012:role/GitHubActionsDeployRole\`
  - This role should have permissions to:
    - Write to S3 bucket
    - Create CloudFront invalidations

#### Option 2: Static Credentials (Less Secure)
If you prefer to use static credentials, update the workflow file and set:
- \`AWS_ACCESS_KEY_ID\`: AWS access key ID
- \`AWS_SECRET_ACCESS_KEY\`: AWS secret access key

### Deployment Configuration
- \`S3_BUCKET_NAME\`: The name of your S3 bucket
  - This will be output after running \`terraform apply\`
- \`CLOUDFRONT_DISTRIBUTION_ID\`: The CloudFront distribution ID
  - This will be output after running \`terraform apply\`

## 📝 How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret listed above

## 🚀 Workflow Triggers

The workflow automatically runs on:
- **Push** to \`main\` or \`master\` branches (triggers full CI/CD)
- **Pull requests** to \`main\` or \`master\` branches (runs CI only)

## 🔐 Setting Up AWS OIDC (Recommended)

To use OIDC authentication with AWS (more secure than static credentials):

### 1. Create an OIDC Identity Provider in AWS

\`\`\`bash
aws iam create-open-id-connect-provider \\
  --url https://token.actions.githubusercontent.com \\
  --client-id-list sts.amazonaws.com \\
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
\`\`\`

### 2. Create an IAM Role

Create a file named \`github-actions-trust-policy.json\`:

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
\`\`\`

Create the role:

\`\`\`bash
aws iam create-role \\
  --role-name GitHubActionsDeployRole \\
  --assume-role-policy-document file://github-actions-trust-policy.json
\`\`\`

### 3. Attach Permissions Policy

Create a file named \`deploy-permissions.json\`:

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/*"
    }
  ]
}
\`\`\`

Attach the policy:

\`\`\`bash
aws iam put-role-policy \\
  --role-name GitHubActionsDeployRole \\
  --policy-name DeployPolicy \\
  --policy-document file://deploy-permissions.json
\`\`\`

## 📦 Build Configuration

- **Build Tool**: ${config.buildToolConfig.name}
- **Output Directory**: \`${config.buildToolConfig.outputDir}\`
- **AWS Region**: ${config.awsRegion}

## 🔄 Workflow Jobs

### CI (Continuous Integration)
Runs on every push and pull request:
- ✅ Checkout code
- ✅ Setup Node.js with dependency caching
- ✅ Install dependencies
${hasTestScripts(config.packageJson) ? '- ✅ Run linter\n- ✅ Run tests' : ''}
- ✅ Build application
- ✅ Upload build artifacts

### CD (Continuous Deployment)
Runs only on pushes to main/master branch:
- ✅ Download build artifacts
- ✅ Configure AWS credentials
- ✅ Sync files to S3 with optimized cache headers
- ✅ Invalidate CloudFront cache
- ✅ Generate deployment summary

## 🎯 Cache Strategy

The workflow implements smart caching:
- Static assets (JS, CSS, images): \`max-age=31536000\` (1 year) with immutable flag
- HTML files: \`max-age=0, must-revalidate\` (always check for updates)

## 📊 Monitoring

After each deployment:
- Check the **Actions** tab in GitHub for workflow status
- View deployment summary in the workflow run
- Check CloudFront for cache invalidation status

## 🐛 Troubleshooting

### Deployment fails with "Access Denied"
- Verify AWS credentials/role are configured correctly
- Check IAM role has necessary S3 and CloudFront permissions
- Ensure S3 bucket name and CloudFront distribution ID are correct

### Build artifacts not found
- Check if the build command completes successfully
- Verify the output directory path matches your build tool configuration

### Cache invalidation fails
- Verify CloudFront distribution ID is correct
- Check IAM role has \`cloudfront:CreateInvalidation\` permission

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS OIDC Configuration](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS S3 Sync Command](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
`;

  await writeFileWithDirectory(readmePath, readmeContent);
  return readmePath;
}

