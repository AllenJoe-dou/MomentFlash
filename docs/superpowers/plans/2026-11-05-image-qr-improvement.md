# 一闪 Moment 图片展示与二维码改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make participant pages display only the operator-selected complete image and add operator-side QR generation/download to the control panel.

**Architecture:** The Express app keeps JSON-backed configuration and submissions, with `displayImageId` selecting the participant image. The participant page becomes display-only, while the admin editor owns uploads, image selection, and QR generation through a local `qrcode` PNG endpoint.

**Tech Stack:** Node.js 20+, Express, Multer, `qrcode`, native HTML/CSS/JavaScript, Playwright-Core + Edge for UI verification, Railway.

## Global Constraints

- Participant page must not expose image upload, image preset selection, or image clearing.
- `displayImageId` selects one operator-configured image.
- Participant image uses responsive `object-fit: contain`; it must never crop or distort.
- QR URL is always `<window.location.origin>/`; local uses `http://localhost:3000/`.
- QR generation is local via `GET /api/qr.png`; no third-party API.
- Save downloads `yishan-moment-qr.png`.
- Existing submission, admin filtering, detail view, and CSV export must continue working.
- Verify at 320px, 390px, 768px, and 1440px widths.

---

### Task 1: Display-image data and submission behavior

**Files:**
- Modify: `lib/store.js`, `server.js`, `tests/store.test.js`, `tests/api.test.js`
- Test: `tests/store.test.js`, `tests/api.test.js`

- [ ] Write failing tests for `displayImageId` fallback and submissions using the configured display image.
- [ ] Run `npm test` and verify the new tests fail.
- [ ] Implement config fallback and server-side submission image selection.
- [ ] Run `npm test` and commit.

### Task 2: Local QR endpoint

**Files:**
- Modify: `package.json`, `server.js`, `tests/api.test.js`
- Test: `tests/api.test.js`

- [ ] Write failing tests for QR PNG responses and invalid URLs.
- [ ] Run `npm test` and verify they fail.
- [ ] Add `qrcode`, implement `GET /api/qr.png`, and validate `http/https` URLs.
- [ ] Run `npm test` and commit.

### Task 3: Participant display-only image UI

**Files:**
- Modify: `public/index.html`, `public/app.js`, `public/styles.css`, `tests/frontend-smoke.test.js`
- Test: `tests/frontend-smoke.test.js`

- [ ] Write failing smoke tests asserting upload controls are absent and complete-image display is present.
- [ ] Run `npm test` and verify they fail.
- [ ] Remove participant image controls and render `config.displayImageId` with responsive `contain`.
- [ ] Run `npm test`, local HTTP checks, and commit.

### Task 4: Admin image selection and QR panel

**Files:**
- Modify: `public/admin-edit.html`, `public/admin-edit.js`, `public/admin.css`, `tests/admin-smoke.test.js`
- Test: `tests/admin-smoke.test.js`

- [ ] Write failing smoke tests for display-image marking, QR generate, and QR save controls.
- [ ] Run `npm test` and verify they fail.
- [ ] Implement operator image selection and QR generate/download panel.
- [ ] Run `npm test` and commit.

### Task 5: Responsive browser verification and documentation

**Files:**
- Modify: `README.md`, `UI-TEST-REPORT.md`
- Test: `work/ui-test/ui-test.js`

- [ ] Extend the browser smoke test to verify participant page has no image controls, QR preview/download works, and complete image display is not cropped at 320/390/768/1440px.
- [ ] Run browser automation and inspect screenshots.
- [ ] Update README and UI test report with the new behavior and QR workflow.
- [ ] Run `npm test`, commit, and report.

## Self-Review

- Every requested improvement maps to Tasks 1-5.
- No placeholders or undefined APIs remain.
- Participant/admin boundaries and QR URL behavior are explicit.
