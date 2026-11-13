import { AddressSpace, generateAddressSpace, nodesets, UAVariable } from "node-opcua";
import { TransportType } from "./ws/server-endpoint.js";
import { WsOPCUAServer } from "./ws/ws-opcua-server.js";
import { UserManager } from "./user-manager.js";
import { DEFAULT_MAX_ALLOWED_SESSION_NUMBER } from "./server-options.js";
import * as path from 'path';

async function adjust_address_space(server: WsOPCUAServer) {
  // reduce the minimum sampling interval of CurrentTime from 1000 to 50 to possibly speed up tests
  const currentTimeNode = server.engine.addressSpace
    ?.getDefaultNamespace()
    .findNode("i=2258") as UAVariable;
  currentTimeNode.minimumSamplingInterval = 50;
}

/**
 * a list of nodeset file names (excluding the standard nodes / namespace)
 * @param nodeSetFileNames
 */
export async function startTestServer(nodeSetFileNames: string[]) {
  const server = new WsOPCUAServer({
    port: 4841,
    userManager: new UserManager(),
    alternateEndpoints: [
      {
        transportType: TransportType.WEBSOCKET,
        port: 4445,
      } as any,
    ],
    resourcePath: "",
    buildInfo: {
      productName: "wsopcua-test-server",
      productUri: "wsopcua-test-server",
      buildNumber: "1",
      buildDate: new Date(Date.now()),
    },
    serverInfo: {
      applicationUri: "wsopcua-test-server",
    },
    nodeset_filename: [nodesets.standard, ...nodeSetFileNames],
    serverCapabilities: {
      maxSessions: DEFAULT_MAX_ALLOWED_SESSION_NUMBER,
      minSupportedSampleRate: 10,
    },
    certificateFile: path.join(import.meta.dirname,'./assets/certificate.pem'),
    privateKeyFile: path.join(import.meta.dirname,'./assets/private_key.pem')
  });

  await server.initialize();
  adjust_address_space(server);

  console.log("test server initialized");

  try {
    await server.start();
    console.log("Test Server is now listening ... ( press CTRL+C to stop)");
    console.log("port ", server.endpoints[0].port);
  } catch(err) {
    console.log("failed to start test server !");
    console.log(err);
    // Release any partially-acquired resources (e.g. a bound endpoint) so a
    // retry can rebind the port, then surface the failure to the caller
    // instead of returning a server that is not actually listening.
    await server.shutdown().catch(() => undefined);
    throw err;
  }
  
  return server;
}
