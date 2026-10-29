// One error type for everything that can go wrong talking to the back end.
// code: 'network' (offline / server unreachable), 'session' (admin logged out),
//       'wrong' (wrong passcode), 'rate_limited' (too many attempts), 'failed' (anything else)
export class ApiError extends Error {
  constructor(code, { retryAfter = 0, detail = '' } = {}) {
    super(detail || code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}
