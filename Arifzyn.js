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
import Request from "./models/Request.js";
import Changelog from "./models/Changelog.js";
import PluginUsage from "./models/Plugins.js";
import Transaction from "./models/Transaction.js";

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
        {
          try {
            const start = new Date();

            const os = await import("os");
            const cpuStat = await import("cpu-stat");
            const si = await import("systeminformation");

            const osType = os.type();
            const osRelease = os.release();
            const osArch = os.arch();
            const nodeVersion = process.version;

            const cpuModel = os.cpus()[0].model;
            const cpuSpeed = os.cpus()[0].speed;
            const cpuLoad = await new Promise((resolve, reject) => {
              cpuStat.usagePercent((err, percent) => {
                if (err) reject(err);
                resolve(percent);
              });
            });
            const cpuLoadAverage = os.loadavg();

            const totalMemory = os.totalmem() / 1024 / 1024 / 1024; // GB
            const freeMemory = os.freemem() / 1024 / 1024 / 1024; // GB
            const usedMemory = totalMemory - freeMemory;

            const diskInfo = await si.fsSize();
            const totalStorage =
              diskInfo.reduce((acc, disk) => acc + disk.size, 0) /
              1024 /
              1024 /
              1024; // GB
            const usedStorage =
              diskInfo.reduce((acc, disk) => acc + disk.used, 0) /
              1024 /
              1024 /
              1024; // GB
            const freeStorage = totalStorage - usedStorage;

            const networkInterfaces = os.networkInterfaces();
            const ipAddress = networkInterfaces.eth0
              ? networkInterfaces.eth0[0].address
              : "Tidak diketahui";

            const end = new Date();
            const latency = (end - start) / 1000; // detik

            const serverInfo = `
</> Info </>
- OS: ${osType} (${osRelease})
- Arsitektur: ${osArch}
- Node.js Version: ${nodeVersion}
- IP Address: ${ipAddress}

</> CPU </>
- Model: ${cpuModel}
- Speed: ${cpuSpeed} MHz
- Load: ${cpuLoad.toFixed(2)}%
- Load Average: ${cpuLoadAverage.map((load) => load.toFixed(2)).join(", ")}

</> Memory </>
- Total: ${totalMemory.toFixed(2)} GB
- Used: ${usedMemory.toFixed(2)} GB
- Free: ${freeMemory.toFixed(2)} GB

</> Storage </>
- Total: ${totalStorage.toFixed(1)} GB
- Used: ${usedStorage.toFixed(1)} GB (${((usedStorage / totalStorage) * 100).toFixed(1)}%)
- Free: ${freeStorage.toFixed(1)} GB (${((freeStorage / totalStorage) * 100).toFixed(1)}%)

</> Ping </>
- Latency: ${latency.toFixed(4)} seconds
        `;

            await m.reply(serverInfo);
          } catch (err) {
            await m.reply("Terjadi kesalahan saat mengambil informasi server.");
          }
        }
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

      // Rest API
      case "cekapi":
      case "cekapikey":
        {
          if (!m.text)
            throw `[!] Masukkan apikey.\n\nContoh : ${m.prefix + m.command} YOUR_KEY`;

          try {
            const user = await User.findOne({ apikey: m.text });

            if (!user) throw "Apikey tidak ditemukan.";

            const apikeyInfo = `
</> Apikey Info </>

- Nama: ${user.username}
- Apikey: ${
              user.apikey.length > 2
                ? user.apikey.substring(0, 2) +
                  "*".repeat(user.apikey.length - 2)
                : user.apikey
            }
- Limit: ${user.limit}
- Premium: ${user.premium ? "Ya" : "Tidak"}
- Premium Time: ${new Date(user.premiumTime).toLocaleString()}
- Nomor: ${user.number}
- Verified: ${user.isVerified ? "Ya" : "Tidak"}
       `.trim();

            await m.reply(apikeyInfo);
          } catch (err) {
            throw err.message || err;
          }
        }
        break;

      case "updateapi":
      case "updateapikey":
        {
          if (!m.text)
            throw `[!] Masukkan apikey baru.\n\nContoh : ${m.prefix + m.command} NEW_API_KEY`;

          try {
            const user = await User.findOne({ apikey: m.text.split(" ")[0] });
            if (!user) throw "Apikey tidak ditemukan.";

            const newApiKey = m.text.split(" ")[1];
            user.apikey = newApiKey;
            await user.save();

            await m.reply("Apikey berhasil diperbarui.");
          } catch (err) {
            throw err.message || err;
          }
        }
        break;

      case "delapi":
      case "delapikey":
        {
          if (!m.text)
            throw `[!] Masukkan apikey yang ingin dihapus.\n\nContoh : ${m.prefix + m.command} API_KEY_TO_DELETE`;

          try {
            const result = await User.deleteOne({ apikey: m.text });
            if (result.deletedCount === 0) throw "Apikey tidak ditemukan.";

            await m.reply("Apikey berhasil dihapus.");
          } catch (err) {
            throw err.message || err;
          }
        }
        break;

      case "userinfo":
        {
          if (!m.text)
            throw `[!] Masukkan apikey pengguna.\n\nContoh : ${m.prefix + m.command} API_KEY`;

          try {
            const apikey = m.text.trim();
            const user = await User.findOne({ apikey });

            if (!user) throw "Apikey tidak ditemukan.";

            // Format informasi pengguna
            const userInfo = `
</> Info Pengguna </>

- Nama: ${user.username}
- Email: ${user.email}
- Apikey: ${user.apikey.substring(0, 2) + "*".repeat(user.apikey.length - 2)}
- Limit: ${user.limit}
- Premium: ${user.premium ? "Ya" : "Tidak"}
- Premium Time: ${new Date(user.premiumTime).toLocaleString()}
- Profile: ${user.profile}
- Nomor: ${user.number}
- Verified: ${user.isVerified ? "Ya" : "Tidak"}
        `.trim();

            await m.reply(userInfo);
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "resetlimit":
        {
          if (!m.text)
            throw `[!] Masukkan apikey pengguna.\n\nContoh : ${m.prefix + m.command} API_KEY`;

          try {
            const user = await User.findOne({ apikey: m.text });
            if (!user) throw "Apikey tidak ditemukan.";

            user.limit = 0;
            await user.save();

            await m.reply("Limit pengguna berhasil direset.");
          } catch (err) {
            throw err.message || err;
          }
        }
        break;

      case "premiumstatus":
        {
          if (!m.text)
            throw `[!] Masukkan apikey dan status premium.\n\nContoh : ${m.prefix + m.command} API_KEY STATUS (true/false)`;

          try {
            const [apikey, status] = m.text.split(" ");
            const user = await User.findOne({ apikey });
            if (!user) throw "Apikey tidak ditemukan.";

            user.premium = status.toLowerCase() === "true";
            await user.save();

            await m.reply(
              `Status premium berhasil diperbarui menjadi ${status}`,
            );
          } catch (err) {
            throw err.message || err;
          }
        }
        break;

      case "listtransactions":
        {
          try {
            const transactions = await Transaction.find().sort({
              create_at: -1,
            });
            if (transactions.length === 0)
              throw "Tidak ada transaksi ditemukan.";

            const transactionList = transactions
              .map(
                (t, i) => `
${i + 1}. Kode: ${t.unique_code}
   Email: ${t.email}
   Tanggal: ${new Date(t.create_at).toLocaleString()}
   Status: ${t.status}
   Jumlah: ${t.amount}
   `,
              )
              .join("\n");

            await m.reply(`</> *Daftar Transaksi* </>\n\n${transactionList}`);
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "listplugins":
        {
          try {
            const plugins = await PluginUsage.find();
            if (plugins.length === 0)
              throw "Tidak ada penggunaan plugin ditemukan.";

            const pluginList = plugins
              .map(
                (p, i) => `
${i + 1}. Nama: ${p.name}
   Path: ${p.path}
   Total Request: ${p.totalReq}
   `,
              )
              .join("\n");

            await m.reply(
              `</> *Daftar Penggunaan Plugin* </>\n\n${pluginList}`,
            );
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "listchangelogs":
        {
          try {
            const changelogs = await Changelog.find().sort({ date: -1 });
            if (changelogs.length === 0) throw "Tidak ada changelog ditemukan.";

            const changelogList = changelogs
              .map(
                (c, i) => `
${i + 1}. Tanggal: ${new Date(c.date).toLocaleDateString()}
   Judul: ${c.title}
   Deskripsi: ${c.description}
   `,
              )
              .join("\n");

            await m.reply(`</> *Daftar Changelog* </>\n\n${changelogList}`);
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "listusers":
        {
          try {
            const users = await User.find();
            if (users.length === 0) throw "Tidak ada pengguna ditemukan.";

            const userList = users
              .filter((u) => u.apikey) // Memastikan hanya pengguna dengan apikey yang valid
              .map((u, i) => {
                const hiddenEmail =
                  u.email.length > 2
                    ? u.email.substring(0, 2) + "*".repeat(u.email.length - 2)
                    : u.email;
                const hiddenApikey =
                  u.apikey.length > 2
                    ? u.apikey.substring(0, 2) + "*".repeat(u.apikey.length - 2)
                    : u.apikey;

                return `
${i + 1}. Nama: ${u.username}
   Email: ${hiddenEmail}
   Apikey: ${hiddenApikey}
   Premium: ${u.premium ? "Ya" : "Tidak"}
   Limit: ${u.limit}
   Verified: ${u.isVerified ? "Ya" : "Tidak"}
   `;
              })
              .join("\n");

            if (!userList) throw "Tidak ada pengguna dengan apikey ditemukan.";
            await m.reply(`</> *Daftar Pengguna* </>\n\n${userList}`);
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "addchangelog":
        {
          const [date, title, ...descriptionArr] = m.text.split(" ");
          const description = descriptionArr.join(" ");
          if (!date || !title || !description)
            throw `[!] Format salah. Gunakan: !addchangelog YYYY-MM-DD Judul Deskripsi`;

          try {
            const newChangelog = new Changelog({
              date: new Date(date),
              title,
              description,
            });
            await newChangelog.save();
            await m.reply("Changelog berhasil ditambahkan.");
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "deletetransaction":
        {
          const [uniqueCode] = m.text.split(" ");
          if (!uniqueCode)
            throw `[!] Masukkan unique_code transaksi.\n\nContoh : ${m.prefix + m.command} UNIQUE_CODE`;

          try {
            const result = await Transaction.deleteOne({
              unique_code: uniqueCode,
            });
            if (result.deletedCount === 0) throw "Transaksi tidak ditemukan.";
            await m.reply("Transaksi berhasil dihapus.");
          } catch (err) {
            await m.reply(err.message || err);
          }
        }
        break;

      case "totalrequests":
        {
          try {
            const requestData = await Request.findOne();
            if (!requestData) throw "Data request tidak ditemukan.";

            await m.reply(
              `Total Requests: ${requestData.totalRequests}\nRequests Today: ${requestData.todayRequests}`,
            );
          } catch (err) {
            await m.reply(
              err.message || "Terjadi kesalahan saat mengambil data request.",
            );
          }
        }
        break;

      case "requeststats":
        {
          try {
            const requestData = await Request.findOne();
            if (!requestData || requestData.dailyRequests.length === 0)
              throw "Data request harian tidak ditemukan.";

            const stats = requestData.dailyRequests
              .map(
                (req, i) => `
${i + 1}. Tanggal: ${req.date.toDateString()}
   Total Requests: ${req.total}`,
              )
              .join("\n");

            await m.reply(`</> *Statistik Permintaan Harian* </>\n\n${stats}`);
          } catch (err) {
            await m.reply(
              err.message ||
                "Terjadi kesalahan saat mengambil statistik request harian.",
            );
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
    client.logger.error(err);
    m.reply(util.format(err));
  }
}

// Watch for file changes and reload module
fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(`Update ${__filename}`);
  import(__filename);
});
