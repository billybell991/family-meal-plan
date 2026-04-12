async function retryWithBackoff(fn, { maxRetries = 5, baseDelay = 30000, label = 'operation' } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.statusCode;
      const isRetryable = status === 503 || status === 429 || status === 500;
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[Retry] ${label} failed after ${attempt} attempt(s): ${err.message}`);
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${label} attempt ${attempt}/${maxRetries} failed (${status}). Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { retryWithBackoff };
