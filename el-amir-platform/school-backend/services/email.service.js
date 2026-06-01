const { sendEmail } = require('../config/email');

async function sendWelcomeEmail(student, course, credentials) {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a3a5c;">مرحباً ${student.first_name} ${student.last_name}!</h2>
      <p>تم تسجيلك بنجاح في <strong>${course.name}</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>اسم المستخدم:</strong> ${credentials.username}</p>
        <p><strong>كلمة المرور:</strong> ${credentials.password}</p>
      </div>
      <p>يمكنك الدخول للمنصة من هنا: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
    </div>
  `;
  return sendEmail({ to: student.email, subject: 'مرحباً بك في المنصة', html });
}

async function sendPaymentReminder(student, course, month) {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a3a5c;">تذكير بالدفع</h2>
      <p>مرحباً ${student.first_name}،</p>
      <p>نذكرك بدفع رسوم الدورة <strong>${course.name}</strong> لشهر <strong>${month}</strong></p>
      <p>المبلغ المطلوب: <strong>${course.price} دج</strong></p>
      <p>يمكنك رفع إثبات الدفع من خلال حسابك على المنصة.</p>
    </div>
  `;
  return sendEmail({ to: student.email, subject: `تذكير بدفع رسوم ${course.name}`, html });
}

async function sendPaymentConfirmation(student, course, month) {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">تأكيد الدفع</h2>
      <p>مرحباً ${student.first_name}،</p>
      <p>تم تأكيد دفعك لدورة <strong>${course.name}</strong> لشهر <strong>${month}</strong></p>
    </div>
  `;
  return sendEmail({ to: student.email, subject: `تأكيد دفعك لشهر ${month}`, html });
}

async function sendRequestNotification(request, toAdmin) {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f39c12;">طلب جديد</h2>
      <p>نوع الطلب: <strong>${request.type}</strong></p>
      <p>من: <strong>${request.from_name}</strong></p>
      <p>السبب: ${request.reason}</p>
    </div>
  `;
  return sendEmail({ to: toAdmin.email, subject: 'طلب جديد يحتاج مراجعتك', html });
}

async function sendRequestResult(request, toTeacher, result) {
  const status = result === 'approved' ? 'تم قبول' : 'تم رفض';
  const color = result === 'approved' ? '#27ae60' : '#e74c3c';
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${color};">${status} طلبك</h2>
      <p>نوع الطلب: <strong>${request.type}</strong></p>
      <p>الرد: ${request.response || 'لا يوجد رد إضافي'}</p>
    </div>
  `;
  return sendEmail({ to: toTeacher.email, subject: `${status} طلبك`, html });
}

async function sendSuspensionNotification(student, reason) {
  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">تعليق الحساب</h2>
      <p>مرحباً ${student.first_name}،</p>
      <p>تم تعليق حسابك.</p>
      <p>السبب: ${reason}</p>
      <p>للاستفسار، تواصل مع إدارة المدرسة.</p>
    </div>
  `;
  if (student.email) {
    return sendEmail({ to: student.email, subject: 'تعليق حسابك', html });
  }
}

async function sendBulkEmail({ recipients, subject, message }) {
  const results = [];
  for (const recipient of recipients) {
    try {
      const html = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
          ${message.replace(/\{name\}/g, recipient.name || '')}
        </div>
      `;
      await sendEmail({ to: recipient.email, subject, html });
      results.push({ email: recipient.email, success: true });
    } catch (err) {
      results.push({ email: recipient.email, success: false, error: err.message });
    }
  }
  return results;
}

module.exports = {
  sendWelcomeEmail,
  sendPaymentReminder,
  sendPaymentConfirmation,
  sendRequestNotification,
  sendRequestResult,
  sendSuspensionNotification,
  sendBulkEmail
};
