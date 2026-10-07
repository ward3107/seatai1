-- Publish an explicitly reviewed class report; never upload individual profiles.
begin;
alter table public.seatai_classes add column optimization jsonb;

create function seatai_private.clean_optimization(p_report jsonb, p_roster jsonb, p_snapshot jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare k text; v numeric; objectives jsonb:='{}'; score numeric:=0; n int:=jsonb_array_length(p_roster); seated int:=jsonb_array_length(p_snapshot->'positions'); begin
  if p_report is null or p_report='null'::jsonb then return null; end if;
  if jsonb_typeof(p_report)<>'object' or p_report->>'version' is distinct from '1'
    or jsonb_typeof(p_report->'objectives') is distinct from 'object'
    or coalesce(p_report->>'layoutType','') not in ('rows','clusters','u-shape','circle','custom-rows')
    or coalesce(p_report->>'strategy','') not in ('mixed','similar','peer_support','exam')
    or p_report->>'generatedAt' is null then raise exception 'invalid_request' using errcode='22023'; end if;
  perform (p_report->>'generatedAt')::timestamptz;
  foreach k in array array['academic_balance','behavioral_balance','diversity','special_needs'] loop
    if jsonb_typeof(p_report->'objectives'->k) is distinct from 'number' then raise exception 'invalid_request' using errcode='22023'; end if;
    v:=(p_report->'objectives'->>k)::numeric;
    if v<0 or v>100 then raise exception 'invalid_request' using errcode='22023'; end if;
    objectives:=objectives||jsonb_build_object(k,v); score:=score+v;
  end loop;
  foreach k in array array['needsAttention','requiredAttention','generations','durationMs'] loop
    if jsonb_typeof(p_report->k) is distinct from 'number' then raise exception 'invalid_request' using errcode='22023'; end if;
    v:=(p_report->>k)::numeric;
    if v<0 or v<>trunc(v) or v>100000000 then raise exception 'invalid_request' using errcode='22023'; end if;
  end loop;
  if (p_report->>'needsAttention')::int>n or (p_report->>'requiredAttention')::int>(p_report->>'needsAttention')::int then raise exception 'invalid_request' using errcode='22023'; end if;
  return jsonb_build_object('version',1,'generatedAt',(p_report->>'generatedAt')::timestamptz,
    'score',round(score/4,1),'objectives',objectives,'seated',seated,'missing',n-seated,
    'needsAttention',(p_report->>'needsAttention')::int,'requiredAttention',(p_report->>'requiredAttention')::int,
    'generations',(p_report->>'generations')::int,'durationMs',(p_report->>'durationMs')::int,
    'layoutType',p_report->>'layoutType','strategy',p_report->>'strategy');
end $$;
revoke all on function seatai_private.clean_optimization(jsonb,jsonb,jsonb) from public,anon,authenticated;

-- Preserve the reviewed authorization implementation while changing only these
-- contracts. Fail closed if the predecessor differs from the expected version.
do $migration$
declare definition text; previous text; begin
  definition:=replace(pg_get_functiondef('seatai_private.command(uuid,text,text,jsonb)'::regprocedure),chr(13),'');
  previous:=definition;
  definition:=replace(definition, $old$insert into public.seatai_members(school_id,user_id,role,display_name) values(sid,u,'teacher',trim(p_payload->>'displayName'));$old$, 'null; /* A creator receives workspace administration only. */');
  if definition=previous then raise exception 'Unexpected create_school implementation'; end if;
  previous:=definition;
  definition:=regexp_replace(definition, $old$if p_role<>'teacher' then raise exception 'forbidden' using errcode='42501'; end if;\s+roster:=$old$, $new$if p_role not in ('teacher','principal') then raise exception 'forbidden' using errcode='42501'; end if;
    roster:=$new$);
  if definition=previous then raise exception 'Unexpected publish_class implementation'; end if;
  previous:=definition;
  definition:=regexp_replace(definition, $old$select id into mid from public[.]seatai_members where school_id=p_school and user_id=u and role='teacher';\s+insert into public[.]seatai_assignments\(school_id,class_id,member_id\) values\(p_school,cid,mid\);$old$, $new$if p_role='teacher' then
        select id into mid from public.seatai_members where school_id=p_school and user_id=u and role='teacher';
        insert into public.seatai_assignments(school_id,class_id,member_id) values(p_school,cid,mid);
      end if;$new$);
  if definition=previous then raise exception 'Unexpected class assignment implementation'; end if;
  definition:=replace(definition, $old$or not seatai_private.can_class(cid,'teacher') then$old$, $new$or (p_role<>'principal' and not seatai_private.can_class(cid,'teacher')) then$new$);
  -- Coordinates are optional for old row-based snapshots; both are validated together.
  definition:=replace(definition, $old$-- Rebuild from a whitelist:$old$, $new$if exists(select 1 from jsonb_array_elements(snap->'positions') pos where
      (pos ? 'x' or pos ? 'y') and (jsonb_typeof(pos->'x') is distinct from 'number' or jsonb_typeof(pos->'y') is distinct from 'number' or (pos->>'x')::numeric not between 0 and 1 or (pos->>'y')::numeric not between 0 and 1)) then raise exception 'invalid_request' using errcode='22023'; end if;
    -- Rebuild from a whitelist:$new$);
  definition:=replace(definition, $old$jsonb_build_object('localRef',pos->>'localRef','row',(pos->>'row')::int,'col',(pos->>'col')::int)$old$, $new$(jsonb_build_object('localRef',pos->>'localRef','row',(pos->>'row')::int,'col',(pos->>'col')::int) || case when pos ? 'x' and pos ? 'y' then jsonb_build_object('x',(pos->>'x')::numeric,'y',(pos->>'y')::numeric) else '{}'::jsonb end)$new$);
  previous:=definition;
  definition:=replace(definition, $old$elsif p_action='create_referral' then$old$, $new$update public.seatai_classes set optimization=seatai_private.clean_optimization(p_payload->'optimization',roster,snap) where id=cid;
  elsif p_action='create_referral' then$new$);
  if definition=previous then raise exception 'Report persistence was not installed'; end if;
  execute definition;

  definition:=replace(pg_get_functiondef('seatai_private.workspace(uuid,text)'::regprocedure),chr(13),'');
  previous:=definition;
  definition:=replace(definition, $old$'students',case when p_role='principal' then '[]'::jsonb else coalesce($old$, $new$'students',coalesce($new$);
  definition:=replace(definition, $old$from public.seatai_students where class_id=c.id),'[]'::jsonb) end,$old$, $new$from public.seatai_students where class_id=c.id),'[]'::jsonb),$new$);
  definition:=replace(definition, $old$'snapshot',case when p_role='principal' then null else c.snapshot end$old$, $new$'snapshot',c.snapshot,'optimization',c.optimization$new$);
  if definition=previous then raise exception 'Unexpected workspace implementation'; end if;
  execute definition;

  definition:=replace(pg_get_functiondef('seatai_private.bootstrap()'::regprocedure),chr(13),'');
  definition:=replace(definition, $old$'displayName',m.display_name)$old$, $new$'displayName',m.display_name,'isOwner',s.created_by=(select auth.uid()))$new$);
  execute definition;
end $migration$;

-- Principals can read published rosters and seating, but not counseling records.
drop policy student_read on public.seatai_students;
create policy student_read on public.seatai_students for select to authenticated using (
  seatai_private.can_class(class_id,'teacher') or seatai_private.can_class(class_id,'counselor') or seatai_private.has_role(school_id,'principal'));
commit;
