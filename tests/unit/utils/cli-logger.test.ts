import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Logger } from '../../../src/utils/cli-logger.js';

describe('CLILogger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logger = new Logger(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Test info');
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Test success');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Test success');
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), 'Test error');
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.any(String), 'Test warning');
    });
  });

  describe('debug', () => {
    it('should not log debug message when debug mode is off', () => {
      logger.debug('Test debug');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug message when debug mode is on', () => {
      const debugLogger = new Logger(true);
      debugLogger.debug('Test debug');

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('highlight', () => {
    it('should return highlighted text', () => {
      const result = logger.highlight('test');

      expect(result).toContain('test');
    });
  });

  describe('dim', () => {
    it('should return dimmed text', () => {
      const result = logger.dim('test');

      expect(result).toContain('test');
    });
  });

  describe('withSpinner', () => {
    it('should execute task and return result on success', async () => {
      const task = jest.fn<() => Promise<string>>().mockResolvedValue('result');

      const result = await logger.withSpinner('Loading', task);

      expect(result).toBe('result');
      expect(task).toHaveBeenCalled();
    });

    it('should throw error if task fails', async () => {
      const error = new Error('Task failed');
      const task = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      await expect(logger.withSpinner('Loading', task)).rejects.toThrow('Task failed');
    });
  });

  describe('createSpinner', () => {
    it('should create a spinner', () => {
      const spinner = logger.createSpinner('Loading');

      expect(spinner).toBeDefined();
      expect(spinner).toHaveProperty('start');
      expect(spinner).toHaveProperty('stop');
    });
  });
});
