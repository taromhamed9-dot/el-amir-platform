const StudentAttendanceView = (() => {
  let allRecords = [];
  let currentMonth = (Utils.getCurrentMonth ? Utils.getCurrentMonth() : new Date().toISOString().slice(0, 7));
  let statusFilter = '';

  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/student/attendance');
      const s = data.summary || {};
      allRecords = data.attendance || [];

      page.innerHTML = `
        <div class="grid grid-4 mb-24 stagger">
          <div class="stat-card"><div class="stat-icon blue">${Icons.courses}</div><div><div class="stat-value">${s.total || 0}</div><div class="stat-label">إجمالي الحصص</div></div></div>
          <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div><div class="stat-value">${s.present || 0}</div><div class="stat-label">حاضر</div></div></div>
          <div class="stat-card"><div class="stat-icon red">${Icons.cross}</div><div><div class="stat-value">${s.absent || 0}</div><div class="stat-label">غائب</div></div></div>
          <div class="stat-card"><div class="stat-icon gold">${Icons.stats}</div><div><div class="stat-value">${s.rate || 0}%</div><div class="stat-label">النسبة</div></div></div>
        </div>

        <div class="progress-bar mb-24" style="height:12px">
          <div class="fill green" style="width:${s.rate || 0}%"></div>
        </div>

        <div class="card mb-20">
          <div class="filters-bar payments-filters">
            <input type="month" class="form-input" style="width:auto"
              id="stu-att-month" value="${currentMonth}"
              onchange="StudentAttendanceView.onMonthChange(this.value)" title="الشهر">
            <select class="form-select" id="stu-att-status" onchange="StudentAttendanceView.onStatusChange(this.value)" title="حالة الحضور">
              <option value="">كل الحالات</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="excused">معذور</option>
            </select>
          </div>
        </div>

        <div id="stu-att-matrix"></div>
      `;

      renderMatrix();
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function onMonthChange(v) { currentMonth = v; renderMatrix(); }
  function onStatusChange(v) { statusFilter = v; renderMatrix(); }

  function renderMatrix() {
    const container = document.getElementById('stu-att-matrix');
    if (!container) return;

    const [year, m] = currentMonth.split('-');
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                        'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${year}`;

    // Filter records for this month
    let monthRecords = allRecords.filter(r => r.session_date && r.session_date.startsWith(currentMonth));
    monthRecords.sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));

    if (monthRecords.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.checkSquare || Icons.attendance}</div><div class="title">لا توجد سجلات حضور لشهر ${monthLabel}</div></div>`;
      return;
    }

    const headers = monthRecords.map((r, i) => `
      <th class="session-header" style="text-align:center;min-width:80px" title="${r.session_date}">
        <div style="font-size:0.7rem;opacity:0.6;font-weight:400;margin-bottom:2px">حصة</div>
        <div style="font-size:1rem">${i + 1}</div>
        <div style="font-size:0.65rem;opacity:0.5;margin-top:2px">${(r.session_date || '').slice(5)}</div>
      </th>
    `).join('');

    const cells = monthRecords.map(r => {
      const status = r.status;
      const dim = (statusFilter && status !== statusFilter) ? 'opacity:0.25;' : '';
      let cls = 'empty', icon = '', title = 'غير مسجل';
      if (status === 'present') { cls = 'present'; icon = Icons.check; title = 'حاضر'; }
      else if (status === 'absent') { cls = 'absent'; icon = Icons.cross; title = 'غائب'; }
      else if (status === 'late') { cls = 'late'; icon = Icons.clock; title = 'متأخر'; }
      else if (status === 'excused') { cls = 'excused'; icon = Icons.info; title = 'معذور'; }
      return `<td style="text-align:center;padding:4px;">
        <div class="matrix-square ${cls}" style="${dim}" title="${title} — ${r.session_date}">${icon}</div>
      </td>`;
    }).join('');

    container.innerHTML = `
      <div class="matrix-month-header">
        <span>${monthLabel}</span>
        <span class="matrix-session-badge">${monthRecords.length} حصص</span>
      </div>
      <div class="table-container" style="overflow-x:auto;">
        <table class="data-table matrix-table">
          <thead><tr><th style="min-width:140px">حضوري</th>${headers}</tr></thead>
          <tbody>
            <tr><td style="font-weight:600">${monthLabel}</td>${cells}</tr>
          </tbody>
        </table>
      </div>
      <div class="matrix-legend">
        <div class="matrix-legend-item"><div class="matrix-square present" style="width:20px;height:20px;pointer-events:none">${Icons.check}</div> حاضر</div>
        <div class="matrix-legend-item"><div class="matrix-square absent"  style="width:20px;height:20px;pointer-events:none">${Icons.cross}</div> غائب</div>
        <div class="matrix-legend-item"><div class="matrix-square late"    style="width:20px;height:20px;pointer-events:none">${Icons.clock}</div> متأخر</div>
        <div class="matrix-legend-item"><div class="matrix-square excused" style="width:20px;height:20px;pointer-events:none">${Icons.info}</div> معذور</div>
      </div>
    `;
  }

  return { render, onMonthChange, onStatusChange };
})();
