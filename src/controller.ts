import { WsOPCUAServer } from "./ws/ws-opcua-server";
import {
  AccessLevelFlag,
  BaseNode,
  coerceNodeId,
  DataType,
  Namespace,
  NodeIdLike,
  StatusCodes,
  Variant,
  VariantArrayType,
} from "node-opcua";
import { NodeSetLoader } from "node-opcua-address-space/dist/source/loader/load_nodeset2";
import { nodesets } from "node-opcua-nodesets";
import { startTestServer } from "./test-server";
import { EventEmitter } from "events";
import { promises as fsPromises } from "fs";

interface UANamespace extends Namespace {
  _nodeid_index: { [key: string]: BaseNode };
  dispose(): void;
}

/**
 * emits following events:
 * 'test-server-started' : WsOPCUAServer
 * 'test-server-stopped': WsOPCUAServer
 */
export class Controller extends EventEmitter {
  private testServer?: WsOPCUAServer;
  private lifecycleQueue: Promise<unknown> = Promise.resolve();
  public nodesetMap = new Map<string, string>([
    ["http://opcfoundation.org/UA/DI/", nodesets.di],
  ]);
  constructor(private controlServer: WsOPCUAServer, private namespace: number) {
    super();
    this.init();
  }

  protected init() {
    const ns = this.controlServer.engine.addressSpace?.getNamespace(
      this.namespace
    );

    const obj = ns?.addObject({
      organizedBy: this.controlServer.engine.addressSpace?.rootFolder.objects,
      browseName: "Controller",
      nodeId: coerceNodeId("s=Controller", this.namespace),
    });

    // expose supported test namespaces
    const varSupportedTestNamespaces = ns?.addVariable({
      browseName: "supportedTestNamespaces",
      nodeId: coerceNodeId("s=Controller.supportedTestNamespaces", 1),
      accessLevel: AccessLevelFlag.CurrentRead,
      dataType: DataType.String,
      valueRank: 1,
      value: new Variant({
        value: Array.from(this.nodesetMap.keys()),
        dataType: DataType.String,
        arrayType: VariantArrayType.Array,
      }),
      propertyOf: obj,
    });

    // start test server method

    const methodStartTestServer = ns?.addMethod(obj!, {
      browseName: "startTestServer",
      nodeId: coerceNodeId("s=Controller.startTestServer", 1),
      inputArguments: [
        { name: "namespaces", dataType: DataType.String, valueRank: 1 },
      ],
    });

    methodStartTestServer?.bindMethod(
      async (inputArguments, _context, callback) => {
        if (
          (inputArguments[0].value as Array<string>).some(
            (value) => !this.nodesetMap.has(value)
          )
        ) {
          // unknown namespace
          callback(
            new Error("namespace must be one of: " + this.nodesetMap.keys()),
            { statusCode: StatusCodes.BadInvalidArgument }
          );
        } else {
          const nsFiles = (inputArguments[0].value as Array<
            string
          >).map((namespace) => this.nodesetMap.get(namespace)) as string[];
          try {
            await this.startTestServer(nsFiles);
            callback(null, { statusCode: StatusCodes.Good });
          } catch (err) {
            console.log("failed to start test server", err);
            callback(err as Error, { statusCode: StatusCodes.BadInternalError });
          }
        }
      }
    );

    // stop test server method

    const methodStopTestServer = ns?.addMethod(obj!, {
      browseName: "stopTestServer",
      nodeId: coerceNodeId("s=Controller.stopTestServer", 1),
    });

    methodStopTestServer?.bindMethod(
      async (inputArguments, _context, callback) => {
        await this.stopTestServer();
        console.log("test server shut down");
        callback(null, { statusCode: StatusCodes.Good });
      }
    );

    // reload namespace method

    const methodReloadNamespace = ns?.addMethod(obj!, {
      browseName: "reloadNamespace",
      nodeId: coerceNodeId("s=Controller.reloadNamespace", 1),
      inputArguments: [{ name: "namespaceUri", dataType: DataType.String }],
    });

    methodReloadNamespace?.bindMethod((inputArguments, _context, callback) => {
      if (inputArguments.length !== 1) {
        throw new Error("invalid argument count");
      }

      this.reloadNamespace(inputArguments[0].value);
      callback(null, { statusCode: StatusCodes.Good });
    });
  }

  public async startTestServer(namespaces: string[]) {
    return this.enqueueLifecycle(async () => {
      // Always tear down any previous instance first. Reusing an existing
      // server (the old `if (!this.testServer)` guard) or starting a new one
      // while a previous instance is still shutting down races on the shared
      // endpoint port (4445): a test session could connect to a half
      // torn-down / half started server and observe a missing address space.
      await this.disposeTestServer();
      this.testServer = await startTestServer(namespaces);
      this.emit("test-server-started", this.testServer);
      return this.testServer;
    });
  }

  public async stopTestServer() {
    return this.enqueueLifecycle(() => this.disposeTestServer());
  }

  /**
   * Serialises test-server lifecycle operations (start/stop) so they can never
   * overlap. The e2e clients issue a stop immediately followed by a start (and
   * different test files do so back-to-back); without serialisation the stop's
   * `shutdown()` can still be in flight when the next start binds the endpoint.
   */
  private enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.lifecycleQueue.then(operation, operation);
    // Keep the chain alive regardless of the outcome, without leaking the
    // rejection to an unhandled-rejection handler.
    this.lifecycleQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async disposeTestServer() {
    const testServer = this.testServer;
    this.testServer = undefined;
    if (testServer) {
      await testServer.shutdown();
      this.emit("test-server-stopped", undefined);
    }
  }

  public reloadNamespace(namespaceUri: string) {
    const index = this.deleteNamespace(namespaceUri);
    if (index >= 0) {
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
    if (!addressSpace) {
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

    const namespace: UANamespace = addressSpace?.getNamespace(
      namespaceUri
    ) as UANamespace;
    if (!namespace) {
      return -1;
    }

    for (const node of Object.values(namespace._nodeid_index)) {
      if (node.addressSpace) {
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
    nsArray.splice(index, 1);
    return index;
  }

  public async loadNamespace(namespaceUri: string, index: number) {
    const addressSpace = this.testServer?.engine.addressSpace; // AddressSpace.create();
    if (!addressSpace) {
      return;
    }

    const loader = new NodeSetLoader(addressSpace as any);
    try {
      // node-opcua removed the public `readNodeSet2XmlFile` helper and
      // `NodeSetLoader.addNodeSet(xml, cb)` is now `addNodeSetAsync(xml)`.
      const xmlFile = await fsPromises.readFile(
        this.nodesetMap.get(namespaceUri) as string,
        "utf-8"
      );
      await loader.addNodeSetAsync(xmlFile);
    } catch (err) {
      console.error(err);
      return;
    }

    const nsarray = addressSpace.getNamespaceArray();

    const newNamespace = nsarray.pop()!;
    addressSpace.getNamespaceArray().splice(index, 0, newNamespace);

    newNamespace.index = index;

    (addressSpace as any).suspendBackReference = false;
    const nodes: BaseNode[] = Object.values(
      (newNamespace as any)._nodeid_index
    );
    for (const node of nodes) {
      node.propagate_back_references();
    }
    for (const node of nodes) {
      node.install_extra_properties();
    }
  }
}
