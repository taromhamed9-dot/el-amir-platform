const TeacherSchedule = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/teacher/schedule');
      const sessions = data.schedule || [];

      if (sessions.length === 0) {
        page.innerHTML = `<div class="empty-state"><div class="icon">${Icons.schedule}</div><div class="title">لا توجد حصص في جدولك</div></div>`;
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
          const session = sessions.find(s => s.day_of_week === day && s.start_time && s.start_time.startsWith(hour.split(':')[0]));
          if (session) {
            html += `<div class="session-cell has-session">
              <div class="course-name">${session.courses ? session.courses.name : ''}</div>
              <div class="room-label">${session.courses ? session.courses.level : ''} ${session.room ? '• '+session.room : ''}</div>
            </div>`;
          } else {
            html += '<div class="session-cell"></div>';
          }
        });
      });

      html += '</div>';
      page.innerHTML = html;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render };
})();
