import { AccessLevelFlag, coerceNodeId, DataType, ExpandedNodeId, NodeId, StatusCodes, Variant } from "node-opcua";
import { WsOPCUAServer } from "./ws/ws-opcua-server";

export class NodeManager {
    public testServer?: WsOPCUAServer;
    constructor(private controlServer: WsOPCUAServer, private namespace: number) {
        this.init();
    }

    protected init() {
        const ns = this.controlServer.engine.addressSpace?.getNamespace(this.namespace);
        
        const obj = ns?.addObject({
            organizedBy: this.controlServer.engine.addressSpace?.rootFolder.objects,
            browseName: "NodeManager",
            nodeId: coerceNodeId("s=NodeManager", this.namespace)
        })

        // start test server method

        const methodAddObject= ns?.addMethod(obj!, {
            browseName: "addObject",
            nodeId: coerceNodeId("s=NodeManager.addObject", 1),
            inputArguments: [
                {name: 'nodeId', dataType: DataType.NodeId },
                {name: 'browseName', dataType: DataType.String },
                {name: 'parent', dataType: DataType.NodeId},
               
            ]
        });
            
        methodAddObject?.bindMethod( async (inputArguments, _context, callback) => {

            const nodeId: NodeId | ExpandedNodeId = inputArguments[0].value;
            const browseName: string = inputArguments[1].value;
            const parent: NodeId = inputArguments[2].value;

            const targetNs = this.testServer?.engine.addressSpace?.getNamespace( (nodeId as ExpandedNodeId).namespaceUri ?? nodeId.namespace);


            const obj = targetNs?.addObject({
                organizedBy: parent,
                browseName,
                nodeId
            })

            if(obj) {
                callback(null, { statusCode: StatusCodes.Good })
            } else {
                callback(new Error("failed to create object '" + nodeId + "' on parent '" + parent + "'" ), { statusCode: StatusCodes.BadInvalidArgument} );
            }
          
        })

        const methodAddVariable = ns?.addMethod(obj!, {
            browseName: "addVariable",
            nodeId: coerceNodeId("s=NodeManager.addVariable", 1),
            inputArguments: [
                {name: 'nodeId', dataType: DataType.NodeId },
                {name: 'browseName', dataType: DataType.String },
                {name: 'parent', dataType: DataType.NodeId},
                {name: 'value', dataType: DataType.Variant}
               
            ]
        });
            
        methodAddVariable?.bindMethod( async (inputArguments, _context, callback) => {

            const nodeId: NodeId | ExpandedNodeId = inputArguments[0].value;
            const browseName: string = inputArguments[1].value;
            const parent: NodeId = inputArguments[2].value;
            const value: Variant = inputArguments[4];

            const targetNs = this.testServer?.engine.addressSpace?.getNamespace( (nodeId as ExpandedNodeId).namespaceUri ?? nodeId.namespace);


            const variable = ns?.addVariable({
                browseName,
                nodeId,
                accessLevel: AccessLevelFlag.CurrentWrite | AccessLevelFlag.CurrentWrite,
                valueRank: 1,
                value,
                propertyOf: parent   
            })

            if(variable) {
                callback(null, { statusCode: StatusCodes.Good })
            } else {
                callback(new Error(`failed to create object '${nodeId}' on parent '${parent}' with value '${value}'` ), { statusCode: StatusCodes.BadInvalidArgument} );
            }
          
        })
    

    }


}