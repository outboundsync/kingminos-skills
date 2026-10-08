#!/usr/bin/env bash
# Lands the CHANGELOG.md promotion (written by `release-calver.mjs --apply`) on
# main after the CalVer Release workflow has published the tag.
#
# Why a PR instead of a push: main is protected (required `validate` check,
# strict, enforced for admins), so a direct bot push is rejected, and we do not
# relax protection for automation. The workflow therefore:
#   1. commits CHANGELOG.md on release/changelog-<tag> (rebased onto main if
#      main moved; a conflict fails loudly instead of mis-filing notes),
#   2. opens a PR with GITHUB_TOKEN,
#   3. dispatches Validate on the branch (PRs opened by GITHUB_TOKEN do not
#      trigger pull_request workflows; workflow_dispatch is allowed),
#   4. squash-merges once `validate` passes, pinned with --match-head-commit.
#
# No loop: the merge is pushed by GITHUB_TOKEN, which does not trigger the
# Validate push run that starts a release, and the subject
# `chore(release): CHANGELOG for <tag> (#N)` matches RELEASE_COMMIT_PATTERN, so
# a manual re-run would not cut a tag for it either.
#
# Env: TAG, RELEASE_SHA, REPO, GH_TOKEN. Run from the release checkout with
# CHANGELOG.md already modified and git user.name / user.email set.
set -euo pipefail

: "${TAG:?TAG is required}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${REPO:?REPO is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

branch="release/changelog-${TAG}"
subject="chore(release): CHANGELOG for ${TAG}"
wait_seconds="${VALIDATE_WAIT_SECONDS:-900}"

git switch --quiet -c "$branch"
git add CHANGELOG.md
git commit --quiet -m "$subject"

git fetch --quiet origin main
if [ "$(git rev-parse origin/main)" != "$RELEASE_SHA" ]; then
  echo "main moved past ${RELEASE_SHA}; rebasing the CHANGELOG commit onto origin/main."
  if ! git rebase --quiet origin/main; then
    git rebase --abort
    echo "::error::CHANGELOG promotion for ${TAG} conflicts with newer commits on main. Move the ${TAG} notes by hand in a PR."
    exit 1
  fi
fi

head_sha="$(git rev-parse HEAD)"
git push --quiet origin "HEAD:refs/heads/${branch}"

pr_url="$(gh pr create --repo "$REPO" --base main --head "$branch" --title "$subject" \
  --body "Automated by the CalVer Release workflow: move the \`## Unreleased\` notes into \`## [${TAG}]\`. It merges itself once \`validate\` passes.")"
pr_number="${pr_url##*/}"
echo "Opened ${pr_url}"

gh workflow run validate.yml --repo "$REPO" --ref "$branch"

deadline=$((SECONDS + wait_seconds))
conclusion=""
while [ "$SECONDS" -lt "$deadline" ]; do
  sleep 15
  conclusion="$(gh api "repos/${REPO}/commits/${head_sha}/check-runs?check_name=validate" \
    --jq '[.check_runs[] | select(.status == "completed")] | sort_by(.completed_at) | last | .conclusion // ""')"
  if [ -n "$conclusion" ]; then
    break
  fi
done

if [ "$conclusion" != "success" ]; then
  echo "::error::validate on ${head_sha} finished with '${conclusion:-timeout}'. PR #${pr_number} is left open for a maintainer."
  exit 1
fi

gh pr merge "$pr_number" --repo "$REPO" --squash --match-head-commit "$head_sha" \
  --subject "${subject} (#${pr_number})" \
  --body "Move the Unreleased notes into the ${TAG} section."
echo "Merged PR #${pr_number}."

# The bot's own short-lived branch; ignore failure (e.g. already deleted).
gh api -X DELETE "repos/${REPO}/git/refs/heads/${branch}" >/dev/null 2>&1 || true
