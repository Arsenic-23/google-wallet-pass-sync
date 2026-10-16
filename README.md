# Google Wallet Pass Sync

A full-stack application that issues digital passes to Google Wallet and updates them live on Android devices via the Google Wallet REST API.

---

## Features

1. **Provider Pattern Architecture**:
   - `WalletProvider` interface decouples domain logic from Google Wallet.
   - Core application logic (`PassService`) can support additional providers (such as Apple Wallet) without changes to pass management.
2. **Google Wallet Pass Generation**:
   - Generates Google Wallet generic pass classes and objects with holder name, custom field label, value, and scannable QR code.
   - Generates RS256 signed Google Wallet Save links (`https://pay.google.com/gp/v/save/{jwt}`).
3. **Live Pass Updates (`POST /passes/{id}`)**:
   - Updates pass values and pushes changes directly to Google Wallet API via `PATCH /walletobjects/v1/genericObject/{id}`.
   - Passes saved to Android devices update live without requiring re-saving.
4. **Web Interface**:
   - Live pass preview card with metric animation.
   - Google Wallet save button and QR code.
   - Control panel to trigger `POST /passes/{id}` and test updates.
   - cURL snippet generator for API testing.

---

## Architecture

```
                      +-------------------+
                      |   Client Web UI   |
                      +---------+---------+
                                |
                    REST API (HTTP / JSON)
                                |
                                v
                      +-------------------+
                      |  PassController   |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |    PassService    |  <-- Core Domain Logic
                      +---------+---------+
                                |
            +-------------------+-------------------+
            |                                       |
            v                                       v
+-----------------------+               +-----------------------+
|  IPassRepository      |               |   IWalletProvider     |
|  (File Store)         |               +-----------+-----------+
+-----------------------+                           |
                               +--------------------+--------------------+
                               |                                         |
                               v                                         v
                    +----------------------+                  +---------------------+
                    | GoogleWalletProvider |                  | MockWalletProvider  |
                    | (Live Google API)    |                  | (Local Preview Mode)|
                    +----------+-----------+                  +---------------------+
                               |
                    Google Wallet REST API
                    (GenericClass / Object)
                               |
                               v
                +-------------------------------+
                | Android Google Wallet Device  |
                | (Push Sync & Update)          |
                +-------------------------------+
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

If Google Cloud credentials are not configured, the app starts in mock mode for local testing.

To connect live Google Wallet:
1. Place your Google Cloud Service Account JSON file at `credentials/service-account.json`.
2. Set your 19-digit Google Wallet Issuer ID in `.env`:
   ```env
   GOOGLE_WALLET_ISSUER_ID=3388000000022xxxxxx
   GOOGLE_WALLET_CLASS_ID=digital_balance_pass
   GOOGLE_APPLICATION_CREDENTIALS=credentials/service-account.json
   ```

### 3. Run the Application
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm start
```

Open `http://localhost:3001` in your browser.

---

## Google Wallet Setup (Test Mode)

To test on an Android phone:

1. **Google Pay & Wallet Console**:
   - Open [Google Pay & Wallet Business Console](https://pay.google.com/business/console).
   - Locate your 19-digit Issuer ID.
2. **Whitelist Test Account**:
   - In Google Pay & Wallet Console, navigate to **Google Wallet API > Users > Test Accounts**.
   - Add the Google account email address active on the test Android device.
3. **Google Cloud Service Account**:
   - In Google Cloud Console, enable the **Google Wallet API** (`walletobjects.googleapis.com`).
   - Create a Service Account and download its key JSON.
4. **Grant Access**:
   - Under **Users** in Google Pay & Wallet Console, add the Service Account email as **Developer** or **Admin**.
5. **Project Credentials**:
   - Save the key file to `credentials/service-account.json`.
   - Update `GOOGLE_WALLET_ISSUER_ID` in `.env`.

---

## API Usage

### Create Pass
`POST /passes`

Request:
```json
{
  "name": "Alex Morgan",
  "label": "Balance",
  "value": 40
}
```

Response:
```json
{
  "success": true,
  "message": "Pass created successfully",
  "pass": {
    "id": "7K9P-4X2B",
    "name": "Alex Morgan",
    "label": "Balance",
    "value": 40,
    "saveUrl": "https://pay.google.com/gp/v/save/...",
    "qrCodeDataUrl": "data:image/png;base64,...",
    "walletProvider": "google_wallet",
    "providerPassId": "3388000000023206263.7K9P-4X2B",
    "createdAt": "2026-10-16T10:15:00.000Z",
    "updatedAt": "2026-10-16T10:15:00.000Z"
  }
}
```

### Update Pass Live
`POST /passes/:id` (also supports `PATCH` and `PUT`)

Request:
```bash
curl -X POST http://localhost:3001/passes/7K9P-4X2B \
  -H "Content-Type: application/json" \
  -d '{"value": 55}'
```

Response:
```json
{
  "success": true,
  "message": "Pass 7K9P-4X2B updated successfully",
  "pass": {
    "id": "7K9P-4X2B",
    "name": "Alex Morgan",
    "label": "Balance",
    "value": 55,
    "updatedAt": "2026-10-16T10:20:00.000Z"
  }
}
```

The saved pass in Google Wallet on Android updates automatically.
