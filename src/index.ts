#!/usr/bin/env node


// CHECK OVERRIDDEN METHODS:
/**
    WsOPCUAServer.createEndpoint
    WsOPCUAServer.createEndpointDescription
    OPCUAServerEndpoint._setup_server
    OPCUAServerEndpoint._dump_statistics
 */

import {startControlServer} from './control-server';

startControlServer();