export interface TerraformTemplateData {
  projectName: string;
  environment: string;
  awsRegion: string;
  outputDirectory: string;
  buildTool: string;
  domainName?: string;
  certificateArn?: string;
  priceClass: string;
  timestamp: string;
}

export interface TerraformGenerationOptions {
  projectName: string;
  outputDir: string;
  buildToolConfig: {
    name: string;
    outputDir: string;
  };
  awsRegion: string;
  environment?: string;
  domainName?: string;
  certificateArn?: string;
  priceClass?: string;
}
