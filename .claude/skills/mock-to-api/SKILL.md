---
name: mock-to-api
description: Audit mock-data.ts and generate a mapping of each export to its real football-data.org API endpoint
user-invocable: true
---

Read `src/lib/mock-data.ts`. For each exported constant or array, identify:
- The data shape
- The football-data.org API endpoint that provides this data
- Which components/routes consume it

Output a markdown table: Mock Export | API Endpoint | Consumers
