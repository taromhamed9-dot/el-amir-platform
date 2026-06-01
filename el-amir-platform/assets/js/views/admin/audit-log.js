const AdminAuditLog = (() => {
  let allLogs = [];

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <h2 style="font-size:1.1rem" class="mb-20">${Icons.auditLog} سجل العمليات</h2>
      <div class="filters-bar mb-20">
        <input type="text" class="form-input search-input" placeholder="بحث بالمستخدم أو العملية..." oninput="AdminAuditLog.onSearch(this.value)">
        <select class="form-select" onchange="AdminAuditLog.filterRole(this.value)">
          <option value="">كل الأدوار</option>
          <option value="admin">مدير</option>
          <option value="super_admin">مدير رئيسي</option>
          <option value="teacher">أستاذ</option>
          <option value="student">تلميذ</option>
        </select>
      </div>
      <div id="audit-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load();
  }

  let filters = {};

  const onSearch = Utils.debounce((v) => { filters.search = v || undefined; applyFilters(); }, 300);
  function filterRole(v) { filters.role = v || undefined; applyFilters(); }

  function applyFilters() {
    let filtered = [...allLogs];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(l => (l.actor_name || '').toLowerCase().includes(q) || (l.action || '').toLowerCase().includes(q));
    }
    if (filters.role) filtered = filtered.filter(l => l.actor_role === filters.role);
    renderTable(filtered);
  }

  async function load() {
    const container = document.getElementById('audit-container');
    try {
      const data = await API.get('/admin/audit-log');
      allLogs = data.logs || [];
      applyFilters();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function renderTable(logs) {
    const container = document.getElementById('audit-container');
    if (logs.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.auditLog}</div><div class="title">لا توجد عمليات مسجلة</div></div>`;
      return;
    }
    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>الوقت</th><th>المستخدم</th><th>الدور</th><th>العملية</th><th>الهدف</th></tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td class="mono" style="font-size:0.78rem">${new Date(l.timestamp).toLocaleString('ar-DZ')}</td>
                <td>${l.actor_name || '—'}</td>
                <td><span class="badge badge-info">${l.actor_role}</span></td>
                <td>${l.action}</td>
                <td>${l.target_type || ''} ${l.target_id ? l.target_id.slice(0,8) : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return { render, load, onSearch, filterRole };
})();
