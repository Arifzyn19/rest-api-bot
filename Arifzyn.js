import config from "./config/config.js";

import { delay, jidNormalizedUser } from "@whiskeysockets/baileys";
import util from "util";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import * as Func from "./lib/function.js";
import Color from "./lib/color.js";
import serialize, { getContentType } from "./lib/serialize.js";

import User from "./models/User.js";

// Konversi __filename untuk ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extractCaseNames = (filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const regex = /case\s+"([^"]+)":/g;
    const caseNames = [];
    let match;

    while ((match = regex.exec(fileContent)) !== null) {
      caseNames.push(match[1]);
    }

    return caseNames;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
};

// Perintah-case yang ada
export default async function message(client, store, m) {
  try {
    // Handle quoted message and download media
    let quoted = m.isQuoted ? m.quoted : m;
    let downloadM = async (filename) =>
      await client.downloadMediaMessage(quoted, filename);
    let isCommand = (m.prefix && m.body.startsWith(m.prefix)) || false;

    // Ignore messages from the bot
    if (m.isBot) return;

    // Log message details
    if (m.message && !m.isBot) {
      console.log(
        Color.cyan("Dari"),
        Color.cyan(client.getName(m.from)),
        Color.blueBright(m.from),
      );
      console.log(
        Color.yellowBright("Chat"),
        Color.yellowBright(
          m.isGroup
            ? `Grup (${m.sender} : ${client.getName(m.sender)})`
            : "Pribadi",
        ),
      );
      console.log(
        Color.greenBright("Pesan :"),
        Color.greenBright(m.body || m.type),
      );
    }

    // Handle commands
    switch (isCommand ? m.command.toLowerCase() : false) {
      case "menu":
        const filePath = path.resolve(__dirname, "Arifzyn.js");
        const caseNames = extractCaseNames(filePath);

        const sortedCaseNames = caseNames.sort((a, b) => a.localeCompare(b));
        const botMenu = `</> *Menu Bot* </>

${sortedCaseNames.map((name, index) => `${index + 1}. !${name}`).join("\n")}

Copyright © 2024 ArifzynAPI
  `.trim();
        await m.reply(botMenu);
        break;

      case "ping":
        const start = new Date();
        await m.reply("Pong!");
        const end = new Date();
        m.reply(`Speed: ${end - start}ms`);
        break;

      case "echo":
        const textToEcho = m.body.slice(6).trim(); // Menghapus "!echo " dari perintah
        if (!textToEcho) return m.reply("Mohon masukkan teks untuk diulang.");
        m.reply(textToEcho);
        break;

      case "info":
        await m.reply(
          "Ini adalah informasi tentang bot. Untuk menu lengkap, gunakan perintah !menu.",
        );
        break;

      case "help":
        if (m.body.startsWith("!help")) {
          const command = m.body.split(" ")[1];
          if (command === "menu") {
            await m.reply(botMenu);
          } else {
            // Tambahkan deskripsi detail tentang perintah lain jika diperlukan
            await m.reply(`Tidak ada deskripsi untuk perintah ${command}.`);
          }
        }
        break;

      default:
        // eval
        if (
          [">", "eval", "=>"].some((a) =>
            m.command.toLowerCase().startsWith(a),
          ) &&
          m.isOwner
        ) {
          let evalCmd = "";
          try {
            evalCmd = /await/i.test(m.text)
              ? eval("(async() => { " + m.text + " })()")
              : eval(m.text);
          } catch (e) {
            evalCmd = e;
          }
          new Promise((resolve, reject) => {
            try {
              resolve(evalCmd);
            } catch (err) {
              reject(err);
            }
          })
            ?.then((res) => m.reply(util.format(res)))
            ?.catch((err) => m.reply(util.format(err)));
        }

        // exec
        if (
          ["$", "exec"].some((a) => m.command.toLowerCase().startsWith(a)) &&
          m.isOwner
        ) {
          try {
            exec(m.text, async (err, stdout) => {
              if (err) return m.reply(util.format(err));
              if (stdout) return m.reply(util.format(stdout));
            });
          } catch (e) {
            await m.reply(util.format(e));
          }
        }
        break;
    }
  } catch (err) {
    m.reply(util.format(err));
  }
}

// Watch for file changes and reload module
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
