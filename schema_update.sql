-- Add new columns to tasks table
alter table tasks 
add column description text,
add column due_date timestamp with time zone,
add column priority text check (priority in ('low', 'medium', 'high')) default 'medium',
add column type text check (type in ('task', 'meeting')) default 'task',
add column meeting_link text;

-- Update RLS to ensure these new columns are accessible (existing policies should cover row access, but good to verify)
-- Existing policies cover SELECT/INSERT/UPDATE on the whole row, so no new policies needed for columns.
