import { z } from 'zod';

export const PackageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  scripts: z.record(z.string(), z.string()).optional(),
});

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export interface ViteConfig {
  build?: {
    outDir?: string;
  };
}

export interface RollupConfig {
  output?: {
    dir?: string;
    file?: string;
  } | Array<{
    dir?: string;
    file?: string;
  }>;
}

export interface EsbuildConfig {
  outdir?: string;
  outfile?: string;
}

export const CLIOptionsSchema = z.object({
  tool: z.enum(['vite', 'rollup', 'esbuild']).optional(),
  projectName: z.string().optional(),
  output: z.string().default('./terraform'),
  region: z.string().default('us-east-1'),
  profile: z.string().default('default'),
  domain: z.string().optional(),
  certArn: z.string().optional(),
  githubActions: z.boolean().default(false),
  yes: z.boolean().default(false),
});

export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
