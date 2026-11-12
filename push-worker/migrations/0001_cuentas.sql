-- Cuentas (usuario protegido con correo y contraseña) y su copia en la nube.
CREATE TABLE accounts (
  username TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  uploaded_at TEXT
);

-- Solo el hash del token; el token en claro vive en el teléfono.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Un registro por fila de IndexedDB (store + id), como JSON.
CREATE TABLE records (
  username TEXT NOT NULL,
  store TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (username, store, id)
);
