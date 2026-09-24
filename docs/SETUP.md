# TALSHYN FLOWERS — іске қосу нұсқаулығы

Бұл құжат әр кезеңмен толықтырылады.

* **1-кезең** — Vercel + Neon-ға шығару және админ панельге кіру.
* **2-кезең** — фото сақтау (Vercel Blob) және каталогты толтыру.

Терминал керек емес — бәрі браузерде жасалады.

---

## 1-кезең. Vercel + Neon

### Қадам 1. Кодты `main` тармағына біріктіру

Vercel сайтты әдетте `main` тармағынан жариялайды. Код қазір `claude/busy-bardeen-seggu9` тармағында тұр.

1. Pull request ашылған: https://github.com/aidana171095kz-art/sayakhatshy-balakaylar/pull/2
2. Бетті төменге түсіріп, **Merge pull request** → **Confirm merge** басыңыз.
3. «Pull request successfully merged» жазуы шықса — дайын.

### Қадам 2. Vercel-де жоба ашу

1. https://vercel.com → **Sign Up / Log in** → **Continue with GitHub**.
2. **Add New… → Project**.
3. Тізімнен `sayakhatshy-balakaylar` табыңыз → **Import**.
   (Көрінбесе: **Adjust GitHub App Permissions** → осы репозиторийге рұқсат беріңіз.)
4. Framework: **Next.js** өзі анықталады. Басқа ештеңені өзгертпеңіз.
5. ⚠️ **Deploy-ды әзірге баспаңыз** — алдымен база мен айнымалылар керек. Басып қойсаңыз, қорықпаңыз: build қатемен тоқтайды, 5-қадамда қайта іске қосамыз.

### Қадам 3. Neon базасын қосу

1. Vercel → сіздің жоба → **Storage** қойындысы → **Create Database**.
2. **Neon** (Serverless Postgres) таңдаңыз → **Continue**.
3. Region: **Frankfurt (eu-central-1)** — Астанаға ең жақыны. План: **Free**.
4. Database name: `talshyn` → **Create**.
5. «Connect to project» терезесінде барлық ортаны (**Production, Preview, Development**) белгілеп → **Connect**.
6. Тексеру: **Settings → Environment Variables** ішінде `DATABASE_URL` және `DATABASE_URL_UNPOOLED` пайда болуы керек.
   Егер `DATABASE_URL_UNPOOLED` жоқ болса: Neon Console → **Connect** → «Connection pooling» ажыратулы күйдегі жолды көшіріп, `DATABASE_URL_UNPOOLED` атымен қолмен қосыңыз.

### Қадам 4. Айнымалыларды енгізу

**Settings → Environment Variables** → әрқайсысын **Add** арқылы қосыңыз (Environments: барлығы белгіленген):

| Key | Value (мәні) |
|---|---|
| `AUTH_SECRET` | Кездейсоқ ұзын жол (төменде қалай жасау керек) |
| `ADMIN_EMAIL` | Сіздің email-іңіз — админ панельге кіру логині |
| `ADMIN_INITIAL_PASSWORD` | Уақытша пароль: кемінде 10 таңба, әріп + сан. Бірінші кіргенде ауыстырасыз |

**`AUTH_SECRET` қалай жасау керек (компьютерде, 30 секунд):**
1. Chrome-да кез келген бетте **F12** басыңыз (Mac: `Cmd+Option+J`) → **Console** қойындысы.
2. Мынаны қойып, **Enter** басыңыз:
   ```js
   crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
   ```
3. Шыққан 64 таңбалы жолды (тырнақшасыз) `AUTH_SECRET` мәніне қойыңыз.

> ⚠️ Бұл мәндерді ешкімге жібермеңіз, чатқа да жазбаңыз. Мен оларды ешқашан сұрамаймын.

### Қадам 5. Deploy

1. **Deployments** қойындысы → ең соңғы deployment → **⋯ → Redeploy** (немесе жаңа жоба болса **Deploy**).
2. 2–4 минут күтіңіз. Build log ішінде мыналар болуы керек:
   * `All migrations have been successfully applied` (немесе `No pending migrations`)
   * `✅ OWNER админ жасалды: сіздің@email`
   * `✅ Seed аяқталды.`
3. Сәтті болса: **Visit** басыңыз. Адрес мынадай болады: `https://sayakhatshy-balakaylar.vercel.app` (сіздікі басқаша болуы мүмкін).
4. Сол адресті **Settings → Environment Variables → `APP_BASE_URL`** ретінде қосыңыз (мыс. `https://sayakhatshy-balakaylar.vercel.app`, соңында `/` жоқ).

### Қадам 6. Тексеру және бірінші кіру

1. Браузерде ашыңыз: `https://<сіздің-адрес>/api/health` → `{"ok":true,"db":true}` шығуы керек.
2. `https://<сіздің-адрес>/login` → `ADMIN_EMAIL` және `ADMIN_INITIAL_PASSWORD` енгізіңіз.
3. Жүйе бірден **«Смена пароля»** бетіне жібереді → уақытша парольді, содан кейін жаңа парольді екі рет енгізіңіз.
4. Dashboard ашылады: «Категорий: 6», қалғаны 0.
5. Қауіпсіздік үшін: Vercel → Environment Variables → `ADMIN_INITIAL_PASSWORD` → **Delete**. Ол енді керек емес (тек база бос кезде бір рет қолданылады).

### Бірдеңе дұрыс болмаса

| Белгі | Себебі және шешімі |
|---|---|
| Build: `.env қате толтырылған: AUTH_SECRET…` | `AUTH_SECRET` жоқ немесе 32 таңбадан қысқа → 4-қадам |
| Build: `Environment variable not found: DATABASE_URL_UNPOOLED` | 3-қадамның 6-тармағы |
| Build: `ADMIN_INITIAL_PASSWORD талапқа сай емес` | Кемінде 10 таңба, әріп + сан болсын |
| Build: `Бірде-бір админ жоқ` ескертуі | `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` қосып, Redeploy |
| `/api/health` → `"db":false` | Neon базасы жобаға қосылмаған → 3-қадам |
| «Слишком много неудачных попыток» | 5 рет қате пароль → 15 минут күтіңіз |
| Парольді ұмыттыңыз | Claude-ға жазыңыз — қалпына келтіру командасын беремін |

---

## 2-кезең. Фото және каталог

### Қадам 1. Жаңарту

PR-ге жаңа commit-тер қосылды. Егер PR әлі merge болмаса — 1-кезеңдегідей **Merge pull request** басыңыз. Vercel өзі қайта жариялайды, база өзі жаңарады (жаңа миграция). Бұрын енгізген деректер сақталады.

### Қадам 2. Vercel Blob қосу (тауар фотосы үшін)

1. Vercel → сіздің жоба → **Storage** → **Create Database** (немесе **Create Store**) → **Blob** → **Continue**.
2. Атауы: `talshyn-photos` → **Create**.
3. «Connect to project» терезесінде барлық ортаны белгілеп → **Connect**. `BLOB_READ_WRITE_TOKEN` өзі қосылады — оны қолмен көшірудің қажеті жоқ.
4. **Deployments → ⋯ → Redeploy**.
5. Тексеру: Admin → **Настройки** → «Подключения» бөлімінде `✅ BLOB_READ_WRITE_TOKEN`.

Blob қоспасаңыз да бәрі жұмыс істейді: тауар формасында фото жүктеу орнына сілтеме (https://…) қоюға болады.

Фото талабы: **JPG немесе PNG** (WhatsApp басқа форматты қабылдамайды). Телефоннан үлкен фото таңдасаңыз — браузер оны өзі кішірейтеді.

### Қадам 3. Каталогты толтыру (ұсынылатын рет)

1. **⚙️ Настройки** → телефон, WhatsApp нөмірі, Instagram, Telegram, LOW STOCK порогы, монобукет өлшемдері/ораулары → әр бөлімде **Сохранить**.
2. **🌷 Товары → + Добавить товар** → әр гүлге: категория, сорт, ұзындығы, **упаковкадағы саны** (әр тауарға өзінікі), баға, минимум, бар болса «Начальный остаток».
3. **📦 Поставки → + Новая поставка** → атауы, күні → товарлар мен «Заказано» → **🟢 Открыть предзаказ**.
4. Поставка келгенде: **📦 Поставка пришла** → әр позицияға **нақты келген** санды жазыңыз → сақтау.
5. Предзаказдар бөлімінде → **✅ Создать заказ и забронировать**.

⚠️ Тест үшін ойдан тауар/клиент енгізбеңіз — бұл нақты база. Тексеріп көргіңіз келсе, тауарды жасап, кейін **Скрыть** басыңыз.

---

## Әзірлеушіге: жергілікті іске қосу (міндетті емес)

```bash
cp .env.example .env              # DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, ADMIN_* толтырыңыз
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                       # http://localhost:3000/login

npm test                          # тесттер бөлек базада: TEST_DATABASE_URL (әдепкі: localhost/talshyn_test)
npm run typecheck && npm run lint
```

Docker (VPS балама нұсқасы): `.env` толтырып (`POSTGRES_PASSWORD` қоса), `docker compose up -d --build`.
