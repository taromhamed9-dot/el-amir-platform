const App = (() => {
  const routes = {};
  let currentView = null;

  function registerRoute(path, handler) {
    routes[path] = handler;
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  async function handleRoute() {
    const hash = window.location.hash || '#/login';
    const path = hash.replace('#', '');

    if (!Auth.isLoggedIn() && path !== '/login' && !path.startsWith('/register')) {
      window.location.hash = '#/login';
      return;
    }

    if (Auth.isLoggedIn() && path === '/login') {
      window.location.hash = Auth.getDefaultRoute();
      return;
    }

    const handler = routes[path];
    if (handler) {
      currentView = path;
      await handler();
    } else {
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        pageContent.innerHTML = `
          <div class="empty-state">
            <div class="icon">${Icons.notFound}</div>
            <div class="title">الصفحة غير موجودة</div>
            <div class="description">الصفحة المطلوبة غير متوفرة</div>
            <button class="btn btn-primary mt-20" onclick="window.location.hash='${Auth.getDefaultRoute()}'">العودة للرئيسية</button>
          </div>
        `;
      }
    }
  }

  function renderLayout(role) {
    const app = document.getElementById('app');
    const navItems = getNavItems(role);
    const user = Auth.getUser();
    const initials = user ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : '';

    app.innerHTML = `
      <div class="app-container">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo" style="overflow:hidden;background:none;"><img src="assets/img/Logo.png" alt="Logo" style="width:100%;height:100%;object-fit:cover;"></div>
            <span class="school-name">منصة المدرسة</span>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav">
            ${navItems.map(item => `
              <div class="nav-item" data-route="${item.route}" onclick="App.navigate('${item.route}')">
                <span class="icon">${item.icon}</span>
                <span class="label">${item.label}</span>
              </div>
            `).join('')}
          </nav>
          <div class="sidebar-footer">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
              <div class="user-name">${user ? user.full_name : ''}</div>
              <div class="user-role">${getRoleLabel(role)}</div>
            </div>
            <button class="logout-btn" onclick="Auth.logout()" title="خروج">${Icons.logout}</button>
          </div>
        </aside>
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="App.toggleSidebar()"></div>
        <main class="main-content">
          <header class="topbar">
            <button class="toggle-sidebar" onclick="App.toggleSidebar()">${Icons.menu}</button>
            <h1 class="page-title" id="page-title"></h1>
            ${Auth.isImpersonating() ? `
              <div class="impersonation-bar">
                ${Icons.warning} أنت تتصفح كأستاذ
                <button onclick="Auth.endImpersonation();window.location.hash='#/admin/dashboard';window.location.reload()">رجوع لحسابي</button>
              </div>
            ` : ''}
            <button class="notifications-btn" onclick="App.toggleNotifications()" id="notifications-btn">
              ${Icons.bell}
              <span class="badge" id="notifications-badge" style="display:none">0</span>
            </button>
          </header>
          <div class="page-content page-enter" id="page-content"></div>
        </main>
      </div>
      <div id="notifications-dropdown" style="display:none;position:fixed;top:70px;left:20px;width:360px;max-height:500px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);z-index:200;box-shadow:0 8px 30px rgba(0,0,0,0.4)"></div>
    `;

    updateActiveNav();
  }

  function getNavItems(role) {
    if (role === 'admin' || role === 'super_admin') {
      return [
        { route: '#/admin/dashboard', icon: Icons.dashboard, label: 'لوحة التحكم' },
        { route: '#/admin/students', icon: Icons.students, label: 'التلاميذ' },
        { route: '#/admin/teachers', icon: Icons.chalkboard, label: 'الأساتذة' },
        { route: '#/admin/courses', icon: Icons.courses, label: 'الدورات' },
        { route: '#/admin/payments', icon: Icons.payments, label: 'الدفع' },
        { route: '#/admin/attendance', icon: Icons.checkSquare, label: 'الحضور' },
        { route: '#/admin/all-accounts', icon: Icons.idCard, label: 'الحسابات' },
        { route: '#/admin/requests', icon: Icons.requests, label: 'الطلبات' },
        { route: '#/admin/schedule', icon: Icons.schedule, label: 'الجداول' },
        { route: '#/admin/emails', icon: Icons.emails, label: 'الإيميلات' },
        { route: '#/admin/audit-log', icon: Icons.auditLog, label: 'سجل العمليات' },
        ...(role === 'super_admin' ? [{ route: '#/admin/accounts', icon: Icons.userShield, label: 'حسابات المدراء' }] : [])
      ];
    }
    if (role === 'teacher') {
      return [
        { route: '#/teacher/dashboard', icon: Icons.dashboard, label: 'لوحة التحكم' },
        { route: '#/teacher/my-students', icon: Icons.students, label: 'تلاميذي' },
        { route: '#/teacher/attendance', icon: Icons.checkSquare, label: 'الحضور' },
        { route: '#/teacher/schedule', icon: Icons.schedule, label: 'جدولي' },
        { route: '#/teacher/payments', icon: Icons.payments, label: 'الدفع' },
        { route: '#/teacher/notes', icon: Icons.notes, label: 'الملاحظات' },
        { route: '#/teacher/requests', icon: Icons.requests, label: 'الطلبات' }
      ];
    }
    if (role === 'student') {
      return [
        { route: '#/student/dashboard', icon: Icons.dashboard, label: 'لوحة التحكم' },
        { route: '#/student/schedule', icon: Icons.schedule, label: 'جدولي' },
        { route: '#/student/attendance', icon: Icons.checkSquare, label: 'حضوري' },
        { route: '#/student/payments', icon: Icons.payments, label: 'دفعي' },
        { route: '#/student/notes', icon: Icons.notes, label: 'الملاحظات' }
      ];
    }
    return [];
  }

  function getRoleLabel(role) {
    const map = { super_admin: 'مدير رئيسي', admin: 'مدير', teacher: 'أستاذ', student: 'تلميذ' };
    return map[role] || role;
  }

  function updateActiveNav() {
    const hash = window.location.hash;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });
  }

  function setPageTitle(title) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = title;
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  let notificationsOpen = false;
  async function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    notificationsOpen = !notificationsOpen;
    if (!notificationsOpen) { dropdown.style.display = 'none'; return; }

    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">جاري التحميل...</div>';

    try {
      const role = Auth.getRole();
      const endpoint = role === 'student' ? '/student/notifications' :
                       role === 'teacher' ? '/teacher/notifications' :
                       '/admin/notifications';
      const data = await API.get(endpoint);
      const nots = data.notifications || [];

      if (nots.length === 0) {
        dropdown.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">لا توجد إشعارات</div>';
      } else {
        dropdown.innerHTML = `
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:0.9rem">الإشعارات</span>
            <button class="btn btn-ghost btn-sm" onclick="App.markAllRead()">قراءة الكل</button>
          </div>
          ${nots.map(n => `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);${n.is_read ? 'opacity:0.6' : ''};cursor:pointer"
                 onclick="${n.link ? `window.location.hash='#${n.link}'` : ''}">
              <div style="font-size:0.85rem;font-weight:${n.is_read ? '400' : '600'}">${n.title}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${n.message}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">${Utils.formatDate(n.created_at)}</div>
            </div>
          `).join('')}
        `;
      }
    } catch (err) {
      dropdown.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger)">خطأ في التحميل</div>';
    }
  }

  async function markAllRead() {
    try {
      const role = Auth.getRole();
      const endpoint = role === 'student' ? '/student/notifications/read-all' :
                       role === 'teacher' ? '/teacher/notifications/read-all' :
                       '/admin/notifications/read-all';
      await API.patch(endpoint);
      const badge = document.getElementById('notifications-badge');
      if (badge) badge.style.display = 'none';
      Toast.success('تم تحديد الكل كمقروء');
    } catch (_) {}
  }

  async function loadNotificationCount() {
    try {
      const role = Auth.getRole();
      const endpoint = role === 'student' ? '/student/notifications' :
                       role === 'teacher' ? '/teacher/notifications' :
                       '/admin/notifications';
      const data = await API.get(endpoint);
      const badge = document.getElementById('notifications-badge');
      if (badge && data.unread_count > 0) {
        badge.textContent = data.unread_count;
        badge.style.display = 'flex';
      }
    } catch (_) {}
  }

  function init() {
    window.addEventListener('hashchange', () => {
      handleRoute();
      updateActiveNav();
    });

    registerAllRoutes();
    handleRoute();
  }

  function registerAllRoutes() {
    registerRoute('/login', () => LoginView.render());

    // Admin routes
    registerRoute('/admin/dashboard', () => { renderLayout(Auth.getRole()); setPageTitle('لوحة التحكم'); AdminDashboard.render(); loadNotificationCount(); });
    registerRoute('/admin/students', () => { renderLayout(Auth.getRole()); setPageTitle('إدارة التلاميذ'); AdminStudents.render(); });
    registerRoute('/admin/teachers', () => { renderLayout(Auth.getRole()); setPageTitle('إدارة الأساتذة'); AdminTeachers.render(); });
    registerRoute('/admin/courses', () => { renderLayout(Auth.getRole()); setPageTitle('إدارة الدورات'); AdminCourses.render(); });
    registerRoute('/admin/payments', () => { renderLayout(Auth.getRole()); setPageTitle('متابعة الدفع'); AdminPayments.render(); });
    registerRoute('/admin/attendance', () => { renderLayout(Auth.getRole()); setPageTitle('تقارير الحضور'); AdminAttendance.render(); });
    registerRoute('/admin/requests', () => { renderLayout(Auth.getRole()); setPageTitle('الطلبات الواردة'); AdminRequests.render(); });
    registerRoute('/admin/schedule', () => { renderLayout(Auth.getRole()); setPageTitle('الجداول الزمنية'); AdminSchedule.render(); });
    registerRoute('/admin/emails', () => { renderLayout(Auth.getRole()); setPageTitle('إرسال الإيميلات'); AdminEmails.render(); });
    registerRoute('/admin/audit-log', () => { renderLayout(Auth.getRole()); setPageTitle('سجل العمليات'); AdminAuditLog.render(); });
    registerRoute('/admin/accounts', () => { renderLayout(Auth.getRole()); setPageTitle('حسابات المدراء'); AdminAccounts.render(); });
    registerRoute('/admin/all-accounts', () => { renderLayout(Auth.getRole()); setPageTitle('الحسابات'); AdminAllAccounts.render(); });

    // Teacher routes
    registerRoute('/teacher/dashboard', () => { renderLayout('teacher'); setPageTitle('لوحة التحكم'); TeacherDashboard.render(); loadNotificationCount(); });
    registerRoute('/teacher/my-students', () => { renderLayout('teacher'); setPageTitle('تلاميذي'); TeacherStudents.render(); });
    registerRoute('/teacher/attendance', () => { renderLayout('teacher'); setPageTitle('تسجيل الحضور'); TeacherAttendance.render(); });
    registerRoute('/teacher/schedule', () => { renderLayout('teacher'); setPageTitle('جدولي الأسبوعي'); TeacherSchedule.render(); });
    registerRoute('/teacher/payments', () => { renderLayout('teacher'); setPageTitle('حالة دفع التلاميذ'); TeacherPayments.render(); });
    registerRoute('/teacher/notes', () => { renderLayout('teacher'); setPageTitle('الملاحظات'); TeacherNotes.render(); });
    registerRoute('/teacher/requests', () => { renderLayout('teacher'); setPageTitle('طلباتي'); TeacherRequests.render(); });

    // Student routes
    registerRoute('/student/dashboard', () => { renderLayout('student'); setPageTitle('لوحة التحكم'); StudentDashboard.render(); loadNotificationCount(); });
    registerRoute('/student/schedule', () => { renderLayout('student'); setPageTitle('جدولي'); StudentScheduleView.render(); });
    registerRoute('/student/attendance', () => { renderLayout('student'); setPageTitle('حضوري وغيابي'); StudentAttendanceView.render(); });
    registerRoute('/student/payments', () => { renderLayout('student'); setPageTitle('دفعي'); StudentPayments.render(); });
    registerRoute('/student/notes', () => { renderLayout('student'); setPageTitle('ملاحظات الأستاذ'); StudentNotes.render(); });
  }

  return { init, navigate, registerRoute, renderLayout, setPageTitle, toggleSidebar, toggleNotifications, markAllRead };
})();

document.addEventListener('DOMContentLoaded', App.init);
