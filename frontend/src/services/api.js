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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (netErr) {
    const offlineMsg = 'Falha de comunicação na rede Wi-Fi do campus. Tente novamente.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cs-network-error', { detail: offlineMsg }));
    }
    throw new Error(offlineMsg);
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonErr) {
    throw new Error('Resposta inválida do servidor.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao comunicar com o servidor.');
  }

  return data;
}
