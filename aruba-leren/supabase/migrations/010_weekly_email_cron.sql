-- Migration 010: Weekly progress email cron schedule
--
-- PREREQUISITES (must be done before running this migration):
--   1. Enable pg_cron extension:
--      Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
--   2. Enable pg_net extension:
--      Supabase Dashboard → Database → Extensions → search "pg_net" → Enable
--   3. Deploy the Edge Function:
--      supabase functions deploy weekly-progress-report
--   4. Set the Resend API key as an Edge Function secret:
--      supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE
--
-- TESTING (before enabling the cron):
--   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/weekly-progress-report \
--     -H "Authorization: Bearer YOUR_ANON_KEY"
--   Then check Resend dashboard (resend.com) for sent emails.
--   For development testing: use onboarding@resend.dev as from address (no domain verification needed)
--
-- SCHEDULE: Every Sunday at 11:00 UTC = 7:00 AM Aruba time (AST = UTC-4)
-- Cron expression: '0 11 * * 0' (minute=0, hour=11, any day, any month, Sunday=0)
--
-- VERIFY cron was created:
--   SELECT * FROM cron.job;
--
-- REMOVE the cron if needed:
--   SELECT cron.unschedule('weekly-progress-report');

SELECT cron.schedule(
  'weekly-progress-report',
  '0 11 * * 0',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-progress-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
      ),
      body := '{"trigger": "cron"}'::jsonb
    );
  $$
);

-- NOTE: If current_setting('app.settings.supabase_url') does not work in your project,
-- replace it with your hardcoded Supabase project URL:
--   url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/weekly-progress-report',
--
-- Alternative: use Vault secrets if configured:
--   url := vault.decrypted_secrets.decrypted_secret WHERE name = 'supabase_url'
