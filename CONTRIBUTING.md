# Contributing

The application and infrastructure are a demo, with no production support
commitment. Small fixes with a reproducible problem statement are welcome.

## Local checks

Use Node.js 22, npm, Python 3, Bash, and Make:

```bash
cd app
npm ci
cd ..
make check
```

These checks do not require AWS credentials or a running search cluster. To run
the UI, copy `app/.env.example` to `app/.env.local`, configure a development search
endpoint, and run `npm run dev` from `app`.

Describe any search-cluster or cloud testing separately in the PR, including the
backend/version and cleanup performed. Do not run load tests against a cluster
you do not control. `make apply`, `make build`, and `make deploy` are deployment
operations, not contributor checks.

## Infrastructure changes

Use your own state bucket and lock table as described in the root README.
Inspect `make plan` before applying. Keep credentials, state, `.env.local`, and
personal backend configuration out of commits. `make clean` preserves state;
use `make destroy` to explicitly tear down deployed resources.

## Pull requests

Explain the concrete problem, resulting behavior, and checks performed. Include
screenshots for visible UI changes and a regression test for behavioral fixes.
Retain the existing license and attribution.
