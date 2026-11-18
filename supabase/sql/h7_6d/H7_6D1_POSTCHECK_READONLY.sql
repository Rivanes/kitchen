-- Kitchen H7.6D.1 — LIVE READ ONLY: run after the corrective.
SELECT
  pg_catalog.to_regprocedure('public.rls_auto_enable()') IS NOT NULL AS function_preserved,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = pg_catalog.to_regprocedure('public.rls_auto_enable()')
      AND p.prosecdef
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
  ) AS definer_preserved,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_event_trigger e
    WHERE e.evtfoid = pg_catalog.to_regprocedure('public.rls_auto_enable()')
      AND e.evtname = 'ensure_rls' AND e.evtevent = 'ddl_command_end'
      AND e.evtenabled = 'O'
  ) AS enabled_event_trigger_preserved,
  NOT pg_catalog.has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') AS anon_denied,
  NOT pg_catalog.has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') AS authenticated_denied,
  NOT pg_catalog.has_function_privilege('service_role', 'public.rls_auto_enable()', 'EXECUTE') AS service_denied;
