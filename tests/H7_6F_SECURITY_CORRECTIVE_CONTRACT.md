# H7.6F — MembershipGate resume safety + independent QA JWTs

- One root `MembershipGate` remains the only client membership authority.
- On `blur` or `visibilitychange: hidden`, cache UI is immediately hidden.
- On focus / visible / `pageshow` / online, `kitchen_my_access` must complete
  with an active member before that view is shown again.
- A check that started before a background event cannot unhide the UI afterward.
- If browser resume events are lost, visible documents revalidate every 30 seconds.
- Network/error/denied/suspended fail closed and the private component tree unmounts.
- Concurrent focus events coalesce; a queued read must finish before unhide.
- On account switch/unmount, listeners and timer are removed.
- GitHub routine QA validates async lifecycle behavior without any credentials.
- Real independent JWT A/B negative testing is a **separate manual-only** Action:
  `.github/workflows/h7-6f-live-jwt-qa.yml`.
- Runner allows only approved QA UUIDs (A/B). No service-role key, SQL migration
  or admin update. QA-owned rooms/tasks/one tiny Storage file are cleaned up.
- Never mark the LIVE JWT test PASS based only on the static/source test.
- SQL scripts are excluded from `REPO` and `UPDATED_FILES` without exception.
