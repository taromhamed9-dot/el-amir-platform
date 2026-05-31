const AdminDashboard = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = '<div class="admin-dashboard"><div class="stats-grid stagger">' +
      Array(6).fill('<div class="stat-card"><div class="skeleton skeleton-card" style="width:100%;height:80px"></div></div>').join('') +
      '</div></div>';

    try {
      const stats = await API.get('/admin/stats');
      page.innerHTML = `
        <div class="admin-dashboard">
          <div class="stats-grid stagger">
            ${statCard(Icons.students, 'blue', stats.total_students, 'التلاميذ النشطين')}
            ${statCard(Icons.chalkboard, 'gold', stats.total_teachers, 'الأساتذة')}
            ${statCard(Icons.courses, 'green', `${stats.open_courses}/${stats.total_courses}`, 'الدورات المفتوحة')}
            ${statCard(Icons.payments, 'red', stats.unpaid_this_month, 'لم يدفعوا هذا الشهر')}
            ${statCard(Icons.pieChart, 'blue', stats.today_attendance_rate + '%', 'نسبة الحضور اليوم')}
            ${statCard(Icons.requests, 'orange', stats.pending_requests, 'طلبات معلقة')}
          </div>
          <div class="grid-2 mt-24">
            <div class="card">
              <div class="card-header">
                <span class="card-title">روابط سريعة</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
                <a href="#/admin/students" class="btn btn-outline" style="justify-content:flex-start">${Icons.students} إدارة التلاميذ</a>
                <a href="#/admin/teachers" class="btn btn-outline" style="justify-content:flex-start">${Icons.chalkboard} إدارة الأساتذة</a>
                <a href="#/admin/courses" class="btn btn-outline" style="justify-content:flex-start">${Icons.courses} إدارة الدورات</a>
                <a href="#/admin/payments" class="btn btn-outline" style="justify-content:flex-start">${Icons.payments} متابعة الدفع</a>
                <a href="#/admin/attendance" class="btn btn-outline" style="justify-content:flex-start">${Icons.clipboardCheck} تقارير الحضور</a>
                <a href="#/admin/requests" class="btn btn-outline" style="justify-content:flex-start">${Icons.requests} الطلبات</a>
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <span class="card-title">ملخص سريع</span>
              </div>
              <div style="space-y:12px">
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span style="color:var(--text-muted)">إجمالي التلاميذ</span>
                  <span class="mono" style="font-weight:700">${stats.total_students}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span style="color:var(--text-muted)">الأساتذة</span>
                  <span class="mono" style="font-weight:700">${stats.total_teachers}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span style="color:var(--text-muted)">الدورات</span>
                  <span class="mono" style="font-weight:700">${stats.total_courses}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 0">
                  <span style="color:var(--text-muted)">حضور اليوم</span>
                  <span class="mono" style="font-weight:700;color:var(--success)">${stats.today_attendance_rate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ في تحميل البيانات</div><div class="description">${err.message}</div></div>`;
    }
  }

  function statCard(icon, color, value, label) {
    return `
      <div class="stat-card">
        <div class="stat-icon ${color}">${icon}</div>
        <div>
          <div class="stat-value count-up">${value}</div>
          <div class="stat-label">${label}</div>
        </div>
      </div>
    `;
  }

  return { render };
})();
