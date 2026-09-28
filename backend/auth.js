const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


/* =========================================================
   CONFIGURACIÓN JWT
========================================================= */

const JWT_SECRET =
  'ITSA_PLATAFORMA_TALENTOS_2026_SECRET';


/* =========================================================
   FUNCIÓN PRINCIPAL DE AUTENTICACIÓN
========================================================= */

function instalarAutenticacion(app, db) {


  /* =======================================================
     TABLA USUARIOS
  ======================================================= */

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      correo TEXT NOT NULL UNIQUE,

      passwordHash TEXT NOT NULL,

      rol TEXT NOT NULL,

      estado TEXT NOT NULL DEFAULT 'ACTIVO',

      fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP

    )
  `);


  /* =======================================================
     CREAR USUARIOS DE PRUEBA
  ======================================================= */

  crearUsuarioInicial(
    db,
    'admin@itsa.bo',
    'Admin123!',
    'ADMIN'
  );


  crearUsuarioInicial(
    db,
    'profesional@demo.bo',
    'Profesional123!',
    'PROFESIONAL'
  );


  crearUsuarioInicial(
    db,
    'empresa@demo.bo',
    'Empresa123!',
    'EMPRESA'
  );


  /* =======================================================
     MIDDLEWARE AUTENTICACIÓN
  ======================================================= */

  function autenticar(
    req,
    res,
    next
  ) {

    const authorization =
      req.headers.authorization;


    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {

      return res
        .status(401)
        .json({

          mensaje:
            'Debe iniciar sesión.'

        });

    }


    const token =
      authorization.substring(7);


    try {

      const datosToken =
        jwt.verify(
          token,
          JWT_SECRET
        );


      const usuario =
        db
          .prepare(`
            SELECT
              id,
              correo,
              rol,
              estado,
              fechaRegistro

            FROM usuarios

            WHERE id = ?
          `)
          .get(
            datosToken.id
          );


      if (!usuario) {

        return res
          .status(401)
          .json({

            mensaje:
              'Usuario no encontrado.'

          });

      }


      if (
        usuario.estado !==
        'ACTIVO'
      ) {

        return res
          .status(403)
          .json({

            mensaje:
              'La cuenta está inactiva.'

          });

      }


      req.usuario =
        usuario;


      next();

    }

    catch (error) {

      return res
        .status(401)
        .json({

          mensaje:
            'Token inválido o sesión expirada.'

        });

    }

  }


  /* =======================================================
     CONTROL DE ROLES
  ======================================================= */

  function permitirRoles(
    ...roles
  ) {

    return (
      req,
      res,
      next
    ) => {

      if (
        !req.usuario
      ) {

        return res
          .status(401)
          .json({

            mensaje:
              'Debe iniciar sesión.'

          });

      }


      if (
        !roles.includes(
          req.usuario.rol
        )
      ) {

        return res
          .status(403)
          .json({

            mensaje:
              'No tiene permisos para realizar esta acción.'

          });

      }


      next();

    };

  }


  /* =======================================================
     LOGIN
  ======================================================= */

  app.post(
    '/api/auth/login',

    (req, res) => {

      try {

        const {

          correo,

          password

        } = req.body;


        if (
          !correo ||
          !password
        ) {

          return res
            .status(400)
            .json({

              mensaje:
                'Correo y contraseña son obligatorios.'

            });

        }


        const correoNormalizado =
          correo
            .trim()
            .toLowerCase();


        const usuario =
          db
            .prepare(`
              SELECT *

              FROM usuarios

              WHERE LOWER(correo) = ?
            `)
            .get(
              correoNormalizado
            );


        if (!usuario) {

          return res
            .status(401)
            .json({

              mensaje:
                'Correo o contraseña incorrectos.'

            });

        }


        if (
          usuario.estado !==
          'ACTIVO'
        ) {

          return res
            .status(403)
            .json({

              mensaje:
                'La cuenta está inactiva.'

            });

        }


        const passwordCorrecto =
          bcrypt.compareSync(
            password,
            usuario.passwordHash
          );


        if (
          !passwordCorrecto
        ) {

          return res
            .status(401)
            .json({

              mensaje:
                'Correo o contraseña incorrectos.'

            });

        }


        const token =
          jwt.sign(

            {

              id:
                usuario.id,

              correo:
                usuario.correo,

              rol:
                usuario.rol

            },

            JWT_SECRET,

            {

              expiresIn:
                '8h'

            }

          );


        res.json({

          mensaje:
            'Inicio de sesión correcto.',

          token,

          usuario: {

            id:
              usuario.id,

            correo:
              usuario.correo,

            rol:
              usuario.rol,

            estado:
              usuario.estado

          }

        });

      }

      catch (error) {

        console.error(
          'Error en login:',
          error
        );


        res
          .status(500)
          .json({

            mensaje:
              'Error al iniciar sesión.'

          });

      }

    }
  );


  /* =======================================================
     USUARIO ACTUAL
  ======================================================= */

  app.get(
    '/api/auth/me',

    autenticar,

    (req, res) => {

      res.json(
        req.usuario
      );

    }
  );


  /* =======================================================
     LISTAR USUARIOS - SOLO ADMIN
  ======================================================= */

  app.get(
    '/api/usuarios',

    autenticar,

    permitirRoles(
      'ADMIN'
    ),

    (req, res) => {

      try {

        const usuarios =
          db
            .prepare(`
              SELECT

                id,

                correo,

                rol,

                estado,

                fechaRegistro

              FROM usuarios

              ORDER BY id DESC
            `)
            .all();


        res.json(
          usuarios
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
              'Error al obtener usuarios.'

          });

      }

    }
  );


  /* =======================================================
     CREAR USUARIO - SOLO ADMIN
  ======================================================= */

  app.post(
    '/api/usuarios',

    autenticar,

    permitirRoles(
      'ADMIN'
    ),

    (req, res) => {

      try {

        const {

          correo,

          password,

          rol

        } = req.body;


        if (
          !correo ||
          !password ||
          !rol
        ) {

          return res
            .status(400)
            .json({

              mensaje:
                'Correo, contraseña y rol son obligatorios.'

            });

        }


        const rolesValidos = [

          'ADMIN',

          'PROFESIONAL',

          'EMPRESA'

        ];


        if (
          !rolesValidos.includes(
            rol
          )
        ) {

          return res
            .status(400)
            .json({

              mensaje:
                'Rol no válido.'

            });

        }


        if (
          password.length < 6
        ) {

          return res
            .status(400)
            .json({

              mensaje:
                'La contraseña debe tener mínimo 6 caracteres.'

            });

        }


        const correoNormalizado =
          correo
            .trim()
            .toLowerCase();


        const existente =
          db
            .prepare(`
              SELECT id

              FROM usuarios

              WHERE LOWER(correo) = ?
            `)
            .get(
              correoNormalizado
            );


        if (existente) {

          return res
            .status(400)
            .json({

              mensaje:
                'Ya existe un usuario con ese correo.'

            });

        }


        const passwordHash =
          bcrypt.hashSync(
            password,
            10
          );


        const resultado =
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
              (?, ?, ?, 'ACTIVO')
            `)
            .run(

              correoNormalizado,

              passwordHash,

              rol

            );


        const nuevo =
          db
            .prepare(`
              SELECT

                id,

                correo,

                rol,

                estado,

                fechaRegistro

              FROM usuarios

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

        console.error(
          error
        );


        res
          .status(500)
          .json({

            mensaje:
              'Error al crear usuario.'

          });

      }

    }
  );


  console.log(
    'Autenticación y roles habilitados.'
  );

}


/* =========================================================
   CREAR USUARIO INICIAL
========================================================= */

function crearUsuarioInicial(
  db,
  correo,
  password,
  rol
) {

  const existente =
    db
      .prepare(`
        SELECT id

        FROM usuarios

        WHERE LOWER(correo) = ?
      `)
      .get(
        correo.toLowerCase()
      );


  if (
    existente
  ) {

    return;

  }


  const passwordHash =
    bcrypt.hashSync(
      password,
      10
    );


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
      (?, ?, ?, 'ACTIVO')
    `)
    .run(

      correo.toLowerCase(),

      passwordHash,

      rol

    );


  console.log(
    `Usuario inicial creado: ${correo} (${rol})`
  );

}


/* =========================================================
   MUY IMPORTANTE:
   EXPORTAR FUNCIÓN
========================================================= */

module.exports = {

  instalarAutenticacion

};