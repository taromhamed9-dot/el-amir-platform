const TeacherDashboard = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/teacher/dashboard');
      page.innerHTML = `
        <div class="teacher-dashboard">
          <div class="grid grid-4 mb-24 stagger">
            <div class="stat-card"><div class="stat-icon blue">${Icons.courses}</div><div><div class="stat-value">${data.my_courses.length}</div><div class="stat-label">دوراتي</div></div></div>
            <div class="stat-card"><div class="stat-icon gold">${Icons.students}</div><div><div class="stat-value">${data.students_count}</div><div class="stat-label">تلاميذي</div></div></div>
            <div class="stat-card"><div class="stat-icon green">${Icons.attendance}</div><div><div class="stat-value">${data.weekly_attendance_rate}%</div><div class="stat-label">حضور الأسبوع</div></div></div>
            <div class="stat-card"><div class="stat-icon orange">${Icons.requests}</div><div><div class="stat-value">${data.pending_requests_count}</div><div class="stat-label">طلبات معلقة</div></div></div>
          </div>

          <h3 style="margin-bottom:12px">حصص اليوم</h3>
          <div class="today-sessions mb-24">
            ${data.today_sessions.length > 0 ? data.today_sessions.map(s => `
              <div class="session-card">
                <div class="time">${Utils.formatTime(s.start_time)} - ${Utils.formatTime(s.end_time)}</div>
                <div class="info">
                  <div class="course-name">${s.courses ? s.courses.name : ''}</div>
                  <div class="room">${s.room ? 'القاعة: ' + s.room : ''} ${s.courses ? '• ' + s.courses.level : ''}</div>
                </div>
                <a href="#/teacher/attendance" class="btn btn-primary btn-sm">تسجيل الحضور</a>
              </div>
            `).join('') : '<div class="card" style="padding:20px;text-align:center;color:var(--text-muted)">لا توجد حصص اليوم</div>'}
          </div>

          <h3 style="margin-bottom:12px">دوراتي</h3>
          <div class="grid grid-3">
            ${data.my_courses.map(c => `
              <div class="card">
                <div style="font-weight:600;margin-bottom:4px">${c.name}</div>
                <div style="font-size:0.82rem;color:var(--text-muted)">${c.subject} • ${c.level}</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">${c.enrolled_count}/${c.capacity} تلميذ</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render };
})();
