const API = (() => {
  const BASE_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  async function request(method, path, body, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    if (options.formData) {
      delete headers['Content-Type'];
      config.body = body;
    }

    const res = await fetch(`${BASE_URL}${path}`, config);

    const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/forgot');

    if (res.status === 401) {
      const data = await res.json();
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        window.location.hash = '#/login';
      }
      throw new Error(data.error || 'غير مصرّح');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'حدث خطأ');
    }

    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body, opts) => request('POST', path, body, opts),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path, body) => request('DELETE', path, body),
    upload: (path, formData) => request('POST', path, formData, { formData: true })
  };
})();
