create extension if not exists pg_cron;

-- Recreate named jobs idempotently.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname in ('orvix-commerce-worker', 'orvix-commerce-housekeeping')
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'orvix-commerce-worker',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://orvix-websits.vercel.app/api/internal/jobs/process',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-orvix-worker-token', coalesce(
            (select webhook_token from public.admin_push_config where id = 'default'),
            'missing-worker-token'
          )
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
    $job$
  );

  perform cron.schedule(
    'orvix-commerce-housekeeping',
    '*/5 * * * *',
    $job$
      select public.orvix_commerce_housekeeping();
    $job$
  );
end;
$$;
