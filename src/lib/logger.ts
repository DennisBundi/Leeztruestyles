import * as Sentry from '@sentry/nextjs';

/**
 * Structured logger that redacts PII in production.
 * In development, logs are passed through as-is.
 * In production, errors are also sent to Sentry.
 */

const isProduction = process.env.NODE_ENV === 'production';

const PII_PATTERNS: [RegExp, string][] = [
  // Email addresses
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]'],
  // Phone numbers (various formats)
  [/\b(?:\+?254|0)\d{9}\b/g, '[PHONE_REDACTED]'],
  [/\b\d{10,13}\b/g, '[PHONE_REDACTED]'],
];

function redact(value: unknown): unknown {
  if (!isProduction) return value;

  if (typeof value === 'string') {
    let redacted = value;
    for (const [pattern, replacement] of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(redact);
    }
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Redact known PII keys entirely
      if (['email', 'phone', 'password', 'token', 'secret'].includes(k.toLowerCase())) {
        redacted[k] = `[${k.toUpperCase()}_REDACTED]`;
      } else {
        redacted[k] = redact(v);
      }
    }
    return redacted;
  }

  return value;
}

export const logger = {
  info(message: string, ...args: unknown[]) {
    console.log(`[INFO] ${message}`, ...args.map(redact));
  },
  warn(message: string, ...args: unknown[]) {
    console.warn(`[WARN] ${message}`, ...args.map(redact));
  },
  error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${message}`, ...args.map(redact));

    // Report to Sentry in production
    if (isProduction) {
      const err = args.find((a) => a instanceof Error);
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: { message } });
      } else {
        Sentry.captureMessage(message, 'error');
      }
    }
  },
  debug(message: string, ...args: unknown[]) {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};
