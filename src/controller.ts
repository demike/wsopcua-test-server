import { WsOPCUAServer } from "./ws/ws-opcua-server.js";
import {
  AccessLevelFlag,
  coerceNodeId,
  DataType,
  generateAddressSpaceRaw,
  nodesets,
  NodeIdLike,
  StatusCodes,
  Variant,
  VariantArrayType,
} from "node-opcua";
import { startTestServer } from "./test-server.js";
import { EventEmitter } from "events";
import { promises as fsPromises } from "fs";

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

  public async reloadNamespace(namespaceUri: string) {
    if (this.deleteNamespace(namespaceUri)) {
      await this.loadNamespace(namespaceUri);
    }
  }

  /**
   * Empties the namespace, keeping it registered under the same index and uri
   * so it can be populated again (see AddressSpace#deleteNamespace).
   * @returns false if there is no test server or no such namespace
   */
  private deleteNamespace(namespaceUri: string): boolean {
    const addressSpace = this.testServer?.engine.addressSpace;
    if (!addressSpace?.getNamespace(namespaceUri)) {
      return false;
    }
    addressSpace.deleteNamespace(namespaceUri);
    return true;
  }

  public async loadNamespace(namespaceUri: string) {
    const addressSpace = this.testServer?.engine.addressSpace;
    if (!addressSpace) {
      return;
    }

    try {
      // Public loader API. Since node-opcua 2.187 it treats required models
      // that are already registered (e.g. namespace 0) as satisfied, and
      // reuses an emptied namespace, so one nodeset can be (re)loaded into the
      // running server. It also propagates the back references.
      await generateAddressSpaceRaw(
        addressSpace,
        this.nodesetMap.get(namespaceUri) as string,
        (xmlFile) => fsPromises.readFile(xmlFile, "utf-8"),
        {}
      );
    } catch (err) {
      console.error(err);
    }
  }
}
