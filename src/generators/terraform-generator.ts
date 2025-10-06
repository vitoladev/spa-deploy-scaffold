import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import { logger } from '../utils/cli-logger.js';
import { writeFileWithDirectory } from '../utils/file-system-helpers.js';
import { sanitizeProjectName } from '../utils/validation-helpers.js';
import type { TerraformGenerationOptions, TerraformTemplateData } from '../types/terraform.js';

const { readFile } = fs;

// Helper function that can be mocked in tests
export function getDefaultTemplatesDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDir, '../templates');
}

export async function generateTerraformFiles(
  options: TerraformGenerationOptions
): Promise<void> {
  const templatesDir = options.templatesDir ?? getDefaultTemplatesDir();
  const templateData = prepareTemplateData(options);

  logger.debug(`Generating Terraform files to: ${options.outputDir}`);

  const modulesDir = path.join(options.outputDir, 'modules', 'cloudfront-s3');

  await Promise.all([
    // Root Terraform files
    generateFile('main.tf.hbs', 'main.tf', templateData, options.outputDir, templatesDir),
    generateFile('variables.tf.hbs', 'variables.tf', templateData, options.outputDir, templatesDir),
    generateFile('outputs.tf.hbs', 'outputs.tf', templateData, options.outputDir, templatesDir),
    generateFile('terraform.tfvars.hbs', 'terraform.tfvars', templateData, options.outputDir, templatesDir),
    generateReadme(templateData, options.outputDir),
    
    // CloudFront + S3 Module files
    generateFile(
      'modules/cloudfront-s3/main.tf.hbs',
      'main.tf',
      templateData,
      modulesDir,
      templatesDir
    ),
    generateFile(
      'modules/cloudfront-s3/variables.tf.hbs',
      'variables.tf',
      templateData,
      modulesDir,
      templatesDir
    ),
    generateFile(
      'modules/cloudfront-s3/outputs.tf.hbs',
      'outputs.tf',
      templateData,
      modulesDir,
      templatesDir
    ),
  ]);

  logger.debug('All Terraform files generated');
}

function prepareTemplateData(options: TerraformGenerationOptions): TerraformTemplateData {
  return {
    projectName: sanitizeProjectName(options.projectName),
    environment: options.environment ?? 'production',
    awsRegion: options.awsRegion,
    outputDirectory: options.buildToolConfig.outputDir,
    buildTool: options.buildToolConfig.name,
    domainName: options.domainName,
    certificateArn: options.certificateArn,
    priceClass: options.priceClass ?? 'PriceClass_100',
    timestamp: new Date().toISOString(),
  };
}

async function generateFile(
  templateName: string,
  outputName: string,
  data: TerraformTemplateData,
  outputDir: string,
  templatesDir: string
): Promise<void> {
  const templatePath = path.join(templatesDir, templateName);
  const outputPath = path.join(outputDir, outputName);

  const templateContent = await readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);
  const output = template(data);

  await writeFileWithDirectory(outputPath, output);
  logger.debug(`Generated: ${outputName}`);
}

async function generateReadme(
  data: TerraformTemplateData,
  outputDir: string
): Promise<void> {
  const readme = `# Terraform Configuration for ${data.projectName}

Generated on: ${data.timestamp}
Build Tool: ${data.buildTool}
Output Directory: ${data.outputDirectory}

## Architecture

This configuration uses a modular structure:

- **Root Module**: Orchestrates all infrastructure components
- **CloudFront + S3 Module** (\`modules/cloudfront-s3\`): Manages static site hosting with CloudFront CDN and S3 storage

This modular design allows for easy expansion in the future, such as:
- Adding backend services (ECS, Lambda, etc.)
- Integrating WAF for security
- Adding custom CloudWatch alarms
- Setting up CI/CD pipelines

## Prerequisites

- **Terraform >= 1.0** - [Installation guide](https://developer.hashicorp.com/terraform/downloads)
- **AWS CLI >= 2.0** - [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  - Required for deploying built files to S3 and invalidating CloudFront cache
  - Must be configured with credentials: \`aws configure\`
  - If using multiple AWS accounts, set up named profiles: \`aws configure --profile my-profile\`
- **AWS account** with permissions to create:
  - S3 buckets
  - CloudFront distributions
  - IAM policies

## ⚠️ Important: Terraform State Management

**This initial configuration uses local state storage**, which is fine for getting started and testing. However, for production use or team collaboration, you should migrate to a remote backend like S3.

### Why use a remote backend?

- **Team collaboration**: Multiple team members can work on the same infrastructure
- **State locking**: Prevents concurrent modifications that could corrupt your state
- **Backup and versioning**: Your state file is safely stored and versioned
- **Security**: Sensitive data in state files is better protected

### Recommended: Upgrade to S3 backend

After your initial setup, add this to your \`main.tf\`:

\`\`\`hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "${data.projectName}/terraform.tfstate"
    region         = "${data.awsRegion}"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
\`\`\`

Then run:
\`\`\`bash
terraform init -migrate-state
\`\`\`

See [Terraform Backend Documentation](https://developer.hashicorp.com/terraform/language/settings/backends/s3) for detailed setup instructions.

## Usage

### Configure Variables (Optional)

Review and customize the \`terraform.tfvars\` file with your settings:
- AWS region
- AWS CLI profile (optional - see below)
- Environment name
- CloudFront price class
- Custom domain settings (if applicable)

This file has been pre-populated with your configuration, but you can modify any values as needed.
Terraform will automatically load this file when you run \`plan\` or \`apply\`.

#### Working with Multiple AWS Accounts

If you manage multiple AWS accounts or need to use a specific AWS CLI profile, uncomment and set the \`aws_profile\` variable in \`terraform.tfvars\`:

\`\`\`hcl
aws_profile = "my-aws-profile"
\`\`\`

To set up AWS CLI profiles:
\`\`\`bash
# Configure a named profile
aws configure --profile my-profile

# Verify the profile works
aws s3 ls --profile my-profile
\`\`\`

If \`aws_profile\` is not set (or set to \`null\`), Terraform will use your default AWS CLI credentials.

### Initialize Terraform

\`\`\`bash
terraform init
\`\`\`

### Review the plan

\`\`\`bash
terraform plan
\`\`\`

Terraform will automatically use the values from \`terraform.tfvars\`.

### Apply the configuration

\`\`\`bash
terraform apply
\`\`\`

### Destroy the infrastructure

\`\`\`bash
terraform destroy
\`\`\`

## Variables

See \`variables.tf\` for all available variables and their defaults.
Edit \`terraform.tfvars\` to customize values for your deployment.

Key variables:
- \`environment\`: Environment name (default: ${data.environment})
- \`aws_region\`: AWS region (default: ${data.awsRegion})
- \`aws_profile\`: AWS CLI profile to use (default: null - uses default profile)
- \`price_class\`: CloudFront price class (default: ${data.priceClass})
- \`enable_versioning\`: Enable S3 versioning (default: true)

## Modules

### CloudFront + S3 Module

Located in \`modules/cloudfront-s3/\`, this module creates:
- S3 bucket with versioning and private access
- CloudFront distribution with Origin Access Identity
- Bucket policy allowing CloudFront access only
- Custom error responses for SPA routing

## Outputs

After applying, Terraform will output:
- S3 bucket name and ARN
- CloudFront distribution ID and domain name
- Deployment commands (copy/paste ready!)

## Deployment Workflow

After infrastructure is created:

1. Build your application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy to S3 (use the \`deployment_command\` output):
   \`\`\`bash
   aws s3 sync ./${data.outputDirectory} s3://\${bucket_name}/ --delete
   \`\`\`

3. Invalidate CloudFront cache (use the \`cache_invalidation_command\` output):
   \`\`\`bash
   aws cloudfront create-invalidation --distribution-id \${distribution_id} --paths "/*"
   \`\`\`

**Note:** If you configured a specific AWS profile in Terraform, add \`--profile your-profile-name\` to the AWS CLI commands above:
\`\`\`bash
aws s3 sync ./${data.outputDirectory} s3://\${bucket_name}/ --delete --profile my-profile
aws cloudfront create-invalidation --distribution-id \${distribution_id} --paths "/*" --profile my-profile
\`\`\`

## Extending the Configuration

To add more infrastructure (e.g., backend services, WAF):

1. Create a new module in \`modules/\`
2. Add module call in \`main.tf\`
3. Add required variables in \`variables.tf\`
4. Expose outputs in \`outputs.tf\`

Example:
\`\`\`hcl
module "backend" {
  source = "./modules/ecs-backend"
  
  # ... configuration
}
\`\`\`
`;

  const readmePath = path.join(outputDir, 'README.md');
  await writeFileWithDirectory(readmePath, readme);
  logger.debug('Generated: README.md');
}
