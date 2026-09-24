-- Paste this whole thing into the Supabase SQL editor and run it.
-- It only READS. Copy the result back and it becomes the base migration.

select
  'TABLE: ' || table_name || E'\n' ||
  string_agg(
    '  ' || column_name || ' ' || data_type ||
    coalesce('(' || character_maximum_length || ')', '') ||
    case when is_nullable = 'NO' then ' NOT NULL' else '' end ||
    coalesce(' DEFAULT ' || column_default, ''),
    E'\n' order by ordinal_position
  ) as definition
from information_schema.columns
where table_schema = 'public'
group by table_name
order by table_name;
