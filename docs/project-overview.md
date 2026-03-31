# Project Overview

Research Starters Hub is an MVP system to centralize undergraduate research opportunity discovery.

Key workflow:
1. Faculty submit updates through Qualtrics.
2. Backend normalizes and validates payloads.
3. Optional website fetch adds context.
4. Summary generation runs through provider abstraction.
5. Admin reviews and approves entries.
6. Student listing + newsletter export are generated from approved snapshots.

Core product rules:
- Each listing shows visible last-updated timestamp.
- Timestamp updates only on new accepted submission.
- If no submission in a cycle, previous approved entry remains with old timestamp.
