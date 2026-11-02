# Follow-up requests

e1 (grow): "Add the git activity overlay: it reads `git log` and is laid over the result tree before it's served."

- node activity "Git activity" in=services
- edge overlay activity -> result "overlay"; edge gitlog scan -> activity "HEAD + window" kind=async

e2 (place): "Put the cache right next to the job manager, and keep the browser bits at the left."

- `near cache jobs` is refused (not siblings), so the agent moves cache into services first:
  cache gets in=services; near cache jobs side=below; order root browser api services
- Finding: cross-group placement requests force a regroup. DSL gap.
