# Mono — AI-Powered Income & Expense Tracker 💸📈

<div align="center">

<img src="assets/images/mono_preview_mockup.png" alt="Mono App Mockup" width="780" style="max-width: 100%; border-radius: 12px;"/>

<br/><br/>

**A modern, production-grade personal finance and smart expense tracking ecosystem built with Flutter, BLoC, Node.js, Express, React, and TiDB Cloud (MySQL).**

[![Install on Android](https://img.shields.io/badge/Instant%20Install-BetaDrop-2563EB?logo=android&logoColor=white&style=for-the-badge)](https://betadrop.app/i/qQhg9L)
[![Download APK](https://img.shields.io/badge/Download%20APK-Google%20Drive-34A853?logo=google-drive&logoColor=white&style=for-the-badge)](https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing)

<br/>

[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.x-0175C2?logo=dart&logoColor=white)](https://dart.dev)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black?logo=express&logoColor=white)](https://expressjs.com)
[![Render](https://img.shields.io/badge/Render-Live%20Online-46E3B7?logo=render&logoColor=black)](https://mono-nbt6.onrender.com/api/health)
[![TiDB Cloud](https://img.shields.io/badge/TiDB%20Cloud-MySQL-00758F?logo=mysql&logoColor=white)](https://tidbcloud.com)
[![BLoC](https://img.shields.io/badge/Architecture-BLoC-8A2BE2)](https://bloclibrary.dev)
[![Currency](https://img.shields.io/badge/Currency-INR%20(%E2%82%B9)-16A34A)](#)

</div>

---

## 📥 Download & Install Release APK (Android)

Get the latest production-ready build for Android:

[![BetaDrop Direct Install](https://img.shields.io/badge/Instant_Install-BetaDrop-2563EB?style=for-the-badge&logo=android&logoColor=white)](https://betadrop.app/i/qQhg9L)
[![Download APK Button](https://img.shields.io/badge/%E2%AC%87%EF%B8%8F_Download_Mono_APK_v1.0.0-Google_Drive-34A853?style=for-the-badge&logo=google-drive&logoColor=white)](https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing)

- 📲 **Instant 1-Click Install Link (BetaDrop)**: [https://betadrop.app/i/qQhg9L](https://betadrop.app/i/qQhg9L) *(Guest link: [https://betadrop.app/i/fCW2Qm](https://betadrop.app/i/fCW2Qm))*
- 📂 **Direct Google Drive Link**: [Mono Release APK Folder](https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing)
- **Version**: `v1.0.0 (Production Release)`
- **Package**: `com.mono.mono_app`
- **Target OS**: Android 6.0+ (API Level 23+)
- **Cloud Backend**: Live connected to **Render** & **TiDB Cloud MySQL**

#### Quick Installation Guide:
1. Tap the **BetaDrop Instant Install Link** or scan the QR code on your phone for immediate installation.
2. Alternatively, download **`Mono_Release_v1.0.0.apk`** from Google Drive.
3. Open the downloaded file on your Android device and allow *"Install from Unknown Sources"* if prompted.
4. Launch Mono and start tracking your income and expenses smarter!

---

## 📱 Key Features & Capabilities

### 1. Dual Transaction Engine (Expense & Income)
- **Income Logging**: Dedicated Income entry mode with quick presets for **Salary Credits**, **Performance Bonuses**, **Freelance Invoices**, **Investment Returns**, and **Business Revenue**.
- **Expense Logging**: Quick expense capture with custom number keypad, date selector, category tagger, and note inputs.
- **AI Smart Receipt Scanner**: Instant sample scanning to auto-extract shop name, date, total amount, and category.

### 2. AI Financial Assistant 🤖
- Context-aware financial intelligence connected to actual transaction records.
- Instant conversational answers to:
  - *"Where did my money go this month?"*
  - *"How much can I safely spend today?"*
  - *"How can I save ₹5,000 monthly?"*
  - *"Why are my expenses increasing?"*
- Proactive spending alerts and smart recommendations based on the 50/30/20 rule.

### 3. Fully Dynamic Category Management (CRUD & Soft-Delete)
- **100% Dynamic Database Integration**: Zero hardcoded lists — all categories are fetched in real-time from the backend.
- **Full CRUD Capabilities**: Add, edit, and soft-delete categories on the fly.
- **Soft-Delete Architecture**: Deleted categories and data items are marked as `status = 'inactive'`, safely preserving historical records while excluding them from all active user queries.

### 4. Tailored for the Indian Financial System 🇮🇳
- **Strict Indian Rupee (`₹`) Formatting**: Consistent currency formatting across dashboards, balance cards, transactions, and reports.
- **Financial Year Statement Export**: Export monthly, weekly, and **Indian Financial Year (April 1 – March 31)** statements in formatted **CSV** and **PDF** formats.
- **UPI & Payment Modes**: Built-in support for UPI, Net Banking, and Debit Cards.

### 5. Responsive, Clean UI/UX
- **Left-Aligned Search Bar**: Clean start-aligned search input with instant dynamic category filtering.
- **Zero Ellipsis Overflow**: Optimized responsive layouts that prevent ugly truncation (`...`) across various device sizes.
- **Brand Identity**: Signature teal squircle launcher icon with white `mono` typography and curved header aesthetics.

---

## 🌐 Live Production Deployment

- **Backend Base URL**: [`https://mono-nbt6.onrender.com/api`](https://mono-nbt6.onrender.com/api)
- **React Admin Dashboard**: [`https://mono-nbt6.onrender.com/admin/`](https://mono-nbt6.onrender.com/admin/)
- **Health Check Status**: [`https://mono-nbt6.onrender.com/api/health`](https://mono-nbt6.onrender.com/api/health)
- **Database Engine**: TiDB Cloud Serverless MySQL (Port 4000 over TLS/SSL)

---

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Flutter + BLoC)"]
        UI["UI Screens (Home, Stats, Categories, Profile, Add)"]
        BLOC["State Management (ExpenseBloc, AuthBloc)"]
        DIO["HTTP Client (Dio with JWT Interceptors)"]
        STORAGE["Secure Storage (Tokens & Session)"]
        
        UI --> BLOC
        BLOC --> DIO
        DIO --> STORAGE
    end

    subgraph Backend ["Backend Layer (Node.js + Express)"]
        ROUTER["REST API Routes"]
        AUTH_MW["JWT Authentication Middleware"]
        CONTROLLER["Controllers (Auth, Category, Transaction, AI)"]
        POOL["MySQL2 Connection Pool with TLS/SSL"]
        
        ROUTER --> AUTH_MW
        AUTH_MW --> CONTROLLER
        CONTROLLER --> POOL
    end

    subgraph Cloud ["Database Layer (TiDB Cloud)"]
        DB[("TiDB Cloud Serverless MySQL (mono_db)")]
        POOL -- "SSL Port 4000" --> DB
    end
```

---

## 🗄️ Database Schema & Live Hosting

The application is powered by a high-availability **TiDB Cloud** database (`mono_db`) hosted over secure TLS/SSL:

| Table | Description |
| :--- | :--- |
| `users` | Secure user profiles with `bcrypt` password hashes and JWT authentication. |
| `categories` | Dynamic categories with `name`, `icon`, `color`, `type` (`expense`/`income`/`both`), and soft-delete `status`. |
| `transactions` | Ledger of all `income` and `expense` entries linked to categories and users. |
| `budgets` | Category budget caps with alert thresholds for monthly and weekly periods. |
| `savings_goals` | User target goals with progress tracking and deposit logs. |
| `bills_emi_debts` | Recurring and upcoming bill/EMI tracking with due dates and statuses. |
| `send_again_contacts` | Quick-transfer recipient contacts for repeat payments. |

> The complete DDL and default category seed dump is maintained in [`mono_db.sql`](file:///C:/Users/CORE%20I7/Downloads/mono_db.sql).

---

## 🚀 Getting Started

### Prerequisites
- **Flutter SDK**: `^3.19.0`
- **Node.js**: `v18+` or `v20+`
- **Android Studio / Xcode** for mobile emulation or device debugging

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `backend/.env`:
   ```env
   PORT=3000
   DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=FhCGq9CdLamFc3e.root
   DB_PASSWORD=your_secure_password
   DB_NAME=mono_db
   DB_SSL=true
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   ```
4. Start the server:
   ```bash
   node src/server.js
   ```

### 2. Flutter Mobile Setup
1. From the project root, install packages:
   ```bash
   flutter pub get
   ```
2. Run code analysis and widget tests:
   ```bash
   flutter analyze --fatal-infos lib
   flutter test
   ```
3. Run the application on your connected device or emulator:
   ```bash
   flutter run
   ```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account with hashed password |
| `POST` | `/api/auth/login` | Authenticate credentials and receive JWT bearer token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile data |
| `GET` | `/api/categories` | Retrieve all active user & system categories |
| `POST` | `/api/categories` | Create a custom category (`expense` or `income`) |
| `PUT` | `/api/categories/:id` | Update category details (name, icon, color, type) |
| `DELETE`| `/api/categories/:id` | Soft-delete category (`status = 'inactive'`) |
| `GET` | `/api/transactions/dashboard` | Aggregated balance, income, expenses, and recent records |
| `POST` | `/api/transactions` | Record an income or expense transaction |
| `DELETE`| `/api/transactions/:id` | Soft-delete a transaction |
| `GET` | `/api/transactions/statistics` | Dynamic chart data grouped by Day, Week, Month, or Year |
| `GET` | `/api/transactions/export` | Download CSV statement for Monthly, Weekly, or Financial Year |
| `POST` | `/api/ai/ask` | Query AI Financial Assistant with contextual spending data |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
