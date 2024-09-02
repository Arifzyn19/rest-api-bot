import config from "./config/config.js";
import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import { exec } from "child_process";
import baileys from "@whiskeysockets/baileys";
import connectDB from "./config/database.js";

const {
  delay,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  makeInMemoryStore,
  jidNormalizedUser,
  PHONENUMBER_MCC,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
} = baileys;

import treeKill from "./lib/tree-kill.js";
import serialize, { Client } from "./lib/serialize.js";

// Logger setup
const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
}).child({ class: "client" });
logger.level = "fatal";

// Global variables
const usePairingCode = config.pairingNumber;
const store = makeInMemoryStore({ logger });

// Menghubungkan ke MongoDB
connectDB();

const startSock = async () => {
  // Auth and WA version setup
  const { state, saveCreds } = await useMultiFileAuthState(
    `./${config.sessionName}`,
  );
  const { version, isLatest } = await fetchLatestWaWebVersion();
  console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

  // Client setup
  const client = baileys.default({
    version: [2, 3000, 1015901307],
    logger,
    printQRInTerminal: !usePairingCode,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: true,
    retryRequestDelayMs: 10,
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
    maxMsgRetryCount: 15,
    appStateMacVerification: {
      patch: true,
      snapshot: true,
    },
    getMessage: async (key) => {
      const jid = jidNormalizedUser(key.remoteJid);
      const msg = await store.loadMessage(jid, key.id);
      return msg?.message || "";
    },
  });

  store.bind(client.ev);
  await Client({ hisoka: client, store });

  // Pairing code logic
  if (usePairingCode && !client.authState.creds.registered) {
    let phoneNumber = usePairingCode.replace(/[^0-9]/g, "");
    if (!Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))) {
      throw "Start with your country's WhatsApp code, Example: 62xxx";
    }
    await delay(3000);
    let code = await client.requestPairingCode(phoneNumber);
    console.log(`\x1b[32m${code?.match(/.{1,4}/g)?.join("-") || code}\x1b[39m`);
  }

  // Connection updates
  client.ev.on("connection.update", (update) => {
    const { lastDisconnect, connection } = update;

    if (connection) client.logger.info(`Connection Status : ${connection}`);
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      switch (reason) {
        case DisconnectReason.badSession:
          client.logger.info("Bad Session File, Restart Required");
          startSock();
          break;
        case DisconnectReason.connectionClosed:
          client.logger.info("Connection Closed, Restart Required");
          startSock();
          break;
        case DisconnectReason.connectionLost:
          client.logger.info("Connection Lost from Server, Reconnecting...");
          startSock();
          break;
        case DisconnectReason.connectionReplaced:
          client.logger.info("Connection Replaced, Restart Required");
          startSock();
          break;
        case DisconnectReason.restartRequired:
          client.logger.info("Restart Required, Restarting...");
          startSock();
          break;
        case DisconnectReason.loggedOut:
          client.logger.error("Device has Logged Out, please rescan...");
          client.end();
          fs.rmSync(`./${config.sessionName}`, {
            recursive: true,
            force: true,
          });
          exec("npm run stop:pm2", (err) => {
            if (err) return treeKill(process.pid);
          });
          break;
        case DisconnectReason.multideviceMismatch:
          client.logger.error(
            "Need Multi Device Version, please update and rescan...",
          );
          client.end();
          fs.rmSync(`./${config.sessionName}`, {
            recursive: true,
            force: true,
          });
          exec("npm run stop:pm2", (err) => {
            if (err) return treeKill(process.pid);
          });
          break;
        default:
          client.logger.error("Unknown issue occurred, restarting...");
          startSock();
      }
    }

    if (connection === "open") {
      client.logger.info("Connecting Success...");
    }
  });

  // Event handlers
  client.ev.on("creds.update", saveCreds);

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          ...(store.contacts?.[id] || {}),
          ...contact,
        };
    }
  });

  client.ev.on("contacts.upsert", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = { ...contact, isContact: true };
    }
  });

  client.ev.on("groups.update", (updates) => {
    for (const update of updates) {
      const id = update.id;
      if (store.groupMetadata[id]) {
        store.groupMetadata[id] = {
          ...(store.groupMetadata[id] || {}),
          ...update,
        };
      }
    }
  });

  // Message upsert handler
  client.ev.on("messages.upsert", async ({ messages }) => {
    if (!messages[0].message) return;
    let m = await serialize(client, messages[0], store);

    if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) {
      store.groupMetadata = await client.groupFetchAllParticipating();
    }

    if (config.self && !m.isOwner) return;

    await (
      await import(`./Arifzyn.js?v=${Date.now()}`)
    ).default(client, store, m);
  });

  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);
};

startSock();
