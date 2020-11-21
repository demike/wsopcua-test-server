#!/usr/bin/env node

// CHECK OVERRIDDEN METHODS:
/**
    WsOPCUAServer.createEndpoint
    WsOPCUAServer.createEndpointDescription
    OPCUAServerEndpoint._setup_server
    OPCUAServerEndpoint._dump_statistics
 */

import { startControlServer } from "./control-server";
import { Controller } from "./controller";

process.on("uncaughtException", (err) => {
  console.error("There was an uncaught error", err);
  process.exit(1); //mandatory (as per the Node docs)
});

let controller: Controller;

async function main() {
  controller = await startControlServer();
}

main();
