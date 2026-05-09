update public.tickets
set title = replace(title, 'Elite Top Picks Combo', 'Top Picks Combo'),
    ai_analysis = replace(ai_analysis, 'Elite Top Picks Combo', 'Top Picks Combo')
where category = 'ai_premium' and title ilike '%Elite Top Picks%';
