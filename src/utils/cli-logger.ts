import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private debugMode: boolean;

  constructor(debug = false) {
    this.debugMode = debug;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✖'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  debug(message: string): void {
    if (this.debugMode) {
      console.log(chalk.gray('🔍'), chalk.dim(message));
    }
  }

  highlight(text: string): string {
    return chalk.cyan(text);
  }

  dim(text: string): string {
    return chalk.gray(text);
  }

  async withSpinner<T>(
    message: string,
    task: () => Promise<T>
  ): Promise<T> {
    const spinner = ora(message).start();
    try {
      const result = await task();
      spinner.succeed();
      return result;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  createSpinner(message: string): Ora {
    return ora(message);
  }
}

export const logger = new Logger();
