import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService,
  RolUsuario
} from '../../services/auth.service';


@Component({

  selector: 'app-login',

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl: './login.html',

  styleUrl: './login.css'

})

export class Login implements OnInit {


  correo = '';

  password = '';

  mostrarPassword = false;

  cargando = false;

  error = '';


  constructor(

    private auth: AuthService,

    private router: Router,

    private cdr: ChangeDetectorRef

  ) {}


  ngOnInit(): void {

    if (
      this.auth.estaAutenticado()
    ) {

      this.router.navigateByUrl(
        this.auth.rutaInicio()
      );

    }

  }


  async ingresar():
    Promise<void> {


    this.error = '';


    if (
      !this.correo.trim() ||
      !this.password
    ) {

      this.error =
        'Ingrese su correo y contraseña.';

      return;

    }


    try {

      this.cargando = true;


      const usuario =
        await this.auth.login(

          this.correo.trim(),

          this.password

        );


      this.redirigir(
        usuario.rol
      );

    }

    catch (error) {

      this.error =

        error instanceof Error

          ? error.message

          : 'Error al iniciar sesión.';


      this.cdr.detectChanges();

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  redirigir(
    rol: RolUsuario
  ): void {


    if (
      rol === 'ADMIN'
    ) {

      this.router.navigate(
        ['/']
      );

      return;

    }


    if (
      rol === 'PROFESIONAL'
    ) {

      this.router.navigate(
        ['/profesional/inicio']
      );

      return;

    }


    if (
      rol === 'EMPRESA'
    ) {

      this.router.navigate(
        ['/empresa/inicio']
      );

    }

  }

}