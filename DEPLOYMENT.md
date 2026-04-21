# 🚀 دليل تشغيل ونشر مشروع Kitchen Genius

دليل شامل لتشغيل المشروع محلياً ونشره على VPS أو منصات الاستضافة.

---

## 📋 جدول المحتويات

1. [المتطلبات](#المتطلبات)
2. [التشغيل المحلي](#التشغيل-المحلي)
3. [متغيرات البيئة](#متغيرات-البيئة)
4. [البناء (Build)](#البناء-build)
5. [النشر على Vercel (الأسهل ⭐)](#النشر-على-vercel)
6. [النشر على VPS بـ Wrangler + PM2](#النشر-على-vps-بـ-wrangler--pm2)
7. [النشر على Cloudflare Workers](#النشر-على-cloudflare-workers)
8. [حل المشاكل الشائعة](#حل-المشاكل-الشائعة)

---

## ⚠️ مهم جداً اقرأ الأول

المشروع ده **TanStack Start** مبني على **Cloudflare Workers runtime** (مش Node.js عادي).

ده يعني:
- ❌ `node dist/server/index.js` **مش هيشتغل** (مش Node bundle)
- ❌ `pm2 start dist/server/index.js` **مش هيشتغل** مباشرة
- ❌ `serve dist/client` **مش هيشغل التطبيق صح** (هيفتقد SSR و server functions)
- ✅ لازم تستخدم **wrangler** أو منصة بتدعم Workers (Vercel/Cloudflare)

---

## المتطلبات

- **Node.js** >= 20
- **npm** أو **bun**
- **Git**
- حساب على [Supabase](https://supabase.com) (للداتابيز)

---

## التشغيل المحلي

```bash
# 1. كلون المشروع
git clone https://github.com/ahmedkhaledragab/kitchen-genius
cd kitchen-genius

# 2. ثبت الحزم
npm install

# 3. اعمل ملف .env (شوف القسم اللي تحت)
cp .env.example .env
# عدّل القيم في .env

# 4. شغل dev server
npm run dev
```

التطبيق هيشتغل على: `http://localhost:5173`

---

## متغيرات البيئة

اعمل ملف `.env` في الـ root وحط فيه:

```env
# Supabase - من Lovable Cloud أو Supabase Dashboard
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."

# Vite (نفس القيم بـ prefix VITE_)
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT"

# Lovable AI Gateway (لو بتستخدم AI features)
LOVABLE_API_KEY="..."
```

> 🔒 **مهم**: متعملش commit للملف `.env` ده على GitHub!

---

## البناء (Build)

```bash
npm run build
```

هيطلعلك مجلد `dist/` فيه:
- `dist/client/` → الـ assets الـ static (JS, CSS, images)
- `dist/server/` → الـ Worker bundle (مش Node.js)
- `dist/_worker.js/` → entry point للـ Cloudflare Worker

---

## النشر على Vercel

### ⭐ الأسهل والأنصح - مجاني تماماً وكل المميزات شغالة

### الخطوات:

1. **ادخل على [vercel.com](https://vercel.com)** وسجل دخول بـ GitHub
2. اضغط **Add New → Project**
3. اختار repository **`kitchen-genius`**
4. في **Environment Variables** ضيف كل المتغيرات من `.env`
5. اضغط **Deploy**

✅ **خلاص!** Vercel هيكتشف TanStack Start أوتوماتيك ويشغله صح.

### ربط دومين:
- في Vercel Dashboard → مشروعك → **Settings → Domains**
- اضافة الدومين بتاعك واتبع تعليمات DNS

---

## النشر على VPS بـ Wrangler + PM2

لو مصمم تشغل على VPS بتاعك، الطريقة الوحيدة المضمونة هي **wrangler**.

### 1️⃣ على السيرفر (SSH):

```bash
# ثبت Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ثبت pm2
sudo npm install -g pm2

# كلون المشروع
git clone https://github.com/ahmedkhaledragab/kitchen-genius
cd kitchen-genius

# ثبت الحزم
npm install
```

### 2️⃣ اعمل ملف `.env`:

```bash
nano .env
# الصق كل المتغيرات من قسم متغيرات البيئة فوق
```

### 3️⃣ ابني المشروع:

```bash
npm run build
```

### 4️⃣ شغل بـ wrangler عبر pm2:

```bash
# ثبت wrangler globally
sudo npm install -g wrangler

# شغل المشروع بـ pm2
pm2 start "wrangler dev --port 3000 --ip 0.0.0.0 --local" \
  --name kitchen-genius \
  --cwd /path/to/kitchen-genius

# احفظ pm2 يبدأ تلقائي مع السيرفر
pm2 save
pm2 startup
```

### 5️⃣ Nginx Reverse Proxy:

ضيف في `/etc/nginx/sites-available/kitchen-genius`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/kitchen-genius /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL مجاني
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### الأوامر المفيدة:

```bash
pm2 list                      # شوف كل processes
pm2 logs kitchen-genius       # شوف الـ logs
pm2 restart kitchen-genius    # restart
pm2 stop kitchen-genius       # stop
pm2 monit                     # مراقبة realtime
```

---

## النشر على Cloudflare Workers

```bash
# سجل دخول
npx wrangler login

# انشر
npm run build
npx wrangler deploy
```

ضيف الـ secrets:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put LOVABLE_API_KEY
```

---

## حل المشاكل الشائعة

### ❌ `dist/server/index.js` بيعمل exit مباشرة

**السبب**: ده Worker bundle مش Node.js. لازم تشغله بـ `wrangler` مش `node`.

**الحل**: استخدم الأمر:
```bash
npx wrangler dev --port 3000
```

### ❌ `serve dist/client` بيعرض Index of files

**السبب**: المشروع SSR، مش SPA. الـ static files لوحدها مش كافية.

**الحل**: استخدم wrangler أو انشر على Vercel.

### ❌ `vite preview` errors بسبب missing server module

**السبب**: `vite preview` للـ SPA، مش للـ TanStack Start.

**الحل**: استخدم `wrangler dev` بعد الـ build، أو `npm run dev` للتطوير.

### ❌ 502 Bad Gateway في Nginx

```bash
pm2 logs kitchen-genius      # شوف الـ error
pm2 restart kitchen-genius
```

### ❌ Build failed - missing env vars

تأكد إن ملف `.env` موجود وفيه كل المتغيرات المطلوبة.

### ❌ Port 3000 مشغول

غيّر الـ port في الأمر:
```bash
pm2 delete kitchen-genius
pm2 start "wrangler dev --port 3001 --ip 0.0.0.0" --name kitchen-genius
```

---

## 📊 مقارنة سريعة

| الطريقة | الصعوبة | التكلفة | المميزات شغالة | الأنصح؟ |
|---------|---------|---------|----------------|---------|
| **Vercel** | ⭐ سهل جداً | مجاني | ✅ كل المميزات | ⭐⭐⭐ |
| **Cloudflare Workers** | ⭐⭐ متوسط | مجاني | ✅ كل المميزات | ⭐⭐ |
| **VPS + Wrangler** | ⭐⭐⭐ متوسط-صعب | تكلفة VPS | ✅ كل المميزات | ⭐ |
| **Pure Node.js** | ❌ غير متاح | - | ❌ | ❌ |

---

## 🔗 روابط مفيدة

- [TanStack Start Docs](https://tanstack.com/start)
- [Vercel Deployment](https://vercel.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [PM2 Docs](https://pm2.keymetrics.io/)

---

## 💬 الدعم

لو واجهتك أي مشكلة، افتح issue على GitHub أو راجع قسم [حل المشاكل](#حل-المشاكل-الشائعة).

**نصيحة أخيرة**: لو هدفك توفر وقت ومشاكل، **Vercel هو الحل الأفضل** بدون منازع. مجاني وكل حاجة بتشتغل من أول مرة.
