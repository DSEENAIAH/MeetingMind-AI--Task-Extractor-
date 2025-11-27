fetch the  teams and show under the select your team d# Test User Accounts - IMPORTANT

## The SQL insert broke auth. Let's clean up and use proper signup.

### Step 1: Clean up the broken users

Run this in Supabase SQL Editor:

```sql
-- Delete the test users we inserted (they're causing errors)
DELETE FROM user_profiles WHERE username IN ('sarah_johnson', 'michael_chen', 'emily_rodriguez', 'david_kumar');

DELETE FROM auth.users WHERE email IN (
  'sarah.johnson@company.com',
  'michael.chen@company.com', 
  'emily.rodriguez@company.com',
  'david.kumar@company.com'
);
```

### Step 2: Sign up through the UI (PROPER WAY)

Go to your login page and click "Sign Up", then create these accounts:

**Manager Account:**
- Full Name: `Sarah Johnson`
- Username: `sarah_johnson`
- Email: `sarah.johnson@company.com`
- Password: `Test123!`
- Role: `Team Lead`

**Worker Account 1:**
- Full Name: `Michael Chen`
- Username: `michael_chen`
- Email: `michael.chen@company.com`
- Password: `Test123!`
- Role: `Senior Developer`

**Worker Account 2:**
- Full Name: `Emily Rodriguez`
- Username: `emily_rodriguez`
- Email: `emily.rodriguez@company.com`
- Password: `Test123!`
- Role: `Developer`

**Worker Account 3:**
- Full Name: `David Kumar`
- Username: `david_kumar`
- Email: `david.kumar@company.com`
- Password: `Test123!`
- Role: `QA Engineer`

### Step 3: Confirm emails in Supabase

After signing up all 4 accounts, run this in Supabase SQL Editor:

```sql
-- Confirm all test user emails
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email IN (
  'sarah.johnson@company.com',
  'michael.chen@company.com',
  'emily.rodriguez@company.com',
  'david.kumar@company.com'
);
```

### Step 4: Verify it worked

```sql
-- Check users were created properly
SELECT email, email_confirmed_at, raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email LIKE '%@company.com';

-- Check profiles were created
SELECT username, full_name, role 
FROM user_profiles
WHERE username IN ('sarah_johnson', 'michael_chen', 'emily_rodriguez', 'david_kumar');
```

---

## Why direct SQL insert failed:

Supabase Auth has internal triggers, identities table, and other dependencies that get bypassed when inserting directly into `auth.users`. This causes 500 errors. Always use:
1. The signup UI, OR
2. Supabase Auth Admin API

Never insert directly into `auth.users` table.
