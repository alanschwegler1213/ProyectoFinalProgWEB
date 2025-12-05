import { readFile } from "fs/promises";
import bcrypt from "bcrypt";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    console.log("🔄 Iniciando migración de datos...");
    
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM usuarios", [], function (err) {
        if (err) {
          console.error("❌ Error limpiando la tabla de usuarios:", err.message);
          reject(err);
        } else {
          console.log("🧹 Tabla 'usuarios' limpiada.");
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM cuentas", [], function (err) {
        if (err) {
          console.error("❌ Error limpiando la tabla de cuentas:", err.message);
          reject(err);
        } else {
          console.log("🧹 Tabla 'cuentas' limpiada.");
          resolve();
        }
      });
    });

    const dataFilePath = path.join(__dirname, "datos.json");
    const jsonData = await readFile(dataFilePath, "utf-8");
    const usuarios = JSON.parse(jsonData);
    
    console.log(`📊 Encontrados ${usuarios.length} usuarios en datos.json`);
    
    let insertados = 0;
    if (usuarios.length > 0) {
      for (const usuario of usuarios) {
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO usuarios (name, email) VALUES (?, ?)",
            [usuario.name, usuario.email],
            function (err) {
              if (err) {
                console.error(`❌ Error insertando ${usuario.name}:`, err.message);
                reject(err);
              } else {
                insertados++;
                console.log(`✅ Migrado: ${usuario.name} (ID: ${this.lastID})`);
                resolve();
              }
            }
          );
        });
      }
      console.log(`\n🎉 Migración de usuarios completada: ${insertados}/${usuarios.length} usuarios migrados`);
    } else {
      console.log("\n✅ No hay usuarios para migrar. La tabla 'usuarios' está vacía.");
    }
    
    console.log("\n🔐 Creando cuentas de ejemplo...");
    
    const cuentas = [
      { username: 'admin@gmail.com', password: 'admin123', role: 'admin' },
      { username: 'usuario@gmail.com', password: 'usuario123', role: 'usuario' }
    ];

    let cuentasCreadas = 0;
    for (const cuenta of cuentas) {
      try {
        const hashedPassword = await bcrypt.hash(cuenta.password, 10);
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO cuentas (username, password, role) VALUES (?, ?, ?)",
            [cuenta.username, hashedPassword, cuenta.role],
            function (err) {
              if (err) {
                console.error(`❌ Error insertando cuenta ${cuenta.username}:`, err.message);
                reject(err);
              } else {
                cuentasCreadas++;
                console.log(`✅ Cuenta creada: ${cuenta.username} (${cuenta.role}) - Contraseña: ${cuenta.password}`);
                resolve();
              }
            }
          );
        });
      } catch (error) {
        console.error(`❌ Error procesando cuenta ${cuenta.username}:`, error.message);
      }
    }

    console.log(`\n🎉 Cuentas creadas: ${cuentasCreadas}/${cuentas.length}`);
    
    db.all("SELECT * FROM usuarios", [], (err, rows) => {
      if (err) {
        console.error("❌ Error verificando datos:", err.message);
      } else {
        console.log(`\n📋 Total de usuarios en SQLite: ${rows.length}`);
        if (rows.length > 0) {
          console.log("\nPrimeros registros:");
          rows.slice(0, 3).forEach(row => {
            console.log(`  - ID: ${row.id}, Nombre: ${row.name}, Email: ${row.email}`);
          });
        } else {
          console.log("\n✅ La tabla 'usuarios' está vacía (sin usuarios registrados).");
        }
      }
      
      db.all("SELECT id, username, role FROM cuentas", [], (err, cuentaRows) => {
        if (err) {
          console.error("❌ Error verificando cuentas:", err.message);
        } else {
          console.log(`\n🔐 Total de cuentas: ${cuentaRows.length}`);
          cuentaRows.forEach(row => {
            console.log(`  - Usuario: ${row.username}, Rol: ${row.role}`);
          });
        }
        
        db.close((err) => {
          if (err) {
            console.error("❌ Error cerrando DB:", err.message);
          } else {
            console.log("\n✅ Conexión cerrada. Migración finalizada.");
          }
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    console.error("❌ Error en la migración:", error.message);
    process.exit(1);
  }
}

migrate(); 
