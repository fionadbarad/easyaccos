# EasyAcco: UK Fiscal Engine & Financial Management Platform

**Author:** Fiona Barad  
**Status:** Live in Production  
**URL:** [easyacco.uk](https://easyacco.uk)

## Overview
EasyAcco is a high-fidelity financial management platform specifically engineered for the UK 2026/27 fiscal year. It bridges the gap between complex tax legislation and user-centric financial tracking, providing sole traders, directors, and high-earners with a "bank-grade" tool for tax estimation, invoice management, and audit-ready record keeping.

## Core Technical Features

### 1. High-Fidelity Fiscal Engine
*   **2026/27 Tax Logic:** Full implementation of UK tax bands, including the Personal Allowance taper (£100k - £125,140) and the resulting 60% effective tax trap.
*   **Multi-Scenario Support:** Specialized logic for Self-Employed (Class 2/4 NI), Employed (PAYE), and Limited Company Directors (Salary + Dividend optimization).
*   **Regional Compliance:** Integrated support for Scottish tax bands and Student Loan Plans (1, 2, 5, and Postgraduate).

### 2. Security & Data Privacy (Bank-Grade)
*   **Client-Side Encryption:** Implements **AES-GCM (256-bit)** encryption using the Web Crypto API (`crypto.subtle`). User data is encrypted locally before any cloud synchronization.
*   **Zero-Knowledge Architecture:** Sensitive financial records are never stored in plain text on the server.
*   **Local-First Persistence:** Leverages **IndexedDB** for high-performance, offline-capable data storage, ensuring zero data loss even without an internet connection.

### 3. Modern Tech Stack
*   **Framework:** Next.js 16 (App Router) with React 19.
*   **Language:** Strict TypeScript for type-safe financial calculations.
*   **Styling:** Tailwind CSS for a professional, responsive, and high-performance UI.
*   **Backend/Auth:** Supabase (PostgreSQL) for secure user authentication and encrypted data sync.
*   **Testing:** Vitest for unit testing the core tax engine logic to ensure 100% mathematical accuracy.

## Project Structure
*   `src/lib/tax-scenarios.ts`: The central source of truth for UK tax constants and logic.
*   `src/lib/storage/crypto.ts`: Implementation of the AES-GCM encryption layer.
*   `src/features/`: Modularized feature components (Invoices, Expenses, Tax Estimator).
*   `src/lib/__tests__/`: Comprehensive test suite for validating fiscal calculations against HMRC manual cases.

## Vision
EasyAcco was developed to empower UK taxpayers with transparency. By automating the "boring" parts of accounting and providing clear visualizations of tax liabilities, it allows users to make informed financial decisions and optimize their tax positions legally and efficiently.

---
© 2026 Fiona Barad. All rights reserved.
