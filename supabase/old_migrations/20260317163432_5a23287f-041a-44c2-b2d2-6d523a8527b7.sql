select
cron.schedule(
  'whatsapp-health-check',
  '*/5 * * * *',
  $$
  select
    net.http_post(
        url:='https://cxyfwikrjtovvyvcyacl.supabase.co/functions/v1/zapi-health-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eWZ3aWtyanRvdnZ5dmN5YWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzc2MzYsImV4cCI6MjA4ODcxMzYzNn0.B4JNUOSuxHaMLP45mF780hyuQEzuHge7AMkyT_fBGHE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);