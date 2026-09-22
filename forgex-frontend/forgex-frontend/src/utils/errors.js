const DEFAULTS = {
  400: 'Some of the information is not valid. Please check and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'This conflicts with existing data. Refresh and try again.',
  422: 'Some of the information is not valid. Please check and try again.',
  429: 'Too many requests. Wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again shortly.',
  502: 'The server is temporarily unavailable. Please try again shortly.',
  503: 'The server is temporarily unavailable. Please try again shortly.',
};

// Messages that look like Java internals should never reach customers.
const looksTechnical = (msg) =>
  /exception|java\.|org\.|springframework|hibernate|sql|null pointer|stack/i.test(msg) || msg.length > 240;

/**
 * Normalise any Axios error into { status, message, fieldErrors }.
 * Backend shapes handled:
 *  - APIResponse           { message, status:false }          (APIException, ResourceNotFound)
 *  - validation map        { fieldName: "message", ... }       (MethodArgumentNotValidException)
 *  - auth entry point      { status, error, message, path }    (401)
 *  - MessageResponse       { message }                         (signup conflicts)
 *  - Spring default error  { timestamp, status, error, path }  (unhandled 500)
 */
export function parseApiError(error, fallback) {
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return { status: 0, message: 'The server took too long to respond. Check your connection and try again.', fieldErrors: {} };
  }
  if (!error?.response) {
    return { status: 0, message: 'Unable to connect to the server. Check your connection and try again.', fieldErrors: {} };
  }

  const { status, data } = error.response;
  let message = null;
  let fieldErrors = {};

  if (data && typeof data === 'object') {
    const isDefaultSpringError = 'timestamp' in data && 'path' in data;
    if (typeof data.message === 'string' && data.message && !isDefaultSpringError) {
      message = data.message;
    } else if (status === 400 && !isDefaultSpringError) {
      const entries = Object.entries(data).filter(([, v]) => typeof v === 'string');
      if (entries.length) {
        fieldErrors = Object.fromEntries(entries);
        message = 'Please fix the highlighted fields.';
      }
    }
  } else if (typeof data === 'string' && data && status < 500) {
    message = data;
  }

  if (!message || looksTechnical(message)) {
    message = fallback || DEFAULTS[status] || DEFAULTS[500];
  }
  if (status === 401 && /bad credentials/i.test(message)) message = 'Incorrect email or password.';

  return { status, message, fieldErrors };
}

export const errorMessage = (error, fallback) => parseApiError(error, fallback).message;
