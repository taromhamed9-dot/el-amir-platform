const StudentDashboard = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/student/dashboard');
      const s = data.student;
      const user = Auth.getUser();

      page.innerHTML = `
        <div class="student-dashboard">
          <div class="welcome-card">
            <h2>مرحباً ${user ? user.full_name : ''}!</h2>
            <p class="subtitle">${s && s.courses ? s.courses.name + ' • ' + s.courses.subject : 'لم يتم تعيين دورة بعد'}</p>
          </div>

          <div class="quick-stats stagger">
            <div class="stat-card">
              <div class="stat-icon blue">${Icons.courses}</div>
              <div>
                <div class="stat-value">${s && s.courses ? s.courses.name : '—'}</div>
                <div class="stat-label">الدورة</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon gold">${Icons.teachers}</div>
              <div>
                <div class="stat-value">${s && s.teachers ? s.teachers.full_name : '—'}</div>
                <div class="stat-label">الأستاذ</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green">${Icons.attendance}</div>
              <div>
                <div class="stat-value">${data.attendance_rate}%</div>
                <div class="stat-label">نسبة الحضور</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon ${data.payment_status === 'paid' ? 'green' : 'red'}">${Icons.payments}</div>
              <div>
                <div class="stat-value">${Utils.getStatusBadge(data.payment_status)}</div>
                <div class="stat-label">دفع هذا الشهر</div>
              </div>
            </div>
          </div>

          <div class="grid-2 mt-24">
            <div class="card">
              <div class="card-header"><span class="card-title">حصصي هذا الأسبوع</span></div>
              ${data.schedule.length > 0 ? data.schedule.map(s => `
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
                  <span style="color:var(--accent);min-width:60px;font-weight:600">${Utils.getArabicDay(s.day_of_week)}</span>
                  <span class="mono">${Utils.formatTime(s.start_time)} - ${Utils.formatTime(s.end_time)}</span>
                  <span style="color:var(--text-muted);font-size:0.82rem">${s.room ? 'القاعة: '+s.room : ''}</span>
                </div>
              `).join('') : '<p style="color:var(--text-muted)">لا توجد حصص</p>'}
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">الإشعارات</span></div>
              ${data.notifications.length > 0 ? data.notifications.map(n => `
                <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                  <div style="font-size:0.85rem;font-weight:600">${n.title}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted)">${n.message}</div>
                </div>
              `).join('') : '<p style="color:var(--text-muted)">لا توجد إشعارات</p>'}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render };
})();
