#!/usr/bin/env node

import { input, select, confirm } from '@inquirer/prompts';
import { Command } from 'commander';
import { detectBuildTool } from './detectors/build-tool-orchestrator.js';
import { generateGitHubActionsWorkflow, generateGitHubActionsReadme } from './generators/github-actions-generator.js';
import { generateTerraformFiles } from './generators/terraform-generator.js';
import { CLIOptionsSchema } from './types/config.js';
import { Logger } from './utils/cli-logger.js';
import { readPackageJson } from './utils/file-system-helpers.js';
import { validateOutputPath } from './utils/validation-helpers.js';

const logger = new Logger();

interface CommandOptions {
    projectName?: string;
    output?: string;
    region?: string;
    domain?: string;
    certArn?: string;
    yes?: boolean;
    githubActions?: boolean;
}

const program = new Command();

program
    .name('spa-deploy-scaffold')
    .description('Generate Terraform for AWS CloudFront + S3 deployment')
    .version('1.0.0');

program
    .command('generate')
    .description('Generate Terraform configuration files')
    .option('--tool <type>', 'Build tool (vite|rollup|esbuild)')
    .option('--project-name <name>', 'Project name')
    .option('--output <path>', 'Output directory', './terraform')
    .option('--region <region>', 'AWS region', 'us-east-1')
    .option('--domain <domain>', 'Custom domain name')
    .option('--cert-arn <arn>', 'ACM certificate ARN')
    .option('--github-actions', 'Generate GitHub Actions workflow', false)
    .option('--yes', 'Skip confirmation prompts', false)
    .action(async (options: CommandOptions) => {
        try {
            await generateCommand(options);
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

program
    .command('detect')
    .description('Detect build tool configuration')
    .action(async () => {
        try {
            await detectCommand();
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

async function generateCommand(options: CommandOptions): Promise<void> {
    const projectPath = process.cwd();

    logger.info('Analyzing project...');

    const packageJson = await logger.withSpinner(
        'Reading package.json',
        () => readPackageJson(projectPath)
    );

    const buildToolConfig = await logger.withSpinner(
        'Detecting build tool',
        () => detectBuildTool(projectPath, packageJson)
    );

    logger.success(
        `Detected ${logger.highlight(buildToolConfig.name)} with output directory: ${logger.highlight(buildToolConfig.outputDir)}`
    );

    let finalOptions = {
        projectName: options.projectName ?? packageJson.name,
        output: options.output ?? './terraform',
        region: options.region ?? 'us-east-1',
        domain: options.domain,
        certArn: options.certArn,
    };

    if (!options.yes) {
        const projectName = await input({
            message: 'Project name:',
            default: finalOptions.projectName,
            validate: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name is required';
                }
                return true;
            },
        });

        const output = await input({
            message: 'Terraform output directory:',
            default: finalOptions.output,
            validate: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'Output directory is required';
                }
                return true;
            },
        });

        const region = await select({
            message: 'AWS region:',
            choices: [
                { name: 'US East (N. Virginia) - us-east-1', value: 'us-east-1' },
                { name: 'US East (Ohio) - us-east-2', value: 'us-east-2' },
                { name: 'US West (N. California) - us-west-1', value: 'us-west-1' },
                { name: 'US West (Oregon) - us-west-2', value: 'us-west-2' },
                { name: 'South America (São Paulo) - sa-east-1', value: 'sa-east-1' },
                { name: 'EU (Ireland) - eu-west-1', value: 'eu-west-1' },
                { name: 'EU (London) - eu-west-2', value: 'eu-west-2' },
                { name: 'EU (Frankfurt) - eu-central-1', value: 'eu-central-1' },
                { name: 'Asia Pacific (Singapore) - ap-southeast-1', value: 'ap-southeast-1' },
                { name: 'Asia Pacific (Sydney) - ap-southeast-2', value: 'ap-southeast-2' },
                { name: 'Asia Pacific (Tokyo) - ap-northeast-1', value: 'ap-northeast-1' },
                { name: 'Asia Pacific (Seoul) - ap-northeast-2', value: 'ap-northeast-2' },
            ],
            default: finalOptions.region,
        });

        const useDomain = await select({
            message: 'Use custom domain?',
            choices: [
                { name: 'No - Use CloudFront default domain', value: false },
                { name: 'Yes', value: true },
            ],
            default: false,
        });

        let domain: string | undefined;
        let certArn: string | undefined;

        if (useDomain) {
            domain = await input({
                message: 'Custom domain name:',
                validate: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return 'Domain name is required when using custom domain';
                    }
                    // Basic domain validation
                    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
                    if (!domainRegex.test(value.trim())) {
                        return 'Please enter a valid domain name (e.g., example.com)';
                    }
                    return true;
                },
            });

            certArn = await input({
                message: 'ACM certificate ARN:',
                validate: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return 'Certificate ARN is required when using custom domain';
                    }
                    // Basic ARN validation
                    if (!value.startsWith('arn:aws:acm:')) {
                        return 'ARN must start with "arn:aws:acm:"';
                    }
                    return true;
                },
            });
        }

        finalOptions = { ...finalOptions, projectName, output, region, domain, certArn };
    }

    const validatedOptions = CLIOptionsSchema.parse(finalOptions);

    const outputPath = validateOutputPath(
        validatedOptions.output,
        projectPath
    );

    await logger.withSpinner(
        'Generating Terraform files',
        () => generateTerraformFiles({
            projectName: validatedOptions.projectName || packageJson.name,
            outputDir: outputPath,
            buildToolConfig,
            awsRegion: validatedOptions.region,
            domainName: validatedOptions.domain,
            certificateArn: validatedOptions.certArn,
        })
    );

    logger.success(`Terraform files generated in: ${logger.highlight(outputPath)}`);

    // Prompt for GitHub Actions workflow generation
    let shouldGenerateGitHubActions = options.githubActions ?? false;
    
    if (!options.yes && !options.githubActions) {
        shouldGenerateGitHubActions = await confirm({
            message: 'Generate GitHub Actions CI/CD workflow?',
            default: true,
        });
    }

    if (shouldGenerateGitHubActions) {
        await logger.withSpinner(
            'Generating GitHub Actions workflow',
            async () => {
                await generateGitHubActionsWorkflow({
                    projectName: validatedOptions.projectName || packageJson.name,
                    outputDir: '.', // Will be used relative to project root
                    buildToolConfig,
                    packageJson,
                    awsRegion: validatedOptions.region,
                    cloudfrontUrl: validatedOptions.domain,
                }, projectPath);

                await generateGitHubActionsReadme({
                    projectName: validatedOptions.projectName || packageJson.name,
                    outputDir: '.',
                    buildToolConfig,
                    packageJson,
                    awsRegion: validatedOptions.region,
                    cloudfrontUrl: validatedOptions.domain,
                }, projectPath);
            }
        );

        logger.success('GitHub Actions workflow generated in: ' + logger.highlight('.github/workflows/deploy.yml'));
        logger.info('Setup instructions: ' + logger.highlight('DEPLOYMENT.md'));
    }

    logger.info('');
    logger.info('Next steps:');
    logger.info(`  1. cd ${outputPath}`);
    logger.info('  2. terraform init');
    logger.info('  3. terraform plan');
    logger.info('  4. terraform apply');
    
    if (shouldGenerateGitHubActions) {
        logger.info('  5. Configure GitHub secrets (see DEPLOYMENT.md)');
        logger.info('  6. Push to main/master branch to trigger deployment');
    }
}

async function detectCommand(): Promise<void> {
    const projectPath = process.cwd();

    logger.info('Detecting build tool configuration...');
    logger.info('');

    const packageJson = await readPackageJson(projectPath);
    const buildToolConfig = await detectBuildTool(projectPath, packageJson);

    logger.info('Build Tool Configuration:');
    logger.info(`  Tool: ${logger.highlight(buildToolConfig.name)}`);
    logger.info(`  Output Directory: ${logger.highlight(buildToolConfig.outputDir)}`);
    if (buildToolConfig.configPath) {
        logger.info(`  Config File: ${logger.highlight(buildToolConfig.configPath)}`);
    }
}

program.parse();
