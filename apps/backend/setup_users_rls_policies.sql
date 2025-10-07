-- =============================================
-- RLS Policies Setup for public.users table
-- =============================================
-- This script sets up Row Level Security policies to allow:
-- 1. Authenticated users to view their own profile
-- 2. Authenticated users to update their own profile
-- 3. Authenticated users to insert their own profile
-- NOTE: DELETE is NOT allowed for users

BEGIN;

-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.users;

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to SELECT their own record
-- This uses auth.uid() which returns the user ID from the JWT token
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow authenticated users to UPDATE their own record
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow authenticated users to INSERT their own record
-- This is useful for creating user profiles after signup
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated role (excluding DELETE)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Ensure DELETE permission is revoked (if it was previously granted)
REVOKE DELETE ON public.users FROM authenticated;

COMMIT;

-- =============================================
-- Verification Queries
-- =============================================
-- Run these to verify the policies are set up correctly:

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- List all policies on the users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- Check permissions granted to authenticated role
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND grantee = 'authenticated'
ORDER BY privilege_type;

-- Test query structure (for reference - what your app will run)
-- SELECT id, email, full_name, created_at 
-- FROM public.users 
-- WHERE id = auth.uid();