const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const {
  DatabaseSync
} = require('node:sqlite');

const {
  instalarAutenticacion
} = require('./auth');


/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const app = express();

/*
  LOCAL:
  usa 3000

  RAILWAY:
  Railway asignará automáticamente process.env.PORT
*/
const PORT =
  process.env.PORT || 3000;


/*
  Necesario para que Railway reconozca correctamente
  HTTPS cuando la aplicación está detrás de su proxy.
*/
app.set(
  'trust proxy',
  1
);


app.use(
  cors()
);


app.use(
  express.json()
);


app.use(
  express.urlencoded({
    extended: true
  })
);


/* =========================================================
   ALMACENAMIENTO PERSISTENTE
========================================================= */

/*
  LOCAL:

  backend/
      database/
      uploads/


  RAILWAY:

  Podemos crear un volumen en /data
  y configurar:

  DATA_DIR=/data
*/

const carpetaBase =
  process.env.DATA_DIR
    ? path.resolve(
        process.env.DATA_DIR
      )
    : __dirname;


const carpetaUploads =
  path.join(
    carpetaBase,
    'uploads',
    'curriculums'
  );


const carpetaUploadsBase =
  path.join(
    carpetaBase,
    'uploads'
  );


const carpetaDatabase =
  path.join(
    carpetaBase,
    'database'
  );


fs.mkdirSync(
  carpetaUploads,
  {
    recursive: true
  }
);


fs.mkdirSync(
  carpetaDatabase,
  {
    recursive: true
  }
);


/* =========================================================
   ARCHIVOS PÚBLICOS
========================================================= */

app.use(
  '/uploads',

  express.static(
    carpetaUploadsBase
  )
);


/* =========================================================
   URL PÚBLICA DEL SERVIDOR
========================================================= */

function obtenerUrlBase(
  req
) {

  /*
    Si más adelante configuramos PUBLIC_URL
    en Railway, tendrá prioridad.
  */

  if (
    process.env.PUBLIC_URL
  ) {

    return process.env.PUBLIC_URL
      .replace(
        /\/+$/,
        ''
      );

  }


  /*
    LOCAL:
    http://localhost:3000

    RAILWAY:
    https://xxxx.up.railway.app
  */

  return `${req.protocol}://${req.get('host')}`;

}


/* =========================================================
   SQLITE
========================================================= */

const rutaDB =
  path.join(
    carpetaDatabase,
    'talentos.db'
  );


const db =
  new DatabaseSync(
    rutaDB
  );


db.exec(`
  PRAGMA foreign_keys = ON;
`);


/* =========================================================
   TABLA PROFESIONALES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS profesionales (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuarioId INTEGER,

    nombres TEXT NOT NULL,

    apellidos TEXT NOT NULL,

    ci TEXT NOT NULL UNIQUE,

    telefono TEXT,

    correo TEXT,

    especialidad TEXT,

    nivelIngles TEXT,

    quechua TEXT,

    experiencia TEXT,

    cv TEXT,

    cvUrl TEXT,

    fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP

  )
`);


/* =========================================================
   TABLA EMPRESAS
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuarioId INTEGER,

    nombre TEXT NOT NULL,

    areaTrabajo TEXT,

    direccion TEXT,

    telefono TEXT,

    correo TEXT,

    personaContacto TEXT,

    fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP

  )
`);


/* =========================================================
   TABLA OFERTAS
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS ofertas (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    empresaId INTEGER NOT NULL,

    cargo TEXT NOT NULL,

    descripcion TEXT,

    requisitos TEXT,

    competencias TEXT,

    experienciaRequerida TEXT,

    fechaPublicacion TEXT NOT NULL,

    fechaCierre TEXT NOT NULL,

    estado TEXT DEFAULT 'Activa',

    fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (empresaId)
      REFERENCES empresas(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE

  )
`);


/* =========================================================
   TABLA POSTULACIONES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS postulaciones (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    profesionalId INTEGER NOT NULL,

    ofertaId INTEGER NOT NULL,

    fechaPostulacion TEXT NOT NULL,

    estado TEXT DEFAULT 'Postulada',

    observaciones TEXT,

    fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (profesionalId)
      REFERENCES profesionales(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    FOREIGN KEY (ofertaId)
      REFERENCES ofertas(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    UNIQUE (
      profesionalId,
      ofertaId
    )

  )
`);


/* =========================================================
   MIGRACIÓN DE BASE EXISTENTE
========================================================= */

function existeColumna(
  tabla,
  columna
) {

  const columnas =
    db
      .prepare(
        `PRAGMA table_info(${tabla})`
      )
      .all();


  return columnas.some(
    item =>
      item.name === columna
  );

}


/* PROFESIONALES */

if (
  !existeColumna(
    'profesionales',
    'usuarioId'
  )
) {

  db.exec(`
    ALTER TABLE profesionales
    ADD COLUMN usuarioId INTEGER
  `);


  console.log(
    'Columna usuarioId agregada a profesionales.'
  );

}


/* EMPRESAS */

if (
  !existeColumna(
    'empresas',
    'usuarioId'
  )
) {

  db.exec(`
    ALTER TABLE empresas
    ADD COLUMN usuarioId INTEGER
  `);


  console.log(
    'Columna usuarioId agregada a empresas.'
  );

}


/* =========================================================
   ÍNDICES
========================================================= */

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_profesionales_usuario

  ON profesionales(usuarioId)

  WHERE usuarioId IS NOT NULL;
`);


db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_empresas_usuario

  ON empresas(usuarioId)

  WHERE usuarioId IS NOT NULL;
`);


/* =========================================================
   MULTER - CURRÍCULUM PDF
========================================================= */

const almacenamiento =
  multer.diskStorage({

    destination(
      req,
      file,
      cb
    ) {

      cb(
        null,
        carpetaUploads
      );

    },


    filename(
      req,
      file,
      cb
    ) {

      const nombreSeguro =
        file.originalname
          .replace(
            /\s+/g,
            '-'
          )
          .replace(
            /[^\w.-]/g,
            ''
          );


      cb(
        null,
        `${Date.now()}-${nombreSeguro}`
      );

    }

  });


const subirCV =
  multer({

    storage:
      almacenamiento,


    limits: {

      fileSize:
        5 * 1024 * 1024

    },


    fileFilter(
      req,
      file,
      cb
    ) {

      if (
        file.mimetype ===
        'application/pdf'
      ) {

        cb(
          null,
          true
        );

      }

      else {

        cb(
          new Error(
            'Solo se permiten archivos PDF.'
          )
        );

      }

    }

  });


/* =========================================================
   ELIMINAR ARCHIVO SUBIDO
========================================================= */

function eliminarArchivoSubido(
  archivo
) {

  if (
    !archivo
  ) {

    return;

  }


  try {

    if (
      fs.existsSync(
        archivo.path
      )
    ) {

      fs.unlinkSync(
        archivo.path
      );

    }

  }

  catch (error) {

    console.error(
      'No se pudo eliminar archivo:',
      error
    );

  }

}


/* =========================================================
   ELIMINAR CV POR URL
========================================================= */

function eliminarCvPorUrl(
  cvUrl
) {

  if (
    !cvUrl
  ) {

    return;

  }


  try {

    const nombreArchivo =
      cvUrl
        .split('/')
        .pop();


    if (
      !nombreArchivo
    ) {

      return;

    }


    const rutaArchivo =
      path.join(
        carpetaUploads,
        nombreArchivo
      );


    if (
      fs.existsSync(
        rutaArchivo
      )
    ) {

      fs.unlinkSync(
        rutaArchivo
      );

    }

  }

  catch (error) {

    console.error(
      'No se pudo eliminar CV:',
      error
    );

  }

}


/* =========================================================
   AUTENTICACIÓN
========================================================= */

instalarAutenticacion(
  app,
  db
);


/* =========================================================
   VALIDACIONES
========================================================= */

function correoValido(
  correo
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      String(correo)
        .trim()
    );

}


/* =========================================================
   REGISTRO PÚBLICO PROFESIONAL
========================================================= */

app.post(
  '/api/auth/registro-profesional',

  subirCV.single('cv'),

  (req, res) => {

    let transaccion =
      false;


    try {

      const {
        nombres,
        apellidos,
        ci,
        telefono,
        correo,
        password,
        especialidad,
        nivelIngles,
        quechua,
        experiencia
      } = req.body;


      if (
        !nombres ||
        !apellidos ||
        !ci ||
        !correo ||
        !password
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Nombres, apellidos, CI, correo y contraseña son obligatorios.'

          });

      }


      if (
        !correoValido(
          correo
        )
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Ingrese un correo electrónico válido.'

          });

      }


      if (
        password.length < 6
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'La contraseña debe tener al menos 6 caracteres.'

          });

      }


      const correoNormalizado =
        correo
          .trim()
          .toLowerCase();


      const usuarioExistente =
        db
          .prepare(`
            SELECT id

            FROM usuarios

            WHERE LOWER(correo) = ?
          `)
          .get(
            correoNormalizado
          );


      if (
        usuarioExistente
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe una cuenta con ese correo.'

          });

      }


      const profesionalExistente =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE ci = ?
          `)
          .get(
            ci.trim()
          );


      if (
        profesionalExistente &&
        profesionalExistente.usuarioId
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Ese profesional ya tiene una cuenta vinculada.'

          });

      }


      const passwordHash =
        bcrypt.hashSync(
          password,
          10
        );


      db.exec(
        'BEGIN TRANSACTION'
      );


      transaccion =
        true;


      const resultadoUsuario =
        db
          .prepare(`
            INSERT INTO usuarios
            (
              correo,
              passwordHash,
              rol,
              estado
            )

            VALUES
            (?, ?, 'PROFESIONAL', 'ACTIVO')
          `)
          .run(

            correoNormalizado,

            passwordHash

          );


      const usuarioId =
        Number(
          resultadoUsuario
            .lastInsertRowid
        );


      let cv = '';

      let cvUrl = '';


      if (
        req.file
      ) {

        cv =
          req.file.originalname;


        cvUrl =
          `${obtenerUrlBase(req)}/uploads/curriculums/${req.file.filename}`;

      }


      let profesionalId;


      /* =========================================
         PROFESIONAL YA EXISTENTE
      ========================================= */

      if (
        profesionalExistente
      ) {

        if (
          req.file &&
          profesionalExistente.cvUrl
        ) {

          eliminarCvPorUrl(
            profesionalExistente.cvUrl
          );

        }


        db
          .prepare(`
            UPDATE profesionales

            SET
              usuarioId = ?,
              nombres = ?,
              apellidos = ?,
              telefono = ?,
              correo = ?,
              especialidad = ?,
              nivelIngles = ?,
              quechua = ?,
              experiencia = ?,

              cv =
                CASE
                  WHEN ? <> ''
                  THEN ?
                  ELSE cv
                END,

              cvUrl =
                CASE
                  WHEN ? <> ''
                  THEN ?
                  ELSE cvUrl
                END

            WHERE id = ?
          `)
          .run(

            usuarioId,

            nombres.trim(),

            apellidos.trim(),

            telefono || '',

            correoNormalizado,

            especialidad || '',

            nivelIngles || '',

            quechua || '',

            experiencia || '',

            cv,

            cv,

            cvUrl,

            cvUrl,

            profesionalExistente.id

          );


        profesionalId =
          profesionalExistente.id;

      }


      /* =========================================
         NUEVO PROFESIONAL
      ========================================= */

      else {

        const resultadoProfesional =
          db
            .prepare(`
              INSERT INTO profesionales
              (
                usuarioId,
                nombres,
                apellidos,
                ci,
                telefono,
                correo,
                especialidad,
                nivelIngles,
                quechua,
                experiencia,
                cv,
                cvUrl
              )

              VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(

              usuarioId,

              nombres.trim(),

              apellidos.trim(),

              ci.trim(),

              telefono || '',

              correoNormalizado,

              especialidad || '',

              nivelIngles || '',

              quechua || '',

              experiencia || '',

              cv,

              cvUrl

            );


        profesionalId =
          Number(
            resultadoProfesional
              .lastInsertRowid
          );

      }


      db.exec(
        'COMMIT'
      );


      transaccion =
        false;


      res
        .status(201)
        .json({

          mensaje:
            'Cuenta profesional creada correctamente.',

          usuarioId,

          profesionalId,

          correo:
            correoNormalizado,

          rol:
            'PROFESIONAL'

        });

    }


    catch (error) {

      if (
        transaccion
      ) {

        try {

          db.exec(
            'ROLLBACK'
          );

        }

        catch {}

      }


      eliminarArchivoSubido(
        req.file
      );


      console.error(
        'Error registro profesional:',
        error
      );


      if (
        String(error)
          .includes(
            'UNIQUE'
          )
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe un registro con esos datos.'

          });

      }


      res
        .status(500)
        .json({

          mensaje:
            'No se pudo crear la cuenta profesional.'

        });

    }

  }
);


/* =========================================================
   REGISTRO PÚBLICO EMPRESA
========================================================= */

app.post(
  '/api/auth/registro-empresa',

  (req, res) => {

    let transaccion =
      false;


    try {

      const {
        nombre,
        areaTrabajo,
        direccion,
        telefono,
        correo,
        personaContacto,
        password
      } = req.body;


      if (
        !nombre ||
        !correo ||
        !password
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Nombre de empresa, correo y contraseña son obligatorios.'

          });

      }


      if (
        !correoValido(
          correo
        )
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ingrese un correo electrónico válido.'

          });

      }


      if (
        password.length < 6
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La contraseña debe tener al menos 6 caracteres.'

          });

      }


      const correoNormalizado =
        correo
          .trim()
          .toLowerCase();


      const usuarioExistente =
        db
          .prepare(`
            SELECT id

            FROM usuarios

            WHERE LOWER(correo) = ?
          `)
          .get(
            correoNormalizado
          );


      if (
        usuarioExistente
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe una cuenta con ese correo.'

          });

      }


      const empresaExistente =
        db
          .prepare(`
            SELECT *

            FROM empresas

            WHERE LOWER(correo) = ?
          `)
          .get(
            correoNormalizado
          );


      if (
        empresaExistente &&
        empresaExistente.usuarioId
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Esta empresa ya tiene una cuenta vinculada.'

          });

      }


      const passwordHash =
        bcrypt.hashSync(
          password,
          10
        );


      db.exec(
        'BEGIN TRANSACTION'
      );


      transaccion =
        true;


      const resultadoUsuario =
        db
          .prepare(`
            INSERT INTO usuarios
            (
              correo,
              passwordHash,
              rol,
              estado
            )

            VALUES
            (?, ?, 'EMPRESA', 'ACTIVO')
          `)
          .run(

            correoNormalizado,

            passwordHash

          );


      const usuarioId =
        Number(
          resultadoUsuario
            .lastInsertRowid
        );


      let empresaId;


      /* EMPRESA YA REGISTRADA POR ADMIN */

      if (
        empresaExistente
      ) {

        db
          .prepare(`
            UPDATE empresas

            SET
              usuarioId = ?,
              nombre = ?,
              areaTrabajo = ?,
              direccion = ?,
              telefono = ?,
              correo = ?,
              personaContacto = ?

            WHERE id = ?
          `)
          .run(

            usuarioId,

            nombre.trim(),

            areaTrabajo || '',

            direccion || '',

            telefono || '',

            correoNormalizado,

            personaContacto || '',

            empresaExistente.id

          );


        empresaId =
          empresaExistente.id;

      }


      /* NUEVA EMPRESA */

      else {

        const resultadoEmpresa =
          db
            .prepare(`
              INSERT INTO empresas
              (
                usuarioId,
                nombre,
                areaTrabajo,
                direccion,
                telefono,
                correo,
                personaContacto
              )

              VALUES
              (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(

              usuarioId,

              nombre.trim(),

              areaTrabajo || '',

              direccion || '',

              telefono || '',

              correoNormalizado,

              personaContacto || ''

            );


        empresaId =
          Number(
            resultadoEmpresa
              .lastInsertRowid
          );

      }


      db.exec(
        'COMMIT'
      );


      transaccion =
        false;


      res
        .status(201)
        .json({

          mensaje:
            'Cuenta empresarial creada correctamente.',

          usuarioId,

          empresaId,

          correo:
            correoNormalizado,

          rol:
            'EMPRESA'

        });

    }


    catch (error) {

      if (
        transaccion
      ) {

        try {

          db.exec(
            'ROLLBACK'
          );

        }

        catch {}

      }


      console.error(
        'Error registro empresa:',
        error
      );


      if (
        String(error)
          .includes(
            'UNIQUE'
          )
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe una cuenta con esos datos.'

          });

      }


      res
        .status(500)
        .json({

          mensaje:
            'No se pudo crear la cuenta empresarial.'

        });

    }

  }
);


/* =========================================================
   RUTA PRINCIPAL
========================================================= */

app.get(
  '/',

  (req, res) => {

    res.json({

      sistema:
        'Plataforma Digital de Talentos ITSa',

      estado:
        'Funcionando correctamente',

      entorno:
        process.env.NODE_ENV ||
        'development',

      rutas: {

        login:
          '/api/auth/login',

        registroProfesional:
          '/api/auth/registro-profesional',

        registroEmpresa:
          '/api/auth/registro-empresa',

        profesionales:
          '/api/profesionales',

        empresas:
          '/api/empresas',

        ofertas:
          '/api/ofertas',

        postulaciones:
          '/api/postulaciones'

      }

    });

  }
);


/* =========================================================
   PROFESIONALES - LISTAR
========================================================= */

app.get(
  '/api/profesionales',

  (req, res) => {

    try {

      const datos =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            ORDER BY id DESC
          `)
          .all();


      res.json(
        datos
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener profesionales.'

        });

    }

  }
);


/* =========================================================
   PROFESIONAL POR ID
========================================================= */

app.get(
  '/api/profesionales/:id',

  (req, res) => {

    try {

      const profesional =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE id = ?
          `)
          .get(
            Number(
              req.params.id
            )
          );


      if (
        !profesional
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Profesional no encontrado.'

          });

      }


      res.json(
        profesional
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al buscar profesional.'

        });

    }

  }
);


/* =========================================================
   PROFESIONALES - REGISTRAR ADMIN
========================================================= */

app.post(
  '/api/profesionales',

  subirCV.single('cv'),

  (req, res) => {

    try {

      const {
        nombres,
        apellidos,
        ci,
        telefono,
        correo,
        especialidad,
        nivelIngles,
        quechua,
        experiencia
      } = req.body;


      if (
        !nombres ||
        !apellidos ||
        !ci
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Nombres, apellidos y CI son obligatorios.'

          });

      }


      let cv = '';

      let cvUrl = '';


      if (
        req.file
      ) {

        cv =
          req.file.originalname;


        cvUrl =
          `${obtenerUrlBase(req)}/uploads/curriculums/${req.file.filename}`;

      }


      const resultado =
        db
          .prepare(`
            INSERT INTO profesionales
            (
              nombres,
              apellidos,
              ci,
              telefono,
              correo,
              especialidad,
              nivelIngles,
              quechua,
              experiencia,
              cv,
              cvUrl
            )

            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(

            nombres.trim(),

            apellidos.trim(),

            ci.trim(),

            telefono || '',

            correo || '',

            especialidad || '',

            nivelIngles || '',

            quechua || '',

            experiencia || '',

            cv,

            cvUrl

          );


      const nuevo =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE id = ?
          `)
          .get(
            Number(
              resultado.lastInsertRowid
            )
          );


      res
        .status(201)
        .json(
          nuevo
        );

    }


    catch (error) {

      eliminarArchivoSubido(
        req.file
      );


      if (
        String(error)
          .includes(
            'UNIQUE'
          )
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe un profesional con ese CI.'

          });

      }


      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar profesional.'

        });

    }

  }
);


/* =========================================================
   PROFESIONALES - ACTUALIZAR
========================================================= */

app.put(
  '/api/profesionales/:id',

  subirCV.single('cv'),

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const actual =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE id = ?
          `)
          .get(id);


      if (
        !actual
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(404)
          .json({

            mensaje:
              'Profesional no encontrado.'

          });

      }


      const {
        nombres,
        apellidos,
        ci,
        telefono,
        correo,
        especialidad,
        nivelIngles,
        quechua,
        experiencia
      } = req.body;


      if (
        !nombres ||
        !apellidos ||
        !ci
      ) {

        eliminarArchivoSubido(
          req.file
        );


        return res
          .status(400)
          .json({

            mensaje:
              'Nombres, apellidos y CI son obligatorios.'

          });

      }


      let cv =
        actual.cv;


      let cvUrl =
        actual.cvUrl;


      if (
        req.file
      ) {

        eliminarCvPorUrl(
          actual.cvUrl
        );


        cv =
          req.file.originalname;


        cvUrl =
          `${obtenerUrlBase(req)}/uploads/curriculums/${req.file.filename}`;

      }


      db
        .prepare(`
          UPDATE profesionales

          SET
            nombres = ?,
            apellidos = ?,
            ci = ?,
            telefono = ?,
            correo = ?,
            especialidad = ?,
            nivelIngles = ?,
            quechua = ?,
            experiencia = ?,
            cv = ?,
            cvUrl = ?

          WHERE id = ?
        `)
        .run(

          nombres.trim(),

          apellidos.trim(),

          ci.trim(),

          telefono || '',

          correo || '',

          especialidad || '',

          nivelIngles || '',

          quechua || '',

          experiencia || '',

          cv,

          cvUrl,

          id

        );


      const actualizado =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE id = ?
          `)
          .get(id);


      res.json(
        actualizado
      );

    }


    catch (error) {

      console.error(
        error
      );


      if (
        String(error)
          .includes(
            'UNIQUE'
          )
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ya existe otro profesional con ese CI.'

          });

      }


      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar profesional.'

        });

    }

  }
);


/* =========================================================
   PROFESIONALES - ELIMINAR
========================================================= */

app.delete(
  '/api/profesionales/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const profesional =
        db
          .prepare(`
            SELECT *

            FROM profesionales

            WHERE id = ?
          `)
          .get(id);


      if (
        !profesional
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Profesional no encontrado.'

          });

      }


      const total =
        db
          .prepare(`
            SELECT COUNT(*) AS total

            FROM postulaciones

            WHERE profesionalId = ?
          `)
          .get(id);


      if (
        Number(
          total.total
        ) > 0
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'No se puede eliminar porque tiene postulaciones.'

          });

      }


      eliminarCvPorUrl(
        profesional.cvUrl
      );


      db
        .prepare(`
          DELETE FROM profesionales

          WHERE id = ?
        `)
        .run(id);


      res.json({

        mensaje:
          'Profesional eliminado correctamente.'

      });

    }


    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al eliminar profesional.'

        });

    }

  }
);


/* =========================================================
   EMPRESAS - LISTAR
========================================================= */

app.get(
  '/api/empresas',

  (req, res) => {

    try {

      const empresas =
        db
          .prepare(`
            SELECT *

            FROM empresas

            ORDER BY id DESC
          `)
          .all();


      res.json(
        empresas
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener empresas.'

        });

    }

  }
);


/* =========================================================
   EMPRESA POR ID
========================================================= */

app.get(
  '/api/empresas/:id',

  (req, res) => {

    try {

      const empresa =
        db
          .prepare(`
            SELECT *

            FROM empresas

            WHERE id = ?
          `)
          .get(
            Number(
              req.params.id
            )
          );


      if (
        !empresa
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Empresa no encontrada.'

          });

      }


      res.json(
        empresa
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al buscar empresa.'

        });

    }

  }
);


/* =========================================================
   EMPRESAS - REGISTRAR ADMIN
========================================================= */

app.post(
  '/api/empresas',

  (req, res) => {

    try {

      const {
        nombre,
        areaTrabajo,
        direccion,
        telefono,
        correo,
        personaContacto
      } = req.body;


      if (
        !nombre ||
        !nombre.trim()
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'El nombre es obligatorio.'

          });

      }


      const resultado =
        db
          .prepare(`
            INSERT INTO empresas
            (
              nombre,
              areaTrabajo,
              direccion,
              telefono,
              correo,
              personaContacto
            )

            VALUES
            (?, ?, ?, ?, ?, ?)
          `)
          .run(

            nombre.trim(),

            areaTrabajo || '',

            direccion || '',

            telefono || '',

            correo || '',

            personaContacto || ''

          );


      const nueva =
        db
          .prepare(`
            SELECT *

            FROM empresas

            WHERE id = ?
          `)
          .get(
            Number(
              resultado.lastInsertRowid
            )
          );


      res
        .status(201)
        .json(
          nueva
        );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar empresa.'

        });

    }

  }
);


/* =========================================================
   EMPRESAS - ACTUALIZAR
========================================================= */

app.put(
  '/api/empresas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const existente =
        db
          .prepare(`
            SELECT id

            FROM empresas

            WHERE id = ?
          `)
          .get(id);


      if (
        !existente
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Empresa no encontrada.'

          });

      }


      const {
        nombre,
        areaTrabajo,
        direccion,
        telefono,
        correo,
        personaContacto
      } = req.body;


      if (
        !nombre ||
        !nombre.trim()
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'El nombre es obligatorio.'

          });

      }


      db
        .prepare(`
          UPDATE empresas

          SET
            nombre = ?,
            areaTrabajo = ?,
            direccion = ?,
            telefono = ?,
            correo = ?,
            personaContacto = ?

          WHERE id = ?
        `)
        .run(

          nombre.trim(),

          areaTrabajo || '',

          direccion || '',

          telefono || '',

          correo || '',

          personaContacto || '',

          id

        );


      const actualizada =
        db
          .prepare(`
            SELECT *

            FROM empresas

            WHERE id = ?
          `)
          .get(id);


      res.json(
        actualizada
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar empresa.'

        });

    }

  }
);


/* =========================================================
   EMPRESAS - ELIMINAR
========================================================= */

app.delete(
  '/api/empresas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const empresa =
        db
          .prepare(`
            SELECT id

            FROM empresas

            WHERE id = ?
          `)
          .get(id);


      if (
        !empresa
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Empresa no encontrada.'

          });

      }


      const ofertas =
        db
          .prepare(`
            SELECT COUNT(*) AS total

            FROM ofertas

            WHERE empresaId = ?
          `)
          .get(id);


      if (
        Number(
          ofertas.total
        ) > 0
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La empresa tiene ofertas registradas.'

          });

      }


      db
        .prepare(`
          DELETE FROM empresas

          WHERE id = ?
        `)
        .run(id);


      res.json({

        mensaje:
          'Empresa eliminada correctamente.'

      });

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al eliminar empresa.'

        });

    }

  }
);


/* =========================================================
   OFERTAS - LISTAR
========================================================= */

app.get(
  '/api/ofertas',

  (req, res) => {

    try {

      const ofertas =
        db
          .prepare(`
            SELECT

              o.*,

              e.nombre
              AS empresaNombre

            FROM ofertas o

            INNER JOIN empresas e
              ON e.id = o.empresaId

            ORDER BY o.id DESC
          `)
          .all();


      res.json(
        ofertas
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener ofertas.'

        });

    }

  }
);


/* =========================================================
   OFERTA POR ID
========================================================= */

app.get(
  '/api/ofertas/:id',

  (req, res) => {

    try {

      const oferta =
        db
          .prepare(`
            SELECT

              o.*,

              e.nombre
              AS empresaNombre

            FROM ofertas o

            INNER JOIN empresas e
              ON e.id = o.empresaId

            WHERE o.id = ?
          `)
          .get(
            Number(
              req.params.id
            )
          );


      if (
        !oferta
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Oferta laboral no encontrada.'

          });

      }


      res.json(
        oferta
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al buscar oferta.'

        });

    }

  }
);


/* =========================================================
   OFERTAS - REGISTRAR
========================================================= */

app.post(
  '/api/ofertas',

  (req, res) => {

    try {

      const {
        empresaId,
        cargo,
        descripcion,
        requisitos,
        competencias,
        experienciaRequerida,
        fechaPublicacion,
        fechaCierre,
        estado
      } = req.body;


      if (
        !empresaId ||
        !cargo ||
        !fechaPublicacion ||
        !fechaCierre
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Empresa, cargo y fechas son obligatorios.'

          });

      }


      if (
        fechaCierre <
        fechaPublicacion
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La fecha de cierre no puede ser anterior a la fecha de publicación.'

          });

      }


      const empresa =
        db
          .prepare(`
            SELECT id

            FROM empresas

            WHERE id = ?
          `)
          .get(
            Number(
              empresaId
            )
          );


      if (
        !empresa
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La empresa seleccionada no existe.'

          });

      }


      const resultado =
        db
          .prepare(`
            INSERT INTO ofertas
            (
              empresaId,
              cargo,
              descripcion,
              requisitos,
              competencias,
              experienciaRequerida,
              fechaPublicacion,
              fechaCierre,
              estado
            )

            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(

            Number(
              empresaId
            ),

            cargo.trim(),

            descripcion || '',

            requisitos || '',

            competencias || '',

            experienciaRequerida || '',

            fechaPublicacion,

            fechaCierre,

            estado || 'Activa'

          );


      const nueva =
        db
          .prepare(`
            SELECT

              o.*,

              e.nombre
              AS empresaNombre

            FROM ofertas o

            INNER JOIN empresas e
              ON e.id = o.empresaId

            WHERE o.id = ?
          `)
          .get(
            Number(
              resultado.lastInsertRowid
            )
          );


      res
        .status(201)
        .json(
          nueva
        );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar oferta.'

        });

    }

  }
);


/* =========================================================
   OFERTAS - ACTUALIZAR
========================================================= */

app.put(
  '/api/ofertas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const existente =
        db
          .prepare(`
            SELECT id

            FROM ofertas

            WHERE id = ?
          `)
          .get(id);


      if (
        !existente
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Oferta laboral no encontrada.'

          });

      }


      const {
        empresaId,
        cargo,
        descripcion,
        requisitos,
        competencias,
        experienciaRequerida,
        fechaPublicacion,
        fechaCierre,
        estado
      } = req.body;


      if (
        !empresaId ||
        !cargo ||
        !fechaPublicacion ||
        !fechaCierre
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Empresa, cargo y fechas son obligatorios.'

          });

      }


      if (
        fechaCierre <
        fechaPublicacion
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La fecha de cierre no puede ser anterior a la publicación.'

          });

      }


      db
        .prepare(`
          UPDATE ofertas

          SET
            empresaId = ?,
            cargo = ?,
            descripcion = ?,
            requisitos = ?,
            competencias = ?,
            experienciaRequerida = ?,
            fechaPublicacion = ?,
            fechaCierre = ?,
            estado = ?

          WHERE id = ?
        `)
        .run(

          Number(
            empresaId
          ),

          cargo.trim(),

          descripcion || '',

          requisitos || '',

          competencias || '',

          experienciaRequerida || '',

          fechaPublicacion,

          fechaCierre,

          estado || 'Activa',

          id

        );


      const actualizada =
        db
          .prepare(`
            SELECT

              o.*,

              e.nombre
              AS empresaNombre

            FROM ofertas o

            INNER JOIN empresas e
              ON e.id = o.empresaId

            WHERE o.id = ?
          `)
          .get(id);


      res.json(
        actualizada
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar oferta.'

        });

    }

  }
);


/* =========================================================
   OFERTAS - ELIMINAR
========================================================= */

app.delete(
  '/api/ofertas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const oferta =
        db
          .prepare(`
            SELECT id

            FROM ofertas

            WHERE id = ?
          `)
          .get(id);


      if (
        !oferta
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Oferta laboral no encontrada.'

          });

      }


      const postulaciones =
        db
          .prepare(`
            SELECT COUNT(*) AS total

            FROM postulaciones

            WHERE ofertaId = ?
          `)
          .get(id);


      if (
        Number(
          postulaciones.total
        ) > 0
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La oferta tiene postulaciones registradas.'

          });

      }


      db
        .prepare(`
          DELETE FROM ofertas

          WHERE id = ?
        `)
        .run(id);


      res.json({

        mensaje:
          'Oferta eliminada correctamente.'

      });

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al eliminar oferta.'

        });

    }

  }
);


/* =========================================================
   POSTULACIONES - LISTAR
========================================================= */

app.get(
  '/api/postulaciones',

  (req, res) => {

    try {

      const postulaciones =
        db
          .prepare(`
            SELECT

              p.*,

              pr.nombres ||
              ' ' ||
              pr.apellidos
              AS profesionalNombre,

              pr.ci
              AS profesionalCI,

              o.cargo
              AS ofertaCargo,

              e.nombre
              AS empresaNombre

            FROM postulaciones p

            INNER JOIN profesionales pr
              ON pr.id = p.profesionalId

            INNER JOIN ofertas o
              ON o.id = p.ofertaId

            INNER JOIN empresas e
              ON e.id = o.empresaId

            ORDER BY p.id DESC
          `)
          .all();


      res.json(
        postulaciones
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener postulaciones.'

        });

    }

  }
);


/* =========================================================
   POSTULACIÓN POR ID
========================================================= */

app.get(
  '/api/postulaciones/:id',

  (req, res) => {

    try {

      const postulacion =
        db
          .prepare(`
            SELECT

              p.*,

              pr.nombres ||
              ' ' ||
              pr.apellidos
              AS profesionalNombre,

              pr.ci
              AS profesionalCI,

              o.cargo
              AS ofertaCargo,

              e.nombre
              AS empresaNombre

            FROM postulaciones p

            INNER JOIN profesionales pr
              ON pr.id = p.profesionalId

            INNER JOIN ofertas o
              ON o.id = p.ofertaId

            INNER JOIN empresas e
              ON e.id = o.empresaId

            WHERE p.id = ?
          `)
          .get(
            Number(
              req.params.id
            )
          );


      if (
        !postulacion
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Postulación no encontrada.'

          });

      }


      res.json(
        postulacion
      );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al buscar postulación.'

        });

    }

  }
);


/* =========================================================
   POSTULACIONES - REGISTRAR
========================================================= */

app.post(
  '/api/postulaciones',

  (req, res) => {

    try {

      const {
        profesionalId,
        ofertaId,
        fechaPostulacion,
        estado,
        observaciones
      } = req.body;


      if (
        !profesionalId ||
        !ofertaId ||
        !fechaPostulacion
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Profesional, oferta y fecha son obligatorios.'

          });

      }


      const profesional =
        db
          .prepare(`
            SELECT id

            FROM profesionales

            WHERE id = ?
          `)
          .get(
            Number(
              profesionalId
            )
          );


      if (
        !profesional
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'El profesional no existe.'

          });

      }


      const oferta =
        db
          .prepare(`
            SELECT id

            FROM ofertas

            WHERE id = ?
          `)
          .get(
            Number(
              ofertaId
            )
          );


      if (
        !oferta
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'La oferta no existe.'

          });

      }


      const existe =
        db
          .prepare(`
            SELECT id

            FROM postulaciones

            WHERE profesionalId = ?

            AND ofertaId = ?
          `)
          .get(

            Number(
              profesionalId
            ),

            Number(
              ofertaId
            )

          );


      if (
        existe
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'El profesional ya está postulado a esta oferta.'

          });

      }


      const resultado =
        db
          .prepare(`
            INSERT INTO postulaciones
            (
              profesionalId,
              ofertaId,
              fechaPostulacion,
              estado,
              observaciones
            )

            VALUES
            (?, ?, ?, ?, ?)
          `)
          .run(

            Number(
              profesionalId
            ),

            Number(
              ofertaId
            ),

            fechaPostulacion,

            estado || 'Postulada',

            observaciones || ''

          );


      const nueva =
        db
          .prepare(`
            SELECT

              p.*,

              pr.nombres ||
              ' ' ||
              pr.apellidos
              AS profesionalNombre,

              o.cargo
              AS ofertaCargo,

              e.nombre
              AS empresaNombre

            FROM postulaciones p

            INNER JOIN profesionales pr
              ON pr.id = p.profesionalId

            INNER JOIN ofertas o
              ON o.id = p.ofertaId

            INNER JOIN empresas e
              ON e.id = o.empresaId

            WHERE p.id = ?
          `)
          .get(
            Number(
              resultado.lastInsertRowid
            )
          );


      res
        .status(201)
        .json(
          nueva
        );

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar postulación.'

        });

    }

  }
);


/* =========================================================
   POSTULACIONES - ACTUALIZAR
========================================================= */

app.put(
  '/api/postulaciones/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const existente =
        db
          .prepare(`
            SELECT id

            FROM postulaciones

            WHERE id = ?
          `)
          .get(id);


      if (
        !existente
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Postulación no encontrada.'

          });

      }


      const {
        profesionalId,
        ofertaId,
        fechaPostulacion,
        estado,
        observaciones
      } = req.body;


      if (
        !profesionalId ||
        !ofertaId ||
        !fechaPostulacion
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Profesional, oferta y fecha son obligatorios.'

          });

      }


      const duplicada =
        db
          .prepare(`
            SELECT id

            FROM postulaciones

            WHERE profesionalId = ?

            AND ofertaId = ?

            AND id <> ?
          `)
          .get(

            Number(
              profesionalId
            ),

            Number(
              ofertaId
            ),

            id

          );


      if (
        duplicada
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'Ese profesional ya está postulado a esa oferta.'

          });

      }


      db
        .prepare(`
          UPDATE postulaciones

          SET
            profesionalId = ?,
            ofertaId = ?,
            fechaPostulacion = ?,
            estado = ?,
            observaciones = ?

          WHERE id = ?
        `)
        .run(

          Number(
            profesionalId
          ),

          Number(
            ofertaId
          ),

          fechaPostulacion,

          estado || 'Postulada',

          observaciones || '',

          id

        );


      res.json({

        mensaje:
          'Postulación actualizada correctamente.'

      });

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar postulación.'

        });

    }

  }
);


/* =========================================================
   POSTULACIONES - ELIMINAR
========================================================= */

app.delete(
  '/api/postulaciones/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const postulacion =
        db
          .prepare(`
            SELECT id

            FROM postulaciones

            WHERE id = ?
          `)
          .get(id);


      if (
        !postulacion
      ) {

        return res
          .status(404)
          .json({

            mensaje:
              'Postulación no encontrada.'

          });

      }


      db
        .prepare(`
          DELETE FROM postulaciones

          WHERE id = ?
        `)
        .run(id);


      res.json({

        mensaje:
          'Postulación eliminada correctamente.'

      });

    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          mensaje:
            'Error al eliminar postulación.'

        });

    }

  }
);


/* =========================================================
   ERROR 404 API
========================================================= */

app.use(
  '/api',

  (req, res) => {

    res
      .status(404)
      .json({

        mensaje:
          'Ruta de API no encontrada.'

      });

  }
);


/* =========================================================
   MANEJO DE ERRORES
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {

        return res
          .status(400)
          .json({

            mensaje:
              'El PDF no puede superar los 5 MB.'

          });

      }

    }


    if (
      error
    ) {

      console.error(
        'Error del servidor:',
        error
      );


      return res
        .status(400)
        .json({

          mensaje:
            error.message ||
            'Error del servidor.'

        });

    }


    next();

  }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

app.listen(
  PORT,

  '0.0.0.0',

  () => {

    console.log('');

    console.log(
      '=============================================='
    );

    console.log(
      ' PLATAFORMA DIGITAL DE TALENTOS - ITSa'
    );

    console.log(
      '=============================================='
    );

    console.log('');

    console.log(
      `Puerto: ${PORT}`
    );

    console.log(
      `Entorno: ${process.env.NODE_ENV || 'development'}`
    );

    console.log('');

    console.log(
      `Base de datos: ${rutaDB}`
    );

    console.log(
      `Archivos: ${carpetaUploads}`
    );

    console.log('');

    console.log(
      'API iniciada correctamente.'
    );

    console.log('');

  }
);