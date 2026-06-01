// ─────────────────────────────────────────────────────────────
//  Admin · Payments  (v2 — per-course / per-month grid)
// ─────────────────────────────────────────────────────────────
//
// Mental model:
//   • Stats and the grid are scoped to a SINGLE (course, month) pair.
//   • A student row is either `monthly` (1 wide cell across all session
//     columns) or `per_session` (N independent checkboxes).
//   • "توليد" is per (course, month) and idempotent.
//   • A second view ("عرض التلميذ") flips the axis: pick a student, get a
//     timeline of all their courses × months.
//   • Per-course session settings live in localStorage keyed by course_id
//     so each course can have its own column count / labels.
//
const AdminPayments = (() => {
  /* ── State ─────────────────────────────────────────────── */
  let currentView = 'course'; // 'course' | 'student'
  let currentFilters = {
    month: Utils.getCurrentMonth(),
    course_id: '',
    status: ''
  };
  let coursesCache = [];        // populated lazily so the filter dropdown is fast
  let currentData = null;       // last response from /admin/payments
  let selectedPaymentIds = new Set();
  let studentSearchResults = []; // for Student View

  // Per-COURSE config (was per-month in v1). Shape:
  //   { [course_id]: { count, sessionLabels[], monthLabels[YYYY-MM] } }
  let sessionConfig = JSON.parse(localStorage.getItem('sessions_per_course_config_v2')) || {};

  function getSessionCount(courseId, courseSessionsPerMonth) {
    const cfg = sessionConfig[courseId];
    if (cfg && cfg.count) return cfg.count;
    return courseSessionsPerMonth || 4;
  }

  function getSessionLabel(courseId, sessionNum, month) {
    const cfg = sessionConfig[courseId] || {};
    if (cfg.sessionLabels && cfg.sessionLabels[sessionNum - 1]) {
      return cfg.sessionLabels[sessionNum - 1];
    }
    const monthName = Utils.getArabicMonthName(month);
    return monthName ? `حصة ${sessionNum} شهر ${monthName}` : `حصة ${sessionNum}`;
  }

  function getDefaultMonthLabel(month) {
    const [year, m] = month.split('-');
    const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return `${names[parseInt(m, 10) - 1]} ${year}`;
  }

  /* ── Render shell ──────────────────────────────────────── */
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 payments-header">
        <h2 style="font-size:1.1rem">${Icons.payments} متابعة الدفع</h2>
        <div class="payments-actions" style="display:flex;gap:8px;flex-wrap:wrap">
          <div class="view-toggle" role="tablist" style="display:inline-flex;gap:4px;background:rgba(45,31,80,0.4);padding:4px;border-radius:8px">
            <button id="pv-course-tab" class="btn btn-sm btn-accent" onclick="AdminPayments.setView('course')">عرض الدورة</button>
            <button id="pv-student-tab" class="btn btn-sm btn-ghost" onclick="AdminPayments.setView('student')">عرض التلميذ</button>
          </div>
          <button class="btn btn-outline btn-sm" onclick="AdminPayments.showSessionSettings()" id="pv-settings-btn">${Icons.settings} إعدادات الحصص</button>
          <button class="btn btn-accent btn-sm" onclick="AdminPayments.showGenerateModal()" id="pv-generate-btn">${Icons.generate} توليد الدفعات</button>
          <button class="btn btn-outline btn-sm" onclick="AdminPayments.exportPayments()">${Icons.export} تصدير</button>
        </div>
      </div>

      <div id="payment-summary" class="grid grid-4 mb-20"></div>

      <div id="payment-controls"></div>

      <div id="payments-container">
        <div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div>
      </div>
    `;
    await loadCoursesCache();
    renderControls();
    if (currentView === 'course') {
      await loadPayments();
    } else {
      renderStudentView();
    }
  }

  async function loadCoursesCache() {
    if (coursesCache.length > 0) return;
    try {
      const d = await API.get('/admin/courses');
      coursesCache = d.courses || [];
    } catch (_) { coursesCache = []; }
  }

  function setView(v) {
    currentView = v;
    document.getElementById('pv-course-tab').className =
      v === 'course' ? 'btn btn-sm btn-accent' : 'btn btn-sm btn-ghost';
    document.getElementById('pv-student-tab').className =
      v === 'student' ? 'btn btn-sm btn-accent' : 'btn btn-sm btn-ghost';

    // Course-only buttons
    const generateBtn = document.getElementById('pv-generate-btn');
    const settingsBtn = document.getElementById('pv-settings-btn');
    if (generateBtn) generateBtn.style.display = v === 'course' ? '' : 'none';
    if (settingsBtn) settingsBtn.style.display = v === 'course' ? '' : 'none';

    selectedPaymentIds.clear();
    renderControls();
    if (v === 'course') {
      loadPayments();
    } else {
      renderStudentView();
    }
  }

  function renderControls() {
    const el = document.getElementById('payment-controls');
    if (!el) return;
    if (currentView === 'course') {
      const courseOptions = coursesCache.map(c =>
        `<option value="${c.id}" ${currentFilters.course_id === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)} (${c.level})</option>`
      ).join('');
      el.innerHTML = `
        <div class="card mb-20">
          <div class="filters-bar payments-filters">
            <select class="form-select" id="pv-course-filter" onchange="AdminPayments.setCourse(this.value)">
              <option value="">— اختر الدورة —</option>
              ${courseOptions}
            </select>
            <input type="month" class="form-input" style="width:auto" id="pv-month-filter"
              value="${currentFilters.month}" onchange="AdminPayments.setMonth(this.value)">
            <select class="form-select" id="pv-status-filter" onchange="AdminPayments.setStatus(this.value)">
              <option value="">كل الحالات</option>
              <option value="paid">مدفوع</option>
              <option value="unpaid">غير مدفوع</option>
            </select>
            <div id="pv-bulk-action" style="display:none;margin-inline-start:auto">
              <button class="btn btn-accent btn-sm" onclick="AdminPayments.bulkMarkPaid()">${Icons.check} تحديد كمدفوع (<span id="pv-selected-count">0</span>)</button>
              <button class="btn btn-outline btn-sm" onclick="AdminPayments.clearSelection()">إلغاء التحديد</button>
            </div>
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="card mb-20">
          <div class="filters-bar payments-filters">
            <div class="search-input-wrapper" style="position:relative;flex:1;min-width:240px;max-width:400px">
              <input type="text" class="form-input search-input" id="pv-student-search"
                placeholder="ابحث عن تلميذ بالاسم..."
                oninput="AdminPayments.searchStudentTimeline(this.value)">
            </div>
            <small style="color:var(--text-muted)">اكتب جزءاً من الاسم لعرض كل دفعاته</small>
          </div>
        </div>
      `;
    }
  }

  /* ── COURSE VIEW ───────────────────────────────────────── */
  async function loadPayments() {
    const container = document.getElementById('payments-container');
    const summaryEl = document.getElementById('payment-summary');
    selectedPaymentIds.clear();
    updateBulkBar();

    if (!currentFilters.course_id) {
      summaryEl.innerHTML = '';
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${Icons.courses}</div>
          <div class="title">اختر دورة لعرض الدفعات</div>
          <div class="description">حدد الدورة من القائمة أعلاه ثم اختر الشهر.</div>
        </div>`;
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('month', currentFilters.month);
      params.set('course_id', currentFilters.course_id);
      if (currentFilters.status) params.set('status', currentFilters.status);

      const data = await API.get(`/admin/payments?${params}`);
      currentData = data;
      renderCourseGrid(data);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${Icons.warning}</div>
          <div class="title">خطأ في تحميل البيانات</div>
          <div class="description">${Utils.escapeHtml(err.message)}</div>
        </div>`;
    }
  }

  function renderCourseGrid(data) {
    const container = document.getElementById('payments-container');
    const summaryEl = document.getElementById('payment-summary');
    const courseId  = currentFilters.course_id;
    const month     = currentFilters.month;
    const course    = data.course || coursesCache.find(c => c.id === courseId) || {};
    const sessionPrice = Number(course.session_price) || 0;
    const sessionCount = getSessionCount(courseId, course.sessions_per_month);
    const monthLabel   = getDefaultMonthLabel(month);

    const payments = data.payments || [];
    const enrolled = data.students || [];

    /* ── Stats — scoped to (course, month) ─────────────────── */
    const expected  = Number(data.summary?.total_expected || 0);
    const collected = Number(data.summary?.collected || 0);
    const remaining = Number(data.summary?.remaining || expected - collected);
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    summaryEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon gold">${Icons.money}</div><div>
        <div class="stat-value">${Utils.formatCurrency(expected)}</div>
        <div class="stat-label">المتوقع</div>
      </div></div>
      <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div>
        <div class="stat-value">${Utils.formatCurrency(collected)}</div>
        <div class="stat-label">المحصّل (${paidCount})</div>
      </div></div>
      <div class="stat-card"><div class="stat-icon red">${Icons.cross}</div><div>
        <div class="stat-value">${Utils.formatCurrency(remaining)}</div>
        <div class="stat-label">المتبقي</div>
      </div></div>
      <div class="stat-card"><div class="stat-icon blue">${Icons.students}</div><div>
        <div class="stat-value">${enrolled.length}</div>
        <div class="stat-label">التلاميذ — ${pct}% محصّل</div>
        <div class="progress-bar mt-12" style="height:6px">
          <div class="fill green" style="width:${pct}%"></div>
        </div>
      </div></div>
    `;

    /* ── Group payments by student id ──────────────────────── */
    const byStudent = {};
    payments.forEach(p => {
      const sid = p.student_id;
      if (!byStudent[sid]) byStudent[sid] = [];
      byStudent[sid].push(p);
    });

    /* ── Build row list — every enrolled student, even with 0 payments ─ */
    const rows = enrolled.map(s => {
      const pays = (byStudent[s.id] || []).slice().sort(
        (a, b) => (a.session_number || 1) - (b.session_number || 1)
      );
      return { student: s, payments: pays };
    });

    // If status filter is on, drop rows whose payments don't match
    const filteredRows = currentFilters.status
      ? rows.filter(r => r.payments.some(p => p.status === currentFilters.status))
      : rows;

    /* ── Header — N session columns + Total ──────────────── */
    let sessionHeaders = '';
    for (let i = 1; i <= sessionCount; i++) {
      const label = getSessionLabel(courseId, i, month);
      sessionHeaders += `<th class="session-header" style="text-align:center;min-width:90px;max-width:140px"
        title="${Utils.escapeHtml(label)}">${Utils.escapeHtml(label)}</th>`;
    }

    let html = `
      <div class="matrix-month-header">
        <span>${Utils.escapeHtml(course.name || '—')} — ${monthLabel}</span>
        <span class="matrix-session-badge">
          ${sessionCount} حصة × ${Utils.formatCurrency(sessionPrice)} = ${Utils.formatCurrency(sessionPrice * sessionCount)} / شهر
        </span>
      </div>
      <div class="table-container" style="overflow-x:auto">
        <table class="data-table matrix-table payments-grid">
          <thead>
            <tr>
              <th style="width:40px;text-align:center"><input type="checkbox" id="pv-select-all" onchange="AdminPayments.toggleSelectAll(this.checked)"></th>
              <th style="min-width:160px;position:sticky;right:40px;background:var(--bg-card);z-index:2">اسم التلميذ</th>
              <th style="min-width:90px">نوع الدفع</th>
              ${sessionHeaders}
              <th style="min-width:110px;text-align:center">المجموع</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredRows.length === 0) {
      html += `<tr><td colspan="${sessionCount + 4}" style="text-align:center;padding:32px;color:var(--text-muted)">
        لا يوجد تلاميذ نشطين في هذه الدورة. سجّل تلاميذ ثم اضغط <strong>توليد الدفعات</strong>.
      </td></tr>`;
    } else {
      filteredRows.forEach((row, idx) => {
        html += renderStudentRow(row, sessionCount, sessionPrice, idx);
      });
    }

    html += `
          </tbody>
        </table>
      </div>
      <div class="matrix-legend">
        <div class="matrix-legend-item"><div class="matrix-square paid" style="width:20px;height:20px;pointer-events:none">${Icons.check}</div> مدفوع</div>
        <div class="matrix-legend-item"><div class="matrix-square unpaid" style="width:20px;height:20px;pointer-events:none"></div> غير مدفوع</div>
        <div class="matrix-legend-item"><div class="matrix-square empty" style="width:20px;height:20px;pointer-events:none"></div> غير مولّد</div>
        <div class="matrix-legend-item" style="color:var(--text-muted)">انقر على المربع لتبديل الحالة، أو حدد عدة صفوف ثم اضغط "تحديد كمدفوع"</div>
      </div>
    `;
    container.innerHTML = html;
  }

  function renderStudentRow(row, sessionCount, sessionPrice, idx) {
    const s     = row.student;
    const pays  = row.payments;
    const model = s.payment_model || 'per_session';
    const bg    = idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)';

    let cells = '';
    let rowTotal = 0;
    let selectableIds = [];

    if (model === 'monthly') {
      // Find the single monthly row (session_number = 1).
      const p = pays.find(pp => (pp.session_number || 1) === 1);
      if (!p) {
        cells = `<td colspan="${sessionCount}" style="text-align:center;padding:6px;color:var(--text-muted);font-size:0.85rem">
          غير مولّد — اضغط "توليد الدفعات"
        </td>`;
      } else {
        const isPaid = p.status === 'paid';
        const cls    = isPaid ? 'paid' : 'unpaid';
        const label  = `دفعة شهرية — ${Utils.formatCurrency(p.amount)} — ${isPaid ? 'مدفوع' : 'غير مدفوع'}`;
        selectableIds.push(p.id);
        if (isPaid) rowTotal = Number(p.amount);
        cells = `<td colspan="${sessionCount}" style="text-align:center;padding:6px">
          <div class="matrix-bar ${cls}" title="${Utils.escapeHtml(label)}"
            onclick="AdminPayments.togglePay('${p.id}','${p.status}')">
            ${isPaid ? Icons.check : ''}
            <span style="margin-inline-start:8px">${Utils.formatCurrency(p.amount)}</span>
          </div>
        </td>`;
      }
    } else {
      // per_session — one cell per slot
      for (let n = 1; n <= sessionCount; n++) {
        const p = pays.find(pp => (pp.session_number || 1) === n);
        if (!p) {
          cells += `<td style="text-align:center;padding:4px">
            <div class="matrix-square empty" title="غير مولّد"></div>
          </td>`;
        } else {
          const isPaid = p.status === 'paid';
          const cls    = isPaid ? 'paid' : 'unpaid';
          const label  = `الحصة ${n} — ${Utils.formatCurrency(p.amount)} — ${isPaid ? 'مدفوع' : 'غير مدفوع'}`;
          selectableIds.push(p.id);
          if (isPaid) rowTotal += Number(p.amount);
          cells += `<td style="text-align:center;padding:4px">
            <div class="matrix-square ${cls}" title="${Utils.escapeHtml(label)}"
              onclick="AdminPayments.togglePay('${p.id}','${p.status}')">
              ${isPaid ? Icons.check : ''}
            </div>
          </td>`;
        }
      }
    }

    const modelBadge = model === 'monthly'
      ? '<span class="badge badge-info" style="background:rgba(124,58,237,0.15);color:var(--primary-light)">شهري</span>'
      : '<span class="badge badge-info" style="background:rgba(232,184,75,0.15);color:var(--accent)">حصة/حصة</span>';

    const totalLabel = model === 'monthly'
      ? Utils.formatCurrency(rowTotal)
      : `${Utils.formatCurrency(rowTotal)} <small style="color:var(--text-muted)">${Utils.formatCurrency(sessionPrice)} × ${pays.filter(p => p.status === 'paid').length}</small>`;

    return `
      <tr data-student-id="${s.id}" data-payment-ids="${selectableIds.join(',')}" style="background:${bg}">
        <td style="text-align:center;vertical-align:middle">
          <input type="checkbox" class="pv-row-checkbox" data-ids="${selectableIds.join(',')}"
            onchange="AdminPayments.toggleRowSelection(this)">
        </td>
        <td style="font-weight:600;position:sticky;right:40px;background:inherit;z-index:1;border-left:1px solid var(--border);max-width:200px">
          <div class="rtl-cell">${Utils.escapeHtml(`${s.first_name} ${s.last_name}`)}</div>
          ${s.phone ? `<div class="mono" style="font-size:0.72rem;color:var(--text-muted)">${Utils.escapeHtml(s.phone)}</div>` : ''}
        </td>
        <td style="text-align:center">${modelBadge}</td>
        ${cells}
        <td style="text-align:center;font-weight:700;color:${rowTotal > 0 ? 'var(--success)' : 'var(--text-muted)'}">${totalLabel}</td>
      </tr>
    `;
  }

  /* ── Selection / Bulk actions ──────────────────────────── */
  function toggleSelectAll(checked) {
    document.querySelectorAll('.pv-row-checkbox').forEach(cb => {
      cb.checked = checked;
      toggleRowSelection(cb);
    });
  }

  function toggleRowSelection(checkbox) {
    const ids = (checkbox.dataset.ids || '').split(',').filter(Boolean);
    if (checkbox.checked) ids.forEach(id => selectedPaymentIds.add(id));
    else                  ids.forEach(id => selectedPaymentIds.delete(id));
    updateBulkBar();
  }

  function clearSelection() {
    selectedPaymentIds.clear();
    document.querySelectorAll('.pv-row-checkbox').forEach(cb => { cb.checked = false; });
    const all = document.getElementById('pv-select-all');
    if (all) all.checked = false;
    updateBulkBar();
  }

  function updateBulkBar() {
    const bar = document.getElementById('pv-bulk-action');
    const count = document.getElementById('pv-selected-count');
    if (!bar) return;
    bar.style.display = selectedPaymentIds.size > 0 ? '' : 'none';
    if (count) count.textContent = selectedPaymentIds.size;
  }

  async function bulkMarkPaid() {
    if (selectedPaymentIds.size === 0) return;
    try {
      const ids = Array.from(selectedPaymentIds);
      const r = await API.post('/admin/payments/bulk-mark', { payment_ids: ids, status: 'paid' });
      Toast.success(`تم تحديد ${r.updated} دفعة كمدفوع`);
      clearSelection();
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Toggle single cell ────────────────────────────────── */
  async function togglePay(id, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await API.patch(`/admin/payments/${id}/verify`, { status: newStatus });
      Toast.success(newStatus === 'paid' ? 'تم تأكيد الدفع' : 'تم إلغاء الدفع');
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Filters ───────────────────────────────────────────── */
  function setMonth(v)  { currentFilters.month = v; loadPayments(); }
  function setCourse(v) { currentFilters.course_id = v; loadPayments(); }
  function setStatus(v) { currentFilters.status = v || ''; loadPayments(); }

  /* ── STUDENT VIEW ──────────────────────────────────────── */
  function renderStudentView() {
    const summaryEl = document.getElementById('payment-summary');
    const container = document.getElementById('payments-container');
    summaryEl.innerHTML = '';
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">${Icons.students}</div>
        <div class="title">ابحث عن تلميذ</div>
        <div class="description">اكتب اسم التلميذ في الحقل أعلاه لعرض جدول دفعاته الكامل عبر كل الدورات والأشهر.</div>
      </div>`;
  }

  const searchStudentTimeline = Utils.debounce(async function(q) {
    if (!q || q.trim().length < 2) {
      renderStudentView();
      return;
    }
    const container = document.getElementById('payments-container');
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted)">جاري البحث...</div>`;
    try {
      const d = await API.get(`/admin/students?search=${encodeURIComponent(q)}&limit=15`);
      studentSearchResults = d.students || [];
      if (studentSearchResults.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">لا توجد نتائج</div></div>`;
        return;
      }
      // If exactly one match → auto-open. Otherwise show a picker.
      if (studentSearchResults.length === 1) {
        openStudentTimeline(studentSearchResults[0].id);
      } else {
        let html = `<div class="card"><h3 style="margin-bottom:12px">${studentSearchResults.length} نتيجة</h3>
          <div style="display:grid;gap:8px">`;
        studentSearchResults.forEach(s => {
          html += `<button class="btn btn-outline" onclick="AdminPayments.openStudentTimeline('${s.id}')" style="justify-content:flex-start;text-align:start">
            <strong>${Utils.escapeHtml(s.first_name)} ${Utils.escapeHtml(s.last_name)}</strong>
            <span style="margin-inline-start:auto;color:var(--text-muted);font-size:0.85rem">${s.level || ''} · ${s.courses?.name || 'بدون دورة'}</span>
          </button>`;
        });
        html += `</div></div>`;
        container.innerHTML = html;
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ: ${Utils.escapeHtml(err.message)}</div></div>`;
    }
  }, 350);

  async function openStudentTimeline(studentId) {
    const container = document.getElementById('payments-container');
    const summaryEl = document.getElementById('payment-summary');
    summaryEl.innerHTML = '';
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted)">جاري التحميل...</div>`;

    try {
      const sData = await API.get(`/admin/students/${studentId}`);
      const s = sData.student;
      const allPayments = sData.payments || [];

      // Group by month then by course
      const byMonth = {};
      allPayments.forEach(p => {
        const key = p.month;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(p);
      });
      const months = Object.keys(byMonth).sort().reverse();

      let timeline = '';
      if (months.length === 0) {
        timeline = `<div class="empty-state"><div class="icon">${Icons.payments}</div><div class="title">لا توجد دفعات</div></div>`;
      } else {
        timeline = `<div class="timeline">`;
        months.forEach(m => {
          const rows = byMonth[m];
          const monthLabel = getDefaultMonthLabel(m);
          const monthPaid    = rows.filter(r => r.status === 'paid').reduce((a, b) => a + Number(b.amount), 0);
          const monthExpect  = rows.reduce((a, b) => a + Number(b.amount), 0);
          const monthRemain  = monthExpect - monthPaid;
          const pct = monthExpect > 0 ? Math.round((monthPaid / monthExpect) * 100) : 0;
          timeline += `
            <div class="card timeline-month">
              <div class="timeline-month-header">
                <strong>${monthLabel}</strong>
                <span style="color:${pct === 100 ? 'var(--success)' : pct > 0 ? 'var(--warning)' : 'var(--danger)'}">${pct}% — ${Utils.formatCurrency(monthPaid)} / ${Utils.formatCurrency(monthExpect)}</span>
              </div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr><th>الحصة</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الدفع</th></tr>
                  </thead>
                  <tbody>
                    ${rows.sort((a, b) => (a.session_number || 1) - (b.session_number || 1)).map(p => `
                      <tr>
                        <td>${p.session_number === 1 && rows.length === 1 ? 'الشهر كاملاً' : `الحصة ${p.session_number}`}</td>
                        <td class="mono">${Utils.formatCurrency(p.amount)}</td>
                        <td>${Utils.getStatusBadge(p.status)}</td>
                        <td class="mono" style="font-size:0.8rem;color:var(--text-muted)">${p.verified_at ? Utils.formatDate(p.verified_at) : '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ${monthRemain > 0 ? `<div style="margin-top:8px;color:var(--danger);font-size:0.85rem">المتبقي: ${Utils.formatCurrency(monthRemain)}</div>` : ''}
            </div>
          `;
        });
        timeline += `</div>`;
      }

      const totalPaid = allPayments.filter(p => p.status === 'paid').reduce((a, b) => a + Number(b.amount), 0);
      const totalExpect = allPayments.reduce((a, b) => a + Number(b.amount), 0);

      summaryEl.innerHTML = `
        <div class="stat-card"><div class="stat-icon blue">${Icons.students}</div><div>
          <div class="stat-value" style="font-size:1.1rem">${Utils.escapeHtml(`${s.first_name} ${s.last_name}`)}</div>
          <div class="stat-label">${s.level || ''} · ${s.payment_model === 'monthly' ? 'شهري' : 'حصة/حصة'}</div>
        </div></div>
        <div class="stat-card"><div class="stat-icon gold">${Icons.money}</div><div>
          <div class="stat-value">${Utils.formatCurrency(totalExpect)}</div>
          <div class="stat-label">إجمالي المتوقع</div>
        </div></div>
        <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div>
          <div class="stat-value">${Utils.formatCurrency(totalPaid)}</div>
          <div class="stat-label">إجمالي المدفوع</div>
        </div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.cross}</div><div>
          <div class="stat-value">${Utils.formatCurrency(totalExpect - totalPaid)}</div>
          <div class="stat-label">إجمالي المتبقي</div>
        </div></div>
      `;
      container.innerHTML = timeline;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ: ${Utils.escapeHtml(err.message)}</div></div>`;
    }
  }

  /* ── Session settings — PER COURSE ─────────────────────── */
  function showSessionSettings() {
    if (!currentFilters.course_id) {
      Toast.warning('اختر دورة أولاً');
      return;
    }
    const courseId = currentFilters.course_id;
    const course   = (currentData && currentData.course) || coursesCache.find(c => c.id === courseId) || {};
    const count    = getSessionCount(courseId, course.sessions_per_month);
    const cfg      = sessionConfig[courseId] || {};
    const labels   = cfg.sessionLabels || [];

    const formHtml = `
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:14px">
        إعدادات الحصص لدورة <strong style="color:var(--accent)">${Utils.escapeHtml(course.name || '')}</strong>
      </p>
      <form id="session-settings-form" onsubmit="AdminPayments.saveSessionSettings(event,'${courseId}')">
        <div class="form-group-modern">
          <label>عدد الحصص في الشهر</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <button type="button" class="btn btn-outline btn-sm" onclick="AdminPayments._adjustCount(-1)">− حصة</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="AdminPayments._adjustCount(1)">+ حصة</button>
            ${[4, 6, 8, 12].map(n => `
              <button type="button"
                class="btn ${count === n ? 'btn-accent' : 'btn-outline'} btn-sm session-preset-btn"
                onclick="AdminPayments._pickPreset(${n})">${n}</button>
            `).join('')}
          </div>
          <input type="number" id="session-count-input" class="form-input"
            value="${count}" min="1" max="20"
            oninput="AdminPayments._rebuildLabelInputs()">
        </div>
        <div class="form-group-modern">
          <label>عناوين الحصص (اختياري)</label>
          <div id="session-labels-container" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
            ${Array.from({ length: count }, (_, i) => `
              <input type="text" class="form-input session-label-input" data-idx="${i}"
                value="${Utils.escapeHtml(labels[i] || '')}"
                placeholder="الحصة ${i + 1}">
            `).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" class="btn btn-accent" style="flex:1">حفظ الإعدادات</button>
          <button type="button" class="btn btn-outline" onclick="AdminPayments.resetSessionSettings('${courseId}')">استعادة الافتراضي</button>
        </div>
      </form>
    `;
    Modal.open({ title: `${Icons.settings} إعدادات الحصص — ${Utils.escapeHtml(course.name || '')}`, content: formHtml, size: 'md' });
  }

  function _adjustCount(delta) {
    const input = document.getElementById('session-count-input');
    if (!input) return;
    let v = parseInt(input.value, 10) || 4;
    v = Math.max(1, Math.min(20, v + delta));
    input.value = v;
    _rebuildLabelInputs();
  }

  function _rebuildLabelInputs() {
    const input = document.getElementById('session-count-input');
    const container = document.getElementById('session-labels-container');
    if (!input || !container) return;
    const count = Math.max(1, Math.min(20, parseInt(input.value, 10) || 4));
    const existing = {};
    container.querySelectorAll('.session-label-input').forEach(el => { existing[el.dataset.idx] = el.value; });
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<input type="text" class="form-input session-label-input" data-idx="${i}" value="${Utils.escapeHtml(existing[i] || '')}" placeholder="الحصة ${i + 1}">`;
    }
    container.innerHTML = html;
  }

  function _pickPreset(n) {
    const input = document.getElementById('session-count-input');
    if (input) input.value = n;
    document.querySelectorAll('.session-preset-btn').forEach(b => { b.className = 'btn btn-outline btn-sm session-preset-btn'; });
    if (typeof event !== 'undefined' && event.target) {
      event.target.className = 'btn btn-accent btn-sm session-preset-btn';
    }
    _rebuildLabelInputs();
  }

  function resetSessionSettings(courseId) {
    delete sessionConfig[courseId];
    localStorage.setItem('sessions_per_course_config_v2', JSON.stringify(sessionConfig));
    Modal.close();
    Toast.success('تمت استعادة الإعدادات الافتراضية');
    loadPayments();
  }

  function saveSessionSettings(e, courseId) {
    e.preventDefault();
    const count = parseInt(document.getElementById('session-count-input').value, 10) || 4;
    if (count < 1 || count > 20) { Toast.warning('العدد يجب أن يكون بين 1 و 20'); return; }
    const labels = [];
    document.querySelectorAll('.session-label-input').forEach(el => {
      labels[parseInt(el.dataset.idx, 10)] = (el.value || '').trim();
    });
    const hasAnyLabel = labels.some(l => l && l.length);
    if (!sessionConfig[courseId]) sessionConfig[courseId] = {};
    sessionConfig[courseId].count = count;
    if (hasAnyLabel) sessionConfig[courseId].sessionLabels = labels.slice(0, count);
    else delete sessionConfig[courseId].sessionLabels;
    localStorage.setItem('sessions_per_course_config_v2', JSON.stringify(sessionConfig));
    Modal.close();
    Toast.success(`تم حفظ إعدادات الحصص (${count})`);
    loadPayments();
  }

  /* ── Generate ──────────────────────────────────────────── */
  function showGenerateModal() {
    if (!currentFilters.course_id) {
      Toast.warning('اختر دورة أولاً');
      return;
    }
    const course = (currentData && currentData.course) || coursesCache.find(c => c.id === currentFilters.course_id) || {};
    const count  = getSessionCount(currentFilters.course_id, course.sessions_per_month);
    const price  = Number(course.session_price || 0);
    Modal.show({
      title: `${Icons.generate} توليد الدفعات — ${Utils.escapeHtml(course.name || '')}`,
      body: `
        <p style="color:var(--text-muted);margin-bottom:12px;font-size:0.9rem">
          سيتم إنشاء سجلات دفع "غير مدفوع" لكل التلاميذ النشطين في هذه الدورة:
        </p>
        <ul style="margin:8px 0;padding-inline-start:24px;font-size:0.88rem;line-height:1.8">
          <li>تلاميذ <strong>شهري</strong> → سجل واحد بـ ${Utils.formatCurrency(price * count)}</li>
          <li>تلاميذ <strong>حصة/حصة</strong> → ${count} سجلات × ${Utils.formatCurrency(price)} لكل واحد</li>
        </ul>
        <div class="form-group">
          <label class="form-label">الشهر</label>
          <input type="month" class="form-input" id="gen-pay-month" value="${currentFilters.month}">
        </div>
        <div class="form-group">
          <label class="form-label">عدد الحصص</label>
          <input type="number" class="form-input" id="gen-pay-sessions" value="${count}" min="1" max="20">
          <small style="color:var(--text-muted)">يحدد عدد الأعمدة لتلاميذ "حصة/حصة" والمضاعف لتلاميذ "شهري"</small>
        </div>
        <div style="background:rgba(232,184,75,0.1);padding:10px;border-radius:8px;font-size:0.82rem;color:var(--text-muted)">
          ${Icons.info || ''} العملية idempotent — إعادة التشغيل لن تحذف السجلات الموجودة.
        </div>
      `,
      confirmText: 'توليد',
      onConfirm: generatePayments
    });
  }

  async function generatePayments() {
    const month    = document.getElementById('gen-pay-month').value;
    const sessions = parseInt(document.getElementById('gen-pay-sessions').value, 10) || 4;
    if (!month) { Toast.warning('اختر الشهر'); return; }
    try {
      const data = await API.post('/admin/payments/generate', {
        month,
        course_id: currentFilters.course_id,
        sessions
      });
      const msg = data.count > 0
        ? `تم توليد ${data.count} سجل دفع (${data.students} تلميذ)`
        : 'لا توجد سجلات جديدة (موجودة بالفعل)';
      Toast.success(msg);
      Modal.close();
      currentFilters.month = month;
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Manual single payment (kept for one-offs) ─────────── */
  async function showAddPaymentModal() {
    let coursesOptions = '<option value="">اختر الدورة</option>';
    try {
      coursesOptions += coursesCache.map(c =>
        `<option value="${c.id}" data-price="${c.session_price || 0}">${Utils.escapeHtml(c.name)} (${c.level})</option>`
      ).join('');
    } catch (_) {}
    Modal.show({
      title: `${Icons.add} إضافة دفع يدوي`,
      body: `
        <div class="form-group">
          <label class="form-label">الدورة</label>
          <select class="form-select" id="add-pay-course" onchange="AdminPayments.onCourseSelect()">${coursesOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">التلميذ</label>
          <select class="form-select" id="add-pay-student"><option value="">اختر الدورة أولاً</option></select>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">الشهر</label><input type="month" class="form-input" id="add-pay-month" value="${Utils.getCurrentMonth()}"></div>
          <div class="form-group"><label class="form-label">رقم الحصة</label><input type="number" class="form-input" id="add-pay-session" value="1" min="1" max="20"></div>
        </div>
        <div class="form-group"><label class="form-label">المبلغ (دج)</label><input type="number" class="form-input" id="add-pay-amount"></div>
        <div class="form-group">
          <label class="form-label">الحالة</label>
          <select class="form-select" id="add-pay-status">
            <option value="unpaid">غير مدفوع</option>
            <option value="paid">مدفوع</option>
          </select>
        </div>
      `,
      confirmText: 'حفظ',
      onConfirm: addPayment
    });
  }

  async function onCourseSelect() {
    const courseId = document.getElementById('add-pay-course').value;
    const studentSelect = document.getElementById('add-pay-student');
    const amountInput = document.getElementById('add-pay-amount');
    if (!courseId) { studentSelect.innerHTML = '<option value="">اختر الدورة أولاً</option>'; return; }
    try {
      const d = await API.get(`/admin/students?course_id=${courseId}&limit=200`);
      studentSelect.innerHTML = '<option value="">اختر التلميذ</option>' +
        (d.students || []).map(s => `<option value="${s.id}">${Utils.escapeHtml(s.first_name)} ${Utils.escapeHtml(s.last_name)}</option>`).join('');
      const course = coursesCache.find(c => c.id === courseId);
      if (course && amountInput) amountInput.value = course.session_price || course.price || 0;
    } catch (_) { studentSelect.innerHTML = '<option value="">خطأ في التحميل</option>'; }
  }

  async function addPayment() {
    const courseId   = document.getElementById('add-pay-course').value;
    const studentId  = document.getElementById('add-pay-student').value;
    const month      = document.getElementById('add-pay-month').value;
    const sessionNum = document.getElementById('add-pay-session').value;
    const amount     = document.getElementById('add-pay-amount').value;
    const status     = document.getElementById('add-pay-status').value;
    if (!courseId || !studentId || !month || !amount) { Toast.warning('يرجى ملء كل الحقول'); return; }
    try {
      await API.post('/admin/payments', {
        student_id: studentId, course_id: courseId, month,
        session_number: parseInt(sessionNum, 10) || 1,
        amount: Number(amount), status
      });
      Toast.success('تم إضافة سجل الدفع');
      Modal.close();
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Export ────────────────────────────────────────────── */
  function exportPayments() {
    if (currentView !== 'course' || !currentData) {
      Toast.warning('اختر دورة أولاً');
      return;
    }
    const payments = currentData.payments || [];
    if (payments.length === 0) { Toast.warning('لا توجد بيانات للتصدير'); return; }
    const courseName = currentData.course?.name || 'course';
    const monthLabel = getDefaultMonthLabel(currentFilters.month);
    try {
      const rows = payments.map(p => ({
        'الشهر': monthLabel,
        'التلميذ': p.students ? `${p.students.first_name} ${p.students.last_name}` : '',
        'الهاتف': p.students?.phone || '',
        'نوع الدفع': p.students?.payment_model === 'monthly' ? 'شهري' : 'حصة/حصة',
        'رقم الحصة': p.session_number,
        'المبلغ': p.amount,
        'الحالة': p.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
        'تاريخ الدفع': p.verified_at ? Utils.formatDate(p.verified_at) : ''
      }));
      Export.toExcel(rows, `payments-${courseName}-${currentFilters.month}`);
    } catch (err) { Toast.error('خطأ في التصدير: ' + err.message); }
  }

  return {
    render, setView, setMonth, setCourse, setStatus,
    togglePay, toggleSelectAll, toggleRowSelection, clearSelection, bulkMarkPaid,
    showSessionSettings, saveSessionSettings, resetSessionSettings,
    _pickPreset, _adjustCount, _rebuildLabelInputs,
    showGenerateModal, showAddPaymentModal, onCourseSelect,
    searchStudentTimeline, openStudentTimeline,
    exportPayments
  };
})();
