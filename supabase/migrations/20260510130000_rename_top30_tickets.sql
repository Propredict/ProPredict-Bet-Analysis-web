UPDATE public.ai_tickets
SET title = REPLACE(REPLACE(REPLACE(title,
    'Top-30 Premium Ticket', 'Smart Premium Ticket'),
    'Top-30 Pro Ticket',     'Smart Pro Ticket'),
    'Top-30 Daily Ticket',   'Smart Daily Ticket')
WHERE title ILIKE '%Top-30%';
