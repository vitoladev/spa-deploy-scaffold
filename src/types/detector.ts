export type BuildToolName = 'vite' | 'rollup' | 'esbuild';

export interface BuildToolConfig {
  name: BuildToolName;
  outputDir: string;
  configPath?: string;
}

export interface DetectionResult {
  detected: boolean;
  config?: BuildToolConfig;
  reason?: string;
}
