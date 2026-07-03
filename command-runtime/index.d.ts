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
