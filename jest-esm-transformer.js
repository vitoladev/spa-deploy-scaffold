import tsJest from 'ts-jest';

const tsJestTransformer = tsJest.default.createTransformer({
  useESM: true,
  tsconfig: {
    target: 'es2022',
    module: 'esnext',
    lib: ['es2022'],
    moduleResolution: 'bundler',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
  },
});

export default {
  process(sourceText, sourcePath, options) {
    // Replace import.meta.url with a mock value for testing
    const modifiedSource = sourceText.replace(
      /import\.meta\.url/g,
      '"file:///fake/test/path.js"'
    );
    
    return tsJestTransformer.process(modifiedSource, sourcePath, options);
  },
};
