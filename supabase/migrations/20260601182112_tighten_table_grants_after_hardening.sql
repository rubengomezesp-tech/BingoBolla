-- Remove non-DML privileges inherited by browser roles. The Data API does not
-- need REFERENCES/TRIGGER, and anon should not be able to select profiles.

revoke references, trigger on all tables in schema public from anon;
revoke references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public revoke references, trigger on tables from anon;
alter default privileges in schema public revoke references, trigger on tables from authenticated;

revoke select on table public.profiles from anon;
