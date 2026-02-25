# ADR 006: Alert Event/Kube_event Fallback Strategy

**Date:** 2026-02-25
**Status:** Accepted

## Context

The `whatap_alerts` tool was returning empty results for all tested projects. Investigation revealed:

1. The `event` MXQL category exists but returns empty for projects without configured alert rules (common in demo/test environments)
2. Kubernetes projects have a separate `kube_event` category that contains cluster events (pod scheduling, warnings, errors)
3. Different project types may support different event categories

## Decision

Implement a dual-strategy fallback in the `whatap_alerts` tool:

1. First, try the `event` MXQL category (general alerts from WhaTap alert rules)
2. If empty, fall back to `kube_event` category (Kubernetes cluster events)
3. If both empty, return a "no data" message

```
event query (general alerts)
  ├── has results → return
  └── empty
      └── kube_event query (K8s events)
          ├── has results → return
          └── empty → "No alert or event data found"
```

## Consequences

- **Positive:** Alert tool returns useful data for Kubernetes projects even without configured alert rules
- **Positive:** General alert data is preferred when available (more relevant to alert monitoring)
- **Negative:** Two sequential API calls in the worst case (no alerts, no K8s events)
- **Negative:** Other project types (APM, DB) may have additional event categories not covered
- **Future:** Could add more fallback categories as they are discovered
