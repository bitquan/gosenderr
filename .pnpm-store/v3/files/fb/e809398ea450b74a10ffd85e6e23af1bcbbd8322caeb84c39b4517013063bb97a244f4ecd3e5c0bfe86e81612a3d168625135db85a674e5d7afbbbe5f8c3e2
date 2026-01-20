"use strict";
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PGliteExtendedQueryPatch = exports.PostgresServer = void 0;
const pglite_1 = require("@electric-sql/pglite");
const { dynamicImport } = require(true && "../../dynamicImport");
const net = require("node:net");
const index_1 = require("./pg-gateway/index");
const node_1 = require("./pg-gateway/platforms/node");
const logger_1 = require("../../logger");
class PostgresServer {
    async createPGServer(host = "127.0.0.1", port) {
        const db = await this.getDb();
        await db.waitReady;
        const server = net.createServer(async (socket) => {
            const connection = await (0, node_1.fromNodeSocket)(socket, {
                serverVersion: "16.3 (PGlite 0.2.0)",
                auth: { method: "trust" },
                async onMessage(data, { isAuthenticated }) {
                    if (!isAuthenticated) {
                        return;
                    }
                    const result = await db.execProtocolRaw(data);
                    return extendedQueryPatch.filterResponse(data, result);
                },
            });
            const extendedQueryPatch = new PGliteExtendedQueryPatch(connection);
            socket.on("end", () => {
                logger_1.logger.debug("Postgres client disconnected");
            });
            socket.on("error", (err) => {
                server.emit("error", err);
            });
        });
        const listeningPromise = new Promise((resolve) => {
            server.listen(port, host, () => {
                resolve();
            });
        });
        await db.waitReady;
        await listeningPromise;
        return server;
    }
    async getDb() {
        if (this.db) {
            return this.db;
        }
        const vector = (await dynamicImport("@electric-sql/pglite/vector")).vector;
        const uuidOssp = (await dynamicImport("@electric-sql/pglite/contrib/uuid_ossp")).uuid_ossp;
        return pglite_1.PGlite.create({
            username: this.username,
            database: this.database,
            debug: 0,
            extensions: {
                vector,
                uuidOssp,
            },
        });
    }
    constructor(database, username) {
        this.username = username;
        this.database = database;
    }
}
exports.PostgresServer = PostgresServer;
class PGliteExtendedQueryPatch {
    constructor(connection) {
        this.connection = connection;
        this.isExtendedQuery = false;
    }
    filterResponse(message, response) {
        return __asyncGenerator(this, arguments, function* filterResponse_1() {
            var _a, e_1, _b, _c;
            const pipelineStartMessages = [
                index_1.FrontendMessageCode.Parse,
                index_1.FrontendMessageCode.Bind,
                index_1.FrontendMessageCode.Close,
            ];
            if (pipelineStartMessages.includes(message[0])) {
                this.isExtendedQuery = true;
            }
            if (message[0] === index_1.FrontendMessageCode.Sync) {
                this.isExtendedQuery = false;
                return yield __await(this.connection.createReadyForQuery());
            }
            try {
                for (var _d = true, _e = __asyncValues((0, index_1.getMessages)(response)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a;) {
                    _c = _f.value;
                    _d = false;
                    try {
                        const message = _c;
                        if (message[0] === index_1.BackendMessageCode.ErrorMessage) {
                            this.isExtendedQuery = false;
                        }
                        if (this.isExtendedQuery && message[0] === index_1.BackendMessageCode.ReadyForQuery) {
                            logger_1.logger.debug("Filtered out a ReadyForQuery.");
                            continue;
                        }
                        yield yield __await(message);
                    }
                    finally {
                        _d = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
}
exports.PGliteExtendedQueryPatch = PGliteExtendedQueryPatch;
