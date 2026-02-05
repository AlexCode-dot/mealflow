# Incident Playbook

Use this checklist when MealFlow has errors or outages in production.

## 1) Confirm Scope

- Check UptimeRobot monitor status:
  - `app-api-service-qkq2.onrender.com/actuator/health`
  - `identity-service-jq7p.onrender.com/healthz`
- Note which service is failing (or if both are affected).

## 2) Check Frontend Errors (Sentry)

- Open Sentry `react-native` project.
- Go to **Issues** and filter recent events.
- Capture:
  - error title
  - first/last seen
  - release/environment
  - stack trace

## 3) Correlate Backend Request

- From failed API response, copy `X-Request-Id`.
- Open Render logs for affected service.
- Search for `rid:<request-id>`.
- Identify:
  - failing endpoint
  - HTTP status
  - exception message

## 4) Immediate Mitigation

- If deploy regression: roll back to last known healthy deploy.
- If dependency outage: disable affected path/feature if possible.
- If bad env/config: correct Render env vars and redeploy.

## 5) Verify Recovery

- Health endpoints return `200`.
- Uptime monitor is green.
- Sentry new issue rate drops.
- Core user flows pass:
  - login
  - create/edit recipe
  - image upload
  - shopping list/weekly plan operations

## 6) Post-Incident Notes

- Record:
  - root cause
  - fix commit/deploy
  - time to detect and recover
  - prevention action item
