import {
  ChangeDetectorRef,
  Component
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';


@Component({
  selector: 'app-registro-empresa',

  standalone: true,

  imports: [
    FormsModule,
    RouterLink
  ],

  templateUrl: './registro-empresa.html',

  styleUrl: './registro-empresa.css'
})

export class RegistroEmpresa {


  /* =========================================
     API
  ========================================= */

  private API =
    'http://localhost:3000/api/auth/registro-empresa';


  /* =========================================
     DATOS DE EMPRESA
  ========================================= */

  nombre = '';

  areaTrabajo = '';

  direccion = '';

  telefono = '';

  correo = '';

  personaContacto = '';


  /* =========================================
     CONTRASEÑA
  ========================================= */

  password = '';

  confirmarPassword = '';

  mostrarPassword = false;

  mostrarConfirmacion = false;


  /* =========================================
     ESTADOS
  ========================================= */

  cargando = false;

  error = '';

  mensaje = '';


  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  /* =========================================
     REGISTRAR EMPRESA
  ========================================= */

  async registrar():
    Promise<void> {


    this.error = '';

    this.mensaje = '';


    /* CAMPOS OBLIGATORIOS */

    if (
      !this.nombre.trim() ||
      !this.correo.trim() ||
      !this.password ||
      !this.confirmarPassword
    ) {

      this.error =
        'Complete todos los campos obligatorios.';

      return;

    }


    /* VALIDAR CORREO */

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !correoValido.test(
        this.correo.trim()
      )
    ) {

      this.error =
        'Ingrese un correo electrónico válido.';

      return;

    }


    /* VALIDAR CONTRASEÑA */

    if (
      this.password.length < 6
    ) {

      this.error =
        'La contraseña debe tener al menos 6 caracteres.';

      return;

    }


    if (
      this.password !==
      this.confirmarPassword
    ) {

      this.error =
        'Las contraseñas no coinciden.';

      return;

    }


    try {

      this.cargando = true;


      const respuesta =
        await fetch(
          this.API,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                nombre:
                  this.nombre.trim(),

                areaTrabajo:
                  this.areaTrabajo.trim(),

                direccion:
                  this.direccion.trim(),

                telefono:
                  this.telefono.trim(),

                correo:
                  this.correo
                    .trim()
                    .toLowerCase(),

                personaContacto:
                  this.personaContacto.trim(),

                password:
                  this.password

              })
          }
        );


      const resultado =
        await respuesta.json();


      if (
        !respuesta.ok
      ) {

        throw new Error(
          resultado.mensaje ||
          'No se pudo registrar la empresa.'
        );

      }


      this.mensaje =
        'Cuenta empresarial creada correctamente.';


      this.cdr.detectChanges();


      setTimeout(
        () => {

          this.router.navigate(
            ['/login']
          );

        },
        1200
      );

    }

    catch (error) {

      console.error(
        'Error registrando empresa:',
        error
      );


      if (
        error instanceof Error
      ) {

        this.error =
          error.message;

      }

      else {

        this.error =
          'Ocurrió un error al registrar la empresa.';

      }


      this.cdr.detectChanges();

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }

}