import assert from "node:assert/strict";
import {
  getDefaultAccessModeForDevice,
  getWorkspaceAccessCapabilities,
  workspaceAccessCapabilities
} from "../lib/workspace-access.ts";

const phoneSignals = {
  maxTouchPoints: 5,
  coarsePointer: true,
  screenWidth: 390,
  screenHeight: 844
};

assert.equal(getDefaultAccessModeForDevice({
  ...phoneSignals,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari"
}), "view-only");
assert.equal(getDefaultAccessModeForDevice({
  ...phoneSignals,
  screenWidth: 932,
  screenHeight: 430,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari"
}), "view-only", "Landscape phones must remain view-only.");
assert.equal(getDefaultAccessModeForDevice({
  ...phoneSignals,
  userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit Chrome Mobile Safari"
}), "view-only");
assert.equal(getDefaultAccessModeForDevice({
  ...phoneSignals,
  userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit MicroMessenger"
}), "view-only");
assert.equal(getDefaultAccessModeForDevice({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Chrome Safari",
  maxTouchPoints: 0,
  coarsePointer: false,
  screenWidth: 1440,
  screenHeight: 900
}), "full-edit");

for (const mode of ["view-only", "comment-only", "controlled-edit"]) {
  const capabilities = getWorkspaceAccessCapabilities(mode);
  assert.equal(capabilities.canMutateWorkspace, false, `${mode} must not mutate the canonical workspace.`);
  assert.equal(capabilities.canPersistDraft, false, `${mode} must not persist browser drafts.`);
  assert.equal(capabilities.canWriteCode, false, `${mode} must not write code.`);
  assert.equal(capabilities.canUseExternalSync, false, `${mode} must not use external sync.`);
}

assert.equal(workspaceAccessCapabilities["comment-only"].canComment, true);
assert.equal(workspaceAccessCapabilities["controlled-edit"].canCreateProposals, true);
assert.equal(workspaceAccessCapabilities["full-edit"].canMutateWorkspace, true);

console.log("Workspace access checks passed.");
