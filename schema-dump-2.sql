-- Second query: constraints, indexes and row-level security.

select conrelid::regclass::text as tbl,
       conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by 1, 2;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
