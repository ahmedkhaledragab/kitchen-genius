# Kitchen Genius 🍳

تطبيق وصفات طبخ بالذكاء الاصطناعي. **SPA** بسيط يشتغل على أي استضافة (Hostinger, cPanel, Netlify, GitHub Pages).

🔗 [Lovable Project](https://lovable.dev/projects/e9d04f20-5322-4b46-b4ad-d7ef4e85ae09)

---

## 🚀 التشغيل المحلي

```bash
git clone https://github.com/ahmedkhaledragab/kitchen-genius
cd kitchen-genius
npm install
npm run dev
```

التطبيق هيشتغل على: `http://localhost:8080`

---

## 📦 البناء والرفع على Hostinger

### 1️⃣ ابني المشروع
```bash
npm run build
```

هتلاقي مجلد `dist/` فيه:
- `index.html` — الملف الرئيسي
- `assets/` — كل الـ JS و CSS
- `.htaccess` — مهم جداً لـ routing على Hostinger
- `manifest.webmanifest`, `sitemap.xml`, `robots.txt`
- `favicon.svg`, `apple-touch-icon.png`, `sw.js`

### 2️⃣ ارفع على Hostinger
1. ادخلي **Hostinger File Manager** → `public_html/`
2. احذفي أي ملفات قديمة
3. ارفعي **محتوى مجلد `dist/`** (مش المجلد نفسه — اللي جواه)
4. تأكدي إن ملف `.htaccess` موجود (مهم جداً للـ routing!)

### 3️⃣ خلاص!
الموقع شغال على دومينك. كل الـ AI features شغالة عبر Lovable Cloud.

---

## 🛠️ التقنيات

- **React 19** + **TypeScript** + **Vite 7**
- **TanStack Router** (file-based routing، SPA mode)
- **Tailwind CSS v4** + **shadcn/ui**
- **TanStack Query** للـ data fetching
- **Lovable Cloud** للـ Database + Auth + Storage + Edge Functions
- **Lovable AI Gateway** لتوليد الوصفات والصور
- **PWA** — يثبّت كتطبيق على الموبايل

---

## 🌐 Custom Domain

من Lovable: **Settings → Domains → Connect Domain**

أو على Hostinger: ادخلي **Domains** → اضيفي الدومين بتاعك → اربطيه بالاستضافة.

---

## ⚠️ ملاحظات مهمة

- ده **SPA** (Single Page App). كل الـ routing client-side.
- ملف `.htaccess` ضروري لو هترفعي على Apache/Hostinger/cPanel.
- لو هترفعي على Nginx، اعملي rewrite rule بدل `.htaccess`.
- كل الـ backend logic في **Lovable Cloud Edge Functions** (مش محتاج سيرفر).
