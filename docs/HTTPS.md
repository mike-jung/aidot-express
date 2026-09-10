# HTTPS and certificates

HTTPS is available in both Public and Full editions, including Electron installations.
The main application and Control server use the same TLS settings on their configured ports.
TLS 1.2 is the minimum. Authentication cookies are automatically marked Secure when direct HTTPS is enabled.

## Quick start

After installing the release dependencies with `npm ci`, run this from the project directory:

```powershell
npm run https:cert -- --hosts localhost,127.0.0.1,::1 --apply
npm run https:check
```

For other computers to connect, include the real DNS name and/or LAN IP in `--hosts`, for example:

```powershell
npm run https:cert -- --hosts localhost,127.0.0.1,::1,app.example.com,192.168.10.20 --days 90 --apply
```

Use the actual deployment names, not the example addresses above. A bind address such as `0.0.0.0` is not a client address and is rejected.
Restart the **complete application/service**, then open `https://localhost:7901` (or your configured port and hostname).
The Dashboard worker restart does not apply TLS configuration changes.

`--apply` validates and updates only HTTPS keys in the selected `.env`; it preserves other settings and creates a protected backup.
Without `--apply`, the command generates certificates and prints their paths for review.
`--env <file>` selects another configuration file. `--output <directory>` selects a certificate parent directory; each generation still creates a unique child directory.
`https:check` validates configuration, PEM files, key matching, certificate validity and SAN identity; it does not prove that a remote service is reachable.

No OpenSSL installation is required. Node WebCrypto and `@peculiar/x509` generate a 3072-bit RSA private CA and a separate serverAuth certificate with DNS/IP SANs.
The CA signing key is non-exportable and is never saved. A generation is intended for initial/private setup: generating again creates a new CA and requires trusting that new CA on clients.
The default leaf lifetime is 90 days (allowed range: 1–365 days). Set a renewal reminder before expiry.

## Settings screen

Sign in as a console administrator, open **Settings > HTTPS / Certificates**, and:

1. Expand **Generate a private certificate**, enter the connection names/IPs and generate.
2. Review the generated key/certificate/CA paths; select **Validate and save**.
3. Download the CA certificate for browser clients and register trust as described below.
4. Restart the entire app or service. Electron provides **Restart application** for its embedded server.
5. Open the HTTPS address. API test and scenario requests follow the console origin; the Dashboard uses the configured Control port and protocol.

To use an existing certificate, enter the PEM private key, leaf/full-chain file and optional CA file directly.
A key passphrase is optional and is never returned by the settings API. Select its replacement checkbox to change it; an empty replacement clears it.
Settings are admin-only. Certificate generation does not overwrite active certificate files or automatically change the running listener.

## Environment settings

| Variable | Meaning |
| --- | --- |
| `HTTPS_ENABLED` | `true` enables direct HTTPS on both listeners; `false` keeps local development/setup HTTP. |
| `HTTPS_KEY_FILE` | PEM private key file. Required when enabled. |
| `HTTPS_CERT_FILE` | PEM server certificate, followed by intermediate certificates when applicable. Required when enabled. |
| `HTTPS_CA_FILE` | Optional PEM CA bundle trusted by internal health checks. Set this for a private CA. |
| `HTTPS_KEY_PASSPHRASE` | Optional passphrase for an encrypted PEM key. |
| `HTTPS_SERVER_NAME` | SAN hostname/IP used for verified internal loopback checks. Automatically selected when empty. |

Relative paths resolve from the directory containing the active `.env`. Quote Windows paths with single quotes, or use forward slashes:

```dotenv
HTTPS_ENABLED=true
HTTPS_KEY_FILE='certs/https-.../server.key'
HTTPS_CERT_FILE='certs/https-.../server.crt'
HTTPS_CA_FILE='certs/https-.../ca.crt'
HTTPS_KEY_PASSPHRASE=
HTTPS_SERVER_NAME=localhost
```

The settings screen shows the active `.env` path. Electron normally uses `%APPDATA%\Aidot Express\.env`; the screen also works in packaged installations without a separate Node/OpenSSL installation.
For an embedded Electron server, include `localhost` or `127.0.0.1` in the certificate SAN. An external service attachment can use `AIDOT_SERVER_URL` and `AIDOT_SERVER_CA_FILE`, with no server private key. The legacy local `AIDOT_SERVER_PORT` path remains available.

## Trust a private CA

Encryption and browser trust are separate. Browsers need to trust the issuing CA and the URL hostname must appear in the certificate SAN.
Distribute **only `ca.crt`**, after checking that it came from the intended administrator. Never distribute `server.key` or commit certificate directories.
Do not disable certificate verification to make tests pass.

On Windows, a user can import the CA into their own trusted root store:

```powershell
certutil -user -addstore Root "C:\path\to\ca.crt"
```

This explicitly trusts that CA for the Windows user. Review the issuer/fingerprint first; restart the browser afterwards.
Other client operating systems/browsers have their own certificate import procedures. For clients that maintain an independent certificate store, import the same CA there.
For command-line checks, trust the specific CA per request:

```powershell
curl.exe --cacert "C:\path\to\ca.crt" https://localhost:7901/health/live
```

Electron grants a private-certificate exception only when the leaf fingerprint, expected hostname and validity period match the configured certificate.
Other certificates use Chromium's normal verification. This exception does not install a global root or change external browsers.

## Production, services and renewal

Remote requests in `NODE_ENV=production` require HTTPS. Local loopback setup remains available.
An explicitly trusted TLS-terminating reverse proxy can provide HTTPS instead; configure exact `TRUST_PROXY` sources and `AUTH_COOKIE_SECURE=true` for that arrangement.
Avoid a broad trust-proxy setting that lets arbitrary clients claim an HTTPS connection.

For public Internet deployment, obtain a publicly trusted certificate (for example through your existing ACME certificate manager) and supply its full chain and key.
The built-in generator does not obtain or renew public certificates. Replace certificates using new file paths and restart the complete app/service.
A worker restart retains the supervisor's original TLS configuration; changing active certificate bytes in place is rejected until the whole supervisor restarts.

For the supplied Windows service, an administrator can apply saved changes with:

```powershell
Restart-Service aidot-express
```

Generate certificates under the account that runs the server, or deliberately grant that service account read access.
Generated directories are owner-only on POSIX and grant access only to the current account and LocalSystem on Windows before key bytes are written.
Keep CA/key files outside shared upload or web-served directories. Certificate paths and private files are excluded from Public exports and Electron build inputs.

Control access also depends on `CONTROL_HOST`, firewall rules and routing. Remote consoles need a reachable, secured Control endpoint; enabling TLS alone does not configure firewall rules.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Browser reports an unknown issuer | Import the intended CA on that client, or configure a publicly trusted full chain. |
| Hostname mismatch | Add the exact connection hostname/IP when generating, or use a matching URL. |
| Server refuses to start | Run `npm run https:check`; check paths, passphrase, expiry and matching key/certificate. No HTTP fallback is used. |
| Dashboard cannot reach Control | Confirm its HTTPS URL, configured Control port, bind address and firewall. An old same-host HTTP override follows a confirmed HTTPS listener; other mixed-content overrides are rejected. |
| API test attempts an old HTTP URL | Use a relative `/api/...` path. The test console intentionally rejects downgrade and cross-origin credential forwarding. |
| Saved HTTPS settings appear pending | Restart the whole app/service, not only the worker. |
| Vite login fails with Secure cookies | Start Vite with the same active `.env`. It serves HTTPS and verifies the backend through the configured CA. |
| Certificate regenerated | Trust the newly generated CA and restart the complete service. Existing files are preserved for rollback. |

## Implementation references

- [Node HTTPS API](https://nodejs.org/api/https.html): HTTPS servers and client request options.
- [Node TLS API](https://nodejs.org/api/tls.html): CA trust and hostname verification.
- [Node 22 X509Certificate API](https://nodejs.org/docs/latest-v22.x/api/crypto.html#class-x509certificate): SAN, private-key matching, fingerprints and validity.
- [Electron certificate verification API](https://www.electronjs.org/docs/latest/api/session#sessetcertificateverifyprocproc): scoped certificate verification with normal Chromium handling for other certificates.
- [Peculiar X509 library](https://github.com/PeculiarVentures/x509): certificate generation with WebCrypto; version 2.1.0 is pinned in this release.

## 기존 CORS 설정으로 시작이 중단될 때

1.44.0에서 `CORS_ORIGIN requires exact origins`가 표시되면 `.env`를 `CORS_ORIGIN=`으로 변경하거나 1.44.1로 업데이트하세요.
빈 값은 같은 HTTPS 주소에서 사용하는 콘솔과 API test를 허용합니다. 별도 프런트엔드는 정확한 HTTP(S) origin을 명시해야 합니다.
1.44.1은 기존 `*`를 경고와 함께 무시하며 임의 사이트에 대한 허용으로 해석하지 않습니다. 인증서 검사가 성공했다면 인증서를 다시 생성할 필요가 없습니다.

## Optional Electron client for an independent service

The server can run entirely without Electron; its HTTPS web console works in a browser. If you retain an Electron management client, version 1.44.1 separates client trust from server key material:

```powershell
$env:AIDOT_SERVER_URL = 'https://localhost:7901'
$env:AIDOT_SERVER_CA_FILE = 'C:/AidotClient/ca.crt'
& 'C:/path/Aidot Express.exe'
```

Copy only the public `ca.crt` into the client's readable directory after verifying its issuer/fingerprint. Do not grant the client access to the service's private certificate directory, `server.key`, database password or authentication secret. Use an absolute CA path for shell variables.

Alternatively, create a client-only dotenv file containing `AIDOT_SERVER_URL` and `AIDOT_SERVER_CA_FILE`, and launch with `AIDOT_CLIENT_ENV_FILE` pointing to it. CA paths in this file are relative to the file's directory. A specified but missing or invalid client configuration fails instead of starting a local server. Direct URL configuration does not read the server/profile dotenv file. Client mode skips server data migration, initial DB setup and server secret generation.

The URL must be an exact HTTPS origin without credentials or a path. The client verifies the CA chain, validity and hostname before opening the console. Only the leaf certificate obtained from that verified connection can receive the existing hostname-scoped Chromium trust exception. Other certificates retain normal browser verification; failures do not downgrade to HTTP or trust a certificate obtained from an unverified connection. Redirecting health endpoints are rejected.

For a publicly trusted certificate, omit the custom CA file and use the client's normal Node trust store. A private CA must be supplied explicitly or already available to that trust configuration. Reopen the client after a service certificate renewal to revalidate its certificate; a changed private CA requires distributing the new public CA. Electron does not stop or restart an externally owned service.

Legacy `AIDOT_SERVER_PORT` remains a local service connection. With `HTTPS_ENABLED=true`, it uses only `HTTPS_SERVER_NAME` and `HTTPS_CA_FILE` (or `AIDOT_SERVER_CA_FILE`) for verification; `HTTPS_KEY_FILE` and `HTTPS_CERT_FILE` are not opened. Without HTTPS enabled, the legacy port-only mode remains local HTTP for compatibility. Prefer the explicit HTTPS URL for service deployment.

A remote URL also requires the configured DNS/IP SAN, network access, authentication and an appropriate Control API routing policy. Changing the client URL does not expose the service's loopback Control listener automatically.
