import api from 'mastodon/api';

interface AuthorizeEntryResponse {
  authorize_url: string;
  state: string;
  nonce: string;
}

interface FetchAuthorizeEntryOptions {
  forceLogin?: boolean;
}

interface ConsumePayload {
  state: string;
  nonce: string;
  authorization_code: string;
}

interface ConsumeResponse {
  token: string;
  account: {
    id: string;
    acct: string;
    username: string;
    display_name: string;
    avatar: string;
    avatar_static: string;
  };
  scope: string;
  expires_at: string | null;
  state: string;
  nonce: string;
}

export const fetchAuthorizeEntry = async (
  options: FetchAuthorizeEntryOptions = {},
): Promise<AuthorizeEntryResponse> => {
  const { forceLogin } = options;
  const response = await api().get<AuthorizeEntryResponse>(
    '/multi_accounts/entry',
    {
      params: {
        force_login: typeof forceLogin === 'boolean' ? forceLogin : undefined,
      },
    },
  );
  return response.data;
};

interface ApiErrorResponse {
  response?: {
    status?: number;
    statusText?: string;
    data?: { error?: string };
  };
  config?: { url?: string };
  message?: string;
}

export const consumeAuthorizationCode = async (
  payload: ConsumePayload,
): Promise<ConsumeResponse> => {
  try {
    const url = '/api/v1/multi_accounts/consume';

    const response = await api(false).post<ConsumeResponse>(url, { payload });
    return response.data;
  } catch (error: unknown) {
    const err = error as ApiErrorResponse;

    console.error('consumeAuthorizationCode error:', {
      url: err.config?.url,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      error: err,
    });

    const status = err.response?.status;
    const errorData = err.response?.data?.error;

    if (status === 401) {
      throw new Error(errorData ?? 'Authentication failed. Please try again.');
    } else if (status === 400) {
      throw new Error(errorData ?? 'Bad request.');
    } else if (status === 404) {
      throw new Error(
        errorData ??
          `API endpoint not found. (${err.config?.url ?? 'unknown'})`,
      );
    } else if (status === 422) {
      throw new Error(errorData ?? 'Unable to process request.');
    } else if (err.response) {
      throw new Error(errorData ?? `Server error (${String(status)})`);
    } else {
      throw new Error(
        err.message ??
          'Error adding account. Please check your network connection.',
      );
    }
  }
};

export interface SwitchSessionResponse {
  success: boolean;
  account_id: string;
}

export const switchSession = async (
  token: string,
): Promise<SwitchSessionResponse> => {
  const response = await api(false).post<SwitchSessionResponse>(
    '/multi_accounts/switch',
    { token },
  );
  return response.data;
};
