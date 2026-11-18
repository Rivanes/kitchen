-- Kitchen H7.6D.1 — LIVE READ ONLY: run before the corrective.
SELECT p.oid::pg_catalog.regprocedure::text AS function_name,
       pg_catalog.pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       p.proconfig AS function_config,
       e.evtname AS event_trigger,
       e.evtenabled AS trigger_enabled,
       e.evtevent AS trigger_event,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_catalog.pg_event_trigger e ON e.evtfoid = p.oid
WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable';
