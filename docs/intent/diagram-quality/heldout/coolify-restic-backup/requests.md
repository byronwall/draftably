# Follow-up requests

Source: `~/Projects/coolify-backup-scripts` (`coolify-restic-backup.sh` `main()`: `load_env`,
`install_restic_if_needed`, `write_inventory`, `init_repo_if_needed`, `run_backup`, `prune_repo`,
`check_repo`; the systemd timer from `install-on-server.sh`).

Kind / layout / color strategy / theme: ops runbook with two decisions and a nightly loop, flow
right with a cycle, accent (`primary` on the timer, backup and done) / midnight.

e1 (relabel): "Label the arrows with what each step hands on."

- Labels added to five edges and one lengthened (`yes` → `yes, on PATH`).
- expects: still * (the product decision for round 3: a relabel holds the layout unless a label
  no longer fits at all).
