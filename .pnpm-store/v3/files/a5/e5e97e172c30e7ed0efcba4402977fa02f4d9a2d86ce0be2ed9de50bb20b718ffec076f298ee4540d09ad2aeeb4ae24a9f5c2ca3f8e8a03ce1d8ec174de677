"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataConnectEmulatorClient = exports.DataConnectEmulator = exports.dataConnectEmulatorEvents = void 0;
const childProcess = require("child_process");
const events_1 = require("events");
const api_1 = require("../api");
const constants_1 = require("./constants");
const downloadableEmulators_1 = require("./downloadableEmulators");
const types_1 = require("./types");
const error_1 = require("../error");
const emulatorLogger_1 = require("./emulatorLogger");
const types_2 = require("../dataconnect/types");
const portUtils_1 = require("./portUtils");
const registry_1 = require("./registry");
const logger_1 = require("../logger");
const load_1 = require("../dataconnect/load");
const pgliteServer_1 = require("./dataconnect/pgliteServer");
const controller_1 = require("./controller");
const utils_1 = require("../utils");
exports.dataConnectEmulatorEvents = new events_1.EventEmitter();
class DataConnectEmulator {
    constructor(args) {
        this.args = args;
        this.usingExistingEmulator = false;
        this.logger = emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.DATACONNECT);
        this.emulatorClient = new DataConnectEmulatorClient();
    }
    async start() {
        var _a, _b, _c, _d;
        let resolvedConfigDir;
        try {
            resolvedConfigDir = this.args.config.path(this.args.configDir);
            const info = await DataConnectEmulator.build({ configDir: resolvedConfigDir });
            if ((0, types_2.requiresVector)(info.metadata)) {
                if (constants_1.Constants.isDemoProject(this.args.projectId)) {
                    this.logger.logLabeled("WARN", "Data Connect", "Detected a 'demo-' project, but vector embeddings require a real project. Operations that use vector_embed will fail.");
                }
                else {
                    this.logger.logLabeled("WARN", "Data Connect", "Operations that use vector_embed will make calls to production Vertex AI");
                }
            }
        }
        catch (err) {
            this.logger.log("DEBUG", `'fdc build' failed with error: ${err.message}`);
        }
        const info = await (0, load_1.load)(this.args.projectId, this.args.config, this.args.configDir);
        const dbId = ((_a = info.dataConnectYaml.schema.datasource.postgresql) === null || _a === void 0 ? void 0 : _a.database) || "postgres";
        const serviceId = info.dataConnectYaml.serviceId;
        await (0, downloadableEmulators_1.start)(types_1.Emulators.DATACONNECT, {
            auto_download: this.args.auto_download,
            listen: (0, portUtils_1.listenSpecsToString)(this.args.listen),
            config_dir: resolvedConfigDir,
            enable_output_schema_extensions: this.args.enable_output_schema_extensions,
            enable_output_generated_sdk: this.args.enable_output_generated_sdk,
        });
        this.usingExistingEmulator = false;
        if (this.args.autoconnectToPostgres) {
            const pgPort = (_b = this.args.postgresListen) === null || _b === void 0 ? void 0 : _b[0].port;
            const pgHost = (_c = this.args.postgresListen) === null || _c === void 0 ? void 0 : _c[0].address;
            let connStr = (0, api_1.dataConnectLocalConnString)();
            if ((0, api_1.dataConnectLocalConnString)()) {
                this.logger.logLabeled("INFO", "Data Connect", `FIREBASE_DATACONNECT_POSTGRESQL_STRING is set to ${(0, api_1.dataConnectLocalConnString)()} - using that instead of starting a new database`);
            }
            else if (pgHost && pgPort) {
                const pgServer = new pgliteServer_1.PostgresServer(dbId, "postgres");
                const server = await pgServer.createPGServer(pgHost, pgPort);
                const connectableHost = (0, utils_1.connectableHostname)(pgHost);
                connStr = `postgres://${connectableHost}:${pgPort}/${dbId}?sslmode=disable`;
                server.on("error", (err) => {
                    if (err instanceof error_1.FirebaseError) {
                        this.logger.logLabeled("ERROR", "Data Connect", `${err}`);
                    }
                    else {
                        this.logger.logLabeled("ERROR", "Data Connect", `Postgres threw an unexpected error, shutting down the Data Connect emulator: ${err}`);
                    }
                    void (0, controller_1.cleanShutdown)();
                });
                this.logger.logLabeled("INFO", "Data Connect", `Started up Postgres server, listening on ${(_d = server.address()) === null || _d === void 0 ? void 0 : _d.toString()}`);
            }
            await this.connectToPostgres(new URL(connStr), dbId, serviceId);
        }
        return;
    }
    async connect() {
        const emuInfo = await this.emulatorClient.getInfo();
        if (!emuInfo) {
            this.logger.logLabeled("ERROR", "Data Connect", "Could not connect to Data Connect emulator. Check dataconnect-debug.log for more details.");
            return Promise.reject();
        }
        return Promise.resolve();
    }
    async stop() {
        if (this.usingExistingEmulator) {
            this.logger.logLabeled("INFO", "Data Connect", "Skipping cleanup of Data Connect emulator, as it was not started by this process.");
            return;
        }
        return (0, downloadableEmulators_1.stop)(types_1.Emulators.DATACONNECT);
    }
    getInfo() {
        return {
            name: this.getName(),
            listen: this.args.listen,
            host: this.args.listen[0].address,
            port: this.args.listen[0].port,
            pid: (0, downloadableEmulators_1.getPID)(types_1.Emulators.DATACONNECT),
            timeout: 10000,
        };
    }
    getName() {
        return types_1.Emulators.DATACONNECT;
    }
    static async generate(args) {
        const commandInfo = await (0, downloadableEmulators_1.downloadIfNecessary)(types_1.Emulators.DATACONNECT);
        const cmd = [
            "--logtostderr",
            "-v=2",
            "generate",
            `--config_dir=${args.configDir}`,
            `--connector_id=${args.connectorId}`,
        ];
        if (args.watch) {
            cmd.push("--watch");
        }
        const res = childProcess.spawnSync(commandInfo.binary, cmd, { encoding: "utf-8" });
        logger_1.logger.info(res.stderr);
        if (res.error) {
            throw new error_1.FirebaseError(`Error starting up Data Connect generate: ${res.error.message}`, {
                original: res.error,
            });
        }
        if (res.status !== 0) {
            throw new error_1.FirebaseError(`Unable to generate your Data Connect SDKs (exit code ${res.status}): ${res.stderr}`);
        }
        return res.stdout;
    }
    static async build(args) {
        var _a;
        const commandInfo = await (0, downloadableEmulators_1.downloadIfNecessary)(types_1.Emulators.DATACONNECT);
        const cmd = ["--logtostderr", "-v=2", "build", `--config_dir=${args.configDir}`];
        const res = childProcess.spawnSync(commandInfo.binary, cmd, { encoding: "utf-8" });
        if (res.error) {
            throw new error_1.FirebaseError(`Error starting up Data Connect build: ${res.error.message}`, {
                original: res.error,
            });
        }
        if (res.status !== 0) {
            throw new error_1.FirebaseError(`Unable to build your Data Connect schema and connectors (exit code ${res.status}): ${res.stderr}`);
        }
        if (res.stderr) {
            emulatorLogger_1.EmulatorLogger.forEmulator(types_1.Emulators.DATACONNECT).log("DEBUG", res.stderr);
        }
        try {
            return JSON.parse(res.stdout);
        }
        catch (err) {
            throw new error_1.FirebaseError(`Unable to parse 'fdc build' output: ${(_a = res.stdout) !== null && _a !== void 0 ? _a : res.stderr}`);
        }
    }
    async connectToPostgres(connectionString, database, serviceId) {
        if (!connectionString) {
            const msg = `No Postgres connection found. The Data Connect emulator will not be able to execute operations.`;
            throw new error_1.FirebaseError(msg);
        }
        const MAX_RETRIES = 3;
        for (let i = 1; i <= MAX_RETRIES; i++) {
            try {
                this.logger.logLabeled("DEBUG", "Data Connect", `Connecting to ${connectionString}}...`);
                connectionString.toString();
                await this.emulatorClient.configureEmulator({
                    connectionString: connectionString.toString(),
                    database,
                    serviceId,
                    maxOpenConnections: 1,
                });
                this.logger.logLabeled("DEBUG", "Data Connect", `Successfully connected to ${connectionString}}`);
                return true;
            }
            catch (err) {
                if (i === MAX_RETRIES) {
                    throw err;
                }
                this.logger.logLabeled("DEBUG", "Data Connect", `Retrying connectToPostgress call (${i} of ${MAX_RETRIES} attempts): ${err}`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        return false;
    }
}
exports.DataConnectEmulator = DataConnectEmulator;
class DataConnectEmulatorClient {
    constructor() {
        this.client = undefined;
    }
    async configureEmulator(body) {
        var _a, _b;
        if (!this.client) {
            this.client = registry_1.EmulatorRegistry.client(types_1.Emulators.DATACONNECT);
        }
        try {
            const res = await this.client.post("emulator/configure", body);
            return res;
        }
        catch (err) {
            if (err.status === 500) {
                throw new error_1.FirebaseError(`Data Connect emulator: ${(_b = (_a = err === null || err === void 0 ? void 0 : err.context) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.message}`);
            }
            throw err;
        }
    }
    async getInfo() {
        if (!this.client) {
            this.client = registry_1.EmulatorRegistry.client(types_1.Emulators.DATACONNECT);
        }
        return getInfo(this.client);
    }
}
exports.DataConnectEmulatorClient = DataConnectEmulatorClient;
async function getInfo(client) {
    try {
        const res = await client.get("emulator/info");
        return res.body;
    }
    catch (err) {
        return;
    }
}
