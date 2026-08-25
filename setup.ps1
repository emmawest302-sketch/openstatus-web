# Create directories
mkdir -Force src\lib
mkdir -Force src\components
mkdir -Force src\app\dashboard
mkdir -Force src\app\signup
mkdir -Force migrations

# Create supabase.ts
@'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
'@ | Out-File -Encoding UTF8 src\lib\supabase.ts

Write-Host "✓ Files created! Now run: npm run dev"
