# Digicap Subscription System

This project implements a robust subscription and team management system using Lemon Squeezy, Firebase, and Express.

## Features

### 1. Subscription Management
- **Lemon Squeezy Integration**: Handles webhooks for subscription creation and updates.
- **Plan Mapping**: Maps Lemon Squeezy variant IDs to internal plans (`individual`, `team`, `company_30`, etc.).
- **Seat Logic**: Automatically manages and enforces seat limits based on the active plan.
- **Customer Portal**: Direct links to Lemon Squeezy for billing management and invoices.
- **Plan Changes**: Support for upgrading and downgrading plans via Lemon Squeezy checkout.

### 2. Team Collaboration
- **Invitations**: Admins can invite users via email or by generating a shareable invite link.
- **User Management**: Admins can view team members, change roles (admin/user), and remove users.
- **Company Settings**: Admins can update the company name and view audit logs.

### 3. Security & Audit
- **Firestore Security Rules**: Strict rules ensuring users only access their own company data.
- **Audit Logging**: Every critical action (invites, plan changes, role updates) is logged in the `audit_logs` collection.
- **Admin Metrics**: A dedicated dashboard for super-admins to track MRR, ARR, and user growth.

## Webhook Flow
1. Lemon Squeezy sends a `subscription_created` or `subscription_updated` event to `/api/webhooks/lemon`.
2. The server verifies the event and extracts the `company_id` from the custom data.
3. The corresponding company document in Firestore is updated with the new plan, status, and seat total.
4. An audit log entry is created for the event.

## Plan Changes
1. Admin clicks "Upgrade" or "Downgrade" in the UI.
2. Frontend calls `/api/subscription/change-plan`.
3. Backend generates a Lemon Squeezy subscription update URL.
4. Admin completes the process on Lemon Squeezy.
5. Webhook updates the system once the change is processed.
