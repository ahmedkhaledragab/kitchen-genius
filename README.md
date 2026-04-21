# Kitchen Genius 🍳

تطبيق ويب لتوليد وصفات الطبخ بالذكاء الاصطناعي، مبني على **Lovable** + **TanStack Start** + **Lovable Cloud**.

🔗 **Lovable Project**: https://lovable.dev/projects/e9d04f20-5322-4b46-b4ad-d7ef4e85ae09

---

## 🚀 طرق التعديل

### 1. Lovable (الأسهل)
ادخل على [Lovable Project](https://lovable.dev/projects/e9d04f20-5322-4b46-b4ad-d7ef4e85ae09) وابدأ الكتابة. التغييرات بتتعمل commit أوتوماتيك على GitHub.

### 2. IDE محلي
```bash
git clone <YOUR_GIT_URL>
cd kitchen-genius
npm install
npm run dev
```
> يتطلب Node.js 20+ ([nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### 3. GitHub / Codespaces
عدّل الملفات مباشرة من GitHub أو افتح Codespace من زر **Code**.

---

## 🛠️ التقنيات

- **Vite 7** + **TypeScript** + **React 19**
- **TanStack Start** (SSR على Cloudflare Workers runtime)
- **Tailwind CSS v4** + **shadcn/ui**
- **Lovable Cloud** (Database, Auth, Storage, Edge Functions, AI)

---

## 📦 النشر

### الطريقة الموصى بها: من Lovable
افتح Lovable واضغط **Share → Publish**.

### نشر يدوي
- **Vercel** أو **Cloudflare Pages**: connect الـ repo وانشر مباشرة
- **VPS**: راجع [DEPLOYMENT.md](./DEPLOYMENT.md) للتفاصيل الكاملة

> ⚠️ المشروع مبني على **Cloudflare Workers runtime** مش Node.js عادي. لا يعمل مع `node dist/server/index.js`.

---

## 🌐 Custom Domain

من Lovable: **Project → Settings → Domains → Connect Domain**

تفاصيل: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain)

---

## 📚 موارد إضافية

- [دليل النشر الكامل (DEPLOYMENT.md)](./DEPLOYMENT.md)
- [Lovable Docs](https://docs.lovable.dev)
- [TanStack Start Docs](https://tanstack.com/start)
