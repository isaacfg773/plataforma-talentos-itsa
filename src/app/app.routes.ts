import {
  Routes
} from '@angular/router';


import {
  Dashboard
} from './pages/dashboard/dashboard';


import {
  Profesionales
} from './pages/profesionales/profesionales';


import {
  Empresas
} from './pages/empresas/empresas';


import {
  Ofertas
} from './pages/ofertas/ofertas';


import {
  Postulaciones
} from './pages/postulaciones/postulaciones';


import {
  Consultas
} from './pages/consultas/consultas';


import {
  Reportes
} from './pages/reportes/reportes';


import {
  Login
} from './pages/login/login';


import {
  ProfesionalInicio
} from './pages/profesional-inicio/profesional-inicio';


import {
  EmpresaInicio
} from './pages/empresa-inicio/empresa-inicio';


/* =====================================================
   REGISTROS PÃšBLICOS
===================================================== */

import {
  RegistroProfesional
} from './pages/registro-profesional/registro-profesional';


import {
  RegistroEmpresa
} from './pages/registro-empresa/registro-empresa';


/* =====================================================
   GUARDS
===================================================== */

import {
  authGuard
} from './guards/auth.guard';


import {
  roleGuard
} from './guards/role.guard';



export const routes:
  Routes = [


  /* =====================================================
     RUTAS PÃšBLICAS
  ===================================================== */

  {

    path:
      'login',

    component:
      Login

  },


  {

    path:
      'registro-profesional',

    component:
      RegistroProfesional

  },


  {

    path:
      'registro-empresa',

    component:
      RegistroEmpresa

  },


  /* =====================================================
     ADMINISTRADOR
  ===================================================== */

  {

    path:
      '',

    component:
      Dashboard,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'profesionales',

    component:
      Profesionales,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'empresas',

    component:
      Empresas,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'ofertas',

    component:
      Ofertas,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'postulaciones',

    component:
      Postulaciones,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'consultas',

    component:
      Consultas,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  {

    path:
      'reportes',

    component:
      Reportes,

    canActivate: [

      authGuard,

      roleGuard([
        'ADMIN'
      ])

    ]

  },


  /* =====================================================
     PROFESIONAL
  ===================================================== */

  {

    path:
      'profesional/inicio',

    component:
      ProfesionalInicio,

    canActivate: [

      authGuard,

      roleGuard([
        'PROFESIONAL'
      ])

    ]

  },


  /* =====================================================
     EMPRESA
  ===================================================== */

  {

    path:
      'empresa/inicio',

    component:
      EmpresaInicio,

    canActivate: [

      authGuard,

      roleGuard([
        'EMPRESA'
      ])

    ]

  },


  /* =====================================================
     RUTA NO ENCONTRADA
  ===================================================== */

  {

    path:
      '**',

    redirectTo:
      'login'

  }

];
