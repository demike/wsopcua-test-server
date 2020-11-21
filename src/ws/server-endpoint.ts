// import * as chalk from 'chalk';
const chalk = require("chalk");
import { IncomingMessage } from "http";
import {
  assert,
  EndpointDescriptionParams,
  MessageSecurityMode,
  OPCUAServerEndPoint,
  OPCUAServerEndpointOptions,
  SecurityPolicy,
  ServerSecureChannelLayer,
} from "node-opcua";
import { toPem } from "node-opcua-crypto";
import * as ws from "ws";
import * as https from "https";
import { WebSocketSocketWrapper } from "./websocket-socket-wrapper";
import { make_debugLog } from "node-opcua-debug";
import { Socket } from "net";

const debugLog = make_debugLog(__filename);

function extractSocketData(socket: Socket, reason: string) {
  const {
    bytesRead,
    bytesWritten,
    remoteAddress,
    remoteFamily,
    remotePort,
    localAddress,
    localPort,
  } = socket;
  return {
    bytesRead,
    bytesWritten,
    localAddress,
    localPort,
    remoteAddress,
    remoteFamily,
    remotePort,
    timestamp: new Date(),
  };
}

export enum TransportType {
  TCP,
  WEBSOCKET,
  WEBSOCKET_SECURE,
}

export interface OPCUAWsServerEndpointOptions
  extends OPCUAServerEndpointOptions {
  transportType: TransportType;
}

// @ts-ignore // ignore overriding the type of _server
export class OPCUAWsServerEndPoint extends OPCUAServerEndPoint {
  protected _server?: ws.Server;
  protected _started: boolean = false;
  protected _channels: { [key: string]: ServerSecureChannelLayer } = {};

  private _setup_server(): void {
    // nothing to do
  }

  private _dump_statistics() {
    const self = this;
    debugLog(
      chalk.cyan("CONCURRENT CONNECTION = "),
      self._server!.clients.size
    );

    debugLog(chalk.cyan("MAX CONNECTIONS = "), self._server!.getMaxListeners());
  }

  public protocolName() {
    return "opc.ws";
  }

  public listen(callback: (err?: Error | undefined) => void): void {
    assert(typeof callback === "function");
    assert(!this._started, "OPCUAWSServerEndPoint is already listening");
    assert(!this._server);

    this._server = this.createWSServer();

    this._server.setMaxListeners(this.maxConnections + 1); // plus one extra

    // like net.Server
    (this._server as any).maxConnections = this._server.getMaxListeners();

    // @ts-ignore private access
    this._listen_callback = callback;

    this._server
      .on("connection", (socket: WebSocket, request: IncomingMessage) => {
        /*
            if (doDebug) {
                this._dump_statistics();
                debugLog("server connected with : " +
                  request.socket.remoteAddress + ":" + request.socket.remotePort);
            }
            */
        // @ts-ignore private access
        this._on_client_connection(new WebSocketSocketWrapper(socket), request);
      })
      .on("close", () => {
        debugLog("server closed : all connections have ended");
      })
      .on("error", (err: Error) => {
        debugLog(chalk.red.bold(" error") + " port = " + this.port, err);
        this._started = false;
        // @ts-ignore private access
        this._end_listen(err);
      })
      .on("listening", () => {
        debugLog("server is listening");
        // @ts-ignore private access
        this._end_listen();
      });

    this._started = true;
  }

  protected createWSServer() {
    const wsserver = new ws.Server({
      port: this.port,
      verifyClient: (info: {
        origin: string;
        secure: boolean;
        req: IncomingMessage;
      }) => this._verifyClient(info),
    });

    return wsserver;
  }

  protected _verifyClient(info: {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
  }): boolean {
    if (!this._started) {
      debugLog(
        chalk.bgWhite.cyan(
          "OPCUAWsServerEndPoint#_on_client_connection " +
            "SERVER END POINT IS PROBABLY SHUTTING DOWN !!! - Connection is refused"
        )
      );
      return false;
    }

    const nbConnections = Object.keys(this._channels).length;
    debugLog(
      " nbConnections ",
      nbConnections,
      " self._server.maxListeners",
      this._server!.getMaxListeners(),
      this.maxConnections
    );
    if (nbConnections >= this.maxConnections) {
      console.log(
        chalk.bgWhite.cyan(
          "OPCUAServerEndPoint#_on_client_connection " +
            "The maximum number of connection has been reached - Connection is refused"
        )
      );
      const reason = "maxConnections reached (" + this.maxConnections + ")";
      const socketData = extractSocketData(info.req.socket, reason);
      this.emit("connectionRefused", socketData);

      return false;
    }

    return true;
  }

  public addEndpointDescription(
    securityMode: MessageSecurityMode,
    securityPolicy: SecurityPolicy,
    options?: EndpointDescriptionParams
  ): void {
    super.addEndpointDescription(securityMode, securityPolicy, options);
    const endpoints = this.endpointDescriptions();
    const ep = endpoints[endpoints.length - 1];
    if (ep.endpointUrl) {
      const endpointUrl = ep.endpointUrl.replace(
        "opc.tcp",
        this.protocolName()
      );
      (ep as any).__defineGetter__("endpointUrl", () => endpointUrl);
    }
  }
}

export class OPCUAWsSecureServerEndPoint extends OPCUAWsServerEndPoint {
  protected createWSServer() {
    const pemCert = toPem(this.getCertificate(), "CERTIFICATE");
    const httpServer = https.createServer({
      cert: pemCert,
      key: this.getPrivateKey(),
    });
    const wsserver = new ws.Server({
      // port: this.port,
      verifyClient: (info: {
        origin: string;
        secure: boolean;
        req: IncomingMessage;
      }) => this._verifyClient(info),
      server: httpServer,
    });
    httpServer.listen(this.port);
    return wsserver;
  }

  public protocolName() {
    return "opc.wss";
  }
}
