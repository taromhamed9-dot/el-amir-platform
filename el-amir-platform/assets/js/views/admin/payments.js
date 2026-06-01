const AdminPayments = (() => {
  let currentFilters = { month: Utils.getCurrentMonth() };
  let currentPage = 1;
  let allPayments = [];

  // Per-month session config: { 'YYYY-MM': { count: 4 } }
  let sessionConfig = JSON.parse(localStorage.getItem('sessions_per_month_config')) || {};

  function getSessionCount(month) {
    return (sessionConfig[month] && sessionConfig[month].count) ? sessionConfig[month].count : 4;
  }

  // Default label for a session column. User requested the format:
  // "حصة N شهر سبتمبر" ("Session N Month <ArabicMonth>").
  // A user-provided custom label (sessionLabels[i]) always wins.
  function getSessionLabel(month, sessionNum) {
    const labels = sessionConfig[month] && sessionConfig[month].sessionLabels;
    if (labels && labels[sessionNum - 1]) return labels[sessionNum - 1];
    const monthName = Utils.getArabicMonthName(month);
    return monthName ? `حصة ${sessionNum} شهر ${monthName}` : `حصة ${sessionNum}`;
  }

  function getDefaultMonthLabel(month) {
    const [year, m] = month.split('-');
    const names = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return `${names[parseInt(m, 10) - 1]} ${year}`;
  }

  function getMonthLabel(month) {
    if (sessionConfig[month] && sessionConfig[month].monthLabel) return sessionConfig[month].monthLabel;
    return getDefaultMonthLabel(month);
  }

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 payments-header">
        <h2 style="font-size:1.1rem">${Icons.payments} متابعة الدفع</h2>
        <div class="payments-actions" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="AdminPayments.showSessionSettings()">${Icons.settings} إعدادات الجلسات</button>
          <button class="btn btn-accent btn-sm" onclick="AdminPayments.showGenerateModal()">${Icons.generate} توليد الدفعات</button>
          <button class="btn btn-primary btn-sm" onclick="AdminPayments.showAddPaymentModal()">${Icons.add} إضافة دفع</button>
          <button class="btn btn-outline btn-sm" onclick="AdminPayments.exportPayments()">${Icons.export} تصدير</button>
        </div>
      </div>

      <div id="payment-summary" class="grid grid-4 mb-20"></div>

      <div class="card mb-20">
        <div class="filters-bar payments-filters">
          <input type="month" class="form-input" style="width:auto" id="payment-month-filter"
            value="${currentFilters.month}" onchange="AdminPayments.filterMonth(this.value)">
          <select class="form-select" id="payment-status-filter" onchange="AdminPayments.filterStatus(this.value)">
            <option value="">كل الحالات</option>
            <option value="paid">مدفوع</option>
            <option value="unpaid">غير مدفوع</option>
            <option value="pending_verification">في انتظار التأكيد</option>
          </select>
          <div class="search-input-wrapper" style="position:relative;flex:1;min-width:180px;max-width:300px">
            <input type="text" class="form-input search-input" placeholder="بحث بالاسم..."
              oninput="AdminPayments.searchStudents(this.value)" id="payment-search">
          </div>
        </div>
      </div>

      <div id="payments-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
      <div id="payments-pagination"></div>
    `;
    await loadPayments();
  }

  async function loadPayments() {
    const container   = document.getElementById('payments-container');
    const summaryEl   = document.getElementById('payment-summary');
    const paginationEl = document.getElementById('payments-pagination');

    try {
      // Load ALL records for the month — backend now returns everything sorted
      const params = new URLSearchParams();
      params.set('month', currentFilters.month);
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.search) params.set('search', currentFilters.search);

      const data = await API.get(`/admin/payments?${params}`);
      allPayments = data.payments || [];
      const s = data.summary || {};
      const sessionCount = getSessionCount(currentFilters.month);
      const monthLabel   = getMonthLabel(currentFilters.month);

      const paidCount    = allPayments.filter(p => p.status === 'paid').length;
      const unpaidCount  = allPayments.filter(p => p.status === 'unpaid').length;

      summaryEl.innerHTML = `
        <div class="stat-card"><div class="stat-icon blue">${Icons.students}</div><div><div class="stat-value">${data.total || allPayments.length}</div><div class="stat-label">إجمالي السجلات</div></div></div>
        <div class="stat-card"><div class="stat-icon green">${Icons.check}</div><div><div class="stat-value">${Utils.formatCurrency(s.collected || 0)}</div><div class="stat-label">المحصّل (${paidCount})</div></div></div>
        <div class="stat-card"><div class="stat-icon red">${Icons.cross}</div><div><div class="stat-value">${Utils.formatCurrency(s.remaining || 0)}</div><div class="stat-label">المتبقي (${unpaidCount})</div></div></div>
        <div class="stat-card"><div class="stat-icon gold">${Icons.money}</div><div>
          <div class="stat-value">${Utils.formatCurrency(s.total_expected || 0)}</div>
          <div class="stat-label">الإجمالي المتوقع</div>
          <div class="progress-bar mt-12" style="height:6px">
            <div class="fill green" style="width:${(s.total_expected > 0) ? Math.round((s.collected / s.total_expected) * 100) : 0}%"></div>
          </div>
        </div></div>
      `;

      // Even with zero records, render the empty matrix header so the admin
      // can see the configured session columns ("حصة 1 شهر سبتمبر" …)
      // and use the "توليد الدفعات" button to populate the rows.
      if (allPayments.length === 0) {
        const headersHtml = Array.from({ length: sessionCount }, (_, i) => {
          const label = getSessionLabel(currentFilters.month, i + 1);
          return `<th class="session-header" style="text-align:center;min-width:140px" title="${Utils.escapeHtml(label)}">
            <div style="font-size:0.8rem">${Utils.escapeHtml(label)}</div>
          </th>`;
        }).join('');

        container.innerHTML = `
          <div class="matrix-month-header">
            <span>${monthLabel}</span>
            <span class="matrix-session-badge">${sessionCount} حصص / شهر</span>
          </div>
          <div class="table-container" style="overflow-x:auto;">
            <table class="data-table matrix-table">
              <thead>
                <tr>
                  <th style="min-width:200px;position:sticky;right:0;background:var(--bg-card);z-index:2;">اسم التلميذ</th>
                  ${headersHtml}
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="empty-state" style="margin-top:16px">
            <div class="icon">${Icons.payments}</div>
            <div class="title">لا توجد دفعات لهذا الشهر بعد</div>
            <div class="description">اضغط <strong>توليد الدفعات</strong> لإنشاء سجلات ${sessionCount} حصص لكل تلميذ، أو <strong>إعدادات الجلسات</strong> لتغيير عدد الحصص.</div>
          </div>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      /* ── Group payments by student, sorted by session_number ──────────── */
      const byStudent = {};
      allPayments.forEach(p => {
        const sid = p.student_id;
        if (!byStudent[sid]) {
          byStudent[sid] = {
            name: p.students ? `${p.students.first_name} ${p.students.last_name}` : '—',
            phone: p.students?.phone || '',
            sessions: []
          };
        }
        byStudent[sid].sessions.push(p);
      });

      // Sort each student's sessions by session_number ascending
      Object.values(byStudent).forEach(st => {
        st.sessions.sort((a, b) => (a.session_number || 1) - (b.session_number || 1));
      });

      /* ── Determine actual session count from data (or config) ────── */
      // Use the max session_number found in the data, fallback to configured count
      const maxSessionInData = allPayments.reduce((m, p) => Math.max(m, p.session_number || 1), 0);
      const effectiveSessionCount = maxSessionInData > 0 ? maxSessionInData : sessionCount;

      /* ── Build session column headers ────────────────────── */
      // Header format: "حصة N شهر سبتمبر"
      // (custom sessionLabels[i] override the default).
      const sessionHeaders = Array.from({ length: effectiveSessionCount }, (_, i) => {
        const label = getSessionLabel(currentFilters.month, i + 1);
        return `<th class="session-header" style="text-align:center;min-width:140px" title="${Utils.escapeHtml(label)}">
          <div style="font-size:0.8rem">${Utils.escapeHtml(label)}</div>
        </th>`;
      }).join('');

      /* ── Build table HTML ─────────────────────────────── */
      let html = `
        <div class="matrix-month-header">
          <span>${monthLabel}</span>
          <span class="matrix-session-badge">${effectiveSessionCount} حصص / شهر</span>
        </div>
        <div class="table-container" style="overflow-x:auto;">
          <table class="data-table matrix-table" id="payments-table">
            <thead>
              <tr>
                <th style="min-width:200px;position:sticky;right:0;background:var(--bg-card);z-index:2;">اسم التلميذ</th>
                ${sessionHeaders}
              </tr>
            </thead>
            <tbody>
      `;

      Object.keys(byStudent).forEach((sid, idx) => {
        const st = byStudent[sid];

        html += `
          <tr style="background:${idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'}">
            <td style="font-weight:600;position:sticky;right:0;background:inherit;z-index:1;border-left:1px solid var(--border);">
              ${st.name}
              ${st.phone ? `<div class="mono" style="font-size:0.75rem;color:var(--text-muted)">${st.phone}</div>` : ''}
            </td>
        `;

        // Render one cell per expected session slot
        for (let s = 1; s <= effectiveSessionCount; s++) {
          // Find the payment whose session_number matches slot s
          const p = st.sessions.find(pay => (pay.session_number || 1) === s);

          if (!p) {
            html += `<td style="text-align:center;padding:4px;">
              <div class="matrix-square empty" title="غير مسجل"></div>
            </td>`;
          } else {
            const isPaid    = p.status === 'paid';
            const isPending = p.status === 'pending_verification';
            const cls   = isPaid ? 'paid' : isPending ? 'pending' : 'unpaid';
            const label = `${getSessionLabel(currentFilters.month, s)} — ${Utils.formatCurrency(p.amount)} — ${isPaid ? 'مدفوع' : isPending ? 'قيد المراجعة' : 'غير مدفوع'}`;
            const icon  = isPaid ? Icons.check : '';
            html += `<td style="text-align:center;padding:4px;">
              <div class="matrix-square ${cls}" title="${label}"
                onclick="AdminPayments.togglePay('${p.id}','${p.status}')">
                ${icon}
              </div>
            </td>`;
          }
        }

        html += '</tr>';
      });

      html += `
            </tbody>
          </table>
        </div>
        <div class="matrix-legend">
          <div class="matrix-legend-item"><div class="matrix-square paid"  style="width:20px;height:20px;pointer-events:none">${Icons.check}</div> مدفوع</div>
          <div class="matrix-legend-item"><div class="matrix-square unpaid" style="width:20px;height:20px;pointer-events:none"></div> غير مدفوع</div>
          <div class="matrix-legend-item"><div class="matrix-square pending" style="width:20px;height:20px;pointer-events:none"></div> قيد المراجعة</div>
          <div class="matrix-legend-item"><div class="matrix-square empty"  style="width:20px;height:20px;pointer-events:none"></div> غير مسجل</div>
        </div>
      `;

      container.innerHTML = html;

      if (paginationEl) paginationEl.innerHTML = '';

    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${Icons.warning}</div>
          <div class="title">خطأ في تحميل البيانات</div>
          <div class="description">${err.message}</div>
        </div>`;
    }
  }

  /* ── Session Settings Modal ───────────────────────────────────── */
  function showSessionSettings() {
    const month  = currentFilters.month;
    const count  = getSessionCount(month);
    const defLbl = getDefaultMonthLabel(month);
    const cfg    = sessionConfig[month] || {};
    const labels = cfg.sessionLabels || [];

    const formHtml = `
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:14px">
        إعدادات الحصص والعنوان لشهر
        <strong style="color:var(--accent)">${defLbl}</strong>
      </p>
      <form id="session-settings-form" onsubmit="AdminPayments.saveSessionSettings(event,'${month}')">

        <div class="form-group-modern">
          <label>عنوان الشهر (اختياري)</label>
          <input type="text" id="month-label-input" class="form-input"
            value="${Utils.escapeHtml(cfg.monthLabel || '')}"
            placeholder="مثل: رمضان 1446 أو اتركه فارغاً">
        </div>

        <div class="form-group-modern">
          <label>عدد الحصص في الشهر</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px" id="session-quick-btns">
            <button type="button" class="btn btn-outline btn-sm" onclick="AdminPayments._adjustCount(-1)">− حصة</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="AdminPayments._adjustCount(1)">+ حصة</button>
            ${[4, 6, 8, 12].map(n => `
              <button type="button"
                class="btn ${count === n ? 'btn-accent' : 'btn-outline'} btn-sm session-preset-btn"
                onclick="AdminPayments._pickPreset(${n})">${n} حصص</button>
            `).join('')}
          </div>
          <input type="number" id="session-count-input" class="form-input"
            value="${count}" min="1" max="20"
            oninput="AdminPayments._rebuildLabelInputs()"
            placeholder="أدخل عدداً مخصصاً (1 – 20)">
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
          <button type="submit" class="btn btn-accent" style="flex:1">
            حفظ الإعدادات
          </button>
          <button type="button" class="btn btn-outline" onclick="AdminPayments.resetSessionSettings('${month}')">
            استعادة الافتراضي
          </button>
        </div>
      </form>
    `;
    Modal.open({ title: `${Icons.settings} إعدادات الحصص`, content: formHtml, size: 'md' });
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
    container.querySelectorAll('.session-label-input').forEach(el => {
      existing[el.dataset.idx] = el.value;
    });
    let html = '';
    for (let i = 0; i < count; i++) {
      const v = existing[i] || '';
      html += `<input type="text" class="form-input session-label-input" data-idx="${i}" value="${Utils.escapeHtml(v)}" placeholder="الحصة ${i + 1}">`;
    }
    container.innerHTML = html;
  }

  function _pickPreset(n) {
    const input = document.getElementById('session-count-input');
    if (input) input.value = n;
    document.querySelectorAll('.session-preset-btn').forEach(b => {
      b.className = 'btn btn-outline btn-sm session-preset-btn';
    });
    if (typeof event !== 'undefined' && event.target) {
      event.target.className = 'btn btn-accent btn-sm session-preset-btn';
    }
    _rebuildLabelInputs();
  }

  function resetSessionSettings(month) {
    delete sessionConfig[month];
    localStorage.setItem('sessions_per_month_config', JSON.stringify(sessionConfig));
    Modal.close();
    Toast.success('تمت استعادة الإعدادات الافتراضية');
    loadPayments();
  }

  function saveSessionSettings(e, month) {
    e.preventDefault();
    const count = parseInt(document.getElementById('session-count-input').value, 10) || 4;
    if (count < 1 || count > 20) { Toast.warning('العدد يجب أن يكون بين 1 و 20'); return; }

    const monthLabelEl = document.getElementById('month-label-input');
    const monthLabel = monthLabelEl ? (monthLabelEl.value || '').trim() : '';
    const labels = [];
    document.querySelectorAll('.session-label-input').forEach(el => {
      labels[parseInt(el.dataset.idx, 10)] = (el.value || '').trim();
    });
    const hasAnyLabel = labels.some(l => l && l.length);

    if (!sessionConfig[month]) sessionConfig[month] = {};
    sessionConfig[month].count = count;
    if (monthLabel) sessionConfig[month].monthLabel = monthLabel;
    else delete sessionConfig[month].monthLabel;
    if (hasAnyLabel) sessionConfig[month].sessionLabels = labels.slice(0, count);
    else delete sessionConfig[month].sessionLabels;

    localStorage.setItem('sessions_per_month_config', JSON.stringify(sessionConfig));
    Modal.close();
    Toast.success(`تم حفظ إعدادات الحصص (${count})`);
    loadPayments();
  }

  /* ── Toggle Pay ──────────────────────────────────────────────── */
  async function togglePay(id, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await API.patch(`/admin/payments/${id}/verify`, { status: newStatus });
      Toast.success(newStatus === 'paid' ? 'تم تأكيد الدفع' : 'تم إلغاء التأكيد');
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }


  /* ── Filters ────────────────────────────────────────────────── */
  function filterMonth(v) { currentFilters.month = v; currentPage = 1; loadPayments(); }
  function filterStatus(v) { if (v) currentFilters.status = v; else delete currentFilters.status; currentPage = 1; loadPayments(); }

  const searchStudents = Utils.debounce(function(v) {
    if (v) currentFilters.search = v; else delete currentFilters.search;
    currentPage = 1;
    loadPayments();
  }, 400);

  /* ── Add Payment Modal ──────────────────────────────────────── */
  async function showAddPaymentModal() {
    let coursesOptions = '<option value="">اختر الدورة</option>';
    try {
      const d = await API.get('/admin/courses');
      coursesOptions += (d.courses || []).map(c =>
        `<option value="${c.id}" data-price="${c.price}">${c.name} (${c.level})</option>`
      ).join('');
    } catch (_) {}

    Modal.show({
      title: `${Icons.add} إضافة دفع يدوي`,
      body: `
        <div class="form-group">
          <label class="form-label">الدورة / المجموعة</label>
          <select class="form-select" id="add-pay-course" onchange="AdminPayments.onCourseSelect()">
            ${coursesOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">التلميذ</label>
          <select class="form-select" id="add-pay-student">
            <option value="">اختر الدورة أولاً</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">الشهر</label>
            <input type="month" class="form-input" id="add-pay-month" value="${Utils.getCurrentMonth()}">
          </div>
          <div class="form-group">
            <label class="form-label">رقم الحصة</label>
            <input type="number" class="form-input" id="add-pay-session" value="1" min="1" max="20" placeholder="1">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">المبلغ (دج)</label>
          <input type="number" class="form-input" id="add-pay-amount" placeholder="0">
        </div>
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
    const courseId     = document.getElementById('add-pay-course').value;
    const studentSelect = document.getElementById('add-pay-student');
    const amountInput   = document.getElementById('add-pay-amount');
    if (!courseId) { studentSelect.innerHTML = '<option value="">اختر الدورة أولاً</option>'; return; }

    try {
      const d = await API.get(`/admin/students?course_id=${courseId}&limit=200`);
      studentSelect.innerHTML = '<option value="">اختر التلميذ</option>' +
        (d.students || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
      const course = (await API.get('/admin/courses')).courses.find(c => c.id === courseId);
      if (course && amountInput) amountInput.value = course.price || 0;
    } catch (_) {
      studentSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
    }
  }

  async function addPayment() {
    const courseId     = document.getElementById('add-pay-course').value;
    const studentId    = document.getElementById('add-pay-student').value;
    const month        = document.getElementById('add-pay-month').value;
    const sessionNum   = document.getElementById('add-pay-session').value;
    const amount       = document.getElementById('add-pay-amount').value;
    const status       = document.getElementById('add-pay-status').value;

    if (!courseId || !studentId || !month || !amount) { Toast.warning('يرجى ملء جميع الحقول'); return; }

    try {
      await API.post('/admin/payments', {
        student_id: studentId,
        course_id: courseId,
        month,
        session_number: parseInt(sessionNum, 10) || 1,
        amount: Number(amount),
        status
      });
      Toast.success('تم إضافة سجل الدفع بنجاح');
      Modal.close();
      loadPayments();
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Generate Payments Modal ────────────────────────────────── */
  function showGenerateModal() {
    const sessionCount = getSessionCount(currentFilters.month);
    Modal.show({
      title: `${Icons.generate} توليد الدفعات`,
      body: `
        <p style="color:var(--text-muted);margin-bottom:16px;font-size:0.9rem">
          سيتم إنشاء سجلات دفع "غير مدفوع" لكل التلاميذ النشطين.
        </p>
        <div class="form-group">
          <label class="form-label">الشهر</label>
          <input type="month" class="form-input" id="gen-pay-month" value="${currentFilters.month}">
        </div>
        <div class="form-group">
          <label class="form-label">عدد الحصص المراد توليدها</label>
          <input type="number" class="form-input" id="gen-pay-sessions" value="${sessionCount}" min="1" max="20">
          <small style="color:var(--text-muted)">كل حصة = سجل دفع واحد لكل تلميذ</small>
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
      const data = await API.post('/admin/payments/generate', { month, sessions });
      const msg = data.count > 0
        ? `تم توليد ${data.count} سجل دفع (${data.sessions} حصص × ${data.students} تلميذ)`
        : 'لا توجد سجلات جديدة (قد تكون موجودة بالفعل)';
      Toast.success(msg);
      // Save the session count for this month
      if (!sessionConfig[month]) sessionConfig[month] = {};
      sessionConfig[month].count = sessions;
      localStorage.setItem('sessions_per_month_config', JSON.stringify(sessionConfig));
      Modal.close();
      filterMonth(month);
    } catch (err) { Toast.error(err.message); }
  }

  /* ── Export ─────────────────────────────────────────────────── */
  function exportPayments() {
    if (allPayments.length === 0) { Toast.warning('لا توجد بيانات للتصدير'); return; }
    const monthLabel = getMonthLabel(currentFilters.month);
    try {
      // Group by student then export session-numbered rows
      const byStudent = {};
      allPayments.forEach(p => {
        const sid = p.student_id;
        if (!byStudent[sid]) byStudent[sid] = { name: p.students ? `${p.students.first_name} ${p.students.last_name}` : '', phone: p.students?.phone || '', sessions: [] };
        byStudent[sid].sessions.push(p);
      });

      const rows = [];
      Object.values(byStudent).forEach(st => {
        st.sessions.forEach((p) => {
          const num = p.session_number || 1;
          rows.push({
            'الشهر': monthLabel,
            'اسم التلميذ': st.name,
            'الهاتف': st.phone,
            'الحصة': getSessionLabel(currentFilters.month, num),
            'المبلغ (دج)': p.amount || 0,
            'الحالة': p.status === 'paid' ? 'مدفوع' : p.status === 'unpaid' ? 'غير مدفوع' : 'قيد المراجعة'
          });
        });
      });
      Export.toExcel(rows, `payments-sessions-${currentFilters.month || 'all'}`);
    } catch (err) { Toast.error('خطأ في التصدير: ' + err.message); }
  }

  return {
    render, filterMonth, filterStatus, searchStudents,
    showAddPaymentModal, onCourseSelect,
    showGenerateModal, exportPayments, togglePay,
    showSessionSettings, saveSessionSettings, resetSessionSettings,
    _pickPreset, _adjustCount, _rebuildLabelInputs
  };
})();
