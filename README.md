# Static SPA Deploy Scaffold

A CLI tool that automatically generates production-ready Terraform configuration for deploying your static SPA to AWS CloudFront + S3. Just point it at your project, and it handles the rest.

> **Prerequisites for deployment**: You'll need **AWS CLI** and **Terraform** installed to deploy the generated infrastructure. See [Requirements](#requirements) for details.

## Features

- 🔍 **Auto-Detection**: Automatically detects your build tool and output directory
- ⚡ **Zero Config**: Works out-of-the-box with sensible defaults
- 🏗️ **Production-Ready**: Generates optimized Terraform with AWS best practices
- 🛡️ **Secure by Default**: Includes Origin Access Identity, proper bucket policies, and security headers
- 📦 **Build Tool Support**: Works with Vite, Rollup, and esbuild

## Supported Build Tools

| Build Tool | Auto-Detection | Config Files Parsed |
|------------|----------------|---------------------|
| **Vite** | ✅ | `vite.config.{js,ts,mjs}` |
| **Rollup** | ✅ | `rollup.config.{js,ts,mjs}` |
| **esbuild** | ✅ | `esbuild.config.js`, `package.json` scripts |

The tool automatically detects your build tool from `package.json` dependencies and parses your config files to determine the correct output directory.

## Installation

> **Note**: This package is not yet published to npm. To use it, you'll need to clone and build it locally.

### Local Development Setup

```bash
# Clone the repository (SSH)
git clone git@github.com:vitoladev/spa-deploy-scaffold.git
cd spa-deploy-scaffold

# Enable Corepack (for pnpm)
corepack enable

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link globally (optional - allows using 'spa-deploy-scaffold' command)
pnpm link --global
```

After linking, you can use it like:
```bash
spa-deploy-scaffold generate
```

Or run directly without linking:
```bash
node dist/cli.js generate
```

## Quick Start

> **Note:** This tool generates Terraform configuration. To deploy the infrastructure, you'll need **AWS CLI** and **Terraform** installed and configured (see [Requirements](#requirements)).

Navigate to your SPA project and run:

```bash
# If you linked it globally (after running pnpm link --global)
spa-deploy-scaffold generate

# Or run directly from the tool's directory
node /path/to/spa-deploy-scaffold/dist/cli.js generate

# Non-interactive mode
spa-deploy-scaffold generate --yes
```

This will:
1. Detect your build tool (Vite/Rollup/esbuild)
2. Find your output directory
3. Generate Terraform files in `./terraform/`
4. Show you the next steps to deploy

## Usage

### Generate Terraform Configuration

```bash
spa-deploy-scaffold generate [options]
```

**Options:**
- `--tool <type>` - Override build tool detection (`vite`|`rollup`|`esbuild`)
- `--project-name <name>` - Set project name (defaults to `package.json` name)
- `--output <path>` - Terraform output directory (default: `./terraform`)
- `--region <region>` - AWS region (default: `us-east-1`)
- `--profile <profile>` - AWS CLI profile (default: `default`)
- `--domain <domain>` - Custom domain name (optional)
- `--cert-arn <arn>` - ACM certificate ARN for custom domain (optional)
- `--yes` - Skip interactive prompts and use defaults

**Examples:**

```bash
# Interactive mode with prompts
spa-deploy-scaffold generate

# Quick generation with defaults
spa-deploy-scaffold generate --yes

# Custom project name and region
spa-deploy-scaffold generate --project-name my-app --region us-west-2

# Using a specific AWS profile
spa-deploy-scaffold generate --profile production --region eu-west-1

# With custom domain
spa-deploy-scaffold generate \
  --domain myapp.com \
  --cert-arn arn:aws:acm:us-east-1:123456789:certificate/abc123

# Override auto-detection
spa-deploy-scaffold generate --tool vite --yes
```

### Detect Build Configuration

See what the tool detects without generating files:

```bash
spa-deploy-scaffold detect
```

**Output example:**
```
Build Tool Configuration:
  Tool: vite
  Output Directory: dist
  Config File: /path/to/project/vite.config.ts
```

## How It Works

1. **Reads your `package.json`** to detect which build tool you're using
2. **Parses your build config** (e.g., `vite.config.ts`) to find the output directory
3. **Prompts for AWS settings** (region, domain, etc.) or uses CLI flags
4. **Generates Terraform files** with optimized CloudFront + S3 configuration

## Generated Infrastructure

The tool generates Terraform configuration for:

### AWS Resources
- **S3 Bucket**: Private bucket for storing your static files
- **CloudFront Distribution**: Global CDN for fast content delivery
- **Origin Access Identity**: Secure S3 access (no public bucket needed)
- **Bucket Policies**: Minimal permissions for CloudFront-only access

### Features Included
- ✅ Automatic HTTPS redirect
- ✅ Gzip/Brotli compression
- ✅ SPA routing support (404 → index.html)
- ✅ Custom domain support (optional)
- ✅ ACM certificate integration (optional)
- ✅ Security best practices

### Files Generated

```
terraform/
├── main.tf           # Core infrastructure (S3, CloudFront, OAI)
├── variables.tf      # Input variables with defaults
├── outputs.tf        # Useful outputs (URLs, IDs, ARNs)
└── terraform.tfvars.example  # Example values for customization
```

## Deploying Your Site

**Prerequisites**: Before running these commands, ensure you have:
1. **AWS CLI** installed and configured (`aws configure`)
2. **Terraform** installed

After generating the Terraform files:

```bash
# Navigate to the terraform directory
cd terraform

# Initialize Terraform
terraform init

# Review the infrastructure plan
terraform plan

# Deploy to AWS
terraform apply

# After deployment, build and upload your site
cd ..
pnpm build  # or npm run build
aws s3 sync dist/ s3://$(terraform -chdir=terraform output -raw bucket_name)

# Get your CloudFront URL
terraform -chdir=terraform output cloudfront_url
```

## Configuration Examples

### Vite Project

```bash
# Detects from package.json devDependencies
# Parses vite.config.ts for build.outDir (default: dist)
spa-deploy-scaffold generate
```

Your `vite.config.ts`:
```typescript
export default {
  build: {
    outDir: 'dist', // Automatically detected
  }
}
```

### Rollup Project

```bash
# Detects from package.json devDependencies
# Parses rollup.config.js for output.dir
spa-deploy-scaffold generate
```

Your `rollup.config.js`:
```javascript
export default {
  output: {
    dir: 'build', // Automatically detected
  }
}
```

### esbuild Project

```bash
# Detects from package.json devDependencies
# Parses build scripts for --outdir flag
spa-deploy-scaffold generate
```

Your `package.json`:
```json
{
  "scripts": {
    "build": "esbuild src/index.tsx --bundle --outdir=public"
  }
}
```

## Custom Domain Setup

To use a custom domain:

1. **Create an ACM certificate** in AWS (must be in `us-east-1` for CloudFront):
   ```bash
   aws acm request-certificate \
     --domain-name myapp.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate the certificate** via DNS records in Route 53 or your DNS provider

3. **Generate Terraform with domain**:
   ```bash
   spa-deploy-scaffold generate \
     --domain myapp.com \
     --cert-arn arn:aws:acm:us-east-1:123456789:certificate/abc123
   ```

4. **After deployment**, create a CNAME record pointing `myapp.com` to the CloudFront domain:
   ```
   myapp.com  CNAME  d1234567890.cloudfront.net
   ```

## Requirements

### For Running the Scaffold Tool
- **Node.js** >= 22.0.0
- **pnpm** >= 9.0.0 (or npm/yarn)

### For Deploying Generated Infrastructure
- **AWS CLI** >= 2.0.0 - [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  - Required for Terraform AWS provider authentication
  - Required for deploying built files to S3
  - Required for CloudFront cache invalidation
  - Must be configured with valid credentials: `aws configure`
- **Terraform** >= 1.0.0 - [Installation guide](https://developer.hashicorp.com/terraform/downloads)

## Development

Want to contribute or modify the tool?

```bash
# Clone the repository (SSH)
git clone git@github.com:vitoladev/spa-deploy-scaffold.git
cd spa-deploy-scaffold

# Enable Corepack (for pnpm)
corepack enable

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Development mode (watch for changes)
pnpm dev
```

### Available Scripts

```bash
pnpm build           # Compile TypeScript to JavaScript
pnpm dev             # Watch mode for development
pnpm test            # Run test suite
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Generate coverage report
pnpm lint            # Check code quality
pnpm lint:fix        # Auto-fix linting issues
pnpm format          # Format code with Prettier
pnpm type-check      # Type check without emitting files
```

## Troubleshooting

### Build tool not detected

**Problem**: `BuildToolNotFoundError: No build tool found`

**Solution**: Make sure you have one of these in your `package.json`:
```json
{
  "devDependencies": {
    "vite": "^5.0.0"
    // or "rollup": "^4.0.0"
    // or "esbuild": "^0.19.0"
  }
}
```

### Output directory not found

**Problem**: Tool detects wrong output directory

**Solution**: Use the `--tool` flag to force detection:
```bash
spa-deploy-scaffold generate --tool vite
```

Or check your build config file for custom output paths.

### AWS credentials not configured

**Problem**: Terraform fails with authentication error

**Solution**: Configure AWS credentials:
```bash
# Configure default profile
aws configure

# Or configure a named profile
aws configure --profile production

# Or set environment variables:
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"
```

If using named profiles, specify it with `--profile`:
```bash
spa-deploy-scaffold generate --profile production
```

### Permission denied on output directory

**Problem**: Cannot write Terraform files

**Solution**: Check directory permissions or specify a different output path:
```bash
spa-deploy-scaffold generate --output ~/my-terraform
```

## FAQ

**Q: Does this deploy my site automatically?**  
A: No, it generates Terraform configuration files. You still need to run `terraform apply` to create the AWS infrastructure, then upload your built files to S3.

**Q: Can I modify the generated Terraform files?**  
A: Yes! The generated files are meant to be customized. Edit them to fit your specific needs.

**Q: Do I need to commit the generated Terraform files?**  
A: Yes, you should commit them to version control so your team can manage infrastructure together.

**Q: Can I use this with Next.js or other frameworks?**  
A: This tool is designed for static SPAs. For Next.js, use their built-in deployment options or look for SSR-specific tools.

**Q: What does this cost on AWS?**  
A: Costs vary, but for a typical small site:
- S3: ~$0.023/GB storage + $0.09/GB transfer
- CloudFront: Free tier includes 1TB transfer/month, then ~$0.085/GB
- Usually under $5/month for small sites

**Q: Can I use this in CI/CD?**  
A: Yes! Use the `--yes` flag to skip prompts:
```bash
spa-deploy-scaffold generate --yes --project-name $CI_PROJECT_NAME --profile ci-deploy
```

## Related Projects

- [Terraform AWS Modules](https://registry.terraform.io/namespaces/terraform-aws-modules)
- [Vite Static Deploy](https://github.com/vitejs/vite-plugin-static-deploy)
- [AWS CDK Static Site](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html)

## Contributing

Contributions are welcome! Please:
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use pnpm for package management

## License

MIT

---

**Made with ❤️ for developers deploying static SPAs to AWS**