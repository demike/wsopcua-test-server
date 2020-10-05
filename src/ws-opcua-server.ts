import { getFullyQualifiedDomainName, OPCUAServer, OPCUAServerEndPoint, OPCUAServerOptions } from "node-opcua";
import { TransportType, OPCUAWsServerEndPoint, OPCUAWsServerEndpointOptions, OPCUAWsSecureServerEndPoint } from "./server-endpoint";

export interface WsOPCUAServerOptions extends OPCUAServerOptions {
    transportType: TransportType
    alternateEndpoints?: OPCUAWsServerEndpointOptions[];
}

// @ts-ignore
export class WsOPCUAServer extends OPCUAServer {

    private getTransportConstructor(transportType: TransportType) {
        switch(transportType){
          case TransportType.TCP:
            return OPCUAServerEndPoint;
          case TransportType.WEBSOCKET:
            return OPCUAWsServerEndPoint;
          case TransportType.WEBSOCKET_SECURE:
            return OPCUAWsSecureServerEndPoint;
        }
      }


    protected createEndpoint(port1: number,transportType: TransportType, serverOptions: OPCUAServerOptions) {
  
     // add the tcp/ip endpoint with no security, a ws endpoint or a wss endpoint
     let transportConstructor = this.getTransportConstructor(transportType);

     const endPoint = new transportConstructor({
 
       port: port1,
 
       certificateManager: this.serverCertificateManager,
 
       certificateChain: this.getCertificateChain(),
       privateKey: this.getPrivateKey(),
 
       defaultSecureTokenLifetime: serverOptions.defaultSecureTokenLifetime || 600000,
       timeout: serverOptions.timeout || 3 * 60 * 1000,
 
       maxConnections: this.maxConnectionsPerEndpoint,
       // @ts-ignore
       objectFactory: this.objectFactory,
       serverInfo: this.serverInfo
     });
     return endPoint;
    }




    protected createEndpointDescriptions(serverOption: WsOPCUAServerOptions, endpointOptions: OPCUAWsServerEndpointOptions) {

    
    /* istanbul ignore next */
    if (!endpointOptions) {
      throw new Error("internal error");
    }
    var hostname = getFullyQualifiedDomainName();
    endpointOptions.hostname = endpointOptions.hostname || hostname;
    endpointOptions.port = endpointOptions.port || 26543;

    /* istanbul ignore next */
    if (!endpointOptions.hasOwnProperty("port") || !isFinite(endpointOptions.port!) || typeof endpointOptions.port !== "number") {
      throw new Error("expecting a valid port (number)");
    }

    const port = Number(endpointOptions.port || 0);

    endpointOptions.transportType = endpointOptions.transportType || TransportType.TCP;
                
    const endPoint = this.createEndpoint(port, endpointOptions.transportType, serverOption);

    endpointOptions.alternateHostname = endpointOptions.alternateHostname || [];
    const alternateHostname = (endpointOptions.alternateHostname instanceof Array) ? endpointOptions.alternateHostname : [endpointOptions.alternateHostname];
    const allowAnonymous = (endpointOptions.allowAnonymous === undefined) ? true : !!endpointOptions.allowAnonymous;

    endPoint.addStandardEndpointDescriptions({
      allowAnonymous,
      securityModes: endpointOptions.securityModes,
      securityPolicies: endpointOptions.securityPolicies,

      hostname: endpointOptions.hostname,
      alternateHostname,

      disableDiscovery: !!endpointOptions.disableDiscovery,
      // xx                hostname,
      resourcePath: serverOption.resourcePath || ""
    });
    return endPoint;
  }

}