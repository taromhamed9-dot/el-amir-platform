const Auth = (() => {
  function getToken() {
    return localStorage.getItem('token');
  }

  function getRole() {
    return localStorage.getItem('role');
  }

  function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function setSession(token, role, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('original_token');
  }

  async function login(username, password, role) {
    const data = await API.post('/auth/login', { username, password, role });
    setSession(data.token, data.role, data.user);
    return data;
  }

  async function logout() {
    try {
      await API.post('/auth/logout');
    } catch (_) { /* ignore */ }
    clearSession();
    window.location.hash = '#/login';
  }

  async function impersonateTeacher(teacherId) {
    const data = await API.post(`/admin/teachers/${teacherId}/impersonate`, {});
    const token = data.impersonation_token || data.token;
    startImpersonation(token);
    return { ...data, token };
  }

  function startImpersonation(token) {
    localStorage.setItem('original_token', getToken());
    localStorage.setItem('original_role', getRole());
    localStorage.setItem('original_user', localStorage.getItem('user'));
    localStorage.setItem('token', token);
    localStorage.setItem('role', 'teacher');
    localStorage.setItem('impersonation_token', 'true');
  }

  function endImpersonation() {
    const origToken = localStorage.getItem('original_token');
    const origRole = localStorage.getItem('original_role');
    const origUser = localStorage.getItem('original_user');
    if (origToken) {
      localStorage.setItem('token', origToken);
      localStorage.setItem('role', origRole);
      localStorage.setItem('user', origUser);
    }
    localStorage.removeItem('original_token');
    localStorage.removeItem('original_role');
    localStorage.removeItem('original_user');
    localStorage.removeItem('impersonation_token');
  }

  function isImpersonating() {
    return localStorage.getItem('impersonation_token') === 'true';
  }

  function getDefaultRoute() {
    const role = getRole();
    if (role === 'admin' || role === 'super_admin') return '#/admin/dashboard';
    if (role === 'teacher') return '#/teacher/dashboard';
    if (role === 'student') return '#/student/dashboard';
    return '#/login';
  }

  return {
    getToken, getRole, getUser, isLoggedIn,
    login, logout,
    impersonateTeacher,
    impersonate: impersonateTeacher, // alias used by teachers.js
    startImpersonation, endImpersonation, isImpersonating,
    getDefaultRoute
  };
})();
