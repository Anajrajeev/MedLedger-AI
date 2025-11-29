# Database Connection Fix

## Issue: IPv4/IPv6 Compatibility

Your Supabase database shows "Not IPv4 compatible" which means the Direct Connection won't work on IPv4-only networks (common on Windows).

## Solution: Use Session Pooler

Instead of the Direct Connection, use the **Session Pooler** connection string.

### Steps:

1. In the Supabase modal, change **Method** from "Direct connection" to **"Session Pooler"**
2. Copy the new connection string (it will have a different hostname)
3. Update your `.env.local` file

### Connection String Format:

**Direct Connection (IPv6 only - won't work):**
```
postgresql://postgres:Medledger1*@db.lcewspeexqncnahwjxcv.supabase.co:5432/postgres
```

**Session Pooler (IPv4 compatible - use this):**
```
postgresql://postgres:Medledger1*@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Important Notes:

1. **Password encoding**: If your password has special characters, encode them:
   - `*` = `%2A`
   - `@` = `%40`
   - `:` = `%3A`

2. **Port difference**: 
   - Direct Connection uses port `5432`
   - Session Pooler uses port `6543`

3. **Hostname difference**:
   - Direct: `db.[project-ref].supabase.co`
   - Pooler: `aws-0-[region].pooler.supabase.com`

### Quick Fix:

1. In Supabase dashboard → Settings → Database
2. Change **Method** to "Session Pooler"
3. Copy the connection string
4. Encode the password if needed: `node scripts/encode-db-password.js "Medledger1*"`
5. Update `.env.local` with the new connection string
6. Test: `npm run db:test`

