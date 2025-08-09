# Vercel Environment Variables

## Copy these exactly as shown into Vercel Dashboard

### Go to: https://vercel.com/saul-mateos-projects/collection-curves-vercel/settings/environment-variables

---

### Variable 1:
**Key:**
```
NEXT_PUBLIC_SUPABASE_URL
```

**Value:**
```
https://nwkpseszrjjushgxdgfl.supabase.co
```

---

### Variable 2:
**Key:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3BzZXN6cmpqdXNoZ3hkZ2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDc2NDksImV4cCI6MjA1NzgyMzY0OX0.MJFJt-MpnhrCLakiMkKTq03Vy0uKUg2xdqirt0kJj9E
```

---

### Variable 3:
**Key:**
```
SUPABASE_SERVICE_ROLE_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3BzZXN6cmpqdXNoZ3hkZ2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI0NzY0OSwiZXhwIjoyMDU3ODIzNjQ5fQ.JJ1DSpQ12ItkhF-yTWXyl9lmNKxvyig7nOv9q56VTeI
```

---

## Steps:
1. Go to Settings → Environment Variables
2. For each variable above:
   - Paste the Key in "Name" field
   - Paste the Value in "Value" field  
   - Leave all checkboxes checked (Production, Preview, Development)
   - Click "Save"
3. After adding all 3, redeploy your app

## Quick Copy (All at once for .env file):
```
NEXT_PUBLIC_SUPABASE_URL=https://nwkpseszrjjushgxdgfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3BzZXN6cmpqdXNoZ3hkZ2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDc2NDksImV4cCI6MjA1NzgyMzY0OX0.MJFJt-MpnhrCLakiMkKTq03Vy0uKUg2xdqirt0kJj9E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a3BzZXN6cmpqdXNoZ3hkZ2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI0NzY0OSwiZXhwIjoyMDU3ODIzNjQ5fQ.JJ1DSpQ12ItkhF-yTWXyl9lmNKxvyig7nOv9q56VTeI
```