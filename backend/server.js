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
   CONFIGURACIÓN
========================================================= */

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);


/* =========================================================
   CARPETAS
========================================================= */

const carpetaUploads = path.join(
  __dirname,
  'uploads',
  'curriculums'
);

const carpetaDatabase = path.join(
  __dirname,
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


app.use(
  '/uploads',
  express.static(
    path.join(
      __dirname,
      'uploads'
    )
  )
);


/* =========================================================
   SQLITE
========================================================= */

const rutaDB = path.join(
  carpetaDatabase,
  'talentos.db'
);

const db =
  new DatabaseSync(rutaDB);

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
   MIGRACIÓN PARA BASE YA EXISTENTE
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


/* Un usuario solo puede tener un perfil */

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
   MULTER - CV PDF
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

      const seguro =
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
        `${Date.now()}-${seguro}`
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


function eliminarArchivoSubido(
  archivo
) {

  if (!archivo) {
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
   AUTENTICACIÓN, USUARIOS Y LOGIN
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

      transaccion = true;


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
          `http://localhost:${PORT}/uploads/curriculums/${req.file.filename}`;

      }


      let profesionalId;


      /*
       Si el administrador ya había registrado
       este CI, vinculamos ese perfil.
      */

      if (
        profesionalExistente
      ) {

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

      transaccion = false;


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


      /*
       Si el administrador ya registró una empresa
       con este correo, la vincularemos.
      */

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

      transaccion = true;


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

      transaccion = false;


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
        'Funcionando',

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
   PROFESIONALES
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

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener profesionales.'

        });

    }

  }
);


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

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al buscar profesional.'

        });

    }

  }
);


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
          `http://localhost:${PORT}/uploads/curriculums/${req.file.filename}`;

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


      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar profesional.'

        });

    }

  }
);


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


      let cv =
        actual.cv;

      let cvUrl =
        actual.cvUrl;


      if (
        req.file
      ) {

        if (
          actual.cvUrl
        ) {

          const anterior =
            actual.cvUrl
              .split('/')
              .pop();


          const rutaAnterior =
            path.join(
              carpetaUploads,
              anterior
            );


          if (
            fs.existsSync(
              rutaAnterior
            )
          ) {

            fs.unlinkSync(
              rutaAnterior
            );

          }

        }


        cv =
          req.file.originalname;

        cvUrl =
          `http://localhost:${PORT}/uploads/curriculums/${req.file.filename}`;

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

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar profesional.'

        });

    }

  }
);


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

      console.error(error);

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
   EMPRESAS
========================================================= */

app.get(
  '/api/empresas',

  (req, res) => {

    try {

      res.json(

        db
          .prepare(`
            SELECT *
            FROM empresas
            ORDER BY id DESC
          `)
          .all()

      );

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener empresas.'

        });

    }

  }
);


app.get(
  '/api/empresas/:id',

  (req, res) => {

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


    if (!empresa) {

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
);


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
        !nombre
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

            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(

            nombre.trim(),

            areaTrabajo || '',

            direccion || '',

            telefono || '',

            correo || '',

            personaContacto || ''

          );


      res
        .status(201)
        .json(

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
            )

        );

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar empresa.'

        });

    }

  }
);


app.put(
  '/api/empresas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


      const {

        nombre,
        areaTrabajo,
        direccion,
        telefono,
        correo,
        personaContacto

      } = req.body;


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

          nombre,

          areaTrabajo || '',

          direccion || '',

          telefono || '',

          correo || '',

          personaContacto || '',

          id

        );


      res.json(

        db
          .prepare(`
            SELECT *
            FROM empresas
            WHERE id = ?
          `)
          .get(id)

      );

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar empresa.'

        });

    }

  }
);


app.delete(
  '/api/empresas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


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

      console.error(error);

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
   OFERTAS
========================================================= */

app.get(
  '/api/ofertas',

  (req, res) => {

    try {

      res.json(

        db
          .prepare(`
            SELECT
              o.*,
              e.nombre AS empresaNombre

            FROM ofertas o

            INNER JOIN empresas e
              ON e.id = o.empresaId

            ORDER BY o.id DESC
          `)
          .all()

      );

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener ofertas.'

        });

    }

  }
);


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


      res
        .status(201)
        .json({

          id:
            Number(
              resultado.lastInsertRowid
            ),

          mensaje:
            'Oferta registrada correctamente.'

        });

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar oferta.'

        });

    }

  }
);


app.put(
  '/api/ofertas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


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

          cargo,

          descripcion || '',

          requisitos || '',

          competencias || '',

          experienciaRequerida || '',

          fechaPublicacion,

          fechaCierre,

          estado || 'Activa',

          id

        );


      res.json({

        mensaje:
          'Oferta actualizada correctamente.'

      });

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar oferta.'

        });

    }

  }
);


app.delete(
  '/api/ofertas/:id',

  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );


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

      console.error(error);

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
   POSTULACIONES
========================================================= */

app.get(
  '/api/postulaciones',

  (req, res) => {

    try {

      res.json(

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
          .all()

      );

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al obtener postulaciones.'

        });

    }

  }
);


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

            VALUES (?, ?, ?, ?, ?)
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


      res
        .status(201)
        .json({

          id:
            Number(
              resultado.lastInsertRowid
            ),

          mensaje:
            'Postulación registrada correctamente.'

        });

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al registrar postulación.'

        });

    }

  }
);


app.put(
  '/api/postulaciones/:id',

  (req, res) => {

    try {

      const {

        profesionalId,
        ofertaId,
        fechaPostulacion,
        estado,
        observaciones

      } = req.body;


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

          Number(
            req.params.id
          )

        );


      res.json({

        mensaje:
          'Postulación actualizada correctamente.'

      });

    }

    catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          mensaje:
            'Error al actualizar postulación.'

        });

    }

  }
);


app.delete(
  '/api/postulaciones/:id',

  (req, res) => {

    try {

      db
        .prepare(`
          DELETE FROM postulaciones
          WHERE id = ?
        `)
        .run(
          Number(
            req.params.id
          )
        );


      res.json({

        mensaje:
          'Postulación eliminada correctamente.'

      });

    }

    catch (error) {

      console.error(error);

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
   ERRORES MULTER
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
   INICIAR
========================================================= */

app.listen(
  PORT,

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
      `Servidor: http://localhost:${PORT}`
    );

    console.log('');

    console.log(
      `Login: http://localhost:${PORT}/api/auth/login`
    );

    console.log(
      `Registro profesional: http://localhost:${PORT}/api/auth/registro-profesional`
    );

    console.log(
      `Registro empresa: http://localhost:${PORT}/api/auth/registro-empresa`
    );

    console.log(
      `Profesionales: http://localhost:${PORT}/api/profesionales`
    );

    console.log(
      `Empresas: http://localhost:${PORT}/api/empresas`
    );

    console.log(
      `Ofertas: http://localhost:${PORT}/api/ofertas`
    );

    console.log(
      `Postulaciones: http://localhost:${PORT}/api/postulaciones`
    );

    console.log('');

    console.log(
      `Base de datos: ${rutaDB}`
    );

    console.log('');

  }
);