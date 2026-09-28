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
  selector: 'app-registro-profesional',

  standalone: true,

  imports: [
    FormsModule,
    RouterLink
  ],

  templateUrl: './registro-profesional.html',

  styleUrl: './registro-profesional.css'
})

export class RegistroProfesional {

  private API =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/auth/registro-profesional';


  /* =========================================
     DATOS PERSONALES
  ========================================= */

  nombres = '';

  apellidos = '';

  ci = '';

  telefono = '';

  correo = '';


  /* =========================================
     DATOS PROFESIONALES
  ========================================= */

  especialidad = '';

  nivelIngles = '';

  quechua = '';

  experiencia = '';


  /* =========================================
     CONTRASEÃ‘A
  ========================================= */

  password = '';

  confirmarPassword = '';

  mostrarPassword = false;

  mostrarConfirmacion = false;


  /* =========================================
     CURRÃCULUM
  ========================================= */

  archivoCV: File | null = null;


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
     SELECCIONAR CV
  ========================================= */

  seleccionarCV(
    event: Event
  ): void {

    const elemento =
      event.currentTarget;


    if (
      !(elemento instanceof HTMLInputElement)
    ) {
      return;
    }


    const archivos =
      elemento.files;


    if (
      !archivos ||
      archivos.length === 0
    ) {

      this.archivoCV = null;

      return;
    }


    const archivo =
      archivos.item(0);


    if (!archivo) {

      this.archivoCV = null;

      return;
    }


    if (
      archivo.type !==
      'application/pdf'
    ) {

      alert(
        'El currÃ­culum debe estar en formato PDF.'
      );

      elemento.value = '';

      this.archivoCV = null;

      return;
    }


    const limite =
      5 * 1024 * 1024;


    if (
      archivo.size > limite
    ) {

      alert(
        'El currÃ­culum no puede superar los 5 MB.'
      );

      elemento.value = '';

      this.archivoCV = null;

      return;
    }


    this.archivoCV =
      archivo;

  }


  /* =========================================
     REGISTRAR
  ========================================= */

  async registrar():
    Promise<void> {

    this.error = '';

    this.mensaje = '';


    /* CAMPOS OBLIGATORIOS */

    if (
      !this.nombres.trim() ||
      !this.apellidos.trim() ||
      !this.ci.trim() ||
      !this.correo.trim() ||
      !this.password ||
      !this.confirmarPassword
    ) {

      this.error =
        'Complete todos los campos obligatorios.';

      return;
    }


    /* CORREO */

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !correoValido.test(
        this.correo.trim()
      )
    ) {

      this.error =
        'Ingrese un correo electrÃ³nico vÃ¡lido.';

      return;
    }


    /* CONTRASEÃ‘A */

    if (
      this.password.length < 6
    ) {

      this.error =
        'La contraseÃ±a debe tener al menos 6 caracteres.';

      return;
    }


    if (
      this.password !==
      this.confirmarPassword
    ) {

      this.error =
        'Las contraseÃ±as no coinciden.';

      return;
    }


    try {

      this.cargando = true;


      const datos =
        new FormData();


      datos.append(
        'nombres',
        this.nombres.trim()
      );


      datos.append(
        'apellidos',
        this.apellidos.trim()
      );


      datos.append(
        'ci',
        this.ci.trim()
      );


      datos.append(
        'telefono',
        this.telefono.trim()
      );


      datos.append(
        'correo',
        this.correo
          .trim()
          .toLowerCase()
      );


      datos.append(
        'especialidad',
        this.especialidad.trim()
      );


      datos.append(
        'nivelIngles',
        this.nivelIngles
      );


      datos.append(
        'quechua',
        this.quechua
      );


      datos.append(
        'experiencia',
        this.experiencia.trim()
      );


      datos.append(
        'password',
        this.password
      );


      if (
        this.archivoCV
      ) {

        datos.append(
          'cv',
          this.archivoCV
        );

      }


      const respuesta =
        await fetch(
          this.API,
          {
            method: 'POST',
            body: datos
          }
        );


      const resultado =
        await respuesta.json();


      if (
        !respuesta.ok
      ) {

        throw new Error(
          resultado.mensaje ||
          'No se pudo crear la cuenta profesional.'
        );

      }


      this.mensaje =
        'Cuenta profesional creada correctamente.';


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
        'Error registrando profesional:',
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
          'OcurriÃ³ un error al registrar la cuenta.';

      }


      this.cdr.detectChanges();

    }

    finally {

      this.cargando =
        false;


      this.cdr.detectChanges();

    }

  }

}
