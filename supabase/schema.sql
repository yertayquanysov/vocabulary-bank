-- Vocabulary Bank schema
-- Applied to the Supabase project as migrations "create_words_table",
-- "words_rls_and_owner", and "words_shared_bank".
--
-- Auth: email + password only. Accounts are created by the owner in the
-- Supabase dashboard; the app never calls signUp. Signed-in users share one
-- bank: RLS blocks anonymous access, but every authenticated account can read
-- and write every word.

create table words (
  id bigint generated always as identity primary key,
  word varchar(255) not null,
  meaning text not null,
  example text,
  status varchar(20) not null default 'new'
    check (status in ('new', 'learning', 'mastered')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table words enable row level security;

create index words_created_at_idx
  on words (created_at desc);

create policy "Authenticated users can read words"
  on words for select
  to authenticated
  using (true);

create policy "Authenticated users can insert words"
  on words for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update words"
  on words for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete words"
  on words for delete
  to authenticated
  using (true);

create or replace function words_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger words_set_updated_at
  before update on words
  for each row
  execute function words_set_updated_at();
