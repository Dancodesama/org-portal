-- Allow staff to create tasks for themselves
-- This adds a policy so staff can insert tasks where they are BOTH the creator and assignee

-- First, let's check what policies exist
-- If you already have "Staff can insert their own tasks" policy, you can skip this

-- Add policy for staff to insert their own tasks/meetings
create policy "Staff can insert their own tasks." on tasks
  for insert with check (
    auth.uid() = assignee_id AND auth.uid() = created_by
  );

-- Note: The existing "Staff can update their own tasks" policy already covers marking as complete
-- The existing "Staff can view their own tasks" policy already covers viewing

-- This allows staff to:
-- 1. Create tasks/meetings for themselves (personal to-do list)
-- 2. View their tasks (both self-created and admin-assigned)
-- 3. Update their tasks (mark as complete)
-- But NOT:
-- - Create tasks for other staff
-- - View other staff's tasks
-- - Delete tasks (admins only, we'll need to add that)
