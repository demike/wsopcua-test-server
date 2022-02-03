import { EventEmitter } from "ws";
import * as net from 'net'

export class WebSocketSocketWrapper implements net.Socket {
    write(str: Uint8Array | string, encoding?: string, cb?: (err?: Error) => void): boolean;
    write(str: Uint8Array | string, cb?: (err?: Error) => void): boolean;
    write(str: any, encoding?: any, cb?: any) {
        this.webSocket.send(str);
        return false;
    }


    connect(options: net.SocketConnectOpts, connectionListener?: () => void): this;
    connect(port: number, host: string, connectionListener?: () => void): this;
    connect(port: number, connectionListener?: () => void): this;
    connect(path: string, connectionListener?: () => void): this;
    connect(port: any, host?: any, connectionListener?: any) {
        throw new Error('Method not implemented.');
        return this;
    }
    setEncoding(encoding?: string): this {
        throw new Error('Method not implemented.');
    }
    pause(): this {
 //       this.webSocket._socket.pause();
        return this;
    }
    resume(): this {
 //       this.webSocket._socket.resume();
        return this;
    }
    setTimeout(timeout: number, callback?: () => void): this {
       // TODO: check if we should set this
//       this.webSocket._socket.setTimeout(timeout,callback);
       return this;
    }
    setNoDelay(noDelay?: boolean): this {
        // TODO: check if we should set this
 //       this.webSocket._socket.setNoDelay(noDelay);
        return this;
    }
    setKeepAlive(enable?: boolean, initialDelay?: number): this {
        throw new Error('Method not implemented.');
    }
    address() {
       return this.webSocket._socket.address();
    }
    unref() {
        throw new Error('Method not implemented.');
        return this;
    }
    ref() {
        throw new Error('Method not implemented.');
        return this;
    }
    
    get bufferSize() {
        return this.webSocket.bufferedAmount;

    }
    
    get bytesWritten() {
        return this.webSocket._socket.bytesWritten;
    }

    get connecting() {
        return this.webSocket._socket.connecting;
    }
    get destroyed() {
        return this.webSocket._socket.destroyed;
    }
    get localAddress() {
        return this.webSocket._socket.localAddress;
    }
    get localPort() {
        return this.webSocket._socket.localPort;
    }
    get remoteAddress() {
        return this.webSocket._socket.remoteAddress;
    }
    get remoteFamily() {
        return this.webSocket._socket.remoteFamily;
    }
    get remotePort() {
        return this.webSocket._socket.remotePort;
    }
    end(cb?: () => void): this;
    end(buffer: string | Uint8Array, cb?: () => void): this;
    end(str: string | Uint8Array, encoding?: string, cb?: () => void): this;
    end(str?: any, encoding?: any, cb?: any): this {
        this.webSocket.close();
        return this;
    }

    addListener(event: string, listener: (...args: any[]) => void): this;
    addListener(event: 'close', listener: (had_error: boolean) => void): this;
    addListener(event: 'connect', listener: () => void): this;
    addListener(event: 'data', listener: (data: Buffer) => void): this;
    addListener(event: 'drain', listener: () => void): this;
    addListener(event: 'end', listener: () => void): this;
    addListener(event: 'error', listener: (err: Error) => void): this;
    addListener(event: 'lookup', listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    addListener(event: 'timeout', listener: () => void): this;
    addListener(event: any, listener: any) {
        switch(event) {
            case 'data':
                this.webSocket.addEventListener('message', (evt) => {
                    listener(evt.data);
                });
                break;
            case 'close': 
                //TODO: removeEventListener fails for this
                this.webSocket.addEventListener('close', (evt) => {
                    listener(!evt.wasClean);
                });
                break;
            case 'error':
                //TODO: removeEventListener fails for this
                this.webSocket.addEventListener('error', (evt: Event) => {
                    listener( (evt as ErrorEvent).error);
                })
                break;
            case 'connect':
                this.webSocket.addEventListener('open', listener);
                break;
            case 'end':
                this.webSocket._socket.addListener('end',listener);
                break;
            default:
                this.webSocket.addListener(event, listener);
                break;

        }
        return this;
    }


    emit(event: string | symbol, ...args: any[]): boolean
    {
        return this.webSocket.emit(event, ...args);
    }

    on(event: string, listener: (...args: any[]) => void): this;
    on(event: 'close', listener: (had_error: boolean) => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'drain', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'lookup', listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: any, listener: any) {
        return this.addListener(event, listener);
    }
    once(event: string, listener: (...args: any[]) => void): this;
    once(event: 'close', listener: (had_error: boolean) => void): this;
    once(event: 'connect', listener: () => void): this;
    once(event: 'data', listener: (data: Buffer) => void): this;
    once(event: 'drain', listener: () => void): this;
    once(event: 'end', listener: () => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
    once(event: 'lookup', listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    once(event: 'timeout', listener: () => void): this;
    once(event: any, listener: any) {
        throw new Error('Method not implemented.');
        return this;
    }
    prependListener(event: string, listener: (...args: any[]) => void): this;
    prependListener(event: 'close', listener: (had_error: boolean) => void): this;
    prependListener(event: 'connect', listener: () => void): this;
    prependListener(event: 'data', listener: (data: Buffer) => void): this;
    prependListener(event: 'drain', listener: () => void): this;
    prependListener(event: 'end', listener: () => void): this;
    prependListener(event: 'error', listener: (err: Error) => void): this;
    prependListener(event: 'lookup', listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    prependListener(event: 'timeout', listener: () => void): this;
    prependListener(event: any, listener: any) {
        throw new Error('Method not implemented.');
        return this;
    }

    prependOnceListener(event: string, listener: (...args: any[]) => void): this;
    prependOnceListener(event: 'close', listener: (had_error: boolean) => void): this;
    prependOnceListener(event: 'connect', listener: () => void): this;
    prependOnceListener(event: 'data', listener: (data: Buffer) => void): this;
    prependOnceListener(event: 'drain', listener: () => void): this;
    prependOnceListener(event: 'end', listener: () => void): this;
    prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    prependOnceListener(event: 'lookup', listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    prependOnceListener(event: 'timeout', listener: () => void): this;
    prependOnceListener(event: any, listener: any) {
        throw new Error('Method not implemented.');
        return this;
    }

    get writable() {
        return this.webSocket._socket.writable;
    }
    get writableEnded() {
        return this.webSocket._socket.writableEnded;
    }
    get writableFinished() {
        return this.webSocket._socket.writableFinished;
    }
    get writableHighWaterMark() {
        return this.webSocket._socket.writableHighWaterMark;
    }
    get writableLength() {
        return this.webSocket._socket.writableLength;
    }
    get writableObjectMode() {
        return this.webSocket._socket.writableObjectMode;
    }
    get readable() {
        return this.webSocket._socket.readable;
    };
    get readableEncoding() {
        return this.webSocket._socket.readableEncoding;
    }    
    get readableEnded() {
        return this.webSocket._socket.readableEnded;
    }
    get readableFlowing() {
        return this.webSocket._socket.readableFlowing;
    }
    get readableHighWaterMark() {
        return this.webSocket._socket.readableHighWaterMark;
    }
    get readableLength() {
        return this.webSocket._socket.readableLength;
    }
    get readableObjectMode() {
        return this.webSocket._socket.readableObjectMode;
    }
    get bytesRead() {
        return this.webSocket._socket.bytesRead;
    }
    get writableCorked(): number {
        return this.webSocket._socket.writableCorked;
    }

    get allowHalfOpen(): boolean {
        return this.webSocket._socket.allowHalfOpen;
    }
    set allowHalfOpen(allow: boolean) {
        this.webSocket._socket.allowHalfOpen = allow;
    }

    get readableAborted(): boolean {
        return this.webSocket._socket.readableAborted;
    }

    get readableDidRead(): boolean {
        return this.webSocket._socket.readableDidRead;
    }

    _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
        throw new Error('Method not implemented.');
    }
    _destroy(error: Error | null, callback: (error: Error | null) => void): void {
        throw new Error('Method not implemented.');
    }
    _final(callback: (error?: Error | null) => void): void {
        throw new Error('Method not implemented.');
    }
    setDefaultEncoding(encoding: string): this {
        throw new Error('Method not implemented.');
    }
    cork(): void {
        throw new Error('Method not implemented.');
    }
    uncork(): void {
        throw new Error('Method not implemented.');
    }
 
    _read(size: number): void {
        throw new Error('Method not implemented.');
    }
    read(size?: number) {
        throw new Error('Method not implemented.');
    }
    isPaused(): boolean {
        return this.webSocket._socket.isPaused();
    }
    unpipe(destination?: NodeJS.WritableStream): this {
        throw new Error('Method not implemented.');
    }
    unshift(chunk: any, encoding?: BufferEncoding): void {
        throw new Error('Method not implemented.');
    }
    wrap(oldStream: NodeJS.ReadableStream): this {
        throw new Error('Method not implemented.');
    }
    push(chunk: any, encoding?: string): boolean {
        throw new Error('Method not implemented.');
    }
    destroy(error?: Error): this {
        // TODO: check if we should use net.socket.destroy instead
        this.webSocket.close();
        return this;
    }
    removeListener(event: 'close', listener: () => void): this;
    removeListener(event: 'data', listener: (chunk: any) => void): this;
    removeListener(event: 'end', listener: () => void): this;
    removeListener(event: 'readable', listener: () => void): this;
    removeListener(event: 'error', listener: (err: Error) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: any, listener: any) {
        // TODO: implement it symmetrically to the the addListener !!!
        this.webSocket.removeListener(event, listener);
        return this;
    }

    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean | undefined; }): T {
        throw new Error('Method not implemented.');
    }

    off(event: string | symbol, listener: (...args: any[]) => void): this {
        this.removeListener(event, listener);
        return this;
    }
    removeAllListeners(event?: string | symbol): this {
        this.webSocket.removeAllListeners(event);
        return this;
    }
    setMaxListeners(n: number): this {
        throw new Error('Method not implemented.');
    }
    getMaxListeners(): number {
        return this.webSocket._socket.getMaxListeners();
    }
    listeners(event: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    rawListeners(event: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    eventNames(): (string | symbol)[] {
        throw new Error('Method not implemented.');
    }
    listenerCount(type: string | symbol): number {
        throw new Error('Method not implemented.');
    }

    webSocket: WebSocket & EventEmitter & { _socket: net.Socket};
    constructor(websocket: WebSocket) {
        this.webSocket = websocket as any;
    }
    
    [Symbol.asyncIterator](): AsyncIterableIterator<any> {
        throw new Error("Method not implemented.");
    }
}
