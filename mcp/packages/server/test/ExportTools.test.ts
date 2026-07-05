import assert from "node:assert/strict";
import test from "node:test";
import { CommandDescriptors, CommandErrorCodes } from "@penpot/command-runtime";
import { FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotRpcRequestContext, PenpotSseEvent } from "../src/PenpotRpcClient.js";
import { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ExportFileTool, RenderPreviewTool, RenderThumbnailTool } from "../src/tools/ExportTools.js";

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
    object: "00000000-0000-0000-0000-000000000003",
    profile: "00000000-0000-0000-0000-000000000004",
};

function parseJsonResponse(response: Awaited<ReturnType<RenderPreviewTool["execute"]>>) {
    const text = response.content[0];
    assert.equal(text.type, "text");
    return JSON.parse(text.text);
}

function assertAuditRetentionPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditRetentionVersion, "P25.52");
    for (const key of [
        "retentionPolicySelected",
        "retentionWindowComputed",
        "retentionClockTrusted",
        "retentionRecordStored",
        "retentionIndexUpdated",
        "archivePrepared",
        "archiveStored",
        "purgeScheduled",
        "purgeExecuted",
        "exportPrepared",
        "exportWritten",
        "auditRecordWritten",
        "auditRecordStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditRetentionDecision.canStoreRetentionRecord, false);
    assert.equal(policy.auditRetentionDecision.canSchedulePurge, false);
    assert.equal(policy.auditRetentionDecision.canExecutePurge, false);
    assert.equal(policy.auditRetentionDecision.canWriteExport, false);
}

function assertAuditAccessPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditAccessVersion, "P25.53");
    for (const key of [
        "accessPolicySelected",
        "accessSubjectIdentified",
        "accessScopeComputed",
        "accessScopeValidated",
        "accessDecisionComputed",
        "accessDecisionStored",
        "accessGranted",
        "accessDenied",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordExported",
        "auditRecordDownloaded",
        "auditRecordRedacted",
        "auditRecordSigned",
        "auditRecordShared",
        "accessTokenIssued",
        "accessTokenAccepted",
        "accessTokenStored",
        "accessTokenValidated",
        "accessTokenConsumed",
        "accessTokenRevoked",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditAccessDecision.canGrantAccess, false);
    assert.equal(policy.auditAccessDecision.canReadAuditRecord, false);
    assert.equal(policy.auditAccessDecision.canExportAuditRecord, false);
    assert.equal(policy.auditAccessDecision.canDownloadAuditRecord, false);
}

function assertAuditIntegrityPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditIntegrityVersion, "P25.54");
    for (const key of [
        "integrityPolicySelected",
        "integritySubjectIdentified",
        "integrityScopeComputed",
        "integrityHashComputed",
        "integrityHashStored",
        "integrityHashVerified",
        "integritySignatureCreated",
        "integritySignatureVerified",
        "integrityChainLinked",
        "integrityChainVerified",
        "auditRecordRead",
        "auditRecordHashed",
        "auditRecordVerified",
        "auditRecordSigned",
        "auditRecordSealed",
        "auditRecordTamperChecked",
        "auditRecordIntegrityStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditIntegrityDecision.canComputeIntegrityHash, false);
    assert.equal(policy.auditIntegrityDecision.canVerifyIntegrityHash, false);
    assert.equal(policy.auditIntegrityDecision.canReadAuditRecord, false);
    assert.equal(policy.auditIntegrityDecision.canHashAuditRecord, false);
    assert.equal(policy.auditIntegrityDecision.canVerifyAuditRecord, false);
}

function assertAuditProvenancePolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditProvenanceVersion, "P25.55");
    for (const key of [
        "provenancePolicySelected",
        "provenanceSubjectIdentified",
        "provenanceSourceCollected",
        "provenanceSourceValidated",
        "provenanceGraphComputed",
        "provenanceGraphStored",
        "provenanceChainLinked",
        "provenanceChainVerified",
        "provenanceRecordCreated",
        "provenanceRecordStored",
        "provenanceRecordPublished",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordProvenanceLinked",
        "auditRecordProvenanceVerified",
        "provenanceSignatureCreated",
        "provenanceSignatureVerified",
        "provenanceHashComputed",
        "provenanceHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditProvenanceDecision.canCollectProvenanceSource, false);
    assert.equal(policy.auditProvenanceDecision.canComputeProvenanceGraph, false);
    assert.equal(policy.auditProvenanceDecision.canCreateProvenanceRecord, false);
    assert.equal(policy.auditProvenanceDecision.canReadAuditRecord, false);
    assert.equal(policy.auditProvenanceDecision.canComputeProvenanceHash, false);
}

function assertAuditCustodyPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCustodyVersion, "P25.56");
    for (const key of [
        "custodyPolicySelected",
        "custodySubjectIdentified",
        "custodyHolderIdentified",
        "custodyTransferPrepared",
        "custodyTransferExecuted",
        "custodyTransferred",
        "custodyTaken",
        "custodyReleased",
        "custodyRecordCreated",
        "custodyRecordStored",
        "custodyRecordPublished",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCustodyLinked",
        "auditRecordCustodyVerified",
        "custodySignatureCreated",
        "custodySignatureVerified",
        "custodyHashComputed",
        "custodyHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCustodyDecision.canTakeCustody, false);
    assert.equal(policy.auditCustodyDecision.canExecuteCustodyTransfer, false);
    assert.equal(policy.auditCustodyDecision.canCreateCustodyRecord, false);
    assert.equal(policy.auditCustodyDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCustodyDecision.canComputeCustodyHash, false);
}

function assertAuditEvidencePolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditEvidenceVersion, "P25.57");
    for (const key of [
        "evidencePolicySelected",
        "evidenceSubjectIdentified",
        "evidenceSourceIdentified",
        "evidenceCollected",
        "evidenceValidated",
        "evidenceNormalized",
        "evidenceRecordCreated",
        "evidenceRecordStored",
        "evidenceRecordPublished",
        "evidenceBundleCreated",
        "evidenceBundleStored",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordEvidenceLinked",
        "auditRecordEvidenceVerified",
        "evidenceSignatureCreated",
        "evidenceSignatureVerified",
        "evidenceHashComputed",
        "evidenceHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditEvidenceDecision.canCollectEvidence, false);
    assert.equal(policy.auditEvidenceDecision.canValidateEvidence, false);
    assert.equal(policy.auditEvidenceDecision.canCreateEvidenceRecord, false);
    assert.equal(policy.auditEvidenceDecision.canReadAuditRecord, false);
    assert.equal(policy.auditEvidenceDecision.canComputeEvidenceHash, false);
}

function assertAuditAttestationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditAttestationVersion, "P25.58");
    for (const key of [
        "attestationPolicySelected",
        "attestationSubjectIdentified",
        "attestationAuthorityIdentified",
        "attestationPrepared",
        "attestationCreated",
        "attestationValidated",
        "attestationStored",
        "attestationPublished",
        "attestationBundleCreated",
        "attestationBundleStored",
        "evidenceRecordRead",
        "evidenceRecordAttested",
        "evidenceRecordVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordAttestationLinked",
        "auditRecordAttestationVerified",
        "attestationSignatureCreated",
        "attestationSignatureVerified",
        "attestationHashComputed",
        "attestationHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditAttestationDecision.canCreateAttestation, false);
    assert.equal(policy.auditAttestationDecision.canStoreAttestation, false);
    assert.equal(policy.auditAttestationDecision.canAttestEvidenceRecord, false);
    assert.equal(policy.auditAttestationDecision.canReadAuditRecord, false);
    assert.equal(policy.auditAttestationDecision.canComputeAttestationHash, false);
}

function assertAuditNotarizationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditNotarizationVersion, "P25.59");
    for (const key of [
        "notarizationPolicySelected",
        "notarizationSubjectIdentified",
        "notarizationAuthorityIdentified",
        "notarizationPrepared",
        "notarizationCreated",
        "notarizationValidated",
        "notarizationStored",
        "notarizationPublished",
        "notarizationRecordCreated",
        "notarizationRecordStored",
        "notarizationRecordPublished",
        "attestationRead",
        "attestationNotarized",
        "attestationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordNotarizationLinked",
        "auditRecordNotarizationVerified",
        "notarizationSignatureCreated",
        "notarizationSignatureVerified",
        "notarizationHashComputed",
        "notarizationHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditNotarizationDecision.canCreateNotarization, false);
    assert.equal(policy.auditNotarizationDecision.canStoreNotarizationRecord, false);
    assert.equal(policy.auditNotarizationDecision.canNotarizeAttestation, false);
    assert.equal(policy.auditNotarizationDecision.canReadAuditRecord, false);
    assert.equal(policy.auditNotarizationDecision.canComputeNotarizationHash, false);
}

function assertAuditCertificationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCertificationVersion, "P25.60");
    for (const key of [
        "certificationPolicySelected",
        "certificationSubjectIdentified",
        "certificationAuthorityIdentified",
        "certificationPrepared",
        "certificationCreated",
        "certificationValidated",
        "certificationStored",
        "certificationPublished",
        "certificationRecordCreated",
        "certificationRecordStored",
        "certificationRecordPublished",
        "notarizationRead",
        "notarizationCertified",
        "notarizationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCertificationLinked",
        "auditRecordCertificationVerified",
        "certificationSignatureCreated",
        "certificationSignatureVerified",
        "certificationHashComputed",
        "certificationHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCertificationDecision.canCreateCertification, false);
    assert.equal(policy.auditCertificationDecision.canStoreCertificationRecord, false);
    assert.equal(policy.auditCertificationDecision.canCertifyNotarization, false);
    assert.equal(policy.auditCertificationDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCertificationDecision.canComputeCertificationHash, false);
}

function assertAuditEndorsementPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditEndorsementVersion, "P25.61");
    for (const key of [
        "endorsementPolicySelected",
        "endorsementSubjectIdentified",
        "endorsementAuthorityIdentified",
        "endorsementPrepared",
        "endorsementCreated",
        "endorsementValidated",
        "endorsementStored",
        "endorsementPublished",
        "endorsementRecordCreated",
        "endorsementRecordStored",
        "endorsementRecordPublished",
        "certificationRead",
        "certificationEndorsed",
        "certificationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordEndorsementLinked",
        "auditRecordEndorsementVerified",
        "endorsementSignatureCreated",
        "endorsementSignatureVerified",
        "endorsementHashComputed",
        "endorsementHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditEndorsementDecision.canCreateEndorsement, false);
    assert.equal(policy.auditEndorsementDecision.canStoreEndorsementRecord, false);
    assert.equal(policy.auditEndorsementDecision.canEndorseCertification, false);
    assert.equal(policy.auditEndorsementDecision.canReadAuditRecord, false);
    assert.equal(policy.auditEndorsementDecision.canComputeEndorsementHash, false);
}

function assertAuditCountersignaturePolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureVersion, "P25.62");
    for (const key of [
        "countersignaturePolicySelected",
        "countersignatureSubjectIdentified",
        "countersignatureAuthorityIdentified",
        "countersignaturePrepared",
        "countersignatureCreated",
        "countersignatureValidated",
        "countersignatureStored",
        "countersignaturePublished",
        "countersignatureRecordCreated",
        "countersignatureRecordStored",
        "countersignatureRecordPublished",
        "endorsementRead",
        "endorsementCountersigned",
        "endorsementVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureLinked",
        "auditRecordCountersignatureVerified",
        "countersignatureSignatureCreated",
        "countersignatureSignatureVerified",
        "countersignatureHashComputed",
        "countersignatureHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureDecision.canCreateCountersignature, false);
    assert.equal(policy.auditCountersignatureDecision.canStoreCountersignatureRecord, false);
    assert.equal(policy.auditCountersignatureDecision.canCountersignEndorsement, false);
    assert.equal(policy.auditCountersignatureDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureDecision.canComputeCountersignatureHash, false);
}

function assertAuditCountersignatureVerificationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureVerificationVersion, "P25.63");
    for (const key of [
        "countersignatureVerificationPolicySelected",
        "countersignatureVerificationSubjectIdentified",
        "countersignatureVerificationAuthorityIdentified",
        "countersignatureRead",
        "countersignatureRecordRead",
        "countersignaturePayloadParsed",
        "countersignatureSignatureRead",
        "countersignatureSignatureVerified",
        "countersignatureHashComputed",
        "countersignatureHashMatched",
        "countersignatureChainLinked",
        "countersignatureChainVerified",
        "countersignatureVerificationPrepared",
        "countersignatureVerificationExecuted",
        "countersignatureVerificationPassed",
        "countersignatureVerificationFailed",
        "countersignatureVerificationStored",
        "countersignatureVerificationPublished",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureVerificationLinked",
        "auditRecordCountersignatureVerificationVerified",
        "countersignatureVerificationSignatureCreated",
        "countersignatureVerificationSignatureVerified",
        "countersignatureVerificationHashComputed",
        "countersignatureVerificationHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureVerificationDecision.canReadCountersignature, false);
    assert.equal(policy.auditCountersignatureVerificationDecision.canVerifyCountersignatureSignature, false);
    assert.equal(policy.auditCountersignatureVerificationDecision.canStoreCountersignatureVerification, false);
    assert.equal(policy.auditCountersignatureVerificationDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureVerificationDecision.canComputeCountersignatureVerificationHash, false);
}

function assertAuditCountersignatureRevocationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationVersion, "P25.64");
    for (const key of [
        "countersignatureRevocationPolicySelected",
        "countersignatureRevocationSubjectIdentified",
        "countersignatureRevocationAuthorityIdentified",
        "countersignatureRevocationReasonCaptured",
        "countersignatureRevocationScopeComputed",
        "countersignatureRevocationRequestPrepared",
        "countersignatureRevocationRequestValidated",
        "countersignatureRevocationRequestStored",
        "countersignatureRevocationExecuted",
        "countersignatureRevoked",
        "countersignatureRevocationPublished",
        "countersignatureRevocationRecordCreated",
        "countersignatureRevocationRecordStored",
        "countersignatureRevocationRecordPublished",
        "countersignatureRead",
        "countersignatureRecordRead",
        "countersignatureVerificationRead",
        "countersignatureVerificationRevoked",
        "countersignatureVerificationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationLinked",
        "auditRecordCountersignatureRevocationVerified",
        "countersignatureRevocationSignatureCreated",
        "countersignatureRevocationSignatureVerified",
        "countersignatureRevocationHashComputed",
        "countersignatureRevocationHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureRevocationDecision.canReadCountersignature, false);
    assert.equal(policy.auditCountersignatureRevocationDecision.canRevokeCountersignature, false);
    assert.equal(policy.auditCountersignatureRevocationDecision.canStoreCountersignatureRevocationRecord, false);
    assert.equal(policy.auditCountersignatureRevocationDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureRevocationDecision.canComputeCountersignatureRevocationHash, false);
}

function assertAuditCountersignatureRevocationAppealPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealVersion, "P25.65");
    for (const key of [
        "countersignatureRevocationAppealPolicySelected",
        "countersignatureRevocationAppealSubjectIdentified",
        "countersignatureRevocationAppealAuthorityIdentified",
        "countersignatureRevocationAppealReasonCaptured",
        "countersignatureRevocationAppealScopeComputed",
        "countersignatureRevocationAppealRequestPrepared",
        "countersignatureRevocationAppealRequestValidated",
        "countersignatureRevocationAppealRequestStored",
        "countersignatureRevocationAppealExecuted",
        "countersignatureRevocationAppealed",
        "countersignatureRevocationAppealGranted",
        "countersignatureRevocationAppealDenied",
        "countersignatureRevocationAppealPublished",
        "countersignatureRevocationAppealRecordCreated",
        "countersignatureRevocationAppealRecordStored",
        "countersignatureRevocationAppealRecordPublished",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealLinked",
        "auditRecordCountersignatureRevocationAppealVerified",
        "countersignatureRevocationAppealSignatureCreated",
        "countersignatureRevocationAppealSignatureVerified",
        "countersignatureRevocationAppealHashComputed",
        "countersignatureRevocationAppealHashStored",
        "materializationApproved",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureRevocationAppealDecision.canReadCountersignatureRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealDecision.canAppealCountersignatureRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealDecision.canStoreCountersignatureRevocationAppealRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealDecision.canComputeCountersignatureRevocationAppealHash, false);
}

function assertAuditCountersignatureRevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionVersion, "P25.66");
    assert.equal(policy.countersignatureRevocationAppealResolutionRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionPolicySelected",
        "countersignatureRevocationAppealResolutionSubjectIdentified",
        "countersignatureRevocationAppealResolutionAuthorityIdentified",
        "countersignatureRevocationAppealRead",
        "countersignatureRevocationAppealRecordRead",
        "countersignatureRevocationAppealResolutionReasonCaptured",
        "countersignatureRevocationAppealResolutionScopeComputed",
        "countersignatureRevocationAppealResolutionOutcomeSelected",
        "countersignatureRevocationAppealResolutionPrepared",
        "countersignatureRevocationAppealResolutionValidated",
        "countersignatureRevocationAppealResolutionStored",
        "countersignatureRevocationAppealResolutionExecuted",
        "countersignatureRevocationAppealResolved",
        "countersignatureRevocationAppealResolutionAccepted",
        "countersignatureRevocationAppealResolutionRejected",
        "countersignatureRevocationAppealResolutionPublished",
        "countersignatureRevocationAppealResolutionRecordCreated",
        "countersignatureRevocationAppealResolutionRecordStored",
        "countersignatureRevocationAppealResolutionRecordPublished",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionLinked",
        "auditRecordCountersignatureRevocationAppealResolutionVerified",
        "countersignatureRevocationAppealResolutionSignatureCreated",
        "countersignatureRevocationAppealResolutionSignatureVerified",
        "countersignatureRevocationAppealResolutionHashComputed",
        "countersignatureRevocationAppealResolutionHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "tokenAccepted",
        "tokenStored",
        "tokenValidated",
        "tokenConsumed",
        "tokenRevoked",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionDecision.canReadCountersignatureRevocationAppeal, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionDecision.canResolveCountersignatureRevocationAppeal, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionDecision.canStoreCountersignatureRevocationAppealResolutionRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionDecision.canComputeCountersignatureRevocationAppealResolutionHash, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementVersion, "P25.67");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementAuthorityIdentified",
        "countersignatureRevocationAppealResolutionRead",
        "countersignatureRevocationAppealResolutionRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementActionSelected",
        "countersignatureRevocationAppealResolutionEnforcementPrepared",
        "countersignatureRevocationAppealResolutionEnforcementValidated",
        "countersignatureRevocationAppealResolutionEnforcementStored",
        "countersignatureRevocationAppealResolutionEnforcementExecuted",
        "countersignatureRevocationAppealResolutionEnforced",
        "countersignatureRevocationAppealResolutionEnforcementAccepted",
        "countersignatureRevocationAppealResolutionEnforcementRejected",
        "countersignatureRevocationAppealResolutionEnforcementPublished",
        "countersignatureRevocationAppealResolutionEnforcementRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementRecordPublished",
        "countersignatureRevocationAppealRead",
        "countersignatureRevocationAppealRecordRead",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementVerified",
        "countersignatureRevocationAppealResolutionEnforcementSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "tokenAccepted",
        "tokenStored",
        "tokenValidated",
        "tokenConsumed",
        "tokenRevoked",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementDecision.canReadCountersignatureRevocationAppealResolution,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementDecision.canEnforceCountersignatureRevocationAppealResolution,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementRecord,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceVersion, "P25.68");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidencePlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidencePolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceSourceIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceCollected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceNormalized",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceBundleCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceBundleStored",
        "countersignatureRevocationAppealResolutionEnforcementRead",
        "countersignatureRevocationAppealResolutionEnforcementRecordRead",
        "countersignatureRevocationAppealResolutionRead",
        "countersignatureRevocationAppealResolutionRecordRead",
        "countersignatureRevocationAppealRead",
        "countersignatureRevocationAppealRecordRead",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "tokenAccepted",
        "tokenStored",
        "tokenValidated",
        "tokenConsumed",
        "tokenRevoked",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceDecision.canReadCountersignatureRevocationAppealResolutionEnforcement,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceDecision.canCollectCountersignatureRevocationAppealResolutionEnforcementEvidence,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceRecord,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationVersion, "P25.69");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationBundleCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationBundleStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordAttested",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceRecordVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestation,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestation,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationDecision.canAttestCountersignatureRevocationAppealResolutionEnforcementEvidenceRecord,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationVersion, "P25.70");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarized",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationBundleRead",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarization,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationDecision.canNotarizeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestation,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationVersion, "P25.71");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationDecision.canCertifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarization,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementVersion, "P25.72");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy.policy,
        "endorse-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-after-certification-record-defined"
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsement,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementDecision.canEndorseCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVersion, "P25.73");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersigned",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy.policy,
        "countersign-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-after-endorsement-record-defined"
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignature,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureDecision.canCountersignCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsement,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVersion, "P25.74");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPlanned, true);

    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationAuthorityIdentified",
        "countersignatureRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordRead",
        "countersignaturePayloadParsed",
        "countersignatureSignatureRead",
        "countersignatureSignatureVerified",
        "countersignatureHashComputed",
        "countersignatureHashMatched",
        "countersignatureChainLinked",
        "countersignatureChainVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPassed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationFailed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPublished",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationHashStored",
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVersion, "P25.73");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy.policy,
        "verify-countersignature-after-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-record-defined"
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationDecision.canVerifyCountersignatureSignature,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification,
        false
    );
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationDecision.canReadAuditRecord, false);
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationHash,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVersion, "P25.75");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPlanned, true);

    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRevoked",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordPublished",
        "countersignatureRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevoked",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationHashStored",
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVersion, "P25.74");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy.policy,
        "revoke-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-after-verification-record-defined"
    );
    assert.ok(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy.requiredInputs.includes(
            "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRecord"
        )
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canRevokeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canReadAuditRecord,
        false
    );
}

type SseCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
};

function mcpServerWithSse(
    postSse: (...args: any[]) => Promise<PenpotSseEvent[]>,
    userToken: string | undefined = "token-1"
): PenpotMcpServer {
    return {
        rpcClient: {
            getBaseUri: () => "http://127.0.0.1:6060",
            getMethodUrl: (methodName: string) => `http://127.0.0.1:6060/api/main/methods/${methodName}?_fmt=json`,
            postSse,
        },
        getSessionContext: () => ({ userToken, mcpSessionId: "session-1" }),
    } as unknown as PenpotMcpServer;
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVersion, "P25.76");
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealGranted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDenied",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "tokenAccepted",
        "tokenStored",
        "tokenValidated",
        "tokenConsumed",
        "tokenRevoked",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canAppealCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHash, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionVersion, "P25.77");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcomeSelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolved",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAccepted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRejected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordPublished",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashStored",
        "materializationReady",
        "materializationApproved",
        "materializationApprovedNow",
        "approved",
        "finalApprovalGranted",
        "tokenAccepted",
        "tokenStored",
        "tokenValidated",
        "tokenConsumed",
        "tokenRevoked",
        "executeNow",
        "verifyNow",
        "rollbackNow",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "hostStartup",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "scriptRunnable",
        "fileMaterialization",
        "lockfileMutation",
        "rootPackageJsonMutation",
        "pnpmWorkspaceMutation",
        "commandExecution",
        "buildOutput",
        "packageScriptsRunnable",
        "filesWritten",
        "rollbackExecuted",
        "verificationExecuted",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVersion,
        "P25.76"
    );
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");

    for (const key of [
        "selectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyNow",
        "identifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubjectNow",
        "identifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthorityNow",
        "readCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealNow",
        "readCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordNow",
        "captureCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReasonNow",
        "computeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScopeNow",
        "selectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcomeNow",
        "prepareCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "validateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "executeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "resolveCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealNow",
        "acceptCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "rejectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "publishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "createCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "publishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "readCountersignatureRevocationNow",
        "readCountersignatureRevocationRecordNow",
        "readCountersignatureNow",
        "verifyCountersignatureRevocationNow",
        "readAuditRecordNow",
        "queryAuditRecordNow",
        "linkAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "verifyAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "signCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "verifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureNow",
        "computeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashNow",
    ]) {
        assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy[key], false, key);
    }

    for (const key of [
        "canSelectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy",
        "canIdentifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubject",
        "canIdentifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthority",
        "canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppeal",
        "canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecord",
        "canCaptureCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReason",
        "canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScope",
        "canSelectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcome",
        "canPrepareCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canValidateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canExecuteCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canResolveCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppeal",
        "canAcceptCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canRejectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canPublishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canPublishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canReadCountersignatureRevocation",
        "canReadCountersignatureRevocationRecord",
        "canReadCountersignature",
        "canVerifyCountersignatureRevocation",
        "canReadAuditRecord",
        "canQueryAuditRecord",
        "canLinkAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canVerifyAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canSignCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canVerifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignature",
        "canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHash",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHash",
        "canMaterializeFiles",
        "canEnableRuntimeDispatch",
    ]) {
        assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionDecision[key], false, key);
    }
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const auditEnforcementTopic = `audit${capitalEnforcementTopic}`;

    assert.equal(policy[`${auditEnforcementTopic}Version`], "P25.78");
    assert.equal(policy[`${enforcementTopic}Required`], true);
    assert.equal(policy[`${enforcementTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        `${enforcementTopic}PolicySelected`,
        `${resolutionTopic}Read`,
        `${resolutionTopic}RecordRead`,
        `${enforcementTopic}ActionSelected`,
        `${enforcementTopic}Executed`,
        `${resolutionTopic}Enforced`,
        "auditRecordRead",
        "auditRecordQueried",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionVersion,
        "P25.77"
    );
    assert.ok(policy[`${auditEnforcementTopic}Policy`].requiredInputs.includes("enforcementAction"));
    assert.equal(policy[`${auditEnforcementTopic}Policy`][`enforce${capitalResolutionTopic}Now`], false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditEnforcementTopic}Decision`][`canEnforce${capitalResolutionTopic}`], false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`][`canExecute${capitalEnforcementTopic}`], false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`].canEnableRuntimeDispatch, false);
}

test("ExportFileTool executes backend export-binfile SSE and returns resource metadata", async () => {
    const calls: SseCall[] = [];
    const tool = new ExportFileTool(
        mcpServerWithSse(
            async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return [
                    { type: "progress", data: { step: "queued" } },
                    {
                        type: "end",
                        data: {
                            "resource-uri": "/assets/by-id/resource-1",
                            filename: "Design.penpot",
                            mtype: "application/zip",
                        },
                    },
                ];
            }
        )
    );

    const response = await tool.execute({
        fileId: UUIDS.file,
        libraryMode: "merge",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "export-binfile",
            params: {
                "file-id": UUIDS.file,
                "include-libraries": false,
                "embed-assets": true,
            },
            userToken: "token-1",
            context: {
                mcpToolName: "export.file",
                mcpAdapter: "backend-rpc",
                mcpSessionId: "session-1",
                mcpFileId: UUIDS.file,
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.command, CommandDescriptors.EXPORT_FILE.id);
    assert.equal(body.data.adapter, "backend-rpc");
    assert.equal(body.data.adapterSelection.selected, "backend-rpc");
    assert.equal(body.data.artifact.libraryMode, "merge");
    assert.equal(body.data.artifact.includeLibraries, false);
    assert.equal(body.data.artifact.embedAssets, true);
    assert.equal(body.data.backendRpc.command, "export-binfile");
    assert.equal(body.data.backendRpc.responseContentType, "text/event-stream");
    assert.equal(body.data.resource.uri, "/assets/by-id/resource-1");
    assert.equal(body.data.resource["resource-uri"], "/assets/by-id/resource-1");
    assert.equal(body.data.resourceUri, "/assets/by-id/resource-1");
    assert.equal(body.data.downloadUri, "http://127.0.0.1:6060/assets/by-id/resource-1");
    assert.deepEqual(body.data.stream.eventTypes, ["progress", "end"]);
});

test("ExportFileTool normalizes string end events into resource metadata", async () => {
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => [
            { type: "end", data: "http://127.0.0.1:6060/assets/by-id/resource-2" },
        ])
    );

    const response = await tool.execute({ fileId: UUIDS.file });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "ok");
    assert.equal(body.data.artifact.libraryMode, "all");
    assert.equal(body.data.resource.uri, "http://127.0.0.1:6060/assets/by-id/resource-2");
    assert.equal(body.data.resource["resource-uri"], "http://127.0.0.1:6060/assets/by-id/resource-2");
});

test("ExportFileTool requires an authenticated MCP session token", async () => {
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => {
            throw new Error("export.file without token should not call backend");
        }, "")
    );

    const response = await tool.execute({ fileId: UUIDS.file });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, CommandErrorCodes.AUTHENTICATION_REQUIRED);
});

test("ExportFileTool rejects missing target and unsupported adapters before calling backend", async () => {
    let called = false;
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => {
            called = true;
            return [];
        })
    );

    const missingTarget = parseJsonResponse(await tool.execute({}));
    const unsupportedAdapter = parseJsonResponse(await tool.execute({ fileId: UUIDS.file, adapter: "exporter" }));

    assert.equal(called, false);
    assert.equal(missingTarget.status, "error");
    assert.equal(missingTarget.error.code, "export_file_target_required");
    assert.equal(unsupportedAdapter.status, "error");
    assert.equal(unsupportedAdapter.error.code, "adapter_not_available");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.command, "export.file");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.requested, "exporter");
});

test("ExportFileTool reports incomplete streams and missing resource URIs", async () => {
    const incompleteTool = new ExportFileTool(mcpServerWithSse(async () => [{ type: "progress", data: {} }]));
    const missingResourceTool = new ExportFileTool(mcpServerWithSse(async () => [{ type: "end", data: { filename: "x" } }]));

    const incomplete = parseJsonResponse(await incompleteTool.execute({ fileId: UUIDS.file }));
    const missingResource = parseJsonResponse(await missingResourceTool.execute({ fileId: UUIDS.file }));

    assert.equal(incomplete.status, "error");
    assert.equal(incomplete.error.code, "export_file_stream_incomplete");
    assert.deepEqual(incomplete.error.data.events, ["progress"]);
    assert.equal(missingResource.status, "error");
    assert.equal(missingResource.error.code, "export_file_resource_uri_missing");
});

test("RenderPreviewTool uses exporter for explicit file/page/object targets", async () => {
    const originalFetch = globalThis.fetch;
    const originalExporterUri = process.env.PENPOT_EXPORTER_URI;
    const calls: Array<{ url: string; options: RequestInit }> = [];

    process.env.PENPOT_EXPORTER_URI = "http://127.0.0.1:6061";
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
                get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
            },
            text: async () =>
                JSON.stringify({
                    id: "resource-1",
                    uri: "http://127.0.0.1:6061/resource/1",
                    mtype: "image/png",
                    filename: "preview.png",
                }),
        } as Response;
    };

    try {
        const tool = new RenderPreviewTool({
            getSessionContext: () => ({ userToken: "token-1", mcpSessionId: "session-1" }),
        } as unknown as PenpotMcpServer);
        const response = await tool.execute({
            fileId: UUIDS.file,
            pageId: UUIDS.page,
            objectId: UUIDS.object,
            profileId: UUIDS.profile,
            scale: 2,
        });
        const body = parseJsonResponse(response);

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "http://127.0.0.1:6061");
        assert.equal(calls[0].options.method, "POST");
        assert.equal((calls[0].options.headers as Record<string, string>).cookie, "auth-token=token-1");
        assert.match(String(calls[0].options.body), /~:export-shapes/);
        assert.match(String(calls[0].options.body), /~:type/);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, CommandDescriptors.RENDER_PREVIEW.id);
        assert.equal(body.data.adapter, "exporter");
        assert.equal(body.data.adapterSelection.selected, "exporter");
        assert.equal(body.data.artifact.kind, "preview");
        assert.equal(body.data.artifact.mimeType, "image/png");
        assert.equal(body.data.artifact.target.objectId, UUIDS.object);
        assert.equal(body.data.resource.uri, "http://127.0.0.1:6061/resource/1");
    } finally {
        globalThis.fetch = originalFetch;
        if (originalExporterUri === undefined) {
            delete process.env.PENPOT_EXPORTER_URI;
        } else {
            process.env.PENPOT_EXPORTER_URI = originalExporterUri;
        }
    }
});

test("RenderPreviewTool preserves plugin-live preview for bound workspace context", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [UUIDS.object],
        capabilities: [],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");

    const requests: unknown[] = [];
    const tool = new RenderPreviewTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
        pluginBridge: {
            executePluginTask: async (task: { toRequest: () => unknown }) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        export: {
                            targetType: "selection",
                            format: "png",
                            mimeType: "image/png",
                            byteLength: 4,
                            dataBase64: "iVBORw==",
                        },
                    },
                };
            },
        },
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ target: "selection", scale: 1 });
    const body = parseJsonResponse(response);

    assert.equal(requests.length, 1);
    assert.equal((requests[0] as { task: string }).task, "export");
    assert.deepEqual((requests[0] as { params: unknown }).params, {
        action: "renderPreview",
        target: "selection",
        shapeId: undefined,
        pageId: undefined,
        format: "png",
        scale: 1,
    });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "plugin-live");
    assert.equal(body.data.adapterSelection.command, "render.preview");
    assert.equal(body.data.export.dataBase64, "iVBORw==");
});

test("RenderPreviewTool rejects partial explicit exporter targets", async () => {
    const tool = new RenderPreviewTool({} as unknown as PenpotMcpServer);
    const response = await tool.execute({
        fileId: UUIDS.file,
        pageId: UUIDS.page,
    });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.command, "render.preview");
    assert.equal(body.error.data.adapterSelection.selected, null);
});

test("RenderThumbnailTool dry-run returns renderer-service request metadata without network calls", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    let sseCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("render.thumbnail dry-run must not call fetch");
    };

    try {
        const tool = new RenderThumbnailTool(
            mcpServerWithSse(async () => {
                sseCalled = true;
                throw new Error("render.thumbnail dry-run must not call backend SSE");
            })
        );

        const response = await tool.execute({
            fileId: UUIDS.file,
            target: "frame",
            pageId: UUIDS.page,
            objectId: UUIDS.object,
            tag: "cover",
            width: 320,
            cachePolicy: "refresh",
            endpoint: "http://127.0.0.1:6070/thumbnail",
            probeTimeoutMs: 3500,
            rendererServiceExecution: "renderer-service",
        });
        const body = parseJsonResponse(response);

        assert.equal(fetchCalled, false);
        assert.equal(sseCalled, false);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, CommandDescriptors.RENDER_THUMBNAIL.id);
        assert.equal(body.data.status, "planned");
        assert.equal(body.data.executable, false);
        assert.equal(body.data.runtimeAvailable, false);
        assert.equal(body.data.adapter, "renderer-service");
        assert.equal(body.data.adapterSelection.selected, "renderer-service");
        assert.equal(body.data.endpoint, "http://127.0.0.1:6070/thumbnail");
        assert.equal(body.data.service.operation, "thumbnail.render");
        assert.equal(body.data.service.localFileWrites, false);
        assert.equal(body.data.client.healthEndpoint, "http://127.0.0.1:6070/thumbnail/health");
        assert.equal(body.data.client.probeTimeoutMs, 3500);
        assert.equal(body.data.client.networkProbe, false);
        assert.equal(body.data.availability.status, "configured-unverified");
        assert.equal(body.data.availability.probe, "metadata-only");
        assert.equal(body.data.availability.checked, false);
        assert.equal(body.data.optInConfiguration.status, "planned-disabled");
        assert.equal(body.data.optInConfiguration.resolution.selectedSource, "mcp-arg");
        assert.equal(body.data.optInConfiguration.resolution.selectedValue, "renderer-service");
        assert.equal(body.data.optInConfiguration.diagnostics.executionEnabledByConfiguration, false);
        assert.equal(body.data.executionGate.status, "closed");
        assert.equal(body.data.executionGate.dispatch, false);
        assert.equal(body.data.executionGate.optIn.env, "PENPOT_RENDER_THUMBNAIL_EXECUTION");
        assert.equal(body.data.executionGate.blockers.includes("explicit-opt-in"), false);
        assert.equal(body.data.executionGate.integrationTestPlan.requiredBeforeDispatch, true);
        assert.equal(body.data.healthPreflight.dispatch, false);
        assert.equal(body.data.healthPreflight.endpoint, "http://127.0.0.1:6070/thumbnail/health");
        assert.equal(body.data.executionClientHarness.dispatch, false);
        assert.equal(body.data.dispatchAdapterBoundary.dispatch, false);
        assert.equal(body.data.dispatchAdapterBoundary.resultMapping.mcpReturn, "resource metadata only");
        assert.equal(body.data.unavailableErrorTaxonomy.taxonomyVersion, "P25.17");
        assert.equal(body.data.unavailableErrorTaxonomy.dispatch, false);
        assert.equal(body.data.unavailableErrorTaxonomy.defaultCode, "renderer_service_unavailable");
        assert.ok(
            body.data.unavailableErrorTaxonomy.errors.some(
                (entry: { code: string; retryable: boolean }) =>
                    entry.code === "renderer_service_health_unavailable" && entry.retryable === true
            )
        );
        assert.equal(body.data.integrationFixtureHarness.harnessVersion, "P25.18");
        assert.equal(body.data.integrationFixtureHarness.dispatch, false);
        assert.equal(body.data.integrationFixtureHarness.networkDispatch, false);
        assert.ok(
            body.data.integrationFixtureHarness.cases.some(
                (entry: { id: string }) => entry.id === "render-success-mcp-resource-metadata"
            )
        );
        assert.equal(body.data.dispatchRegistrationPreflight.preflightVersion, "P25.19");
        assert.equal(body.data.dispatchRegistrationPreflight.dispatch, false);
        assert.equal(body.data.dispatchRegistrationPreflight.runtimeRegistration, false);
        assert.ok(body.data.dispatchRegistrationPreflight.blockers.includes("runtime-execution-registration"));
        assert.equal(body.data.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
        assert.equal(body.data.executableAdapterRegistrationScaffold.dispatch, false);
        assert.equal(body.data.executableAdapterRegistrationScaffold.networkDispatch, false);
        assert.equal(body.data.executableAdapterRegistrationScaffold.runtimeRegistration, false);
        assert.equal(body.data.executableAdapterRegistrationScaffold.localFileWrites, false);
        assert.equal(
            body.data.executableAdapterRegistrationScaffold.consumes.dispatchRegistrationPreflight.preflightVersion,
            "P25.19"
        );
        assert.equal(body.data.executableAdapterRegistrationScaffold.consumes.clientRequest.currentDispatch, false);
        assert.equal(body.data.executableAdapterRegistrationScaffold.registrationSurface.runtimeExecutionRegistered, false);
        assert.equal(body.data.adapterRegistryManifest.manifestVersion, "P25.21");
        assert.equal(body.data.adapterRegistryManifest.dispatch, false);
        assert.equal(body.data.adapterRegistryManifest.networkDispatch, false);
        assert.equal(body.data.adapterRegistryManifest.runtimeRegistration, false);
        assert.equal(body.data.adapterRegistryManifest.localFileWrites, false);
        assert.equal(body.data.adapterRegistryManifest.registry.runtimeExecutionRegistered, false);
        assert.equal(body.data.adapterRegistryManifest.entrypoints.mcp.dryRunOnly, true);
        assert.equal(body.data.enablementChecklist.checklistVersion, "P25.22");
        assert.equal(body.data.enablementChecklist.dispatch, false);
        assert.equal(body.data.enablementChecklist.networkDispatch, false);
        assert.equal(body.data.enablementChecklist.runtimeRegistration, false);
        assert.equal(body.data.enablementChecklist.localFileWrites, false);
        assert.equal(body.data.enablementChecklist.readiness.mayEnableRuntime, false);
        assert.ok(body.data.enablementChecklist.blockers.includes("renderer-service-adapter-registry"));
        assert.equal(body.data.implementationSliceAudit.auditVersion, "P25.23");
        assert.equal(body.data.implementationSliceAudit.dispatch, false);
        assert.equal(body.data.implementationSliceAudit.networkDispatch, false);
        assert.equal(body.data.implementationSliceAudit.runtimeRegistration, false);
        assert.equal(body.data.implementationSliceAudit.localFileWrites, false);
        assert.equal(body.data.implementationSliceAudit.selectedSlice.id, "renderer-service-health-and-noop-contract");
        assert.equal(body.data.implementationSliceAudit.selectedSlice.enablesRuntimeDispatch, false);
        assert.equal(body.data.healthNoopContractFixtures.fixtureVersion, "P25.24");
        assert.equal(body.data.healthNoopContractFixtures.dispatch, false);
        assert.equal(body.data.healthNoopContractFixtures.networkDispatch, false);
        assert.equal(body.data.healthNoopContractFixtures.runtimeRegistration, false);
        assert.equal(body.data.healthNoopContractFixtures.localFileWrites, false);
        assert.equal(body.data.healthNoopContractFixtures.healthContract.okResponse.status, 200);
        assert.equal(body.data.healthNoopContractFixtures.noopRenderContract.response.status, 501);
        assert.equal(body.data.noopServiceHostScaffold.scaffoldVersion, "P25.25");
        assert.equal(body.data.noopServiceHostScaffold.dispatch, false);
        assert.equal(body.data.noopServiceHostScaffold.networkDispatch, false);
        assert.equal(body.data.noopServiceHostScaffold.runtimeRegistration, false);
        assert.equal(body.data.noopServiceHostScaffold.localFileWrites, false);
        assert.equal(body.data.noopServiceHostScaffold.hostStartup, false);
        assert.equal(body.data.noopServiceHostScaffold.host.startsProcess, false);
        assert.equal(body.data.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
        assert.equal(body.data.hostLifecycleTestFixtures.dispatch, false);
        assert.equal(body.data.hostLifecycleTestFixtures.networkDispatch, false);
        assert.equal(body.data.hostLifecycleTestFixtures.runtimeRegistration, false);
        assert.equal(body.data.hostLifecycleTestFixtures.localFileWrites, false);
        assert.equal(body.data.hostLifecycleTestFixtures.hostStartup, false);
        assert.equal(body.data.hostLifecycleTestFixtures.processSpawn, false);
        assert.equal(body.data.packageManifestScaffold.manifestVersion, "P25.27");
        assert.equal(body.data.packageManifestScaffold.dispatch, false);
        assert.equal(body.data.packageManifestScaffold.networkDispatch, false);
        assert.equal(body.data.packageManifestScaffold.runtimeRegistration, false);
        assert.equal(body.data.packageManifestScaffold.localFileWrites, false);
        assert.equal(body.data.packageManifestScaffold.packageCreated, false);
        assert.equal(body.data.packageManifestScaffold.workspaceMutation, false);
        assert.equal(body.data.packageCreationGuardrails.guardrailVersion, "P25.28");
        assert.equal(body.data.packageCreationGuardrails.dispatch, false);
        assert.equal(body.data.packageCreationGuardrails.networkDispatch, false);
        assert.equal(body.data.packageCreationGuardrails.runtimeRegistration, false);
        assert.equal(body.data.packageCreationGuardrails.localFileWrites, false);
        assert.equal(body.data.packageCreationGuardrails.packageCreated, false);
        assert.equal(body.data.packageCreationGuardrails.workspaceMutation, false);
        assert.equal(body.data.packageCreationGuardrails.scriptRunnable, false);
        assert.equal(body.data.packageFileTemplates.templateVersion, "P25.29");
        assert.equal(body.data.packageFileTemplates.dispatch, false);
        assert.equal(body.data.packageFileTemplates.networkDispatch, false);
        assert.equal(body.data.packageFileTemplates.runtimeRegistration, false);
        assert.equal(body.data.packageFileTemplates.localFileWrites, false);
        assert.equal(body.data.packageFileTemplates.packageCreated, false);
        assert.equal(body.data.packageFileTemplates.workspaceMutation, false);
        assert.equal(body.data.packageFileTemplates.fileMaterialization, false);
        assert.equal(body.data.packageWorkspaceWiring.wiringVersion, "P25.30");
        assert.equal(body.data.packageWorkspaceWiring.dispatch, false);
        assert.equal(body.data.packageWorkspaceWiring.networkDispatch, false);
        assert.equal(body.data.packageWorkspaceWiring.runtimeRegistration, false);
        assert.equal(body.data.packageWorkspaceWiring.localFileWrites, false);
        assert.equal(body.data.packageWorkspaceWiring.workspaceMutation, false);
        assert.equal(body.data.packageWorkspaceWiring.lockfileMutation, false);
        assert.equal(body.data.packageWorkspaceWiring.pnpmWorkspaceMutation, false);
        assert.equal(body.data.packageBuildVerification.verificationVersion, "P25.31");
        assert.equal(body.data.packageBuildVerification.dispatch, false);
        assert.equal(body.data.packageBuildVerification.networkDispatch, false);
        assert.equal(body.data.packageBuildVerification.runtimeRegistration, false);
        assert.equal(body.data.packageBuildVerification.localFileWrites, false);
        assert.equal(body.data.packageBuildVerification.processSpawn, false);
        assert.equal(body.data.packageBuildVerification.commandExecution, false);
        assert.equal(body.data.packageBuildVerification.buildOutput, false);
        assert.equal(body.data.packageMaterializationChecklist.checklistVersion, "P25.32");
        assert.equal(body.data.packageMaterializationChecklist.dispatch, false);
        assert.equal(body.data.packageMaterializationChecklist.networkDispatch, false);
        assert.equal(body.data.packageMaterializationChecklist.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationChecklist.localFileWrites, false);
        assert.equal(body.data.packageMaterializationChecklist.fileMaterialization, false);
        assert.equal(body.data.packageMaterializationChecklist.materializationApproved, false);
        assert.equal(body.data.packageCreationDryRunSummary.summaryVersion, "P25.33");
        assert.equal(body.data.packageCreationDryRunSummary.dryRunOnly, true);
        assert.equal(body.data.packageCreationDryRunSummary.dispatch, false);
        assert.equal(body.data.packageCreationDryRunSummary.runtimeRegistration, false);
        assert.equal(body.data.packageCreationDryRunSummary.localFileWrites, false);
        assert.equal(body.data.packageCreationDryRunSummary.filesWritten, false);
        assert.equal(body.data.packageCreationFileManifest.manifestVersion, "P25.34");
        assert.equal(body.data.packageCreationFileManifest.dryRunOnly, true);
        assert.equal(body.data.packageCreationFileManifest.dispatch, false);
        assert.equal(body.data.packageCreationFileManifest.runtimeRegistration, false);
        assert.equal(body.data.packageCreationFileManifest.localFileWrites, false);
        assert.equal(body.data.packageCreationFileManifest.fileMaterialization, false);
        assert.equal(body.data.packageCreationFileManifest.filesWritten, false);
        assert.ok(body.data.packageCreationFileManifest.files.some((entry: any) => entry.path === "renderer-service/src/noop-host.ts" && entry.writesFile === false));
        assert.ok(body.data.packageCreationFileManifest.workspaceFiles.some((entry: any) => entry.path === "pnpm-lock.yaml" && entry.mutateNow === false));
        assert.equal(body.data.packageMaterializationApprovalGate.gateVersion, "P25.35");
        assert.equal(body.data.packageMaterializationApprovalGate.approvalRequired, true);
        assert.equal(body.data.packageMaterializationApprovalGate.approved, false);
        assert.equal(body.data.packageMaterializationApprovalGate.dispatch, false);
        assert.equal(body.data.packageMaterializationApprovalGate.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationApprovalGate.localFileWrites, false);
        assert.equal(body.data.packageMaterializationApprovalGate.fileMaterialization, false);
        assert.equal(body.data.packageMaterializationApprovalGate.materializationApproved, false);
        assert.ok(body.data.packageMaterializationApprovalGate.approvalInputs.some((entry: any) => entry.id === "explicit-user-approval" && entry.satisfied === false));
        assert.equal(body.data.packageMaterializationApprovalGate.approvalDecision.canMaterialize, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
        assert.equal(body.data.packageMaterializationExecutionDryRun.dryRunOnly, true);
        assert.equal(body.data.packageMaterializationExecutionDryRun.executeNow, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.approved, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.dispatch, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.localFileWrites, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.fileMaterialization, false);
        assert.equal(body.data.packageMaterializationExecutionDryRun.filesWritten, false);
        assert.ok(body.data.packageMaterializationExecutionDryRun.dryRunPlan.steps.some((entry: any) => entry.id === "write-package-files" && entry.executed === false));
        assert.equal(body.data.packageMaterializationWriteContract.contractVersion, "P25.37");
        assert.equal(body.data.packageMaterializationWriteContract.dryRunOnly, true);
        assert.equal(body.data.packageMaterializationWriteContract.executeNow, false);
        assert.equal(body.data.packageMaterializationWriteContract.approved, false);
        assert.equal(body.data.packageMaterializationWriteContract.dispatch, false);
        assert.equal(body.data.packageMaterializationWriteContract.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationWriteContract.localFileWrites, false);
        assert.equal(body.data.packageMaterializationWriteContract.fileMaterialization, false);
        assert.equal(body.data.packageMaterializationWriteContract.filesWritten, false);
        assert.ok(body.data.packageMaterializationWriteContract.writeContract.packageFiles.some((entry: any) => entry.path === "renderer-service/package.json" && entry.writeNow === false));
        assert.ok(body.data.packageMaterializationWriteContract.writeContract.workspaceFiles.some((entry: any) => entry.path === "pnpm-lock.yaml" && entry.writeNow === false));
        assert.equal(body.data.packageMaterializationWriteContract.integrityPlan.writeNow, false);
        assert.equal(body.data.packageMaterializationWriteContract.rollbackContract.writeNow, false);
        assert.equal(body.data.packageMaterializationRollbackContract.contractVersion, "P25.38");
        assert.equal(body.data.packageMaterializationRollbackContract.dryRunOnly, true);
        assert.equal(body.data.packageMaterializationRollbackContract.executeNow, false);
        assert.equal(body.data.packageMaterializationRollbackContract.rollbackNow, false);
        assert.equal(body.data.packageMaterializationRollbackContract.approved, false);
        assert.equal(body.data.packageMaterializationRollbackContract.dispatch, false);
        assert.equal(body.data.packageMaterializationRollbackContract.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationRollbackContract.localFileWrites, false);
        assert.equal(body.data.packageMaterializationRollbackContract.fileMaterialization, false);
        assert.equal(body.data.packageMaterializationRollbackContract.filesWritten, false);
        assert.equal(body.data.packageMaterializationRollbackContract.rollbackExecuted, false);
        assert.ok(body.data.packageMaterializationRollbackContract.snapshotPlan.workspaceFiles.includes("pnpm-lock.yaml"));
        assert.ok(body.data.packageMaterializationRollbackContract.rollbackPlan.phases.some((entry: any) => entry.id === "restore-workspace-files" && entry.executesNow === false));
        assert.equal(body.data.packageMaterializationRollbackContract.verificationPlan.verifyNow, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
        assert.equal(body.data.packageMaterializationVerificationManifest.dryRunOnly, true);
        assert.equal(body.data.packageMaterializationVerificationManifest.executeNow, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.verifyNow, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.approved, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.dispatch, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.localFileWrites, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.commandExecution, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.buildOutput, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.filesWritten, false);
        assert.ok(body.data.packageMaterializationVerificationManifest.verificationManifest.packageFiles.some((entry: any) => entry.path === "renderer-service/package.json" && entry.verifyNow === false));
        assert.ok(body.data.packageMaterializationVerificationManifest.verificationManifest.workspaceFiles.some((entry: any) => entry.path === "pnpm-lock.yaml" && entry.verifyNow === false));
        assert.equal(body.data.packageMaterializationVerificationManifest.commandManifest.commandsRun, false);
        assert.equal(body.data.packageMaterializationVerificationManifest.readinessDecision.canEnableRuntimeDispatch, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.dryRunOnly, true);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.executeNow, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.approved, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.dispatch, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.localFileWrites, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.commandExecution, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.buildOutput, false);
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.filesWritten, false);
        assert.ok(body.data.packageMaterializationFinalApprovalChecklist.checklist.some((entry: any) => entry.id === "explicit-user-approval" && entry.satisfied === false));
        assert.ok(body.data.packageMaterializationFinalApprovalChecklist.approvalScope.workspaceFiles.includes("pnpm-lock.yaml"));
        assert.equal(body.data.packageMaterializationFinalApprovalChecklist.approvalDecision.canGrantFinalApproval, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.tokenProvided, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.approved, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.commandExecution, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.buildOutput, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.filesWritten, false);
        assert.equal(body.data.packageMaterializationExplicitApprovalToken.approvalDecision.canAcceptToken, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.writeAuditNow, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.approved, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalAuditTrail.approvalDecision.canWriteAuditRecord, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.tokenConsumed, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.approved, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalReplayGuard.replayDecision.canCheckReplay, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalExpiryPolicy.expiryDecision.canCheckExpiry, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.revocationRegistryFetched, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.revocationStatusTrusted, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalRevocationPolicy.revocationDecision.canCheckRevocation, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashComputed, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.fileSnapshotRead, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.workspaceHashComputed, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canBindScope, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPrompted, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationStored, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorIdentityVerified, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.confirmationTokenIssued, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationDecision.canPromptOperator, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion, "P25.48");
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecked, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopFetched, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateRead, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateTrusted, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.stopRegistryFetched, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.stopStatusTrusted, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canCheckEmergencyStop, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictVersion, "P25.49");
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictComputed, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictStored, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictTrusted, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessInputsValidated, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessBlockersEvaluated, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.materializationReady, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.tokenAccepted, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.tokenValidated, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.approved, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.finalApprovalGranted, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictDecision.canComputeVerdict, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffVersion, "P25.50");
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffPrepared, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffQueued, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffStored, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffValidated, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobCreated, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobQueued, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobDispatched, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.materializationReady, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.materializationApproved, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.dispatch, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.localFileWrites, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canPrepareHandoff, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canCreateExecutionJob, false);
        assert.equal(body.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canDispatchExecution, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditVersion, "P25.51");
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordPrepared, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordValidated, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordStored, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordWritten, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.handoffSnapshotCaptured, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.executionJobSnapshotCaptured, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.materializationReady, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.materializationApproved, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.dispatch, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.runtimeRegistration, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.localFileWrites, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.commandExecution, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.buildOutput, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.filesWritten, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canPrepareAudit, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canWriteAudit, false);
        assert.equal(body.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canDispatchExecution, false);
        assertAuditRetentionPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditRetentionPolicy);
        assertAuditAccessPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditAccessPolicy);
        assertAuditIntegrityPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditIntegrityPolicy);
        assertAuditProvenancePolicyMetadataOnly(body.data.packageMaterializationApprovalAuditProvenancePolicy);
        assertAuditCustodyPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditCustodyPolicy);
        assertAuditEvidencePolicyMetadataOnly(body.data.packageMaterializationApprovalAuditEvidencePolicy);
        assertAuditAttestationPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditAttestationPolicy);
        assertAuditNotarizationPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditNotarizationPolicy);
        assertAuditCertificationPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditCertificationPolicy);
        assertAuditEndorsementPolicyMetadataOnly(body.data.packageMaterializationApprovalAuditEndorsementPolicy);
        assertAuditCountersignaturePolicyMetadataOnly(body.data.packageMaterializationApprovalAuditCountersignaturePolicy);
        assertAuditCountersignatureVerificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assert.deepEqual(body.data.service.client, body.data.client);
        assert.equal(body.data.service.responseNormalization.successStatus, "ok");
        assert.equal(body.data.service.responseNormalization.localFileWrites, false);
        assert.equal(body.data.service.errorShape.code, "renderer_service_error");
        assert.equal(body.data.clientRequest.dispatch, false);
        assert.equal(body.data.clientRequest.headers["x-penpot-entrypoint"], "mcp");
        assert.equal(body.data.clientRequest.headers["x-penpot-mcp-tool"], "render.thumbnail");
        assert.equal(body.data.clientRequest.headers["x-penpot-mcp-session"], "session-1");
        assert.equal(body.data.clientRequest.authForwarding.tokenValuesIncluded, false);
        assert.equal(body.data.serviceRequest.operation, "thumbnail.render");
        assert.equal(body.data.serviceRequest.target.objectKey, `${UUIDS.file}/${UUIDS.page}/${UUIDS.object}/cover`);
        assert.equal(body.data.serviceRequest.artifact.width, 320);
        assert.equal(body.data.serviceRequest.backendRpc.data.command, "get-file-frame-data-for-thumbnail");
        assert.equal(body.data.serviceRequest.backendRpc.persist.command, "create-file-object-thumbnail");
        assert.deepEqual(body.data.requires, []);
        assert.equal(body.data.diagnostics.mcpToolRegistered, true);
        assert.equal(body.data.diagnostics.runtimeExecutionRegistered, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("RenderThumbnailTool execution reports renderer service unavailable without network calls", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    let sseCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("render.thumbnail unavailable path must not call fetch");
    };

    try {
        const tool = new RenderThumbnailTool(
            mcpServerWithSse(async () => {
                sseCalled = true;
                throw new Error("render.thumbnail unavailable path must not call backend SSE");
            })
        );

        const response = await tool.execute({
            fileId: UUIDS.file,
            dryRun: false,
        });
        const body = parseJsonResponse(response);

        assert.equal(fetchCalled, false);
        assert.equal(sseCalled, false);
        assert.equal(body.status, "error");
        assert.equal(body.error.code, "renderer_service_unavailable");
        assert.equal(body.error.data.command, CommandDescriptors.RENDER_THUMBNAIL.id);
        assert.equal(body.error.data.adapter, "renderer-service");
        assert.equal(body.error.data.client.configured, false);
        assert.equal(body.error.data.availability.status, "not-configured");
        assert.equal(body.error.data.availability.networkProbe, false);
        assert.equal(body.error.data.optInConfiguration.status, "planned-disabled");
        assert.equal(body.error.data.optInConfiguration.resolution.configured, false);
        assert.equal(body.error.data.executionGate.status, "closed");
        assert.ok(body.error.data.executionGate.blockers.includes("renderer-service-endpoint"));
        assert.equal(body.error.data.healthPreflight.dispatch, false);
        assert.equal(body.error.data.executionClientHarness.dispatch, false);
        assert.equal(body.error.data.dispatchAdapterBoundary.dispatch, false);
        assert.equal(body.error.data.unavailableErrorTaxonomy.taxonomyVersion, "P25.17");
        assert.equal(body.error.data.unavailableErrorTaxonomy.dispatch, false);
        assert.equal(body.error.data.unavailableErrorTaxonomy.defaultCode, "renderer_service_unavailable");
        assert.equal(body.error.data.integrationFixtureHarness.harnessVersion, "P25.18");
        assert.equal(body.error.data.integrationFixtureHarness.dispatch, false);
        assert.equal(body.error.data.integrationFixtureHarness.networkDispatch, false);
        assert.equal(body.error.data.dispatchRegistrationPreflight.preflightVersion, "P25.19");
        assert.equal(body.error.data.dispatchRegistrationPreflight.dispatch, false);
        assert.equal(body.error.data.dispatchRegistrationPreflight.runtimeRegistration, false);
        assert.equal(body.error.data.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
        assert.equal(body.error.data.executableAdapterRegistrationScaffold.dispatch, false);
        assert.equal(body.error.data.executableAdapterRegistrationScaffold.networkDispatch, false);
        assert.equal(body.error.data.executableAdapterRegistrationScaffold.runtimeRegistration, false);
        assert.equal(body.error.data.executableAdapterRegistrationScaffold.localFileWrites, false);
        assert.equal(body.error.data.adapterRegistryManifest.manifestVersion, "P25.21");
        assert.equal(body.error.data.adapterRegistryManifest.dispatch, false);
        assert.equal(body.error.data.adapterRegistryManifest.networkDispatch, false);
        assert.equal(body.error.data.adapterRegistryManifest.runtimeRegistration, false);
        assert.equal(body.error.data.adapterRegistryManifest.localFileWrites, false);
        assert.equal(body.error.data.enablementChecklist.checklistVersion, "P25.22");
        assert.equal(body.error.data.enablementChecklist.dispatch, false);
        assert.equal(body.error.data.enablementChecklist.networkDispatch, false);
        assert.equal(body.error.data.enablementChecklist.runtimeRegistration, false);
        assert.equal(body.error.data.enablementChecklist.localFileWrites, false);
        assert.equal(body.error.data.implementationSliceAudit.auditVersion, "P25.23");
        assert.equal(body.error.data.implementationSliceAudit.dispatch, false);
        assert.equal(body.error.data.implementationSliceAudit.networkDispatch, false);
        assert.equal(body.error.data.implementationSliceAudit.runtimeRegistration, false);
        assert.equal(body.error.data.implementationSliceAudit.localFileWrites, false);
        assert.equal(body.error.data.implementationSliceAudit.selectedSlice.enablesRuntimeDispatch, false);
        assert.equal(body.error.data.healthNoopContractFixtures.fixtureVersion, "P25.24");
        assert.equal(body.error.data.healthNoopContractFixtures.dispatch, false);
        assert.equal(body.error.data.healthNoopContractFixtures.networkDispatch, false);
        assert.equal(body.error.data.healthNoopContractFixtures.runtimeRegistration, false);
        assert.equal(body.error.data.healthNoopContractFixtures.localFileWrites, false);
        assert.equal(body.error.data.healthNoopContractFixtures.noopRenderContract.response.body.resource, null);
        assert.equal(body.error.data.noopServiceHostScaffold.scaffoldVersion, "P25.25");
        assert.equal(body.error.data.noopServiceHostScaffold.dispatch, false);
        assert.equal(body.error.data.noopServiceHostScaffold.networkDispatch, false);
        assert.equal(body.error.data.noopServiceHostScaffold.runtimeRegistration, false);
        assert.equal(body.error.data.noopServiceHostScaffold.localFileWrites, false);
        assert.equal(body.error.data.noopServiceHostScaffold.hostStartup, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
        assert.equal(body.error.data.hostLifecycleTestFixtures.dispatch, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.networkDispatch, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.runtimeRegistration, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.localFileWrites, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.hostStartup, false);
        assert.equal(body.error.data.hostLifecycleTestFixtures.processSpawn, false);
        assert.equal(body.error.data.packageManifestScaffold.manifestVersion, "P25.27");
        assert.equal(body.error.data.packageManifestScaffold.dispatch, false);
        assert.equal(body.error.data.packageManifestScaffold.networkDispatch, false);
        assert.equal(body.error.data.packageManifestScaffold.runtimeRegistration, false);
        assert.equal(body.error.data.packageManifestScaffold.localFileWrites, false);
        assert.equal(body.error.data.packageManifestScaffold.packageCreated, false);
        assert.equal(body.error.data.packageManifestScaffold.workspaceMutation, false);
        assert.equal(body.error.data.packageCreationGuardrails.guardrailVersion, "P25.28");
        assert.equal(body.error.data.packageCreationGuardrails.dispatch, false);
        assert.equal(body.error.data.packageCreationGuardrails.networkDispatch, false);
        assert.equal(body.error.data.packageCreationGuardrails.runtimeRegistration, false);
        assert.equal(body.error.data.packageCreationGuardrails.localFileWrites, false);
        assert.equal(body.error.data.packageCreationGuardrails.packageCreated, false);
        assert.equal(body.error.data.packageCreationGuardrails.workspaceMutation, false);
        assert.equal(body.error.data.packageCreationGuardrails.scriptRunnable, false);
        assert.equal(body.error.data.packageFileTemplates.templateVersion, "P25.29");
        assert.equal(body.error.data.packageFileTemplates.dispatch, false);
        assert.equal(body.error.data.packageFileTemplates.networkDispatch, false);
        assert.equal(body.error.data.packageFileTemplates.runtimeRegistration, false);
        assert.equal(body.error.data.packageFileTemplates.localFileWrites, false);
        assert.equal(body.error.data.packageFileTemplates.packageCreated, false);
        assert.equal(body.error.data.packageFileTemplates.workspaceMutation, false);
        assert.equal(body.error.data.packageFileTemplates.fileMaterialization, false);
        assert.equal(body.error.data.packageWorkspaceWiring.wiringVersion, "P25.30");
        assert.equal(body.error.data.packageWorkspaceWiring.dispatch, false);
        assert.equal(body.error.data.packageWorkspaceWiring.networkDispatch, false);
        assert.equal(body.error.data.packageWorkspaceWiring.runtimeRegistration, false);
        assert.equal(body.error.data.packageWorkspaceWiring.localFileWrites, false);
        assert.equal(body.error.data.packageWorkspaceWiring.workspaceMutation, false);
        assert.equal(body.error.data.packageWorkspaceWiring.lockfileMutation, false);
        assert.equal(body.error.data.packageWorkspaceWiring.pnpmWorkspaceMutation, false);
        assert.equal(body.error.data.packageBuildVerification.verificationVersion, "P25.31");
        assert.equal(body.error.data.packageBuildVerification.dispatch, false);
        assert.equal(body.error.data.packageBuildVerification.networkDispatch, false);
        assert.equal(body.error.data.packageBuildVerification.runtimeRegistration, false);
        assert.equal(body.error.data.packageBuildVerification.localFileWrites, false);
        assert.equal(body.error.data.packageBuildVerification.processSpawn, false);
        assert.equal(body.error.data.packageBuildVerification.commandExecution, false);
        assert.equal(body.error.data.packageBuildVerification.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationChecklist.checklistVersion, "P25.32");
        assert.equal(body.error.data.packageMaterializationChecklist.dispatch, false);
        assert.equal(body.error.data.packageMaterializationChecklist.networkDispatch, false);
        assert.equal(body.error.data.packageMaterializationChecklist.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationChecklist.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationChecklist.fileMaterialization, false);
        assert.equal(body.error.data.packageMaterializationChecklist.materializationApproved, false);
        assert.equal(body.error.data.packageCreationDryRunSummary.summaryVersion, "P25.33");
        assert.equal(body.error.data.packageCreationDryRunSummary.dryRunOnly, true);
        assert.equal(body.error.data.packageCreationDryRunSummary.dispatch, false);
        assert.equal(body.error.data.packageCreationDryRunSummary.runtimeRegistration, false);
        assert.equal(body.error.data.packageCreationDryRunSummary.localFileWrites, false);
        assert.equal(body.error.data.packageCreationDryRunSummary.filesWritten, false);
        assert.equal(body.error.data.packageCreationFileManifest.manifestVersion, "P25.34");
        assert.equal(body.error.data.packageCreationFileManifest.dryRunOnly, true);
        assert.equal(body.error.data.packageCreationFileManifest.dispatch, false);
        assert.equal(body.error.data.packageCreationFileManifest.runtimeRegistration, false);
        assert.equal(body.error.data.packageCreationFileManifest.localFileWrites, false);
        assert.equal(body.error.data.packageCreationFileManifest.fileMaterialization, false);
        assert.equal(body.error.data.packageCreationFileManifest.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.gateVersion, "P25.35");
        assert.equal(body.error.data.packageMaterializationApprovalGate.approvalRequired, true);
        assert.equal(body.error.data.packageMaterializationApprovalGate.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.dispatch, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.fileMaterialization, false);
        assert.equal(body.error.data.packageMaterializationApprovalGate.materializationApproved, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.dryRunOnly, true);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.executeNow, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.approved, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.dispatch, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.fileMaterialization, false);
        assert.equal(body.error.data.packageMaterializationExecutionDryRun.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.contractVersion, "P25.37");
        assert.equal(body.error.data.packageMaterializationWriteContract.dryRunOnly, true);
        assert.equal(body.error.data.packageMaterializationWriteContract.executeNow, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.approved, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.dispatch, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.fileMaterialization, false);
        assert.equal(body.error.data.packageMaterializationWriteContract.filesWritten, false);
        assert.ok(body.error.data.packageMaterializationWriteContract.writeContract.packageFiles.some((entry: any) => entry.path === "renderer-service/package.json" && entry.writeNow === false));
        assert.ok(body.error.data.packageMaterializationWriteContract.writeContract.workspaceFiles.some((entry: any) => entry.path === "pnpm-lock.yaml" && entry.writeNow === false));
        assert.equal(body.error.data.packageMaterializationRollbackContract.contractVersion, "P25.38");
        assert.equal(body.error.data.packageMaterializationRollbackContract.dryRunOnly, true);
        assert.equal(body.error.data.packageMaterializationRollbackContract.executeNow, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.rollbackNow, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.approved, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.dispatch, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.fileMaterialization, false);
        assert.equal(body.error.data.packageMaterializationRollbackContract.filesWritten, false);
        assert.ok(body.error.data.packageMaterializationRollbackContract.snapshotPlan.workspaceFiles.includes("pnpm-lock.yaml"));
        assert.ok(body.error.data.packageMaterializationRollbackContract.rollbackPlan.phases.some((entry: any) => entry.id === "restore-workspace-files" && entry.executesNow === false));
        assert.equal(body.error.data.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
        assert.equal(body.error.data.packageMaterializationVerificationManifest.dryRunOnly, true);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.executeNow, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.verifyNow, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.approved, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.dispatch, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationVerificationManifest.filesWritten, false);
        assert.ok(body.error.data.packageMaterializationVerificationManifest.verificationManifest.workspaceFiles.some((entry: any) => entry.path === "pnpm-lock.yaml" && entry.verifyNow === false));
        assert.equal(body.error.data.packageMaterializationVerificationManifest.commandManifest.commandsRun, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.dryRunOnly, true);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.executeNow, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.approved, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.dispatch, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.filesWritten, false);
        assert.ok(body.error.data.packageMaterializationFinalApprovalChecklist.checklist.some((entry: any) => entry.id === "explicit-user-approval" && entry.satisfied === false));
        assert.equal(body.error.data.packageMaterializationFinalApprovalChecklist.approvalDecision.canGrantFinalApproval, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.tokenProvided, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.approved, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationExplicitApprovalToken.approvalDecision.canAcceptToken, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.writeAuditNow, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalAuditTrail.approvalDecision.canWriteAuditRecord, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.tokenConsumed, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalReplayGuard.replayDecision.canCheckReplay, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalExpiryPolicy.expiryDecision.canCheckExpiry, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.revocationRegistryFetched, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.revocationStatusTrusted, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalRevocationPolicy.revocationDecision.canCheckRevocation, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashComputed, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.fileSnapshotRead, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.workspaceHashComputed, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canBindScope, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPrompted, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationStored, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorIdentityVerified, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.confirmationTokenIssued, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationDecision.canPromptOperator, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion, "P25.48");
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecked, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopFetched, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateRead, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateTrusted, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.stopRegistryFetched, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.stopStatusTrusted, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canCheckEmergencyStop, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictVersion, "P25.49");
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictComputed, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictStored, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictTrusted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessInputsValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessBlockersEvaluated, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.materializationReady, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.tokenAccepted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.tokenValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.approved, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.finalApprovalGranted, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictDecision.canComputeVerdict, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffVersion, "P25.50");
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffPrepared, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffQueued, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffStored, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.handoffValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobCreated, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobQueued, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionJobDispatched, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.materializationReady, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.materializationApproved, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.dispatch, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canPrepareHandoff, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canCreateExecutionJob, false);
        assert.equal(body.error.data.packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffDecision.canDispatchExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditVersion, "P25.51");
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordPrepared, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordValidated, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordStored, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.handoffSnapshotCaptured, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.executionJobSnapshotCaptured, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.materializationReady, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.materializationApproved, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.dispatch, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.runtimeRegistration, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.localFileWrites, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.commandExecution, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.buildOutput, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.filesWritten, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canPrepareAudit, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canWriteAudit, false);
        assert.equal(body.error.data.packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditDecision.canDispatchExecution, false);
        assertAuditRetentionPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditRetentionPolicy);
        assertAuditAccessPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditAccessPolicy);
        assertAuditIntegrityPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditIntegrityPolicy);
        assertAuditProvenancePolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditProvenancePolicy);
        assertAuditCustodyPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditCustodyPolicy);
        assertAuditEvidencePolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditEvidencePolicy);
        assertAuditAttestationPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditAttestationPolicy);
        assertAuditNotarizationPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditNotarizationPolicy);
        assertAuditCertificationPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditCertificationPolicy);
        assertAuditEndorsementPolicyMetadataOnly(body.error.data.packageMaterializationApprovalAuditEndorsementPolicy);
        assertAuditCountersignaturePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignaturePolicy
        );
        assertAuditCountersignatureVerificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assert.equal(body.error.data.clientRequest.dispatch, false);
        assert.equal(body.error.data.serviceRequest.operation, "thumbnail.render");
        assert.deepEqual(body.error.data.requiredCapabilities, ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("RenderThumbnailTool rejects unavailable adapters and incomplete frame targets", async () => {
    let sseCalled = false;
    const tool = new RenderThumbnailTool(
        mcpServerWithSse(async () => {
            sseCalled = true;
            return [];
        })
    );

    const unsupportedAdapter = parseJsonResponse(
        await tool.execute({
            fileId: UUIDS.file,
            adapter: "exporter",
        })
    );
    const missingObject = parseJsonResponse(
        await tool.execute({
            fileId: UUIDS.file,
            target: "frame",
            pageId: UUIDS.page,
        })
    );

    assert.equal(sseCalled, false);
    assert.equal(unsupportedAdapter.status, "error");
    assert.equal(unsupportedAdapter.error.code, "adapter_not_available");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.command, "render.thumbnail");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.requested, "exporter");
    assert.equal(missingObject.status, "error");
    assert.equal(missingObject.error.code, "object_id_required");
    assert.deepEqual(missingObject.error.data.requires, ["objectId"]);
});
