# أعمالي

صفحة تعرض أعمال حسين الطويل (تطبيقات ومواقع) بأسلوب متاجر التطبيقات.

- صفحة ثابتة: `index.html` + `style.css` + `app.js`، بلا بناء.
- **لإضافة مشروع:** أضف كتلة في `projects.json` (الحقول: `id`, `type` = `app`/`web`, `name`, `tagline`, `version`, `icon`, `url`, `what`, `features`, `audience`, `goal`, `whatsNew`, `color`، و`note` اختياري)، وضع أيقونته في `assets/icons/`.
- **البانر المميز:** قائمة `featured` في `projects.json`.
- **التشغيل محلياً:** `python3 -m http.server` ثم افتح `http://localhost:8000`.
- **بعد تعديل `style.css` أو `app.js`:** ارفع رقم `?v=` في `index.html` حتى لا يعرض المتصفح نسخة قديمة من الكاش.
