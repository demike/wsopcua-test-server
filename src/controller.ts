import { WsOPCUAServer } from "./ws/ws-opcua-server";
import { AccessLevelFlag, BaseNode, coerceNodeId, DataType, Namespace, readNodeSet2XmlFile, StatusCodes, Variant, VariantArrayType } from "node-opcua";
import { NodeSetLoader } from 'node-opcua-address-space/dist/source/loader/load_nodeset2';
import { nodesets } from 'node-opcua-nodesets';
import { startTestServer } from "./test-server";

interface UANamespace extends Namespace {
    _nodeid_index: { [key: string]: BaseNode };
    dispose(): void;
}

export class Controller {
    private testServer?: WsOPCUAServer;
    public nodesetMap= new Map<string,string>([
        ['http://opcfoundation.org/UA/DI/', nodesets.di]

    ]);
    constructor(private controlServer: WsOPCUAServer, private namespace: number) {
        this.init();
    }

    protected init() {
        const ns = this.controlServer.engine.addressSpace?.getNamespace(this.namespace);
        
        const obj = ns?.addObject({
            organizedBy: this.controlServer.engine.addressSpace?.rootFolder.objects,
            browseName: "Controller",
            nodeId: coerceNodeId("s=Controller", this.namespace)
        })

        // expose supported test namespaces
        const varSupportedTestNamespaces = ns?.addVariable({
            browseName: "supportedTestNamespaces",
            nodeId: coerceNodeId("s=Controller.supportedTestNamespaces",1),
            accessLevel: AccessLevelFlag.CurrentRead,
            dataType: DataType.String,
            valueRank: 1,
            value: new Variant({
                value: Array.from(this.nodesetMap.keys()),
                dataType: DataType.String,
                arrayType: VariantArrayType.Array
            }),
            propertyOf: obj    
        })

        // start test server method

        const methodStartTestServer= ns?.addMethod(obj!, {
            browseName: "startTestServer",
            nodeId: coerceNodeId("s=Controller.startTestServer", 1),
            inputArguments: [{name: 'namespaces', dataType: DataType.String, valueRank: 1}]
        });
            
        methodStartTestServer?.bindMethod( async (inputArguments, _context, callback) => {

            if ((inputArguments[0].value as Array<string>).some(value => !this.nodesetMap.has(value))) {
                // unknown namespace 
                callback(new Error("namespace must be one of: " + this.nodesetMap.keys()), {statusCode: StatusCodes.BadInvalidArgument});

            } else {
                const nsFiles = (inputArguments[0].value as Array<string>).map(namespace => this.nodesetMap.get(namespace)) as string[];
                await this.startTestServer(nsFiles);
                    
                callback(null, {statusCode: StatusCodes.Good});
            }
          
        })
    

        // stop test server method

        const methodStopTestServer= ns?.addMethod(obj!, {
            browseName: "stopTestServer",
            nodeId: coerceNodeId("s=Controller.stopTestServer", 1),
        });
        
        methodStopTestServer?.bindMethod( async (inputArguments, _context, callback) => {

            await this.stopTestServer();
            console.log("test server shut down");
            callback(null, {statusCode: StatusCodes.Good});

        })


        // reload namespace method

        const methodReloadNamespace = ns?.addMethod(obj!, {
            browseName: "reloadNamespace",
            nodeId: coerceNodeId("s=Controller.reloadNamespace", 1),
            inputArguments: [{name: 'namespaceUri', dataType: DataType.String}]
        });
        
        methodReloadNamespace?.bindMethod( (inputArguments, _context, callback) => {
            if(inputArguments.length !== 1) {
                throw new Error("invalid argument count");
            } 

            this.reloadNamespace(inputArguments[0].value);
            callback(null, {statusCode: StatusCodes.Good});
        })
    }

    public async startTestServer(namespaces: string[]) {
        this.testServer = await startTestServer(namespaces);
    }

    public stopTestServer() {
        const testServer = this.testServer;
        this.testServer = undefined;
        return testServer?.shutdown();
    }

    public reloadNamespace(namespaceUri: string) {
        const index = this.deleteNamespace(namespaceUri);
        if(index >= 0) {
        this.loadNamespace(namespaceUri, index);
        }
    }

    /**
     * 
     * @param namespaceUri 
     * @returns the namespace index of the deleted namespace (-1 if not found)
     */
    private deleteNamespace(namespaceUri: string) {
        const addressSpace = this.testServer?.engine.addressSpace;
        if(!addressSpace) {
            return -1;
        }
/*
        const namespaces = makeNodeId(ObjectIds.Server_Namespaces);
        const namespacesNode = addressSpace.findNode(namespaces) as UAObject;
        const namespaceNode = namespacesNode.getChildByName(namespaceUri)
        if(namespaceNode) {
            addressSpace.deleteNode(namespaceNode);
        }
*/

        const namespace: UANamespace = addressSpace?.getNamespace(namespaceUri) as UANamespace;
        if(!namespace) {
            return -1;
        }
        
        for (const node of Object.values(namespace._nodeid_index)) {
            if(node.addressSpace) { 
                try {
                namespace.deleteNode(node);
                
                } catch (e) {
                    //(node as any).dispose();
                    console.log(e);
                }

            }
        }

        (namespace as any).dispose();
        const index = namespace.index;

       

      
        
        const nsArray = addressSpace.getNamespaceArray();
        nsArray.splice(index,1);
        return index;
    }

    public loadNamespace(namespaceUri: string, index: number) {
        const addressSpace = this.testServer?.engine.addressSpace;// AddressSpace.create();
        if(!addressSpace) {
            return;
        }
        
        const loader = new NodeSetLoader(addressSpace as any);
        readNodeSet2XmlFile(this.nodesetMap.get(namespaceUri) as string, (err, xmlFile) => {
            if(err) {
                console.error(err);
                return
            }
            if(!xmlFile) {
                return;
            }
            loader.addNodeSet(xmlFile, (err) => {
                if(err) {
                    console.error(err);
                }

                const nsarray = addressSpace.getNamespaceArray();
                
                const newNamespace = nsarray.pop()!;
                addressSpace.getNamespaceArray().splice(index,0,newNamespace);

                newNamespace.index = index;

                (addressSpace as any).suspendBackReference = false
                const nodes: BaseNode[] = Object.values((newNamespace as any)._nodeid_index);
                for (const node of nodes) {
                    node.propagate_back_references();
                }
                for (const node of nodes) {
                    node.install_extra_properties();
                }

            });

            
 
            
        })

    }
}