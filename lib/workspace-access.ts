import type { AccessMode } from "@/types/space";

export type WorkspaceAccessCapabilities = {
  canView: boolean;
  canComment: boolean;
  canCreateProposals: boolean;
  canMutateWorkspace: boolean;
  canPersistDraft: boolean;
  canWriteCode: boolean;
  canUseExternalSync: boolean;
};

export type AccessDeviceSignals = {
  userAgent: string;
  maxTouchPoints: number;
  coarsePointer: boolean;
  screenWidth: number;
  screenHeight: number;
};

export const DEFAULT_MOBILE_ACCESS_MODE: AccessMode = "view-only";
export const DEFAULT_DESKTOP_ACCESS_MODE: AccessMode = "full-edit";

export const workspaceAccessCapabilities: Record<AccessMode, WorkspaceAccessCapabilities> = {
  "view-only": {
    canView: true,
    canComment: false,
    canCreateProposals: false,
    canMutateWorkspace: false,
    canPersistDraft: false,
    canWriteCode: false,
    canUseExternalSync: false
  },
  "comment-only": {
    canView: true,
    canComment: true,
    canCreateProposals: false,
    canMutateWorkspace: false,
    canPersistDraft: false,
    canWriteCode: false,
    canUseExternalSync: false
  },
  "controlled-edit": {
    canView: true,
    canComment: true,
    canCreateProposals: true,
    canMutateWorkspace: false,
    canPersistDraft: false,
    canWriteCode: false,
    canUseExternalSync: false
  },
  "full-edit": {
    canView: true,
    canComment: true,
    canCreateProposals: true,
    canMutateWorkspace: true,
    canPersistDraft: true,
    canWriteCode: true,
    canUseExternalSync: true
  }
};

export function getWorkspaceAccessCapabilities(accessMode: AccessMode) {
  return workspaceAccessCapabilities[accessMode];
}

export function isControlledMobileDevice(signals: AccessDeviceSignals) {
  const phoneUserAgent = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(signals.userAgent);
  const compactTouchDevice = signals.maxTouchPoints > 1
    && signals.coarsePointer
    && Math.min(signals.screenWidth, signals.screenHeight) <= 700;
  return phoneUserAgent || compactTouchDevice;
}

export function getDefaultAccessModeForDevice(signals: AccessDeviceSignals): AccessMode {
  return isControlledMobileDevice(signals) ? DEFAULT_MOBILE_ACCESS_MODE : DEFAULT_DESKTOP_ACCESS_MODE;
}
