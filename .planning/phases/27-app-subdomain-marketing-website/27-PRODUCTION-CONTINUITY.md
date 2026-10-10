# October10 production source continuity gap

Observed production web/ops deployments are pinned to `3645558085e81fed38d644c7b50c64ce921a72ad`, on `dev`. Root compatibility candidate `c0f9a6c5cf4690ed2eebca4b63016077633fa89e` diverges at `4dd182adb44432055815efa9953e8b160153aa6a`. It omits deployed manual-payout and settlement-readback modules. Neither c0f9a6c5 nor the earlier b8358b11 Preview candidate is eligible for production cutover until this source gap is repaired and reverified.

Production migration ledger has37 entries with final timestamp1791388800000. The production journal names0034_manual_host_payout_attempt,0035_controlled_api_payout and0036_host_payout_transfer_fee. Candidate0034_contact_quota collides; the corrected migration must be0037_contact_quota. Its reviewed SQL SHA256 is `99516450850c7ea1f400aff1197145d79179ea58e742b3c5ca1a9fc5bc93f4d6`. Production Contact table is absent. The isolated Preview's previously applied0034 Contact SQL is historical provenance and must not be replayed under a new name.

The successful c0f9a6c5 local run is retained at `playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/report.json`. This is engineering evidence for that SHA, not release eligibility. No production deployment/migration, provider write or additional real email occurred.

Plan21 is executing sequentially in the attached managed worktree. The owner walkthrough Preview stays fixed. Original08/09 and all seven requirement acceptances remain pending; Contact off, all money/legal HOLDs persist.
