-- Create a function that automatically creates a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    auth_user_id,
    full_name,
    date_of_birth,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'date_of_birth')::date, '1990-01-01'::date),
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- Create the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
