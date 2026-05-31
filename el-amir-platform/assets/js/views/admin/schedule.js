const AdminSchedule = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <h2 style="font-size:1.1rem" class="mb-20">${Icons.schedule} الجداول الزمنية</h2>
      <div class="filters-bar mb-20">
        <select class="form-select" id="schedule-teacher-filter" onchange="AdminSchedule.load()">
          <option value="">كل الأساتذة</option>
        </select>
      </div>
      <div id="schedule-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    try {
      const data = await API.get('/admin/teachers');
      const select = document.getElementById('schedule-teacher-filter');
      (data.teachers || []).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.full_name;
        select.appendChild(opt);
      });
    } catch (_) {}
    await load();
  }

  async function load() {
    const container = document.getElementById('schedule-container');
    const teacherId = document.getElementById('schedule-teacher-filter')?.value;
    try {
      const params = teacherId ? `?teacher_id=${teacherId}` : '';
      const data = await API.get(`/admin/courses${params}`);
      const courses = data.courses || [];

      const allSessions = [];
      for (const c of courses) {
        try {
          const cd = await API.get(`/admin/courses/${c.id}`);
          (cd.sessions || []).forEach(s => allSessions.push({ ...s, course_name: c.name, course_level: c.level }));
        } catch (_) {}
      }

      if (allSessions.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.schedule}</div><div class="title">لا توجد حصص</div></div>`;
        return;
      }

      const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const hours = [];
      for (let h = 8; h <= 20; h++) hours.push(`${String(h).padStart(2, '0')}:00`);

      let html = '<div class="schedule-grid">';
      html += '<div class="header-cell"></div>';
      days.forEach(d => { html += `<div class="header-cell">${Utils.getArabicDay(d)}</div>`; });

      hours.forEach(hour => {
        html += `<div class="time-cell">${hour}</div>`;
        days.forEach(day => {
          const session = allSessions.find(s => s.day_of_week === day && s.start_time && s.start_time.startsWith(hour.split(':')[0]));
          if (session) {
            html += `<div class="session-cell has-session"><div class="course-name">${session.course_name}</div><div class="room-label">${session.course_level} ${session.room ? '• '+session.room : ''}</div></div>`;
          } else {
            html += '<div class="session-cell"></div>';
          }
        });
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render, load };
})();
