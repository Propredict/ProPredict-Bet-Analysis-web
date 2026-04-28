-- ============================================================
-- World Cup 2026 — Champion Prediction System
-- 1 vote per user, locks at deadline, winners get 30d Premium
-- ============================================================

create table if not exists public.wc_champion_settings (
  id uuid primary key default gen_random_uuid(),
  voting_deadline timestamptz not null default '2026-06-23 23:59:59+00'::timestamptz,
  status text not null default 'open' check (status in ('open','closed','resolved')),
  winner_team text,
  finalist_team text,
  third_place_team text,
  fourth_place_team text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wc_champion_settings (status)
select 'open'
where not exists (select 1 from public.wc_champion_settings);

alter table public.wc_champion_settings enable row level security;

drop policy if exists "Public read champion settings" on public.wc_champion_settings;
create policy "Public read champion settings"
  on public.wc_champion_settings for select
  to anon, authenticated using (true);

drop policy if exists "Admin manage champion settings" on public.wc_champion_settings;
create policy "Admin manage champion settings"
  on public.wc_champion_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create table if not exists public.wc_champion_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  team_name text not null,
  team_code text,
  team_flag text,
  is_correct boolean,
  reward_granted boolean not null default false,
  reward_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wc_champion_predictions_user_unique unique (user_id)
);

create index if not exists wc_champion_predictions_team_idx
  on public.wc_champion_predictions(team_name);

alter table public.wc_champion_predictions enable row level security;

drop policy if exists "Users read own champion prediction" on public.wc_champion_predictions;
create policy "Users read own champion prediction"
  on public.wc_champion_predictions for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Admin read all champion predictions" on public.wc_champion_predictions;
create policy "Admin read all champion predictions"
  on public.wc_champion_predictions for select
  to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.cast_champion_vote(
  p_team_name text,
  p_team_code text default null,
  p_team_flag text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings record;
  v_existing record;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  if p_team_name is null or length(trim(p_team_name)) = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_team');
  end if;
  select * into v_settings from public.wc_champion_settings limit 1;
  if v_settings.status <> 'open' then
    return jsonb_build_object('success', false, 'error', 'voting_closed');
  end if;
  if now() > v_settings.voting_deadline then
    return jsonb_build_object('success', false, 'error', 'deadline_passed');
  end if;
  select * into v_existing from public.wc_champion_predictions where user_id = v_user_id;
  if found then
    update public.wc_champion_predictions
      set team_name = p_team_name, team_code = p_team_code, team_flag = p_team_flag, updated_at = now()
      where user_id = v_user_id;
    return jsonb_build_object('success', true, 'updated', true, 'team', p_team_name);
  end if;
  insert into public.wc_champion_predictions (user_id, team_name, team_code, team_flag)
    values (v_user_id, p_team_name, p_team_code, p_team_flag);
  return jsonb_build_object('success', true, 'updated', false, 'team', p_team_name);
end;
$$;

create or replace function public.get_champion_leaderboard()
returns table(team_name text, team_code text, team_flag text, votes bigint, percentage numeric)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (select count(*)::numeric as total from public.wc_champion_predictions)
  select
    p.team_name,
    max(p.team_code) as team_code,
    max(p.team_flag) as team_flag,
    count(*)::bigint as votes,
    case when (select total from totals) = 0 then 0
      else round((count(*)::numeric / (select total from totals)) * 100, 1)
    end as percentage
  from public.wc_champion_predictions p
  group by p.team_name
  order by votes desc, p.team_name asc;
$$;

create or replace function public.get_my_champion_prediction()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pick record;
  v_settings record;
begin
  select * into v_settings from public.wc_champion_settings limit 1;
  if v_user_id is null then
    return jsonb_build_object(
      'has_vote', false,
      'deadline', v_settings.voting_deadline,
      'status', v_settings.status,
      'winner_team', v_settings.winner_team
    );
  end if;
  select * into v_pick from public.wc_champion_predictions where user_id = v_user_id;
  return jsonb_build_object(
    'has_vote', found,
    'team_name', v_pick.team_name,
    'team_code', v_pick.team_code,
    'team_flag', v_pick.team_flag,
    'is_correct', v_pick.is_correct,
    'reward_granted', v_pick.reward_granted,
    'reward_tier', v_pick.reward_tier,
    'deadline', v_settings.voting_deadline,
    'status', v_settings.status,
    'winner_team', v_settings.winner_team
  );
end;
$$;

create or replace function public.resolve_champion_predictions(
  p_winner text,
  p_finalist text default null,
  p_third text default null,
  p_fourth text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_champion_winners int := 0;
  v_finalist_winners int := 0;
  v_top4_winners int := 0;
  r record;
begin
  if not public.has_role(v_user_id, 'admin'::app_role) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;
  if p_winner is null then
    return jsonb_build_object('success', false, 'error', 'winner_required');
  end if;
  update public.wc_champion_settings
    set status = 'resolved', winner_team = p_winner, finalist_team = p_finalist,
        third_place_team = p_third, fourth_place_team = p_fourth,
        resolved_at = now(), updated_at = now();
  update public.wc_champion_predictions
    set is_correct = (team_name = p_winner),
        reward_tier = case
          when team_name = p_winner then 'champion'
          when team_name = p_finalist then 'finalist'
          when team_name in (p_third, p_fourth) then 'top4'
          else null
        end,
        updated_at = now();
  for r in
    select user_id from public.wc_champion_predictions
    where reward_tier = 'champion' and reward_granted = false
  loop
    insert into public.user_subscriptions (user_id, plan, status, expires_at, subscription_source)
    values (r.user_id, 'premium', 'active', now() + interval '30 days', 'wc_champion_reward')
    on conflict (user_id) do update set
      plan = 'premium',
      status = 'active',
      expires_at = greatest(coalesce(user_subscriptions.expires_at, now()), now()) + interval '30 days',
      subscription_source = 'wc_champion_reward',
      updated_at = now();
    update public.wc_champion_predictions set reward_granted = true where user_id = r.user_id;
    v_champion_winners := v_champion_winners + 1;
  end loop;
  insert into public.arena_notifications (user_id, title, message, type)
  select
    p.user_id,
    case
      when p.team_name = p_winner then '🏆 You predicted the WC Champion!'
      when p.team_name = p_finalist then '🥈 You predicted the Finalist!'
      when p.team_name in (p_third, p_fourth) then '🥉 Top 4 prediction!'
      else 'World Cup 2026 — Final Result'
    end,
    case
      when p.team_name = p_winner then format('Congrats! %s won the World Cup. You earned 1 month FREE Premium!', p_winner)
      else format('The champion is %s. Your pick was %s. Better luck next time!', p_winner, p.team_name)
    end,
    'wc_champion'
  from public.wc_champion_predictions p;
  select count(*) into v_finalist_winners from public.wc_champion_predictions where reward_tier = 'finalist';
  select count(*) into v_top4_winners from public.wc_champion_predictions where reward_tier = 'top4';
  return jsonb_build_object(
    'success', true, 'winner', p_winner,
    'champion_winners', v_champion_winners,
    'finalist_winners', v_finalist_winners,
    'top4_winners', v_top4_winners
  );
end;
$$;

drop trigger if exists wc_champion_settings_updated_at on public.wc_champion_settings;
create trigger wc_champion_settings_updated_at
  before update on public.wc_champion_settings
  for each row execute function public.handle_updated_at();

drop trigger if exists wc_champion_predictions_updated_at on public.wc_champion_predictions;
create trigger wc_champion_predictions_updated_at
  before update on public.wc_champion_predictions
  for each row execute function public.handle_updated_at();
