# Google Wallet Digital Pass & Live Sync Studio

A minimal full-stack web application that issues digital passes to Google Wallet and enables **instant live updates** of installed passes on Android devices via the Google Wallet REST API.

---

## 🌟 Key Features

1. **Clean Provider Pattern Architecture**:
   - `WalletProvider` interface completely decouples business logic from Google Wallet.
   - Core application logic (`PassService`) can support future providers (e.g., Apple Wallet) without rewriting any pass management logic.
2. **Google Wallet Pass Generation**:
   - Generates Google Wallet generic pass classes and objects with user name, custom label, dynamic value, and a scannable QR code.
   - Generates RS256 cryptographically signed Google Wallet Save links (`https://pay.google.com/gp/v/save/{jwt}`).
3. **Live Pass Updates (`POST /passes/{id}`)**:
   - Updates pass values on the backend and immediately pushes the update to Google's Wallet API servers via `PATCH /walletobjects/v1/genericObject/{id}`.
   - **The already-installed pass on the Android phone updates live without the user having to remove or re-add it.**
4. **Interactive Studio Web Interface**:
   - Real-time phone pass simulator with animated metric pulse effects.
   - Official "Save to Google Wallet" button and scannable QR code.
   - Remote control panel to trigger `POST /passes/{id}` and test the live update flow.
   - Instant cURL snippet generator for command-line validation.
   - Diagnostic status indicator and Google Wallet Issuer setup modal.

---

## 🏗️ Architecture

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
                      |    PassService    |  <-- Core Domain Logic (Wallet Agnostic)
                      +---------+---------+
                                |
            +-------------------+-------------------+
            |                                       |
            v                                       v
+-----------------------+               +-----------------------+
|  IPassRepository      |               |   IWalletProvider     |
|  (File/Memory Store)  |               +-----------+-----------+
+-----------------------+                           |
                               +--------------------+--------------------+
                               |                                         |
                               v                                         v
                    +----------------------+                  +---------------------+
                    | GoogleWalletProvider |                  | MockWalletProvider  |
                    | (Live Google API &   |                  | (Local Preview Mode)|
                    |  Signed JWT Link)    |                  +---------------------+
                    +----------+-----------+
                               |
                   Google Wallet REST API
                    (GenericClass / Object)
                               |
                               v
               +-------------------------------+
               | Android Google Wallet Device  |
               | (Silent Push Sync & Update)   |
               +-------------------------------+
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Live Mode, or run directly in Demo Mode)
Copy the example environment configuration:
```bash
cp .env.example .env
```

If you don't have Google Cloud credentials yet, the application will automatically launch in **Demo/Mock Mode**, allowing you to preview the UI, test the endpoints, and inspect the cURL commands.

To connect **Live Google Wallet**:
1. Place your Google Cloud Service Account JSON file at `credentials/service-account.json`.
2. Edit `.env` and provide your 19-digit Google Wallet Issuer ID:
   ```env
   GOOGLE_WALLET_ISSUER_ID=3388000000022xxxxxx
   GOOGLE_WALLET_CLASS_ID=digital_balance_pass
   GOOGLE_APPLICATION_CREDENTIALS=credentials/service-account.json
   ```

### 3. Run the Application
```bash
# Development mode with hot-reloading
npm run dev

# Or build & start production server
npm run build
npm start
```

Open your browser at: **`http://localhost:3000`**

---

## 📱 Google Wallet Setup in Test Mode (Step-by-Step)

To test on your real Android phone:

1. **Access Google Pay & Wallet Console**:
   - Go to [Google Pay & Wallet Business Console](https://pay.google.com/business/console).
   - Set up an Issuer Account and note your **19-digit Issuer ID**.
2. **Whitelist Your Android Account (Crucial for Test Mode)**:
   - In the Google Pay & Wallet Console, go to **Google Wallet API > Users > Test Accounts**.
   - Add the Google account email address that is currently signed in on your Android phone.
   - *Note: In test mode, only whitelisted test accounts can save passes.*
3. **Set Up Google Cloud Service Account**:
   - Open [Google Cloud Console](https://console.cloud.google.com).
   - Enable the **Google Wallet API** (`walletobjects.googleapis.com`).
   - Create a Service Account and download its key as a JSON file.
4. **Link Service Account to Google Wallet Console**:
   - In Google Pay & Wallet Console under **Users**, add your service account email (e.g. `your-sa@project.iam.gserviceaccount.com`) as a **Developer** or **Admin**.
5. **Add to Project**:
   - Save the key file to `credentials/service-account.json`.
   - Update `GOOGLE_WALLET_ISSUER_ID` in `.env`.

---

## 🧪 Testing the Live Update Flow

### Flow Example

1. **Create Pass**:
   - Fill out the form in the web UI:
     - Name: `John Doe`
     - Label: `Balance`
     - Number: `40`
   - Click **Create Digital Pass**.
   - Click **Save to Google Wallet** (or scan the QR code on your phone).
   - The pass is added to your Android phone's Google Wallet showing:
     - **John Doe**
     - **Balance: 40**
     - QR code with pass ID.

2. **Trigger Live Update**:
   - In the **Live Wallet Update** panel on the web page (or via terminal), enter `55` and click **Send Live Update (POST /passes/{id})**.
   - Or run via terminal:
     ```bash
     curl -X POST http://localhost:3000/passes/<YOUR_PASS_ID> \
       -H "Content-Type: application/json" \
       -d '{"value": 55}'
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "message": "Pass pass_... updated successfully. Live push sent to Google Wallet.",
       "pass": {
         "id": "pass_...",
         "name": "John Doe",
         "label": "Balance",
         "value": 55,
         "updatedAt": "2026-10-16T10:15:00.000Z"
       }
     }
     ```
   - Look at your Android phone: Google Wallet receives the push notification and updates the pass value to **`Balance: 55`** without needing to remove or re-add the pass!

---

## 🔌 Adding Future Wallet Providers

To add a new provider (e.g., Apple Wallet):

1. Implement `IWalletProvider` from `src/providers/wallet-provider.interface.ts`:
   ```typescript
   export class AppleWalletProvider implements IWalletProvider {
     readonly providerName = 'apple_wallet';
     readonly isMock = false;

     async createPass(payload: CreateWalletPassPayload): Promise<WalletPassResult> {
       // Generate .pkpass package signed with Apple WWDR certificate
     }

     async updatePass(payload: UpdateWalletPassPayload): Promise<void> {
       // Send Apple Push Notification (APNs) to registered devices
     }
   }
   ```
2. Register the new provider in `src/providers/wallet-provider.factory.ts`.
3. The core application logic (`PassService`) remains completely untouched!
