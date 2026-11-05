# 一闪 Moment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable Express application that lets operators configure an image/text/choice submission page and lets participants submit responses that operators can review and export.

**Architecture:** A Node.js/Express single application serves three HTML experiences and a small JSON-backed API. The participant page renders dynamic liquid-glass backgrounds and interactive fields; the admin pages read and update the same JSON configuration/submission data. Uploaded images are stored locally for the demo stage and can later be migrated to cloud storage.

**Tech Stack:** Node.js 20+, Express, Multer, native HTML/CSS/JavaScript, Node built-in test runner, Railway.

## Global Constraints

- Product name: “一闪 Moment”.
- Demo-stage persistence is local JSON plus local `uploads/`; do not add PostgreSQL.
- Railway must start with `npm start` and listen on `process.env.PORT || 3000`.
- Default background is `pink-plum`; four switchable themes are `pink-plum`, `violet-flow`, `golden-hour`, and `ocean-bubble`.
- Participant page must support image upload and preset selection.
- Participant page must support configurable text fields and single/multiple-choice fields.
- `/admin` must show submissions and export CSV; `/admin/edit` must edit page configuration.
- Responsive layout, touch-friendly controls, and `prefers-reduced-motion` support are required.

---

### Task 1: Project scaffold and JSON data service

**Files:**
- Create: `package.json`, `server.js`, `lib/store.js`, `lib/validate.js`, `data/config.json`, `data/submissions.json`, `tests/store.test.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: Node.js `fs`, `path`, and `crypto`.
- Produces: `loadConfig()`, `saveConfig(config)`, `listSubmissions()`, `addSubmission(record)`, and `validateSubmission(payload, config)`.

- [ ] **Step 1: Write failing tests for config loading, submission persistence, and required-field validation.**
- [ ] **Step 2: Run `npm test` and verify the tests fail because the modules are missing.**
- [ ] **Step 3: Implement `lib/validate.js`, `lib/store.js`, and seed data.**
- [ ] **Step 4: Run `npm test` and verify all store/validator tests pass.**
- [ ] **Step 5: Commit with `feat: add json-backed data service`.**

### Task 2: Express API and upload handling

**Files:**
- Create/Modify: `server.js`, `tests/api.test.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Consumes: `lib/store.js`, `lib/validate.js`, Express, Multer.
- Produces: HTTP endpoints `GET /api/config`, `PUT /api/config`, `POST /api/upload`, `POST /api/submissions`, `GET /api/submissions`, and `GET /api/submissions/export.csv`.

- [ ] **Step 1: Write failing API tests for config read/write, upload, submission creation, and CSV export.**
- [ ] **Step 2: Run `npm test` and verify the API tests fail.**
- [ ] **Step 3: Implement Express routes and Multer upload storage.**
- [ ] **Step 4: Run `npm test` and verify all tests pass.**
- [ ] **Step 5: Commit with `feat: add express api and uploads`.**

### Task 3: Participant page and dynamic backgrounds

**Files:**
- Create/Modify: `public/index.html`, `public/app.js`, `public/styles.css`, `public/backgrounds.js`
- Test: `tests/frontend-smoke.test.js`

**Interfaces:**
- Consumes: `GET /api/config`, `POST /api/upload`, `POST /api/submissions`.
- Produces: Participant UI with image upload/preset selection, text fields, choice fields, submit feedback, and four animated themes.

- [ ] **Step 1: Write smoke tests that assert the required participant elements and background theme names are present.**
- [ ] **Step 2: Run `npm test` and verify the smoke tests fail.**
- [ ] **Step 3: Implement responsive liquid-glass participant UI and Canvas/CSS animations.**
- [ ] **Step 4: Run `npm test`, start the server, and verify `/` renders successfully.**
- [ ] **Step 5: Commit with `feat: add participant experience`.**

### Task 4: Admin submission and configuration pages

**Files:**
- Create/Modify: `public/admin.html`, `public/admin-edit.html`, `public/admin.js`, `public/admin-edit.js`
- Test: `tests/admin-smoke.test.js`

**Interfaces:**
- Consumes: `GET /api/submissions`, `GET /api/submissions/export.csv`, `GET /api/config`, `PUT /api/config`.
- Produces: Submission list with filtering and CSV export plus editable title/copy/image/background/text/choice configuration.

- [ ] **Step 1: Write smoke tests asserting admin table, filter, export, and config editor controls exist.**
- [ ] **Step 2: Run `npm test` and verify the admin smoke tests fail.**
- [ ] **Step 3: Implement `/admin` and `/admin/edit` pages.**
- [ ] **Step 4: Run `npm test` and verify all tests pass.**
- [ ] **Step 5: Commit with `feat: add admin experience`.**

### Task 5: Railway configuration, documentation, and final verification

**Files:**
- Create/Modify: `README.md`, `Procfile`, `railway.json`, `.gitignore`, `tests/smoke.test.js`
- Test: `tests/smoke.test.js`

**Interfaces:**
- Consumes: Existing Express app and package scripts.
- Produces: GitHub/Railway-ready repository with local run instructions and automated smoke checks.

- [ ] **Step 1: Write smoke tests for package scripts, Railway port handling, and required documentation.**
- [ ] **Step 2: Run `npm test` and verify the deployment smoke tests fail.**
- [ ] **Step 3: Add deployment files and complete README instructions.**
- [ ] **Step 4: Run `npm test`, `npm start`, and manual HTTP checks against `/`, `/admin`, and `/admin/edit`.**
- [ ] **Step 5: Commit with `chore: prepare railway deployment`.**

## Self-Review

- Spec coverage: all participant, admin, background, persistence, deployment, and acceptance requirements map to Tasks 1-5.
- Placeholder scan: no TBD/TODO items; commands and expected outcomes are explicit.
- Type consistency: store and API names are shared exactly across tasks.
