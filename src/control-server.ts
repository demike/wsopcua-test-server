import { Controller } from "./controller";
import { NodeManager } from "./node-manager";
import { TransportType } from "./ws/server-endpoint";
import { WsOPCUAServer } from "./ws/ws-opcua-server";

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

export async function startControlServer() {
  const controlServer = new WsOPCUAServer({
    port: 4840,
    alternateEndpoints: [
      {
        transportType: TransportType.WEBSOCKET,
        port: 4444,
      } as any,
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
