# حاسبة الصيرفة (Sarafa)

حاسبة تحويل بين الدينار العراقي والليرة التركية والدولار.

- **سعر البنك** يتحدث تلقائياً: ملف `rates.json` يتحدث مرتين باليوم من `egcurrency.com`، والتطبيقات تقرأه من هذا المستودع.
- **سعر السوق للدينار** يكتبه المستخدم يدوياً.
- الكود واحد لكل المنصات: مجلد `www/`.

## تحميل الملفات

من صفحة **Releases** (آخر نسخة):

- ويندوز: `Sarafa-Setup-*.exe` (يتثبت) أو `Sarafa-Portable-*.exe` (يشتغل مباشرة)
- أندرويد: `Sarafa.apk`
- كروم: `Sarafa-Chrome-Extension.zip` (فك الضغط، ثم من `chrome://extensions` فعّل Developer mode واضغط Load unpacked واختر المجلد)

## آيفون

كود التطبيق نفسه جاهز. بناء ملف الآيفون يحتاج ماك مع Xcode، وحساب مطوّر آبل للتوزيع.
على الماك: `npm ci && npx cap add ios && npx cap sync ios && npx cap open ios`

## تحديث الأسعار يدوياً

`node scripts/update-rates.mjs`
