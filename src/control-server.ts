import * as opcua from 'ws-node-opcua/packages/node-opcua';
import { TransportType, OPCUAServer } from 'ws-node-opcua/packages/node-opcua';

function construct_control_address_space(server: OPCUAServer) {


    const addressSpace = server.engine.addressSpace;
    if(!addressSpace) {
        throw new Error("missing address space");
    }
    const namespace = addressSpace.getOwnNamespace();

    // declare a new object
   // _"add a new object into the objects folder"

    // add some variables
   // _"add some variables"
}

export async function startControlServer() {
    const server = new opcua.OPCUAServer({
        port: 4840,
        alternateEndpoints: [{
            transportType: TransportType.WEBSOCKET,
            port: 4444
        }],
        resourcePath: "",
        buildInfo: {
            productName: "wsopcua-test-server",
            buildNumber: "1",
            buildDate: new Date(Date.now())
        }
    });
    
    await server.initialize();
    console.log("control server initialized");
    construct_control_address_space(server);
    
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port)
    });
    
}

