# Session Summary — aeromart-ecommerce-server

> Snapshot for initializing a new chat session with full context.

## Project
Express + TypeScript + Mongoose (MongoDB) eCommerce backend. All routes under `/api/v1`, server on `localhost:5000` (CORS allows `localhost:3000`).

## Folder Structure
```
src/
├── app.ts                    # Express app, /api/v1 prefix, seedAdmin() commented out
├── server.ts
├── app/
│   ├── routes/index.ts       # Registers all 11 module routes
│   ├── builder/              # QueryBuilder (search/filter/sort/pagination)
│   ├── config/               # incl. multer.config (multerUpload)
│   ├── db/                   # DB connection
│   ├── errors/               # AppError, globalErrorHandler, notFound
│   ├── interface/            # IImageFile etc.
│   ├── middleware/           # auth, validateRequest, clientInfoParser, bodyParser (parseBody)
│   ├── utils/                # catchAsync, sendResponse
│   └── modules/              # auth, user, product, order, meta, brand, category, coupon, review, payment, settings
└── docs/
    ├── cmdc-agents/          # untracked (new)
    ├── deprecated/           # untracked (new)
    └── project-tracking/     # untracked (new) — progress.md, works.md, summary-cmdc-chat.md, backend-usage-guide.md
```

## File Naming Convention
`<module>.<layer>.ts` per module folder:
- `user.routes.ts`, `user.controller.ts`, `user.service.ts`, `user.model.ts`, `user.interface.ts`, `user.validation.ts`, `user.constant.ts`, `user.readme.md`

## Code Writing Style
- **Indentation:** 4 spaces, **quotes:** double, trailing commas
- **Exports:** named exports aggregated at file bottom, PascalCase: `export const UserRoutes = router;`, `export const UserController = { ... }`
- **Patterns:** `catchAsync(async (req, res) => {...})` + `sendResponse(res, { statusCode: StatusCodes.OK, success, message, data })`
- **Validation:** zod schemas with `body` wrapper, applied via `validateRequest`
- **Auth:** `auth(UserRole.ADMIN, UserRole.CUSTOMER)` middleware; roles: `admin`, `manager`, `customer`
- **Uploads:** `multerUpload.single('logo')` / `.array('images', 10)` + `parseBody` before validation
- **Soft deletes:** `isActive: false` or `isDeleted: true`; models exclude deleted by default
- **API response envelope:** `{ success, message, data, meta? }` (meta for paginated lists)

## What Has Been Completed
- **11 modules, 49 routes fully documented** in `src/docs/project-tracking/progress.md` — module by module: route table (method/path/auth/description) + request/response inside code cells
- Route counts: User 5, Auth 6, Product 5, Order 4, Meta 1, Brand 4, Category 4, Coupon 5, Review 3, Payment 7, Settings 5
- Payment system: Stripe (intl), SSLCommerz (Bangladesh), bKash (Bangladesh)

## What's Next
1. **User is running QA on the backend** against progress.md
2. After QA → fix issues found → finalize
3. **Later work (verification phase):**
   - Settings module: keep generic version OR split into specific ones (theme, hero section, home page section, navbar, footer)
   - Ensure important edge cases pass on every module route
   - Ensure code quality: readable, manageable, reusable

## Flags / Notes (important)
- **Payment readme mismatch:** `payment.readme.md` says `/stripe/validate`, but actual code has `/stripe/success` + `/stripe/cancel` (both `router.all`, no auth). Readme needs updating.
- **bKash validate requires auth** in code; Stripe/SSLCommerz callbacks are public — verify intent during QA.
- **Settings module has no readme** — may need `settings.readme.md` for parity.
- **Git status dirty:** deleted `src/docs/{cloudinary.md, packages-update.md, v7-backend-usage-guide.md, v7.md, v8.md}`; untracked `src/docs/{cmdc-agents/, deprecated/, project-tracking/}` — all uncommitted.
- Recent commits: `c311fdf` (Settings module), `6baa919` (Brand/Category/Review/Order/Payment/Meta/Coupon modules + payments), `6401d53` (package fixes, Cloudinary/Multer).
- Registration auto-logs-in (customer only); refresh token in httpOnly cookie; OTP flow via signed JWT (5-min expiry).
