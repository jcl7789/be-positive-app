/**
 * Retry utilities with exponential backoff
 * Implements configurable retry strategies for API calls and other operations
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (including initial attempt)
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  initialDelayMs?: number;

  /**
   * Maximum delay between retries in milliseconds
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * Exponential backoff multiplier
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Random jitter factor (0-1) to add to delays
   * Helps prevent thundering herd
   * @default 0.1
   */
  jitterFactor?: number;

  /**
   * Custom error predicate to determine if error is retryable
   */
  isRetryableError?: (error: unknown) => boolean;

  /**
   * Callback executed before each retry (for logging)
   */
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Default predicate: treats network errors and 5xx as retryable
 */
const defaultIsRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    // Network errors
    return ['fetch', 'network', 'timeout'].some(msg =>
      error.message.toLowerCase().includes(msg)
    );
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Gemini rate limit errors
    if (msg.includes('rate limit') || msg.includes('503') || msg.includes('429')) {
      return true;
    }
    // Server errors
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return true;
    }
    // Timeout
    if (msg.includes('timeout') || msg.includes('deadline')) {
      return true;
    }
  }

  return false;
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterFactor: number
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);

  // Add random jitter
  const jitter = delay * jitterFactor * Math.random();
  return Math.floor(delay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async operation with exponential backoff retry strategy
 * @param fn The async function to execute
 * @param options Retry configuration options
 * @returns RetryResult with success status, data, error, and attempt metadata
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
    isRetryableError = defaultIsRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fn();
      const totalTimeMs = Date.now() - startTime;

      return {
        success: true,
        data,
        attempts: attempt,
        totalTimeMs,
      };
    } catch (error) {
      lastError = error;

      // If this was the last attempt, don't retry
      if (attempt === maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        break;
      }

      // Calculate delay and wait
      const nextDelayMs = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitterFactor
      );

      onRetry?.(attempt, error, nextDelayMs);
      await sleep(nextDelayMs);
    }
  }

  const totalTimeMs = Date.now() - startTime;

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTimeMs,
  };
}

/**
 * Validate and parse JSON with helpful error messages
 * @param jsonString The JSON string to parse
 * @param expectedKeys Optional array of required top-level keys
 * @returns Parsed object or throws with detailed error
 */
export function safeJsonParse<T = unknown>(
  jsonString: string,
  expectedKeys?: string[]
): T {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error(
      `Invalid JSON input: expected string, got ${typeof jsonString}`
    );
  }

  const trimmed = jsonString.trim();

  if (!trimmed) {
    throw new Error('Empty JSON string');
  }

  try {
    const parsed = JSON.parse(trimmed) as T;

    // Validate expected keys if provided
    if (expectedKeys) {
      const obj = parsed as Record<string, unknown>;
      const missingKeys = expectedKeys.filter(key => !(key in obj));

      if (missingKeys.length > 0) {
        throw new Error(
          `Missing required fields: ${missingKeys.join(', ')}. ` +
          `Got keys: ${Object.keys(obj).join(', ')}`
        );
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Provide helpful context about JSON parsing errors
      const preview = trimmed.substring(0, 100);
      throw new Error(
        `Invalid JSON: ${error.message}\n` +
        `Preview: ${preview}${trimmed.length > 100 ? '...' : ''}`
      );
    }

    throw error;
  }
}
