-- Enable required extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Grant usage (if needed for specific roles, usually postgres has it)
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule the job to run every hour (Minute 0)
-- NOTE: Replace [SERVICE_ROLE_KEY] with your actual Supabase Service Role Key (found in Project Settings > API)
select cron.schedule(
  'process-automation-hourly',
  '0 * * * *', 
  $$
  select
    net.http_post(
        url:='https://fhfamquilobeoibqfhwh.supabase.co/functions/v1/process-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
    ) as request_id;
  $$
);

-- To verify:
-- select * from cron.job;
