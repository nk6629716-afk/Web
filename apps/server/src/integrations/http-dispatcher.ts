import { AuthType, TestConnectionResult, AppIntegration, AppIntegrationSafeResponse } from '@relay/shared';

export function validateUrlForSsrf(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'Only http and https protocols are supported' };
    }

    const hostname = url.hostname.toLowerCase();
    const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

    // Prohibit AWS/GCP/Azure link-local metadata endpoints unconditionally
    if (
      hostname === '169.254.169.254' || 
      hostname === 'metadata.google.internal' || 
      hostname === 'instance-data'
    ) {
      return { valid: false, error: 'Access to cloud instance metadata service is prohibited' };
    }

    if (!isTestOrDev) {
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return { valid: false, error: 'Access to private internal network addresses is prohibited' };
      }
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Invalid URL: ${err?.message || 'malformed URL'}` };
  }
}

export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  return `${secret.substring(0, 4)}••••${secret.substring(secret.length - 4)}`;
}

export function toSafeIntegrationResponse(integration: AppIntegration): AppIntegrationSafeResponse {
  const { encryptedAuth, ...rest } = integration;
  return {
    ...rest,
    hasSecret: !!encryptedAuth,
    maskedSecret: encryptedAuth ? '••••••••' : undefined
  };
}

export interface DispatchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  authType?: AuthType;
  secret?: string | null;
  authHeaderName?: string;
  body?: any;
  timeoutMs?: number;
}

export interface DispatchResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  durationMs: number;
  data?: any;
  message: string;
  headers?: Record<string, string>;
}

export async function dispatchHttpRequest(options: DispatchOptions): Promise<DispatchResult> {
  const {
    url,
    method = 'GET',
    headers = {},
    authType = 'none',
    secret,
    authHeaderName,
    body,
    timeoutMs = 5000
  } = options;

  // 1. SSRF and URL validation
  const validation = validateUrlForSsrf(url);
  if (!validation.valid) {
    return {
      success: false,
      durationMs: 0,
      message: validation.error || 'Invalid destination URL'
    };
  }

  // 2. Prepare headers securely
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    ...headers
  };

  if (secret) {
    switch (authType) {
      case 'bearer':
        requestHeaders['Authorization'] = `Bearer ${secret}`;
        break;
      case 'api_key':
        requestHeaders[authHeaderName || 'X-API-Key'] = secret;
        break;
      case 'basic':
        requestHeaders['Authorization'] = `Basic ${Buffer.from(secret).toString('base64')}`;
        break;
      case 'custom_header':
        requestHeaders[authHeaderName || 'X-Custom-Auth'] = secret;
        break;
    }
  }

  // 3. Body preparation
  let requestBody: string | undefined = undefined;
  const upperMethod = method.toUpperCase();
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD' && upperMethod !== 'DELETE') {
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      }
    }
  }

  // 4. Timeout handling with AbortController
  const clampedTimeout = Math.max(500, Math.min(timeoutMs, 30000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), clampedTimeout);

  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: upperMethod,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timer);
    const durationMs = Math.round(performance.now() - start);

    // Extract response data safely
    let responseData: any = null;
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (rawText.length > 0) {
      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          responseData = JSON.parse(rawText);
        } catch {
          responseData = rawText.substring(0, 1000);
        }
      } else {
        responseData = rawText.substring(0, 1000);
      }
    }

    const isSuccess = response.status >= 200 && response.status < 400;
    const message = isSuccess
      ? `HTTP ${response.status} ${response.statusText}`
      : `HTTP ${response.status} ${response.statusText}${typeof responseData === 'object' && responseData?.message ? `: ${responseData.message}` : ''}`;

    return {
      success: isSuccess,
      statusCode: response.status,
      statusText: response.statusText,
      durationMs,
      data: responseData,
      message
    };
  } catch (err: any) {
    clearTimeout(timer);
    const durationMs = Math.round(performance.now() - start);

    if (err.name === 'AbortError') {
      return {
        success: false,
        durationMs,
        message: `Request timed out after ${clampedTimeout}ms`
      };
    }

    return {
      success: false,
      durationMs,
      message: `Connection error: ${err.message || 'Failed to reach host'}`
    };
  }
}
