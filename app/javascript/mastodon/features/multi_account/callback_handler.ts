interface CallbackMessage {
  type: string;
  state?: string;
  code?: string;
  error?: string;
}

interface PendingRequest {
  resolve: (data: { state: string; code: string }) => void;
  reject: (error: Error) => void;
  state: string;
  popup: Window | null;
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Handle OAuth callback messages from the popup window.
 *
 * Origin validation: We accept messages from the same origin. Since the popup
 * navigates to /oauth/authorize and then back to /multi_accounts/callback on
 * the same domain, the origin will always match. We log a warning but still
 * process the message if the origin hostname matches (handles http/https or
 * port differences in development).
 */
const handleMessage = (event: MessageEvent) => {
  const data: unknown = event.data;

  if (
    !data ||
    typeof data !== 'object' ||
    !('type' in data) ||
    typeof data.type !== 'string'
  ) {
    return;
  }

  const callbackMessage = data as CallbackMessage;

  // Only handle our multi-account message types
  if (
    callbackMessage.type !== 'multi-account-callback' &&
    callbackMessage.type !== 'multi-account-error'
  ) {
    return;
  }

  const eventOrigin = event.origin;
  const currentOrigin = window.location.origin;

  // Validate origin - accept same origin or same hostname (dev flexibility)
  const isOriginValid =
    eventOrigin === currentOrigin ||
    eventOrigin.replace(/^https?:\/\//, '').split(':')[0] ===
      currentOrigin.replace(/^https?:\/\//, '').split(':')[0];

  if (!isOriginValid) {
    console.warn(
      '[MultiAccount] Received message from unexpected origin:',
      eventOrigin,
      'expected:',
      currentOrigin,
    );
    return;
  }

  if (callbackMessage.type === 'multi-account-callback') {
    const { state, code } = callbackMessage;

    if (!state || !code) {
      console.error('[MultiAccount] Invalid callback data:', callbackMessage);
      return;
    }

    const pending = pendingRequests.get(state);
    if (pending) {
      pending.resolve({ state, code });

      // Send close confirmation to popup
      if (pending.popup && !pending.popup.closed) {
        try {
          pending.popup.postMessage(
            { type: 'multi-account-close-popup' },
            currentOrigin,
          );
        } catch {
          // Popup may have navigated away, ignore
        }
      }

      pendingRequests.delete(state);
    }
  } else {
    const { error, state } = callbackMessage;

    if (state) {
      const pending = pendingRequests.get(state);
      if (pending) {
        pending.reject(new Error(error ?? 'Unknown error'));

        if (pending.popup && !pending.popup.closed) {
          try {
            pending.popup.postMessage(
              { type: 'multi-account-close-popup' },
              currentOrigin,
            );
          } catch {
            // ignore
          }
        }

        pendingRequests.delete(state);
      }
    } else {
      for (const [stateKey, pending] of pendingRequests.entries()) {
        pending.reject(new Error(error ?? 'Unknown error'));

        pendingRequests.delete(stateKey);
      }
    }
  }
};

/**
 * Initialize the callback handler
 */
export const initializeCallbackHandler = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }
};

/**
 * Clean up the callback handler
 */
export const cleanupCallbackHandler = () => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', handleMessage);

    for (const [state, pending] of pendingRequests.entries()) {
      pending.reject(new Error('Callback handler was cleaned up'));
      pendingRequests.delete(state);
    }
  }
};

/**
 * Open OAuth popup and wait for callback.
 *
 * The popup navigates through: about:blank -> /oauth/authorize -> /auth/sign_in
 * (if force_login) -> /oauth/authorize (after login) -> /multi_accounts/callback.
 *
 * During navigation, accessing popup.closed may throw on cross-origin pages,
 * but since all pages are same-origin in our case, we just catch errors.
 */
export const openOAuthPopup = (
  authorizeUrl: string,
  state: string,
  existingPopup?: Window | null,
): Promise<{ state: string; code: string }> => {
  return new Promise((resolve, reject) => {
    const popup = existingPopup;

    if (!popup) {
      reject(new Error('Failed to open popup window'));
      return;
    }

    // Navigate the already-opened popup to the authorize URL
    try {
      popup.location.href = authorizeUrl;
    } catch {
      reject(new Error('Failed to navigate popup window'));
      return;
    }

    // 5 minute timeout for the entire OAuth flow (user needs time to log in)
    const timeoutId = window.setTimeout(() => {
      const pending = pendingRequests.get(state);
      if (pending) {
        pending.reject(
          new Error('OAuth authorization timed out. Please try again.'),
        );
        pendingRequests.delete(state);
      }
    }, 300000);

    pendingRequests.set(state, {
      resolve: (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      },
      reject: (rejectError) => {
        clearTimeout(timeoutId);
        reject(rejectError);
      },
      state,
      popup,
    });
  });
};
