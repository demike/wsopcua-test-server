import {
  DiskCertificateKeyPairProvider,
  OPCUAServer,
  OPCUAServerEndPoint,
  OPCUAServerOptions,
  OpaqueCertificateKeyPairProvider,
  ResolvedCertificateKeyPairProvider,
} from "node-opcua";
import {
  TransportType,
  OPCUAWsServerEndPoint,
  OPCUAWsServerEndpointOptions,
  OPCUAWsSecureServerEndPoint,
} from "./server-endpoint.js";

export interface WsOPCUAServerOptions extends OPCUAServerOptions {
  transportType?: TransportType;
  alternateEndpoints?: OPCUAWsServerEndpointOptions[];
}

// The overridden createEndpoint/createEndpointDescriptions are private in
// node-opcua's typings.
// @ts-ignore
export class WsOPCUAServer extends OPCUAServer {
  /** transport type of the endpoint currently being created, see createEndpointDescriptions */
  private pendingTransportType?: TransportType;

  constructor(options: WsOPCUAServerOptions) {
    super(options);
  }

  /**
   * node-opcua builds every endpoint through the private
   * `createEndpointDescriptions(serverOptions, endpointOptions)`, which calls
   * `createEndpoint(port, serverOptions)` without the endpoint options. Let the
   * upstream implementation do all the endpoint description work and only
   * remember the requested transport so createEndpoint can pick the class.
   */
  protected createEndpointDescriptions(
    serverOptions: WsOPCUAServerOptions,
    endpointOptions: OPCUAWsServerEndpointOptions
  ): OPCUAServerEndPoint {
    this.pendingTransportType =
      endpointOptions.transportType ?? TransportType.TCP;
    try {
      // @ts-ignore private in node-opcua's typings
      return super.createEndpointDescriptions(serverOptions, endpointOptions);
    } finally {
      this.pendingTransportType = undefined;
    }
  }

  /**
   * Mirrors node-opcua's OPCUAServer#createEndpoint (2.187), but instantiates
   * the WebSocket endpoint classes for WEBSOCKET / WEBSOCKET_SECURE.
   */
  protected createEndpoint(
    port: number,
    serverOptions: OPCUAServerOptions
  ): OPCUAServerEndPoint {
    const transportType = this.pendingTransportType ?? TransportType.TCP;
    if (transportType === TransportType.TCP) {
      // @ts-ignore private in node-opcua's typings
      return super.createEndpoint(port, serverOptions);
    }
    const EndPoint =
      transportType === TransportType.WEBSOCKET_SECURE
        ? OPCUAWsSecureServerEndPoint
        : OPCUAWsServerEndPoint;

    // Same provider choice as upstream: a per-endpoint disk provider, unless
    // the server's key is passphrase-resolved or opaque (HSM/KMS), which
    // cannot be rebuilt from files.
    const serverProvider = this.getProvider();
    const certificateKeyPairProvider =
      serverProvider instanceof ResolvedCertificateKeyPairProvider ||
      serverProvider instanceof OpaqueCertificateKeyPairProvider
        ? serverProvider
        : new DiskCertificateKeyPairProvider(
            this.certificateFile,
            this.privateKeyFile
          );

    return new EndPoint({
      port,
      host: serverOptions.host,
      reusePort: serverOptions.reusePort,
      certificateManager: this.serverCertificateManager,
      certificateKeyPairProvider,
      defaultSecureTokenLifetime:
        serverOptions.defaultSecureTokenLifetime || 600000,
      timeout: serverOptions.timeout || 3 * 60 * 1000,
      maxConnections: this.maxConnectionsPerEndpoint,
      // @ts-ignore private in node-opcua's typings
      objectFactory: this.objectFactory,
      serverInfo: this.serverInfo,
      transportSettings: serverOptions.transportSettings,
    }) as unknown as OPCUAServerEndPoint;
  }
}
