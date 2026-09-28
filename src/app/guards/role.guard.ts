import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthService,
  RolUsuario
} from '../services/auth.service';


export function roleGuard(
  rolesPermitidos:
    RolUsuario[]
): CanActivateFn {


  return () => {


    const auth =
      inject(
        AuthService
      );


    const router =
      inject(
        Router
      );


    const rolActual =
      auth.rol();


    if (
      rolActual &&
      rolesPermitidos.includes(
        rolActual
      )
    ) {

      return true;

    }


    return router.createUrlTree(
      [
        auth.rutaInicio()
      ]
    );

  };

}