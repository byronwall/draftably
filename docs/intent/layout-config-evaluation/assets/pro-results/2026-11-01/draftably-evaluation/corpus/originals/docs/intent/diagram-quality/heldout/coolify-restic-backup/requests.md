# Follow-up requests

Source: `~/Projects/coolify-backup-scripts` (`coolify-restic-backup.sh` `main()`: `load_env`,
`install_restic_if_needed`, `write_inventory`, `init_repo_if_needed`, `run_backup`, `prune_repo`,
`check_repo`; the systemd timer from `install-on-server.sh`).

Kind / layout / color strategy / theme: ops runbook with two decisions and a nightly loop, flow
right with a cycle, accent (`primary` on the timer, backup and done) / blueprint.

e1 (relabel): "Label the arrows with what each step hands on."

- Labels added to five edges and one lengthened (`yes` → `yes, on PATH`).
- expects: still-shape \*; keeps-order. Until round 4 this was `still *` (the product decision
  for round 3: a relabel holds the layout unless a label no longer fits at all).
- Round 5 changed the check, not the request. The agreed relabel promise is that nothing outside
  the widened gap changes shape once each band's own shift is removed (`still-shape *`), and that
  nothing swaps sides (`keeps-order`). `still *` fails any widened gap by construction.
