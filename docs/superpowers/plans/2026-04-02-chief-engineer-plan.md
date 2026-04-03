# Chief Engineer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Chief Engineer role, create initial managers and supervisors, and build the Chief Engineer dashboard and tree view.

**Architecture:** We will seed the database with the requested accounts. Then we will add a new `chief_engineer` role, build a Dashboard page for it, and modify the User Manage page to show a tree view for this role.

**Tech Stack:** Node.js, Express, PostgreSQL, React, Tailwind CSS

---

### Task 1: Seed Initial Accounts

**Files:**
- Create: `scripts/seed_chief_engineer.cjs`

- [ ] **Step 1: Write the seed script**
We already wrote a `seed_users.js`. We will execute it.

- [ ] **Step 2: Run the seed script**
Run: `node seed_users.js`
Expected: Output showing creation of Chief Engineer, Managers, and Supervisors.

### Task 2: Update Backend Roles & Tree View API

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add Chief Engineer role check in middlewares**
Modify `server.ts` to allow `chief_engineer` to access `adminMiddleware` routes or create a specific `chiefEngineerMiddleware`.

- [ ] **Step 2: Add API for Tree View**
Create `GET /api/users/tree` that returns the hierarchical structure starting from the Chief Engineer down to the lowest level.

- [ ] **Step 3: Add API for Dashboard Stats**
Create `GET /api/system/status` returning OS and DB metrics.

### Task 3: Chief Engineer Dashboard UI

**Files:**
- Create: `src/pages/ChiefEngineerDashboard.tsx`
- Modify: `src/App.tsx` (or wherever routes/views are managed)
- Modify: `src/components/Sidebar.tsx` (to show the dashboard link)

- [ ] **Step 1: Build ChiefEngineerDashboard component**
A React component that fetches `/api/system/status` and displays CPU, Memory, DB Size, and Node version.

- [ ] **Step 2: Update Sidebar/Routing**
Add the dashboard view to the main App state so `chief_engineer` can see it.

### Task 4: Tree View in User Manage Page

**Files:**
- Modify: `src/pages/UserManagePage.tsx`

- [ ] **Step 1: Implement Tree View UI**
If the user is `chief_engineer`, show a hierarchical list (Tree View) of managers and their subordinates instead of a flat list.
