---
quick_id: 260914-ew2
status: complete
---

# Registration password feedback

Changed the shared signup password validation message from Zod's technical wording to: “Your password must be at least 10 characters long.”

Updated related signup action fixtures to provide the required password confirmation field.

Verification: focused validation and capability-signup tests passed (18 tests); ESLint passed for changed files. The repository-wide TypeScript check remains blocked by unrelated generated-route and existing test typing errors.
