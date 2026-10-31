---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries what [Every issue carries](#every-issue-carries) says. Ask the human
   only whether this plan needs more (fields, labels, wording).
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md> --label "plan:<plan>"
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

A done-when that needs someone else (a reviewer's look, an approval) holds only once they have
done it. Until then the issue stays open and says what it waits on.

## Every issue carries

The human approved this shape on 2026-10-30 (plan morning-digest). The body opens with the source
line, then three fields:

```
Source: plan.md § <n>

Scope: <what this issue changes, from that section>
Done when: <the plan's own done line; write one only where the plan has none>
Blocked by: #<n>, or —
```

- `<n>` is the plan's section number as written, with its letter for a sub-section (`§ 2a`).
- Label: `plan:<plan>`, the `plan:` value from plan.md's frontmatter (`plan:morning-digest`).
  Create it once with `gh label create` if the repo lacks it.
- Title: the unit of work in a few words, a route or file where it names one
  (`Digest page: GET /digest/:night`).
- A plan section may become two issues when part of it unblocks others (types before the
  reader); both cite the same section. Say so when you show the split.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
