# Yakuza Referrer

A URL referral and redirection service with AES-256-GCM encrypted links and automatic expiration.

## Features

- AES-256-GCM encrypted URLs with configurable expiration
- Tamper-proof authentication tags
- Base64URL-safe encoded hashes
- Referrer page with auto-redirect before destination
- In-memory operation, no database, no cookies, no logging

## Prerequisites

- Node.js 18+
- npm

## Quick Start

```bash
git clone https://github.com/yourusername/yakuza-referrer.git
cd yakuza-referrer
npm install
cp .env.example .env
```

### Configuration

```env
SECRET_REFERRER=your-super-secret-key-here-change-this
PORT=3000
```

`SECRET_REFERRER` must be set before the app starts. It is read once at module load.

### Running

```bash
npm run dev    # development
npm start      # production
npm test       # run tests
```

## Usage

### Encrypting URLs

```javascript
import crypto from "crypto";

function encryptUrl(url, expiresAt) {
  const SECRET = process.env.SECRET_REFERRER;
  const key = crypto.createHash("sha256").update(SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload = `${url}|${expiresAt}`;
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Create URL that expires in 24 hours
const expiresAt = Math.floor(Date.now() / 1000) + 86400;
const hash = encryptUrl("https://example.com/product?ref=xyz", expiresAt);

console.log(`https://yourdomain.com/url/${hash}`);
```

### Endpoints

| Route | Description |
|-------|-------------|
| `GET /` | Landing page |
| `GET /url/:encryptedHash` | Referrer page with redirect to destination |
| `GET /privacy` | Privacy policy |
| `GET /tos` | Terms of service |

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Referrer page rendered with auto-redirect |
| 400 | Invalid link (bad payload or tampered hash) |
| 410 | Link expired |
| 404 | Page not found |
| 500 | Internal error |

## Encryption

### Format

```
[IV 12B][Ciphertext][Auth Tag 16B]
```

Base64URL-encoded. Plaintext payload:

```
url|unixTimestamp
```

### Details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key derivation | SHA-256 of `SECRET_REFERRER` |
| IV length | 12 bytes |
| Auth tag | 16 bytes |
| Encoding | Base64URL |

## Error Handling

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `BadPayload` | 400 | Malformed or corrupted encrypted data |
| `InvalidHash` | 400 | Authentication tag verification failed |
| `ExpiredUrl` | 410 | URL has passed its expiration time |

Error details are never exposed to clients.

## Testing

```bash
npm test
```

Uses Node.js built-in test runner (`node:test` + `node:assert`).
Tests run with `--env-file=.env.test` to set `SECRET_REFERRER` for the test environment.

## Project Structure

```
server.js              # Entrypoint, loads dotenv, starts server
src/
  app.js               # Express app, routes, error handling
  helpers/
    Decryptor.js       # AES-256-GCM decryption + expiry check
  errors/
    CryptoErrors.js    # BadPayload, ExpiredUrl, InvalidHash
  views/
    *.handlebars       # Handlebars templates
public/
  css/                 # Stylesheets
  images/              # Static images
  js/                  # Client-side scripts
test/
  hash.test.js         # Unit and route tests
```

## License

MIT

## Support

- [GitHub Issues](https://github.com/yourusername/yakuza-referrer/issues)
- Telegram: @s3xyp0w3r
