# Packages Update Report

## Vulnerable Packages

| Package | Severity | Current | Fixed In | Advisory |
|---------|----------|---------|----------|----------|
| **cloudinary** | **HIGH** | 2.6.0 | >=2.7.0 | [GHSA-g4mf-96x5-5m2c](https://github.com/advisories/GHSA-g4mf-96x5-5m2c) — Arbitrary Argument Injection via parameters including `&` |
| **multer-storage-cloudinary** | **HIGH** | 4.0.0 | via cloudinary fix | Transitive via cloudinary (no standalone fix) |

---

## Safe Updates (patch/minor — no breaking changes)

### Dependencies

| Package | Current | Latest | Update |
|---------|---------|--------|--------|
| axios | ^1.7.9 | 1.18.1 | `npm install axios@^1.18.1` |
| cloudinary | ^2.6.0 | **2.10.0** | `npm install cloudinary@^2.10.0` ← also fixes vulnerability |
| cors | ^2.8.5 | 2.8.6 | `npm install cors@^2.8.6` |
| handlebars | ^4.7.8 | 4.7.9 | `npm install handlebars@^4.7.9` |
| jsonwebtoken | ^9.0.2 | 9.0.3 | `npm install jsonwebtoken@^9.0.3` |
| pdfkit | ^0.16.0 | 0.19.1 | `npm install pdfkit@^0.19.1` |
| ua-parser-js | ^2.0.0 | 2.0.10 | `npm install ua-parser-js@^2.0.10` |

### Dev Dependencies

| Package | Current | Latest | Update |
|---------|---------|--------|--------|
| @types/cookie-parser | ^1.4.8 | 1.4.10 | `npm install --save-dev @types/cookie-parser@^1.4.10` |
| @types/cors | ^2.8.17 | 2.8.19 | `npm install --save-dev @types/cors@^2.8.19` |
| @types/express | ^5.0.0 | 5.0.6 | `npm install --save-dev @types/express@^5.0.6` |
| @types/jsonwebtoken | ^9.0.7 | 9.0.10 | `npm install --save-dev @types/jsonwebtoken@^9.0.10` |
| @types/node | ^22.20.1 | 26.1.1 | `npm install --save-dev @types/node@^26.1.1` |
| @types/pdfkit | ^0.13.8 | 0.17.6 | `npm install --save-dev @types/pdfkit@^0.17.6` |

---

## Breaking Changes (major version — requires code migration)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| dotenv | ^16.4.7 | 17.4.2 | v17 drops `.env.*` file auto-loading |
| express | ^4.21.2 | 5.2.1 | v5 drops `req.params` as array, changes error handling — major migration |
| mongoose | ^8.9.5 | 9.8.0 | v9 drops callbacks, changes aggregate typing |
| multer | ^1.4.5-lts.1 | 2.2.0 | v2 async-only API |
| zod | ^3.24.1 | 4.4.3 | v4 is a complete rewrite |
| @types/bcrypt | ^5.0.2 | 6.0.0 | Syncs with bcrypt v6 types |
| @types/multer | ^1.4.12 | 2.2.0 | Syncs with multer v2 types |
| typescript | ^5.7.2 | 7.0.2 | v7 has breaking type changes |

> All of these are **skip** items for this round — update only if the respective runtime package is also updated.

---

## Remove

| Package | Reason |
|---------|--------|
| `http` (^0.0.1-security) | This is a **malicious empty package**. Remove from `package.json` entirely. `import { Server } from "http"` in `src/server.ts` already uses Node's built-in `http` module — no replacement needed. |

---

## Already Up-to-Date

| Package | Version |
|---------|---------|
| bcrypt | 6.0.0 |
| cookie-parser | 1.4.7 |
| http-status-codes | 2.3.0 |
| nodemailer | 9.0.3 |
| ts-node | 10.9.2 |
| ts-node-dev | 2.0.0 |
