-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('admin', 'staff')) default 'staff',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for tasks
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  is_complete boolean default false,
  assignee_id uuid references profiles(id) not null,
  created_by uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on tasks
alter table tasks enable row level security;

-- Create policies for tasks
-- Admin can view all tasks
create policy "Admins can view all tasks." on tasks
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Staff can view their own tasks
create policy "Staff can view their own tasks." on tasks
  for select using (
    auth.uid() = assignee_id
  );

-- Admin can insert tasks
create policy "Admins can insert tasks." on tasks
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admin can update tasks
create policy "Admins can update tasks." on tasks
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Staff can update their own tasks (e.g. mark as complete)
create policy "Staff can update their own tasks." on tasks
  for update using (
    auth.uid() = assignee_id
  );

-- Create a table for messages
create table messages (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id), -- Nullable for global chat
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on messages
alter table messages enable row level security;

-- Create policies for messages
-- Users can view messages sent by them or sent to them, or global messages (receiver_id is null)
create policy "Users can view their messages and global messages." on messages
  for select using (
    auth.uid() = sender_id or
    auth.uid() = receiver_id or
    receiver_id is null
  );

-- Users can insert messages where they are the sender
create policy "Users can insert their own messages." on messages
  for insert with check (
    auth.uid() = sender_id
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'staff'); -- Default to staff, admin can update later or we set explicitly
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
