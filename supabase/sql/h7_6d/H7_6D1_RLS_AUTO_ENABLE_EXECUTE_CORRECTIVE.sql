-- Kitchen H7.6D.1 — narrow privilege corrective for the existing event-trigger function.
-- REVIEW + BACKUP FIRST. Execute once in Supabase Dashboard SQL Editor only when approved.
-- Does not modify users, memberships, policies, data, event-trigger binding or function body.
-- Pairs with H7_6D1_PREFLIGHT_READONLY.sql and H7_6D1_POSTCHECK_READONLY.sql.
BEGIN;

DO $guard$
DECLARE
  v_proc pg_catalog.oid := pg_catalog.to_regprocedure('public.rls_auto_enable()');
BEGIN
  IF v_proc IS NULL THEN
    RAISE EXCEPTION 'H7.6D1: rls_auto_enable() absent; stop.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = v_proc
      AND p.prorettype = 'pg_catalog.event_trigger'::pg_catalog.regtype
      AND p.prosecdef
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
  ) THEN
    RAISE EXCEPTION 'H7.6D1: unexpected function identity/security; stop.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_event_trigger e
    WHERE e.evtfoid = v_proc AND e.evtname = 'ensure_rls'
      AND e.evtevent = 'ddl_command_end' AND e.evtenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'H7.6D1: expected ensure_rls event trigger missing or disabled; stop.';
  END IF;
END $guard$;

-- The event trigger runs as postgres, its owner. The client/API roles do not
-- need EXECUTE on this SECURITY DEFINER event-trigger helper.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;

DO $post$
BEGIN
  IF pg_catalog.has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE')
    OR pg_catalog.has_function_privilege('service_role', 'public.rls_auto_enable()', 'EXECUTE') THEN
    RAISE EXCEPTION 'H7.6D1: EXECUTE exposure remains; rollback.';
  END IF;
END $post$;

COMMIT;
