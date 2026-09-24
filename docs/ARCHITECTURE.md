# TALSHYN FLOWERS — WhatsApp бот + CRM + Admin panel

**0-кезең: архитектура.** Бұл құжатта әзірге код жоқ. Мұнда жүйенің қалай құрылатыны, қандай аккаунттар мен кілттер керек екені және кодты қандай ретпен жазатынымыз жазылған.
Код жазу сіз осы құжатты мақұлдағаннан кейін басталады (соңындағы «Шешім керек сұрақтар» бөлімін қараңыз).

---

## 1. Жалпы архитектура

```
 Клиент (WhatsApp)                                   Администратор / менеджер
        │                                                     │  браузер
        ▼                                                     ▼
 ┌──────────────────┐   webhook (HTTPS POST)    ┌─────────────────────────────────┐
 │  Meta WhatsApp   │ ────────────────────────► │  TALSHYN app (Next.js, бір сервис)│
 │  Cloud API       │ ◄──────────────────────── │                                   │
 └──────────────────┘   Graph API /messages     │  /api/whatsapp/webhook  ← кіріс   │
                                                │  server/whatsapp  → жіберу        │
                                                │  server/bot       → сценарий      │
                                                │  server/services  → бизнес логика │
                                                │  server/ai        → (міндетті емес)│
                                                │  /admin/*         → Admin panel   │
                                                │  /api/cron/*      → еске салу, рассылка │
                                                └──────────┬───────────────┬────────┘
                                                           │ Prisma        │ фото
                                                           ▼               ▼
                                                   ┌──────────────┐  ┌──────────────┐
                                                   │ PostgreSQL   │  │ Фото сақтау  │
                                                   │ (бар дерек)  │  │ (S3/Blob)    │
                                                   └──────────────┘  └──────────────┘
                                                           │
                               Менеджерге хабарлама ◄──────┘ (Admin panel + Telegram / WhatsApp template)
```

### Неге бір Next.js қосымша (Express бөлек емес)?

Сіз «нақты себеп болмаса Express/Fastify» дедіңіз. Нақты себеп бар:

1. Репода **Next.js 16 + Prisma 6 + Auth** дайын тұр.
2. Admin panel те, webhook те, cron да **бір сервисте** болса — сізге **бір** deploy, **бір** `.env`, **бір** база. Программист емес адамға екі бөлек сервисті ұстау әлдеқайда қиын.
3. Бизнес логика `server/` папкасында Next.js-тен тәуелсіз жазылады. Кейін қажет болса оны бөлек Fastify сервисіне көшіру — бір күндік жұмыс.

### Негізгі принциптер

| Принцип | Қалай орындалады |
|---|---|
| Бот ештеңе ойдан шығармайды | Клиентке кететін **барлық** мәтін — код ішіндегі дайын шаблондар + базадан алынған сандар. AI тек клиент мәтінінен құрылымды дерек (тауар, саны, күн) алады, мәтін жазбайды. |
| Бір орталық база | Баға, қалдық, поставка датасы — тек PostgreSQL-де. Бот әр жолы базадан оқиды, кэштемейді → ескі баға шықпайды. |
| Қалдық тек бизнес ережесімен өзгереді | Stock тек тапсырыс CONFIRMED/PAID болғанда (баптауда таңдалады) бір транзакцияда азаяды, әр өзгеріс `StockMovement` журналына жазылады. |
| Спам жоқ | Бот клиентке өзі ешқашан бірінші жазбайды. Жаппай хабарлама тек админ «Растау» басқаннан кейін, тек рұқсат берген (opt‑in) клиенттерге. |
| Webhook сенімді | Meta қолтаңбасы (`X-Hub-Signature-256`) тексеріледі, бір хабарлама екі рет өңделмейді (`wamid` бойынша), Meta-ға 200 жауап бірден қайтарылады. |

---

## 2. Папка құрылымы

```
sayakhatshy-balakaylar/
├── app/                                  # Next.js (беттер + API)
│   ├── login/page.tsx                    # Админ кіру беті
│   ├── admin/
│   │   ├── layout.tsx                    # Сайдбар мәзірі, auth тексеру
│   │   ├── page.tsx                      # 📊 Dashboard / аналитика
│   │   ├── products/                     # 📦 Товары (тізім, қосу, өзгерту, фото)
│   │   ├── stock/                        # 📊 Остатки (+ қозғалыс журналы)
│   │   ├── prices/                       # 💰 Цены (жаппай өзгерту, тарих)
│   │   ├── supplies/                     # 🚚 Поставки (+ предзаказдар)
│   │   ├── orders/                       # 📋 Заказы (статус өзгерту)
│   │   ├── preorders/                    # 📋 Предзаказы
│   │   ├── customers/                    # 👥 Клиенты (CRM карточка)
│   │   ├── inbox/                        # 💬 Чаттар (менеджер клиентке жауап береді)
│   │   ├── broadcasts/                   # 📢 Рассылки
│   │   ├── settings/                     # ⚙️ Настройки + админдер
│   │   └── simulator/                    # 🧪 Бот симуляторы (Meta-сыз тест)
│   └── api/
│       ├── whatsapp/webhook/route.ts     # GET = verify, POST = кіріс хабарламалар
│       ├── cron/daily/route.ts           # поставка еске салу, low stock
│       ├── cron/broadcasts/route.ts      # рассылка кезегін жіберу
│       ├── uploads/route.ts              # тауар фотосын жүктеу
│       ├── auth/[...nextauth]/route.ts   # админ кіру
│       └── health/route.ts               # сервер тірі ме
├── server/                               # Бизнес логика (Next.js-тен тәуелсіз)
│   ├── env.ts                            # .env тексеру (zod) — кілт жоқ болса іске қосылмайды
│   ├── db.ts                             # Prisma client
│   ├── logger.ts                         # лог (token/телефон жасырылады)
│   ├── whatsapp/
│   │   ├── client.ts                     # text, list, buttons, image, template жіберу
│   │   ├── signature.ts                  # X-Hub-Signature-256 тексеру
│   │   ├── parse-webhook.ts              # Meta payload → ішкі формат
│   │   └── types.ts
│   ├── bot/
│   │   ├── engine.ts                     # state machine: хабарлама → күй → жауап
│   │   ├── commands.ts                   # "меню", "0", "менеджер", "стоп", нөмірлер
│   │   ├── flows/                        # main-menu, availability, price, supply,
│   │   │                                 # preorder, order, monobouquet, repeat, handoff
│   │   ├── texts/ru.ts, texts/kk.ts      # барлық бот мәтіндері (орыс/қазақ)
│   │   ├── ui.ts                         # батырма/тізім құрастыру (WhatsApp лимиттерімен)
│   │   └── language.ts                   # тілді анықтау
│   ├── ai/intent-parser.ts               # еркін мәтін → {тауар, саны, күн} (міндетті емес)
│   ├── services/                         # products, stock, orders, preorders, supplies,
│   │                                     # customers, broadcasts, notifications, settings, analytics
│   ├── notify/                           # telegram.ts, whatsapp-template.ts
│   └── security/                         # rate-limit.ts, redact.ts, auth-guard.ts
├── components/                           # Admin UI компоненттері
├── lib/                                  # ортақ утилиталар (₸ форматтау, zod схемалар)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                           # алғашқы админ + категориялар
├── tests/                                # бот сценарийлері, stock логикасы (vitest)
├── docs/                                 # ARCHITECTURE.md, META_SETUP.md, DEPLOY.md
├── Dockerfile
├── docker-compose.yml                    # app + postgres (жергілікті / VPS)
└── .env.example                          # барлық айнымалылар, мәнсіз
```

---

## 3. Database schema (Prisma — жоба)

Талап етілген модельдердің бәрі бар: Customer, Product, Category, Stock, Supply, Order, OrderItem, PreOrder, Message, Broadcast, Admin. Қосымша: StockMovement (қалдық журналы), SupplyItem, PreOrderItem, Conversation (бот күйі), BroadcastRecipient, Notification, PriceHistory, OrderStatusHistory, Setting, AuditLog.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────── Enums ─────────
enum AdminRole        { OWNER MANAGER }
enum CustomerType     { SHOP FLORIST EVENT RESELLER RETAIL OTHER }
enum CustomerStatus   { NEW ACTIVE VIP BLOCKED }
enum Language         { RU KK }
enum ProductKind      { WHOLESALE MONOBOUQUET }
enum ProductStatus    { ACTIVE HIDDEN ARCHIVED }
enum SupplyStatus     { PLANNED PREORDER_OPEN PREORDER_CLOSED ARRIVED CLOSED CANCELLED }
enum OrderStatus      { NEW PENDING CONFIRMED PAID READY COMPLETED CANCELLED }
enum OrderSource      { WHATSAPP_BOT MANAGER INSTAGRAM PREORDER OTHER }
enum PreOrderStatus   { NEW CONFIRMED CONVERTED CANCELLED }
enum StockMoveType    { SUPPLY_IN ORDER_OUT ORDER_RETURN ADJUSTMENT WRITE_OFF }
enum MsgDirection     { IN OUT }
enum ConversationMode { BOT MANAGER }
enum BroadcastStatus  { DRAFT APPROVED SENDING SENT CANCELLED }
enum RecipientStatus  { PENDING SENT DELIVERED READ FAILED SKIPPED }

// ───────── Админдер ─────────
model Admin {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          AdminRole @default(MANAGER)
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())

  handledOrders       Order[]        @relation("OrderHandler")
  createdBroadcasts   Broadcast[]    @relation("BroadcastCreator")
  approvedBroadcasts  Broadcast[]    @relation("BroadcastApprover")
  sentMessages        Message[]
  stockMovements      StockMovement[]
  auditLogs           AuditLog[]
}

// ───────── CRM: клиенттер ─────────
model Customer {
  id             String         @id @default(cuid())
  waId           String         @unique          // WhatsApp нөмірі, мыс. 77011234567
  profileName    String?                         // WhatsApp профиліндегі ат
  name           String?                         // клиент өзі айтқан ат
  companyName    String?
  type           CustomerType   @default(OTHER)
  city           String?
  language       Language       @default(RU)
  status         CustomerStatus @default(NEW)
  marketingOptIn Boolean        @default(false)   // рассылкаға рұқсат
  optInAt        DateTime?
  optOutAt       DateTime?
  notes          String?                         // менеджер жазбасы
  // Денормализацияланған статистика (тапсырыс COMPLETED болғанда жаңарады)
  ordersCount    Int            @default(0)
  totalSpent     Int            @default(0)      // ₸
  lastOrderAt    DateTime?
  firstSeenAt    DateTime       @default(now())
  lastInboundAt  DateTime?                       // 24 сағаттық терезе үшін

  preferredCategories Category[]
  orders         Order[]
  preOrders      PreOrder[]
  messages       Message[]
  conversation   Conversation?
  broadcastRecipients BroadcastRecipient[]
  notifications  Notification[]

  @@index([type])
  @@index([lastOrderAt])
}

// ───────── Каталог ─────────
model Category {
  id        String    @id @default(cuid())
  name      String                               // "Роза", "Spray rose"
  nameKk    String?
  slug      String    @unique
  emoji     String?                              // 🌹
  sortOrder Int       @default(0)
  isActive  Boolean   @default(true)
  products  Product[]
  customers Customer[]
}

model Product {
  id              String        @id @default(cuid())
  categoryId      String
  category        Category      @relation(fields: [categoryId], references: [id])
  name            String                          // "Роза"
  variety         String?                         // сорт: "Red Naomi"
  color           String?
  lengthCm        Int?                            // 60, 70
  stemsPerPack    Int                             // упаковкадағы дана
  pricePerPack    Int                             // ₸, бүтін сан
  minOrderPacks   Int           @default(1)
  kind            ProductKind   @default(WHOLESALE)
  status          ProductStatus @default(ACTIVE)
  photoUrl        String?
  description     String?
  sortOrder       Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  stock           Stock?
  stockMovements  StockMovement[]
  priceHistory    PriceHistory[]
  supplyItems     SupplyItem[]
  orderItems      OrderItem[]
  preOrderItems   PreOrderItem[]

  @@index([categoryId, status])
}

model Stock {
  productId         String   @id
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity          Int      @default(0)          // нақты қалдық, упаковка
  lowStockThreshold Int?                          // бос болса — жалпы баптаудан
  updatedAt         DateTime @updatedAt
  // CHECK (quantity >= 0) — migration ішінде SQL арқылы қосылады
}

model StockMovement {                             // қалдықтың әр өзгерісі
  id         String        @id @default(cuid())
  productId  String
  product    Product       @relation(fields: [productId], references: [id])
  type       StockMoveType
  delta      Int                                  // +10 / -5
  balance    Int                                  // өзгерістен кейінгі қалдық
  orderId    String?
  order      Order?        @relation(fields: [orderId], references: [id])
  supplyId   String?
  supply     Supply?       @relation(fields: [supplyId], references: [id])
  adminId    String?
  admin      Admin?        @relation(fields: [adminId], references: [id])
  note       String?
  createdAt  DateTime      @default(now())

  @@index([productId, createdAt])
}

model PriceHistory {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  oldPrice    Int
  newPrice    Int
  changedById String?
  createdAt   DateTime @default(now())
}

// ───────── Поставкалар ─────────
model Supply {
  id               String       @id @default(cuid())
  title            String?                        // "Поставка №12"
  expectedDate     DateTime     @db.Date          // админ енгізеді
  preorderDeadline DateTime?
  arrivedAt        DateTime?
  status           SupplyStatus @default(PLANNED)
  notes            String?
  reminderSentAt   DateTime?                      // "3 күн қалды" ескертуі жіберілді ме
  createdAt        DateTime     @default(now())

  items            SupplyItem[]
  preOrders        PreOrder[]
  orders           Order[]
  stockMovements   StockMovement[]
  broadcasts       Broadcast[]

  @@index([status, expectedDate])
}

model SupplyItem {                                // поставкада қандай позициялар күтіледі
  id            String  @id @default(cuid())
  supplyId      String
  supply        Supply  @relation(fields: [supplyId], references: [id], onDelete: Cascade)
  productId     String
  product       Product @relation(fields: [productId], references: [id])
  expectedQty   Int?
  receivedQty   Int?                              // келгенде админ енгізеді → stock-қа қосылады
  preorderLimit Int?                              // предзаказ лимиті (бос = шектеусіз)

  @@unique([supplyId, productId])
}

// ───────── Тапсырыстар ─────────
model Order {
  id             String      @id @default(cuid())
  number         String      @unique              // TF-000123
  customerId     String
  customer       Customer    @relation(fields: [customerId], references: [id])
  status         OrderStatus @default(NEW)
  source         OrderSource @default(WHATSAPP_BOT)
  supplyId       String?
  supply         Supply?     @relation(fields: [supplyId], references: [id])
  preOrderId     String?     @unique
  preOrder       PreOrder?   @relation(fields: [preOrderId], references: [id])
  totalAmount    Int                               // ₸, тапсырыс кезіндегі баға бойынша
  neededBy       DateTime?   @db.Date
  comment        String?
  stockDeductedAt DateTime?                         // stock бір рет қана азаяды
  confirmedAt    DateTime?
  paidAt         DateTime?                          // ТЕК админ қояды
  completedAt    DateTime?
  cancelledAt    DateTime?
  cancelReason   String?
  handledById    String?
  handledBy      Admin?      @relation("OrderHandler", fields: [handledById], references: [id])
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  items          OrderItem[]
  statusHistory  OrderStatusHistory[]
  stockMovements StockMovement[]

  @@index([status, createdAt])
  @@index([customerId])
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId    String
  product      Product @relation(fields: [productId], references: [id])
  quantity     Int                                 // упаковка
  unitPrice    Int                                 // сол кездегі баға (snapshot)
  lineTotal    Int
  productLabel String                              // "Роза Red Naomi 70 см" (snapshot)
}

model OrderStatusHistory {
  id          String       @id @default(cuid())
  orderId     String
  order       Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fromStatus  OrderStatus?
  toStatus    OrderStatus
  changedById String?
  note        String?
  createdAt   DateTime     @default(now())
}

model PreOrder {
  id              String         @id @default(cuid())
  number          String         @unique           // PO-000045
  customerId      String
  customer        Customer       @relation(fields: [customerId], references: [id])
  supplyId        String
  supply          Supply         @relation(fields: [supplyId], references: [id])
  status          PreOrderStatus @default(NEW)
  neededBy        DateTime?      @db.Date
  contactName     String                            // тапсырыс кезіндегі ат
  companyName     String?
  comment         String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  items           PreOrderItem[]
  order           Order?                             // поставка келгенде Order-ге айналады

  @@index([supplyId, status])
}

model PreOrderItem {
  id         String   @id @default(cuid())
  preOrderId String
  preOrder   PreOrder @relation(fields: [preOrderId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Int
}

// ───────── Чат ─────────
model Conversation {                              // боттың әр клиентпен күйі
  customerId    String           @id
  customer      Customer         @relation(fields: [customerId], references: [id], onDelete: Cascade)
  state         String           @default("MAIN_MENU")
  context       Json             @default("{}")  // таңдалған тауар, саны, т.б.
  mode          ConversationMode @default(BOT)
  handoffAt     DateTime?
  assignedToId  String?
  lastRequest   String?                          // менеджерге көрсету үшін
  updatedAt     DateTime         @updatedAt
}

model Message {
  id          String       @id @default(cuid())
  customerId  String
  customer    Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  direction   MsgDirection
  waMessageId String?      @unique                // Meta wamid → қайталанбау кепілі
  type        String                              // text, interactive, image, template
  body        String?
  payload     Json?
  status      String?                             // sent / delivered / read / failed
  error       String?
  sentById    String?                             // менеджер қолмен жазса
  sentBy      Admin?       @relation(fields: [sentById], references: [id])
  createdAt   DateTime     @default(now())

  @@index([customerId, createdAt])
}

// ───────── Рассылкалар ─────────
model Broadcast {
  id               String          @id @default(cuid())
  title            String
  templateName     String                          // Meta-да бекітілген шаблон
  templateLanguage String          @default("ru")
  templateParams   Json            @default("[]")
  audience         Json                            // сүзгі: тип, категория, соңғы тапсырыс т.б.
  status           BroadcastStatus @default(DRAFT)
  supplyId         String?
  supply           Supply?         @relation(fields: [supplyId], references: [id])
  createdById      String
  createdBy        Admin           @relation("BroadcastCreator", fields: [createdById], references: [id])
  approvedById     String?
  approvedBy       Admin?          @relation("BroadcastApprover", fields: [approvedById], references: [id])
  approvedAt       DateTime?
  sentAt           DateTime?
  createdAt        DateTime        @default(now())
  recipients       BroadcastRecipient[]
}

model BroadcastRecipient {
  id          String          @id @default(cuid())
  broadcastId String
  broadcast   Broadcast       @relation(fields: [broadcastId], references: [id], onDelete: Cascade)
  customerId  String
  customer    Customer        @relation(fields: [customerId], references: [id])
  status      RecipientStatus @default(PENDING)
  waMessageId String?
  error       String?
  sentAt      DateTime?

  @@unique([broadcastId, customerId])
}

// ───────── Жүйелік ─────────
model Notification {                              // админ панельдегі 🔔
  id         String    @id @default(cuid())
  type       String                               // NEW_PREORDER, NEW_ORDER, HANDOFF, SUPPLY_SOON, LOW_STOCK
  title      String
  body       String
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  readAt     DateTime?
  createdAt  DateTime  @default(now())
}

model Setting {                                   // админ өзгертетін баптаулар
  key       String   @id                          // low_stock_threshold, stock_deduct_on, address, ...
  value     Json
  updatedAt DateTime @updatedAt
}

model AuditLog {                                  // кім, қашан, не өзгертті
  id        String   @id @default(cuid())
  adminId   String?
  admin     Admin?   @relation(fields: [adminId], references: [id])
  action    String
  entity    String
  entityId  String?
  diff      Json?
  createdAt DateTime @default(now())
}
```

### Қалдық (stock) логикасы

```
Поставка ARRIVED ──(админ receivedQty енгізеді)──► Stock + (SUPPLY_IN)
Order NEW / PENDING                               ► Stock өзгермейді
Order → CONFIRMED (немесе PAID — баптауда)        ► Stock − (ORDER_OUT), бір транзакцияда,
                                                     қалдық жетпесе — қате, админге ескерту
Order → CANCELLED (stock бұрын азайған болса)     ► Stock + (ORDER_RETURN)
Админ қолмен түзету / сынған гүл                   ► ADJUSTMENT / WRITE_OFF
Instagram/телефон арқылы сату                     ► админ Order жасайды (source=INSTAGRAM)
```

* `stockDeductedAt` өрісі бір тапсырыс үшін қалдықтың екі рет азаюына жол бермейді.
* Азайту `UPDATE ... SET quantity = quantity - N WHERE quantity >= N` арқылы — екі менеджер бір уақытта растаса да, қалдық минусқа түспейді.
* Предзаказ stock-қа әсер етпейді. Поставка келгенде админ «Предзаказдарды тапсырысқа айналдыру» батырмасын басады → әр PreOrder → Order (source=PREORDER), кейін әдеттегі CONFIRMED/PAID логикасы.

### Бизнес циклі (жүйенің өзегі)

```
Supply PLANNED ─► PREORDER_OPEN ─► (рассылка, админ растаса) ─► PREORDER_CLOSED
      ▲                                                               │
      │                                                            ARRIVED
      │                                                               │
      │                          Stock + ◄─ receivedQty               │
      │                          Предзаказ → Order → CONFIRMED → Stock −
      │                          Қалғаны WhatsApp/Instagram арқылы сатылады
      └──────────── CLOSED ◄──── келесі поставка жоспарланады ◄───────┘
```

---

## 4. WhatsApp API flow

### Хабарлама қабылдау

```
1. Клиент жазады
2. Meta → POST https://<сіздің-домен>/api/whatsapp/webhook
3. Сервер:
   a) X-Hub-Signature-256 қолтаңбасын WHATSAPP_APP_SECRET арқылы тексереді (жарамсыз → 401)
   b) waMessageId бұрын өңделген бе? (иә → ештеңе істемейді; Meta кейде қайталап жібереді)
   c) Rate limit (бір нөмірден минутына ~20 хабарлама)
   d) Meta-ға 200 OK бірден қайтарады
   e) Фонда: Customer табу/жасау → Message сақтау → Conversation күйін оқу
      → bot engine → жауап(тар) → Graph API POST /{PHONE_NUMBER_ID}/messages
4. Статус webhook-тары (delivered/read/failed) → Message.status жаңарады
```

### Бот ішіндегі шешім ретi

```
кіріс хабарлама
  │
  ├─ Батырма/тізім басылды (interactive reply id)  → нақты әрекет
  ├─ Ғаламдық команда: "меню", "0", "start", "привет", "сәлем" → Главное меню
  │                    "менеджер" → менеджерге өту;  "стоп" → рассылкадан шығу
  ├─ Нөмір "1".."7" (батырма жоқ клиенттер үшін)     → мәзір пункті
  ├─ Күй күтетін мәтін (саны, аты, компания, күн)    → валидация → келесі қадам
  ├─ Еркін мәтін + AI қосулы → {тауар, саны, күн} → базадан тексеру
  │                             → "Правильно понял: …?" [Да] [Изменить] [Менеджер]
  └─ Түсінбеді → "Уточню информацию у менеджера." + [Меню] [Менеджер]
```

Conversation.mode = MANAGER болса, бот үндемейді; менеджер Admin panel → Чаттар арқылы жауап береді. Менеджер «Диалогты жабу» басқанда немесе клиент «меню» жазғанда бот қайта қосылады.

### WhatsApp шектеулері және оларды қалай шешеміз (адал түрде)

| Шектеу (Meta ережесі) | Біздің шешім |
|---|---|
| **Reply buttons — ең көбі 3 батырма**, мәтіні 20 таңба | Растау экраны: ✅ Подтвердить / ✏️ Изменить / ❌ Отменить — сыяды. Stock=0 экраны: 3 батырма — сыяды. |
| **List message — ең көбі 10 жол**, жол атауы 24 таңба | Главное меню (7 пункт + 🌐 Тіл) → List message. Тауар 10-нан көп болса → «Ещё ▶» жолы арқылы беттеу. |
| 👤 «Менеджер» батырмасы әр хабарламада бола алмайды (3 лимит) | Тізімдерде әрқашан «👤 Менеджер» жолы бар + «менеджер» сөзі кез келген кезде жұмыс істейді + әр хабарлама соңында «0 — меню». |
| Кейбір клиенттерде батырмалар көрінбеуі мүмкін (ескі клиент, WhatsApp Web ескі нұсқа) | Мәзір мәтінінде нөмірлер де бар, «1»…«7» жазса да жұмыс істейді. |
| **24 сағаттық терезе:** клиент соңғы рет жазғаннан кейін 24 сағат ішінде ғана еркін хабарлама жіберуге болады | Ботқа жауаптардың бәрі осы терезеде → тегін. Рассылка, «поставка келді», «повторить заказ?» — терезеден тыс → **тек Meta бекіткен template арқылы**, ақылы. |
| Template хабарламалар ақылы (Marketing / Utility санаты, әр хабарлама үшін) | Рассылка экраны жіберер алдында алушылар санын көрсетеді; админ растамай ештеңе кетпейді. Бағаны Meta pricing бетінен тексеру керек (Қазақстан тарифі). |
| Жаңа нөмір тәулігіне шектеулі санға ғана бірінші жаза алады (шамамен 250 клиенттен басталады, верификациядан кейін өседі) | Рассылка кезекпен, баяу жіберіледі; лимит баптауда. |
| Meta **тест нөмірі** тек 5 тіркелген нөмірге жаза алады | Тест үшін жеткілікті; нақты жұмысқа өз нөміріңізді қосу керек. |
| Бір нөмір бір уақытта Cloud API-да және кәдімгі WhatsApp қосымшасында | Meta-ның «coexistence» режимі бар (WhatsApp Business App нөмірін API-ға қосу), бірақ ол барлық елде/нөмірде қолжетімді емес — сіздің нөміріңізге тексеру керек. **Ұсыныс:** бот үшін бөлек жаңа SIM-нөмір. |
| WhatsApp ішіндегі төлем (WhatsApp Pay) Қазақстанда жоқ | Бот төлем қабылдамайды және «төленді» деп растамайды. PAID статусын тек админ қояды. Kaspi интеграциясы — кейінгі кезең (Kaspi-мен мерчант келісім керек). |
| WhatsApp Catalog / Product messages — Commerce Manager + Facebook каталог керек | 1-нұсқада тауар = фото + қолтаңба (image + caption). Каталог — кейін қосуға болады. |
| Webhook тек **HTTPS** публичный адресті қабылдайды, localhost болмайды | Тест кезінде Admin → 🧪 Симулятор (Meta-сыз), немесе уақытша туннель (cloudflared). Нақты жұмыста — deploy адресі. |

---

## 5. Admin panel құрылымы

| Бөлім | Не істеуге болады |
|---|---|
| 📊 **Dashboard** | Бүгін/апта/ай: жаңа клиенттер, тапсырыстар, предзаказдар, сатылым ₸, ТОП гүлдер, қайта тапсырыс берген клиенттер, cancelled, ⚠️ LOW STOCK тізімі, «📦 Поставка через 3 дня. Предзаказов: XX. Забронировано: XX упаковок» баннері, 🔔 хабарламалар. |
| 📦 **Товары** | Тауар қосу/өзгерту: фото, атауы, категория, сорт, ұзындығы, баға, упаковка саны, қалдық, минимум, статус (белсенді/жасырын). Монобукеттер — осы жерде, түрі MONOBOUQUET. |
| 📊 **Остатки** | Барлық тауардың қалдығы бір кестеде, түзету (+/−, себебімен), қалдық журналы, LOW STOCK белгісі. |
| 💰 **Цены** | Бағаларды бір кестеде тез өзгерту, баға тарихы. Сақтаған сәттен бот жаңа бағаны көрсетеді. |
| 🚚 **Поставки** | Жаңа поставка (дата, позициялар), «🟢 Открыть предзаказ» / «Закрыть», «Поставка пришла» (келген сандарды енгізу → stock), предзаказдар тізімі және жиынтығы (қай гүлден қанша упаковка), «Предзаказдарды тапсырысқа айналдыру». |
| 📋 **Заказы / Предзаказы** | Сүзгі статус бойынша, тапсырыс карточкасы, статус өзгерту (NEW→…→COMPLETED), қолмен тапсырыс қосу (Instagram/телефон). |
| 👥 **Клиенты** | CRM: аты, нөмірі, компания, тип, қала, қандай гүл алады, тапсырыс тарихы, жалпы сома, статус, жазба, рассылкаға рұқсат. Нөмір толық тек OWNER-ге көрінеді. |
| 💬 **Чаттар** | Менеджерді күтіп тұрған клиенттер, хат алмасу тарихы, клиентке жауап жазу, диалогты ботқа қайтару. |
| 📢 **Рассылки** | Шаблон таңдау → аудитория сүзгісі → алдын ала қарау (алушылар саны) → **Растау** → жіберу, нәтиже (жеткізілді/оқылды/қате). |
| ⚙️ **Настройки** | LOW STOCK шегі, stock қай статуста азаяды (CONFIRMED/PAID), мекенжай, жұмыс уақыты, менеджер хабарлама арналары, админдер мен рөлдер (OWNER/MANAGER). |
| 🧪 **Симулятор** | Ботты браузерде тексеру — WhatsApp-сыз, сол логикамен. |

Рөлдер: **OWNER** — бәрі; **MANAGER** — тапсырыстар, чаттар, клиенттер (баға/баптау/рассылка растау жоқ).

---

## 6. Қандай credentials керек (нақты тізім)

Ешбір кілтті ойдан шығармаймын. `.env.example` файлында тек атаулар болады, мәндерін сіз өзіңіз енгізесіз.

### Meta / WhatsApp (міндетті)

| Айнымалы | Бұл не | Қайдан аласыз |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | API-ға кіру кілті | **Тұрақты** токен: business.facebook.com → Settings → Users → **System users** → Add (Admin) → Assign assets (App + WhatsApp account, Full control) → **Generate token** → рұқсаттар: `whatsapp_business_messaging`, `whatsapp_business_management`, мерзімі: Never. ⚠️ API Setup бетіндегі уақытша токен 24 сағатта өшеді — тек тест үшін. |
| `WHATSAPP_PHONE_NUMBER_ID` | Нөмірдің ID-і (нөмірдің өзі емес!) | developers.facebook.com → сіздің App → WhatsApp → **API Setup** → «Phone number ID» |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID (шаблондар үшін) | Сол бетте → «WhatsApp Business Account ID» |
| `WHATSAPP_VERIFY_TOKEN` | Webhook-ты растауға арналған құпия сөз | **Сіз өзіңіз ойлап табасыз** (мен кездейсоқ жасайтын команданы беремін). Сол мәнді Meta Console → WhatsApp → Configuration → Webhook → «Verify token» өрісіне қоясыз. |
| `WHATSAPP_APP_SECRET` | ⚠️ **Сіздің тізіміңізде жоқ, бірақ міндетті.** Webhook қолтаңбасын тексеру үшін (signature verification) | developers.facebook.com → App → **App settings → Basic → App secret** → Show |
| `WHATSAPP_API_VERSION` | Graph API нұсқасы, мыс. `v23.0` | API Setup бетіндегі мысал сұраныстарда көрсетілген нұсқа |

### Сервер / база (міндетті)

| Айнымалы | Бұл не | Қайдан |
|---|---|---|
| `DATABASE_URL` | PostgreSQL мекенжайы | Хостинг таңдауына байланысты: Neon/Supabase панелінен көшіресіз, немесе Docker-да автоматты |
| `AUTH_SECRET` | Админ сессиясын шифрлау | Мен беретін команда арқылы кездейсоқ жасалады |
| `APP_BASE_URL` | Сайттың адресі, мыс. `https://talshyn.example.kz` | Deploy-дан кейін |
| `CRON_SECRET` | Cron endpoint-терді қорғау | Кездейсоқ жасалады |
| `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Бірінші OWNER аккаунт | Сіз таңдайсыз; бірінші кіргеннен кейін пароль ауыстырылады |

### Фото сақтау (біреуі)

| Нұсқа | Айнымалылар |
|---|---|
| Vercel Blob (Vercel таңдасаңыз) | `BLOB_READ_WRITE_TOKEN` |
| S3-үйлесімді (Cloudflare R2 / AWS S3 / Supabase Storage) | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` |

WhatsApp фотоны публичный HTTPS сілтеме арқылы алады, сондықтан фото жергілікті дискте емес, осы сақтау орнында болуы керек.

### Қосымша (міндетті емес)

| Айнымалы | Не үшін |
|---|---|
| `ANTHROPIC_API_KEY` | AI еркін мәтінді түсіну (console.anthropic.com). Жоқ болса бот тек батырма/нөмір/кілт сөздермен жұмыс істейді. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_ID` | Менеджерге жедел хабарлама Telegram-ға (тегін, 24 сағ. шектеуі жоқ) |
| `MANAGER_WHATSAPP_NUMBERS` | Менеджерге WhatsApp арқылы хабарлама (Utility template керек, ақылы) |

### Аккаунттан тыс не керек

1. **Бөлек телефон нөмірі** (SIM) — SMS/қоңырау қабылдай алатын, WhatsApp-та тіркелмеген (немесе ондағы аккаунт өшірілген).
2. **Meta Business portfolio** (business.facebook.com) + **Business verification** — ЖСН/БСН, тіркеу куәлігі. Верификациясыз шектеулер қатаң. Бұл бірнеше күннен 2 аптаға дейін созылуы мүмкін — **қазірден бастаған дұрыс.**
3. **Display name** «TALSHYN FLOWERS» — Meta бекітеді.
4. WhatsApp account-қа **төлем картасы** (template хабарламалар үшін).
5. **Бекітілетін template-тер** (WhatsApp Manager → Message templates). Мәтіндерін мен дайындап беремін:
   * `supply_preorder_open` (Marketing) — жаңа поставка, предзаказ ашық
   * `repeat_order_offer` (Marketing) — «өткен жолы алған позиция қайта бар»
   * `order_status_update` (Utility) — тапсырыс статусы
   * `manager_alert` (Utility, тек менеджерге WhatsApp арқылы хабарлама керек болса)

---

## 7. Не дайын болады / қай жерде сіздің әрекетіңіз керек

| Бөлік | Мен жасаймын (кодта) | Сіздің әрекетіңіз |
|---|---|---|
| Бот сценарийі, мәзір, предзаказ, тапсырыс, stock=0, менеджерге өту, қайта тапсырыс | ✅ толық | Ботты симулятор арқылы тексеру |
| Admin panel (барлық бөлімдер), аналитика | ✅ толық | Тауарлар, бағалар, поставка енгізу |
| База схемасы, миграциялар, seed | ✅ | Хостингте база ашу (1 рет) |
| Webhook, қолтаңба тексеру, қауіпсіздік | ✅ | Callback URL мен Verify token-ды Meta Console-ға қою |
| WhatsApp-қа жіберу | ✅ | Access token, Phone number ID, App secret енгізу |
| Рассылка | ✅ механизм | Template-терді Meta-да бекіту, төлем картасы |
| AI мәтін түсіну | ✅ (қосу/өшіру) | Қаласаңыз API key алу |
| Deploy (Docker / Vercel) | ✅ файлдар + нұсқаулық | Аккаунт ашу, «Deploy» басу, `.env` мәндерін енгізу |
| Meta Business verification, нөмір | ❌ (мен істей алмаймын) | Құжаттар, SIM |

---

## 8. Кезеңдер жоспары

Әр кезеңнің соңында: не жасалды, сіз не басасыз/енгізесіз, **TEST CHECKLIST**.

| # | Кезең | Нәтиже |
|---|---|---|
| 0 | **Архитектура** (осы құжат) | Сіздің мақұлдауыңыз |
| 1 | Негіз: Prisma schema, миграция, seed, `.env` тексеру, Docker, админ кіру | Админ панельге кіре аласыз |
| 2 | Admin: Товары, Категории, Остатки, Цены, Поставки, фото жүктеу | Каталогты толтыра аласыз |
| 3 | WhatsApp webhook + client + Главное меню, Наличие, Прайс, Следующая поставка, Адрес, Монобукеты + 🧪 Симулятор | Бот жауап береді |
| 4 | Предзаказ және тапсырыс flow, растау экраны, stock=0 сценарийі, менеджерге хабарлама | Бот тапсырыс жинайды |
| 5 | Заказы (статустар + stock логикасы), CRM Клиенты, қайта тапсырыс, менеджерге өту + Чаттар | Толық сату циклі |
| 6 | Рассылки (template, opt‑in/opt‑out, растау), cron: «3 күн қалды», LOW STOCK, Dashboard аналитика | Маркетинг + аналитика |
| 7 | AI intent parser (міндетті емес), қазақ тілі | Еркін мәтінді түсіну |
| 8 | Production deploy + Meta-ны толық баптау + **толық іске қосу нұсқаулығы** | Нақты клиенттер жаза алады |

---

## 9. Қауіпсіздік

| Талап | Шешім |
|---|---|
| Webhook verification | GET `hub.verify_token` == `WHATSAPP_VERIFY_TOKEN` тексеріледі (constant-time) |
| Signature verification | POST денесінің HMAC‑SHA256 (`WHATSAPP_APP_SECRET`) == `X-Hub-Signature-256`, raw body бойынша |
| Authentication | Auth.js credentials, пароль bcrypt хэші, httpOnly + secure cookie, логин әрекеттеріне лимит |
| Admin authorization | Әр server action / API-да рөл тексеру (OWNER/MANAGER), middleware `/admin/*` қорғайды |
| Rate limiting | Webhook: бір нөмірге; логин: IP-ге; admin API: сессияға |
| Input validation | Барлық кіріс zod схемалары арқылы (саны > 0, минимумнан кем емес, т.б.) |
| SQL injection | Тек Prisma (параметрленген сұраныстар), raw SQL жоқ немесе `Prisma.sql` арқылы ғана |
| XSS | React автоматты escape, `dangerouslySetInnerHTML` қолданылмайды, CSP header-лер, клиент мәтіндері тек мәтін ретінде |
| Secrets | Тек `.env`, `.gitignore`-да бар; `server/env.ts` іске қосылғанда тексереді |
| Логтар | Logger `access_token`, `Authorization`, `app_secret` өрістерін `[REDACTED]` етеді; телефон `7701***4567` |
| Жеке деректер | Толық нөмір тек OWNER-ге; MANAGER-ге жасырын; бот клиентке басқа клиенттің деректерін ешқашан көрсетпейді; клиент «удалить мои данные» сұраса — админ анонимдей алады |
| CSRF | Server actions (Next.js origin тексеру) + SameSite cookie |

---

## 10. Шешім керек сұрақтар

Код жазуды бастау үшін осыларға жауап беріңіз:

1. **Хостинг:**
   A) **Vercel + Neon Postgres** (ұсынамын: сервер басқару жоқ, тегін бастауға болады, HTTPS автоматты)
   B) Өз VPS-іңіз + Docker Compose (ps.kz / Hetzner, айына ~5–10 $, серверге өзіңіз жауаптысыз)
2. **Нөмір:** бот үшін бөлек жаңа SIM (ұсынамын) ме, әлде қазіргі WhatsApp Business нөмірі ме?
3. **Менеджерге хабарлама:** Admin panel + Telegram (ұсынамын, тегін) ме, әлде WhatsApp арқылы (template, ақылы)?
4. **Stock қашан азаяды:** CONFIRMED кезінде (ұсынамын — бронь тез бекітіледі) ме, PAID кезінде ме? (Кейін баптаудан өзгертуге болады.)
5. **Баға бірлігі:** баға **упаковкаға** ма, әлде **бір данаға**? Бір упаковкада әдетте қанша дана (роза 25? spray rose 10?)
6. **Монобукеттер:** дайын тұрады ма (қалдығы бар), әлде тапсырыспен жасалады ма? Бағасы қалай есептеледі?
7. **AI:** қазір қосамыз ба (Anthropic API key керек, аз ақылы), әлде кейін бе?
