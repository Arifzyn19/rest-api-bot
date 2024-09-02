import "dotenv/config";

const config = {
  pairingNumber: process.env.PAIRING_NUMBER,
  owner: JSON.parse(process.env.OWNER || "[]"), // Menggunakan JSON.parse untuk mengubah string menjadi array
  autoRestart: process.env.AUTO_RESTART, // Ukuran RAM yang tersisa sebelum auto restart
  self: process.env.SELF === "true", // Mengonversi string ke boolean
  writeStore: process.env.WRITE_STORE === "true", // Mengonversi string ke boolean
  sessionName: process.env.SESSION_NAME,
  mongoUrl: process.env.MONGO_URL,
  stickerPack: {
    name: process.env.packname || "Default Packname",
    publisher: process.env.packPublish || "Default Publisher",
  },
};

export default config;
