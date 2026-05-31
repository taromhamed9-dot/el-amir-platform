const Utils = (() => {
  function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ar-DZ', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  function formatTime(time) {
    if (!time) return '';
    return time.slice(0, 5);
  }

  function formatCurrency(amount) {
    if (amount == null) return '';
    return `${Number(amount).toLocaleString('ar-DZ')} دج`;
  }

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getArabicDay(day) {
    const days = {
      sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
    };
    return days[day] || day;
  }

  function getStatusBadge(status) {
    const map = {
      active: { class: 'badge-success', text: 'نشط' },
      suspended: { class: 'badge-warning', text: 'موقوف' },
      expelled: { class: 'badge-danger', text: 'مطرود' },
      pending: { class: 'badge-info', text: 'معلّق' },
      open: { class: 'badge-success', text: 'مفتوحة' },
      full: { class: 'badge-danger', text: 'ممتلئة' },
      closed: { class: 'badge-muted', text: 'مغلقة' },
      paid: { class: 'badge-success', text: 'مدفوع' },
      unpaid: { class: 'badge-danger', text: 'غير مدفوع' },
      pending_verification: { class: 'badge-warning', text: 'في انتظار التأكيد' },
      present: { class: 'badge-success', text: 'حاضر' },
      absent: { class: 'badge-danger', text: 'غائب' },
      late: { class: 'badge-warning', text: 'متأخر' },
      excused: { class: 'badge-info', text: 'معذور' },
      approved: { class: 'badge-success', text: 'مقبول' },
      rejected: { class: 'badge-danger', text: 'مرفوض' }
    };
    const info = map[status] || { class: 'badge-muted', text: status };
    return `<span class="badge ${info.class}">${info.text}</span>`;
  }

  function getAttendanceStatus(status) {
    const map = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'معذور' };
    return map[status] || status;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function generatePagination(currentPage, totalPages, onPageClick) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';

    if (currentPage > 1) {
      html += `<button class="page-btn" data-page="${currentPage - 1}">السابق</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        html += '<span style="color:var(--text-muted)">...</span>';
      }
    }

    if (currentPage < totalPages) {
      html += `<button class="page-btn" data-page="${currentPage + 1}">التالي</button>`;
    }

    html += '</div>';
    return html;
  }

  function getLevelOptions() {
    return ['1AM', '2AM', '3AM', '4AM', '1AS', '2AS', '3AS'];
  }

  function getDayOptions() {
    return [
      { value: 'saturday', label: 'السبت' },
      { value: 'sunday', label: 'الأحد' },
      { value: 'monday', label: 'الاثنين' },
      { value: 'tuesday', label: 'الثلاثاء' },
      { value: 'wednesday', label: 'الأربعاء' },
      { value: 'thursday', label: 'الخميس' },
      { value: 'friday', label: 'الجمعة' }
    ];
  }

  // Arabic month name for a YYYY-MM string ('2025-09' → 'سبتمبر')
  function getArabicMonthName(month) {
    if (!month) return '';
    const m = month.split('-')[1] || month;
    const names = [
      'يناير','فبراير','مارس','أبريل','مايو','يونيو',
      'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
    ];
    const idx = parseInt(m, 10) - 1;
    return names[idx] || '';
  }

  // Strip undefined/null/empty values from an object — useful before URLSearchParams.
  // Avoids the URLSearchParams({k: undefined}) → 'k=undefined' footgun that breaks
  // server-side equality filters.
  function cleanParams(obj) {
    const out = {};
    Object.keys(obj || {}).forEach(k => {
      const v = obj[k];
      if (v === undefined || v === null || v === '' || v === 'undefined' || v === 'null') return;
      out[k] = v;
    });
    return out;
  }

  return {
    formatDate, formatTime, formatCurrency, getCurrentMonth,
    getArabicDay, getArabicMonthName, getStatusBadge, getAttendanceStatus,
    escapeHtml, debounce, generatePagination, cleanParams,
    getLevelOptions, getDayOptions
  };
})();
