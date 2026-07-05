export type CommandAdapterKind =
    | "backend-rpc"
    | "backend-command"
    | "renderer-service"
    | "plugin-live"
    | "exporter"
    | "browser-url"
    | "local-fs";

export type RequestedCommandAdapter = CommandAdapterKind | "auto";

export type AdapterSelectionStatus = "selected" | "unsupported" | "unavailable";

export interface CommandAdapterCandidate {
    kind: CommandAdapterKind;
    available?: boolean;
    priority?: number;
    reason?: string | null;
}

export interface NormalizedCommandAdapterCandidate {
    kind: CommandAdapterKind;
    available: boolean;
    priority: number;
    reason: string | null;
}

export interface CommandAdapterFallback {
    kind: CommandAdapterKind;
    available: boolean;
    reason: string | null;
}

export interface CommandAdapterSelection {
    command: string;
    requested: RequestedCommandAdapter | string;
    selected: CommandAdapterKind | null;
    status: AdapterSelectionStatus;
    candidates: NormalizedCommandAdapterCandidate[];
    fallbacks: CommandAdapterFallback[];
}

export interface SelectCommandAdapterOptions {
    command: string;
    requestedAdapter?: RequestedCommandAdapter | string;
    candidates: CommandAdapterCandidate[];
}

export interface CommandErrorCodeCatalog {
    AUTHENTICATION_REQUIRED: "authentication_required";
    BACKEND_CONFIG_INVALID: "penpot_backend_config_invalid";
    BACKEND_UNAVAILABLE: "penpot_backend_unavailable";
    OBJECT_NOT_FOUND_OR_FORBIDDEN: "object_not_found_or_forbidden";
    PERMISSION_DENIED: "permission_denied";
    PENPOT_RPC_ERROR: "penpot_rpc_error";
    RATE_LIMIT_REACHED: "rate_limit_reached";
    ADAPTER_NOT_AVAILABLE: "adapter_not_available";
    ADAPTER_NOT_SUPPORTED: "adapter_not_supported";
    FILE_CONTEXT_REQUIRED: "file_context_required";
    MCP_WRITE_CONCURRENCY_LIMIT: "mcp_write_concurrency_limit";
    MCP_WRITE_RATE_LIMIT: "mcp_write_rate_limit";
    DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED: "destructive_action_confirmation_required";
}

export interface AdapterSelectionReasonCodeCatalog {
    BACKEND_COMMAND_FILE_ID_REQUIRED: "backend_command_file_id_required";
    BACKEND_COMMAND_FILE_PAGE_REQUIRED: "backend_command_file_page_required";
    BACKEND_COMMAND_LAYOUT_UNSUPPORTED: "backend_command_layout_unsupported";
    PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED: "plugin_live_backend_only_shape_fields_unsupported";
    PLUGIN_LIVE_OMIT_FILE_ID: "plugin_live_omit_file_id";
    PLUGIN_LIVE_OMIT_FILE_PAGE: "plugin_live_omit_file_page";
    EXPORTER_EXPLICIT_TARGET_REQUIRED: "exporter_explicit_target_required";
    PLUGIN_LIVE_OMIT_EXPLICIT_TARGET: "plugin_live_omit_explicit_target";
    CLI_PLUGIN_LIVE_UNSUPPORTED: "cli_plugin_live_unsupported";
    CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED: "cli_export_plugin_live_unsupported";
    CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED: "cli_shape_plugin_live_unsupported";
    PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED: "plugin_live_workspace_state_required";
    BACKEND_COMMAND_PROTOTYPE_READ_PLANNED: "backend_command_prototype_read_planned";
    BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED: "backend_command_prototype_mutation_unsupported";
    BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED: "backend_command_grid_contract_unsupported";
    CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED: "cli_live_workspace_state_unsupported";
}

export type CommandErrorCode = CommandErrorCodeCatalog[keyof CommandErrorCodeCatalog];
export type AdapterSelectionReasonCode =
    AdapterSelectionReasonCodeCatalog[keyof AdapterSelectionReasonCodeCatalog];

export interface CreateCommandErrorPayloadOptions {
    actions?: string[];
    data?: Record<string, unknown>;
}

export interface CommandErrorPayload {
    code: CommandErrorCode | string;
    message: string;
    actions: string[];
    data: Record<string, unknown>;
}

export type CommandTransportKind = "cli" | "mcp" | "http" | "internal";
export type CommandResultStatus = "ok" | "error";

export interface CommandDescriptor {
    id: string;
    mcpToolName?: string;
    cliCommand?: string;
    title: string;
    description: string;
    inputSchema: string;
    adapters: readonly string[];
    responseShape: string;
}

export interface CommandDescriptorSummary {
    id: string;
    mcpToolName?: string;
    cliCommand?: string;
    title: string;
    adapters: readonly string[];
}

export interface CommandAuthMetadata {
    userTokenPresent?: boolean;
    mode?: string;
    source?: string;
}

export interface CreateCommandRequestEnvelopeOptions<TInput = unknown> {
    transport?: CommandTransportKind | string;
    input?: TInput;
    target?: Record<string, unknown>;
    auth?: CommandAuthMetadata;
    adapter?: CommandAdapterKind | string | null;
    adapterSelection?: CommandAdapterSelection | null;
    diagnostics?: Record<string, unknown>;
}

export interface CommandRequestEnvelope<TInput = unknown> {
    command: string;
    descriptor: CommandDescriptorSummary | null;
    transport: CommandTransportKind | string;
    input: TInput;
    target: Record<string, unknown>;
    auth: CommandAuthMetadata;
    adapter: CommandAdapterKind | string | null;
    adapterSelection: CommandAdapterSelection | null;
    diagnostics: Record<string, unknown>;
}

export interface CreateCommandResultEnvelopeOptions {
    status?: CommandResultStatus;
    transport?: CommandTransportKind | string;
    target?: Record<string, unknown>;
    adapter?: CommandAdapterKind | string | null;
    adapterSelection?: CommandAdapterSelection | null;
    diagnostics?: Record<string, unknown>;
    warnings?: string[];
}

export interface CommandResultEnvelope<TData = unknown> {
    status: CommandResultStatus;
    command: string;
    descriptor: CommandDescriptorSummary | null;
    transport: CommandTransportKind | string;
    adapter: CommandAdapterKind | string | null;
    target: Record<string, unknown>;
    auth: CommandAuthMetadata;
    diagnostics: Record<string, unknown>;
    adapterSelection: CommandAdapterSelection | null;
    data: TData;
    warnings: string[];
}

export interface CreateWorkspaceUrlOptions {
    publicUri: string;
    fileId: string;
    teamId?: string | null;
    pageId?: string | null;
}

export interface FileOpenHandoffTarget {
    fileId: string;
    teamId?: string;
    pageId?: string;
}

export interface FileOpenHandoff {
    status: string;
    requiresUserAction: boolean;
    workspaceUrl: string;
    nextActions: string[];
    target: FileOpenHandoffTarget;
}

export interface CreateFileOpenHandoffOptions extends FileOpenHandoffTarget {
    workspaceUrl: string;
    status?: string;
}

export type ExportFileFormat = "penpot";
export type ExportFileLibraryMode = "all" | "merge" | "detach";
export type RenderThumbnailTarget = "file" | "frame";
export type RenderThumbnailCachePolicy = "reuse" | "refresh";
export type RenderThumbnailFormat = "png";

export interface ExportFileFormatCatalog {
    PENPOT: "penpot";
}

export interface ExportFileLibraryModeCatalog {
    ALL: "all";
    MERGE: "merge";
    DETACH: "detach";
}

export interface RenderThumbnailTargetCatalog {
    FILE: "file";
    FRAME: "frame";
}

export interface RenderThumbnailCachePolicyCatalog {
    REUSE: "reuse";
    REFRESH: "refresh";
}

export interface RenderThumbnailFormatCatalog {
    PNG: "png";
}

export interface CreateExportFileContractOptions {
    fileId?: string | null;
    format?: ExportFileFormat | string | null;
    libraryMode?: ExportFileLibraryMode | string | null;
    type?: ExportFileLibraryMode | string | null;
    includeLibraries?: boolean;
    embedAssets?: boolean;
    output?: string | null;
    name?: string | null;
    adapter?: string | null;
}

export interface CreateRenderThumbnailContractOptions {
    fileId?: string | null;
    pageId?: string | null;
    objectId?: string | null;
    frameId?: string | null;
    shapeId?: string | null;
    target?: RenderThumbnailTarget | "object" | "shape" | string | null;
    targetKind?: RenderThumbnailTarget | "object" | "shape" | string | null;
    type?: RenderThumbnailTarget | "object" | "shape" | string | null;
    tag?: string | null;
    revn?: number | string | null;
    width?: number | string | null;
    size?: number | string | null;
    cachePolicy?: RenderThumbnailCachePolicy | string | null;
    cache?: RenderThumbnailCachePolicy | string | null;
    format?: RenderThumbnailFormat | string | null;
    output?: string | null;
    adapter?: string | null;
}

export interface ExportFileContract {
    command: "export.file";
    status: "contract";
    executable: true;
    adapter: "backend-rpc";
    target: {
        fileId: string | null;
    };
    artifact: {
        kind: "file-export";
        format: ExportFileFormat;
        mimeType: "application/zip";
        extension: ".penpot";
        name: string;
        libraryMode: ExportFileLibraryMode;
        includeLibraries: boolean;
        embedAssets: boolean;
        output: string | null;
    };
    backendRpc: {
        command: "export-binfile";
        transport: "sse";
        response: "resource-uri";
        request: {
            "file-id": string | null;
            "include-libraries": boolean;
            "embed-assets": boolean;
        };
    };
    requires: string[];
    nextActions: string[];
    diagnostics: {
        adapterBoundary: "mcp-cli-backend-rpc";
        existingBackendCommand: "export-binfile";
        exporterBoundary: string;
        mcpToolRegistered: true;
        cliCommandRegistered: true;
    };
}

export interface RenderThumbnailContract {
    command: "render.thumbnail";
    status: "contract";
    executable: false;
    adapter: null;
    target: {
        kind: RenderThumbnailTarget;
        fileId: string | null;
        pageId: string | null;
        objectId: string | null;
        tag: string | null;
        revn: number | null;
    };
    artifact: {
        kind: "thumbnail";
        format: RenderThumbnailFormat;
        mimeType: "image/png";
        extension: ".png";
        width: number;
        height: number;
        aspectRatio: "3:2";
        output: string | null;
    };
    cache: {
        policy: RenderThumbnailCachePolicy;
        scope: "file-thumbnail" | "file-object-thumbnail";
        key: string | null;
        invalidatesOn: string;
    };
    renderer: {
        primary: "render-wasm-worker";
        fallback: "frontend-rasterizer";
        width: number;
        height: number;
        dataSource: "get-file-data-for-thumbnail";
        output: "png-blob";
    };
    backendRpc: {
        data: {
            command: "get-file-data-for-thumbnail";
            method: "GET";
            request: {
                "file-id": string | null;
                "strip-frames-with-thumbnails": false;
            };
        };
        persist:
            | {
                  command: "create-file-thumbnail";
                  method: "POST";
                  request: {
                      "file-id": string | null;
                      revn: number | "<from get-file-data-for-thumbnail>";
                      media: "<rendered png blob>";
                  };
              }
            | {
                  command: "create-file-object-thumbnail";
                  method: "POST";
                  request: {
                      "file-id": string | null;
                      "object-id": string | null;
                      tag: string | null;
                      media: "<rendered png blob>";
                  };
              };
    };
    requires: string[];
    nextActions: string[];
    diagnostics: {
        adapterBoundary: "descriptor-only";
        mcpToolRegistered: false;
        cliCommandRegistered: false;
        exporterBoundary: string;
        thumbnailDataCommand: "get-file-data-for-thumbnail";
        thumbnailPersistCommand: "create-file-thumbnail" | "create-file-object-thumbnail";
        objectThumbnailIdFormat: "fileId/pageId/objectId/tag";
        frameTargetDataProviderPending: boolean;
    };
}

export interface CreateRenderThumbnailRendererServicePlanOptions extends CreateRenderThumbnailContractOptions {
    endpoint?: string | null;
    rendererServiceUri?: string | null;
    rendererUri?: string | null;
    publicUri?: string | null;
    probeTimeoutMs?: number | string | null;
    timeoutMs?: number | string | null;
    rendererServiceTimeoutMs?: number | string | null;
    clientRequest?: CreateRenderThumbnailRendererServiceClientRequestOptions | null;
    executionGate?: CreateRenderThumbnailRendererServiceExecutionGateOptions | null;
    optInConfiguration?: CreateRenderThumbnailRendererServiceOptInConfigurationOptions | null;
}

export interface RenderThumbnailRendererServicePlan {
    command: "render.thumbnail";
    status: "planned";
    executable: false;
    runtimeAvailable: false;
    adapter: "renderer-service";
    endpoint: string | null;
    contract: RenderThumbnailContract;
    target: RenderThumbnailContract["target"] & {
        objectKey: string | null;
    };
    artifact: RenderThumbnailContract["artifact"];
    cache: RenderThumbnailContract["cache"] & {
        probe?: "file-thumbnail-by-file-id-and-revn" | "file-object-thumbnail-by-object-key";
    };
    service: {
        operation: "thumbnail.render";
        transport: "internal-http-or-worker-rpc";
        adapter: "renderer-service";
        endpoint: string | null;
        client: RenderThumbnailRendererServiceClientConfig;
        availability: RenderThumbnailRendererServiceAvailability;
        localFileWrites: false;
        resourceNormalization: {
            mediaUriTemplate: "/assets/by-id/{mediaId}";
            downloadUriResolver: string;
            exampleDownloadUri: string;
        };
        responseNormalization: {
            successStatus: "ok";
            resourceFields: string[];
            downloadUriResolver: string;
            localFileWrites: false;
        };
        errorShape: {
            code: "renderer_service_error";
            retryable: "derived-from-status";
            includeServiceStatus: true;
            includeServiceData: true;
        };
        optInConfiguration: RenderThumbnailRendererServiceOptInConfiguration;
        executionGate: RenderThumbnailRendererServiceExecutionGate;
        healthPreflight: RenderThumbnailRendererServiceHealthPreflight;
        executionClientHarness: RenderThumbnailRendererServiceExecutionClientHarness;
        dispatchAdapterBoundary: RenderThumbnailRendererServiceDispatchAdapterBoundary;
        unavailableErrorTaxonomy: RenderThumbnailRendererServiceUnavailableErrorTaxonomy;
        integrationFixtureHarness: RenderThumbnailRendererServiceIntegrationFixtureHarness;
        dispatchRegistrationPreflight: RenderThumbnailRendererServiceDispatchRegistrationPreflight;
        executableAdapterRegistrationScaffold: RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold;
        adapterRegistryManifest: RenderThumbnailRendererServiceAdapterRegistryManifest;
        enablementChecklist: RenderThumbnailRendererServiceEnablementChecklist;
        implementationSliceAudit: RenderThumbnailRendererServiceImplementationSliceAudit;
        healthNoopContractFixtures: RenderThumbnailRendererServiceHealthNoopContractFixtures;
        noopServiceHostScaffold: RenderThumbnailRendererServiceNoopServiceHostScaffold;
        hostLifecycleTestFixtures: RenderThumbnailRendererServiceHostLifecycleTestFixtures;
        packageManifestScaffold: RenderThumbnailRendererServicePackageManifestScaffold;
        packageCreationGuardrails: RenderThumbnailRendererServicePackageCreationGuardrails;
        packageFileTemplates: RenderThumbnailRendererServicePackageFileTemplates;
        packageWorkspaceWiring: RenderThumbnailRendererServicePackageWorkspaceWiring;
        packageBuildVerification: RenderThumbnailRendererServicePackageBuildVerification;
        packageMaterializationChecklist: RenderThumbnailRendererServicePackageMaterializationChecklist;
        packageCreationDryRunSummary: RenderThumbnailRendererServicePackageCreationDryRunSummary;
        packageCreationFileManifest: RenderThumbnailRendererServicePackageCreationFileManifest;
        packageMaterializationApprovalGate: RenderThumbnailRendererServicePackageMaterializationApprovalGate;
        packageMaterializationExecutionDryRun: RenderThumbnailRendererServicePackageMaterializationExecutionDryRun;
        packageMaterializationWriteContract: RenderThumbnailRendererServicePackageMaterializationWriteContract;
        packageMaterializationRollbackContract: RenderThumbnailRendererServicePackageMaterializationRollbackContract;
        packageMaterializationVerificationManifest: RenderThumbnailRendererServicePackageMaterializationVerificationManifest;
        packageMaterializationFinalApprovalChecklist: RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist;
        packageMaterializationExplicitApprovalToken: RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken;
        packageMaterializationApprovalAuditTrail: RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail;
        packageMaterializationApprovalReplayGuard: RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard;
        packageMaterializationApprovalExpiryPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy;
        packageMaterializationApprovalRevocationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy;
        packageMaterializationApprovalScopeBindingPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy;
        packageMaterializationApprovalOperatorConfirmationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy;
        packageMaterializationApprovalEmergencyStopPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy;
        packageMaterializationApprovalReadinessVerdictPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy;
        packageMaterializationApprovalExecutionHandoffPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy;
        packageMaterializationApprovalPostHandoffAuditPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy;
        packageMaterializationApprovalAuditRetentionPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy;
        packageMaterializationApprovalAuditAccessPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy;
        packageMaterializationApprovalAuditIntegrityPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy;
        packageMaterializationApprovalAuditProvenancePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy;
        packageMaterializationApprovalAuditCustodyPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy;
        packageMaterializationApprovalAuditEvidencePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy;
        packageMaterializationApprovalAuditAttestationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy;
        packageMaterializationApprovalAuditNotarizationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy;
        packageMaterializationApprovalAuditCertificationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy;
        packageMaterializationApprovalAuditEndorsementPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy;
        packageMaterializationApprovalAuditCountersignaturePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy;
        packageMaterializationApprovalAuditCountersignatureVerificationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy;
        packageMaterializationApprovalAuditCountersignatureRevocationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy;
        packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy;
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy;
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy;
        clientRequest: RenderThumbnailRendererServiceClientRequest;
    };
    client: RenderThumbnailRendererServiceClientConfig;
    availability: RenderThumbnailRendererServiceAvailability;
    optInConfiguration: RenderThumbnailRendererServiceOptInConfiguration;
    executionGate: RenderThumbnailRendererServiceExecutionGate;
    healthPreflight: RenderThumbnailRendererServiceHealthPreflight;
    executionClientHarness: RenderThumbnailRendererServiceExecutionClientHarness;
    dispatchAdapterBoundary: RenderThumbnailRendererServiceDispatchAdapterBoundary;
    unavailableErrorTaxonomy: RenderThumbnailRendererServiceUnavailableErrorTaxonomy;
    integrationFixtureHarness: RenderThumbnailRendererServiceIntegrationFixtureHarness;
    dispatchRegistrationPreflight: RenderThumbnailRendererServiceDispatchRegistrationPreflight;
    executableAdapterRegistrationScaffold: RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold;
    adapterRegistryManifest: RenderThumbnailRendererServiceAdapterRegistryManifest;
    enablementChecklist: RenderThumbnailRendererServiceEnablementChecklist;
    implementationSliceAudit: RenderThumbnailRendererServiceImplementationSliceAudit;
    healthNoopContractFixtures: RenderThumbnailRendererServiceHealthNoopContractFixtures;
    noopServiceHostScaffold: RenderThumbnailRendererServiceNoopServiceHostScaffold;
    hostLifecycleTestFixtures: RenderThumbnailRendererServiceHostLifecycleTestFixtures;
    packageManifestScaffold: RenderThumbnailRendererServicePackageManifestScaffold;
    packageCreationGuardrails: RenderThumbnailRendererServicePackageCreationGuardrails;
    packageFileTemplates: RenderThumbnailRendererServicePackageFileTemplates;
    packageWorkspaceWiring: RenderThumbnailRendererServicePackageWorkspaceWiring;
    packageBuildVerification: RenderThumbnailRendererServicePackageBuildVerification;
    packageMaterializationChecklist: RenderThumbnailRendererServicePackageMaterializationChecklist;
    packageCreationDryRunSummary: RenderThumbnailRendererServicePackageCreationDryRunSummary;
    packageCreationFileManifest: RenderThumbnailRendererServicePackageCreationFileManifest;
    packageMaterializationApprovalGate: RenderThumbnailRendererServicePackageMaterializationApprovalGate;
    packageMaterializationExecutionDryRun: RenderThumbnailRendererServicePackageMaterializationExecutionDryRun;
    packageMaterializationWriteContract: RenderThumbnailRendererServicePackageMaterializationWriteContract;
    packageMaterializationRollbackContract: RenderThumbnailRendererServicePackageMaterializationRollbackContract;
    packageMaterializationVerificationManifest: RenderThumbnailRendererServicePackageMaterializationVerificationManifest;
    packageMaterializationFinalApprovalChecklist: RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist;
    packageMaterializationExplicitApprovalToken: RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken;
    packageMaterializationApprovalAuditTrail: RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail;
    packageMaterializationApprovalReplayGuard: RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard;
    packageMaterializationApprovalExpiryPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy;
    packageMaterializationApprovalRevocationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy;
    packageMaterializationApprovalScopeBindingPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy;
    packageMaterializationApprovalOperatorConfirmationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy;
    packageMaterializationApprovalEmergencyStopPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy;
    packageMaterializationApprovalReadinessVerdictPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy;
    packageMaterializationApprovalExecutionHandoffPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy;
    packageMaterializationApprovalPostHandoffAuditPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy;
    packageMaterializationApprovalAuditRetentionPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy;
    packageMaterializationApprovalAuditAccessPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy;
    packageMaterializationApprovalAuditIntegrityPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy;
    packageMaterializationApprovalAuditProvenancePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy;
    packageMaterializationApprovalAuditCustodyPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy;
    packageMaterializationApprovalAuditEvidencePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy;
    packageMaterializationApprovalAuditAttestationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy;
    packageMaterializationApprovalAuditNotarizationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy;
    packageMaterializationApprovalAuditCertificationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy;
    packageMaterializationApprovalAuditEndorsementPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy;
    packageMaterializationApprovalAuditCountersignaturePolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy;
    packageMaterializationApprovalAuditCountersignatureVerificationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy;
    packageMaterializationApprovalAuditCountersignatureRevocationPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy;
    packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy;
    packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy;
    packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy: RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy;
    clientRequest: RenderThumbnailRendererServiceClientRequest;
    serviceRequest: {
        command: "render.thumbnail";
        operation: "thumbnail.render";
        adapter: "renderer-service";
        target: {
            kind: RenderThumbnailTarget;
            fileId: string | null;
            pageId: string | null;
            objectId: string | null;
            tag: string | null;
            objectKey: string | null;
            revn: number | null;
        };
        artifact: {
            format: RenderThumbnailFormat;
            mimeType: "image/png";
            width: number;
            height: number;
            extension: ".png";
        };
        cache: {
            policy: RenderThumbnailCachePolicy;
            scope: "file-thumbnail" | "file-object-thumbnail";
            key: string | null;
            probe?: "file-thumbnail-by-file-id-and-revn" | "file-object-thumbnail-by-object-key";
        };
        backendRpc: {
            data:
                | {
                      command: "get-file-data-for-thumbnail";
                      request: RenderThumbnailContract["backendRpc"]["data"]["request"];
                  }
                | {
                      command: "get-file-frame-data-for-thumbnail";
                      status: "required-future-capability";
                      request: {
                          "file-id": string | null;
                          "page-id": string | null;
                          "object-id": string | null;
                      };
                  };
            persist: RenderThumbnailContract["backendRpc"]["persist"] | null;
            cacheMissPersist: RenderThumbnailContract["backendRpc"]["persist"] | null;
        };
        render: {
            required: true | "on-cache-miss";
            runtime: "render-wasm-worker";
            fallback: "frontend-rasterizer";
        };
    };
    requires: string[];
    requiredCapabilities: string[];
    nextActions: string[];
    diagnostics: {
        adapterBoundary: "renderer-service-dry-run";
        descriptorAdapters: readonly string[];
        cliCommandRegistered: true;
        mcpToolRegistered: boolean;
        runtimeExecutionRegistered: false;
        serviceOperation: "thumbnail.render";
        availabilityProbe: "metadata-only";
        optInConfigurationStatus: "planned-disabled";
        clientRequestDispatch: false;
        executionGateStatus: "closed";
        healthPreflightDispatch: false;
        executionClientHarnessDispatch: false;
        dispatchAdapterBoundaryStatus: "planned-disabled";
        dispatchAdapterBoundaryDispatch: false;
        unavailableErrorTaxonomyVersion: "P25.17";
        integrationFixtureHarnessVersion: "P25.18";
        dispatchRegistrationPreflightVersion: "P25.19";
        executableAdapterRegistrationScaffoldVersion: "P25.20";
        adapterRegistryManifestVersion: "P25.21";
        enablementChecklistVersion: "P25.22";
        implementationSliceAuditVersion: "P25.23";
        healthNoopContractFixturesVersion: "P25.24";
        noopServiceHostScaffoldVersion: "P25.25";
        hostLifecycleTestFixturesVersion: "P25.26";
        packageManifestScaffoldVersion: "P25.27";
        packageCreationGuardrailsVersion: "P25.28";
        packageFileTemplatesVersion: "P25.29";
        packageWorkspaceWiringVersion: "P25.30";
        packageBuildVerificationVersion: "P25.31";
        packageMaterializationChecklistVersion: "P25.32";
        packageCreationDryRunSummaryVersion: "P25.33";
        packageCreationFileManifestVersion: "P25.34";
        packageMaterializationApprovalGateVersion: "P25.35";
        packageMaterializationExecutionDryRunVersion: "P25.36";
        packageMaterializationWriteContractVersion: "P25.37";
        packageMaterializationRollbackContractVersion: "P25.38";
        packageMaterializationVerificationManifestVersion: "P25.39";
        packageMaterializationFinalApprovalChecklistVersion: "P25.40";
        packageMaterializationExplicitApprovalTokenVersion: "P25.41";
        packageMaterializationApprovalAuditTrailVersion: "P25.42";
        packageMaterializationApprovalReplayGuardVersion: "P25.43";
        packageMaterializationApprovalExpiryPolicyVersion: "P25.44";
        packageMaterializationApprovalRevocationPolicyVersion: "P25.45";
        packageMaterializationApprovalScopeBindingPolicyVersion: "P25.46";
        packageMaterializationApprovalOperatorConfirmationPolicyVersion: "P25.47";
        packageMaterializationApprovalEmergencyStopPolicyVersion: "P25.48";
        packageMaterializationApprovalReadinessVerdictPolicyVersion: "P25.49";
        packageMaterializationApprovalExecutionHandoffPolicyVersion: "P25.50";
        packageMaterializationApprovalPostHandoffAuditPolicyVersion: "P25.51";
        packageMaterializationApprovalAuditRetentionPolicyVersion: "P25.52";
        packageMaterializationApprovalAuditAccessPolicyVersion: "P25.53";
        packageMaterializationApprovalAuditIntegrityPolicyVersion: "P25.54";
        packageMaterializationApprovalAuditProvenancePolicyVersion: "P25.55";
        packageMaterializationApprovalAuditCustodyPolicyVersion: "P25.56";
        packageMaterializationApprovalAuditEvidencePolicyVersion: "P25.57";
        packageMaterializationApprovalAuditAttestationPolicyVersion: "P25.58";
        packageMaterializationApprovalAuditNotarizationPolicyVersion: "P25.59";
        packageMaterializationApprovalAuditCertificationPolicyVersion: "P25.60";
        packageMaterializationApprovalAuditEndorsementPolicyVersion: "P25.61";
        packageMaterializationApprovalAuditCountersignaturePolicyVersion: "P25.62";
        packageMaterializationApprovalAuditCountersignatureVerificationPolicyVersion: "P25.63";
        packageMaterializationApprovalAuditCountersignatureRevocationPolicyVersion: "P25.64";
        packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicyVersion: "P25.65";
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicyVersion: "P25.66";
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicyVersion: "P25.67";
    };
}

export interface RenderThumbnailRendererServiceClientConfig {
    endpoint: string | null;
    configured: boolean;
    healthEndpoint: string | null;
    healthMethod: "GET";
    probeTimeoutMs: number;
    networkProbe: false;
    requestContentType: "application/json";
    responseContentType: "application/json";
    auth: "caller-session-forwarded-when-execution-exists";
}

export interface RenderThumbnailRendererServiceAvailability {
    status: "configured-unverified" | "not-configured";
    probe: "metadata-only";
    networkProbe: false;
    checked: false;
    endpoint: string | null;
    healthEndpoint: string | null;
    reason: string;
    nextActions: string[];
}

export interface CreateRenderThumbnailRendererServiceExecutionGateOptions {
    optInValue?: string | null;
    value?: string | null;
    serviceImplemented?: boolean | null;
    integrationTestsReady?: boolean | null;
}

export interface CreateRenderThumbnailRendererServiceOptInConfigurationOptions {
    entrypoint?: "cli" | "mcp" | string | null;
    cliFlagValue?: string | null;
    mcpArgValue?: string | null;
    envValue?: string | null;
    profileValue?: string | null;
    backendValue?: string | null;
}

export interface RenderThumbnailRendererServiceOptInConfiguration {
    status: "planned-disabled";
    dispatch: false;
    entrypoint: string;
    reason: string;
    expectedValue: "renderer-service";
    sources: Array<{
        source: "cli-flag" | "mcp-arg" | "environment" | "profile" | "backend-config";
        name: string;
        entrypoints: string[];
        precedence: number;
        value: string | null;
        configured: boolean;
    }>;
    resolution: {
        selectedSource: "cli-flag" | "mcp-arg" | "environment" | "profile" | "backend-config" | null;
        selectedName: string | null;
        selectedValue: string | null;
        valid: boolean;
        configured: boolean;
        precedence: number | null;
        diagnostics: string;
    };
    diagnostics: {
        tokenValuesIncluded: false;
        executionEnabledByConfiguration: false;
        gateCanOpenFromConfigurationOnly: false;
        noDispatchDefault: true;
    };
    futureSurfaces: {
        cliFlags: string[];
        mcpArgs: string[];
        environment: string[];
        profileKeys: string[];
        backendConfigKeys: string[];
    };
}

export interface RenderThumbnailRendererServiceExecutionGate {
    status: "closed";
    dispatch: false;
    reason: string;
    optIn: {
        required: true;
        env: "PENPOT_RENDER_THUMBNAIL_EXECUTION";
        expectedValue: "renderer-service";
        configuredValue: string | null;
        configured: boolean;
    };
    requiredConfig: Array<
        | {
              name: "rendererServiceUri";
              env: "PENPOT_RENDERER_SERVICE_URI";
              configured: boolean;
              valueIncluded: boolean;
          }
        | {
              name: "rendererServiceTimeoutMs";
              env: "PENPOT_RENDERER_SERVICE_TIMEOUT_MS";
              configured: true;
              defaultValue: 2500;
          }
    >;
    readiness: {
        serviceImplemented: boolean;
        integrationTestsReady: boolean;
        runtimeExecutionRegistered: false;
        endpointConfigured: boolean;
        explicitOptInConfigured: boolean;
        requiredCapabilities: Array<{
            name: string;
            satisfied: boolean;
            reason: string;
        }>;
    };
    blockers: string[];
    failureModes: Array<{
        code:
            | "renderer_service_execution_disabled"
            | "renderer_service_not_configured"
            | "renderer_service_integration_tests_missing"
            | "renderer_service_capability_missing";
        when: string;
    }>;
    integrationTestPlan: {
        status: "required-before-dispatch";
        runner: "future renderer-service integration suite";
        requiredBeforeDispatch: true;
        cases: string[];
        requiredAssertions: string[];
    };
}

export interface RenderThumbnailRendererServiceHealthPreflight {
    status: "planned-disabled";
    dispatch: false;
    networkProbe: false;
    reason: string;
    method: "GET";
    endpoint: string | null;
    timeoutMs: number;
    headers: Record<string, string>;
    gate: {
        requiredStatus: "open";
        currentStatus: string;
    };
    expected: {
        okStatuses: number[];
        contentType: "application/json";
        bodyStatus: "ok";
        requiredFields: string[];
    };
    failureModes: Array<{
        code:
            | "renderer_service_preflight_disabled"
            | "renderer_service_health_unavailable"
            | "renderer_service_health_invalid";
        when: string;
    }>;
    integrationTestPlan: {
        status: "required-before-network-probe";
        cases: string[];
    };
}

export interface RenderThumbnailRendererServiceExecutionClientHarness {
    status: "planned-disabled";
    dispatch: false;
    reason: string;
    sequence: ["executionGate", "healthPreflight", "clientRequest", "normalizeResult"];
    preconditions: string[];
    current: {
        executionGateStatus: string;
        healthPreflightStatus: string;
        dispatch: false;
    };
    resultHandling: string[];
    integrationTestPlan: {
        status: "required-before-dispatch";
        cases: string[];
    };
}

export interface RenderThumbnailRendererServiceDispatchAdapterBoundary {
    status: "planned-disabled";
    adapter: "renderer-service";
    dispatch: false;
    reason: string;
    configPrecedence: string[];
    consumes: {
        executionGate: {
            requiredStatus: "open";
            currentStatus: string;
        };
        healthPreflight: {
            requiredStatus: "ok";
            currentStatus: string;
        };
        clientRequest: {
            requiredDispatch: true;
            currentDispatch: false;
        };
    };
    noDispatchDefaults: {
        metadataOnlyAvailability: true;
        healthPreflightDispatch: false;
        renderPostDispatch: false;
        localFileWrites: false;
    };
    transitionRules: string[];
    resultMapping: {
        successHelper: "createRenderThumbnailRendererServiceResult";
        errorHelper: "createRenderThumbnailRendererServiceErrorPayload";
        mcpReturn: "resource metadata only";
        cliReturn: "resource metadata plus optional --output download";
    };
    current: {
        clientConfigured: boolean;
        executionGateStatus: string;
        healthPreflightStatus: string;
        executionClientHarnessStatus: string;
        dispatch: false;
    };
    integrationTestPlan: {
        status: "required-before-adapter-dispatch";
        cases: string[];
    };
}

export type RenderThumbnailRendererServiceUnavailableErrorStage =
    | "configuration"
    | "execution-gate"
    | "health-preflight"
    | "dispatch-adapter"
    | "response-normalization"
    | "resource-normalization";

export type RenderThumbnailRendererServiceUnavailableErrorCode =
    | "renderer_service_unavailable"
    | "renderer_service_not_configured"
    | "renderer_service_execution_disabled"
    | "renderer_service_preflight_disabled"
    | "renderer_service_health_unavailable"
    | "renderer_service_health_invalid"
    | "renderer_service_dispatch_disabled"
    | "renderer_service_response_invalid"
    | "renderer_service_resource_missing";

export interface RenderThumbnailRendererServiceUnavailableErrorTaxonomy {
    status: "planned";
    dispatch: false;
    taxonomyVersion: "P25.17";
    defaultCode: "renderer_service_unavailable";
    current: {
        clientConfigured: boolean;
        availabilityStatus: string;
        executionGateStatus: string;
        healthPreflightStatus: string;
        dispatchAdapterBoundaryStatus: string;
    };
    errors: Array<{
        code: RenderThumbnailRendererServiceUnavailableErrorCode;
        stage: RenderThumbnailRendererServiceUnavailableErrorStage;
        retryable: boolean;
        when: string;
        action: string;
    }>;
    stages: RenderThumbnailRendererServiceUnavailableErrorStage[];
    retryPolicy: {
        retryableCodes: RenderThumbnailRendererServiceUnavailableErrorCode[];
        nonRetryableBeforeImplementation: RenderThumbnailRendererServiceUnavailableErrorCode[];
    };
    payloadFields: {
        common: string[];
        mcp: string[];
        cli: string[];
    };
    actionsByStage: Record<RenderThumbnailRendererServiceUnavailableErrorStage, string[]>;
}

export type RenderThumbnailRendererServiceIntegrationFixtureCaseStage =
    | "configuration"
    | "execution-gate"
    | "health-preflight"
    | "dispatch-adapter"
    | "response-normalization"
    | "resource-normalization";

export interface RenderThumbnailRendererServiceIntegrationFixtureHarness {
    status: "planned-disabled";
    dispatch: false;
    networkDispatch: false;
    localFileWrites: false;
    harnessVersion: "P25.18";
    runner: "future renderer-service integration fixture harness";
    reason: string;
    current: {
        targetKind: RenderThumbnailTarget | string;
        cachePolicy: RenderThumbnailCachePolicy | string;
        clientConfigured: boolean;
        executionGateStatus: string;
        healthPreflightStatus: string;
        dispatchAdapterBoundaryStatus: string;
        unavailableErrorTaxonomyVersion: string;
    };
    sequence: [
        "resolveConfig",
        "assertClosedGate",
        "healthPreflightFixture",
        "renderDispatchFixture",
        "normalizeResultOrError",
        "assertMcpCliResourceSemantics",
    ];
    cases: Array<{
        id: string;
        stage: RenderThumbnailRendererServiceIntegrationFixtureCaseStage;
        dispatch: false;
        networkDispatch: false;
        expectedCode?: RenderThumbnailRendererServiceUnavailableErrorCode;
        expectedStatus?: "ok" | "planned";
        asserts: string[];
    }>;
    requiredBeforeDispatch: string[];
    entrypointExpectations: {
        mcp: {
            localFileWrites: false;
            resourceReturn: "metadata-only";
            outputDownload: false;
        };
        cli: {
            localFileWrites: string;
            resourceReturn: "metadata plus optional output result";
            outputDownload: "future executable path only";
        };
    };
    fixtureInputs: {
        fileRefresh: {
            target: "file";
            cachePolicy: "refresh";
            expectedPersistCommand: "create-file-thumbnail";
        };
        fileReuse: {
            target: "file";
            cachePolicy: "reuse";
            expectedCacheProbe: "file-thumbnail-by-file-id-and-revn";
        };
        frameRefresh: {
            target: "frame";
            cachePolicy: "refresh";
            expectedPersistCommand: "create-file-object-thumbnail";
            requires: string[];
        };
    };
}

export interface RenderThumbnailRendererServiceDispatchRegistrationPreflight {
    status: "planned-disabled";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    preflightVersion: "P25.19";
    reason: string;
    current: {
        clientConfigured: boolean;
        availabilityStatus: string;
        optInConfigurationStatus: string;
        executionGateStatus: string;
        healthPreflightStatus: string;
        executionClientHarnessStatus: string;
        dispatchAdapterBoundaryStatus: string;
        unavailableErrorTaxonomyVersion: string;
        integrationFixtureHarnessVersion: string;
    };
    checks: Array<{
        id: string;
        source: string;
        required: true;
        satisfied: boolean;
        blocker: string;
    }>;
    blockers: string[];
    readiness: {
        allChecksSatisfied: boolean;
        mayRegisterDispatch: false;
        reason: string;
    };
    registrationPlan: {
        targetAdapter: "renderer-service";
        descriptorAdapterAlreadyPresent: true;
        runtimeExecutionRegistered: false;
        requiredFutureToggle: "PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service";
        requiredAssertions: string[];
    };
    nextActions: string[];
}

export interface RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold {
    status: "planned-disabled";
    scaffoldVersion: "P25.20";
    adapter: "renderer-service";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    reason: string;
    consumes: {
        dispatchRegistrationPreflight: {
            requiredStatus: "ready";
            currentStatus: string;
            mayRegisterDispatch: false;
            preflightVersion: string;
        };
        dispatchAdapterBoundary: {
            requiredStatus: "ready";
            currentStatus: string;
            currentDispatch: boolean;
        };
        clientRequest: {
            requiredDispatch: true;
            currentDispatch: boolean;
            method: string;
        };
    };
    registrationSurface: {
        command: "render.thumbnail";
        adapter: "renderer-service";
        entrypoints: string[];
        helper: "createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold";
        runtimeExecutionRegistered: false;
    };
    noOpBehavior: string[];
    requiredBeforeEnablement: string[];
}

export interface RenderThumbnailRendererServiceAdapterRegistryManifest {
    status: "planned-disabled";
    manifestVersion: "P25.21";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    reason: string;
    consumes: {
        executableAdapterRegistrationScaffold: {
            requiredStatus: "ready";
            currentStatus: string;
            scaffoldVersion: string;
            runtimeExecutionRegistered: false;
        };
        dispatchRegistrationPreflight: {
            requiredStatus: "ready";
            currentStatus: string;
            preflightVersion: string;
        };
        dispatchAdapterBoundary: {
            requiredStatus: "ready";
            currentStatus: string;
            currentDispatch: boolean;
        };
    };
    registry: {
        namespace: "render.thumbnail.adapters";
        key: "renderer-service";
        descriptorAdapterAlreadyPresent: true;
        runtimeExecutionRegistered: false;
        defaultEnabled: false;
        activation: string;
    };
    entrypoints: {
        mcp: {
            tool: string | undefined;
            dryRunOnly: true;
            unavailablePayloadIncludesManifest: true;
            localFileWrites: false;
        };
        cli: {
            command: string | undefined;
            dryRunOnly: true;
            unavailablePayloadIncludesManifest: true;
            outputWritesRequireNormalizedDownloadUri: true;
        };
    };
    noOpGuarantees: string[];
    requiredBeforeEnablement: string[];
}

export interface RenderThumbnailRendererServiceEnablementChecklist {
    status: "planned-disabled";
    checklistVersion: "P25.22";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    reason: string;
    gates: Array<{
        id: string;
        source: string;
        requiredStatus: string;
        currentStatus: string;
        satisfied: false;
        blocker: string;
    }>;
    blockers: string[];
    readiness: {
        allGatesSatisfied: false;
        mayEnableRuntime: false;
        mayDispatchNetwork: false;
        mayWriteLocalFiles: false;
    };
    versions: {
        unavailableErrorTaxonomy: string;
        integrationFixtureHarness: string;
        dispatchRegistrationPreflight: string;
        executableAdapterRegistrationScaffold: string;
        adapterRegistryManifest: string;
    };
    requiredBeforeEnablement: string[];
}

export interface RenderThumbnailRendererServiceImplementationSliceAudit {
    status: "planned-disabled";
    auditVersion: "P25.23";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    selectedSlice: {
        id: "renderer-service-health-and-noop-contract";
        title: string;
        selected: true;
        dispatch: false;
        networkDispatch: false;
        runtimeRegistration: false;
        localFileWrites: false;
        enablesRuntimeDispatch: false;
        reason: string;
    };
    auditedSurfaces: {
        backendRpc: string[];
        frontendRuntime: string[];
        renderer: string[];
        entrypoints: string[];
    };
    implementationSlices: Array<{
        id: string;
        selected: boolean;
        dispatch: false;
        networkDispatch?: false;
        runtimeRegistration?: false;
        localFileWrites?: false;
        scope?: string[];
        exitCriteria?: string[];
        blockers?: string[];
    }>;
    consumes: {
        enablementChecklist: {
            requiredStatus: "ready";
            currentStatus: string;
            checklistVersion: string;
            mayEnableRuntime: false;
        };
        adapterRegistryManifest: {
            requiredStatus: "ready";
            currentStatus: string;
            manifestVersion: string;
            runtimeExecutionRegistered: false;
        };
        executableAdapterRegistrationScaffold: {
            requiredStatus: "ready";
            currentStatus: string;
            scaffoldVersion: string;
            runtimeRegistration: false;
        };
        dispatchRegistrationPreflight: {
            requiredStatus: "ready";
            currentStatus: string;
            preflightVersion: string;
            runtimeRegistration: false;
        };
    };
    blockers: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServiceHealthNoopContractFixtures {
    status: "planned-disabled";
    fixtureVersion: "P25.24";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    selectedSlice: string;
    consumes: {
        implementationSliceAudit: {
            requiredSelectedSlice: "renderer-service-health-and-noop-contract";
            currentSelectedSlice: string;
            auditVersion: string;
            enablesRuntimeDispatch: false;
        };
        healthPreflight: {
            requiredStatus: "ok";
            currentStatus: string;
            currentDispatch: boolean;
        };
        clientRequest: {
            requiredDispatch: true;
            currentDispatch: boolean;
            method: string;
        };
    };
    healthContract: {
        id: "renderer-service-health";
        method: "GET";
        path: "/health";
        endpoint: string | null;
        timeoutMs: number;
        dispatch: false;
        networkDispatch: false;
        request: {
            headers: {
                accept: "application/json";
            };
            body: null;
        };
        okResponse: {
            status: 200;
            contentType: "application/json";
            body: {
                status: "ok";
                renderer: "penpot-thumbnail-renderer";
                mode: "noop";
                runtimeRegistration: false;
                dispatch: false;
                capabilities: string[];
            };
        };
        unavailableResponse: {
            status: 503;
            contentType: "application/json";
            body: {
                status: "unavailable";
                code: "renderer_service_health_unavailable";
                retryable: true;
            };
        };
    };
    noopRenderContract: {
        id: "thumbnail-render-noop";
        operation: "thumbnail.render";
        method: "POST";
        endpoint: string | null;
        dispatch: false;
        networkDispatch: false;
        localFileWrites: false;
        requestFields: string[];
        response: {
            status: 501;
            contentType: "application/json";
            body: {
                status: "noop";
                code: "renderer_service_noop";
                message: string;
                artifact: null;
                resource: null;
                runtimeRegistration: false;
                dispatch: false;
                localFileWrites: false;
            };
        };
    };
    fixtureCases: Array<{
        id: string;
        contract: string;
        expectedStatus?: number;
        dispatch: false;
        runtimeRegistration?: false;
        retryable?: true;
        resource?: null;
        localFileWrites?: false;
    }>;
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServiceNoopServiceHostScaffold {
    status: "planned-disabled";
    scaffoldVersion: "P25.25";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    selectedSlice: string;
    consumes: {
        healthNoopContractFixtures: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            fixtureVersion: string;
            currentDispatch: boolean;
        };
        implementationSliceAudit: {
            auditVersion: string;
            currentSelectedSlice: string;
            enablesRuntimeDispatch: false;
        };
    };
    host: {
        id: "renderer-service-noop-host";
        packageName: "@penpot/renderer-service";
        entrypoint: "renderer-service noop-host";
        language: "typescript-node";
        defaultBindHost: "127.0.0.1";
        defaultPort: 6070;
        endpoint: string | null;
        healthEndpoint: string | null;
        startCommand: "pnpm --filter @penpot/renderer-service start:noop";
        startsProcess: false;
        registersRuntime: false;
        callsBackendRpc: false;
        rendersPng: false;
        writesLocalFiles: false;
    };
    routes: Array<{
        id: string;
        method: "GET" | "POST";
        path: string;
        operation?: "thumbnail.render";
        fixture: string;
        status: "planned";
        dispatch: false;
    }>;
    configuration: {
        env: {
            host: "PENPOT_RENDERER_SERVICE_HOST";
            port: "PENPOT_RENDERER_SERVICE_PORT";
            publicUri: "PENPOT_RENDERER_SERVICE_URI";
            mode: "PENPOT_RENDERER_SERVICE_MODE";
        };
        defaultMode: "noop";
        requiredModeBeforeStartup: "noop";
        tokenValuesIncluded: false;
    };
    lifecycle: {
        start: "manual-future-task";
        stop: "manual-future-task";
        readiness: "health route fixture only";
        supervision: "not implemented";
        hostStartup: false;
    };
    observability: {
        structuredLogs: true;
        requestIdHeader: "x-request-id";
        auditHeaders: string[];
        tokenValuesIncluded: false;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServiceHostLifecycleTestFixtures {
    status: "planned-disabled";
    fixtureVersion: "P25.26";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    consumes: {
        noopServiceHostScaffold: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            scaffoldVersion: string;
            hostStartup: false;
        };
        healthNoopContractFixtures: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            fixtureVersion: string;
            currentDispatch: boolean;
        };
    };
    fixtureMatrix: Array<{
        id: string;
        lifecycle: string;
        expectedStatus: string;
        processSpawn?: false;
        processSignal?: false;
        hostStartup?: false;
        dispatch?: false;
        healthFixture?: string;
        networkDispatch?: false;
        restartPolicy?: "none";
        structuredLogs?: true;
        tokenValuesIncluded?: false;
        localFileWrites?: false;
        errorCode?: "renderer_service_unavailable";
        runtimeRegistration?: false;
    }>;
    assertions: {
        hostStartup: false;
        processSpawn: false;
        networkDispatch: false;
        runtimeRegistration: false;
        localFileWrites: false;
        tokenValuesIncluded: false;
        unavailablePayloadIncludesScaffold: true;
    };
    testEntrypoints: {
        commandRuntime: "createRenderThumbnailRendererServiceHostLifecycleTestFixtures";
        mcp: string;
        cli: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageManifestScaffold {
    status: "planned-disabled";
    manifestVersion: "P25.27";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    consumes: {
        noopServiceHostScaffold: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            scaffoldVersion: string;
            hostStartup: false;
        };
        hostLifecycleTestFixtures: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            fixtureVersion: string;
            processSpawn: false;
        };
    };
    package: {
        name: "@penpot/renderer-service";
        directory: "renderer-service";
        private: true;
        type: "module";
        packageManager: "pnpm-workspace";
        packageCreated: false;
        workspaceRegistered: false;
    };
    scripts: Record<string, {
        command: string;
        runnable: false;
        startsProcess?: false;
        emitsFiles?: false;
        processSpawn?: false;
    }>;
    exports: Record<string, {
        types: string;
        default: string;
    }>;
    dependencies: {
        runtime: string[];
        dev: string[];
        addNow: false;
    };
    workspaceIntegration: {
        rootPackageJsonMutation: false;
        pnpmWorkspaceMutation: false;
        lockfileMutation: false;
        dockerComposeMutation: false;
    };
    plannedFiles: string[];
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageCreationGuardrails {
    status: "planned-disabled";
    guardrailVersion: "P25.28";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    consumes: {
        packageManifestScaffold: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            packageCreated: false;
            workspaceMutation: false;
            scriptRunnable: false;
        };
        hostLifecycleTestFixtures: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            fixtureVersion: string;
            processSpawn: false;
        };
    };
    creationReadiness: {
        status: "blocked";
        canCreatePackage: false;
        requiredChecks: Array<{
            id: string;
            description: string;
            requiredBeforePackageCreation: true;
            satisfied: false;
        }>;
    };
    blockedMutations: {
        packageFiles: string[];
        workspaceFiles: string[];
        runtimeFiles: string[];
    };
    allowedInThisStep: string[];
    deniedInThisStep: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageFileTemplates {
    status: "planned-disabled";
    templateVersion: "P25.29";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    consumes: {
        packageManifestScaffold: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            packageCreated: false;
        };
        packageCreationGuardrails: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            guardrailVersion: string;
            canCreatePackage: false;
            workspaceMutation: false;
        };
    };
    packageJson: {
        path: "renderer-service/package.json";
        materialized: false;
        writesFile: false;
        package: {
            name: "@penpot/renderer-service";
            private: true;
            type: "module";
            scripts: Record<string, string>;
            exports: Record<string, {
                types: string;
                default: string;
            }>;
            dependencies: Record<string, string>;
            devDependencies: Record<string, string>;
        };
    };
    tsconfig: {
        path: "renderer-service/tsconfig.json";
        materialized: false;
        writesFile: false;
        compilerOptions: Record<string, string | boolean>;
        include: string[];
    };
    sourceFiles: Array<{
        path: string;
        kind: string;
        materialized: false;
        writesFile: false;
        exports?: string[];
        runtimeRegistration?: false;
        startsProcess?: false;
        routes?: string[];
        rendersPng?: false;
    }>;
    testFiles: Array<{
        path: string;
        kind: string;
        materialized: false;
        writesFile: false;
        processSpawn: false;
        covers: string[];
    }>;
    templateMatrix: Array<{
        id: string;
        path: string;
        materialized: false;
        writesFile: false;
        blocksWorkspaceMutation?: true;
        blocksBuildOutput?: true;
        blocksProcessSpawn?: true;
    }>;
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageWorkspaceWiring {
    status: "planned-disabled";
    wiringVersion: "P25.30";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    consumes: {
        packageManifestScaffold: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            workspaceRegistered: false;
        };
        packageCreationGuardrails: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            guardrailVersion: string;
            workspaceMutation: false;
        };
        packageFileTemplates: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            templateVersion: string;
            fileMaterialization: false;
        };
    };
    workspaceEntries: Array<{
        file: "pnpm-workspace.yaml";
        plannedEntry: string;
        presentNow: false;
        mutateNow: false;
    }>;
    rootPackageScripts: Array<{
        file: "package.json";
        script: string;
        command: string;
        runnable: false;
        mutateNow: false;
    }>;
    lockfilePlan: {
        file: "pnpm-lock.yaml";
        requiredWhenPackageMaterializes: true;
        mutateNow: false;
        dependencyAdditions: string[];
    };
    workspaceDependencyPlan: {
        packageManager: "pnpm";
        packageName: "@penpot/renderer-service";
        workspaceFilter: "@penpot/renderer-service";
        workspaceRegistered: false;
        packageFilesMaterialized: false;
    };
    nonTargets: Array<{
        file: string;
        reason: string;
        mutateNow: false;
    }>;
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageBuildVerification {
    status: "planned-disabled";
    verificationVersion: "P25.31";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    consumes: {
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceRegistered: false;
            scriptsRunnable: false;
        };
        packageFileTemplates: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            templateVersion: string;
            fileMaterialization: false;
        };
    };
    verificationCommands: Array<{
        id: string;
        command: string;
        purpose: string;
        runnable: false;
        processSpawn: false;
        emitsFiles: false;
        requiresWorkspaceEntry: true;
        requiresPackageFiles: true;
    }>;
    expectedArtifacts: Array<{
        path: string;
        producedNow: false;
        requiredAfterBuild: true;
    }>;
    verificationReadiness: {
        status: "blocked";
        canRunVerification: false;
        blockers: string[];
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationChecklist {
    status: "planned-disabled";
    checklistVersion: "P25.32";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    consumes: {
        packageFileTemplates: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            templateVersion: string;
            fileMaterialization: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
            buildOutput: false;
        };
    };
    materializationBatches: Array<{
        id: string;
        files: string[];
        materializeNow: false;
        requiresReview?: true;
        generatedOnlyAfterBuild?: true;
    }>;
    readinessChecklist: Array<{
        id: string;
        description: string;
        requiredBeforeMaterialization: true;
        satisfied: false;
    }>;
    commitBoundary: {
        expectedCommit: string;
        includePackageFiles: true;
        includeWorkspaceManifests: true;
        includeLockfile: true;
        includeRuntimeDispatch: false;
        materializeNow: false;
    };
    rollbackPlan: {
        deletePackageDirectory: string;
        revertWorkspaceFiles: string[];
        revertRuntimeRegistration: false;
        requiredBeforeMaterialization: true;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageCreationDryRunSummary {
    status: "planned-disabled";
    summaryVersion: "P25.33";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    filesWritten: false;
    consumes: {
        packageMaterializationChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            materializationApproved: false;
        };
        packageFileTemplates: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            templateVersion: string;
            fileMaterialization: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
        };
    };
    summary: {
        title: string;
        packageName: "@penpot/renderer-service";
        packageDirectory: "renderer-service";
        wouldCreateFiles: string[];
        wouldModifyFiles: string[];
        wouldGenerateFilesAfterBuild: string[];
        wouldRunCommands: string[];
    };
    sections: Array<{
        id: string;
        title: string;
        dryRunOnly: true;
        items: string[];
    }>;
    blockedUntil: string[];
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageCreationFileManifest {
    status: "planned-disabled";
    manifestVersion: "P25.34";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    filesWritten: false;
    consumes: {
        packageCreationDryRunSummary: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            summaryVersion: string;
            dryRunOnly: true;
            filesWritten: false;
        };
        packageFileTemplates: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            templateVersion: string;
            fileMaterialization: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
            buildOutput: false;
        };
    };
    packageDirectory: {
        path: "renderer-service";
        createNow: false;
        existsRequiredBeforeMaterialization: false;
    };
    files: Array<{
        id: string;
        path: string;
        kind: string;
        source: string;
        createNow: false;
        writesFile: false;
        materialized: false;
        requiredBeforeWorkspaceWiring: boolean;
        requiredBeforeVerification: true;
        expectedExport?: string;
        expectedExtends?: string;
        runtimeRegistration?: false;
        exports?: string[];
        startsProcess?: false;
        routes?: string[];
        rendersPng?: false;
        processSpawn?: false;
        covers?: string[];
    }>;
    generatedFiles: Array<{
        path: string;
        sourceFile: string;
        generateNow: false;
        producedBy: string;
    }>;
    workspaceFiles: Array<{
        path: string;
        plannedChange: string;
        mutateNow: false;
    }>;
    manifestReadiness: {
        status: "blocked";
        canMaterializeFiles: false;
        blockers: string[];
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalGate {
    status: "planned-disabled";
    gateVersion: "P25.35";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    filesWritten: false;
    consumes: {
        packageMaterializationChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            materializationApproved: false;
        };
        packageCreationFileManifest: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            filesWritten: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
            buildOutput: false;
        };
    };
    approvalInputs: Array<{
        id: string;
        label: string;
        required: true;
        satisfied: false;
        source: string;
    }>;
    approvalScope: {
        packageDirectory: string;
        packageFiles: string[];
        workspaceFiles: string[];
        generatedFilesExcludedUntilBuild: string[];
        runtimeDispatchIncluded: false;
    };
    approvalDecision: {
        status: "blocked";
        canMaterialize: false;
        canMutateWorkspace: false;
        canRunVerification: false;
        reason: string;
    };
    postApprovalSequence: Array<{
        id: string;
        allowedBeforeApproval: false;
        writesFiles: boolean;
        runsCommands: boolean;
    }>;
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationExecutionDryRun {
    status: "planned-disabled";
    dryRunVersion: "P25.36";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    executeNow: false;
    approvalRequired: true;
    approved: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    filesWritten: false;
    consumes: {
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
        packageCreationFileManifest: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            filesWritten: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
            buildOutput: false;
        };
    };
    dryRunPlan: {
        title: string;
        packageDirectory: string;
        executeNow: false;
        approvalStatus: "blocked";
        steps: Array<{
            id: string;
            action: string;
            target: string;
            wouldExecute: true;
            executed: false;
            writesFiles: boolean;
            createsDirectory?: true;
            files?: string[];
            commands?: string[];
        }>;
    };
    blockedBecause: string[];
    executionOutputs: {
        packageDirectoryCreated: false;
        packageFilesWritten: false;
        workspaceFilesMutated: false;
        lockfileMutated: false;
        commandsRun: false;
        buildArtifactsGenerated: false;
        runtimeDispatchRegistered: false;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationWriteContract {
    status: "planned-disabled";
    contractVersion: "P25.37";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    executeNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedRequired: true;
    materializationApprovedNow: false;
    filesWritten: false;
    consumes: {
        packageMaterializationExecutionDryRun: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            dryRunVersion: string;
            executeNow: false;
            filesWritten: false;
        };
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
        packageCreationFileManifest: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            filesWritten: false;
        };
        packageWorkspaceWiring: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            wiringVersion: string;
            workspaceMutation: false;
        };
    };
    writeContract: {
        packageDirectory: {
            path: "renderer-service";
            createMode: "mkdirp";
            writeNow: false;
            created: false;
        };
        packageFiles: Array<{
            id: string;
            path: string;
            writeMode: "create";
            overwrite: false;
            writeNow: false;
            source: string;
        }>;
        workspaceFiles: Array<{
            id: string;
            path: string;
            writeMode: "patch" | "refresh";
            writeNow: false;
            source: string;
        }>;
        generatedFilesExcludedUntilBuild: string[];
    };
    integrityPlan: {
        hashBeforeWrite: true;
        hashAfterWrite: true;
        verifyManifestAfterWrite: true;
        atomicWrites: true;
        tempFileSuffix: ".tmp";
        compareExpectedPaths: true;
        writeNow: false;
    };
    rollbackContract: {
        writeNow: false;
        rollbackNow: false;
        removeCreatedPackageDirectoryOnFailure: true;
        restoreWorkspaceFilesFromHashSnapshot: true;
        lockfileRefreshMustBeReversible: true;
        failureLeavesRuntimeDispatchDisabled: true;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationRollbackContract {
    status: "planned-disabled";
    contractVersion: "P25.38";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    executeNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedRequired: true;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    consumes: {
        packageMaterializationWriteContract: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            contractVersion: string;
            writeNow: false;
            filesWritten: false;
        };
        packageMaterializationExecutionDryRun: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            dryRunVersion: string;
            executeNow: false;
        };
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
    };
    snapshotPlan: {
        status: "planned";
        snapshotNow: false;
        hashBeforeWrite: true;
        capturePackageDirectoryExistence: true;
        captureWorkspaceFileHashes: true;
        captureLockfileHash: true;
        packageDirectory: string;
        workspaceFiles: string[];
    };
    rollbackPlan: {
        status: "blocked";
        rollbackNow: false;
        phases: Array<{
            id: string;
            order: number;
            action: string;
            executesNow: false;
            dispatch?: false;
            writesFiles?: boolean;
            files?: string[];
            target?: string;
            commandsRun?: false;
        }>;
    };
    failureRecovery: {
        status: "planned";
        rollbackNow: false;
        recoverableFailures: string[];
        manualReviewRequiredAfterFailure: true;
        runtimeDispatchRemainsDisabled: true;
    };
    verificationPlan: {
        verifyNow: false;
        hashAfterRollback: true;
        verifyWorkspaceFilesRestored: true;
        verifyPackageDirectoryAbsentOrPreexisting: true;
        verifyRuntimeDispatchDisabled: true;
        commandsRun: false;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationVerificationManifest {
    status: "planned-disabled";
    manifestVersion: "P25.39";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedRequired: true;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationRollbackContract: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            contractVersion: string;
            rollbackNow: false;
        };
        packageMaterializationWriteContract: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            contractVersion: string;
            filesWritten: false;
        };
        packageBuildVerification: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            verificationVersion: string;
            commandExecution: false;
            buildOutput: false;
        };
        packageCreationFileManifest: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            filesWritten: false;
        };
    };
    verificationManifest: {
        status: "blocked";
        verifyNow: false;
        packageDirectory: {
            path: string;
            expectedAfterMaterialization: "exists";
            verifyNow: false;
        };
        packageFiles: Array<{
            path: string;
            expectedAfterMaterialization: "exists";
            hashAfterWrite: true;
            verifyNow: false;
        }>;
        workspaceFiles: Array<{
            path: string;
            expectedChange: string;
            verifyNow: false;
        }>;
        generatedOutputs: Array<{
            path: string;
            expectedAfterBuild: "exists";
            verifyNow: false;
        }>;
    };
    commandManifest: {
        status: "planned";
        commandsRun: false;
        verifyNow: false;
        commands: Array<{
            id: string;
            command: string;
            runsNow: false;
        }>;
    };
    runtimeDisabledAssertions: {
        status: "required";
        verifyNow: false;
        dispatch: false;
        runtimeRegistration: false;
        clientRequestDispatch: false;
        healthPreflightDispatch: false;
        rendererServiceUnavailableUntilRegistration: true;
    };
    readinessDecision: {
        status: "blocked";
        canVerifyMaterialization: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist {
    status: "planned-disabled";
    checklistVersion: "P25.40";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedRequired: true;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationVerificationManifest: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            manifestVersion: string;
            verifyNow: false;
        };
        packageMaterializationRollbackContract: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            contractVersion: string;
            rollbackNow: false;
        };
        packageMaterializationWriteContract: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            contractVersion: string;
            filesWritten: false;
        };
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
    };
    checklist: Array<{
        id: string;
        label: string;
        required: true;
        satisfied: false;
        source: string;
    }>;
    approvalScope: {
        packageDirectory: string;
        packageFiles: string[];
        workspaceFiles: string[];
        verificationCommands: string[];
        runtimeDispatchIncluded: false;
    };
    approvalDecision: {
        status: "blocked";
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canMutateWorkspace: false;
        canRunVerification: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    postApprovalSequence: Array<{
        id: string;
        allowedBeforeFinalApproval: false;
        writesFiles: boolean;
        runsCommands: boolean;
    }>;
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken {
    status: "planned-disabled";
    tokenVersion: "P25.41";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    tokenRequired: true;
    tokenProvided: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
    };
    tokenContract: {
        tokenType: "explicit-user-approval";
        format: "opaque-one-time-approval-token";
        acceptedNow: false;
        storedNow: false;
        requiredScope: string[];
        expiryRequired: true;
        replayAllowed: false;
        approverType: "human-user";
        tokenValueLogged: false;
    };
    validationPlan: {
        validateNow: false;
        requiredChecklistItemsSatisfied: false;
        requireHumanIntent: true;
        requireWorkspaceMutationScope: true;
        requireRuntimeDispatchDisabled: true;
        requireOneTimeUse: true;
        requireUnexpiredToken: true;
    };
    auditPlan: {
        writeAuditNow: false;
        includeUserId: true;
        includeTaskId: true;
        includeScopeHash: true;
        includeTimestamp: true;
        includeChecklistVersion: true;
        tokenValueLogged: false;
    };
    approvalDecision: {
        status: "blocked";
        canAcceptToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canMutateWorkspace: false;
        canRunVerification: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail {
    status: "planned-disabled";
    auditTrailVersion: "P25.42";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    auditTrailRequired: true;
    auditRecordPlanned: true;
    auditRecordWritten: false;
    auditRecordPersisted: false;
    auditRecordValidated: false;
    auditRecordExported: false;
    writeAuditNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationExplicitApprovalToken: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            tokenVersion: string;
            tokenAccepted: false;
            tokenValidated: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
        packageMaterializationApprovalGate: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            gateVersion: string;
            approved: false;
        };
    };
    auditTrailContract: {
        sink: "future-approval-audit-log";
        recordType: "renderer-service-package-materialization-approval";
        appendOnly: true;
        writeNow: false;
        persistNow: false;
        exportNow: false;
        tokenValueLogged: false;
        requiredFields: string[];
    };
    auditEvents: Array<{
        id: string;
        required: true;
        planned: true;
        written: false;
        tokenValueLogged: false;
    }>;
    retentionPlan: {
        retentionRequired: true;
        redactTokenValue: true;
        includeScopeHash: true;
        includeActor: true;
        includeTimestamp: true;
        enforceNow: false;
    };
    approvalDecision: {
        status: "blocked";
        canWriteAuditRecord: false;
        canPersistAuditRecord: false;
        canAcceptToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canMutateWorkspace: false;
        canRunVerification: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard {
    status: "planned-disabled";
    replayGuardVersion: "P25.43";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    replayGuardRequired: true;
    replayCheckPlanned: true;
    replayCheckExecuted: false;
    replayDetected: false;
    replayRejected: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    nonceStored: false;
    scopeHashStored: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditTrail: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditTrailVersion: string;
            auditRecordWritten: false;
        };
        packageMaterializationExplicitApprovalToken: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            tokenVersion: string;
            tokenAccepted: false;
            tokenValidated: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    replayGuardContract: {
        strategy: "one-time-token-with-scope-hash-and-nonce";
        checkNow: false;
        storeNonceNow: false;
        storeScopeHashNow: false;
        consumeTokenNow: false;
        rejectReplayNow: false;
        tokenValueLogged: false;
        requiredInputs: string[];
    };
    replayChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    replayDecision: {
        status: "blocked";
        canCheckReplay: false;
        canRejectReplay: false;
        canConsumeToken: false;
        canAcceptToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy {
    status: "planned-disabled";
    expiryPolicyVersion: "P25.44";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    expiryPolicyRequired: true;
    expiryCheckPlanned: true;
    expiryCheckExecuted: false;
    tokenExpired: false;
    tokenNotBeforeChecked: false;
    tokenExpiresAtChecked: false;
    clockSkewChecked: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalReplayGuard: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            replayGuardVersion: string;
            replayCheckExecuted: false;
        };
        packageMaterializationExplicitApprovalToken: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            tokenVersion: string;
            tokenValidated: false;
        };
        packageMaterializationApprovalAuditTrail: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditTrailVersion: string;
            auditRecordWritten: false;
        };
    };
    expiryPolicy: {
        policy: "short-lived-explicit-approval-token";
        checkNow: false;
        validateIssuedAtNow: false;
        validateNotBeforeNow: false;
        validateExpiresAtNow: false;
        validateClockSkewNow: false;
        maxAgeSeconds: 900;
        allowedClockSkewSeconds: 60;
        requiredClaims: string[];
        tokenValueLogged: false;
    };
    expiryChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    expiryDecision: {
        status: "blocked";
        canCheckExpiry: false;
        canAcceptToken: false;
        canConsumeToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy {
    status: "planned-disabled";
    revocationPolicyVersion: "P25.45";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    revocationPolicyRequired: true;
    revocationCheckPlanned: true;
    revocationCheckExecuted: false;
    revocationRegistryConfigured: false;
    revocationRegistryFetched: false;
    revocationStatusFetched: false;
    revocationStatusTrusted: false;
    tokenRevocationChecked: false;
    tokenRevoked: false;
    revokedTokenRejected: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalExpiryPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            expiryPolicyVersion: string;
            expiryCheckExecuted: false;
        };
        packageMaterializationApprovalReplayGuard: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            replayGuardVersion: string;
            replayCheckExecuted: false;
        };
        packageMaterializationApprovalAuditTrail: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditTrailVersion: string;
            auditRecordWritten: false;
        };
    };
    revocationPolicy: {
        policy: "deny-revoked-explicit-approval-token";
        checkNow: false;
        fetchRegistryNow: false;
        validateRevocationEpochNow: false;
        persistRevocationStateNow: false;
        rejectRevokedTokenNow: false;
        requiredInputs: string[];
        registrySources: string[];
        tokenValueLogged: false;
    };
    revocationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    revocationDecision: {
        status: "blocked";
        canCheckRevocation: false;
        canRejectRevokedToken: false;
        canAcceptToken: false;
        canConsumeToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy {
    status: "planned-disabled";
    scopeBindingVersion: "P25.46";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    scopeBindingRequired: true;
    scopeBindingPlanned: true;
    scopeBindingExecuted: false;
    approvalScopeHashComputed: false;
    approvalScopeHashValidated: false;
    approvalScopeHashStored: false;
    targetScopeBound: false;
    commandScopeBound: false;
    workspaceScopeBound: false;
    packageScopeBound: false;
    fileSnapshotRead: false;
    workspaceHashComputed: false;
    packageManifestHashComputed: false;
    tokenScopeMatched: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalRevocationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            revocationPolicyVersion: string;
            revocationCheckExecuted: false;
        };
        packageMaterializationApprovalExpiryPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            expiryPolicyVersion: string;
            expiryCheckExecuted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    scopeBindingPolicy: {
        policy: "bind-explicit-approval-token-to-renderer-package-scope";
        bindNow: false;
        computeApprovalScopeHashNow: false;
        validateApprovalScopeHashNow: false;
        readFileSnapshotNow: false;
        computeWorkspaceHashNow: false;
        computePackageManifestHashNow: false;
        persistScopeBindingNow: false;
        tokenValueLogged: false;
        requiredScopeFields: string[];
        hashAlgorithm: "sha256-planned";
    };
    scopeBindingChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    scopeBindingDecision: {
        status: "blocked";
        canBindScope: false;
        canComputeScopeHash: false;
        canValidateTokenScope: false;
        canAcceptToken: false;
        canConsumeToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy {
    status: "planned-disabled";
    operatorConfirmationVersion: "P25.47";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    operatorConfirmationRequired: true;
    operatorConfirmationPlanned: true;
    operatorConfirmationPrompted: false;
    operatorConfirmationReceived: false;
    operatorConfirmationStored: false;
    operatorConfirmationValidated: false;
    operatorIdentityVerified: false;
    operatorIntentCaptured: false;
    confirmationAuditLinked: false;
    confirmationTokenIssued: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalScopeBindingPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            scopeBindingVersion: string;
            scopeBindingExecuted: false;
        };
        packageMaterializationApprovalRevocationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            revocationPolicyVersion: string;
            revocationCheckExecuted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    operatorConfirmationPolicy: {
        policy: "require-explicit-operator-confirmation";
        promptNow: false;
        acceptConfirmationNow: false;
        validateOperatorIdentityNow: false;
        persistConfirmationNow: false;
        issueConfirmationTokenNow: false;
        requiredInputs: string[];
        confirmationPhrase: "materialize renderer-service package";
        tokenValueLogged: false;
    };
    operatorConfirmationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    operatorConfirmationDecision: {
        status: "blocked";
        canPromptOperator: false;
        canAcceptConfirmation: false;
        canValidateOperatorIdentity: false;
        canIssueConfirmationToken: false;
        canAcceptToken: false;
        canConsumeToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy {
    status: "planned-disabled";
    emergencyStopVersion: "P25.48";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    emergencyStopRequired: true;
    emergencyStopPlanned: true;
    emergencyStopConfigured: false;
    emergencyStopChecked: false;
    emergencyStopFetched: false;
    emergencyStopStateRead: false;
    emergencyStopStateTrusted: false;
    emergencyStopActive: false;
    emergencyStopBypassAllowed: false;
    emergencyStopAuditLinked: false;
    emergencyStopReasonRecorded: false;
    stopRegistryConfigured: false;
    stopRegistryFetched: false;
    stopStatusFetched: false;
    stopStatusTrusted: false;
    stopSignalReceived: false;
    stopSignalRejected: false;
    stopOverrideAccepted: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalOperatorConfirmationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            operatorConfirmationVersion: string;
            operatorConfirmationReceived: false;
        };
        packageMaterializationApprovalRevocationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            revocationPolicyVersion: string;
            revocationCheckExecuted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    emergencyStopPolicy: {
        policy: "deny-materialization-when-emergency-stop-is-active";
        checkNow: false;
        fetchRegistryNow: false;
        readStopStateNow: false;
        trustStopStateNow: false;
        allowBypassNow: false;
        persistStopDecisionNow: false;
        requiredInputs: string[];
        stopSource: "future-emergency-stop-registry";
        stopValueLogged: false;
    };
    emergencyStopChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    emergencyStopDecision: {
        status: "blocked";
        canCheckEmergencyStop: false;
        canFetchStopRegistry: false;
        canReadStopState: false;
        canTrustStopState: false;
        canBypassEmergencyStop: false;
        canAcceptToken: false;
        canConsumeToken: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy {
    status: "planned-disabled";
    readinessVerdictVersion: "P25.49";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    readinessVerdictRequired: true;
    readinessVerdictPlanned: true;
    readinessVerdictComputed: false;
    readinessVerdictStored: false;
    readinessVerdictTrusted: false;
    readinessVerdictApproved: false;
    readinessVerdictRejected: false;
    readinessVerdictAuditLinked: false;
    readinessInputsCollected: false;
    readinessInputsValidated: false;
    readinessBlockersEvaluated: false;
    readinessBlockersCleared: false;
    emergencyStopCleared: false;
    operatorConfirmationSatisfied: false;
    finalChecklistSatisfied: false;
    materializationReady: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalEmergencyStopPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            emergencyStopVersion: string;
            emergencyStopChecked: false;
            emergencyStopStateTrusted: false;
        };
        packageMaterializationApprovalOperatorConfirmationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            operatorConfirmationVersion: string;
            operatorConfirmationReceived: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    readinessVerdictPolicy: {
        policy: "require-all-materialization-approval-readiness-inputs";
        computeVerdictNow: false;
        validateInputsNow: false;
        evaluateBlockersNow: false;
        persistVerdictNow: false;
        trustVerdictNow: false;
        grantApprovalNow: false;
        requiredInputs: string[];
        verdictValueLogged: false;
    };
    readinessVerdictChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    readinessVerdictDecision: {
        status: "blocked";
        canComputeVerdict: false;
        canValidateInputs: false;
        canEvaluateBlockers: false;
        canTrustVerdict: false;
        canGrantFinalApproval: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy {
    status: "planned-disabled";
    executionHandoffVersion: "P25.50";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    handoffRequired: true;
    handoffPlanned: true;
    handoffPrepared: false;
    handoffQueued: false;
    handoffAccepted: false;
    handoffStored: false;
    handoffValidated: false;
    executionJobCreated: false;
    executionJobQueued: false;
    executionJobDispatched: false;
    executionOwnerSelected: false;
    executionOwnerNotified: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalReadinessVerdictPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            readinessVerdictVersion: string;
            readinessVerdictTrusted: false;
            materializationReady: false;
        };
        packageMaterializationApprovalEmergencyStopPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            emergencyStopVersion: string;
            emergencyStopChecked: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    executionHandoffPolicy: {
        policy: "handoff-only-after-trusted-readiness-verdict";
        prepareHandoffNow: false;
        validateHandoffNow: false;
        persistHandoffNow: false;
        createExecutionJobNow: false;
        queueExecutionJobNow: false;
        dispatchExecutionNow: false;
        requiredInputs: string[];
        handoffTarget: "future-materialization-executor";
        handoffPayloadLogged: false;
    };
    executionHandoffChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    executionHandoffDecision: {
        status: "blocked";
        canPrepareHandoff: false;
        canValidateHandoff: false;
        canPersistHandoff: false;
        canCreateExecutionJob: false;
        canQueueExecutionJob: false;
        canDispatchExecution: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy {
    status: "planned-disabled";
    postHandoffAuditVersion: "P25.51";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    auditRequired: true;
    auditPlanned: true;
    auditRecordPrepared: false;
    auditRecordValidated: false;
    auditRecordStored: false;
    auditRecordPublished: false;
    auditRecordExported: false;
    auditRecordWritten: false;
    auditTrailLinked: false;
    handoffSnapshotCaptured: false;
    executionJobSnapshotCaptured: false;
    auditSinkSelected: false;
    auditSinkNotified: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalExecutionHandoffPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            executionHandoffVersion: string;
            handoffAccepted: false;
            executionJobCreated: false;
        };
        packageMaterializationApprovalReadinessVerdictPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            readinessVerdictVersion: string;
            readinessVerdictTrusted: false;
            materializationReady: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    postHandoffAuditPolicy: {
        policy: "audit-only-after-execution-handoff-accepted";
        prepareAuditNow: false;
        validateAuditNow: false;
        storeAuditNow: false;
        publishAuditNow: false;
        exportAuditNow: false;
        writeAuditNow: false;
        requiredInputs: string[];
        auditSink: "future-materialization-audit-log";
        auditPayloadLogged: false;
    };
    postHandoffAuditChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    postHandoffAuditDecision: {
        status: "blocked";
        canPrepareAudit: false;
        canValidateAudit: false;
        canStoreAudit: false;
        canPublishAudit: false;
        canExportAudit: false;
        canWriteAudit: false;
        canCreateExecutionJob: false;
        canDispatchExecution: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy {
    status: "planned-disabled";
    auditRetentionVersion: "P25.52";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    retentionRequired: true;
    retentionPlanned: true;
    retentionPolicySelected: false;
    retentionWindowComputed: false;
    retentionClockTrusted: false;
    retentionRecordStored: false;
    retentionIndexUpdated: false;
    archivePrepared: false;
    archiveStored: false;
    purgeScheduled: false;
    purgeExecuted: false;
    exportPrepared: false;
    exportWritten: false;
    auditRecordWritten: false;
    auditRecordStored: false;
    auditRecordExported: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalPostHandoffAuditPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            postHandoffAuditVersion: string;
            auditRecordWritten: false;
            auditRecordStored: false;
        };
        packageMaterializationApprovalExecutionHandoffPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            executionHandoffVersion: string;
            handoffAccepted: false;
            executionJobCreated: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditRetentionPolicy: {
        policy: "retain-after-post-handoff-audit-record-written";
        selectRetentionNow: false;
        computeRetentionWindowNow: false;
        trustRetentionClockNow: false;
        storeRetentionRecordNow: false;
        updateRetentionIndexNow: false;
        prepareArchiveNow: false;
        storeArchiveNow: false;
        schedulePurgeNow: false;
        executePurgeNow: false;
        prepareExportNow: false;
        writeExportNow: false;
        requiredInputs: string[];
        retentionPolicyId: "future-materialization-audit-retention";
        retentionWindow: "future-policy-defined";
        retentionPayloadLogged: false;
    };
    auditRetentionChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditRetentionDecision: {
        status: "blocked";
        canSelectRetentionPolicy: false;
        canComputeRetentionWindow: false;
        canTrustRetentionClock: false;
        canStoreRetentionRecord: false;
        canUpdateRetentionIndex: false;
        canPrepareArchive: false;
        canStoreArchive: false;
        canSchedulePurge: false;
        canExecutePurge: false;
        canPrepareExport: false;
        canWriteExport: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy {
    status: "planned-disabled";
    auditAccessVersion: "P25.53";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    accessRequired: true;
    accessPlanned: true;
    accessPolicySelected: false;
    accessSubjectIdentified: false;
    accessScopeComputed: false;
    accessScopeValidated: false;
    accessDecisionComputed: false;
    accessDecisionStored: false;
    accessGranted: false;
    accessDenied: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordExported: false;
    auditRecordDownloaded: false;
    auditRecordRedacted: false;
    auditRecordSigned: false;
    auditRecordShared: false;
    accessTokenIssued: false;
    accessTokenAccepted: false;
    accessTokenStored: false;
    accessTokenValidated: false;
    accessTokenConsumed: false;
    accessTokenRevoked: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditRetentionPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditRetentionVersion: string;
            retentionRecordStored: false;
            auditRecordWritten: false;
        };
        packageMaterializationApprovalPostHandoffAuditPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            postHandoffAuditVersion: string;
            auditRecordWritten: false;
            auditRecordStored: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditAccessPolicy: {
        policy: "access-after-retained-audit-record-and-authorized-subject";
        selectAccessPolicyNow: false;
        identifyAccessSubjectNow: false;
        computeAccessScopeNow: false;
        validateAccessScopeNow: false;
        computeAccessDecisionNow: false;
        storeAccessDecisionNow: false;
        grantAccessNow: false;
        denyAccessNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        exportAuditRecordNow: false;
        downloadAuditRecordNow: false;
        redactAuditRecordNow: false;
        signAuditRecordNow: false;
        shareAuditRecordNow: false;
        issueAccessTokenNow: false;
        requiredInputs: string[];
        accessPolicyId: "future-materialization-audit-access";
        accessScope: "future-policy-defined";
        accessPayloadLogged: false;
    };
    auditAccessChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditAccessDecision: {
        status: "blocked";
        canSelectAccessPolicy: false;
        canIdentifyAccessSubject: false;
        canComputeAccessScope: false;
        canValidateAccessScope: false;
        canComputeAccessDecision: false;
        canStoreAccessDecision: false;
        canGrantAccess: false;
        canDenyAccess: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canExportAuditRecord: false;
        canDownloadAuditRecord: false;
        canRedactAuditRecord: false;
        canSignAuditRecord: false;
        canShareAuditRecord: false;
        canIssueAccessToken: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy {
    status: "planned-disabled";
    auditIntegrityVersion: "P25.54";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    integrityRequired: true;
    integrityPlanned: true;
    integrityPolicySelected: false;
    integritySubjectIdentified: false;
    integrityScopeComputed: false;
    integrityHashComputed: false;
    integrityHashStored: false;
    integrityHashVerified: false;
    integritySignatureCreated: false;
    integritySignatureVerified: false;
    integrityChainLinked: false;
    integrityChainVerified: false;
    auditRecordRead: false;
    auditRecordHashed: false;
    auditRecordVerified: false;
    auditRecordSigned: false;
    auditRecordSealed: false;
    auditRecordTamperChecked: false;
    auditRecordTamperDetected: false;
    auditRecordIntegrityStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationApprovalAuditRetentionPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditRetentionVersion: string;
            retentionRecordStored: false;
            auditRecordWritten: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditIntegrityPolicy: {
        policy: "verify-retained-audit-record-integrity-before-access";
        selectIntegrityPolicyNow: false;
        identifyIntegritySubjectNow: false;
        computeIntegrityScopeNow: false;
        computeIntegrityHashNow: false;
        storeIntegrityHashNow: false;
        verifyIntegrityHashNow: false;
        createIntegritySignatureNow: false;
        verifyIntegritySignatureNow: false;
        linkIntegrityChainNow: false;
        verifyIntegrityChainNow: false;
        readAuditRecordNow: false;
        hashAuditRecordNow: false;
        verifyAuditRecordNow: false;
        signAuditRecordNow: false;
        sealAuditRecordNow: false;
        checkTamperNow: false;
        storeIntegrityRecordNow: false;
        requiredInputs: string[];
        integrityPolicyId: "future-materialization-audit-integrity";
        digestAlgorithm: "future-policy-defined";
        integrityPayloadLogged: false;
    };
    auditIntegrityChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditIntegrityDecision: {
        status: "blocked";
        canSelectIntegrityPolicy: false;
        canIdentifyIntegritySubject: false;
        canComputeIntegrityScope: false;
        canComputeIntegrityHash: false;
        canStoreIntegrityHash: false;
        canVerifyIntegrityHash: false;
        canCreateIntegritySignature: false;
        canVerifyIntegritySignature: false;
        canLinkIntegrityChain: false;
        canVerifyIntegrityChain: false;
        canReadAuditRecord: false;
        canHashAuditRecord: false;
        canVerifyAuditRecord: false;
        canSignAuditRecord: false;
        canSealAuditRecord: false;
        canCheckTamper: false;
        canStoreIntegrityRecord: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy {
    status: "planned-disabled";
    auditProvenanceVersion: "P25.55";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    provenanceRequired: true;
    provenancePlanned: true;
    provenancePolicySelected: false;
    provenanceSubjectIdentified: false;
    provenanceSourceCollected: false;
    provenanceSourceValidated: false;
    provenanceGraphComputed: false;
    provenanceGraphStored: false;
    provenanceChainLinked: false;
    provenanceChainVerified: false;
    provenanceRecordCreated: false;
    provenanceRecordStored: false;
    provenanceRecordPublished: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordProvenanceLinked: false;
    auditRecordProvenanceVerified: false;
    provenanceSignatureCreated: false;
    provenanceSignatureVerified: false;
    provenanceHashComputed: false;
    provenanceHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditIntegrityPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditIntegrityVersion: string;
            auditRecordVerified: false;
            integrityHashVerified: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditProvenancePolicy: {
        policy: "track-provenance-after-integrity-verified-audit-record";
        selectProvenancePolicyNow: false;
        identifyProvenanceSubjectNow: false;
        collectProvenanceSourceNow: false;
        validateProvenanceSourceNow: false;
        computeProvenanceGraphNow: false;
        storeProvenanceGraphNow: false;
        linkProvenanceChainNow: false;
        verifyProvenanceChainNow: false;
        createProvenanceRecordNow: false;
        storeProvenanceRecordNow: false;
        publishProvenanceRecordNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordProvenanceNow: false;
        verifyAuditRecordProvenanceNow: false;
        signProvenanceNow: false;
        verifyProvenanceSignatureNow: false;
        computeProvenanceHashNow: false;
        storeProvenanceHashNow: false;
        requiredInputs: string[];
        provenancePolicyId: "future-materialization-audit-provenance";
        provenanceScope: "future-policy-defined";
        provenancePayloadLogged: false;
    };
    auditProvenanceChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditProvenanceDecision: {
        status: "blocked";
        canSelectProvenancePolicy: false;
        canIdentifyProvenanceSubject: false;
        canCollectProvenanceSource: false;
        canValidateProvenanceSource: false;
        canComputeProvenanceGraph: false;
        canStoreProvenanceGraph: false;
        canLinkProvenanceChain: false;
        canVerifyProvenanceChain: false;
        canCreateProvenanceRecord: false;
        canStoreProvenanceRecord: false;
        canPublishProvenanceRecord: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordProvenance: false;
        canVerifyAuditRecordProvenance: false;
        canSignProvenance: false;
        canVerifyProvenanceSignature: false;
        canComputeProvenanceHash: false;
        canStoreProvenanceHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy {
    status: "planned-disabled";
    auditCustodyVersion: "P25.56";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    custodyRequired: true;
    custodyPlanned: true;
    custodyPolicySelected: false;
    custodySubjectIdentified: false;
    custodyHolderIdentified: false;
    custodyTransferPrepared: false;
    custodyTransferExecuted: false;
    custodyTransferred: false;
    custodyTaken: false;
    custodyReleased: false;
    custodyChainLinked: false;
    custodyChainVerified: false;
    custodyRecordCreated: false;
    custodyRecordStored: false;
    custodyRecordPublished: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCustodyLinked: false;
    auditRecordCustodyVerified: false;
    custodySignatureCreated: false;
    custodySignatureVerified: false;
    custodyHashComputed: false;
    custodyHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditProvenancePolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditProvenanceVersion: string;
            provenanceRecordCreated: false;
            provenanceRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCustodyPolicy: {
        policy: "track-custody-after-provenance-record-defined";
        selectCustodyPolicyNow: false;
        identifyCustodySubjectNow: false;
        identifyCustodyHolderNow: false;
        prepareCustodyTransferNow: false;
        executeCustodyTransferNow: false;
        takeCustodyNow: false;
        releaseCustodyNow: false;
        linkCustodyChainNow: false;
        verifyCustodyChainNow: false;
        createCustodyRecordNow: false;
        storeCustodyRecordNow: false;
        publishCustodyRecordNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCustodyNow: false;
        verifyAuditRecordCustodyNow: false;
        signCustodyNow: false;
        verifyCustodySignatureNow: false;
        computeCustodyHashNow: false;
        storeCustodyHashNow: false;
        requiredInputs: string[];
        custodyPolicyId: "future-materialization-audit-custody";
        custodyScope: "future-policy-defined";
        custodyPayloadLogged: false;
    };
    auditCustodyChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCustodyDecision: {
        status: "blocked";
        canSelectCustodyPolicy: false;
        canIdentifyCustodySubject: false;
        canIdentifyCustodyHolder: false;
        canPrepareCustodyTransfer: false;
        canExecuteCustodyTransfer: false;
        canTakeCustody: false;
        canReleaseCustody: false;
        canLinkCustodyChain: false;
        canVerifyCustodyChain: false;
        canCreateCustodyRecord: false;
        canStoreCustodyRecord: false;
        canPublishCustodyRecord: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCustody: false;
        canVerifyAuditRecordCustody: false;
        canSignCustody: false;
        canVerifyCustodySignature: false;
        canComputeCustodyHash: false;
        canStoreCustodyHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy {
    status: "planned-disabled";
    auditEvidenceVersion: "P25.57";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    evidenceRequired: true;
    evidencePlanned: true;
    evidencePolicySelected: false;
    evidenceSubjectIdentified: false;
    evidenceSourceIdentified: false;
    evidenceCollected: false;
    evidenceValidated: false;
    evidenceNormalized: false;
    evidenceRecordCreated: false;
    evidenceRecordStored: false;
    evidenceRecordPublished: false;
    evidenceBundleCreated: false;
    evidenceBundleStored: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordEvidenceLinked: false;
    auditRecordEvidenceVerified: false;
    evidenceSignatureCreated: false;
    evidenceSignatureVerified: false;
    evidenceHashComputed: false;
    evidenceHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCustodyPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCustodyVersion: string;
            custodyRecordCreated: false;
            custodyRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditEvidencePolicy: {
        policy: "collect-evidence-after-custody-record-defined";
        selectEvidencePolicyNow: false;
        identifyEvidenceSubjectNow: false;
        identifyEvidenceSourceNow: false;
        collectEvidenceNow: false;
        validateEvidenceNow: false;
        normalizeEvidenceNow: false;
        createEvidenceRecordNow: false;
        storeEvidenceRecordNow: false;
        publishEvidenceRecordNow: false;
        createEvidenceBundleNow: false;
        storeEvidenceBundleNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordEvidenceNow: false;
        verifyAuditRecordEvidenceNow: false;
        signEvidenceNow: false;
        verifyEvidenceSignatureNow: false;
        computeEvidenceHashNow: false;
        storeEvidenceHashNow: false;
        requiredInputs: string[];
        evidencePolicyId: "future-materialization-audit-evidence";
        evidenceScope: "future-policy-defined";
        evidencePayloadLogged: false;
    };
    auditEvidenceChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditEvidenceDecision: {
        status: "blocked";
        canSelectEvidencePolicy: false;
        canIdentifyEvidenceSubject: false;
        canIdentifyEvidenceSource: false;
        canCollectEvidence: false;
        canValidateEvidence: false;
        canNormalizeEvidence: false;
        canCreateEvidenceRecord: false;
        canStoreEvidenceRecord: false;
        canPublishEvidenceRecord: false;
        canCreateEvidenceBundle: false;
        canStoreEvidenceBundle: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordEvidence: false;
        canVerifyAuditRecordEvidence: false;
        canSignEvidence: false;
        canVerifyEvidenceSignature: false;
        canComputeEvidenceHash: false;
        canStoreEvidenceHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy {
    status: "planned-disabled";
    auditAttestationVersion: "P25.58";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    attestationRequired: true;
    attestationPlanned: true;
    attestationPolicySelected: false;
    attestationSubjectIdentified: false;
    attestationAuthorityIdentified: false;
    attestationPrepared: false;
    attestationCreated: false;
    attestationValidated: false;
    attestationStored: false;
    attestationPublished: false;
    attestationBundleCreated: false;
    attestationBundleStored: false;
    evidenceRecordRead: false;
    evidenceRecordAttested: false;
    evidenceRecordVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordAttestationLinked: false;
    auditRecordAttestationVerified: false;
    attestationSignatureCreated: false;
    attestationSignatureVerified: false;
    attestationHashComputed: false;
    attestationHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditEvidencePolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditEvidenceVersion: string;
            evidenceRecordCreated: false;
            evidenceRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditAttestationPolicy: {
        policy: "attest-evidence-after-evidence-record-defined";
        selectAttestationPolicyNow: false;
        identifyAttestationSubjectNow: false;
        identifyAttestationAuthorityNow: false;
        prepareAttestationNow: false;
        createAttestationNow: false;
        validateAttestationNow: false;
        storeAttestationNow: false;
        publishAttestationNow: false;
        createAttestationBundleNow: false;
        storeAttestationBundleNow: false;
        readEvidenceRecordNow: false;
        attestEvidenceRecordNow: false;
        verifyEvidenceRecordNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordAttestationNow: false;
        verifyAuditRecordAttestationNow: false;
        signAttestationNow: false;
        verifyAttestationSignatureNow: false;
        computeAttestationHashNow: false;
        storeAttestationHashNow: false;
        requiredInputs: string[];
        attestationPolicyId: "future-materialization-audit-attestation";
        attestationScope: "future-policy-defined";
        attestationPayloadLogged: false;
    };
    auditAttestationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditAttestationDecision: {
        status: "blocked";
        canSelectAttestationPolicy: false;
        canIdentifyAttestationSubject: false;
        canIdentifyAttestationAuthority: false;
        canPrepareAttestation: false;
        canCreateAttestation: false;
        canValidateAttestation: false;
        canStoreAttestation: false;
        canPublishAttestation: false;
        canCreateAttestationBundle: false;
        canStoreAttestationBundle: false;
        canReadEvidenceRecord: false;
        canAttestEvidenceRecord: false;
        canVerifyEvidenceRecord: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordAttestation: false;
        canVerifyAuditRecordAttestation: false;
        canSignAttestation: false;
        canVerifyAttestationSignature: false;
        canComputeAttestationHash: false;
        canStoreAttestationHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy {
    status: "planned-disabled";
    auditNotarizationVersion: "P25.59";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    notarizationRequired: true;
    notarizationPlanned: true;
    notarizationPolicySelected: false;
    notarizationSubjectIdentified: false;
    notarizationAuthorityIdentified: false;
    notarizationPrepared: false;
    notarizationCreated: false;
    notarizationValidated: false;
    notarizationStored: false;
    notarizationPublished: false;
    notarizationRecordCreated: false;
    notarizationRecordStored: false;
    notarizationRecordPublished: false;
    attestationRead: false;
    attestationNotarized: false;
    attestationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordNotarizationLinked: false;
    auditRecordNotarizationVerified: false;
    notarizationSignatureCreated: false;
    notarizationSignatureVerified: false;
    notarizationHashComputed: false;
    notarizationHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditAttestationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAttestationVersion: string;
            attestationCreated: false;
            attestationStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditNotarizationPolicy: {
        policy: "notarize-attestation-after-attestation-record-defined";
        selectNotarizationPolicyNow: false;
        identifyNotarizationSubjectNow: false;
        identifyNotarizationAuthorityNow: false;
        prepareNotarizationNow: false;
        createNotarizationNow: false;
        validateNotarizationNow: false;
        storeNotarizationNow: false;
        publishNotarizationNow: false;
        createNotarizationRecordNow: false;
        storeNotarizationRecordNow: false;
        publishNotarizationRecordNow: false;
        readAttestationNow: false;
        notarizeAttestationNow: false;
        verifyAttestationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordNotarizationNow: false;
        verifyAuditRecordNotarizationNow: false;
        signNotarizationNow: false;
        verifyNotarizationSignatureNow: false;
        computeNotarizationHashNow: false;
        storeNotarizationHashNow: false;
        requiredInputs: string[];
        notarizationPolicyId: "future-materialization-audit-notarization";
        notarizationScope: "future-policy-defined";
        notarizationPayloadLogged: false;
    };
    auditNotarizationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditNotarizationDecision: {
        status: "blocked";
        canSelectNotarizationPolicy: false;
        canIdentifyNotarizationSubject: false;
        canIdentifyNotarizationAuthority: false;
        canPrepareNotarization: false;
        canCreateNotarization: false;
        canValidateNotarization: false;
        canStoreNotarization: false;
        canPublishNotarization: false;
        canCreateNotarizationRecord: false;
        canStoreNotarizationRecord: false;
        canPublishNotarizationRecord: false;
        canReadAttestation: false;
        canNotarizeAttestation: false;
        canVerifyAttestation: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordNotarization: false;
        canVerifyAuditRecordNotarization: false;
        canSignNotarization: false;
        canVerifyNotarizationSignature: false;
        canComputeNotarizationHash: false;
        canStoreNotarizationHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy {
    status: "planned-disabled";
    auditCertificationVersion: "P25.60";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    certificationRequired: true;
    certificationPlanned: true;
    certificationPolicySelected: false;
    certificationSubjectIdentified: false;
    certificationAuthorityIdentified: false;
    certificationPrepared: false;
    certificationCreated: false;
    certificationValidated: false;
    certificationStored: false;
    certificationPublished: false;
    certificationRecordCreated: false;
    certificationRecordStored: false;
    certificationRecordPublished: false;
    notarizationRead: false;
    notarizationCertified: false;
    notarizationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCertificationLinked: false;
    auditRecordCertificationVerified: false;
    certificationSignatureCreated: false;
    certificationSignatureVerified: false;
    certificationHashComputed: false;
    certificationHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditNotarizationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditNotarizationVersion: string;
            notarizationCreated: false;
            notarizationRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCertificationPolicy: {
        policy: "certify-notarization-after-notarization-record-defined";
        selectCertificationPolicyNow: false;
        identifyCertificationSubjectNow: false;
        identifyCertificationAuthorityNow: false;
        prepareCertificationNow: false;
        createCertificationNow: false;
        validateCertificationNow: false;
        storeCertificationNow: false;
        publishCertificationNow: false;
        createCertificationRecordNow: false;
        storeCertificationRecordNow: false;
        publishCertificationRecordNow: false;
        readNotarizationNow: false;
        certifyNotarizationNow: false;
        verifyNotarizationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCertificationNow: false;
        verifyAuditRecordCertificationNow: false;
        signCertificationNow: false;
        verifyCertificationSignatureNow: false;
        computeCertificationHashNow: false;
        storeCertificationHashNow: false;
        requiredInputs: string[];
        certificationPolicyId: "future-materialization-audit-certification";
        certificationScope: "future-policy-defined";
        certificationPayloadLogged: false;
    };
    auditCertificationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCertificationDecision: {
        status: "blocked";
        canSelectCertificationPolicy: false;
        canIdentifyCertificationSubject: false;
        canIdentifyCertificationAuthority: false;
        canPrepareCertification: false;
        canCreateCertification: false;
        canValidateCertification: false;
        canStoreCertification: false;
        canPublishCertification: false;
        canCreateCertificationRecord: false;
        canStoreCertificationRecord: false;
        canPublishCertificationRecord: false;
        canReadNotarization: false;
        canCertifyNotarization: false;
        canVerifyNotarization: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCertification: false;
        canVerifyAuditRecordCertification: false;
        canSignCertification: false;
        canVerifyCertificationSignature: false;
        canComputeCertificationHash: false;
        canStoreCertificationHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy {
    status: "planned-disabled";
    auditEndorsementVersion: "P25.61";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    endorsementRequired: true;
    endorsementPlanned: true;
    endorsementPolicySelected: false;
    endorsementSubjectIdentified: false;
    endorsementAuthorityIdentified: false;
    endorsementPrepared: false;
    endorsementCreated: false;
    endorsementValidated: false;
    endorsementStored: false;
    endorsementPublished: false;
    endorsementRecordCreated: false;
    endorsementRecordStored: false;
    endorsementRecordPublished: false;
    certificationRead: false;
    certificationEndorsed: false;
    certificationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordEndorsementLinked: false;
    auditRecordEndorsementVerified: false;
    endorsementSignatureCreated: false;
    endorsementSignatureVerified: false;
    endorsementHashComputed: false;
    endorsementHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCertificationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCertificationVersion: string;
            certificationCreated: false;
            certificationRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditEndorsementPolicy: {
        policy: "endorse-certification-after-certification-record-defined";
        selectEndorsementPolicyNow: false;
        identifyEndorsementSubjectNow: false;
        identifyEndorsementAuthorityNow: false;
        prepareEndorsementNow: false;
        createEndorsementNow: false;
        validateEndorsementNow: false;
        storeEndorsementNow: false;
        publishEndorsementNow: false;
        createEndorsementRecordNow: false;
        storeEndorsementRecordNow: false;
        publishEndorsementRecordNow: false;
        readCertificationNow: false;
        endorseCertificationNow: false;
        verifyCertificationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordEndorsementNow: false;
        verifyAuditRecordEndorsementNow: false;
        signEndorsementNow: false;
        verifyEndorsementSignatureNow: false;
        computeEndorsementHashNow: false;
        storeEndorsementHashNow: false;
        requiredInputs: string[];
        endorsementPolicyId: "future-materialization-audit-endorsement";
        endorsementScope: "future-policy-defined";
        endorsementPayloadLogged: false;
    };
    auditEndorsementChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditEndorsementDecision: {
        status: "blocked";
        canSelectEndorsementPolicy: false;
        canIdentifyEndorsementSubject: false;
        canIdentifyEndorsementAuthority: false;
        canPrepareEndorsement: false;
        canCreateEndorsement: false;
        canValidateEndorsement: false;
        canStoreEndorsement: false;
        canPublishEndorsement: false;
        canCreateEndorsementRecord: false;
        canStoreEndorsementRecord: false;
        canPublishEndorsementRecord: false;
        canReadCertification: false;
        canEndorseCertification: false;
        canVerifyCertification: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordEndorsement: false;
        canVerifyAuditRecordEndorsement: false;
        canSignEndorsement: false;
        canVerifyEndorsementSignature: false;
        canComputeEndorsementHash: false;
        canStoreEndorsementHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy {
    status: "planned-disabled";
    auditCountersignatureVersion: "P25.62";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureRequired: true;
    countersignaturePlanned: true;
    countersignaturePolicySelected: false;
    countersignatureSubjectIdentified: false;
    countersignatureAuthorityIdentified: false;
    countersignaturePrepared: false;
    countersignatureCreated: false;
    countersignatureValidated: false;
    countersignatureStored: false;
    countersignaturePublished: false;
    countersignatureRecordCreated: false;
    countersignatureRecordStored: false;
    countersignatureRecordPublished: false;
    endorsementRead: false;
    endorsementCountersigned: false;
    endorsementVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureLinked: false;
    auditRecordCountersignatureVerified: false;
    countersignatureSignatureCreated: false;
    countersignatureSignatureVerified: false;
    countersignatureHashComputed: false;
    countersignatureHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditEndorsementPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditEndorsementVersion: string;
            endorsementCreated: false;
            endorsementRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignaturePolicy: {
        policy: "countersign-endorsement-after-endorsement-record-defined";
        selectCountersignaturePolicyNow: false;
        identifyCountersignatureSubjectNow: false;
        identifyCountersignatureAuthorityNow: false;
        prepareCountersignatureNow: false;
        createCountersignatureNow: false;
        validateCountersignatureNow: false;
        storeCountersignatureNow: false;
        publishCountersignatureNow: false;
        createCountersignatureRecordNow: false;
        storeCountersignatureRecordNow: false;
        publishCountersignatureRecordNow: false;
        readEndorsementNow: false;
        countersignEndorsementNow: false;
        verifyEndorsementNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureNow: false;
        verifyAuditRecordCountersignatureNow: false;
        signCountersignatureNow: false;
        verifyCountersignatureSignatureNow: false;
        computeCountersignatureHashNow: false;
        storeCountersignatureHashNow: false;
        requiredInputs: string[];
        countersignaturePolicyId: "future-materialization-audit-countersignature";
        countersignatureScope: "future-policy-defined";
        countersignaturePayloadLogged: false;
    };
    auditCountersignatureChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureDecision: {
        status: "blocked";
        canSelectCountersignaturePolicy: false;
        canIdentifyCountersignatureSubject: false;
        canIdentifyCountersignatureAuthority: false;
        canPrepareCountersignature: false;
        canCreateCountersignature: false;
        canValidateCountersignature: false;
        canStoreCountersignature: false;
        canPublishCountersignature: false;
        canCreateCountersignatureRecord: false;
        canStoreCountersignatureRecord: false;
        canPublishCountersignatureRecord: false;
        canReadEndorsement: false;
        canCountersignEndorsement: false;
        canVerifyEndorsement: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignature: false;
        canVerifyAuditRecordCountersignature: false;
        canSignCountersignature: false;
        canVerifyCountersignatureSignature: false;
        canComputeCountersignatureHash: false;
        canStoreCountersignatureHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy {
    status: "planned-disabled";
    auditCountersignatureVerificationVersion: "P25.63";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureVerificationRequired: true;
    countersignatureVerificationPlanned: true;
    countersignatureVerificationPolicySelected: false;
    countersignatureVerificationSubjectIdentified: false;
    countersignatureVerificationAuthorityIdentified: false;
    countersignatureRead: false;
    countersignatureRecordRead: false;
    countersignaturePayloadParsed: false;
    countersignatureSignatureRead: false;
    countersignatureSignatureVerified: false;
    countersignatureHashComputed: false;
    countersignatureHashMatched: false;
    countersignatureChainLinked: false;
    countersignatureChainVerified: false;
    countersignatureVerificationPrepared: false;
    countersignatureVerificationExecuted: false;
    countersignatureVerificationPassed: false;
    countersignatureVerificationFailed: false;
    countersignatureVerificationStored: false;
    countersignatureVerificationPublished: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureVerificationLinked: false;
    auditRecordCountersignatureVerificationVerified: false;
    countersignatureVerificationSignatureCreated: false;
    countersignatureVerificationSignatureVerified: false;
    countersignatureVerificationHashComputed: false;
    countersignatureVerificationHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCountersignaturePolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCountersignatureVersion: string;
            countersignatureCreated: false;
            countersignatureRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignatureVerificationPolicy: {
        policy: "verify-countersignature-after-countersignature-record-defined";
        selectCountersignatureVerificationPolicyNow: false;
        identifyCountersignatureVerificationSubjectNow: false;
        identifyCountersignatureVerificationAuthorityNow: false;
        readCountersignatureNow: false;
        readCountersignatureRecordNow: false;
        parseCountersignaturePayloadNow: false;
        readCountersignatureSignatureNow: false;
        verifyCountersignatureSignatureNow: false;
        computeCountersignatureHashNow: false;
        matchCountersignatureHashNow: false;
        linkCountersignatureChainNow: false;
        verifyCountersignatureChainNow: false;
        prepareCountersignatureVerificationNow: false;
        executeCountersignatureVerificationNow: false;
        storeCountersignatureVerificationNow: false;
        publishCountersignatureVerificationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureVerificationNow: false;
        verifyAuditRecordCountersignatureVerificationNow: false;
        signCountersignatureVerificationNow: false;
        verifyCountersignatureVerificationSignatureNow: false;
        computeCountersignatureVerificationHashNow: false;
        storeCountersignatureVerificationHashNow: false;
        requiredInputs: string[];
        countersignatureVerificationPolicyId: "future-materialization-audit-countersignature-verification";
        countersignatureVerificationScope: "future-policy-defined";
        countersignatureVerificationPayloadLogged: false;
    };
    auditCountersignatureVerificationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureVerificationDecision: {
        status: "blocked";
        canSelectCountersignatureVerificationPolicy: false;
        canIdentifyCountersignatureVerificationSubject: false;
        canIdentifyCountersignatureVerificationAuthority: false;
        canReadCountersignature: false;
        canReadCountersignatureRecord: false;
        canParseCountersignaturePayload: false;
        canReadCountersignatureSignature: false;
        canVerifyCountersignatureSignature: false;
        canComputeCountersignatureHash: false;
        canMatchCountersignatureHash: false;
        canLinkCountersignatureChain: false;
        canVerifyCountersignatureChain: false;
        canPrepareCountersignatureVerification: false;
        canExecuteCountersignatureVerification: false;
        canPassCountersignatureVerification: false;
        canStoreCountersignatureVerification: false;
        canPublishCountersignatureVerification: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignatureVerification: false;
        canVerifyAuditRecordCountersignatureVerification: false;
        canSignCountersignatureVerification: false;
        canVerifyCountersignatureVerificationSignature: false;
        canComputeCountersignatureVerificationHash: false;
        canStoreCountersignatureVerificationHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy {
    status: "planned-disabled";
    auditCountersignatureRevocationVersion: "P25.64";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureRevocationRequired: true;
    countersignatureRevocationPlanned: true;
    countersignatureRevocationPolicySelected: false;
    countersignatureRevocationSubjectIdentified: false;
    countersignatureRevocationAuthorityIdentified: false;
    countersignatureRevocationReasonCaptured: false;
    countersignatureRevocationScopeComputed: false;
    countersignatureRevocationRequestPrepared: false;
    countersignatureRevocationRequestValidated: false;
    countersignatureRevocationRequestStored: false;
    countersignatureRevocationExecuted: false;
    countersignatureRevoked: false;
    countersignatureRevocationPublished: false;
    countersignatureRevocationRecordCreated: false;
    countersignatureRevocationRecordStored: false;
    countersignatureRevocationRecordPublished: false;
    countersignatureRead: false;
    countersignatureRecordRead: false;
    countersignatureVerificationRead: false;
    countersignatureVerificationRevoked: false;
    countersignatureVerificationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureRevocationLinked: false;
    auditRecordCountersignatureRevocationVerified: false;
    countersignatureRevocationSignatureCreated: false;
    countersignatureRevocationSignatureVerified: false;
    countersignatureRevocationHashComputed: false;
    countersignatureRevocationHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCountersignatureVerificationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCountersignatureVerificationVersion: string;
            countersignatureVerificationExecuted: false;
            countersignatureVerificationStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignatureRevocationPolicy: {
        policy: "revoke-countersignature-after-verification-policy-defined";
        selectCountersignatureRevocationPolicyNow: false;
        identifyCountersignatureRevocationSubjectNow: false;
        identifyCountersignatureRevocationAuthorityNow: false;
        captureCountersignatureRevocationReasonNow: false;
        computeCountersignatureRevocationScopeNow: false;
        prepareCountersignatureRevocationRequestNow: false;
        validateCountersignatureRevocationRequestNow: false;
        storeCountersignatureRevocationRequestNow: false;
        executeCountersignatureRevocationNow: false;
        revokeCountersignatureNow: false;
        publishCountersignatureRevocationNow: false;
        createCountersignatureRevocationRecordNow: false;
        storeCountersignatureRevocationRecordNow: false;
        publishCountersignatureRevocationRecordNow: false;
        readCountersignatureNow: false;
        readCountersignatureRecordNow: false;
        readCountersignatureVerificationNow: false;
        revokeCountersignatureVerificationNow: false;
        verifyCountersignatureVerificationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureRevocationNow: false;
        verifyAuditRecordCountersignatureRevocationNow: false;
        signCountersignatureRevocationNow: false;
        verifyCountersignatureRevocationSignatureNow: false;
        computeCountersignatureRevocationHashNow: false;
        storeCountersignatureRevocationHashNow: false;
        requiredInputs: string[];
        countersignatureRevocationPolicyId: "future-materialization-audit-countersignature-revocation";
        countersignatureRevocationScope: "future-policy-defined";
        countersignatureRevocationPayloadLogged: false;
    };
    auditCountersignatureRevocationChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureRevocationDecision: {
        status: "blocked";
        canSelectCountersignatureRevocationPolicy: false;
        canIdentifyCountersignatureRevocationSubject: false;
        canIdentifyCountersignatureRevocationAuthority: false;
        canCaptureCountersignatureRevocationReason: false;
        canComputeCountersignatureRevocationScope: false;
        canPrepareCountersignatureRevocationRequest: false;
        canValidateCountersignatureRevocationRequest: false;
        canStoreCountersignatureRevocationRequest: false;
        canExecuteCountersignatureRevocation: false;
        canRevokeCountersignature: false;
        canPublishCountersignatureRevocation: false;
        canCreateCountersignatureRevocationRecord: false;
        canStoreCountersignatureRevocationRecord: false;
        canPublishCountersignatureRevocationRecord: false;
        canReadCountersignature: false;
        canReadCountersignatureRecord: false;
        canReadCountersignatureVerification: false;
        canRevokeCountersignatureVerification: false;
        canVerifyCountersignatureVerification: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignatureRevocation: false;
        canVerifyAuditRecordCountersignatureRevocation: false;
        canSignCountersignatureRevocation: false;
        canVerifyCountersignatureRevocationSignature: false;
        canComputeCountersignatureRevocationHash: false;
        canStoreCountersignatureRevocationHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy {
    status: "planned-disabled";
    auditCountersignatureRevocationAppealVersion: "P25.65";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureRevocationAppealRequired: true;
    countersignatureRevocationAppealPlanned: true;
    countersignatureRevocationAppealPolicySelected: false;
    countersignatureRevocationAppealSubjectIdentified: false;
    countersignatureRevocationAppealAuthorityIdentified: false;
    countersignatureRevocationAppealReasonCaptured: false;
    countersignatureRevocationAppealScopeComputed: false;
    countersignatureRevocationAppealRequestPrepared: false;
    countersignatureRevocationAppealRequestValidated: false;
    countersignatureRevocationAppealRequestStored: false;
    countersignatureRevocationAppealExecuted: false;
    countersignatureRevocationAppealed: false;
    countersignatureRevocationAppealGranted: false;
    countersignatureRevocationAppealDenied: false;
    countersignatureRevocationAppealPublished: false;
    countersignatureRevocationAppealRecordCreated: false;
    countersignatureRevocationAppealRecordStored: false;
    countersignatureRevocationAppealRecordPublished: false;
    countersignatureRevocationRead: false;
    countersignatureRevocationRecordRead: false;
    countersignatureRead: false;
    countersignatureRevocationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureRevocationAppealLinked: false;
    auditRecordCountersignatureRevocationAppealVerified: false;
    countersignatureRevocationAppealSignatureCreated: false;
    countersignatureRevocationAppealSignatureVerified: false;
    countersignatureRevocationAppealHashComputed: false;
    countersignatureRevocationAppealHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCountersignatureRevocationPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCountersignatureRevocationVersion: string;
            countersignatureRevoked: false;
            countersignatureRevocationRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignatureRevocationAppealPolicy: {
        policy: "appeal-countersignature-revocation-after-revocation-policy-defined";
        selectCountersignatureRevocationAppealPolicyNow: false;
        identifyCountersignatureRevocationAppealSubjectNow: false;
        identifyCountersignatureRevocationAppealAuthorityNow: false;
        captureCountersignatureRevocationAppealReasonNow: false;
        computeCountersignatureRevocationAppealScopeNow: false;
        prepareCountersignatureRevocationAppealRequestNow: false;
        validateCountersignatureRevocationAppealRequestNow: false;
        storeCountersignatureRevocationAppealRequestNow: false;
        executeCountersignatureRevocationAppealNow: false;
        appealCountersignatureRevocationNow: false;
        grantCountersignatureRevocationAppealNow: false;
        denyCountersignatureRevocationAppealNow: false;
        publishCountersignatureRevocationAppealNow: false;
        createCountersignatureRevocationAppealRecordNow: false;
        storeCountersignatureRevocationAppealRecordNow: false;
        publishCountersignatureRevocationAppealRecordNow: false;
        readCountersignatureRevocationNow: false;
        readCountersignatureRevocationRecordNow: false;
        readCountersignatureNow: false;
        verifyCountersignatureRevocationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureRevocationAppealNow: false;
        verifyAuditRecordCountersignatureRevocationAppealNow: false;
        signCountersignatureRevocationAppealNow: false;
        verifyCountersignatureRevocationAppealSignatureNow: false;
        computeCountersignatureRevocationAppealHashNow: false;
        storeCountersignatureRevocationAppealHashNow: false;
        requiredInputs: string[];
        countersignatureRevocationAppealPolicyId: "future-materialization-audit-countersignature-revocation-appeal";
        countersignatureRevocationAppealScope: "future-policy-defined";
        countersignatureRevocationAppealPayloadLogged: false;
    };
    auditCountersignatureRevocationAppealChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureRevocationAppealDecision: {
        status: "blocked";
        canSelectCountersignatureRevocationAppealPolicy: false;
        canIdentifyCountersignatureRevocationAppealSubject: false;
        canIdentifyCountersignatureRevocationAppealAuthority: false;
        canCaptureCountersignatureRevocationAppealReason: false;
        canComputeCountersignatureRevocationAppealScope: false;
        canPrepareCountersignatureRevocationAppealRequest: false;
        canValidateCountersignatureRevocationAppealRequest: false;
        canStoreCountersignatureRevocationAppealRequest: false;
        canExecuteCountersignatureRevocationAppeal: false;
        canAppealCountersignatureRevocation: false;
        canGrantCountersignatureRevocationAppeal: false;
        canDenyCountersignatureRevocationAppeal: false;
        canPublishCountersignatureRevocationAppeal: false;
        canCreateCountersignatureRevocationAppealRecord: false;
        canStoreCountersignatureRevocationAppealRecord: false;
        canPublishCountersignatureRevocationAppealRecord: false;
        canReadCountersignatureRevocation: false;
        canReadCountersignatureRevocationRecord: false;
        canReadCountersignature: false;
        canVerifyCountersignatureRevocation: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignatureRevocationAppeal: false;
        canVerifyAuditRecordCountersignatureRevocationAppeal: false;
        canSignCountersignatureRevocationAppeal: false;
        canVerifyCountersignatureRevocationAppealSignature: false;
        canComputeCountersignatureRevocationAppealHash: false;
        canStoreCountersignatureRevocationAppealHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy {
    status: "planned-disabled";
    auditCountersignatureRevocationAppealResolutionVersion: "P25.66";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureRevocationAppealResolutionRequired: true;
    countersignatureRevocationAppealResolutionPlanned: true;
    countersignatureRevocationAppealResolutionPolicySelected: false;
    countersignatureRevocationAppealResolutionSubjectIdentified: false;
    countersignatureRevocationAppealResolutionAuthorityIdentified: false;
    countersignatureRevocationAppealRead: false;
    countersignatureRevocationAppealRecordRead: false;
    countersignatureRevocationAppealResolutionReasonCaptured: false;
    countersignatureRevocationAppealResolutionScopeComputed: false;
    countersignatureRevocationAppealResolutionOutcomeSelected: false;
    countersignatureRevocationAppealResolutionPrepared: false;
    countersignatureRevocationAppealResolutionValidated: false;
    countersignatureRevocationAppealResolutionStored: false;
    countersignatureRevocationAppealResolutionExecuted: false;
    countersignatureRevocationAppealResolved: false;
    countersignatureRevocationAppealResolutionAccepted: false;
    countersignatureRevocationAppealResolutionRejected: false;
    countersignatureRevocationAppealResolutionPublished: false;
    countersignatureRevocationAppealResolutionRecordCreated: false;
    countersignatureRevocationAppealResolutionRecordStored: false;
    countersignatureRevocationAppealResolutionRecordPublished: false;
    countersignatureRevocationRead: false;
    countersignatureRevocationRecordRead: false;
    countersignatureRead: false;
    countersignatureRevocationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureRevocationAppealResolutionLinked: false;
    auditRecordCountersignatureRevocationAppealResolutionVerified: false;
    countersignatureRevocationAppealResolutionSignatureCreated: false;
    countersignatureRevocationAppealResolutionSignatureVerified: false;
    countersignatureRevocationAppealResolutionHashComputed: false;
    countersignatureRevocationAppealResolutionHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCountersignatureRevocationAppealVersion: string;
            countersignatureRevocationAppealed: false;
            countersignatureRevocationAppealRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignatureRevocationAppealResolutionPolicy: {
        policy: "resolve-countersignature-revocation-appeal-after-appeal-policy-defined";
        selectCountersignatureRevocationAppealResolutionPolicyNow: false;
        identifyCountersignatureRevocationAppealResolutionSubjectNow: false;
        identifyCountersignatureRevocationAppealResolutionAuthorityNow: false;
        readCountersignatureRevocationAppealNow: false;
        readCountersignatureRevocationAppealRecordNow: false;
        captureCountersignatureRevocationAppealResolutionReasonNow: false;
        computeCountersignatureRevocationAppealResolutionScopeNow: false;
        selectCountersignatureRevocationAppealResolutionOutcomeNow: false;
        prepareCountersignatureRevocationAppealResolutionNow: false;
        validateCountersignatureRevocationAppealResolutionNow: false;
        storeCountersignatureRevocationAppealResolutionNow: false;
        executeCountersignatureRevocationAppealResolutionNow: false;
        resolveCountersignatureRevocationAppealNow: false;
        acceptCountersignatureRevocationAppealResolutionNow: false;
        rejectCountersignatureRevocationAppealResolutionNow: false;
        publishCountersignatureRevocationAppealResolutionNow: false;
        createCountersignatureRevocationAppealResolutionRecordNow: false;
        storeCountersignatureRevocationAppealResolutionRecordNow: false;
        publishCountersignatureRevocationAppealResolutionRecordNow: false;
        readCountersignatureRevocationNow: false;
        readCountersignatureRevocationRecordNow: false;
        readCountersignatureNow: false;
        verifyCountersignatureRevocationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureRevocationAppealResolutionNow: false;
        verifyAuditRecordCountersignatureRevocationAppealResolutionNow: false;
        signCountersignatureRevocationAppealResolutionNow: false;
        verifyCountersignatureRevocationAppealResolutionSignatureNow: false;
        computeCountersignatureRevocationAppealResolutionHashNow: false;
        storeCountersignatureRevocationAppealResolutionHashNow: false;
        requiredInputs: string[];
        countersignatureRevocationAppealResolutionPolicyId: "future-materialization-audit-countersignature-revocation-appeal-resolution";
        countersignatureRevocationAppealResolutionScope: "future-policy-defined";
        countersignatureRevocationAppealResolutionPayloadLogged: false;
    };
    auditCountersignatureRevocationAppealResolutionChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureRevocationAppealResolutionDecision: {
        status: "blocked";
        canSelectCountersignatureRevocationAppealResolutionPolicy: false;
        canIdentifyCountersignatureRevocationAppealResolutionSubject: false;
        canIdentifyCountersignatureRevocationAppealResolutionAuthority: false;
        canReadCountersignatureRevocationAppeal: false;
        canReadCountersignatureRevocationAppealRecord: false;
        canCaptureCountersignatureRevocationAppealResolutionReason: false;
        canComputeCountersignatureRevocationAppealResolutionScope: false;
        canSelectCountersignatureRevocationAppealResolutionOutcome: false;
        canPrepareCountersignatureRevocationAppealResolution: false;
        canValidateCountersignatureRevocationAppealResolution: false;
        canStoreCountersignatureRevocationAppealResolution: false;
        canExecuteCountersignatureRevocationAppealResolution: false;
        canResolveCountersignatureRevocationAppeal: false;
        canAcceptCountersignatureRevocationAppealResolution: false;
        canRejectCountersignatureRevocationAppealResolution: false;
        canPublishCountersignatureRevocationAppealResolution: false;
        canCreateCountersignatureRevocationAppealResolutionRecord: false;
        canStoreCountersignatureRevocationAppealResolutionRecord: false;
        canPublishCountersignatureRevocationAppealResolutionRecord: false;
        canReadCountersignatureRevocation: false;
        canReadCountersignatureRevocationRecord: false;
        canReadCountersignature: false;
        canVerifyCountersignatureRevocation: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignatureRevocationAppealResolution: false;
        canVerifyAuditRecordCountersignatureRevocationAppealResolution: false;
        canSignCountersignatureRevocationAppealResolution: false;
        canVerifyCountersignatureRevocationAppealResolutionSignature: false;
        canComputeCountersignatureRevocationAppealResolutionHash: false;
        canStoreCountersignatureRevocationAppealResolutionHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy {
    status: "planned-disabled";
    auditCountersignatureRevocationAppealResolutionEnforcementVersion: "P25.67";
    adapter: "renderer-service";
    command: "render.thumbnail";
    dryRunOnly: true;
    approvalRequired: true;
    approved: false;
    finalApprovalGranted: false;
    countersignatureRevocationAppealResolutionEnforcementRequired: true;
    countersignatureRevocationAppealResolutionEnforcementPlanned: true;
    countersignatureRevocationAppealResolutionEnforcementPolicySelected: false;
    countersignatureRevocationAppealResolutionEnforcementSubjectIdentified: false;
    countersignatureRevocationAppealResolutionEnforcementAuthorityIdentified: false;
    countersignatureRevocationAppealResolutionRead: false;
    countersignatureRevocationAppealResolutionRecordRead: false;
    countersignatureRevocationAppealResolutionEnforcementReasonCaptured: false;
    countersignatureRevocationAppealResolutionEnforcementScopeComputed: false;
    countersignatureRevocationAppealResolutionEnforcementActionSelected: false;
    countersignatureRevocationAppealResolutionEnforcementPrepared: false;
    countersignatureRevocationAppealResolutionEnforcementValidated: false;
    countersignatureRevocationAppealResolutionEnforcementStored: false;
    countersignatureRevocationAppealResolutionEnforcementExecuted: false;
    countersignatureRevocationAppealResolutionEnforced: false;
    countersignatureRevocationAppealResolutionEnforcementAccepted: false;
    countersignatureRevocationAppealResolutionEnforcementRejected: false;
    countersignatureRevocationAppealResolutionEnforcementPublished: false;
    countersignatureRevocationAppealResolutionEnforcementRecordCreated: false;
    countersignatureRevocationAppealResolutionEnforcementRecordStored: false;
    countersignatureRevocationAppealResolutionEnforcementRecordPublished: false;
    countersignatureRevocationAppealRead: false;
    countersignatureRevocationAppealRecordRead: false;
    countersignatureRevocationRead: false;
    countersignatureRevocationRecordRead: false;
    countersignatureRead: false;
    countersignatureRevocationVerified: false;
    auditRecordRead: false;
    auditRecordQueried: false;
    auditRecordCountersignatureRevocationAppealResolutionEnforcementLinked: false;
    auditRecordCountersignatureRevocationAppealResolutionEnforcementVerified: false;
    countersignatureRevocationAppealResolutionEnforcementSignatureCreated: false;
    countersignatureRevocationAppealResolutionEnforcementSignatureVerified: false;
    countersignatureRevocationAppealResolutionEnforcementHashComputed: false;
    countersignatureRevocationAppealResolutionEnforcementHashStored: false;
    materializationReady: false;
    materializationApproved: false;
    materializationApprovedNow: false;
    tokenAccepted: false;
    tokenStored: false;
    tokenValidated: false;
    tokenConsumed: false;
    tokenRevoked: false;
    executeNow: false;
    verifyNow: false;
    rollbackNow: false;
    dispatch: false;
    networkDispatch: false;
    runtimeRegistration: false;
    localFileWrites: false;
    hostStartup: false;
    processSpawn: false;
    packageCreated: false;
    workspaceMutation: false;
    scriptRunnable: false;
    fileMaterialization: false;
    lockfileMutation: false;
    rootPackageJsonMutation: false;
    pnpmWorkspaceMutation: false;
    commandExecution: false;
    buildOutput: false;
    packageScriptsRunnable: false;
    filesWritten: false;
    rollbackExecuted: false;
    verificationExecuted: false;
    consumes: {
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditCountersignatureRevocationAppealResolutionVersion: string;
            countersignatureRevocationAppealResolved: false;
            countersignatureRevocationAppealResolutionRecordStored: false;
        };
        packageMaterializationApprovalAuditAccessPolicy: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            auditAccessVersion: string;
            auditRecordRead: false;
            accessGranted: false;
        };
        packageMaterializationFinalApprovalChecklist: {
            requiredStatus: "planned-disabled";
            currentStatus: string;
            checklistVersion: string;
            finalApprovalGranted: false;
        };
    };
    auditCountersignatureRevocationAppealResolutionEnforcementPolicy: {
        policy: "enforce-countersignature-revocation-appeal-resolution-after-resolution-policy-defined";
        selectCountersignatureRevocationAppealResolutionEnforcementPolicyNow: false;
        identifyCountersignatureRevocationAppealResolutionEnforcementSubjectNow: false;
        identifyCountersignatureRevocationAppealResolutionEnforcementAuthorityNow: false;
        readCountersignatureRevocationAppealResolutionNow: false;
        readCountersignatureRevocationAppealResolutionRecordNow: false;
        captureCountersignatureRevocationAppealResolutionEnforcementReasonNow: false;
        computeCountersignatureRevocationAppealResolutionEnforcementScopeNow: false;
        selectCountersignatureRevocationAppealResolutionEnforcementActionNow: false;
        prepareCountersignatureRevocationAppealResolutionEnforcementNow: false;
        validateCountersignatureRevocationAppealResolutionEnforcementNow: false;
        storeCountersignatureRevocationAppealResolutionEnforcementNow: false;
        executeCountersignatureRevocationAppealResolutionEnforcementNow: false;
        enforceCountersignatureRevocationAppealResolutionNow: false;
        acceptCountersignatureRevocationAppealResolutionEnforcementNow: false;
        rejectCountersignatureRevocationAppealResolutionEnforcementNow: false;
        publishCountersignatureRevocationAppealResolutionEnforcementNow: false;
        createCountersignatureRevocationAppealResolutionEnforcementRecordNow: false;
        storeCountersignatureRevocationAppealResolutionEnforcementRecordNow: false;
        publishCountersignatureRevocationAppealResolutionEnforcementRecordNow: false;
        readCountersignatureRevocationAppealNow: false;
        readCountersignatureRevocationAppealRecordNow: false;
        readCountersignatureRevocationNow: false;
        readCountersignatureRevocationRecordNow: false;
        readCountersignatureNow: false;
        verifyCountersignatureRevocationNow: false;
        readAuditRecordNow: false;
        queryAuditRecordNow: false;
        linkAuditRecordCountersignatureRevocationAppealResolutionEnforcementNow: false;
        verifyAuditRecordCountersignatureRevocationAppealResolutionEnforcementNow: false;
        signCountersignatureRevocationAppealResolutionEnforcementNow: false;
        verifyCountersignatureRevocationAppealResolutionEnforcementSignatureNow: false;
        computeCountersignatureRevocationAppealResolutionEnforcementHashNow: false;
        storeCountersignatureRevocationAppealResolutionEnforcementHashNow: false;
        requiredInputs: string[];
        countersignatureRevocationAppealResolutionEnforcementPolicyId: "future-materialization-audit-countersignature-revocation-appeal-resolution-enforcement";
        countersignatureRevocationAppealResolutionEnforcementScope: "future-policy-defined";
        countersignatureRevocationAppealResolutionEnforcementPayloadLogged: false;
    };
    auditCountersignatureRevocationAppealResolutionEnforcementChecks: Array<{
        id: string;
        required: true;
        planned: true;
        executed: false;
        passed: false;
    }>;
    auditCountersignatureRevocationAppealResolutionEnforcementDecision: {
        status: "blocked";
        canSelectCountersignatureRevocationAppealResolutionEnforcementPolicy: false;
        canIdentifyCountersignatureRevocationAppealResolutionEnforcementSubject: false;
        canIdentifyCountersignatureRevocationAppealResolutionEnforcementAuthority: false;
        canReadCountersignatureRevocationAppealResolution: false;
        canReadCountersignatureRevocationAppealResolutionRecord: false;
        canCaptureCountersignatureRevocationAppealResolutionEnforcementReason: false;
        canComputeCountersignatureRevocationAppealResolutionEnforcementScope: false;
        canSelectCountersignatureRevocationAppealResolutionEnforcementAction: false;
        canPrepareCountersignatureRevocationAppealResolutionEnforcement: false;
        canValidateCountersignatureRevocationAppealResolutionEnforcement: false;
        canStoreCountersignatureRevocationAppealResolutionEnforcement: false;
        canExecuteCountersignatureRevocationAppealResolutionEnforcement: false;
        canEnforceCountersignatureRevocationAppealResolution: false;
        canAcceptCountersignatureRevocationAppealResolutionEnforcement: false;
        canRejectCountersignatureRevocationAppealResolutionEnforcement: false;
        canPublishCountersignatureRevocationAppealResolutionEnforcement: false;
        canCreateCountersignatureRevocationAppealResolutionEnforcementRecord: false;
        canStoreCountersignatureRevocationAppealResolutionEnforcementRecord: false;
        canPublishCountersignatureRevocationAppealResolutionEnforcementRecord: false;
        canReadCountersignatureRevocationAppeal: false;
        canReadCountersignatureRevocationAppealRecord: false;
        canReadCountersignatureRevocation: false;
        canReadCountersignatureRevocationRecord: false;
        canReadCountersignature: false;
        canVerifyCountersignatureRevocation: false;
        canReadAuditRecord: false;
        canQueryAuditRecord: false;
        canLinkAuditRecordCountersignatureRevocationAppealResolutionEnforcement: false;
        canVerifyAuditRecordCountersignatureRevocationAppealResolutionEnforcement: false;
        canSignCountersignatureRevocationAppealResolutionEnforcement: false;
        canVerifyCountersignatureRevocationAppealResolutionEnforcementSignature: false;
        canComputeCountersignatureRevocationAppealResolutionEnforcementHash: false;
        canStoreCountersignatureRevocationAppealResolutionEnforcementHash: false;
        canMaterializeFiles: false;
        canEnableRuntimeDispatch: false;
        reason: string;
    };
    noOpGuarantees: string[];
    requiredBeforeRuntimeDispatch: string[];
}

export interface CreateRenderThumbnailRendererServiceClientRequestOptions {
    entrypoint?: "mcp" | "cli" | string | null;
    mcpToolName?: string | null;
    mcpSessionId?: string | null;
    cliCommand?: string | null;
}

export interface RenderThumbnailRendererServiceClientRequest {
    status: "scaffolded";
    dispatch: false;
    reason: string;
    method: "POST";
    endpoint: string | null;
    timeoutMs: number;
    headers: Record<string, string>;
    body: RenderThumbnailRendererServicePlan["serviceRequest"] | null;
    audit: {
        entrypoint: string;
        mcpToolName: string | null;
        mcpSessionId: string | null;
        cliCommand: string | null;
        adapter: "renderer-service";
    };
    authForwarding: {
        mode: "caller-session";
        headerNames: ["authorization", "cookie"];
        tokenValuesIncluded: false;
    };
}

export interface CreateRenderThumbnailRendererServiceResultOptions {
    publicUri?: string | null;
    backendUri?: string | null;
}

export interface RenderThumbnailRendererServiceResult {
    command: "render.thumbnail";
    status: "ok";
    adapter: "renderer-service";
    operation: "thumbnail.render";
    target: RenderThumbnailRendererServicePlan["target"] | null;
    artifact: RenderThumbnailRendererServicePlan["artifact"] | null;
    cache: {
        outcome: string;
        policy: RenderThumbnailCachePolicy | null;
        scope: "file-thumbnail" | "file-object-thumbnail" | string | null;
        key: string | null;
    };
    resource: {
        mediaId: string | null;
        resourceUri: string;
        downloadUri: string;
        contentType: string;
    };
    renderer: {
        runtime: "render-wasm-worker" | string | null;
        fallbackUsed: boolean;
    };
    serviceResponse: {
        normalized: true;
        localFileWrites: false;
    };
}

export interface RenderThumbnailRendererServiceErrorPayload extends CommandErrorPayload {
    data: {
        command: "render.thumbnail";
        adapter: "renderer-service";
        operation: "thumbnail.render";
        endpoint: string | null;
        status: number | null;
        retryable: boolean;
        serviceData: Record<string, unknown> | null;
    };
}

export interface LowRiskCommandDescriptorCatalog {
    MCP_STATUS: CommandDescriptor & { id: "mcp.status"; mcpToolName: "mcp.get_status"; cliCommand: "mcp status" };
    MCP_CONFIG: CommandDescriptor & { id: "mcp.config"; cliCommand: "mcp config" };
    FILE_LIST: CommandDescriptor & { id: "file.list"; mcpToolName: "file.list"; cliCommand: "file list" };
    FILE_CREATE: CommandDescriptor & { id: "file.create"; mcpToolName: "file.create"; cliCommand: "file create" };
    FILE_OPEN: CommandDescriptor & { id: "file.open"; mcpToolName: "file.open"; cliCommand: "file open" };
    PAGE_LIST: CommandDescriptor & { id: "page.list"; mcpToolName: "page.list"; cliCommand: "page list" };
    PAGE_CREATE: CommandDescriptor & { id: "page.create"; mcpToolName: "page.create"; cliCommand: "page create" };
}

export interface CommandDescriptorCatalog extends LowRiskCommandDescriptorCatalog {
    PAGE_RENAME: CommandDescriptor & { id: "page.rename"; mcpToolName: "page.rename"; cliCommand: "page rename" };
    PAGE_SET_CURRENT: CommandDescriptor & { id: "page.set_current"; mcpToolName: "page.set_current" };
    SELECTION_GET: CommandDescriptor & { id: "selection.get"; mcpToolName: "selection.get" };
    SELECTION_SET: CommandDescriptor & { id: "selection.set"; mcpToolName: "selection.set" };
    PROTOTYPE_CREATE_FLOW: CommandDescriptor & {
        id: "prototype.create_flow";
        mcpToolName: "prototype.create_flow";
        cliCommand: "prototype create-flow";
    };
    PROTOTYPE_CREATE_INTERACTION: CommandDescriptor & {
        id: "prototype.create_interaction";
        mcpToolName: "prototype.create_interaction";
        cliCommand: "prototype create-interaction";
    };
    PROTOTYPE_LIST_INTERACTIONS: CommandDescriptor & {
        id: "prototype.list_interactions";
        mcpToolName: "prototype.list_interactions";
        cliCommand: "prototype list-interactions";
    };
    PROTOTYPE_DELETE_INTERACTION: CommandDescriptor & {
        id: "prototype.delete_interaction";
        mcpToolName: "prototype.delete_interaction";
        cliCommand: "prototype delete-interaction";
    };
    PROTOTYPE_UPDATE_INTERACTION: CommandDescriptor & {
        id: "prototype.update_interaction";
        mcpToolName: "prototype.update_interaction";
        cliCommand: "prototype update-interaction";
    };
    PROTOTYPE_REORDER_INTERACTION: CommandDescriptor & {
        id: "prototype.reorder_interaction";
        mcpToolName: "prototype.reorder_interaction";
        cliCommand: "prototype reorder-interaction";
    };
    PROTOTYPE_DUPLICATE_INTERACTION: CommandDescriptor & {
        id: "prototype.duplicate_interaction";
        mcpToolName: "prototype.duplicate_interaction";
        cliCommand: "prototype duplicate-interaction";
    };
    PROTOTYPE_CREATE_OVERLAY: CommandDescriptor & {
        id: "prototype.create_overlay";
        mcpToolName: "prototype.create_overlay";
        cliCommand: "prototype create-overlay";
    };
    SHAPE_CREATE_FRAME: CommandDescriptor & {
        id: "shape.create_frame";
        mcpToolName: "shape.create_frame";
        cliCommand: "shape create-frame";
    };
    SHAPE_CREATE_RECT: CommandDescriptor & {
        id: "shape.create_rect";
        mcpToolName: "shape.create_rect";
        cliCommand: "shape create-rect";
    };
    SHAPE_CREATE_TEXT: CommandDescriptor & {
        id: "shape.create_text";
        mcpToolName: "shape.create_text";
        cliCommand: "shape create-text";
    };
    SHAPE_CREATE_IMAGE: CommandDescriptor & {
        id: "shape.create_image";
        mcpToolName: "shape.create_image";
        cliCommand: "shape create-image";
    };
    SHAPE_UPDATE: CommandDescriptor & {
        id: "shape.update";
        mcpToolName: "shape.update";
        cliCommand: "shape update";
    };
    SHAPE_SET_LAYOUT: CommandDescriptor & {
        id: "shape.set_layout";
        mcpToolName: "shape.set_layout";
        cliCommand: "shape set-layout";
    };
    SHAPE_SET_STYLE: CommandDescriptor & {
        id: "shape.set_style";
        mcpToolName: "shape.set_style";
        cliCommand: "shape set-style";
    };
    SHAPE_DELETE: CommandDescriptor & {
        id: "shape.delete";
        mcpToolName: "shape.delete";
        cliCommand: "shape delete";
    };
    EXPORT_SHAPE: CommandDescriptor & { id: "export.shape"; mcpToolName: "export.shape" };
    EXPORT_PAGE: CommandDescriptor & {
        id: "export.page";
        mcpToolName: "export.page";
        cliCommand: "export page";
    };
    EXPORT_FILE: CommandDescriptor & {
        id: "export.file";
        mcpToolName: "export.file";
        cliCommand: "export file";
    };
    RENDER_PREVIEW: CommandDescriptor & {
        id: "render.preview";
        mcpToolName: "render.preview";
        cliCommand: "render preview";
    };
    RENDER_THUMBNAIL: CommandDescriptor & {
        id: "render.thumbnail";
        mcpToolName: "render.thumbnail";
        cliCommand: "render thumbnail";
    };
}

export const CommandErrorCodes: CommandErrorCodeCatalog;
export const AdapterSelectionReasonCodes: AdapterSelectionReasonCodeCatalog;
export const ExportFileFormats: ExportFileFormatCatalog;
export const ExportFileLibraryModes: ExportFileLibraryModeCatalog;
export const RenderThumbnailTargets: RenderThumbnailTargetCatalog;
export const RenderThumbnailCachePolicies: RenderThumbnailCachePolicyCatalog;
export const RenderThumbnailFormats: RenderThumbnailFormatCatalog;
export const CommandDescriptors: CommandDescriptorCatalog;
export const LowRiskCommandDescriptors: readonly CommandDescriptor[];
export const HeadlessAuthoringCommandDescriptors: readonly CommandDescriptor[];
export const LiveGapCommandDescriptors: readonly CommandDescriptor[];
export const ShapeExportCommandDescriptors: readonly CommandDescriptor[];
export const MigratedCommandDescriptors: readonly CommandDescriptor[];
export function getCommandDescriptor(id: string): CommandDescriptor | undefined;
export function createCommandRequestEnvelope<TInput = unknown>(
    command: string | CommandDescriptor,
    options?: CreateCommandRequestEnvelopeOptions<TInput>
): CommandRequestEnvelope<TInput>;
export function createCommandResultEnvelope<TData = unknown>(
    requestEnvelope: string | CommandDescriptor | CommandRequestEnvelope,
    data: TData,
    options?: CreateCommandResultEnvelopeOptions
): CommandResultEnvelope<TData>;
export function getAdapterSelectionReason(code: AdapterSelectionReasonCode | string): string;
export function createWorkspaceUrl(options: CreateWorkspaceUrlOptions): string;
export function createFileOpenHandoff(options: CreateFileOpenHandoffOptions): FileOpenHandoff;
export function createExportFileContract(options?: CreateExportFileContractOptions): ExportFileContract;
export function createRenderThumbnailContract(options?: CreateRenderThumbnailContractOptions): RenderThumbnailContract;
export function createRenderThumbnailRendererServicePlan(
    options?: CreateRenderThumbnailRendererServicePlanOptions
): RenderThumbnailRendererServicePlan;
export function createRenderThumbnailRendererServiceExecutionGate(
    options?: {
        endpoint?: string | null;
        targetKind?: RenderThumbnailTarget | string | null;
        cachePolicy?: RenderThumbnailCachePolicy | string | null;
        requiredCapabilities?: string[] | null;
        executionGate?: CreateRenderThumbnailRendererServiceExecutionGateOptions | null;
    }
): RenderThumbnailRendererServiceExecutionGate;
export function createRenderThumbnailRendererServiceOptInConfiguration(
    options?: CreateRenderThumbnailRendererServiceOptInConfigurationOptions | null
): RenderThumbnailRendererServiceOptInConfiguration;
export function createRenderThumbnailRendererServiceHealthPreflight(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
    }
): RenderThumbnailRendererServiceHealthPreflight;
export function createRenderThumbnailRendererServiceExecutionClientHarness(
    options?: {
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
    }
): RenderThumbnailRendererServiceExecutionClientHarness;
export function createRenderThumbnailRendererServiceDispatchAdapterBoundary(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        executionClientHarness?: Partial<RenderThumbnailRendererServiceExecutionClientHarness> | null;
    }
): RenderThumbnailRendererServiceDispatchAdapterBoundary;
export function createRenderThumbnailRendererServiceUnavailableErrorTaxonomy(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        availability?: Partial<RenderThumbnailRendererServiceAvailability> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
    }
): RenderThumbnailRendererServiceUnavailableErrorTaxonomy;
export function createRenderThumbnailRendererServiceIntegrationFixtureHarness(
    options?: {
        targetKind?: RenderThumbnailTarget | string | null;
        cachePolicy?: RenderThumbnailCachePolicy | string | null;
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
        unavailableErrorTaxonomy?: Partial<RenderThumbnailRendererServiceUnavailableErrorTaxonomy> | null;
    }
): RenderThumbnailRendererServiceIntegrationFixtureHarness;
export function createRenderThumbnailRendererServiceDispatchRegistrationPreflight(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        availability?: Partial<RenderThumbnailRendererServiceAvailability> | null;
        optInConfiguration?: Partial<RenderThumbnailRendererServiceOptInConfiguration> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        executionClientHarness?: Partial<RenderThumbnailRendererServiceExecutionClientHarness> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
        unavailableErrorTaxonomy?: Partial<RenderThumbnailRendererServiceUnavailableErrorTaxonomy> | null;
        integrationFixtureHarness?: Partial<RenderThumbnailRendererServiceIntegrationFixtureHarness> | null;
        requiredCapabilities?: string[] | null;
    }
): RenderThumbnailRendererServiceDispatchRegistrationPreflight;
export function createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold(
    options?: {
        dispatchRegistrationPreflight?: Partial<RenderThumbnailRendererServiceDispatchRegistrationPreflight> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
        clientRequest?: Partial<RenderThumbnailRendererServiceClientRequest> | null;
    }
): RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold;
export function createRenderThumbnailRendererServiceAdapterRegistryManifest(
    options?: {
        executableAdapterRegistrationScaffold?: Partial<RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold> | null;
        dispatchRegistrationPreflight?: Partial<RenderThumbnailRendererServiceDispatchRegistrationPreflight> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
    }
): RenderThumbnailRendererServiceAdapterRegistryManifest;
export function createRenderThumbnailRendererServiceEnablementChecklist(
    options?: {
        optInConfiguration?: Partial<RenderThumbnailRendererServiceOptInConfiguration> | null;
        executionGate?: Partial<RenderThumbnailRendererServiceExecutionGate> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        executionClientHarness?: Partial<RenderThumbnailRendererServiceExecutionClientHarness> | null;
        dispatchAdapterBoundary?: Partial<RenderThumbnailRendererServiceDispatchAdapterBoundary> | null;
        unavailableErrorTaxonomy?: Partial<RenderThumbnailRendererServiceUnavailableErrorTaxonomy> | null;
        integrationFixtureHarness?: Partial<RenderThumbnailRendererServiceIntegrationFixtureHarness> | null;
        dispatchRegistrationPreflight?: Partial<RenderThumbnailRendererServiceDispatchRegistrationPreflight> | null;
        executableAdapterRegistrationScaffold?: Partial<RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold> | null;
        adapterRegistryManifest?: Partial<RenderThumbnailRendererServiceAdapterRegistryManifest> | null;
        requiredCapabilities?: string[] | null;
    }
): RenderThumbnailRendererServiceEnablementChecklist;
export function createRenderThumbnailRendererServiceImplementationSliceAudit(
    options?: {
        enablementChecklist?: Partial<RenderThumbnailRendererServiceEnablementChecklist> | null;
        adapterRegistryManifest?: Partial<RenderThumbnailRendererServiceAdapterRegistryManifest> | null;
        executableAdapterRegistrationScaffold?: Partial<RenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold> | null;
        dispatchRegistrationPreflight?: Partial<RenderThumbnailRendererServiceDispatchRegistrationPreflight> | null;
        requiredCapabilities?: string[] | null;
    }
): RenderThumbnailRendererServiceImplementationSliceAudit;
export function createRenderThumbnailRendererServiceHealthNoopContractFixtures(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        implementationSliceAudit?: Partial<RenderThumbnailRendererServiceImplementationSliceAudit> | null;
        healthPreflight?: Partial<RenderThumbnailRendererServiceHealthPreflight> | null;
        clientRequest?: Partial<RenderThumbnailRendererServiceClientRequest> | null;
    }
): RenderThumbnailRendererServiceHealthNoopContractFixtures;
export function createRenderThumbnailRendererServiceNoopServiceHostScaffold(
    options?: {
        client?: Partial<RenderThumbnailRendererServiceClientConfig> | null;
        healthNoopContractFixtures?: Partial<RenderThumbnailRendererServiceHealthNoopContractFixtures> | null;
        implementationSliceAudit?: Partial<RenderThumbnailRendererServiceImplementationSliceAudit> | null;
    }
): RenderThumbnailRendererServiceNoopServiceHostScaffold;
export function createRenderThumbnailRendererServiceHostLifecycleTestFixtures(
    options?: {
        noopServiceHostScaffold?: Partial<RenderThumbnailRendererServiceNoopServiceHostScaffold> | null;
        healthNoopContractFixtures?: Partial<RenderThumbnailRendererServiceHealthNoopContractFixtures> | null;
    }
): RenderThumbnailRendererServiceHostLifecycleTestFixtures;
export function createRenderThumbnailRendererServicePackageManifestScaffold(
    options?: {
        noopServiceHostScaffold?: Partial<RenderThumbnailRendererServiceNoopServiceHostScaffold> | null;
        hostLifecycleTestFixtures?: Partial<RenderThumbnailRendererServiceHostLifecycleTestFixtures> | null;
    }
): RenderThumbnailRendererServicePackageManifestScaffold;
export function createRenderThumbnailRendererServicePackageCreationGuardrails(
    options?: {
        packageManifestScaffold?: Partial<RenderThumbnailRendererServicePackageManifestScaffold> | null;
        hostLifecycleTestFixtures?: Partial<RenderThumbnailRendererServiceHostLifecycleTestFixtures> | null;
    }
): RenderThumbnailRendererServicePackageCreationGuardrails;
export function createRenderThumbnailRendererServicePackageFileTemplates(
    options?: {
        packageManifestScaffold?: Partial<RenderThumbnailRendererServicePackageManifestScaffold> | null;
        packageCreationGuardrails?: Partial<RenderThumbnailRendererServicePackageCreationGuardrails> | null;
    }
): RenderThumbnailRendererServicePackageFileTemplates;
export function createRenderThumbnailRendererServicePackageWorkspaceWiring(
    options?: {
        packageManifestScaffold?: Partial<RenderThumbnailRendererServicePackageManifestScaffold> | null;
        packageCreationGuardrails?: Partial<RenderThumbnailRendererServicePackageCreationGuardrails> | null;
        packageFileTemplates?: Partial<RenderThumbnailRendererServicePackageFileTemplates> | null;
    }
): RenderThumbnailRendererServicePackageWorkspaceWiring;
export function createRenderThumbnailRendererServicePackageBuildVerification(
    options?: {
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageFileTemplates?: Partial<RenderThumbnailRendererServicePackageFileTemplates> | null;
    }
): RenderThumbnailRendererServicePackageBuildVerification;
export function createRenderThumbnailRendererServicePackageMaterializationChecklist(
    options?: {
        packageFileTemplates?: Partial<RenderThumbnailRendererServicePackageFileTemplates> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationChecklist;
export function createRenderThumbnailRendererServicePackageCreationDryRunSummary(
    options?: {
        packageMaterializationChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationChecklist> | null;
        packageFileTemplates?: Partial<RenderThumbnailRendererServicePackageFileTemplates> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
    }
): RenderThumbnailRendererServicePackageCreationDryRunSummary;
export function createRenderThumbnailRendererServicePackageCreationFileManifest(
    options?: {
        packageCreationDryRunSummary?: Partial<RenderThumbnailRendererServicePackageCreationDryRunSummary> | null;
        packageFileTemplates?: Partial<RenderThumbnailRendererServicePackageFileTemplates> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
    }
): RenderThumbnailRendererServicePackageCreationFileManifest;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalGate(
    options?: {
        packageMaterializationChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationChecklist> | null;
        packageCreationFileManifest?: Partial<RenderThumbnailRendererServicePackageCreationFileManifest> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalGate;
export function createRenderThumbnailRendererServicePackageMaterializationExecutionDryRun(
    options?: {
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
        packageCreationFileManifest?: Partial<RenderThumbnailRendererServicePackageCreationFileManifest> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationExecutionDryRun;
export function createRenderThumbnailRendererServicePackageMaterializationWriteContract(
    options?: {
        packageMaterializationExecutionDryRun?: Partial<RenderThumbnailRendererServicePackageMaterializationExecutionDryRun> | null;
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
        packageCreationFileManifest?: Partial<RenderThumbnailRendererServicePackageCreationFileManifest> | null;
        packageWorkspaceWiring?: Partial<RenderThumbnailRendererServicePackageWorkspaceWiring> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationWriteContract;
export function createRenderThumbnailRendererServicePackageMaterializationRollbackContract(
    options?: {
        packageMaterializationWriteContract?: Partial<RenderThumbnailRendererServicePackageMaterializationWriteContract> | null;
        packageMaterializationExecutionDryRun?: Partial<RenderThumbnailRendererServicePackageMaterializationExecutionDryRun> | null;
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationRollbackContract;
export function createRenderThumbnailRendererServicePackageMaterializationVerificationManifest(
    options?: {
        packageMaterializationRollbackContract?: Partial<RenderThumbnailRendererServicePackageMaterializationRollbackContract> | null;
        packageMaterializationWriteContract?: Partial<RenderThumbnailRendererServicePackageMaterializationWriteContract> | null;
        packageBuildVerification?: Partial<RenderThumbnailRendererServicePackageBuildVerification> | null;
        packageCreationFileManifest?: Partial<RenderThumbnailRendererServicePackageCreationFileManifest> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationVerificationManifest;
export function createRenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist(
    options?: {
        packageMaterializationVerificationManifest?: Partial<RenderThumbnailRendererServicePackageMaterializationVerificationManifest> | null;
        packageMaterializationRollbackContract?: Partial<RenderThumbnailRendererServicePackageMaterializationRollbackContract> | null;
        packageMaterializationWriteContract?: Partial<RenderThumbnailRendererServicePackageMaterializationWriteContract> | null;
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist;
export function createRenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken(
    options?: {
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail(
    options?: {
        packageMaterializationExplicitApprovalToken?: Partial<RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
        packageMaterializationApprovalGate?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalGate> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard(
    options?: {
        packageMaterializationApprovalAuditTrail?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail> | null;
        packageMaterializationExplicitApprovalToken?: Partial<RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy(
    options?: {
        packageMaterializationApprovalReplayGuard?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard> | null;
        packageMaterializationExplicitApprovalToken?: Partial<RenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken> | null;
        packageMaterializationApprovalAuditTrail?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy(
    options?: {
        packageMaterializationApprovalExpiryPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy> | null;
        packageMaterializationApprovalReplayGuard?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard> | null;
        packageMaterializationApprovalAuditTrail?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy(
    options?: {
        packageMaterializationApprovalRevocationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy> | null;
        packageMaterializationApprovalExpiryPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy(
    options?: {
        packageMaterializationApprovalScopeBindingPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy> | null;
        packageMaterializationApprovalRevocationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy(
    options?: {
        packageMaterializationApprovalOperatorConfirmationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy> | null;
        packageMaterializationApprovalRevocationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy(
    options?: {
        packageMaterializationApprovalEmergencyStopPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy> | null;
        packageMaterializationApprovalOperatorConfirmationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy(
    options?: {
        packageMaterializationApprovalReadinessVerdictPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy> | null;
        packageMaterializationApprovalEmergencyStopPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy(
    options?: {
        packageMaterializationApprovalExecutionHandoffPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy> | null;
        packageMaterializationApprovalReadinessVerdictPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy(
    options?: {
        packageMaterializationApprovalPostHandoffAuditPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy> | null;
        packageMaterializationApprovalExecutionHandoffPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy(
    options?: {
        packageMaterializationApprovalAuditRetentionPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy> | null;
        packageMaterializationApprovalPostHandoffAuditPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy(
    options?: {
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationApprovalAuditRetentionPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy(
    options?: {
        packageMaterializationApprovalAuditIntegrityPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy(
    options?: {
        packageMaterializationApprovalAuditProvenancePolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy(
    options?: {
        packageMaterializationApprovalAuditCustodyPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy(
    options?: {
        packageMaterializationApprovalAuditEvidencePolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy(
    options?: {
        packageMaterializationApprovalAuditAttestationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy(
    options?: {
        packageMaterializationApprovalAuditNotarizationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy(
    options?: {
        packageMaterializationApprovalAuditCertificationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy(
    options?: {
        packageMaterializationApprovalAuditEndorsementPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy(
    options?: {
        packageMaterializationApprovalAuditCountersignaturePolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy(
    options?: {
        packageMaterializationApprovalAuditCountersignatureVerificationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy(
    options?: {
        packageMaterializationApprovalAuditCountersignatureRevocationPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy(
    options?: {
        packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy;
export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy(
    options?: {
        packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy> | null;
        packageMaterializationApprovalAuditAccessPolicy?: Partial<RenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy> | null;
        packageMaterializationFinalApprovalChecklist?: Partial<RenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist> | null;
    }
): RenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy;
export function createRenderThumbnailRendererServiceClientRequest(
    plan: Partial<RenderThumbnailRendererServicePlan>,
    options?: CreateRenderThumbnailRendererServiceClientRequestOptions
): RenderThumbnailRendererServiceClientRequest;
export function createRenderThumbnailRendererServiceResult(
    plan: RenderThumbnailRendererServicePlan,
    response?: unknown,
    options?: CreateRenderThumbnailRendererServiceResultOptions
): RenderThumbnailRendererServiceResult;
export function createRenderThumbnailRendererServiceErrorPayload(
    plan: RenderThumbnailRendererServicePlan,
    cause?: unknown
): RenderThumbnailRendererServiceErrorPayload;
export function createCommandErrorPayload(
    code: CommandErrorCode | string,
    message: string,
    options?: CreateCommandErrorPayloadOptions
): CommandErrorPayload;
export function createAdapterSelectionError(
    selection: CommandAdapterSelection,
    options?: CreateCommandErrorPayloadOptions
): CommandErrorPayload;
export function selectCommandAdapter(options: SelectCommandAdapterOptions): CommandAdapterSelection;
