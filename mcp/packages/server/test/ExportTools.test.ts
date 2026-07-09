import assert from "node:assert/strict";
import test from "node:test";
import { CommandDescriptors, CommandErrorCodes } from "@penpot/command-runtime";
import { FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotRpcRequestContext, PenpotSseEvent } from "../src/PenpotRpcClient.js";
import { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ExportFileTool, RenderPreviewTool, RenderThumbnailTool } from "../src/tools/ExportTools.js";

function assertP25112RevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    const capitalEnforcementTopic = P25111_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const enforcementTopic = capitalEnforcementTopic[0].toLowerCase() + capitalEnforcementTopic.slice(1);
    const capitalResolutionTopic = capitalEnforcementTopic.replace(/Enforcement$/, "");
    const resolutionTopic = capitalResolutionTopic[0].toLowerCase() + capitalResolutionTopic.slice(1);
    const capitalEvidenceTopic = capitalEnforcementTopic + "Evidence";
    const evidenceTopic = enforcementTopic + "Evidence";
    const auditEnforcementTopic = "audit" + capitalEnforcementTopic;
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", evidenceTopic + "Required", evidenceTopic + "Planned"]);

    assert.ok(policy, "P25.112 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEvidenceTopic + "Version"], "P25.112");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[evidenceTopic + "Required"], true);
    assert.equal(policy[evidenceTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25111_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25111_POLICY_KEY][auditEnforcementTopic + "Version"], "P25.111");
    assert.equal(policy.consumes[P25111_POLICY_KEY][resolutionTopic + "Enforced"], false);
    assert.equal(policy.consumes[P25111_POLICY_KEY][enforcementTopic + "RecordStored"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const evidencePolicy = policy[auditEvidenceTopic + "Policy"];
    assert.equal(evidencePolicy.policy.startsWith("collect-"), true);
    assert.equal(evidencePolicy.policy.endsWith("after-enforcement-policy-defined"), true);
    assert.equal(evidencePolicy[evidenceTopic + "PayloadLogged"], false);
    assert.equal(evidencePolicy[evidenceTopic + "Scope"], "future-policy-defined");
    assert.ok(evidencePolicy.requiredInputs.includes(enforcementTopic + "Record"));
    assert.ok(evidencePolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(evidencePolicy.requiredInputs.includes(evidenceTopic + "PolicyId"));
    assert.ok(evidencePolicy.requiredInputs.includes("trusted" + capitalEvidenceTopic + "Source"));

    assert.ok(policy[auditEvidenceTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[auditEvidenceTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canCollect" + capitalEvidenceTopic], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canStore" + capitalEvidenceTopic + "Record"], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not collect, validate, or normalize evidence")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read appeal resolution enforcement records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25113RevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    const capitalEvidenceTopic = P25112_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const evidenceTopic = capitalEvidenceTopic[0].toLowerCase() + capitalEvidenceTopic.slice(1);
    const capitalAttestationTopic = capitalEvidenceTopic + "Attestation";
    const attestationTopic = evidenceTopic + "Attestation";
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", attestationTopic + "Required", attestationTopic + "Planned"]);

    assert.ok(policy, "P25.113 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditAttestationTopic + "Version"], "P25.113");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[attestationTopic + "Required"], true);
    assert.equal(policy[attestationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25112_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25112_POLICY_KEY][auditEvidenceTopic + "Version"], "P25.112");
    assert.equal(policy.consumes[P25112_POLICY_KEY][evidenceTopic + "RecordCreated"], false);
    assert.equal(policy.consumes[P25112_POLICY_KEY][evidenceTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25112_POLICY_KEY][evidenceTopic + "BundleStored"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const attestationPolicy = policy[auditAttestationTopic + "Policy"];
    assert.equal(attestationPolicy.policy.startsWith("attest-"), true);
    assert.equal(attestationPolicy.policy.endsWith("after-evidence-record-defined"), true);
    assert.equal(attestationPolicy[attestationTopic + "PayloadLogged"], false);
    assert.equal(attestationPolicy[attestationTopic + "Scope"], "future-policy-defined");
    assert.ok(attestationPolicy.requiredInputs.includes(evidenceTopic + "Record"));
    assert.ok(attestationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(attestationPolicy.requiredInputs.includes(attestationTopic + "PolicyId"));
    assert.ok(attestationPolicy.requiredInputs.includes("trusted" + capitalAttestationTopic + "Authority"));

    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.equal(policy[auditAttestationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditAttestationTopic + "Decision"]["canCreate" + capitalAttestationTopic], false);
    assert.equal(policy[auditAttestationTopic + "Decision"]["canRead" + capitalEvidenceTopic + "Record"], false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish attestations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, attest, or verify evidence records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25114RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    const capitalAttestationTopic = P25113_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const attestationTopic = capitalAttestationTopic[0].toLowerCase() + capitalAttestationTopic.slice(1);
    const capitalNotarizationTopic = capitalAttestationTopic + "Notarization";
    const notarizationTopic = attestationTopic + "Notarization";
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const auditNotarizationTopic = "audit" + capitalNotarizationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", notarizationTopic + "Required", notarizationTopic + "Planned"]);

    assert.ok(policy, "P25.114 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditNotarizationTopic + "Version"], "P25.114");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[notarizationTopic + "Required"], true);
    assert.equal(policy[notarizationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25113_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25113_POLICY_KEY][auditAttestationTopic + "Version"], "P25.113");
    assert.equal(policy.consumes[P25113_POLICY_KEY][attestationTopic + "Created"], false);
    assert.equal(policy.consumes[P25113_POLICY_KEY][attestationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25113_POLICY_KEY][attestationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25113_POLICY_KEY][attestationTopic + "Notarized"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const notarizationPolicy = policy[auditNotarizationTopic + "Policy"];
    assert.equal(notarizationPolicy.policy.startsWith("notarize-"), true);
    assert.equal(notarizationPolicy.policy.endsWith("after-attestation-record-defined"), true);
    assert.equal(notarizationPolicy[notarizationTopic + "PayloadLogged"], false);
    assert.equal(notarizationPolicy[notarizationTopic + "Scope"], "future-policy-defined");
    assert.ok(notarizationPolicy.requiredInputs.includes(attestationTopic + "Record"));
    assert.ok(notarizationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(notarizationPolicy.requiredInputs.includes(notarizationTopic + "PolicyId"));
    assert.ok(notarizationPolicy.requiredInputs.includes("trusted" + capitalNotarizationTopic + "Authority"));

    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.equal(policy[auditNotarizationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canCreate" + capitalNotarizationTopic], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canRead" + capitalAttestationTopic + "Record"], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish notarizations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, notarize, or verify attestations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25115RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    const capitalNotarizationTopic = P25114_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const notarizationTopic = capitalNotarizationTopic[0].toLowerCase() + capitalNotarizationTopic.slice(1);
    const capitalCertificationTopic = capitalNotarizationTopic + "Certification";
    const certificationTopic = notarizationTopic + "Certification";
    const auditNotarizationTopic = "audit" + capitalNotarizationTopic;
    const auditCertificationTopic = "audit" + capitalCertificationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", certificationTopic + "Required", certificationTopic + "Planned"]);

    assert.ok(policy, "P25.115 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditCertificationTopic + "Version"], "P25.115");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[certificationTopic + "Required"], true);
    assert.equal(policy[certificationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25114_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25114_POLICY_KEY][auditNotarizationTopic + "Version"], "P25.114");
    assert.equal(policy.consumes[P25114_POLICY_KEY][notarizationTopic + "Created"], false);
    assert.equal(policy.consumes[P25114_POLICY_KEY][notarizationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25114_POLICY_KEY][notarizationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25114_POLICY_KEY][notarizationTopic + "Certified"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const certificationPolicy = policy[auditCertificationTopic + "Policy"];
    assert.equal(certificationPolicy.policy.startsWith("certify-"), true);
    assert.equal(certificationPolicy.policy.endsWith("after-notarization-record-defined"), true);
    assert.equal(certificationPolicy[certificationTopic + "PayloadLogged"], false);
    assert.equal(certificationPolicy[certificationTopic + "Scope"], "future-policy-defined");
    assert.ok(certificationPolicy.requiredInputs.includes(notarizationTopic + "Record"));
    assert.ok(certificationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(certificationPolicy.requiredInputs.includes(certificationTopic + "PolicyId"));
    assert.ok(certificationPolicy.requiredInputs.includes("trusted" + capitalCertificationTopic + "Authority"));

    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.equal(policy[auditCertificationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditCertificationTopic + "Decision"]["canCreate" + capitalCertificationTopic], false);
    assert.equal(policy[auditCertificationTopic + "Decision"]["canRead" + capitalNotarizationTopic + "Record"], false);
    assert.equal(policy[auditCertificationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditCertificationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish certifications")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, certify, or verify notarizations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25116RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(policy: any) {
    const capitalCertificationTopic = P25115_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const certificationTopic = capitalCertificationTopic[0].toLowerCase() + capitalCertificationTopic.slice(1);
    const capitalEndorsementTopic = capitalCertificationTopic + "Endorsement";
    const endorsementTopic = certificationTopic + "Endorsement";
    const auditCertificationTopic = "audit" + capitalCertificationTopic;
    const auditEndorsementTopic = "audit" + capitalEndorsementTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", endorsementTopic + "Required", endorsementTopic + "Planned"]);

    assert.ok(policy, "P25.116 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEndorsementTopic + "Version"], "P25.116");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[endorsementTopic + "Required"], true);
    assert.equal(policy[endorsementTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25115_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25115_POLICY_KEY][auditCertificationTopic + "Version"], "P25.115");
    assert.equal(policy.consumes[P25115_POLICY_KEY][certificationTopic + "Created"], false);
    assert.equal(policy.consumes[P25115_POLICY_KEY][certificationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25115_POLICY_KEY][certificationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25115_POLICY_KEY][certificationTopic + "Endorsed"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const endorsementPolicy = policy[auditEndorsementTopic + "Policy"];
    assert.equal(endorsementPolicy.policy.startsWith("endorse-"), true);
    assert.equal(endorsementPolicy.policy.endsWith("after-certification-record-defined"), true);
    assert.equal(endorsementPolicy[endorsementTopic + "PayloadLogged"], false);
    assert.equal(endorsementPolicy[endorsementTopic + "Scope"], "future-policy-defined");
    assert.ok(endorsementPolicy.requiredInputs.includes(certificationTopic + "Record"));
    assert.ok(endorsementPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(endorsementPolicy.requiredInputs.includes(endorsementTopic + "PolicyId"));
    assert.ok(endorsementPolicy.requiredInputs.includes("trusted" + capitalEndorsementTopic + "Authority"));

    assert.ok(policy[auditEndorsementTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditEndorsementTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.equal(policy[auditEndorsementTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canCreate" + capitalEndorsementTopic], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canEndorse" + capitalCertificationTopic], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canRead" + capitalCertificationTopic + "Record"], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEndorsementTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish endorsements")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, endorse, or verify certifications")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25117RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(policy: any) {
    const capitalEndorsementTopic = P25116_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const endorsementTopic = capitalEndorsementTopic[0].toLowerCase() + capitalEndorsementTopic.slice(1);
    const capitalCountersignatureTopic = capitalEndorsementTopic + "Countersignature";
    const countersignatureTopic = endorsementTopic + "Countersignature";
    const capitalCertificationTopic = capitalEndorsementTopic.replace(/Endorsement$/, "");
    const auditEndorsementTopic = "audit" + capitalEndorsementTopic;
    const auditCountersignatureTopic = "audit" + capitalCountersignatureTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", countersignatureTopic + "Required", countersignatureTopic + "Planned"]);

    assert.ok(policy, "P25.117 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditCountersignatureTopic + "Version"], "P25.117");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[countersignatureTopic + "Required"], true);
    assert.equal(policy[countersignatureTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25116_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25116_POLICY_KEY][auditEndorsementTopic + "Version"], "P25.116");
    assert.equal(policy.consumes[P25116_POLICY_KEY][endorsementTopic + "Created"], false);
    assert.equal(policy.consumes[P25116_POLICY_KEY][endorsementTopic + "Stored"], false);
    assert.equal(policy.consumes[P25116_POLICY_KEY][endorsementTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25116_POLICY_KEY][endorsementTopic + "Countersigned"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const countersignaturePolicy = policy[auditCountersignatureTopic + "Policy"];
    assert.equal(countersignaturePolicy.policy.startsWith("countersign-"), true);
    assert.equal(countersignaturePolicy.policy.endsWith("after-endorsement-record-defined"), true);
    assert.equal(countersignaturePolicy[countersignatureTopic + "PayloadLogged"], false);
    assert.equal(countersignaturePolicy[countersignatureTopic + "Scope"], "future-policy-defined");
    assert.ok(countersignaturePolicy.requiredInputs.includes(endorsementTopic + "Record"));
    assert.ok(countersignaturePolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(countersignaturePolicy.requiredInputs.includes(countersignatureTopic + "PolicyId"));
    assert.ok(countersignaturePolicy.requiredInputs.includes("trusted" + capitalCountersignatureTopic + "Authority"));

    assert.ok(policy[auditCountersignatureTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditCountersignatureTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.ok(policy[auditCountersignatureTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditCountersignatureTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditCountersignatureTopic + "Decision"]["canCreate" + capitalCountersignatureTopic], false);
    assert.equal(policy[auditCountersignatureTopic + "Decision"]["canCountersign" + capitalEndorsementTopic], false);
    assert.equal(policy[auditCountersignatureTopic + "Decision"]["canRead" + capitalEndorsementTopic + "Record"], false);
    assert.equal(policy[auditCountersignatureTopic + "Decision"]["canRead" + capitalCertificationTopic + "Record"], false);
    assert.equal(policy[auditCountersignatureTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditCountersignatureTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish countersignatures")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, countersign, or verify endorsements")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25118RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(policy: any) {
    const capitalCountersignatureTopic = P25117_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const countersignatureTopic = capitalCountersignatureTopic[0].toLowerCase() + capitalCountersignatureTopic.slice(1);
    const capitalVerificationTopic = capitalCountersignatureTopic + "Verification";
    const verificationTopic = countersignatureTopic + "Verification";
    const auditCountersignatureTopic = "audit" + capitalCountersignatureTopic;
    const auditVerificationTopic = "audit" + capitalVerificationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", verificationTopic + "Required", verificationTopic + "Planned"]);

    assert.ok(policy, "P25.118 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditVerificationTopic + "Version"], "P25.118");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[verificationTopic + "Required"], true);
    assert.equal(policy[verificationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25117_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25117_POLICY_KEY][auditCountersignatureTopic + "Version"], "P25.117");
    assert.equal(policy.consumes[P25117_POLICY_KEY][countersignatureTopic + "Created"], false);
    assert.equal(policy.consumes[P25117_POLICY_KEY][countersignatureTopic + "Stored"], false);
    assert.equal(policy.consumes[P25117_POLICY_KEY][countersignatureTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25117_POLICY_KEY][countersignatureTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25117_POLICY_KEY][countersignatureTopic + "Verified"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const verificationPolicy = policy[auditVerificationTopic + "Policy"];
    assert.equal(verificationPolicy.policy.startsWith("verify-"), true);
    assert.equal(verificationPolicy.policy.endsWith("after-countersignature-record-defined"), true);
    assert.equal(verificationPolicy[verificationTopic + "PayloadLogged"], false);
    assert.equal(verificationPolicy[verificationTopic + "Scope"], "future-policy-defined");
    assert.ok(verificationPolicy.requiredInputs.includes(countersignatureTopic + "Record"));
    assert.ok(verificationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(verificationPolicy.requiredInputs.includes(verificationTopic + "PolicyId"));
    assert.ok(verificationPolicy.requiredInputs.includes("trusted" + capitalVerificationTopic + "Authority"));

    assert.ok(policy[auditVerificationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditVerificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-executed") && check.executed === false));
    assert.ok(policy[auditVerificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-result-not-stored") && check.executed === false));
    assert.equal(policy[auditVerificationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditVerificationTopic + "Decision"]["canRead" + capitalCountersignatureTopic], false);
    assert.equal(policy[auditVerificationTopic + "Decision"]["canRead" + capitalCountersignatureTopic + "Record"], false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canReadCountersignature, false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canReadCountersignatureRecord, false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canVerifyCountersignatureSignature, false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canComputeCountersignatureHash, false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canMatchCountersignatureHash, false);
    assert.equal(policy[auditVerificationTopic + "Decision"]["canPrepare" + capitalVerificationTopic], false);
    assert.equal(policy[auditVerificationTopic + "Decision"]["canExecute" + capitalVerificationTopic], false);
    assert.equal(policy[auditVerificationTopic + "Decision"]["canStore" + capitalVerificationTopic], false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditVerificationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignatures or countersignature records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, execute, store, or publish countersignature verification results")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25119RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(policy: any) {
    const capitalVerificationTopic = P25118_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const verificationTopic = capitalVerificationTopic[0].toLowerCase() + capitalVerificationTopic.slice(1);
    const capitalRevocationTopic = capitalVerificationTopic + "Revocation";
    const revocationTopic = verificationTopic + "Revocation";
    const capitalCountersignatureTopic = capitalVerificationTopic.replace(/Verification$/, "");
    const auditVerificationTopic = "audit" + capitalVerificationTopic;
    const auditRevocationTopic = "audit" + capitalRevocationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", revocationTopic + "Required", revocationTopic + "Planned"]);

    assert.ok(policy, "P25.119 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditRevocationTopic + "Version"], "P25.119");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[revocationTopic + "Required"], true);
    assert.equal(policy[revocationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25118_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25118_POLICY_KEY][auditVerificationTopic + "Version"], "P25.118");
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "Executed"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "Passed"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "Verified"], false);
    assert.equal(policy.consumes[P25118_POLICY_KEY][verificationTopic + "Revoked"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const revocationPolicy = policy[auditRevocationTopic + "Policy"];
    assert.equal(revocationPolicy.policy.startsWith("revoke-"), true);
    assert.equal(revocationPolicy.policy.endsWith("after-verification-record-defined"), true);
    assert.equal(revocationPolicy[revocationTopic + "PayloadLogged"], false);
    assert.equal(revocationPolicy[revocationTopic + "Scope"], "future-policy-defined");
    assert.ok(revocationPolicy.requiredInputs.includes(verificationTopic + "Record"));
    assert.ok(revocationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(revocationPolicy.requiredInputs.includes(revocationTopic + "PolicyId"));
    assert.ok(revocationPolicy.requiredInputs.includes("trusted" + capitalRevocationTopic + "Authority"));
    assert.ok(revocationPolicy.requiredInputs.includes("revocationReason"));

    assert.ok(policy[auditRevocationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditRevocationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-revoked") && check.executed === false));
    assert.ok(policy[auditRevocationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-created") && check.executed === false));
    assert.ok(policy[auditRevocationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditRevocationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditRevocationTopic + "Decision"]["canSelect" + capitalRevocationTopic + "Policy"], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canCapture" + capitalRevocationTopic + "Reason"], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canExecute" + capitalRevocationTopic], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canRevoke" + capitalVerificationTopic], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canRead" + capitalVerificationTopic], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canRead" + capitalVerificationTopic + "Record"], false);
    assert.equal(policy[auditRevocationTopic + "Decision"]["canRead" + capitalCountersignatureTopic], false);
    assert.equal(policy[auditRevocationTopic + "Decision"].canReadCountersignatureVerification, false);
    assert.equal(policy[auditRevocationTopic + "Decision"].canReadCountersignatureVerificationRecord, false);
    assert.equal(policy[auditRevocationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditRevocationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not capture revocation reasons or compute revocation scopes")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not revoke countersignature verification results")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification results or verification records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}


function assertP25120RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(policy: any) {
    const capitalRevocationTopic = P25119_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const revocationTopic = capitalRevocationTopic[0].toLowerCase() + capitalRevocationTopic.slice(1);
    const capitalAppealTopic = capitalRevocationTopic + "Appeal";
    const appealTopic = revocationTopic + "Appeal";
    const auditRevocationTopic = "audit" + capitalRevocationTopic;
    const auditAppealTopic = "audit" + capitalAppealTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", appealTopic + "Required", appealTopic + "Planned"]);

    assert.ok(policy, "P25.120 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditAppealTopic + "Version"], "P25.120");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[appealTopic + "Required"], true);
    assert.equal(policy[appealTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25119_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25119_POLICY_KEY][auditRevocationTopic + "Version"], "P25.119");
    assert.equal(policy.consumes[P25119_POLICY_KEY][revocationTopic + "Revoked"], false);
    assert.equal(policy.consumes[P25119_POLICY_KEY][revocationTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25119_POLICY_KEY][revocationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25119_POLICY_KEY][revocationTopic + "Appealed"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const appealPolicy = policy[auditAppealTopic + "Policy"];
    assert.equal(appealPolicy.policy.startsWith("appeal-"), true);
    assert.equal(appealPolicy.policy.endsWith("after-revocation-policy-defined"), true);
    assert.equal(appealPolicy[appealTopic + "PayloadLogged"], false);
    assert.equal(appealPolicy[appealTopic + "Scope"], "future-policy-defined");
    assert.ok(appealPolicy.requiredInputs.includes(revocationTopic + "Record"));
    assert.ok(appealPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(appealPolicy.requiredInputs.includes(appealTopic + "PolicyId"));
    assert.ok(appealPolicy.requiredInputs.includes("trusted" + capitalAppealTopic + "Authority"));
    assert.ok(appealPolicy.requiredInputs.includes("appealReason"));

    assert.ok(policy[auditAppealTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditAppealTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-appealed") && check.executed === false));
    assert.ok(policy[auditAppealTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-created") && check.executed === false));
    assert.ok(policy[auditAppealTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditAppealTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditAppealTopic + "Decision"]["canSelect" + capitalAppealTopic + "Policy"], false);
    assert.equal(policy[auditAppealTopic + "Decision"]["canCapture" + capitalAppealTopic + "Reason"], false);
    assert.equal(policy[auditAppealTopic + "Decision"]["canExecute" + capitalAppealTopic], false);
    assert.equal(policy[auditAppealTopic + "Decision"]["canAccept" + capitalAppealTopic], false);
    assert.equal(policy[auditAppealTopic + "Decision"]["canReject" + capitalAppealTopic], false);
    assert.equal(policy[auditAppealTopic + "Decision"]["canAppeal" + capitalRevocationTopic], false);
    assert.equal(policy[auditAppealTopic + "Decision"].canReadCountersignatureVerification, false);
    assert.equal(policy[auditAppealTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditAppealTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not accept, reject, resolve, or enforce countersignature verification revocation appeals")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not collect evidence, attest, notarize, certify, endorse, countersign, verify, or revoke appeal decisions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification revocation, appeal, or verification records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}
function assertP25121RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    const capitalAppealTopic = P25120_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const appealTopic = capitalAppealTopic[0].toLowerCase() + capitalAppealTopic.slice(1);
    const capitalRevocationTopic = capitalAppealTopic.replace(/Appeal$/, "");
    const revocationTopic = appealTopic.replace(/Appeal$/, "");
    const capitalResolutionTopic = capitalAppealTopic + "Resolution";
    const resolutionTopic = appealTopic + "Resolution";
    const auditAppealTopic = "audit" + capitalAppealTopic;
    const auditResolutionTopic = "audit" + capitalResolutionTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", resolutionTopic + "Required", resolutionTopic + "Planned"]);

    assert.ok(policy, "P25.121 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditResolutionTopic + "Version"], "P25.121");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[resolutionTopic + "Required"], true);
    assert.equal(policy[resolutionTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25120_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25120_POLICY_KEY][auditAppealTopic + "Version"], "P25.120");
    assert.equal(policy.consumes[P25120_POLICY_KEY][revocationTopic + "Appealed"], false);
    assert.equal(policy.consumes[P25120_POLICY_KEY][appealTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25120_POLICY_KEY][appealTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25120_POLICY_KEY][appealTopic + "Resolved"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const resolutionPolicy = policy[auditResolutionTopic + "Policy"];
    assert.equal(resolutionPolicy.policy.startsWith("resolve-"), true);
    assert.equal(resolutionPolicy.policy.endsWith("after-appeal-policy-defined"), true);
    assert.equal(resolutionPolicy[resolutionTopic + "PayloadLogged"], false);
    assert.equal(resolutionPolicy[resolutionTopic + "Scope"], "future-policy-defined");
    assert.ok(resolutionPolicy.requiredInputs.includes(appealTopic + "Record"));
    assert.ok(resolutionPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(resolutionPolicy.requiredInputs.includes(resolutionTopic + "PolicyId"));
    assert.ok(resolutionPolicy.requiredInputs.includes("trusted" + capitalResolutionTopic + "Authority"));
    assert.ok(resolutionPolicy.requiredInputs.includes("resolutionReason"));
    assert.ok(resolutionPolicy.requiredInputs.includes("resolutionOutcome"));

    assert.ok(policy[auditResolutionTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditResolutionTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditResolutionTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-resolved") && check.executed === false));
    assert.ok(policy[auditResolutionTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditResolutionTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditResolutionTopic + "Decision"]["canSelect" + capitalResolutionTopic + "Policy"], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canCapture" + capitalResolutionTopic + "Reason"], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canExecute" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canResolve" + capitalAppealTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canAccept" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canReject" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canEnforce" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canAttest" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canNotarize" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canCertify" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canEndorse" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canCountersign" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canVerify" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canRevoke" + capitalResolutionTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canReadCountersignatureVerification, false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not resolve countersignature verification revocation appeals")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not accept, reject, enforce, evidence, attest, notarize, certify, endorse, countersign, verify, or revoke appeal resolutions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification revocation, verification, countersignature, or audit records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25122RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    const capitalResolutionTopic = P25121_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const resolutionTopic = capitalResolutionTopic[0].toLowerCase() + capitalResolutionTopic.slice(1);
    const capitalAppealTopic = capitalResolutionTopic.replace(/Resolution$/, "");
    const appealTopic = resolutionTopic.replace(/Resolution$/, "");
    const capitalEnforcementTopic = capitalResolutionTopic + "Enforcement";
    const enforcementTopic = resolutionTopic + "Enforcement";
    const auditResolutionTopic = "audit" + capitalResolutionTopic;
    const auditEnforcementTopic = "audit" + capitalEnforcementTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", enforcementTopic + "Required", enforcementTopic + "Planned"]);

    assert.ok(policy, "P25.122 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEnforcementTopic + "Version"], "P25.122");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[enforcementTopic + "Required"], true);
    assert.equal(policy[enforcementTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25121_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25121_POLICY_KEY][auditResolutionTopic + "Version"], "P25.121");
    assert.equal(policy.consumes[P25121_POLICY_KEY][appealTopic + "Resolved"], false);
    assert.equal(policy.consumes[P25121_POLICY_KEY][resolutionTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25121_POLICY_KEY][resolutionTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25121_POLICY_KEY][resolutionTopic + "Enforced"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const enforcementPolicy = policy[auditEnforcementTopic + "Policy"];
    assert.equal(enforcementPolicy.policy.startsWith("enforce-"), true);
    assert.equal(enforcementPolicy.policy.endsWith("after-resolution-policy-defined"), true);
    assert.equal(enforcementPolicy[enforcementTopic + "PayloadLogged"], false);
    assert.equal(enforcementPolicy[enforcementTopic + "Scope"], "future-policy-defined");
    assert.ok(enforcementPolicy.requiredInputs.includes(resolutionTopic + "Record"));
    assert.ok(enforcementPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(enforcementPolicy.requiredInputs.includes(enforcementTopic + "PolicyId"));
    assert.ok(enforcementPolicy.requiredInputs.includes("trusted" + capitalEnforcementTopic + "Authority"));
    assert.ok(enforcementPolicy.requiredInputs.includes("enforcementReason"));
    assert.ok(enforcementPolicy.requiredInputs.includes("enforcementAction"));

    assert.ok(policy[auditEnforcementTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditEnforcementTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditEnforcementTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-enforced") && check.executed === false));
    assert.ok(policy[auditEnforcementTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditEnforcementTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canSelect" + capitalEnforcementTopic + "Policy"], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canCapture" + capitalEnforcementTopic + "Reason"], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canExecute" + capitalEnforcementTopic], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canEnforce" + capitalResolutionTopic], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canAccept" + capitalEnforcementTopic], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canReject" + capitalEnforcementTopic], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not enforce countersignature verification revocation appeal resolutions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not accept or reject countersignature verification revocation appeal resolution enforcement decisions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification revocation appeal resolutions, resolution records, appeals, appeal records, verification records, revocation records, countersignatures, or audit records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
    object: "00000000-0000-0000-0000-000000000003",
    profile: "00000000-0000-0000-0000-000000000004",
};

type PolicyCheck = {
    id: string;
    required?: boolean;
    planned?: boolean;
    executed?: boolean;
    passed?: boolean;
};

function assertP25123RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    const capitalEnforcementTopic = P25122_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const enforcementTopic = capitalEnforcementTopic[0].toLowerCase() + capitalEnforcementTopic.slice(1);
    const capitalResolutionTopic = capitalEnforcementTopic.replace(/Enforcement$/, "");
    const resolutionTopic = enforcementTopic.replace(/Enforcement$/, "");
    const capitalEvidenceTopic = capitalEnforcementTopic + "Evidence";
    const evidenceTopic = enforcementTopic + "Evidence";
    const auditEnforcementTopic = "audit" + capitalEnforcementTopic;
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", evidenceTopic + "Required", evidenceTopic + "Planned"]);

    assert.ok(policy, "P25.123 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEvidenceTopic + "Version"], "P25.123");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[evidenceTopic + "Required"], true);
    assert.equal(policy[evidenceTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25122_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25122_POLICY_KEY][auditEnforcementTopic + "Version"], "P25.122");
    assert.equal(policy.consumes[P25122_POLICY_KEY][resolutionTopic + "Enforced"], false);
    assert.equal(policy.consumes[P25122_POLICY_KEY][enforcementTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25122_POLICY_KEY][enforcementTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25122_POLICY_KEY][evidenceTopic + "Collected"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const evidencePolicy = policy[auditEvidenceTopic + "Policy"];
    assert.equal(evidencePolicy.policy.startsWith("collect-"), true);
    assert.equal(evidencePolicy.policy.endsWith("after-enforcement-policy-defined"), true);
    assert.equal(evidencePolicy[evidenceTopic + "PayloadLogged"], false);
    assert.equal(evidencePolicy[evidenceTopic + "Scope"], "future-policy-defined");
    assert.ok(evidencePolicy.requiredInputs.includes(enforcementTopic + "Record"));
    assert.ok(evidencePolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(evidencePolicy.requiredInputs.includes(evidenceTopic + "PolicyId"));
    assert.ok(evidencePolicy.requiredInputs.includes("trusted" + capitalEvidenceTopic + "Source"));
    assert.ok(evidencePolicy.requiredInputs.includes("evidenceSource"));
    assert.ok(evidencePolicy.requiredInputs.includes("evidenceBundle"));

    assert.ok(policy[auditEvidenceTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditEvidenceTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditEvidenceTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-collected") && check.executed === false));
    assert.ok(policy[auditEvidenceTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-created") && check.executed === false));
    assert.equal(policy[auditEvidenceTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canSelect" + capitalEvidenceTopic + "Policy"], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canCollect" + capitalEvidenceTopic], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canRead" + capitalEnforcementTopic + "Record"], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not collect, validate, or normalize countersignature verification revocation appeal resolution enforcement evidence")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification revocation appeal resolution enforcement")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25124RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    const capitalEvidenceTopic = P25123_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const evidenceTopic = capitalEvidenceTopic[0].toLowerCase() + capitalEvidenceTopic.slice(1);
    const capitalAttestationTopic = capitalEvidenceTopic + "Attestation";
    const attestationTopic = evidenceTopic + "Attestation";
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", attestationTopic + "Required", attestationTopic + "Planned"]);

    assert.ok(policy, "P25.124 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditAttestationTopic + "Version"], "P25.124");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[attestationTopic + "Required"], true);
    assert.equal(policy[attestationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25123_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25123_POLICY_KEY][auditEvidenceTopic + "Version"], "P25.123");
    assert.equal(policy.consumes[P25123_POLICY_KEY][evidenceTopic + "RecordCreated"], false);
    assert.equal(policy.consumes[P25123_POLICY_KEY][evidenceTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25123_POLICY_KEY][evidenceTopic + "BundleStored"], false);
    assert.equal(policy.consumes[P25123_POLICY_KEY][evidenceTopic + "Attested"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const attestationPolicy = policy[auditAttestationTopic + "Policy"];
    assert.equal(attestationPolicy.policy.startsWith("attest-"), true);
    assert.equal(attestationPolicy.policy.endsWith("after-evidence-record-defined"), true);
    assert.equal(attestationPolicy[attestationTopic + "PayloadLogged"], false);
    assert.equal(attestationPolicy[attestationTopic + "Scope"], "future-policy-defined");
    assert.ok(attestationPolicy.requiredInputs.includes(evidenceTopic + "Record"));
    assert.ok(attestationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(attestationPolicy.requiredInputs.includes(attestationTopic + "PolicyId"));
    assert.ok(attestationPolicy.requiredInputs.includes("trusted" + capitalAttestationTopic + "Authority"));
    assert.ok(attestationPolicy.requiredInputs.includes("attestationStatement"));
    assert.ok(attestationPolicy.requiredInputs.includes("attestationEvidenceDigest"));

    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.ok(policy[auditAttestationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditAttestationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditAttestationTopic + "Decision"]["canSelect" + capitalAttestationTopic + "Policy"], false);
    assert.equal(policy[auditAttestationTopic + "Decision"]["canCreate" + capitalAttestationTopic], false);
    assert.equal(policy[auditAttestationTopic + "Decision"]["canRead" + capitalEvidenceTopic + "Record"], false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish attestations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, attest, or verify countersignature verification revocation appeal resolution enforcement evidence records or bundles")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25125RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    const capitalAttestationTopic = P25124_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const attestationTopic = capitalAttestationTopic[0].toLowerCase() + capitalAttestationTopic.slice(1);
    const capitalNotarizationTopic = capitalAttestationTopic + "Notarization";
    const notarizationTopic = attestationTopic + "Notarization";
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const auditNotarizationTopic = "audit" + capitalNotarizationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", notarizationTopic + "Required", notarizationTopic + "Planned"]);

    assert.ok(policy, "P25.125 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditNotarizationTopic + "Version"], "P25.125");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[notarizationTopic + "Required"], true);
    assert.equal(policy[notarizationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25124_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25124_POLICY_KEY][auditAttestationTopic + "Version"], "P25.124");
    assert.equal(policy.consumes[P25124_POLICY_KEY][attestationTopic + "Created"], false);
    assert.equal(policy.consumes[P25124_POLICY_KEY][attestationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25124_POLICY_KEY][attestationTopic + "RecordCreated"], false);
    assert.equal(policy.consumes[P25124_POLICY_KEY][attestationTopic + "RecordStored"], false);
    assert.equal(policy.consumes[P25124_POLICY_KEY][attestationTopic + "Notarized"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const notarizationPolicy = policy[auditNotarizationTopic + "Policy"];
    assert.equal(notarizationPolicy.policy.startsWith("notarize-"), true);
    assert.equal(notarizationPolicy.policy.endsWith("after-attestation-record-defined"), true);
    assert.equal(notarizationPolicy[notarizationTopic + "PayloadLogged"], false);
    assert.equal(notarizationPolicy[notarizationTopic + "Scope"], "future-policy-defined");
    assert.ok(notarizationPolicy.requiredInputs.includes(attestationTopic + "Record"));
    assert.ok(notarizationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(notarizationPolicy.requiredInputs.includes(notarizationTopic + "PolicyId"));
    assert.ok(notarizationPolicy.requiredInputs.includes("trusted" + capitalNotarizationTopic + "Authority"));
    assert.ok(notarizationPolicy.requiredInputs.includes("notarizationStatement"));
    assert.ok(notarizationPolicy.requiredInputs.includes("notarizationAttestationDigest"));

    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.ok(policy[auditNotarizationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditNotarizationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canSelect" + capitalNotarizationTopic + "Policy"], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canCreate" + capitalNotarizationTopic], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canRead" + capitalAttestationTopic + "Record"], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canNotarize" + capitalAttestationTopic], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish notarizations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, notarize, or verify countersignature verification revocation appeal resolution enforcement evidence attestations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25126RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    const capitalNotarizationTopic = P25125_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const notarizationTopic = capitalNotarizationTopic[0].toLowerCase() + capitalNotarizationTopic.slice(1);
    const capitalCertificationTopic = capitalNotarizationTopic + "Certification";
    const certificationTopic = notarizationTopic + "Certification";
    const capitalAttestationTopic = capitalNotarizationTopic.replace(/Notarization$/, "");
    const auditNotarizationTopic = "audit" + capitalNotarizationTopic;
    const auditCertificationTopic = "audit" + capitalCertificationTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", certificationTopic + "Required", certificationTopic + "Planned"]);

    assert.ok(policy, "P25.126 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditCertificationTopic + "Version"], "P25.126");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[certificationTopic + "Required"], true);
    assert.equal(policy[certificationTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25125_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25125_POLICY_KEY][auditNotarizationTopic + "Version"], "P25.125");
    assert.equal(policy.consumes[P25125_POLICY_KEY][notarizationTopic + "Created"], false);
    assert.equal(policy.consumes[P25125_POLICY_KEY][notarizationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25125_POLICY_KEY][notarizationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25125_POLICY_KEY][notarizationTopic + "Certified"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const certificationPolicy = policy[auditCertificationTopic + "Policy"];
    assert.equal(certificationPolicy.policy.startsWith("certify-"), true);
    assert.equal(certificationPolicy.policy.endsWith("after-notarization-record-defined"), true);
    assert.equal(certificationPolicy[certificationTopic + "PayloadLogged"], false);
    assert.equal(certificationPolicy[certificationTopic + "Scope"], "future-policy-defined");
    assert.ok(certificationPolicy.requiredInputs.includes(notarizationTopic + "Record"));
    assert.ok(certificationPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(certificationPolicy.requiredInputs.includes(certificationTopic + "PolicyId"));
    assert.ok(certificationPolicy.requiredInputs.includes("trusted" + capitalCertificationTopic + "Authority"));

    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-present") && check.executed === false));
    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-policy-selected") && check.executed === false));
    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.ok(policy[auditCertificationTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-record-not-stored") && check.executed === false));
    assert.equal(policy[auditCertificationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditCertificationTopic + "Decision"]["canSelect" + capitalCertificationTopic + "Policy"], false);
    assert.equal(policy[auditCertificationTopic + "Decision"]["canCreate" + capitalCertificationTopic], false);
    assert.equal(policy[auditCertificationTopic + "Decision"]["canRead" + capitalNotarizationTopic + "Record"], false);
    assert.equal(policy[auditCertificationTopic + "Decision"]["canCertify" + capitalNotarizationTopic], false);
    assert.equal(policy[auditCertificationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditCertificationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish certifications")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, certify, or verify countersignature verification revocation appeal resolution enforcement evidence attestation notarizations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25127RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(policy: any) {
    const capitalCertificationTopic = P25126_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const certificationTopic = capitalCertificationTopic[0].toLowerCase() + capitalCertificationTopic.slice(1);
    const capitalEndorsementTopic = capitalCertificationTopic + "Endorsement";
    const endorsementTopic = certificationTopic + "Endorsement";
    const auditCertificationTopic = "audit" + capitalCertificationTopic;
    const auditEndorsementTopic = "audit" + capitalEndorsementTopic;
    const allowedTopLevelTrue = new Set(["dryRunOnly", "approvalRequired", endorsementTopic + "Required", endorsementTopic + "Planned"]);

    assert.ok(policy, "P25.127 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEndorsementTopic + "Version"], "P25.127");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[endorsementTopic + "Required"], true);
    assert.equal(policy[endorsementTopic + "Planned"], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25126_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25126_POLICY_KEY][auditCertificationTopic + "Version"], "P25.126");
    assert.equal(policy.consumes[P25126_POLICY_KEY][certificationTopic + "Created"], false);
    assert.equal(policy.consumes[P25126_POLICY_KEY][certificationTopic + "Stored"], false);
    assert.equal(policy.consumes[P25126_POLICY_KEY][certificationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[P25126_POLICY_KEY][certificationTopic + "Endorsed"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const endorsementPolicy = policy[auditEndorsementTopic + "Policy"];
    assert.equal(endorsementPolicy.policy.startsWith("endorse-"), true);
    assert.equal(endorsementPolicy.policy.endsWith("after-certification-record-defined"), true);
    assert.equal(endorsementPolicy[endorsementTopic + "PayloadLogged"], false);
    assert.equal(endorsementPolicy[endorsementTopic + "Scope"], "future-policy-defined");
    assert.ok(endorsementPolicy.requiredInputs.includes(certificationTopic + "Record"));
    assert.ok(endorsementPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(endorsementPolicy.requiredInputs.includes(endorsementTopic + "PolicyId"));
    assert.ok(endorsementPolicy.requiredInputs.includes("trusted" + capitalEndorsementTopic + "Authority"));

    assert.ok(policy[auditEndorsementTopic + "Checks"].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.ok(policy[auditEndorsementTopic + "Checks"].some((check: PolicyCheck) => check.id.endsWith("-not-created") && check.executed === false));
    assert.equal(policy[auditEndorsementTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canCreate" + capitalEndorsementTopic], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canEndorse" + capitalCertificationTopic], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"]["canRead" + capitalCertificationTopic + "Record"], false);
    assert.equal(policy[auditEndorsementTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEndorsementTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish endorsements")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read, endorse, or verify certifications")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

const P25105_POLICY_KEY = "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy";
const P25106_POLICY_KEY = P25105_POLICY_KEY.replace(/EndorsementPolicy$/, "EndorsementCountersignaturePolicy");
const P25107_POLICY_KEY = P25106_POLICY_KEY.replace(/CountersignaturePolicy$/, "CountersignatureVerificationPolicy");
const P25108_POLICY_KEY = P25107_POLICY_KEY.replace(/VerificationPolicy$/, "VerificationRevocationPolicy");
const P25109_POLICY_KEY = P25108_POLICY_KEY.replace(/RevocationPolicy$/, "RevocationAppealPolicy");
const P25110_POLICY_KEY = P25109_POLICY_KEY.replace(/AppealPolicy$/, "AppealResolutionPolicy");
const P25111_POLICY_KEY = P25110_POLICY_KEY.replace(/ResolutionPolicy$/, "ResolutionEnforcementPolicy");
const P25112_POLICY_KEY = P25111_POLICY_KEY.replace(/EnforcementPolicy$/, "EnforcementEvidencePolicy");
const P25113_POLICY_KEY = P25112_POLICY_KEY.replace(/EvidencePolicy$/, "EvidenceAttestationPolicy");
const P25114_POLICY_KEY = P25113_POLICY_KEY.replace(/AttestationPolicy$/, "AttestationNotarizationPolicy");
const P25115_POLICY_KEY = P25114_POLICY_KEY.replace(/NotarizationPolicy$/, "NotarizationCertificationPolicy");
const P25116_POLICY_KEY = P25115_POLICY_KEY.replace(/CertificationPolicy$/, "CertificationEndorsementPolicy");
const P25117_POLICY_KEY = P25116_POLICY_KEY.replace(/EndorsementPolicy$/, "EndorsementCountersignaturePolicy");
const P25118_POLICY_KEY = P25117_POLICY_KEY.replace(/CountersignaturePolicy$/, "CountersignatureVerificationPolicy");
const P25119_POLICY_KEY = P25118_POLICY_KEY.replace(/VerificationPolicy$/, "VerificationRevocationPolicy");
const P25120_POLICY_KEY = P25119_POLICY_KEY.replace(/RevocationPolicy$/, "RevocationAppealPolicy");
const P25121_POLICY_KEY = P25120_POLICY_KEY.replace(/AppealPolicy$/, "AppealResolutionPolicy");
const P25122_POLICY_KEY = P25121_POLICY_KEY.replace(/ResolutionPolicy$/, "ResolutionEnforcementPolicy");
const P25123_POLICY_KEY = P25122_POLICY_KEY.replace(/EnforcementPolicy$/, "EnforcementEvidencePolicy");
const P25124_POLICY_KEY = P25123_POLICY_KEY.replace(/EvidencePolicy$/, "EvidenceAttestationPolicy");
const P25125_POLICY_KEY = P25124_POLICY_KEY.replace(/AttestationPolicy$/, "AttestationNotarizationPolicy");
const P25126_POLICY_KEY = P25125_POLICY_KEY.replace(/NotarizationPolicy$/, "NotarizationCertificationPolicy");
const P25127_POLICY_KEY = P25126_POLICY_KEY.replace(/CertificationPolicy$/, "CertificationEndorsementPolicy");

function assertP25105EndorsementPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const certificationTopic = `${notarizationTopic}Certification`;
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const capitalCertificationTopic = `${capitalNotarizationTopic}Certification`;
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const auditCertificationTopic = `audit${capitalCertificationTopic}`;
    const auditEndorsementTopic = `audit${capitalEndorsementTopic}`;
    const consumedCertificationPolicyKey = P25105_POLICY_KEY.replace(/EndorsementPolicy$/, "Policy");
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${endorsementTopic}Required`,
        `${endorsementTopic}Planned`,
    ]);

    assert.ok(policy, "P25.105 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditEndorsementTopic}Version`], "P25.105");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy[`${endorsementTopic}Required`], true);
    assert.equal(policy[`${endorsementTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedCertificationPolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedCertificationPolicyKey][`${auditCertificationTopic}Version`], "P25.104");
    assert.equal(policy.consumes[consumedCertificationPolicyKey][`${certificationTopic}Created`], false);
    assert.equal(policy.consumes[consumedCertificationPolicyKey][`${certificationTopic}Stored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const policyMetadata = policy[`${auditEndorsementTopic}Policy`];
    assert.match(policyMetadata.policy, /^endorse-/);
    assert.match(policyMetadata.policy, /after-certification-record-defined$/);
    assert.ok(policyMetadata.requiredInputs.includes(`${certificationTopic}Record`));
    assert.ok(policyMetadata.requiredInputs.includes(`trusted${capitalEndorsementTopic}Authority`));
    assert.equal(policyMetadata[`${endorsementTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policyMetadata)) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    const checks = policy[`${auditEndorsementTopic}Checks`];
    assert.ok(checks.some((entry: PolicyCheck) => entry.id.includes("certification-endorsement-not-created") && entry.executed === false && entry.passed === false));
    for (const entry of checks) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }

    const decision = policy[`${auditEndorsementTopic}Decision`];
    assert.equal(decision.status, "blocked");
    assert.match(decision.reason, /metadata-only/);
    for (const [key, value] of Object.entries(decision)) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not prepare, create, validate, store, or publish endorsements")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, endorse, or verify certifications")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read or query audit records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement policy schema"));
}

function assertP25106CountersignaturePolicyMetadataOnly(policy: any) {
    const capitalBaseTopic = P25105_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const baseTopic = capitalBaseTopic[0].toLowerCase() + capitalBaseTopic.slice(1);
    const countersignatureTopic = `${baseTopic}Countersignature`;
    const auditBaseTopic = `audit${capitalBaseTopic}`;
    const auditCountersignatureTopic = `audit${capitalBaseTopic}Countersignature`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${countersignatureTopic}Required`,
        `${countersignatureTopic}Planned`,
    ]);

    assert.ok(policy, "P25.106 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditCountersignatureTopic}Version`], "P25.106");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${countersignatureTopic}Required`], true);
    assert.equal(policy[`${countersignatureTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25105_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25105_POLICY_KEY][`${auditBaseTopic}Version`], "P25.105");
    assert.equal(policy.consumes[P25105_POLICY_KEY][`${baseTopic}Created`], false);
    assert.equal(policy.consumes[P25105_POLICY_KEY][`${baseTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const countersignaturePolicy = policy[`${auditCountersignatureTopic}Policy`];
    assert.equal(countersignaturePolicy.policy.endsWith("after-endorsement-record-defined"), true);
    assert.equal(countersignaturePolicy[`${countersignatureTopic}PayloadLogged`], false);
    assert.equal(countersignaturePolicy[`${countersignatureTopic}Scope`], "future-policy-defined");
    assert.ok(countersignaturePolicy.requiredInputs.includes(`${baseTopic}Record`));
    assert.ok(countersignaturePolicy.requiredInputs.includes("auditAccessGrant"));

    assert.ok(policy[`${auditCountersignatureTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, create, validate, store, or publish countersignatures")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25107VerificationPolicyMetadataOnly(policy: any) {
    const capitalBaseTopic = P25106_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const baseTopic = capitalBaseTopic[0].toLowerCase() + capitalBaseTopic.slice(1);
    const verificationTopic = `${baseTopic}Verification`;
    const auditBaseTopic = `audit${capitalBaseTopic}`;
    const auditVerificationTopic = `audit${capitalBaseTopic}Verification`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${verificationTopic}Required`,
        `${verificationTopic}Planned`,
    ]);

    assert.ok(policy, "P25.107 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditVerificationTopic}Version`], "P25.107");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${verificationTopic}Required`], true);
    assert.equal(policy[`${verificationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25106_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25106_POLICY_KEY][`${auditBaseTopic}Version`], "P25.106");
    assert.equal(policy.consumes[P25106_POLICY_KEY][`${baseTopic}Created`], false);
    assert.equal(policy.consumes[P25106_POLICY_KEY][`${baseTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const verificationPolicy = policy[`${auditVerificationTopic}Policy`];
    assert.equal(verificationPolicy.policy.endsWith("after-countersignature-record-defined"), true);
    assert.equal(verificationPolicy[`${verificationTopic}PayloadLogged`], false);
    assert.equal(verificationPolicy[`${verificationTopic}Scope`], "future-policy-defined");
    assert.ok(verificationPolicy.requiredInputs.includes(`${baseTopic}Record`));
    assert.ok(verificationPolicy.requiredInputs.includes("auditAccessGrant"));

    assert.ok(policy[`${auditVerificationTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditVerificationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditVerificationTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read or verify signatures")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not prepare, execute, store, or publish verification results")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}


function assertP25108RevocationPolicyMetadataOnly(policy: any) {
    const capitalVerificationTopic = P25107_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const verificationTopic = capitalVerificationTopic[0].toLowerCase() + capitalVerificationTopic.slice(1);
    const revocationTopic = `${verificationTopic}Revocation`;
    const auditVerificationTopic = `audit${capitalVerificationTopic}`;
    const auditRevocationTopic = `audit${capitalVerificationTopic}Revocation`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${revocationTopic}Required`,
        `${revocationTopic}Planned`,
    ]);

    assert.ok(policy, "P25.108 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditRevocationTopic}Version`], "P25.108");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${revocationTopic}Required`], true);
    assert.equal(policy[`${revocationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25107_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25107_POLICY_KEY][`${auditVerificationTopic}Version`], "P25.107");
    assert.equal(policy.consumes[P25107_POLICY_KEY][`${verificationTopic}Executed`], false);
    assert.equal(policy.consumes[P25107_POLICY_KEY][`${verificationTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const revocationPolicy = policy[`${auditRevocationTopic}Policy`];
    assert.equal(revocationPolicy.policy.startsWith("revoke-"), true);
    assert.equal(revocationPolicy.policy.endsWith("after-verification-record-defined"), true);
    assert.equal(revocationPolicy[`${revocationTopic}PayloadLogged`], false);
    assert.equal(revocationPolicy[`${revocationTopic}Scope`], "future-policy-defined");
    assert.ok(revocationPolicy.requiredInputs.includes(`${verificationTopic}Record`));
    assert.ok(revocationPolicy.requiredInputs.includes("auditAccessGrant"));

    assert.ok(policy[`${auditRevocationTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditRevocationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditRevocationTopic}Decision`][`canRevoke${capitalVerificationTopic}`], false);
    assert.equal(policy[`${auditRevocationTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not revoke verification results")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not read countersignature verification or verification records")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}


function assertP25109RevocationAppealPolicyMetadataOnly(policy: any) {
    const capitalRevocationTopic = P25108_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const revocationTopic = capitalRevocationTopic[0].toLowerCase() + capitalRevocationTopic.slice(1);
    const appealTopic = `${revocationTopic}Appeal`;
    const auditRevocationTopic = `audit${capitalRevocationTopic}`;
    const auditAppealTopic = `audit${capitalRevocationTopic}Appeal`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${appealTopic}Required`,
        `${appealTopic}Planned`,
    ]);

    assert.ok(policy, "P25.109 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditAppealTopic}Version`], "P25.109");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${appealTopic}Required`], true);
    assert.equal(policy[`${appealTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25108_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25108_POLICY_KEY][`${auditRevocationTopic}Version`], "P25.108");
    assert.equal(policy.consumes[P25108_POLICY_KEY][`${revocationTopic}Revoked`], false);
    assert.equal(policy.consumes[P25108_POLICY_KEY][`${revocationTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const appealPolicy = policy[`${auditAppealTopic}Policy`];
    assert.equal(appealPolicy.policy.startsWith("appeal-"), true);
    assert.equal(appealPolicy.policy.endsWith("after-revocation-policy-defined"), true);
    assert.equal(appealPolicy[`${appealTopic}PayloadLogged`], false);
    assert.equal(appealPolicy[`${appealTopic}Scope`], "future-policy-defined");
    assert.ok(appealPolicy.requiredInputs.includes(`${revocationTopic}Record`));
    assert.ok(appealPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(appealPolicy.requiredInputs.includes("appealReason"));

    assert.ok(policy[`${auditAppealTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditAppealTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditAppealTopic}Decision`][`canAppeal${capitalRevocationTopic}`], false);
    assert.equal(policy[`${auditAppealTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not appeal countersignature verification revocations")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not grant or deny countersignature verification revocation appeals")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

function assertP25110RevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    const capitalAppealTopic = P25109_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const appealTopic = capitalAppealTopic[0].toLowerCase() + capitalAppealTopic.slice(1);
    const capitalRevocationTopic = capitalAppealTopic.replace(/Appeal$/, "");
    const revocationTopic = capitalRevocationTopic[0].toLowerCase() + capitalRevocationTopic.slice(1);
    const resolutionTopic = `${appealTopic}Resolution`;
    const auditAppealTopic = `audit${capitalAppealTopic}`;
    const auditResolutionTopic = `audit${capitalAppealTopic}Resolution`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${resolutionTopic}Required`,
        `${resolutionTopic}Planned`,
    ]);

    assert.ok(policy, "P25.110 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditResolutionTopic}Version`], "P25.110");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${resolutionTopic}Required`], true);
    assert.equal(policy[`${resolutionTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25109_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25109_POLICY_KEY][`${auditAppealTopic}Version`], "P25.109");
    assert.equal(policy.consumes[P25109_POLICY_KEY][`${revocationTopic}Appealed`], false);
    assert.equal(policy.consumes[P25109_POLICY_KEY][`${appealTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const resolutionPolicy = policy[`${auditResolutionTopic}Policy`];
    assert.equal(resolutionPolicy.policy.startsWith("resolve-"), true);
    assert.equal(resolutionPolicy.policy.endsWith("after-appeal-policy-defined"), true);
    assert.equal(resolutionPolicy[`${resolutionTopic}PayloadLogged`], false);
    assert.equal(resolutionPolicy[`${resolutionTopic}Scope`], "future-policy-defined");
    assert.ok(resolutionPolicy.requiredInputs.includes(`${appealTopic}Record`));
    assert.ok(resolutionPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(resolutionPolicy.requiredInputs.includes("resolutionReason"));
    assert.ok(resolutionPolicy.requiredInputs.includes("resolutionOutcome"));

    assert.ok(policy[`${auditResolutionTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditResolutionTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditResolutionTopic}Decision`][`canResolve${capitalAppealTopic}`], false);
    assert.equal(policy[`${auditResolutionTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not resolve countersignature verification revocation appeals")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not accept or reject countersignature verification revocation appeal resolutions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}


function assertP25111RevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    const capitalResolutionTopic = P25110_POLICY_KEY.replace(/^packageMaterializationApprovalAudit/, "").replace(/Policy$/, "");
    const resolutionTopic = capitalResolutionTopic[0].toLowerCase() + capitalResolutionTopic.slice(1);
    const capitalAppealTopic = capitalResolutionTopic.replace(/Resolution$/, "");
    const appealTopic = capitalAppealTopic[0].toLowerCase() + capitalAppealTopic.slice(1);
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const auditResolutionTopic = `audit${capitalResolutionTopic}`;
    const auditEnforcementTopic = `audit${capitalResolutionTopic}Enforcement`;
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${enforcementTopic}Required`,
        `${enforcementTopic}Planned`,
    ]);

    assert.ok(policy, "P25.111 policy payload");
    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditEnforcementTopic}Version`], "P25.111");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.approved, false);
    assert.equal(policy.finalApprovalGranted, false);
    assert.equal(policy[`${enforcementTopic}Required`], true);
    assert.equal(policy[`${enforcementTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[P25110_POLICY_KEY].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[P25110_POLICY_KEY][`${auditResolutionTopic}Version`], "P25.110");
    assert.equal(policy.consumes[P25110_POLICY_KEY][`${appealTopic}Resolved`], false);
    assert.equal(policy.consumes[P25110_POLICY_KEY][`${resolutionTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    const enforcementPolicy = policy[`${auditEnforcementTopic}Policy`];
    assert.equal(enforcementPolicy.policy.startsWith("enforce-"), true);
    assert.equal(enforcementPolicy.policy.endsWith("after-resolution-policy-defined"), true);
    assert.equal(enforcementPolicy[`${enforcementTopic}PayloadLogged`], false);
    assert.equal(enforcementPolicy[`${enforcementTopic}Scope`], "future-policy-defined");
    assert.ok(enforcementPolicy.requiredInputs.includes(`${resolutionTopic}Record`));
    assert.ok(enforcementPolicy.requiredInputs.includes("auditAccessGrant"));
    assert.ok(enforcementPolicy.requiredInputs.includes("enforcementReason"));
    assert.ok(enforcementPolicy.requiredInputs.includes("enforcementAction"));

    assert.ok(policy[`${auditEnforcementTopic}Checks`].some((check: PolicyCheck) => check.id === "audit-access-granted" && check.executed === false));
    assert.equal(policy[`${auditEnforcementTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditEnforcementTopic}Decision`][`canEnforce${capitalResolutionTopic}`], false);
    assert.equal(policy[`${auditEnforcementTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not enforce countersignature verification revocation appeal resolutions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not accept or reject countersignature verification revocation appeal resolution enforcement decisions")));
    assert.ok(policy.noOpGuarantees.some((item: string) => item.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("keep render.thumbnail unavailable until executable adapter registration is approved"));
}

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

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionVersion, "P25.88");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPlanned, true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcomeSelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolved",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAccepted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRejected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordPublished",
        "countersignatureRevocationRead",
        "countersignatureRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashStored",
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
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVersion,
        "P25.87"
    );
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");

    for (const key of [
        "selectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyNow",
        "identifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubjectNow",
        "identifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthorityNow",
        "readCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealNow",
        "readCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordNow",
        "captureCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReasonNow",
        "computeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScopeNow",
        "selectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcomeNow",
        "prepareCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "validateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "executeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "resolveCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealNow",
        "acceptCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "rejectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "publishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "createCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "publishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecordNow",
        "readCountersignatureRevocationNow",
        "readCountersignatureRevocationRecordNow",
        "readCountersignatureNow",
        "verifyCountersignatureRevocationNow",
        "readAuditRecordNow",
        "queryAuditRecordNow",
        "linkAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "verifyAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "signCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionNow",
        "verifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignatureNow",
        "computeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashNow",
        "storeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHashNow",
    ]) {
        assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy[key], false, key);
    }

    for (const key of [
        "canSelectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy",
        "canIdentifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSubject",
        "canIdentifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionAuthority",
        "canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppeal",
        "canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecord",
        "canCaptureCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionReason",
        "canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionScope",
        "canSelectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionOutcome",
        "canPrepareCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canValidateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canExecuteCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canResolveCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppeal",
        "canAcceptCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canRejectCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canPublishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canPublishCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionRecord",
        "canReadCountersignatureRevocation",
        "canReadCountersignatureRevocationRecord",
        "canReadCountersignature",
        "canVerifyCountersignatureRevocation",
        "canReadAuditRecord",
        "canQueryAuditRecord",
        "canLinkAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canVerifyAuditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canSignCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution",
        "canVerifyCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionSignature",
        "canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHash",
        "canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionHash",
        "canMaterializeFiles",
        "canEnableRuntimeDispatch",
    ]) {
        assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionDecision[key], false, key);
    }
}
function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const auditEnforcementTopic = `audit${capitalEnforcementTopic}`;
    const auditEvidenceTopic = `audit${capitalEvidenceTopic}`;
    const consumedEnforcementPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${evidenceTopic}Required`,
        `${evidenceTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditEvidenceTopic}Version`], "P25.90");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy[`${evidenceTopic}Required`], true);
    assert.equal(policy[`${evidenceTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedEnforcementPolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedEnforcementPolicyKey][`${auditEnforcementTopic}Version`], "P25.89");
    assert.equal(policy.consumes[consumedEnforcementPolicyKey][`${resolutionTopic}Enforced`], false);
    assert.equal(policy.consumes[consumedEnforcementPolicyKey][`${enforcementTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    assert.equal(
        policy[`${auditEvidenceTopic}Policy`].policy,
        "collect-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-after-enforcement-policy-defined"
    );
    assert.ok(policy[`${auditEvidenceTopic}Policy`].requiredInputs.includes(`trusted${capitalEvidenceTopic}Source`));
    assert.equal(policy[`${auditEvidenceTopic}Policy`][`${evidenceTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditEvidenceTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(
        policy[`${auditEvidenceTopic}Checks`].some(
            (entry: PolicyCheck) =>
                entry.id === "countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-not-collected" &&
                entry.executed === false &&
                entry.passed === false
        )
    );
    for (const entry of policy[`${auditEvidenceTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }

    assert.equal(policy[`${auditEvidenceTopic}Decision`].status, "blocked");
    assert.match(policy[`${auditEvidenceTopic}Decision`].reason, /metadata-only/);
    for (const [key, value] of Object.entries(policy[`${auditEvidenceTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not collect, validate, or normalize evidence")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not create renderer-service directory")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(
        policy.requiredBeforeRuntimeDispatch.includes(
            "define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence policy schema"
        )
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const auditEvidenceTopic = `audit${capitalEvidenceTopic}`;
    const auditAttestationTopic = `audit${capitalAttestationTopic}`;
    const consumedEvidencePolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${attestationTopic}Required`,
        `${attestationTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditAttestationTopic}Version`], "P25.91");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy[`${attestationTopic}Required`], true);
    assert.equal(policy[`${attestationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedEvidencePolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedEvidencePolicyKey][`${auditEvidenceTopic}Version`], "P25.90");
    assert.equal(policy.consumes[consumedEvidencePolicyKey][`${evidenceTopic}RecordCreated`], false);
    assert.equal(policy.consumes[consumedEvidencePolicyKey][`${evidenceTopic}RecordStored`], false);
    assert.equal(policy.consumes[consumedEvidencePolicyKey][`${evidenceTopic}BundleStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    assert.equal(policy[`${auditAttestationTopic}Policy`].policy, "attest-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-after-evidence-record-defined");
    assert.ok(policy[`${auditAttestationTopic}Policy`].requiredInputs.includes(`trusted${capitalAttestationTopic}Authority`));
    assert.equal(policy[`${auditAttestationTopic}Policy`][`${attestationTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditAttestationTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(
        policy[`${auditAttestationTopic}Checks`].some(
            (entry: PolicyCheck) =>
                entry.id === "countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-not-created" &&
                entry.executed === false &&
                entry.passed === false
        )
    );
    for (const entry of policy[`${auditAttestationTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }

    assert.equal(policy[`${auditAttestationTopic}Decision`].status, "blocked");
    assert.match(policy[`${auditAttestationTopic}Decision`].reason, /metadata-only/);
    for (const [key, value] of Object.entries(policy[`${auditAttestationTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not prepare, create, validate, store, or publish attestations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, attest, or verify evidence records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not create renderer-service directory")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation policy schema"));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const auditResolutionTopic = `audit${capitalResolutionTopic}`;
    const auditEnforcementTopic = `audit${capitalEnforcementTopic}`;
    const consumedAppealResolvedKey =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolved";
    const consumedResolutionPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${enforcementTopic}Required`,
        `${enforcementTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditEnforcementTopic}Version`], "P25.89");
    assert.equal(policy[`${enforcementTopic}Required`], true);
    assert.equal(policy[`${enforcementTopic}Planned`], true);
    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }
    assert.equal(policy.consumes[consumedResolutionPolicyKey][`${auditResolutionTopic}Version`], "P25.88");
    assert.equal(policy.consumes[consumedResolutionPolicyKey][consumedAppealResolvedKey], false);
    assert.equal(policy.consumes[consumedResolutionPolicyKey][`${resolutionTopic}RecordStored`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.ok(policy[`${auditEnforcementTopic}Policy`].requiredInputs.includes("enforcementAction"));
    assert.equal(policy[`${auditEnforcementTopic}Policy`][`${enforcementTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditEnforcementTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
    for (const entry of policy[`${auditEnforcementTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }
    assert.equal(policy[`${auditEnforcementTopic}Decision`].status, "blocked");
    for (const [key, value] of Object.entries(policy[`${auditEnforcementTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
}


function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const auditAttestationTopic = `audit${capitalAttestationTopic}`;
    const auditNotarizationTopic = `audit${capitalNotarizationTopic}`;
    const consumedAttestationPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${notarizationTopic}Required`,
        `${notarizationTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditNotarizationTopic}Version`], "P25.92");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy[`${notarizationTopic}Required`], true);
    assert.equal(policy[`${notarizationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedAttestationPolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedAttestationPolicyKey][`${auditAttestationTopic}Version`], "P25.91");
    assert.equal(policy.consumes[consumedAttestationPolicyKey][`${attestationTopic}Created`], false);
    assert.equal(policy.consumes[consumedAttestationPolicyKey][`${attestationTopic}Stored`], false);
    assert.equal(policy.consumes[consumedAttestationPolicyKey][`${attestationTopic}RecordRead`], false);
    assert.equal(policy.consumes[consumedAttestationPolicyKey][`${attestationTopic}Notarized`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);

    assert.equal(policy[`${auditNotarizationTopic}Policy`].policy, "notarize-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-after-attestation-record-defined");
    assert.ok(policy[`${auditNotarizationTopic}Policy`].requiredInputs.includes(`trusted${capitalNotarizationTopic}Authority`));
    assert.equal(policy[`${auditNotarizationTopic}Policy`][`${notarizationTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditNotarizationTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(
        policy[`${auditNotarizationTopic}Checks`].some(
            (entry: PolicyCheck) =>
                entry.id === "countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-not-created" &&
                entry.executed === false &&
                entry.passed === false
        )
    );
    for (const entry of policy[`${auditNotarizationTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }

    assert.equal(policy[`${auditNotarizationTopic}Decision`].status, "blocked");
    assert.match(policy[`${auditNotarizationTopic}Decision`].reason, /metadata-only/);
    for (const [key, value] of Object.entries(policy[`${auditNotarizationTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }

    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not prepare, create, validate, store, or publish notarizations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, notarize, or verify attestation records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not create renderer-service directory")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization policy schema"));
}


function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const certificationTopic = `${notarizationTopic}Certification`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const capitalCertificationTopic = `${capitalNotarizationTopic}Certification`;
    const auditNotarizationTopic = `audit${capitalNotarizationTopic}`;
    const auditCertificationTopic = `audit${capitalCertificationTopic}`;
    const consumedNotarizationPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${certificationTopic}Required`,
        `${certificationTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditCertificationTopic}Version`], "P25.93");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy[`${certificationTopic}Required`], true);
    assert.equal(policy[`${certificationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedNotarizationPolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${auditNotarizationTopic}Version`], "P25.92");
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Created`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Stored`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}RecordRead`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Certified`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.equal(policy[`${auditCertificationTopic}Policy`].policy, "certify-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-after-notarization-record-defined");
    assert.ok(policy[`${auditCertificationTopic}Policy`].requiredInputs.includes(`trusted${capitalCertificationTopic}Authority`));
    assert.equal(policy[`${auditCertificationTopic}Policy`][`${certificationTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditCertificationTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
    assert.ok(policy[`${auditCertificationTopic}Checks`].some((entry: PolicyCheck) => entry.id.includes("notarization-certification-not-created") && entry.executed === false && entry.passed === false));
    for (const entry of policy[`${auditCertificationTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }
    assert.equal(policy[`${auditCertificationTopic}Decision`].status, "blocked");
    assert.match(policy[`${auditCertificationTopic}Decision`].reason, /metadata-only/);
    for (const [key, value] of Object.entries(policy[`${auditCertificationTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not certify notarizations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read or query audit records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification policy schema"));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(policy: any) {
    const certificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const capitalCertificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const capitalEvidenceTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidence";
    const auditEndorsementTopic = `audit${capitalEndorsementTopic}`;

    assert.equal(policy[`${auditEndorsementTopic}Version`], "P25.94");
    assert.equal(policy[`${endorsementTopic}Required`], true);
    assert.equal(policy[`${endorsementTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${endorsementTopic}PolicySelected`,
        `${endorsementTopic}Created`,
        `${endorsementTopic}RecordCreated`,
        `${certificationTopic}Read`,
        `${certificationTopic}Endorsed`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalEndorsementTopic}Linked`,
        `${endorsementTopic}SignatureCreated`,
        `${endorsementTopic}HashComputed`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationVersion,
        "P25.93"
    );
    assert.ok(policy[`${auditEndorsementTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementAuthority"));
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`create${capitalEndorsementTopic}Now`], false);
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`endorse${capitalCertificationTopic}Now`], false);
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`${endorsementTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canCreate${capitalEndorsementTopic}`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canEndorse${capitalCertificationTopic}`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(policy: any) {
    const endorsementTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsement";
    const countersignatureTopic = `${endorsementTopic}Countersignature`;
    const capitalEndorsementTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsement";
    const capitalCountersignatureTopic = `${capitalEndorsementTopic}Countersignature`;
    const capitalEvidenceTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidence";
    const auditEndorsementTopic = `audit${capitalEndorsementTopic}`;
    const auditCountersignatureTopic = `audit${capitalCountersignatureTopic}`;

    assert.equal(policy[`${auditCountersignatureTopic}Version`], "P25.95");
    assert.equal(policy[`${countersignatureTopic}Required`], true);
    assert.equal(policy[`${countersignatureTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${countersignatureTopic}PolicySelected`,
        `${countersignatureTopic}Created`,
        `${countersignatureTopic}RecordCreated`,
        `${endorsementTopic}Read`,
        `${endorsementTopic}Countersigned`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalCountersignatureTopic}Linked`,
        `${countersignatureTopic}SignatureCreated`,
        `${countersignatureTopic}HashComputed`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy[`${auditEndorsementTopic}Version`],
        "P25.94"
    );
    assert.ok(policy[`${auditCountersignatureTopic}Policy`].requiredInputs.includes(`trusted${capitalCountersignatureTopic}Authority`));
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`create${capitalCountersignatureTopic}Now`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`countersign${capitalEndorsementTopic}Now`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`${countersignatureTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canCreate${capitalCountersignatureTopic}`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canCountersign${capitalEndorsementTopic}`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, countersign, or verify endorsements")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(policy: any) {
    const certificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const countersignatureTopic = `${endorsementTopic}Countersignature`;
    const verificationTopic = `${countersignatureTopic}Verification`;
    const capitalCertificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const capitalCountersignatureTopic = `${capitalEndorsementTopic}Countersignature`;
    const capitalVerificationTopic = `${capitalCountersignatureTopic}Verification`;
    const auditCountersignatureTopic = `audit${capitalCountersignatureTopic}`;
    const auditVerificationTopic = `audit${capitalVerificationTopic}`;

    assert.equal(policy[`${auditVerificationTopic}Version`], "P25.96");
    assert.equal(policy[`${verificationTopic}Required`], true);
    assert.equal(policy[`${verificationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${verificationTopic}PolicySelected`,
        `${verificationTopic}SubjectIdentified`,
        `${verificationTopic}AuthorityIdentified`,
        "countersignatureRead",
        `${countersignatureTopic}RecordRead`,
        "countersignaturePayloadParsed",
        "countersignatureSignatureRead",
        "countersignatureSignatureVerified",
        "countersignatureHashComputed",
        "countersignatureHashMatched",
        "countersignatureChainLinked",
        "countersignatureChainVerified",
        `${verificationTopic}Prepared`,
        `${verificationTopic}Executed`,
        `${verificationTopic}Passed`,
        `${verificationTopic}Failed`,
        `${verificationTopic}Stored`,
        `${verificationTopic}Published`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalVerificationTopic}Linked`,
        `auditRecord${capitalVerificationTopic}Verified`,
        `${verificationTopic}SignatureCreated`,
        `${verificationTopic}SignatureVerified`,
        `${verificationTopic}HashComputed`,
        `${verificationTopic}HashStored`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy[`${auditCountersignatureTopic}Version`],
        "P25.95"
    );
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(
        policy[`${auditVerificationTopic}Policy`].policy,
        "verify-countersignature-after-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-record-defined"
    );
    assert.ok(policy[`${auditVerificationTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationAuthority"));
    assert.equal(policy[`${auditVerificationTopic}Policy`][`select${capitalVerificationTopic}PolicyNow`], false);
    assert.equal(policy[`${auditVerificationTopic}Policy`].readCountersignatureNow, false);
    assert.equal(policy[`${auditVerificationTopic}Policy`].verifyCountersignatureSignatureNow, false);
    assert.equal(policy[`${auditVerificationTopic}Policy`][`${verificationTopic}PayloadLogged`], false);
    assert.ok(
        policy[`${auditVerificationTopic}Checks`].some(
            (entry: PolicyCheck) =>
                entry.id ===
                    "countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-signature-not-verified" &&
                entry.executed === false
        )
    );
    assert.equal(policy[`${auditVerificationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditVerificationTopic}Decision`][`canSelect${capitalVerificationTopic}Policy`], false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadCountersignature, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadCountersignatureRecord, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canVerifyCountersignatureSignature, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canComputeCountersignatureHash, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canLinkCountersignatureChain, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(policy: any) {
    const verificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const revocationTopic = `${verificationTopic}Revocation`;
    const capitalVerificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const capitalRevocationTopic = `${capitalVerificationTopic}Revocation`;
    const auditVerificationTopic = `audit${capitalVerificationTopic}`;
    const auditRevocationTopic = `audit${capitalRevocationTopic}`;

    assert.equal(policy[`${auditRevocationTopic}Version`], "P25.97");
    assert.equal(policy[`${revocationTopic}Required`], true);
    assert.equal(policy[`${revocationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${revocationTopic}PolicySelected`,
        `${revocationTopic}Executed`,
        `${revocationTopic}Revoked`,
        `${revocationTopic}RecordStored`,
        `${verificationTopic}Read`,
        `${verificationTopic}Revoked`,
        "auditRecordRead",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy[`${auditVerificationTopic}Version`],
        "P25.96"
    );
    assert.ok(policy[`${auditRevocationTopic}Policy`].requiredInputs.includes(`trusted${capitalRevocationTopic}Authority`));
    assert.equal(policy[`${auditRevocationTopic}Policy`][`${revocationTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditRevocationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditRevocationTopic}Decision`][`canRevoke${capitalVerificationTopic}`], false);
    assert.equal(policy[`${auditRevocationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditRevocationTopic}Decision`].canEnableRuntimeDispatch, false);
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

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const auditEvidenceTopic = `audit${capitalEvidenceTopic}`;

    assert.equal(policy[`${auditEvidenceTopic}Version`], "P25.79");
    assert.equal(policy[`${evidenceTopic}Required`], true);
    assert.equal(policy[`${evidenceTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        `${evidenceTopic}PolicySelected`,
        `${evidenceTopic}SubjectIdentified`,
        `${evidenceTopic}SourceIdentified`,
        `${evidenceTopic}Collected`,
        `${evidenceTopic}Validated`,
        `${evidenceTopic}Normalized`,
        `${evidenceTopic}RecordCreated`,
        `${evidenceTopic}RecordStored`,
        `${evidenceTopic}RecordPublished`,
        `${evidenceTopic}BundleCreated`,
        `${evidenceTopic}BundleStored`,
        `${enforcementTopic}Read`,
        `${enforcementTopic}RecordRead`,
        `${resolutionTopic}Read`,
        `${resolutionTopic}RecordRead`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalEvidenceTopic}Linked`,
        `auditRecord${capitalEvidenceTopic}Verified`,
        `${evidenceTopic}SignatureCreated`,
        `${evidenceTopic}SignatureVerified`,
        `${evidenceTopic}HashComputed`,
        `${evidenceTopic}HashStored`,
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
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementVersion,
        "P25.78"
    );
    assert.ok(policy[`${auditEvidenceTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceSource"));
    assert.equal(policy[`${auditEvidenceTopic}Policy`][`collect${capitalEvidenceTopic}Now`], false);
    assert.equal(policy[`${auditEvidenceTopic}Policy`][`${evidenceTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditEvidenceTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditEvidenceTopic}Decision`][`canCollect${capitalEvidenceTopic}`], false);
    assert.equal(policy[`${auditEvidenceTopic}Decision`][`canRead${capitalEnforcementTopic}`], false);
    assert.equal(policy[`${auditEvidenceTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditEvidenceTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditEvidenceTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const auditAttestationTopic = `audit${capitalAttestationTopic}`;

    assert.equal(policy[`${auditAttestationTopic}Version`], "P25.80");
    assert.equal(policy[`${attestationTopic}Required`], true);
    assert.equal(policy[`${attestationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        `${attestationTopic}PolicySelected`,
        `${attestationTopic}SubjectIdentified`,
        `${attestationTopic}AuthorityIdentified`,
        `${attestationTopic}Prepared`,
        `${attestationTopic}Created`,
        `${attestationTopic}Validated`,
        `${attestationTopic}Stored`,
        `${attestationTopic}Published`,
        `${attestationTopic}BundleCreated`,
        `${attestationTopic}BundleStored`,
        `${evidenceTopic}RecordRead`,
        `${evidenceTopic}RecordAttested`,
        `${evidenceTopic}RecordVerified`,
        `${evidenceTopic}Read`,
        `${evidenceTopic}BundleRead`,
        `${enforcementTopic}Read`,
        `${enforcementTopic}RecordRead`,
        `${resolutionTopic}Read`,
        `${resolutionTopic}RecordRead`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalAttestationTopic}Linked`,
        `auditRecord${capitalAttestationTopic}Verified`,
        `${attestationTopic}SignatureCreated`,
        `${attestationTopic}SignatureVerified`,
        `${attestationTopic}HashComputed`,
        `${attestationTopic}HashStored`,
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
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceVersion,
        "P25.79"
    );
    assert.ok(policy[`${auditAttestationTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationAuthority"));
    assert.equal(policy[`${auditAttestationTopic}Policy`][`create${capitalAttestationTopic}Now`], false);
    assert.equal(policy[`${auditAttestationTopic}Policy`][`${attestationTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditAttestationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditAttestationTopic}Decision`][`canCreate${capitalAttestationTopic}`], false);
    assert.equal(policy[`${auditAttestationTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditAttestationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditAttestationTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditAttestationTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const auditNotarizationTopic = `audit${capitalNotarizationTopic}`;

    assert.equal(policy[`${auditNotarizationTopic}Version`], "P25.81");
    assert.equal(policy[`${notarizationTopic}Required`], true);
    assert.equal(policy[`${notarizationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        `${notarizationTopic}PolicySelected`,
        `${notarizationTopic}SubjectIdentified`,
        `${notarizationTopic}AuthorityIdentified`,
        `${notarizationTopic}Prepared`,
        `${notarizationTopic}Created`,
        `${notarizationTopic}Validated`,
        `${notarizationTopic}Stored`,
        `${notarizationTopic}Published`,
        `${notarizationTopic}RecordCreated`,
        `${notarizationTopic}RecordStored`,
        `${notarizationTopic}RecordPublished`,
        `${attestationTopic}Read`,
        `${attestationTopic}RecordRead`,
        `${attestationTopic}Notarized`,
        `${attestationTopic}Verified`,
        `${attestationTopic}BundleRead`,
        `${evidenceTopic}RecordRead`,
        `${evidenceTopic}Read`,
        `${evidenceTopic}BundleRead`,
        `${enforcementTopic}Read`,
        `${enforcementTopic}RecordRead`,
        `${resolutionTopic}Read`,
        `${resolutionTopic}RecordRead`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalNotarizationTopic}Linked`,
        `auditRecord${capitalNotarizationTopic}Verified`,
        `${notarizationTopic}SignatureCreated`,
        `${notarizationTopic}SignatureVerified`,
        `${notarizationTopic}HashComputed`,
        `${notarizationTopic}HashStored`,
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
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationVersion,
        "P25.80"
    );
    assert.ok(policy[`${auditNotarizationTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationAuthority"));
    assert.equal(policy[`${auditNotarizationTopic}Policy`][`create${capitalNotarizationTopic}Now`], false);
    assert.equal(policy[`${auditNotarizationTopic}Policy`][`${notarizationTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditNotarizationTopic}Decision`][`canCreate${capitalNotarizationTopic}`], false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`][`canNotarize${capitalAttestationTopic}`], false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`][`canRead${capitalEnforcementTopic}`], false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditNotarizationTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const certificationTopic = `${notarizationTopic}Certification`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const capitalCertificationTopic = `${capitalNotarizationTopic}Certification`;
    const auditCertificationTopic = `audit${capitalCertificationTopic}`;

    assert.equal(policy[`${auditCertificationTopic}Version`], "P25.82");
    assert.equal(policy[`${certificationTopic}Required`], true);
    assert.equal(policy[`${certificationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${certificationTopic}PolicySelected`,
        `${certificationTopic}SubjectIdentified`,
        `${certificationTopic}AuthorityIdentified`,
        `${certificationTopic}Prepared`,
        `${certificationTopic}Created`,
        `${certificationTopic}Validated`,
        `${certificationTopic}Stored`,
        `${certificationTopic}Published`,
        `${certificationTopic}RecordCreated`,
        `${certificationTopic}RecordStored`,
        `${certificationTopic}RecordPublished`,
        `${notarizationTopic}Read`,
        `${notarizationTopic}RecordRead`,
        `${notarizationTopic}Certified`,
        `${notarizationTopic}Verified`,
        `${attestationTopic}Read`,
        `${attestationTopic}RecordRead`,
        `${attestationTopic}Notarized`,
        `${attestationTopic}Verified`,
        `${evidenceTopic}RecordRead`,
        `${enforcementTopic}Read`,
        `${resolutionTopic}Read`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalCertificationTopic}Linked`,
        `auditRecord${capitalCertificationTopic}Verified`,
        `${certificationTopic}SignatureCreated`,
        `${certificationTopic}SignatureVerified`,
        `${certificationTopic}HashComputed`,
        `${certificationTopic}HashStored`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationVersion,
        "P25.81"
    );
    assert.ok(policy[`${auditCertificationTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationAuthority"));
    assert.equal(policy[`${auditCertificationTopic}Policy`][`create${capitalCertificationTopic}Now`], false);
    assert.equal(policy[`${auditCertificationTopic}Policy`][`${certificationTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditCertificationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditCertificationTopic}Decision`][`canCreate${capitalCertificationTopic}`], false);
    assert.equal(policy[`${auditCertificationTopic}Decision`][`canCertify${capitalNotarizationTopic}`], false);
    assert.equal(policy[`${auditCertificationTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditCertificationTopic}Decision`][`canRead${capitalEnforcementTopic}`], false);
    assert.equal(policy[`${auditCertificationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditCertificationTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditCertificationTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(policy: any) {
    const certificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const capitalCertificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const capitalEvidenceTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidence";
    const auditEndorsementTopic = `audit${capitalEndorsementTopic}`;

    assert.equal(policy[`${auditEndorsementTopic}Version`], "P25.83");
    assert.equal(policy[`${endorsementTopic}Required`], true);
    assert.equal(policy[`${endorsementTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${endorsementTopic}PolicySelected`,
        `${endorsementTopic}Created`,
        `${endorsementTopic}RecordCreated`,
        `${certificationTopic}Read`,
        `${certificationTopic}Endorsed`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalEndorsementTopic}Linked`,
        `${endorsementTopic}SignatureCreated`,
        `${endorsementTopic}HashComputed`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationVersion,
        "P25.82"
    );
    assert.ok(policy[`${auditEndorsementTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementAuthority"));
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`create${capitalEndorsementTopic}Now`], false);
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`endorse${capitalCertificationTopic}Now`], false);
    assert.equal(policy[`${auditEndorsementTopic}Policy`][`${endorsementTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canCreate${capitalEndorsementTopic}`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canEndorse${capitalCertificationTopic}`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditEndorsementTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(policy: any) {
    const certificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const countersignatureTopic = `${endorsementTopic}Countersignature`;
    const capitalCertificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const capitalCountersignatureTopic = `${capitalEndorsementTopic}Countersignature`;
    const capitalEvidenceTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidence";
    const auditCountersignatureTopic = `audit${capitalCountersignatureTopic}`;

    assert.equal(policy[`${auditCountersignatureTopic}Version`], "P25.84");
    assert.equal(policy[`${countersignatureTopic}Required`], true);
    assert.equal(policy[`${countersignatureTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${countersignatureTopic}PolicySelected`,
        `${countersignatureTopic}Created`,
        `${countersignatureTopic}RecordCreated`,
        `${endorsementTopic}Read`,
        `${endorsementTopic}Countersigned`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalCountersignatureTopic}Linked`,
        `${countersignatureTopic}SignatureCreated`,
        `${countersignatureTopic}HashComputed`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementVersion,
        "P25.83"
    );
    assert.ok(policy[`${auditCountersignatureTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureAuthority"));
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`create${capitalCountersignatureTopic}Now`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`countersign${capitalEndorsementTopic}Now`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Policy`][`${countersignatureTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canCreate${capitalCountersignatureTopic}`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canCountersign${capitalEndorsementTopic}`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`][`canRead${capitalEvidenceTopic}Record`], false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditCountersignatureTopic}Decision`].canEnableRuntimeDispatch, false);
}
function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(policy: any) {
    const certificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const endorsementTopic = `${certificationTopic}Endorsement`;
    const countersignatureTopic = `${endorsementTopic}Countersignature`;
    const verificationTopic = `${countersignatureTopic}Verification`;
    const capitalCertificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertification";
    const capitalEndorsementTopic = `${capitalCertificationTopic}Endorsement`;
    const capitalCountersignatureTopic = `${capitalEndorsementTopic}Countersignature`;
    const capitalVerificationTopic = `${capitalCountersignatureTopic}Verification`;
    const auditCountersignatureTopic = `audit${capitalCountersignatureTopic}`;
    const auditVerificationTopic = `audit${capitalVerificationTopic}`;

    assert.equal(policy[`${auditVerificationTopic}Version`], "P25.85");
    assert.equal(policy[`${verificationTopic}Required`], true);
    assert.equal(policy[`${verificationTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${verificationTopic}PolicySelected`,
        `${verificationTopic}SubjectIdentified`,
        `${verificationTopic}AuthorityIdentified`,
        "countersignatureRead",
        `${countersignatureTopic}RecordRead`,
        "countersignaturePayloadParsed",
        "countersignatureSignatureRead",
        "countersignatureSignatureVerified",
        "countersignatureHashComputed",
        "countersignatureHashMatched",
        "countersignatureChainLinked",
        "countersignatureChainVerified",
        `${verificationTopic}Prepared`,
        `${verificationTopic}Executed`,
        `${verificationTopic}Passed`,
        `${verificationTopic}Failed`,
        `${verificationTopic}Stored`,
        `${verificationTopic}Published`,
        "auditRecordRead",
        "auditRecordQueried",
        `auditRecord${capitalVerificationTopic}Linked`,
        `auditRecord${capitalVerificationTopic}Verified`,
        `${verificationTopic}SignatureCreated`,
        `${verificationTopic}SignatureVerified`,
        `${verificationTopic}HashComputed`,
        `${verificationTopic}HashStored`,
        "materializationApproved",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy[`${auditCountersignatureTopic}Version`],
        "P25.84"
    );
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(
        policy[`${auditVerificationTopic}Policy`].policy,
        "verify-countersignature-after-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-record-defined"
    );
    assert.ok(policy[`${auditVerificationTopic}Policy`].requiredInputs.includes("trustedCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationAuthority"));
    assert.equal(policy[`${auditVerificationTopic}Policy`][`select${capitalVerificationTopic}PolicyNow`], false);
    assert.equal(policy[`${auditVerificationTopic}Policy`].readCountersignatureNow, false);
    assert.equal(policy[`${auditVerificationTopic}Policy`].verifyCountersignatureSignatureNow, false);
    assert.equal(policy[`${auditVerificationTopic}Policy`][`${verificationTopic}PayloadLogged`], false);
    assert.ok(
        policy[`${auditVerificationTopic}Checks`].some(
            (entry: PolicyCheck) =>
                entry.id ===
                    "countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-signature-not-verified" &&
                entry.executed === false
        )
    );
    assert.equal(policy[`${auditVerificationTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditVerificationTopic}Decision`][`canSelect${capitalVerificationTopic}Policy`], false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadCountersignature, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadCountersignatureRecord, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canVerifyCountersignatureSignature, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canComputeCountersignatureHash, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canLinkCountersignatureChain, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canMaterializeFiles, false);
    assert.equal(policy[`${auditVerificationTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(policy: any) {
    const verificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const revocationTopic = `${verificationTopic}Revocation`;
    const appealTopic = `${revocationTopic}Appeal`;
    const capitalVerificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const capitalRevocationTopic = `${capitalVerificationTopic}Revocation`;
    const capitalAppealTopic = `${capitalRevocationTopic}Appeal`;
    const auditRevocationTopic = `audit${capitalRevocationTopic}`;
    const auditAppealTopic = `audit${capitalAppealTopic}`;

    assert.equal(policy[`${auditAppealTopic}Version`], "P25.98");
    assert.equal(policy[`${appealTopic}Required`], true);
    assert.equal(policy[`${appealTopic}Planned`], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        `${appealTopic}PolicySelected`,
        `${appealTopic}Executed`,
        `${appealTopic}Appealed`,
        `${appealTopic}RecordStored`,
        `${revocationTopic}Read`,
        `${revocationTopic}RecordRead`,
        "auditRecordRead",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy[`${auditRevocationTopic}Version`],
        "P25.97"
    );
    assert.ok(policy[`${auditAppealTopic}Policy`].requiredInputs.includes(`${revocationTopic}Record`));
    assert.ok(policy[`${auditAppealTopic}Policy`].requiredInputs.includes(`trusted${capitalAppealTopic}Authority`));
    assert.ok(policy[`${auditAppealTopic}Policy`].requiredInputs.includes("appealReason"));
    assert.equal(policy[`${auditAppealTopic}Policy`][`${appealTopic}PayloadLogged`], false);
    assert.equal(policy[`${auditAppealTopic}Policy`][`appeal${capitalRevocationTopic}Now`], false);
    assert.equal(policy[`${auditAppealTopic}Decision`].status, "blocked");
    assert.equal(policy[`${auditAppealTopic}Decision`][`canAppeal${capitalRevocationTopic}`], false);
    assert.equal(policy[`${auditAppealTopic}Decision`].canReadAuditRecord, false);
    assert.equal(policy[`${auditAppealTopic}Decision`].canEnableRuntimeDispatch, false);
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(policy: any) {
    const verificationTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const revocationTopic = verificationTopic + "Revocation";
    const appealTopic = revocationTopic + "Appeal";
    const resolutionTopic = appealTopic + "Resolution";
    const capitalVerificationTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification";
    const capitalRevocationTopic = capitalVerificationTopic + "Revocation";
    const capitalAppealTopic = capitalRevocationTopic + "Appeal";
    const capitalResolutionTopic = capitalAppealTopic + "Resolution";
    const auditAppealTopic = "audit" + capitalAppealTopic;
    const auditResolutionTopic = "audit" + capitalResolutionTopic;

    assert.equal(policy[auditResolutionTopic + "Version"], "P25.99");
    assert.equal(policy[resolutionTopic + "Required"], true);
    assert.equal(policy[resolutionTopic + "Planned"], true);
    assert.equal(policy.dryRunOnly, true);
    assert.equal(policy.approvalRequired, true);

    for (const key of [
        "approved",
        "finalApprovalGranted",
        resolutionTopic + "PolicySelected",
        resolutionTopic + "SubjectIdentified",
        resolutionTopic + "AuthorityIdentified",
        appealTopic + "Read",
        appealTopic + "RecordRead",
        resolutionTopic + "ReasonCaptured",
        resolutionTopic + "ScopeComputed",
        resolutionTopic + "OutcomeSelected",
        resolutionTopic + "Prepared",
        resolutionTopic + "Validated",
        resolutionTopic + "Stored",
        resolutionTopic + "Executed",
        appealTopic + "Resolved",
        resolutionTopic + "Accepted",
        resolutionTopic + "Rejected",
        resolutionTopic + "Published",
        resolutionTopic + "RecordCreated",
        resolutionTopic + "RecordStored",
        resolutionTopic + "RecordPublished",
        revocationTopic + "Read",
        revocationTopic + "RecordRead",
        "auditRecordRead",
        "auditRecordQueried",
        "dispatch",
        "networkDispatch",
        "runtimeRegistration",
        "localFileWrites",
        "processSpawn",
        "packageCreated",
        "workspaceMutation",
        "fileMaterialization",
        "commandExecution",
        "buildOutput",
        "filesWritten",
    ]) {
        assert.equal(policy[key], false, key);
    }

    assert.equal(
        policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy[auditAppealTopic + "Version"],
        "P25.98"
    );
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.ok(policy[auditResolutionTopic + "Policy"].requiredInputs.includes(appealTopic + "Record"));
    assert.ok(policy[auditResolutionTopic + "Policy"].requiredInputs.includes("trusted" + capitalResolutionTopic + "Authority"));
    assert.ok(policy[auditResolutionTopic + "Policy"].requiredInputs.includes("resolutionReason"));
    assert.ok(policy[auditResolutionTopic + "Policy"].requiredInputs.includes("resolutionOutcome"));
    assert.equal(policy[auditResolutionTopic + "Policy"][resolutionTopic + "PayloadLogged"], false);
    assert.equal(policy[auditResolutionTopic + "Policy"]["resolve" + capitalAppealTopic + "Now"], false);
    assert.equal(policy[auditResolutionTopic + "Policy"]["read" + capitalAppealTopic + "RecordNow"], false);
    assert.equal(policy[auditResolutionTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditResolutionTopic + "Decision"]["canResolve" + capitalAppealTopic], false);
    assert.equal(policy[auditResolutionTopic + "Decision"]["canStore" + capitalResolutionTopic + "Record"], false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canMaterializeFiles, false);
    assert.equal(policy[auditResolutionTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not resolve countersignature verification revocation appeals")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read appeal or appeal records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read or query audit records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = resolutionTopic + "Enforcement";
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = capitalResolutionTopic + "Enforcement";
    const auditResolutionTopic = "audit" + capitalResolutionTopic;
    const auditEnforcementTopic = "audit" + capitalEnforcementTopic;
    const consumedResolutionPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        enforcementTopic + "Required",
        enforcementTopic + "Planned",
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEnforcementTopic + "Version"], "P25.100");
    assert.equal(policy[enforcementTopic + "Required"], true);
    assert.equal(policy[enforcementTopic + "Planned"], true);
    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }
    assert.equal(policy.consumes[consumedResolutionPolicyKey][auditResolutionTopic + "Version"], "P25.99");
    assert.equal(policy.consumes[consumedResolutionPolicyKey][resolutionTopic + "RecordStored"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.ok(policy[auditEnforcementTopic + "Policy"].requiredInputs.includes(resolutionTopic + "Record"));
    assert.ok(policy[auditEnforcementTopic + "Policy"].requiredInputs.includes("enforcementAction"));
    assert.equal(policy[auditEnforcementTopic + "Policy"]["enforce" + capitalResolutionTopic + "Now"], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canEnforce" + capitalResolutionTopic], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"]["canStore" + capitalEnforcementTopic + "Record"], false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].canMaterializeFiles, false);
    assert.equal(policy[auditEnforcementTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not enforce countersignature verification revocation appeal resolutions")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read appeal resolutions or resolution records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = resolutionTopic + "Enforcement";
    const evidenceTopic = enforcementTopic + "Evidence";
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = capitalResolutionTopic + "Enforcement";
    const capitalEvidenceTopic = capitalEnforcementTopic + "Evidence";
    const auditEnforcementTopic = "audit" + capitalEnforcementTopic;
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const consumedEnforcementPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        evidenceTopic + "Required",
        evidenceTopic + "Planned",
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditEvidenceTopic + "Version"], "P25.101");
    assert.equal(policy[evidenceTopic + "Required"], true);
    assert.equal(policy[evidenceTopic + "Planned"], true);
    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }
    assert.equal(policy.consumes[consumedEnforcementPolicyKey][auditEnforcementTopic + "Version"], "P25.100");
    assert.equal(policy.consumes[consumedEnforcementPolicyKey][enforcementTopic + "RecordStored"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.ok(policy[auditEvidenceTopic + "Policy"].requiredInputs.includes(enforcementTopic + "Record"));
    assert.ok(policy[auditEvidenceTopic + "Policy"].requiredInputs.includes(evidenceTopic + "PolicyId"));
    assert.equal(policy[auditEvidenceTopic + "Policy"]["collect" + capitalEvidenceTopic + "Now"], false);
    assert.equal(policy[auditEvidenceTopic + "Policy"]["read" + capitalEnforcementTopic + "RecordNow"], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canCollect" + capitalEvidenceTopic], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"]["canStore" + capitalEvidenceTopic + "Record"], false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canMaterializeFiles, false);
    assert.equal(policy[auditEvidenceTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not collect, validate, or normalize evidence")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read appeal resolution enforcement records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = resolutionTopic + "Enforcement";
    const evidenceTopic = enforcementTopic + "Evidence";
    const attestationTopic = evidenceTopic + "Attestation";
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = capitalResolutionTopic + "Enforcement";
    const capitalEvidenceTopic = capitalEnforcementTopic + "Evidence";
    const capitalAttestationTopic = capitalEvidenceTopic + "Attestation";
    const auditEvidenceTopic = "audit" + capitalEvidenceTopic;
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const consumedEvidencePolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        attestationTopic + "Required",
        attestationTopic + "Planned",
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditAttestationTopic + "Version"], "P25.102");
    assert.equal(policy[attestationTopic + "Required"], true);
    assert.equal(policy[attestationTopic + "Planned"], true);
    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }
    assert.equal(policy.consumes[consumedEvidencePolicyKey][auditEvidenceTopic + "Version"], "P25.101");
    assert.equal(policy.consumes[consumedEvidencePolicyKey][evidenceTopic + "RecordStored"], false);
    assert.equal(policy.consumes[consumedEvidencePolicyKey][evidenceTopic + "BundleStored"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.ok(policy[auditAttestationTopic + "Policy"].requiredInputs.includes(evidenceTopic + "Record"));
    assert.ok(policy[auditAttestationTopic + "Policy"].requiredInputs.includes(attestationTopic + "PolicyId"));
    assert.equal(policy[auditAttestationTopic + "Policy"]["create" + capitalAttestationTopic + "Now"], false);
    assert.equal(policy[auditAttestationTopic + "Policy"]["attest" + capitalEvidenceTopic + "RecordNow"], false);
    assert.equal(policy[auditAttestationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditAttestationTopic + "Decision"]["canCreate" + capitalAttestationTopic], false);
    assert.equal(policy[auditAttestationTopic + "Decision"]["canStore" + capitalAttestationTopic], false);
    assert.equal(policy[auditAttestationTopic + "Decision"]["canAttest" + capitalEvidenceTopic + "Record"], false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canMaterializeFiles, false);
    assert.equal(policy[auditAttestationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not prepare, create, validate, store, or publish attestations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, attest, or verify evidence records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = resolutionTopic + "Enforcement";
    const evidenceTopic = enforcementTopic + "Evidence";
    const attestationTopic = evidenceTopic + "Attestation";
    const notarizationTopic = attestationTopic + "Notarization";
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEvidenceTopic = capitalResolutionTopic + "EnforcementEvidence";
    const capitalAttestationTopic = capitalEvidenceTopic + "Attestation";
    const capitalNotarizationTopic = capitalAttestationTopic + "Notarization";
    const auditAttestationTopic = "audit" + capitalAttestationTopic;
    const auditNotarizationTopic = "audit" + capitalNotarizationTopic;
    const consumedAttestationPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        notarizationTopic + "Required",
        notarizationTopic + "Planned",
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[auditNotarizationTopic + "Version"], "P25.103");
    assert.equal(policy[notarizationTopic + "Required"], true);
    assert.equal(policy[notarizationTopic + "Planned"], true);
    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }
    assert.equal(policy.consumes[consumedAttestationPolicyKey][auditAttestationTopic + "Version"], "P25.102");
    assert.equal(policy.consumes[consumedAttestationPolicyKey][attestationTopic + "RecordRead"], false);
    assert.equal(policy.consumes[consumedAttestationPolicyKey][attestationTopic + "Notarized"], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.ok(policy[auditNotarizationTopic + "Policy"].requiredInputs.includes(attestationTopic + "Record"));
    assert.ok(policy[auditNotarizationTopic + "Policy"].requiredInputs.includes(notarizationTopic + "PolicyId"));
    assert.equal(policy[auditNotarizationTopic + "Policy"]["create" + capitalNotarizationTopic + "Now"], false);
    assert.equal(policy[auditNotarizationTopic + "Policy"]["notarize" + capitalAttestationTopic + "RecordNow"], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].status, "blocked");
    assert.equal(policy[auditNotarizationTopic + "Decision"]["canNotarize" + capitalAttestationTopic + "Record"], false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canReadAuditRecord, false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canMaterializeFiles, false);
    assert.equal(policy[auditNotarizationTopic + "Decision"].canEnableRuntimeDispatch, false);
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not prepare, create, validate, store, or publish notarizations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read, notarize, or verify attestation records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(policy: any) {
    const resolutionTopic =
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const enforcementTopic = `${resolutionTopic}Enforcement`;
    const evidenceTopic = `${enforcementTopic}Evidence`;
    const attestationTopic = `${evidenceTopic}Attestation`;
    const notarizationTopic = `${attestationTopic}Notarization`;
    const certificationTopic = `${notarizationTopic}Certification`;
    const capitalResolutionTopic =
        "CountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolution";
    const capitalEnforcementTopic = `${capitalResolutionTopic}Enforcement`;
    const capitalEvidenceTopic = `${capitalEnforcementTopic}Evidence`;
    const capitalAttestationTopic = `${capitalEvidenceTopic}Attestation`;
    const capitalNotarizationTopic = `${capitalAttestationTopic}Notarization`;
    const capitalCertificationTopic = `${capitalNotarizationTopic}Certification`;
    const auditNotarizationTopic = `audit${capitalNotarizationTopic}`;
    const auditCertificationTopic = `audit${capitalCertificationTopic}`;
    const consumedNotarizationPolicyKey =
        "packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy";
    const allowedTopLevelTrue = new Set([
        "dryRunOnly",
        "approvalRequired",
        `${certificationTopic}Required`,
        `${certificationTopic}Planned`,
    ]);

    assert.equal(policy.status, "planned-disabled");
    assert.equal(policy[`${auditCertificationTopic}Version`], "P25.104");
    assert.equal(policy.adapter, "renderer-service");
    assert.equal(policy.command, "render.thumbnail");
    assert.equal(policy[`${certificationTopic}Required`], true);
    assert.equal(policy[`${certificationTopic}Planned`], true);

    for (const [key, value] of Object.entries(policy)) {
        if (typeof value === "boolean" && !allowedTopLevelTrue.has(key)) {
            assert.equal(value, false, key);
        }
    }

    assert.equal(policy.consumes[consumedNotarizationPolicyKey].currentStatus, "planned-disabled");
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${auditNotarizationTopic}Version`], "P25.103");
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Created`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Stored`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}RecordRead`], false);
    assert.equal(policy.consumes[consumedNotarizationPolicyKey][`${notarizationTopic}Certified`], false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditRecordRead, false);
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.accessGranted, false);
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.equal(policy[`${auditCertificationTopic}Policy`].policy, "certify-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-after-notarization-record-defined");
    assert.ok(policy[`${auditCertificationTopic}Policy`].requiredInputs.includes(`trusted${capitalCertificationTopic}Authority`));
    assert.equal(policy[`${auditCertificationTopic}Policy`][`${certificationTopic}PayloadLogged`], false);
    for (const [key, value] of Object.entries(policy[`${auditCertificationTopic}Policy`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
    assert.ok(policy[`${auditCertificationTopic}Checks`].some((entry: PolicyCheck) => entry.id.includes("notarization-certification-not-created") && entry.executed === false && entry.passed === false));
    for (const entry of policy[`${auditCertificationTopic}Checks`]) {
        assert.equal(entry.required, true, entry.id);
        assert.equal(entry.planned, true, entry.id);
        assert.equal(entry.executed, false, entry.id);
        assert.equal(entry.passed, false, entry.id);
    }
    assert.equal(policy[`${auditCertificationTopic}Decision`].status, "blocked");
    assert.match(policy[`${auditCertificationTopic}Decision`].reason, /metadata-only/);
    for (const [key, value] of Object.entries(policy[`${auditCertificationTopic}Decision`])) {
        if (typeof value === "boolean") {
            assert.equal(value, false, key);
        }
    }
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not certify notarizations")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not read or query audit records")));
    assert.ok(policy.noOpGuarantees.some((entry: string) => entry.includes("does not register runtime dispatch")));
    assert.ok(policy.requiredBeforeRuntimeDispatch.includes("define audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification policy schema"));
}


function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVersion, "P25.86");
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequired, true);
    assert.equal(policy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPlanned, true);

    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRequestStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRevoked",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordPublished",
        "countersignatureRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevoked",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationHashStored",
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

    assert.equal(policy.consumes.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationVersion, "P25.85");
    assert.equal(policy.consumes.packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion, "P25.53");
    assert.equal(policy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy.policy,
        "revoke-countersignature-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-revocation-appeal-resolution-enforcement-evidence-attestation-notarization-certification-endorsement-countersignature-verification-after-verification-record-defined"
    );
    assert.ok(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy.requiredInputs.includes(
            "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRecord"
        )
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canRevokeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerification,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canCreateCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecord,
        false
    );
    assert.equal(
        policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationDecision.canReadAuditRecord,
        false
    );
}

function assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(policy: any) {
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVersion, "P25.87");
    for (const key of [
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicySelected",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSubjectIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealAuthorityIdentified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealReasonCaptured",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealScopeComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestPrepared",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestValidated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRequestStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealExecuted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealGranted",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDenied",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordStored",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecordPublished",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationRecordRead",
        "countersignatureRead",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationVerified",
        "auditRecordRead",
        "auditRecordQueried",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealLinked",
        "auditRecordCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSignatureCreated",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealSignatureVerified",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHashComputed",
        "countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHashStored",
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
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canReadCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canAppealCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocation, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canStoreCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canReadAuditRecord, false);
    assert.equal(policy.auditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealDecision.canComputeCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealHash, false);
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
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertP25105EndorsementPolicyMetadataOnly(body.data[P25105_POLICY_KEY]);
        assertP25106CountersignaturePolicyMetadataOnly(body.data[P25106_POLICY_KEY]);
        assertP25107VerificationPolicyMetadataOnly(body.data[P25107_POLICY_KEY]);
        assertP25108RevocationPolicyMetadataOnly(body.data[P25108_POLICY_KEY]);
        assertP25109RevocationAppealPolicyMetadataOnly(body.data[P25109_POLICY_KEY]);
        assertP25110RevocationAppealResolutionPolicyMetadataOnly(body.data[P25110_POLICY_KEY]);
        assertP25111RevocationAppealResolutionEnforcementPolicyMetadataOnly(body.data[P25111_POLICY_KEY]);
        assertP25112RevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(body.data[P25112_POLICY_KEY]);
        assertP25113RevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(body.data[P25113_POLICY_KEY]);
        assertP25114RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(body.data[P25114_POLICY_KEY]);
        assertP25115RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(body.data[P25115_POLICY_KEY]);
        assertP25116RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(body.data[P25116_POLICY_KEY]);
        assertP25117RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(body.data[P25117_POLICY_KEY]);
        assertP25118RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(body.data[P25118_POLICY_KEY]);
        assertP25119RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(body.data[P25119_POLICY_KEY]);
        assertP25120RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(body.data[P25120_POLICY_KEY]);
        assertP25121RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(body.data[P25121_POLICY_KEY]);
        assertP25122RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(body.data[P25122_POLICY_KEY]);
        assertP25123RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(body.data[P25123_POLICY_KEY]);
        assertP25124RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(body.data[P25124_POLICY_KEY]);
        assertP25125RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(body.data[P25125_POLICY_KEY]);
        assertP25126RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(body.data[P25126_POLICY_KEY]);
        assertP25127RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(body.data[P25127_POLICY_KEY]);
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
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy
        );
        assertAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(
            body.error.data.packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy
        );
        assertP25105EndorsementPolicyMetadataOnly(body.error.data[P25105_POLICY_KEY]);
        assertP25106CountersignaturePolicyMetadataOnly(body.error.data[P25106_POLICY_KEY]);
        assertP25107VerificationPolicyMetadataOnly(body.error.data[P25107_POLICY_KEY]);
        assertP25108RevocationPolicyMetadataOnly(body.error.data[P25108_POLICY_KEY]);
        assertP25109RevocationAppealPolicyMetadataOnly(body.error.data[P25109_POLICY_KEY]);
        assertP25110RevocationAppealResolutionPolicyMetadataOnly(body.error.data[P25110_POLICY_KEY]);
        assertP25111RevocationAppealResolutionEnforcementPolicyMetadataOnly(body.error.data[P25111_POLICY_KEY]);
        assertP25112RevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(body.error.data[P25112_POLICY_KEY]);
        assertP25113RevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(body.error.data[P25113_POLICY_KEY]);
        assertP25114RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(body.error.data[P25114_POLICY_KEY]);
        assertP25115RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(body.error.data[P25115_POLICY_KEY]);
        assertP25116RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(body.error.data[P25116_POLICY_KEY]);
        assertP25117RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicyMetadataOnly(body.error.data[P25117_POLICY_KEY]);
        assertP25118RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicyMetadataOnly(body.error.data[P25118_POLICY_KEY]);
        assertP25119RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicyMetadataOnly(body.error.data[P25119_POLICY_KEY]);
        assertP25120RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicyMetadataOnly(body.error.data[P25120_POLICY_KEY]);
        assertP25121RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicyMetadataOnly(body.error.data[P25121_POLICY_KEY]);
        assertP25122RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicyMetadataOnly(body.error.data[P25122_POLICY_KEY]);
        assertP25123RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicyMetadataOnly(body.error.data[P25123_POLICY_KEY]);
        assertP25124RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicyMetadataOnly(body.error.data[P25124_POLICY_KEY]);
        assertP25125RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicyMetadataOnly(body.error.data[P25125_POLICY_KEY]);
        assertP25126RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicyMetadataOnly(body.error.data[P25126_POLICY_KEY]);
        assertP25127RevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicyMetadataOnly(body.error.data[P25127_POLICY_KEY]);
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
