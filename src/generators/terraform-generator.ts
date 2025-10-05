import path from 'path';
import Handlebars from 'handlebars';
import { readFile } from 'fs-extra';
import type { TerraformGenerationOptions, TerraformTemplateData } from '../types/terraform.js';
import { writeFileWithDirectory } from '../utils/file-system-helpers.js';
import { sanitizeProjectName } from '../utils/validation-helpers.js';
import { logger } from '../utils/cli-logger.js';

export async function generateTerraformFiles(
  options: TerraformGenerationOptions
): Promise<void> {
  const templateData = prepareTemplateData(options);

  logger.debug(`Generating Terraform files to: ${options.outputDir}`);

  await Promise.all([
    generateFile('main.tf.hbs', 'main.tf', templateData, options.outputDir),
    generateFile('variables.tf.hbs', 'variables.tf', templateData, options.outputDir),
    generateFile('outputs.tf.hbs', 'outputs.tf', templateData, options.outputDir),
    generateReadme(templateData, options.outputDir),
  ]);

  logger.success('Terraform files generated successfully!');
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
  outputDir: string
): Promise<void> {
  const templatePath = path.join(__dirname, '../templates', templateName);
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

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create:
  - S3 buckets
  - CloudFront distributions
  - IAM policies

## Usage

### Initialize Terraform

\`\`\`bash
terraform init
\`\`\`

### Review the plan

\`\`\`bash
terraform plan
\`\`\`

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

## Outputs

After applying, Terraform will output:
- S3 bucket name
- S3 bucket ARN
- CloudFront distribution ID
- CloudFront domain name

## Deployment

After infrastructure is created:

1. Build your application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Sync to S3:
   \`\`\`bash
   aws s3 sync ./${data.outputDirectory} s3://\${bucket_name}/ --delete
   \`\`\`

3. Invalidate CloudFront cache:
   \`\`\`bash
   aws cloudfront create-invalidation --distribution-id \${distribution_id} --paths "/*"
   \`\`\`
`;

  const readmePath = path.join(outputDir, 'README.md');
  await writeFileWithDirectory(readmePath, readme);
  logger.debug('Generated: README.md');
}
