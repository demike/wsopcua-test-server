import { Controller } from "./controller.js";
import { NodeManager } from "./node-manager.js";
import { UserManager } from "./user-manager.js";
import { TransportType } from "./ws/server-endpoint.js";
import { WsOPCUAServer } from "./ws/ws-opcua-server.js";
import { DEFAULT_MAX_ALLOWED_SESSION_NUMBER } from "./server-options.js";

function construct_control_address_space(controlServer: WsOPCUAServer) {
  const controller = new Controller(controlServer, 1);

  const nodeManager = new NodeManager(controlServer, 1);
  controller.on(
    "test-server-started",
    (testServer) => (nodeManager.testServer = testServer)
  );
  controller.on(
    "test-server-stopped",
    (testServer) => (nodeManager.testServer = undefined)
  );

  return controller;

  // (namespace as any).dispose();
  // declare a new object
  // _"add a new object into the objects folder"

  // add some variables
  // _"add some variables"
}

export async function startControlServer(userManager?: UserManager) {
  const controlServer = new WsOPCUAServer({
    port: 4840,
    userManager,
    alternateEndpoints: [
      {
        transportType: TransportType.WEBSOCKET,
        port: 4444,
      },
    ],
    resourcePath: "",
    buildInfo: {
      productName: "wsopcua-control-server",
      buildNumber: "1",
      buildDate: new Date(Date.now()),
    },
    serverInfo: {
      applicationUri: "wsopcua-control-server",
    },
    serverCapabilities: {
      maxSessions: DEFAULT_MAX_ALLOWED_SESSION_NUMBER,
      minSupportedSampleRate: 10,
    },
  });

  await controlServer.initialize();
  console.log("control server initialized");
  const controller = construct_control_address_space(controlServer);

  controlServer.start(function (err?: Error) {
    if (err) {
      console.log("failed to start server !");
      console.log(err);
    } else {
      console.log("Server is now listening ... ( press CTRL+C to stop)");
      console.log("port ", controlServer.endpoints[0].port);
    }
  } as any);

  return controller;
}
