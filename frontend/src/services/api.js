const API_BASE_URL = '/api/v1';

export async function fetchApi(endpoint, options = {}) {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    const offlineMsg = 'Sem ligação à rede Wi-Fi do campus. Verifique a sua conexão de internet.';
    window.dispatchEvent(new CustomEvent('cs-network-error', { detail: offlineMsg }));
    throw new Error(offlineMsg);
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('cs_token') : null;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const config = {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  if (!config.signal) {
    config.signal = controller.signal;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (netErr) {
    clearTimeout(timeoutId);
    const isTimeout = netErr.name === 'AbortError';
    const offlineMsg = isTimeout 
      ? 'O pedido ao servidor expirou (timeout). Verifique a sua conexão e tente novamente.'
      : 'Falha de comunicação na rede Wi-Fi do campus. Tente novamente.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cs-network-error', { detail: offlineMsg }));
    }
    throw new Error(offlineMsg);
  } finally {
    clearTimeout(timeoutId);
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonErr) {
    throw new Error('Resposta inválida do servidor.');
  }

  if (!response.ok) {
    // Intercepção centralizada de sessão expirada
    if (response.status === 401) {
      localStorage.removeItem('cs_token');
      // Evitar redirect loop se já estiver na página inicial
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.dispatchEvent(new CustomEvent('cs-session-expired'));
      }
    }

    let extractedError = '';

    if (data) {
      if (typeof data.error === 'string' && data.error.trim()) {
        extractedError = data.error.trim();
      } else if (data.error && typeof data.error === 'object') {
        extractedError = data.error.message || (Array.isArray(data.details) ? data.details[0] : '');
      }

      if (!extractedError && typeof data.message === 'string' && data.message.trim()) {
        extractedError = data.message.trim();
      }

      if (!extractedError && Array.isArray(data.details) && data.details.length > 0) {
        extractedError = String(data.details[0]);
      }
    }

    const trimmed = (extractedError || '').toString().trim();
    const isGarbage =
      !trimmed ||
      trimmed === '{}' ||
      trimmed === '({})' ||
      trimmed === '[]' ||
      trimmed === '([])' ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      trimmed.includes('[object Object]');

    const cleanMessage = isGarbage
      ? 'Ocorreu um erro ao processar o seu pedido. Por favor, tente novamente.'
      : trimmed;

    throw new Error(cleanMessage);
  }

  return data;
}
