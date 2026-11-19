# وقتي (WAQTI) — دليل التشغيل والربط بقاعدة البيانات والنشر

> **نظّم وقتك. وتحكّم في حياتك.**

هذا الدليل يشرح خطوة بخطوة كيفية تشغيل مشروع **وقتي (WAQTI)** محليًا، وربطه بقاعدة بيانات **Supabase**، وتشغيل دوال الذكاء الاصطناعي (**رفيق**)، ثم رفعه على استضافة **Cloudflare Pages** (أو أي استضافة مواقع ثابتة).

---

## ١. المتطلبات الأساسية
- **Node.js** الإصدار `20` أو أحدث (<https://nodejs.org>)
- حساب مجاني على **Supabase** (<https://supabase.com>)
- حساب على **Cloudflare Pages** أو Vercel أو Netlify للنشر
- مفتاح **Gemini API** أو **OpenAI API** (اختياري، لتشغيل المساعد الذكي «رفيق»)

---

## ٢. التشغيل المحلي السريع (الوضع التجريبي)
بعد فك ضغط الملف، افتح موجه الأوامر (Terminal / PowerShell) داخل مجلد المشروع ونفّذ:

```bash
npm install
npm run dev
```

سيعمل التطبيق مباشرة على الرابط:
`http://localhost:5173`

> **ملاحظة:** بدون إعداد ملف `.env.local` سيعمل التطبيق بالوضع التجريبي (`mock`) داخل المتصفح فقط.

---

## ٣. ربط المشروع بقاعدة البيانات (Supabase)

### أ) إنشاء المشروع وتطبيق الجداول وسياسات الأمان (SQL Migrations)
1. أنشئ مشروعًا جديدًا في **Supabase**.
2. افتح **SQL Editor** داخل لوحة تحكم Supabase، ونفّذ ملفات الهجرة الموجودة في مجلد `supabase/migrations/` **بالترتيب التالي**:
   1. `supabase/migrations/202611180001_phase2_core.sql`
   2. `supabase/migrations/202611180002_phase3_calendar_habits_goals.sql`
   3. `supabase/migrations/202611180003_phase4_focus_ai_spiritual_notifications.sql`
   4. `supabase/migrations/202611190004_phase5_analytics_offline_freemium_admin.sql`
   5. `supabase/migrations/202611190005_audit_hardening.sql`

   *(أو عبر Supabase CLI باستخدام الأمر `supabase db push`)*

### ب) إعداد متغيرات البيئة في الواجهة (`.env.local`)
انسخ ملف `.env.example` إلى ملف جديد باسم `.env.local` واملأ القيم من **Supabase → Project Settings → API**:

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY=
```

> **تنبيه أمني مهم:** لا تضع مفتاح `service_role` أو مفاتيح الذكاء الاصطناعي داخل `.env.local` أو أي متغير يبدأ بـ `VITE_`.

### ج) إعداد المصادقة وإعادة تعيين كلمة المرور
من لوحة Supabase:
**Authentication → URL Configuration**
- **Site URL:** رابط موقعك (مثال: `https://waqti.pages.dev`)
- **Redirect URLs:** أضف `https://YOUR_DOMAIN/auth/reset-password` و `http://localhost:5173/auth/reset-password`

### د) ترقية حساب المدير (Admin)
بعد تسجيل أول حساب في التطبيق، نفّذ الأمر التالي في **SQL Editor** لجعله مديرًا:

```sql
update public.profiles
set role = 'admin'
where id = 'ضع-معرف-المستخدم-UUID-هنا';
```

---

## ٤. نشر دوال الخادم (Supabase Edge Functions)
لتشغيل **رفيق الذكي**، وإدارة الاشتراكات، وجدولة الإشعارات، ثبّت **Supabase CLI** ونفّذ:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# ضبط الأسرار على الخادم (Server-side Secrets)
supabase secrets set AI_PROVIDER=gemini
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
# أو لاستخدام OpenAI:
# supabase secrets set AI_PROVIDER=openai
# supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY

supabase secrets set CRON_SECRET=YOUR_RANDOM_SECRET
supabase secrets set ALLOW_DEMO_PLAN_SWITCH=true

# نشر الدوال
supabase functions deploy rafiq-chat rafiq-execute-action notifications-dispatch subscription-manager
```

---

## ٥. التحقق قبل الرفع وبناء نسخة الإنتاج
لتأكيد خلو المشروع من أي أخطاء برمجية أو اختبارات فاشلة:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

سينتج مجلد `dist/` الجاهز للرفع.

---

## ٦. الرفع على استضافة Cloudflare Pages
1. ادخل إلى **Cloudflare Dashboard → Workers & Pages → Create → Pages**.
2. ارفع مجلد المشروع (أو اربطه بمستودع GitHub).
3. اضبط إعدادات البناء:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. أضف متغيرات البيئة في **Settings → Environment variables**:
   - `VITE_DATA_SOURCE` = `supabase`
   - `VITE_SUPABASE_URL` = رابط مشروعك
   - `VITE_SUPABASE_ANON_KEY` = المفتاح العام `anon`
5. تم تضمين ملف `public/_redirects` تلقائيًا لضمان عمل جميع المسارات (`/tasks`, `/calendar`, `/admin`, إلخ) دون أخطاء `404`.
