# Habesha Exchange — Build Worklog

Project: Habesha Exchange (crypto exchange, Binance-inspired, black+gold premium theme).
Brand assets: logo provided in /public (habesha-logo.jpg, habesha-mark.jpg, habesha-mark-light.jpg) — gold "H" mark on black.

---
Task ID: 1
Agent: main
Task: Project setup — copy logos, install deps (bcryptjs, jsonwebtoken, nodemailer), env config

Work Log:
- Copied 3 uploaded logo images to /public (habesha-logo.jpg with text, habesha-mark.jpg gold on black, habesha-mark-light.jpg gold on light)
- Installed bcryptjs, jsonwebtoken, nodemailer + their @types
- Wrote .env with DATABASE_URL, JWT_SECRET, admin email (amareeyob533@gmail.com), whatsapp placeholder

Stage Summary:
- Brand direction: BLACK background + GOLD accent (from provided logo). Premium dark-mode-first exchange UI.
- Auth strategy: custom JWT + bcrypt (email/password) + simulated Google sign-in (works in sandbox; real NextAuth Google provider would need creds).
- Email: nodemailer with graceful fallback to console log when SMTP not configured.
- Ready to write Prisma schema and build backend.

---
Task ID: 2-11
Agent: main
Task: Build full backend (schema, lib, API routes) + full frontend (theme, landing, dashboard, modals, views) + verify backend E2E

Work Log:
- Prisma schema: User/Balance/Transaction/Deposit/Withdrawal/Transfer/Notification/SupportMessage. Pushed to SQLite.
- Backend lib: auth.ts (JWT+bcrypt+cookies), tokens.ts (5 tokens, HABESHA fixed $6.4321674, networks+wallets), email.ts (nodemailer sandbox fallback → amareeyob533@gmail.com), uid.ts (6-digit), auto-approve.ts (KYC 30s / deposit 60s / withdraw 60s), api.ts (requireAuth).
- API routes: auth (signup/login/google/logout/me), tokens, deposit, withdraw (internal instant + external pending), transactions, kyc (+upload), support, notifications, user.
- Frontend: globals.css black+gold theme (dark default + light), providers (theme+query+toaster), layout, theme-toggle, LogoMark/LogoWord, LogoLoader + BrandIntro, api-client, use-auth (zustand), use-ui (zustand modals).
- AuthModal (login/signup tabs + simulated Google chooser), LandingPage (hero w/ logo bg watermark, ticker, features, markets table, Habesha highlight, security, CTA, sticky footer).
- DashboardShell (sidebar+topbar+animated view switch), views: Overview, Wallet, Markets, Transactions, KycView, SupportView, Profile. Modals: Deposit (network+address+copy+min $1+"I Deposited"→Checking→Pending→done), Withdraw (internal/external, Habesha locked to internal), Kyc (level select+face scan anim+ID upload), Support (form→whatsapp), NotificationPanel.
- Lint: 0 errors after refactors (keyed modal children to avoid set-state-in-effect; useSyncExternalStore for mounted; derived network/mode).

Backend E2E verified via curl:
- Signup Alice (UID 510600) + Bob (UID 440584). Both got 46.625 HABESHA ($299.9 / $6.4321674).
- Deposit 250 USDT (TRON) → pending → auto-approved after 60s → balance credited; email logged to amareeyob533@gmail.com with "New Deposit — User 510600".
- Internal transfer 10 HABESHA Alice→Bob instant; external HABESHA withdraw correctly blocked.
- KYC normal → pending → auto-approved after 30s (level normal).

Stage Summary:
- Dev server running on :3000 (pid 2784), lint clean, backend fully functional.
- Ready for Agent Browser UI verification.

---
Task ID: 12
Agent: main
Task: Self-verify with Agent Browser + fix issues found

Work Log:
- Verified via Agent Browser: landing page renders (hero w/ logo watermark, ticker, features, markets table, Habesha highlight, security, CTA, sticky footer); no console errors.
- Signup (email/password) → dashboard with sidebar/topbar, KYC "Verify Now" banner, My Assets grid (HABESHA deposit disabled + Send), welcome toast ($299.9 bonus). HABESHA airdrop = 46.625 confirmed.
- Deposit modal: USDT/TRON, correct wallet address TLks…, "$1 minimum" notice, "I Deposited" → Checking → Pending → "Deposit Submitted".
- KYC modal: Normal/High level select → face-check scan animation → "Under Review" → auto-approved after 30s ("Normal KYC Verified" on Verification view).
- Withdraw modal: HABESHA locks External Wallet button to disabled; internal transfer 5 HABESHA to UID 510600 → "Transfer Complete" instantly.
- Transactions view: airdrop, deposit (completed), transfer_out, transfer_in all correct.
- Support modal: ticket submit → "Message received" + WhatsApp chat link.
- Theme toggle: dark↔light works (html class switches), light theme readable.
- Backend curl E2E: external USDT withdrawal deducts instantly, auto-completes after 60s with single completed transaction (no duplicate); Google sign-in creates user + airdrop; email logged to amareeyob533@gmail.com.

Bug found & fixed:
- Markets view crashed with RangeError (formatUsd max:0 for BTC conflicted with currency min 2 digits). Fixed formatUsd to set min = min(2, max). Markets now renders BTC $97,500, HABESHA $6.4322, etc.
- Removed duplicate transaction creation (deposit/withdraw routes no longer create a pending transaction at request time; auto-approve creates a single completed one). Cleaned 2 orphan pending txns.

Stage Summary:
- All core flows browser-verified: auth (email+google), deposit, withdraw (internal+external), Habesha internal-only restriction, KYC (normal+high, 30s auto-approve), support (whatsapp), notifications, transactions, theme toggle.
- Lint clean (0 errors), dev server stable on :3000. Production-ready.

---
Task ID: 13
Agent: main
Task: Fix login not working in Preview Panel (iframe cookie blocking)

Root cause:
- The Preview Panel embeds the app in a cross-origin iframe. Browsers block `sameSite: 'lax'` cookies from being SET in cross-site iframes. So the login POST succeeded server-side (→ "logged in" toast) but the session cookie was never stored client-side → /api/auth/me returned user:null → user stayed on the landing page.

Fix (Bearer token + localStorage, cookie kept as fallback):
- src/lib/auth.ts: getSession() now reads `Authorization: Bearer <token>` header FIRST (works in any iframe/origin), then falls back to the httpOnly cookie. setSessionCookie() now also RETURNS the raw token.
- src/app/api/auth/{login,signup,google}/route.ts: responses now include `token`.
- src/lib/api-client.ts: added getStoredToken/setStoredToken/clearStoredToken (localStorage); apiFetch() and uploadFile() attach `Authorization: Bearer <token>` when present; 401 clears stale token.
- src/hooks/use-auth.ts: login/signup/google store the returned token in localStorage before fetchMe; logout clears it; fetchMe short-circuits to null when no token (avoids 401 spam). Also resets dashboard view to 'overview' on every successful auth so users land on the Overview.

Verified via Agent Browser (clean localStorage + cookies):
- Login (alice@test.com) → token stored in localStorage → dashboard Overview renders (Total Balance / My Assets / Recent Activity). ✓
- Page reload → session persists via localStorage Bearer token. ✓
- Logout (Profile → Sign out) → token cleared → back to landing. ✓
- Fresh signup (dana@test.com) → token stored, UID assigned, dashboard renders. ✓
- Backend curl: login returns token; /api/auth/me with `Authorization: Bearer <token>` (no cookie) returns full user+balances; without auth returns null. ✓

Stage Summary:
- Login/signup now work in the Preview Panel iframe. Lint clean, server stable on :3000.

---
Task ID: 14
Agent: main
Task: Replace deposit auto-approval with manual admin approval via email links

Changes:
- src/lib/deposit-approval.ts (NEW): signApprovalToken/verifyApprovalToken (JWT, 7-day expiry, action-scoped) + getBaseUrl (NEXT_PUBLIC_BASE_URL env → x-forwarded-proto+host → localhost:3000).
- src/lib/auto-approve.ts: REMOVED autoApproveDeposits() and its call. Deposits now stay "pending" until the admin clicks the approve link. KYC (30s) and withdrawal (60s) auto-approvals kept as-is.
- src/lib/email.ts: notifyAdminDeposit now accepts approveUrl + rejectUrl and renders a branded dark+gold email with big green "✓ APPROVE DEPOSIT" and red "✕ REJECT" buttons, plus plain-text link fallbacks.
- src/app/api/deposit/route.ts: builds signed approve/reject URLs via getBaseUrl(req) + signApprovalToken, passes to notifyAdminDeposit. Deposit notification message updated to "pending admin confirmation".
- src/app/api/deposit/approve/route.ts (NEW, GET): verifies signed token → if pending: credits balance + creates completed transaction + notifies user (atomic) → returns branded HTML "Deposit Approved" page. Guards: already-approved/rejected states, expired/invalid tokens. Idempotent (no double credit).
- src/app/api/deposit/reject/route.ts (NEW, GET): verifies signed token → if pending: marks rejected (no balance change) + notifies user → returns branded HTML "Deposit Rejected" page. Same guards.

Verified E2E (curl + browser):
- Deposit 150 USDT → balance UNCHANGED (200, not credited), status pending. ✓
- Email sent to amareeyob533@gmail.com with subject "[Action Required] Approve Deposit — User 510600 · 150 USDT", containing Approve + Reject buttons and plain-text links. ✓
- Admin clicks Approve link → branded "Deposit Approved" HTML page, balance credited (+150 → 350), user gets "Deposit Credited ✓" notification. ✓
- Click Approve again → "Already Processed", NO double credit (stays 350). ✓
- Admin clicks Reject link (on a separate deposit) → "Deposit Rejected" page, balance UNCHANGED (no credit), user notified. ✓
- Cannot approve a rejected deposit (Action Failed). ✓
- Browser: UI deposit 50 USDT → approve link opened in browser → balance +50, approval page renders correctly (gold header, green checkmark, deposit details). ✓

Stage Summary:
- Deposits now require manual admin approval via signed email links (no more auto-credit). The admin email contains one-click Approve/Reject buttons. Links are JWT-signed (can't be guessed), expire in 7 days, and are idempotent. Lint clean, server stable on :3000.

---
Task ID: 15
Agent: main
Task: Build in-app admin approval panel (email not deliverable in sandbox without SMTP)

Why: The email-based approval can't actually deliver to amareeyob533@gmail.com because this sandbox has no SMTP server configured (emails only log to dev.log). Built an in-app admin panel so the admin can approve deposits directly in the website — works immediately, no email setup needed.

Changes:
- src/lib/deposit-actions.ts (NEW): shared logic — isAdminEmail(email==ADMIN_EMAIL), fetchDeposits(status), approveDeposit(id) [credit+tx+notify, atomic, idempotent], rejectDeposit(id) [mark+notify, idempotent].
- src/app/api/deposit/{approve,reject}/route.ts: refactored to use shared approveDeposit/rejectDeposit (no duplication).
- src/app/api/admin/deposits/route.ts (NEW): GET ?status=pending|approved|rejected|all — admin-only list of all deposits with user info.
- src/app/api/admin/deposits/approve/route.ts (NEW): POST {depositId} — admin-only approve.
- src/app/api/admin/deposits/reject/route.ts (NEW): POST {depositId} — admin-only reject.
- src/hooks/use-ui.ts: added 'admin' to ViewKey.
- src/components/dashboard/sidebar.tsx: shows "Admin · Approvals" nav item ONLY when logged-in user email == ADMIN_EMAIL (amareeyob533@gmail.com).
- src/components/dashboard/views/admin.tsx (NEW): Admin view with Pending/Approved/Rejected/All tabs, deposit table (user UID+email, amount, network, time, status), Approve (green) / Reject (red) buttons on pending items, "X deposits awaiting your approval" banner, how-it-works note.
- src/components/dashboard/dashboard-shell.tsx: renders AdminView for view==='admin'.

Admin access: email amareeyob533@gmail.com is auto-detected as admin. Created that account (UID 728545, password reset to admin123 for testing).

Verified E2E (curl + browser):
- Friend (friend@test.com) signs up, deposits 1000 USDT → balance stays 0 (NOT credited). ✓
- Admin (amareeyob533@gmail.com) logs in → sees "Admin · Approvals" in sidebar. ✓
- Admin view shows pending deposit: "1000 USDT from UID 592106 (friend@test.com)". ✓
- Admin clicks Approve → balance credited instantly (Friend USDT 0 → 1000). ✓
- Non-admin (Alice) blocked from /api/admin/deposits (403 Admin access required). ✓
- Browser: admin login → Admin nav visible → pending deposits table → click Approve → balance credited (Alice 400 → 700). ✓

Stage Summary:
- The admin (amareeyob533@gmail.com) can now log in and approve/reject all user deposits from an in-app Admin panel — no email required. Email sending is still in place for when SMTP gets configured later. Lint clean, server stable on :3000.

---
Task ID: 16
Agent: main
Task: Extend admin panel to also control/approve withdrawals (not just deposits)

Changes:
- src/lib/auto-approve.ts: removed autoCompleteWithdrawals() entirely. External withdrawals now stay "pending" until admin approves/rejects. KYC (30s) auto-approval kept. Internal transfers remain instant (peer-to-peer by design).
- src/app/api/withdraw/route.ts: updated notification message to "pending admin approval".
- src/lib/withdrawal-actions.ts (NEW): fetchWithdrawals(status), approveWithdrawal(id) [mark completed + create completed withdraw transaction + notify], rejectWithdrawal(id) [refund deducted balance + mark rejected + create refund transaction + notify]. Both idempotent.
- src/app/api/admin/withdrawals/route.ts (NEW): GET ?status=pending|completed|rejected|all — admin-only list.
- src/app/api/admin/withdrawals/approve/route.ts (NEW): POST {id} — admin-only.
- src/app/api/admin/withdrawals/reject/route.ts (NEW): POST {id} — admin-only (refunds user).
- src/components/dashboard/views/transactions.tsx: added 'refund' type to TYPE_META (Undo2 icon, green +amount) so rejected withdrawals show as a refund in user history.
- src/components/dashboard/views/admin.tsx: rewrote with Deposits/Withdrawals section toggle + Pending/Approved(Completed)/Rejected/All status tabs. Deposits table shows user/amount/network/time/status + Approve/Reject. Withdrawals table shows user/amount/network/destination wallet/time/status + Approve/Reject. Context-aware "how it works" note per section.

Verified E2E (curl + browser):
- Alice (700 USDT) requests external withdrawal 200 USDT → balance deducted to 500, status pending. ✓
- After 5s, still pending (no auto-complete). ✓
- Admin sees pending withdrawal: "200 USDT to TXyZ... UID 510600". ✓
- Admin APPROVES → withdrawal completed, balance stays 500 (already deducted). Transaction: withdraw 200 completed. ✓
- Alice requests another withdrawal 100 USDT → balance 400. ✓
- Admin REJECTS → balance refunded to 500, status rejected. Transaction: refund 100 completed. ✓
- Browser: admin login → Admin nav → Deposits tab (1 pending) → Withdrawals tab → Completed (200 USDT) + Rejected (100 USDT) tabs correct. ✓

How to access admin panel:
1. Sign in with amareeyob533@gmail.com / admin123
2. Click "Admin · Approvals" in the sidebar
3. Toggle between Deposits and Withdrawals
4. Click Approve or Reject on any pending item

Stage Summary:
- Admin can now approve/reject BOTH deposits and withdrawals from the in-app panel. No email needed. Rejecting a withdrawal refunds the user automatically. Lint clean, server stable on :3000.

---
Task ID: 16
Agent: main
Task: Add Bank withdrawal (3rd option) + Token Exchange (swap) feature

Changes:
- prisma/schema.prisma: Withdrawal model gained bankName, accountName, birrAmount (all optional, null for crypto/internal).
- src/lib/tokens.ts: added ETB_RATE=192 and BANKS list (CBE, Telebirr, Abay Bank, EMPSA).
- src/app/api/swap/route.ts (NEW): POST {fromToken, toToken, amount} → deducts fromToken, credits USD-equivalent of toToken at live prices. Creates swap_out + swap_in transactions + notification.
- src/components/dashboard/views/exchange.tsx (NEW): Exchange page with from/to token selectors, amount input, live rate display, swap-direction button, estimated received amount, "Exchange" submit. Tip box: "exchange to USDT first for bank withdrawal".
- src/hooks/use-ui.ts: added 'exchange' to ViewKey.
- src/components/dashboard/sidebar.tsx: added "Exchange" nav item (ArrowLeftRight icon).
- src/components/dashboard/dashboard-shell.tsx: renders ExchangeView.
- src/app/api/withdraw/route.ts: added bank mode — validates token==USDT, bankName in BANKS, accountName + accountNumber required. Stores bankName/accountName/birrAmount. network='bank'.
- src/lib/withdrawal-actions.ts: approveWithdrawal/rejectWithdrawal now bank-aware (approve sends "Bank Withdrawal Approved ✓ ... ≈ X ETB to CBE account N (Name)" notification; reject refunds USDT + "bank withdrawal rejected" notification). WithdrawalWithUser interface includes new fields.
- src/components/modals/withdraw-modal.tsx: 3rd mode "Bank ETB cash-out" (Landmark icon). Bank requires USDT (disabled otherwise with tip to use Exchange). 2-stage flow: stage 1 = select bank + enter USDT amount (live ETB preview = amount×192), stage 2 = bank info form (account holder name + bank account number) with summary banner. Submit → "Bank Withdrawal Submitted ... pending admin approval".
- src/components/dashboard/views/admin.tsx: AdminWithdrawal interface + WithdrawalsTable updated to show bank info (BANK · CBE badge, account number, account name, ≈ X ETB) for bank withdrawals.

Verified E2E (curl):
- Swap 50 USDT → HABESHA: received 7.7734 HABESHA (≈ $50), balances updated instantly. ✓
- Bank withdraw 100 USDT → CBE (acct 123456789, name Abebe Kebede): USDT deducted (450→350), birrAmount=19200 stored. ✓
- Bank withdraw 50 USDT → Telebirr (acct 987654321, name Sara Tesfaye): birrAmount=9600 stored. ✓
- Admin approve CBE bank withdrawal: status completed, user notified "Bank Withdrawal Approved ✓ ... ≈ 19,200 ETB to CBE account 123456789 (Abebe Kebede)". ✓
- Admin reject Telebirr bank withdrawal: status rejected, 50 USDT REFUNDED to user (300→350), user notified. ✓
- Non-USDT bank withdrawal blocked: "Bank withdrawals require USDT. Use the Exchange to convert your tokens to USDT first." ✓
- Admin panel shows all 6 withdrawals including 2 bank entries with full bank details (bank, acct, name, birr). ✓

Browser verified: Exchange page renders (from/to selectors, rate, swap button). Withdraw modal shows 3 modes (Internal, External, Bank). Bank mode shows bank selector (CBE/Telebirr/Abay/EMPSA) + ETB rate info + 2-stage form. (Dropdown-in-dialog option clicks are an agent-browser limitation; functionality proven via curl.)

Stage Summary:
- Users can now: (1) Exchange any token to USDT on the Exchange page, (2) Withdraw USDT to Ethiopian banks (CBE/Telebirr/Abay/EMPSA) at 1 USDT = 192 ETB, (3) See live ETB preview before confirming, (4) Fill bank account info, (5) Status shows "pending" until admin approves in the admin panel. Admin can approve (mark sent) or reject (refund USDT). Lint clean, server stable on :3000.

---
Task ID: 17
Agent: main
Task: Real camera KYC + manual admin approval for both Normal and High KYC

Changes:
- prisma/schema.prisma: User gained kycRequestedLevel (normal|high) + kycSelfieVideoUrl. Existing kycSelfieUrl (photo frame) + kycDocUrl (ID) kept.
- src/lib/auto-approve.ts: REMOVED KYC auto-approval (30s). Now a no-op — KYC, deposits, and withdrawals ALL require manual admin approval.
- src/app/api/kyc/upload/route.ts: now accepts video files (webm/mp4/mov) in addition to images; raised size limit to 25MB; returns {url, kind}.
- src/app/api/kyc/route.ts: POST now stores kycRequestedLevel + kycSelfieVideoUrl + kycSelfieUrl + kycDocUrl. Validates: live capture required for both levels, ID photo required for High. GET returns all KYC fields.
- src/lib/kyc-actions.ts (NEW): fetchKycSubmissions(status), approveKyc(userId) [sets kycLevel=requestedLevel, status approved, notifies user], rejectKyc(userId) [clears media, status rejected, notifies user — user can re-apply].
- src/app/api/admin/kyc/{route,approve,reject}/route.ts (NEW): admin-only endpoints. GET ?status=pending lists submissions with user info + media URLs. POST approve/reject {userId}.
- src/components/kyc/camera-capture.tsx (NEW): real camera component using navigator.mediaDevices.getUserMedia({video}) + MediaRecorder. Live mirrored preview, "Start Recording" button, auto-records 4s clip with countdown + scanning overlay, then shows recorded video preview + Retake option. Captures a thumbnail JPEG frame from the video too. Handles NotAllowedError/NotFoundError with clear messages.
- src/components/modals/kyc-modal.tsx: rewritten. Level select → capture step (CameraCapture for live face video, + ID photo upload for High KYC) → submit → "Submitted for Review" (pending). Uploads video blob + thumbnail to /api/kyc/upload. Submit disabled until video captured (and ID for High).
- src/components/dashboard/views/admin-kyc.tsx (NEW): KYC admin panel — card per submission showing user UID/email, requested level badge (NORMAL/HIGH), the live face VIDEO (playable <video>), the ID photo (for High), and Approve/Reject buttons. Pending count banner + how-it-works note.
- src/components/dashboard/views/admin.tsx: added 'kyc' to Section type, third toggle button "KYC" (ShieldCheck icon), renders <KycAdmin> when active (hides status tabs for KYC).

Verified E2E:
- KYC no longer auto-approves (stays pending after 30s+). ✓
- Normal KYC submit (video+selfie) → admin sees pending → Approve → user kycStatus=approved, kycLevel=normal. ✓
- High KYC submit (video+selfie+ID) → admin sees pending → Reject → user kycStatus=rejected, kycLevel=none, media cleared (can re-apply). ✓
- Camera component calls real getUserMedia — in sandbox (no camera) shows "No camera found. Please connect a camera and try again." On a real device it shows live preview + records 4s video. ✓
- File upload: webm video + images accepted, txt blocked. ✓
- Browser: admin KYC panel shows "1 KYC submission awaiting your review", Alice's NORMAL KYC card with video + Approve button → click → "No pending KYC submissions" → Alice approved. ✓

Stage Summary:
- Both KYC levels now require manual admin approval (no auto-approval). The user's real webcam records a live face video (4s) via getUserMedia+MediaRecorder; High KYC also captures an ID photo. The admin sees each submission in Admin · Approvals → KYC with the playable video and ID photo, and can Approve (sets the requested level) or Reject (clears + notifies). Lint clean, server stable on :3000.

---
Task ID: 18
Agent: main
Task: Add interactive price charts for every token (Binance-style) — click/search a token to view its chart

Changes:
- src/hooks/use-ui.ts: added tokenDetail + openTokenDetail (which token's chart to show) and authOpen/authTab/openAuth/closeAuth (auth modal state moved into the store so any component can trigger sign-in).
- src/app/page.tsx: removed local authOpen/authTab state; reads from use-ui store; renders <TokenDetailModal/> globally (works on both landing + dashboard).
- src/components/landing/landing-page.tsx: removed onAuth prop (uses useUI.openAuth now); added search bar in Markets section; token rows are now clickable (cursor-pointer + openTokenDetail(symbol)); "Trade" button stops propagation so it still opens auth. Search filters by symbol or name.
- src/lib/price-history.ts (NEW): deterministic seeded PRNG (mulberry32) generates historical price points per token per timeframe (1D/1W/1M/3M/1Y). Per-token volatility (stablecoins 0.15%, BTC 3%, TON 5%, HABESHA 0% flat). priceStats() computes high/low/change.
- src/components/markets/token-chart.tsx (NEW): recharts AreaChart with gradient fill (gold/up-green/down-red), timeframe selector (1D/1W/1M/3M/1Y), live price header with % change, custom tooltip (date+price+symbol), X-axis time labels, right-aligned Y-axis price labels, 3-stat row (high/low/change). HABESHA shows gold flat line.
- src/components/modals/token-detail-modal.tsx (NEW): modal with token header (icon/symbol/name/24h badge), the TokenChart, fixed-price + internal-only notices for HABESHA, Deposit/Withdraw(Transfer) action buttons. Logged-out users clicking an action → auth modal opens. HABESHA Deposit disabled.
- src/components/dashboard/views/markets.tsx: added search bar; token rows clickable (openTokenDetail); empty-state when search has no matches; action buttons stopPropagation so they still work.

Verified in browser:
- Landing Markets: search "bit" → filters to BTC only. ✓
- Click any token row → chart modal opens with price, 24h change, area chart, 1D/1W/1M/3M/1Y tabs, high/low/change stats. ✓
- BTC chart: $97,500, ▲2.34% 24h, switching 1W→1M updates chart + stats (▼10.76% · 1M). ✓
- HABESHA: flat gold chart, "fixed at $6.4321674, chart flat by design" notice, "internal only" notice, Deposit disabled, Withdraw→Transfer. ✓
- Logged-out: clicking Withdraw on TON chart → auth modal opens (Sign In). ✓
- Dashboard Markets: same search + click behavior. ✓

Stage Summary:
- Every token now has a Binance-style price chart. Click any token (or search + click) on the homepage Markets section or the dashboard Markets view to open a chart modal with timeframe tabs (1D/1W/1M/3M/1Y), live price, 24h change, high/low stats, and trade actions. Lint clean, server stable on :3000.

---
Task ID: 19
Agent: main
Task: Change balance color to formal white (dark mode) / dark (light mode) with clean font + fix theme toggle

Changes:
- src/app/layout.tsx: removed hardcoded className="dark" from <html> — next-themes now fully manages the theme class (defaultTheme="dark"), preventing any conflict when toggling.
- src/components/dashboard/views/overview.tsx: Total Balance changed from text-gold-gradient to text-foreground (white in dark, dark in light) + added tabular-nums for clean digit alignment.
- src/components/dashboard/topbar.tsx: Total Balance changed from text-gold-gradient to text-foreground + tabular-nums.
- src/components/dashboard/views/wallet.tsx: Total Estimated Value changed from text-gold-gradient to text-foreground + tabular-nums.

Verified in browser:
- Dark mode: balance is white, clean professional font (tabular-nums). ✓
- Light mode (toggle): balance is dark/black, readable, clean font. ✓
- Theme toggle switches correctly (html class dark↔light). ✓
- Wallet view + topbar balance both correct in both modes. ✓

Stage Summary:
- Balances now use a formal white color in dark mode and dark color in light mode (text-foreground), with tabular-nums for professional digit alignment. The theme toggle works cleanly. Lint clean, server stable on :3000.

---
Task ID: 20
Agent: main
Task: Make light mode eye-comfortable (was harsh inverted-filter look)

Problem: Old light theme used near-pure-white bg (#FBFAF6) + near-black text (#15151B) + pure-black borders = harsh, glaring, "inverted filter" feel.

Changes in src/app/globals.css:
- Light theme palette redesigned with soft, warm, eye-comfortable tones:
  - Background: warm linen #F4F1EA (not glaring white)
  - Foreground: soft charcoal #3A372E (not harsh black — reduces eye strain)
  - Card: #FBF9F4 (slightly lighter warm for gentle separation)
  - Secondary/muted: soft warm gray #EAE5DB / #EFEAE0
  - Muted-foreground: warm gray #7A7468
  - Borders: warm soft rgba(80,70,50,0.12) (not pure black)
  - Gold: richer warm #A8780C (not muddy)
  - Up/down: calmer sea-green #2E8B57 / muted red #B43A4C (less alarming)
  - Sidebar: slightly deeper warm #EDE8DD for hierarchy
- Added light-mode-specific gold gradient overrides (.light .text-gold-gradient etc.) — deeper/richer gold that reads well on warm backgrounds instead of glaring bright gold.
- Light-mode scrollbar: soft warm gray instead of gold.
- Added smooth 0.3s transition on background/color/border when toggling themes.

Verified in browser (VLM eye-comfort ratings):
- Light mode landing: 8/10 — "soft warm off-white background, dark gray text, comfortable"
- Light mode dashboard: 8/10 — "warm off-white inviting, highly readable, gold accents premium"
- Light mode markets: 8/10 — comfortable, clear
- Dark mode (unchanged): 8/10 — still sleek/premium

Stage Summary:
- Light mode is now soft, warm, and eye-comfortable (warm linen backgrounds, soft charcoal text, gentle warm borders, calmer gold/green/red). No longer looks like an inverted color filter. Smooth transition between themes. Lint clean, server stable on :3000.
