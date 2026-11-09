import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sqlite3.verbose();

const dbPath = path.join(__dirname, "usuarios.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar con SQLite:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite:", dbPath);
  }
});

// Crea las tablas en orden y expone una promesa para esperar a que estén listas
export const ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creando tabla usuarios:", err.message);
          reject(err);
        }
      }
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS cuentas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'usuario',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creando tabla cuentas:", err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
});

export default db;
