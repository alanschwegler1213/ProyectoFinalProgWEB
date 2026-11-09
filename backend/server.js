import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import db, { ready } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error(
    "Falta SESSION_SECRET (mínimo 32 caracteres). Copiá .env.example a .env y generá uno con:\n" +
    "  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
  process.exit(1);
}

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || `http://localhost:${PORT}`,
  credentials: true
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "..");

app.use(express.static(publicPath));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10kb" }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Limita intentos de login por IP (frena fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en 15 minutos." }
});

// Limita altas desde el formulario público (frena spam)
const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Probá más tarde." }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 254;

function getAllUsuarios() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM usuarios ORDER BY created_at DESC", [], (err, rows) => {
      if (err) {
        console.error("Error en getAllUsuarios:", err);
        reject(err);
      } else {
        const resultado = Array.isArray(rows) ? rows : (rows ? [rows] : []);
        resolve(resultado);
      }
    });
  });
}

function insertUsuario(name, email) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO usuarios (name, email) VALUES (?, ?)",
      [name, email],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function updateUsuario(id, name, email) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE usuarios SET name = ?, email = ? WHERE id = ?",
      [name, email, id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function deleteUsuario(id) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM usuarios WHERE id = ?",
      [id],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function getCuentaByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM cuentas WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createCuenta(username, password, role = 'usuario') {
  return new Promise(async (resolve, reject) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        "INSERT INTO cuentas (username, password, role) VALUES (?, ?, ?)",
        [username, hashedPassword, role],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: "No autenticado" });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador" });
}

app.get("/", (req, res) => res.send("🟢 API StorePhone: OK"));

app.post("/api/login", loginLimiter, async (req, res) => {
  const { username = "", password = "" } = req.body ?? {};
  
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
  }

  try {
    const cuenta = await getCuentaByUsername(username);
    
    if (!cuenta) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    const passwordMatch = await bcrypt.compare(password, cuenta.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Regenera el ID de sesión al autenticar (evita session fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error("Error regenerando sesión:", err);
        return res.status(500).json({ error: "Error en el servidor" });
      }

      req.session.user = {
        id: cuenta.id,
        username: cuenta.username,
        role: cuenta.role
      };

      res.json({
        ok: true,
        user: {
          id: cuenta.id,
          username: cuenta.username,
          role: cuenta.role
        }
      });
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al cerrar sesión" });
    }
    res.json({ ok: true, message: "Sesión cerrada" });
  });
});

app.get("/api/session", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get("/api/usuarios", requireAuth, async (req, res) => {
  try {
    const usuarios = await getAllUsuarios();
    
    let usuariosArray = [];
    if (Array.isArray(usuarios)) {
      usuariosArray = usuarios;
    } else {
      usuariosArray = [];
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.json(usuariosArray);
  } catch (error) {
    console.error("Error al leer usuarios:", error);
    res.setHeader('Content-Type', 'application/json');
    res.json([]);
  }
});

app.post("/api/usuarios", registroLimiter, async (req, res) => {
  const { name = "", email = "" } = req.body ?? {};
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({ error: "Nombre y email son requeridos" });
  }

  if (cleanName.length > MAX_NAME || cleanEmail.length > MAX_EMAIL || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: "Nombre o email inválido" });
  }

  try {
    const result = await insertUsuario(cleanName, cleanEmail);
    res.status(201).json({ ok: true, id: result.id });
  } catch (error) {
    console.error("Error al guardar usuario:", error);
    res.status(500).json({ error: "Error al guardar los datos" });
  }
});

app.put("/api/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name = "", email = "" } = req.body ?? {};

  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({ error: "Nombre y email son requeridos" });
  }

  if (cleanName.length > MAX_NAME || cleanEmail.length > MAX_EMAIL || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: "Nombre o email inválido" });
  }

  try {
    const result = await updateUsuario(id, cleanName, cleanEmail);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ ok: true, id, message: "Usuario actualizado" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar los datos" });
  }
});

app.delete("/api/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const result = await deleteUsuario(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ ok: true, id, message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

await ready;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
