# Google Wallet Pass Sync

A full-stack application that creates digital passes for Google Wallet and pushes live real-time updates to saved passes on Android devices via the Google Wallet REST API.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: HTML5, CSS3, JavaScript
- **Integration**: Google Wallet REST API (`googleapis`), `jsonwebtoken`, `qrcode`
- **Deployment**: Docker, Docker Compose

## Environment Variables

Copy the example configuration:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3001`) |
| `APP_BASE_URL` | Base URL of the app (default: `http://localhost:3001`) |
| `GOOGLE_WALLET_ISSUER_ID` | 19-digit Google Wallet Issuer ID |
| `GOOGLE_WALLET_CLASS_ID` | Pass Class identifier (e.g. `digital_balance_pass`) |
| `GOOGLE_WALLET_ISSUER_NAME` | Issuer display name shown on passes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud Service Account key JSON file |

*If Google credentials are not set, the app starts in mock mode for local testing.*

## Running the Application

### Local Setup

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or build and start production server
npm run build
npm start
```

Access the interface at `http://localhost:3001`.

### Docker

```bash
docker-compose up -d --build
```

## Testing

### Automated Tests

```bash
npm test
```

### Live Update API Testing

1. Open `http://localhost:3001` in your browser.
2. Fill in the fields and click **Create Digital Pass**.
3. Add the pass to an Android phone using **Save to Google Wallet** or by scanning the QR code.
4. Send an update using the web UI, or run:

```bash
curl -X POST http://localhost:3001/passes/<PASS_ID> \
  -H "Content-Type: application/json" \
  -d '{"value": 55}'
```

The pass on the Android phone will update live without requiring re-saving.
