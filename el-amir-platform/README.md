# منصة إدارة المدرسة | School Management Platform

نظام شامل لإدارة المدارس والدورات التعليمية، مبني بتقنيات حديثة وبواجهة عربية (RTL).

## المميزات

- **تعدد الأدوار**: مدير رئيسي، مدير، أستاذ، تلميذ
- **إدارة التلاميذ**: تسجيل، تعديل، حذف، تغيير الدورة، إيقاف/طرد
- **إدارة الأساتذة**: CRUD + انتحال الشخصية
- **إدارة الدورات**: مع الجداول وفحص التعارضات
- **متابعة الدفع**: تأكيد، تذكير، رفع إثبات
- **تسجيل الحضور**: بالجملة + ملاحظات
- **نظام الطلبات**: من الأستاذ للمدير
- **الإشعارات**: في الوقت الحقيقي
- **سجل العمليات**: تتبع كل الإجراءات
- **تصدير البيانات**: Excel + PDF
- **إرسال الإيميلات**: بالجملة
- **تصميم متجاوب**: يعمل على الجوال والحاسوب

## التقنيات

| المكون | التقنية |
|--------|---------|
| الواجهة الأمامية | HTML + CSS + Vanilla JS (SPA) |
| الخادم الخلفي | Node.js + Express.js |
| قاعدة البيانات | PostgreSQL (Supabase) |
| التخزين | Supabase Storage |
| المصادقة | JWT + bcryptjs |
| البريد | Nodemailer + Gmail SMTP |
| النشر | Vercel (frontend) + Railway (backend) |

## البنية

```
el-amir-school/
├── index.html                  # الصفحة الرئيسية (SPA)
├── vercel.json                 # إعدادات Vercel
├── assets/
│   ├── css/                    # ملفات التصميم
│   │   ├── main.css            # المتغيرات والأساسيات
│   │   ├── layout.css          # التخطيط (sidebar, topbar)
│   │   ├── components.css      # المكونات (buttons, cards, tables)
│   │   ├── animations.css      # الحركات
│   │   ├── admin.css           # أنماط المدير
│   │   ├── teacher.css         # أنماط الأستاذ
│   │   └── student.css         # أنماط التلميذ
│   └── js/
│       ├── api.js              # وحدة الاتصال بالخادم
│       ├── auth.js             # إدارة المصادقة
│       ├── utils.js            # أدوات مساعدة
│       ├── toast.js            # إشعارات Toast
│       ├── modal.js            # نوافذ Modal
│       ├── export.js           # تصدير Excel/PDF
│       ├── app.js              # التطبيق الرئيسي + الموجّه
│       └── views/              # صفحات العرض
│           ├── login.js
│           ├── admin/          # صفحات المدير
│           ├── teacher/        # صفحات الأستاذ
│           └── student/        # صفحات التلميذ
├── school-backend/
│   ├── server.js               # نقطة الدخول
│   ├── package.json
│   ├── .env.example
│   ├── config/                 # إعدادات (DB, Email)
│   ├── middleware/             # Middleware (auth, roleGuard, rateLimit)
│   ├── controllers/            # المتحكمات
│   ├── routes/                 # المسارات
│   ├── services/               # الخدمات (email, storage, export)
│   └── utils/                  # أدوات مساعدة
└── database/
    └── schema.sql              # مخطط قاعدة البيانات
```

## التثبيت

### 1. قاعدة البيانات

1. أنشئ مشروع [Supabase](https://supabase.com)
2. انسخ محتوى `database/schema.sql` وشغّله في SQL Editor
3. أنشئ bucket اسمه `payment-proofs` في Storage

### 2. الخادم الخلفي

```bash
cd school-backend
cp .env.example .env
# عدّل .env بمعلومات Supabase والبريد
npm install
npm start
```

### 3. الواجهة الأمامية

1. عدّل `API_URL` في `index.html` ليشير لعنوان الخادم
2. افتح `index.html` في المتصفح أو انشرها على Vercel

### 4. النشر

**الواجهة (Vercel):**
```bash
vercel --prod
```

**الخادم (Railway):**
```bash
# اربط المستودع بـ Railway وأضف متغيرات البيئة
```

## الحساب الافتراضي

| الحقل | القيمة |
|-------|--------|
| اسم المستخدم | `admin` |
| كلمة المرور | `admin123` |
| الدور | مدير رئيسي |

> **تنبيه**: غيّر كلمة المرور فوراً بعد أول تسجيل دخول!

## متغيرات البيئة

```env
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=8h
EMAIL_USER=school@gmail.com
EMAIL_PASS=app_password
FRONTEND_URL=https://your-app.vercel.app
```

## الرخصة

جميع الحقوق محفوظة.
