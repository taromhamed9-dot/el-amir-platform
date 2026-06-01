function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

function formatCurrency(amount) {
  if (amount == null) return '';
  return `${Number(amount).toLocaleString('ar-DZ')} دج`;
}

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getArabicDay(day) {
  const days = {
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت'
  };
  return days[day] || day;
}

module.exports = { formatDate, formatTime, formatCurrency, getCurrentMonth, getArabicDay };
