
import { AddressSpace, generateAddressSpace } from 'node-opcua';
import { TransportType } from './ws/server-endpoint';
import { WsOPCUAServer } from './ws/ws-opcua-server';
import { nodesets } from 'node-opcua-nodesets';




async function construct_test_address_space(server: WsOPCUAServer) {

    const addressSpace = AddressSpace.create();
    await generateAddressSpace(addressSpace,[nodesets.standard, nodesets.di] );
    server.engine.addressSpace = addressSpace;
    // declare a new object
   // _"add a new object into the objects folder"

    // add some variables
   // _"add some variables"
}


/**
 * a list of nodeset file names (excluding the standard nodes / namespace)
 * @param nodeSetFileNames 
 */
export async function startTestServer(nodeSetFileNames: string[]) {
    const server = new WsOPCUAServer({
        port: 4841,
        alternateEndpoints: [{
            transportType: TransportType.WEBSOCKET,
            port: 4445
        } as any],
        resourcePath: "",
        buildInfo: {
            productName: "wsopcua-test-server",
            productUri: "wsopcua-test-server",
            buildNumber: "1",
            buildDate: new Date(Date.now())
        },
        serverInfo: {
            applicationUri: "wsopcua-test-server",
        },
        nodeset_filename: [nodesets.standard, ...nodeSetFileNames]
    });
    
    
    
    await server.initialize();
    // await construct_test_address_space(server);
    
    console.log("control server initialized");
    
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port)
    });
    return server;
    
}

