-- SeatAI school pilot. Browser clients get SELECT with RLS and narrowly scoped RPCs.
-- No service-role key is used by the application. Confidential notes are never
-- included in a teacher/principal response, backup, roster or seating snapshot.
begin;
create schema if not exists seatai_private;
revoke all on schema seatai_private from public, anon;
grant usage on schema seatai_private to authenticated;

create table public.seatai_schools (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 100),
  notice text not null check (length(notice) between 10 and 2000), created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.seatai_members (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.seatai_schools(id),
  user_id uuid not null references auth.users(id), role text not null check (role in ('teacher','counselor','principal')),
  display_name text not null check (length(display_name) between 1 and 100), active boolean not null default true,
  expires_at timestamptz, unique(school_id,user_id,role), unique(id,school_id)
);
create table public.seatai_classes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.seatai_schools(id),
  name text not null check (length(name) between 1 and 100), snapshot jsonb not null default '{"rows":1,"cols":1,"positions":[]}',
  created_by uuid not null references auth.users(id), updated_at timestamptz not null default now(), unique(id,school_id)
);
create table public.seatai_assignments (
  school_id uuid not null, class_id uuid not null, member_id uuid not null,
  primary key (class_id,member_id),
  foreign key (class_id,school_id) references public.seatai_classes(id,school_id),
  foreign key (member_id,school_id) references public.seatai_members(id,school_id)
);
create table public.seatai_students (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, class_id uuid not null,
  local_ref text not null check (length(local_ref) between 1 and 128), name text not null check (length(name) between 1 and 100),
  foreign key (class_id,school_id) references public.seatai_classes(id,school_id),
  unique(class_id,local_ref), unique(id,class_id,school_id)
);
create table public.seatai_referrals (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, class_id uuid not null, student_id uuid not null,
  teacher_id uuid not null references auth.users(id), title text not null check (length(title) between 1 and 150),
  detail text not null check (length(detail) between 1 and 2000), status text not null default 'new' check (status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now(),
  foreign key (student_id,class_id,school_id) references public.seatai_students(id,class_id,school_id), unique(id,school_id)
);
create table public.seatai_recommendations (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, referral_id uuid not null,
  author_id uuid not null references auth.users(id), body text not null check (length(body) between 1 and 2000),
  goal text not null check (length(goal) between 1 and 500), review_date date not null,
  created_at timestamptz not null default now(), foreign key (referral_id,school_id) references public.seatai_referrals(id,school_id)
);
create table public.seatai_outcomes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, referral_id uuid not null,
  author_id uuid not null references auth.users(id), body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(), foreign key (referral_id,school_id) references public.seatai_referrals(id,school_id)
);
create table public.seatai_private_notes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, referral_id uuid not null,
  author_id uuid not null references auth.users(id), body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(), foreign key (referral_id,school_id) references public.seatai_referrals(id,school_id)
);
create table public.seatai_audit (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.seatai_schools(id),
  actor_id uuid not null references auth.users(id), action text not null, created_at timestamptz not null default now()
);
create index seatai_member_user on public.seatai_members(user_id,school_id,role);
create index seatai_assignment_member on public.seatai_assignments(member_id,class_id);
create index seatai_student_class on public.seatai_students(class_id);
create index seatai_referral_class on public.seatai_referrals(class_id,teacher_id);
create index seatai_recommendation_case on public.seatai_recommendations(referral_id);
create index seatai_outcome_case on public.seatai_outcomes(referral_id);
create index seatai_note_case on public.seatai_private_notes(referral_id);
create index seatai_audit_school on public.seatai_audit(school_id,created_at desc);

-- The only definer functions live in an unexposed schema, have a fixed search
-- path, and derive identity exclusively from Auth. Live session + membership
-- lookups enforce sign-out, expiry and revocation without waiting for JWT expiry.
create function seatai_private.actor() returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where u.id = (select auth.uid())
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
    and (select auth.jwt()->>'aal')='aal2'
    and exists (select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified')
    and exists (select 1 from auth.sessions s where s.user_id=u.id and s.id::text = (select auth.jwt()->>'session_id'))
$$;
create function seatai_private.has_role(p_school uuid,p_role text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.seatai_members m where m.school_id=p_school and m.role=p_role
    and m.user_id=(select seatai_private.actor()) and m.active and (m.expires_at is null or m.expires_at>now()))
$$;
create function seatai_private.can_class(p_class uuid,p_role text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.seatai_assignments a join public.seatai_members m on m.id=a.member_id
    where a.class_id=p_class and m.role=p_role and m.user_id=(select seatai_private.actor())
    and m.active and (m.expires_at is null or m.expires_at>now()))
$$;
create function seatai_private.can_referral(p_referral uuid,p_role text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.seatai_referrals r where r.id=p_referral and seatai_private.can_class(r.class_id,p_role)
    and (p_role='counselor' or (p_role='teacher' and r.teacher_id=(select seatai_private.actor()))))
$$;

do $$ declare t text; begin
  foreach t in array array['schools','members','classes','assignments','students','referrals','recommendations','outcomes','private_notes','audit'] loop
    execute format('alter table public.seatai_%I enable row level security',t);
    execute format('revoke all on public.seatai_%I from anon, authenticated',t);
    execute format('grant select on public.seatai_%I to authenticated',t);
  end loop;
end $$;
create policy school_read on public.seatai_schools for select to authenticated using (
  seatai_private.has_role(id,'teacher') or seatai_private.has_role(id,'counselor') or seatai_private.has_role(id,'principal'));
create policy member_read on public.seatai_members for select to authenticated using (
  (user_id=(select seatai_private.actor())) or seatai_private.has_role(school_id,'principal'));
create policy class_read on public.seatai_classes for select to authenticated using (
  seatai_private.can_class(id,'teacher') or seatai_private.can_class(id,'counselor') or seatai_private.has_role(school_id,'principal'));
create policy assignment_read on public.seatai_assignments for select to authenticated using (
  seatai_private.has_role(school_id,'principal') or member_id in (select id from public.seatai_members where user_id=(select seatai_private.actor())));
create policy student_read on public.seatai_students for select to authenticated using (
  seatai_private.can_class(class_id,'teacher') or seatai_private.can_class(class_id,'counselor'));
create policy referral_read on public.seatai_referrals for select to authenticated using (
  seatai_private.can_referral(id,'teacher') or seatai_private.can_referral(id,'counselor'));
create policy recommendation_read on public.seatai_recommendations for select to authenticated using (
  seatai_private.can_referral(referral_id,'teacher') or seatai_private.can_referral(referral_id,'counselor'));
create policy outcome_read on public.seatai_outcomes for select to authenticated using (
  seatai_private.can_referral(referral_id,'teacher') or seatai_private.can_referral(referral_id,'counselor'));
create policy note_read on public.seatai_private_notes for select to authenticated using (seatai_private.can_referral(referral_id,'counselor'));
create policy audit_read on public.seatai_audit for select to authenticated using (seatai_private.has_role(school_id,'principal'));

create function seatai_private.bootstrap() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('schoolId',m.school_id,'schoolName',s.name,'role',m.role,'displayName',m.display_name) order by s.name,case m.role when 'teacher' then 1 when 'counselor' then 2 else 3 end),'[]'::jsonb)
  from public.seatai_members m join public.seatai_schools s on s.id=m.school_id
  where m.user_id=(select seatai_private.actor()) and m.active and (m.expires_at is null or m.expires_at>now())
$$;
create function seatai_private.workspace(p_school uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; begin
  if not seatai_private.has_role(p_school,p_role) then raise exception 'forbidden' using errcode='42501'; end if;
  with visible_classes as (
    select c.* from public.seatai_classes c where c.school_id=p_school and (p_role='principal' or seatai_private.can_class(c.id,p_role))
  ), visible_referrals as (
    select r.* from public.seatai_referrals r where r.school_id=p_school and p_role<>'principal' and seatai_private.can_referral(r.id,p_role)
  ), counted_referrals as (
    select r.* from public.seatai_referrals r where r.school_id=p_school and (p_role='principal' or seatai_private.can_referral(r.id,p_role))
  ) select jsonb_build_object(
    'school',(select jsonb_build_object('id',id,'name',name,'notice',notice) from public.seatai_schools where id=p_school),
    'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'updatedAt',c.updated_at,
      'studentCount',(select count(*) from public.seatai_students where class_id=c.id),
      'students',case when p_role='principal' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'localRef',local_ref) order by name) from public.seatai_students where class_id=c.id),'[]'::jsonb) end,
      'snapshot',case when p_role='principal' then null else c.snapshot end) order by c.name) from visible_classes c),'[]'::jsonb),
    'referrals',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'classId',r.class_id,'studentId',r.student_id,'studentName',s.name,'title',r.title,'detail',r.detail,'status',r.status,'createdAt',r.created_at) order by r.created_at desc) from visible_referrals r join public.seatai_students s on s.id=r.student_id),'[]'::jsonb),
    'recommendations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'referralId',referral_id,'body',body,'goal',goal,'reviewDate',review_date,'createdAt',created_at) order by created_at desc) from public.seatai_recommendations where referral_id in (select id from visible_referrals)),'[]'::jsonb),
    'outcomes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'referralId',referral_id,'body',body,'createdAt',created_at) order by created_at desc) from public.seatai_outcomes where referral_id in (select id from visible_referrals)),'[]'::jsonb),
    'privateNotes',case when p_role='counselor' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'referralId',referral_id,'body',body,'createdAt',created_at) order by created_at desc) from public.seatai_private_notes where referral_id in (select id from visible_referrals)),'[]'::jsonb) else '[]'::jsonb end,
    'members',case when p_role='principal' then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'displayName',m.display_name,'role',m.role,'active',m.active,'expiresAt',m.expires_at,
      'classIds',coalesce((select jsonb_agg(class_id) from public.seatai_assignments where member_id=m.id),'[]'::jsonb)) order by m.display_name) from public.seatai_members m where m.school_id=p_school),'[]'::jsonb) else '[]'::jsonb end,
    'audit',case when p_role='principal' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'action',action,'createdAt',created_at)) from (select * from public.seatai_audit where school_id=p_school order by created_at desc limit 30) a),'[]'::jsonb) else '[]'::jsonb end,
    'summary',jsonb_build_object('classes',(select count(*) from visible_classes),'students',(select count(*) from public.seatai_students where class_id in (select id from visible_classes)),
      'newCases',(select count(*) from counted_referrals where status='new'),'activeCases',(select count(*) from counted_referrals where status='in_progress'),
      'resolvedCases',(select count(*) from counted_referrals where status='resolved'),
      'followUps',(select count(distinct referral_id) from public.seatai_recommendations where review_date<=current_date and referral_id in (select id from counted_referrals where status<>'resolved')))
  ) into result;
  return result;
end $$;

create function seatai_private.command(p_school uuid,p_role text,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=seatai_private.actor(); cid uuid; rid uuid; mid uuid; sid uuid; target uuid; item jsonb; ref public.seatai_referrals%rowtype; expiration timestamptz; roster jsonb; snap jsonb; begin
  if u is null then raise exception 'forbidden' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>90000 then raise exception 'invalid_request' using errcode='22023'; end if;
  if p_action='create_school' then
    if p_role<>'principal' or p_school is not null or p_payload->>'noticeAcknowledged' is distinct from 'true' then raise exception 'forbidden' using errcode='42501'; end if;
    insert into public.seatai_schools(name,notice,created_by) values(trim(p_payload->>'name'),trim(p_payload->>'notice'),u) returning id into sid;
    insert into public.seatai_members(school_id,user_id,role,display_name) values(sid,u,'principal',trim(p_payload->>'displayName'));
    insert into public.seatai_members(school_id,user_id,role,display_name) values(sid,u,'teacher',trim(p_payload->>'displayName'));
    insert into public.seatai_audit(school_id,actor_id,action) values(sid,u,p_action);
    return jsonb_build_object('schoolId',sid);
  end if;
  if not seatai_private.has_role(p_school,p_role) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_action='publish_class' then
    if p_role<>'teacher' then raise exception 'forbidden' using errcode='42501'; end if;
    roster:=p_payload->'students'; snap:=p_payload->'snapshot';
    if jsonb_typeof(roster) is distinct from 'array' or jsonb_array_length(roster) not between 1 and 60
      or jsonb_typeof(snap) is distinct from 'object' or jsonb_typeof(snap->'positions') is distinct from 'array'
      or snap->>'rows' is null or snap->>'cols' is null or (snap->>'rows')::int not between 1 and 60 or (snap->>'cols')::int not between 1 and 60
      or jsonb_array_length(snap->'positions')>60 then raise exception 'invalid_request' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(roster) s where jsonb_typeof(s)<>'object' or length(trim(s->>'name')) not between 1 and 100 or length(s->>'localRef') not between 1 and 128 or s->>'name' is null or s->>'localRef' is null)
      or (select count(distinct s->>'localRef') from jsonb_array_elements(roster) s)<>jsonb_array_length(roster) then raise exception 'invalid_request' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(snap->'positions') pos where
      pos->>'localRef' is null or pos->>'row' is null or pos->>'col' is null or
      not exists(select 1 from jsonb_array_elements(roster) s where s->>'localRef'=pos->>'localRef') or
      (pos->>'row')::int not between 0 and (snap->>'rows')::int-1 or (pos->>'col')::int not between 0 and (snap->>'cols')::int-1)
      or (select count(distinct pos->>'localRef') from jsonb_array_elements(snap->'positions') pos)<>jsonb_array_length(snap->'positions')
      or (select count(distinct (pos->>'row',pos->>'col')) from jsonb_array_elements(snap->'positions') pos)<>jsonb_array_length(snap->'positions') then raise exception 'invalid_request' using errcode='22023'; end if;
    -- Rebuild from a whitelist: scores, notes, photos and survey answers cannot enter this snapshot.
    select jsonb_build_object('rows',(snap->>'rows')::int,'cols',(snap->>'cols')::int,'positions',coalesce(jsonb_agg(jsonb_build_object('localRef',pos->>'localRef','row',(pos->>'row')::int,'col',(pos->>'col')::int)),'[]'::jsonb)) into snap from jsonb_array_elements(snap->'positions') pos;
    cid:=nullif(p_payload->>'classId','')::uuid;
    if cid is null then
      insert into public.seatai_classes(school_id,name,snapshot,created_by) values(p_school,trim(p_payload->>'name'),snap,u) returning id into cid;
      select id into mid from public.seatai_members where school_id=p_school and user_id=u and role='teacher';
      insert into public.seatai_assignments(school_id,class_id,member_id) values(p_school,cid,mid);
    else
      if not exists(select 1 from public.seatai_classes where id=cid and school_id=p_school) or not seatai_private.can_class(cid,'teacher') then raise exception 'forbidden' using errcode='42501'; end if;
      perform 1 from public.seatai_classes where id=cid for update;
      -- Existing referral histories survive roster edits. Removing a referred pupil needs an explicit future archive flow.
      if exists(select 1 from public.seatai_students s join public.seatai_referrals r on r.student_id=s.id where s.class_id=cid and not exists(select 1 from jsonb_array_elements(roster) j where j->>'localRef'=s.local_ref)) then raise exception 'invalid_request' using errcode='22023'; end if;
      update public.seatai_classes set name=trim(p_payload->>'name'),snapshot=snap,updated_at=now() where id=cid;
      delete from public.seatai_students s where s.class_id=cid and not exists(select 1 from jsonb_array_elements(roster) j where j->>'localRef'=s.local_ref);
    end if;
    for item in select * from jsonb_array_elements(roster) loop
      insert into public.seatai_students(school_id,class_id,local_ref,name) values(p_school,cid,item->>'localRef',trim(item->>'name'))
        on conflict(class_id,local_ref) do update set name=excluded.name;
    end loop;
  elsif p_action='create_referral' then
    cid:=(p_payload->>'classId')::uuid; sid:=(p_payload->>'studentId')::uuid;
    if p_role<>'teacher' or not seatai_private.can_class(cid,'teacher') or not exists(select 1 from public.seatai_students where id=sid and class_id=cid and school_id=p_school) then raise exception 'forbidden' using errcode='42501'; end if;
    insert into public.seatai_referrals(school_id,class_id,student_id,teacher_id,title,detail) values(p_school,cid,sid,u,trim(p_payload->>'title'),trim(p_payload->>'detail')) returning id into rid;
  elsif p_action in ('recommend','private_note','outcome','set_status') then
    rid:=(p_payload->>'referralId')::uuid;
    select * into ref from public.seatai_referrals where id=rid and school_id=p_school for update;
    if ref.id is null or not seatai_private.can_referral(rid,p_role) then raise exception 'forbidden' using errcode='42501'; end if;
    if p_action='outcome' then
      if p_role<>'teacher' then raise exception 'forbidden' using errcode='42501'; end if;
      insert into public.seatai_outcomes(school_id,referral_id,author_id,body) values(p_school,rid,u,trim(p_payload->>'body'));
    elsif p_action='private_note' then
      if p_role<>'counselor' then raise exception 'forbidden' using errcode='42501'; end if;
      insert into public.seatai_private_notes(school_id,referral_id,author_id,body) values(p_school,rid,u,trim(p_payload->>'body'));
    elsif p_action='recommend' then
      if p_role<>'counselor' or (p_payload->>'reviewDate')::date<current_date then raise exception 'forbidden' using errcode='42501'; end if;
      insert into public.seatai_recommendations(school_id,referral_id,author_id,body,goal,review_date) values(p_school,rid,u,trim(p_payload->>'body'),trim(p_payload->>'goal'),(p_payload->>'reviewDate')::date);
      update public.seatai_referrals set status='in_progress' where id=rid;
    else
      if p_role<>'counselor' then raise exception 'forbidden' using errcode='42501'; end if;
      update public.seatai_referrals set status=p_payload->>'status' where id=rid;
    end if;
  elsif p_action='grant_member' then
    if p_role<>'principal' or p_payload->>'role' not in ('teacher','counselor','principal') then raise exception 'forbidden' using errcode='42501'; end if;
    select id into target from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
    if target=u and p_payload->>'role'='counselor' then raise exception 'forbidden' using errcode='42501'; end if;
    if target is null then raise exception 'account_not_ready' using errcode='P0001'; end if;
    expiration:=nullif(p_payload->>'expiresAt','')::timestamptz;
    if expiration<=now() or jsonb_typeof(p_payload->'classIds') is distinct from 'array' then raise exception 'invalid_request' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements_text(p_payload->'classIds') selected(class_id) where not exists(select 1 from public.seatai_classes c where c.id=selected.class_id::uuid and c.school_id=p_school)) then raise exception 'forbidden' using errcode='42501'; end if;
    -- School-scoped advisory lock prevents racing the last-principal invariant.
    perform pg_advisory_xact_lock(hashtext(p_school::text));
    insert into public.seatai_members(school_id,user_id,role,display_name,expires_at) values(p_school,target,p_payload->>'role',trim(p_payload->>'displayName'),expiration)
      on conflict(school_id,user_id,role) do update set display_name=excluded.display_name,expires_at=excluded.expires_at,active=true returning id into mid;
    if target=u and p_payload->>'role'='principal' and expiration is not null then raise exception 'invalid_request' using errcode='22023'; end if;
    delete from public.seatai_assignments where member_id=mid;
    insert into public.seatai_assignments(school_id,class_id,member_id) select distinct p_school,selected.class_id::uuid,mid from jsonb_array_elements_text(p_payload->'classIds') selected(class_id);
  elsif p_action='revoke_member' then
    if p_role<>'principal' then raise exception 'forbidden' using errcode='42501'; end if;
    perform pg_advisory_xact_lock(hashtext(p_school::text));
    mid:=(p_payload->>'memberId')::uuid;
    if not exists(select 1 from public.seatai_members where id=mid and school_id=p_school) then raise exception 'forbidden' using errcode='42501'; end if;
    if exists(select 1 from public.seatai_members where id=mid and role='principal') and
      not exists(select 1 from public.seatai_members where school_id=p_school and role='principal' and active and id<>mid and expires_at is null) then raise exception 'invalid_request' using errcode='22023'; end if;
    update public.seatai_members set active=false where id=mid and school_id=p_school;
  else raise exception 'invalid_request' using errcode='22023';
  end if;
  insert into public.seatai_audit(school_id,actor_id,action) values(p_school,u,p_action);
  return jsonb_build_object('ok',true);
end $$;

-- Public wrappers cannot bypass RLS themselves. Definer implementations above
-- enforce identity and scope before building a response or touching a row.
create function public.seatai_bootstrap() returns jsonb language sql stable security invoker set search_path='' as $$ select seatai_private.bootstrap() $$;
create function public.seatai_workspace(p_school uuid,p_role text) returns jsonb language sql stable security invoker set search_path='' as $$ select seatai_private.workspace(p_school,p_role) $$;
create function public.seatai_command(p_school uuid,p_role text,p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select seatai_private.command(p_school,p_role,p_action,p_payload) $$;
revoke all on all functions in schema seatai_private from public,anon;
grant execute on all functions in schema seatai_private to authenticated;
revoke all on function public.seatai_bootstrap(),public.seatai_workspace(uuid,text),public.seatai_command(uuid,text,text,jsonb) from public,anon;
grant execute on function public.seatai_bootstrap(),public.seatai_workspace(uuid,text),public.seatai_command(uuid,text,text,jsonb) to authenticated;
commit;
