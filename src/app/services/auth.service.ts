import {
  Injectable,
  computed,
  signal
} from '@angular/core';


export type RolUsuario =
  'ADMIN' |
  'PROFESIONAL' |
  'EMPRESA';


export interface UsuarioSesion {

  id: number;

  correo: string;

  rol: RolUsuario;

  estado: string;

}


interface RespuestaLogin {

  mensaje: string;

  token: string;

  usuario: UsuarioSesion;

}


@Injectable({
  providedIn: 'root'
})

export class AuthService {


  private API =
    'https://plataforma-talentos-itsa-production.up.railway.app/api';


  private tokenSignal =
    signal<string | null>(
      localStorage.getItem(
        'itsa_token'
      )
    );


  private usuarioSignal =
    signal<UsuarioSesion | null>(
      this.obtenerUsuarioGuardado()
    );


  usuario =
    this.usuarioSignal.asReadonly();


  token =
    this.tokenSignal.asReadonly();


  rol =
    computed(
      () =>
        this.usuarioSignal()?.rol
        ?? null
    );


  estaAutenticado =
    computed(
      () =>
        !!this.tokenSignal() &&
        !!this.usuarioSignal()
    );


  /* ==========================================
     LOGIN
  ========================================== */

  async login(
    correo: string,
    password: string
  ): Promise<UsuarioSesion> {


    const respuesta =
      await fetch(

        `${this.API}/auth/login`,

        {

          method: 'POST',

          headers: {

            'Content-Type':
              'application/json'

          },

          body:
            JSON.stringify({

              correo,

              password

            })

        }

      );


    const resultado =
      await respuesta.json();


    if (!respuesta.ok) {

      throw new Error(

        resultado.mensaje ||

        'No se pudo iniciar sesiÃ³n.'

      );

    }


    const datos =
      resultado as RespuestaLogin;


    localStorage.setItem(
      'itsa_token',
      datos.token
    );


    localStorage.setItem(

      'itsa_usuario',

      JSON.stringify(
        datos.usuario
      )

    );


    this.tokenSignal.set(
      datos.token
    );


    this.usuarioSignal.set(
      datos.usuario
    );


    return datos.usuario;

  }


  /* ==========================================
     CERRAR SESIÃ“N
  ========================================== */

  logout(): void {


    localStorage.removeItem(
      'itsa_token'
    );


    localStorage.removeItem(
      'itsa_usuario'
    );


    this.tokenSignal.set(
      null
    );


    this.usuarioSignal.set(
      null
    );

  }


  /* ==========================================
     RUTA SEGÃšN ROL
  ========================================== */

  rutaInicio(): string {


    if (
      this.rol() === 'ADMIN'
    ) {

      return '/';

    }


    if (
      this.rol() === 'PROFESIONAL'
    ) {

      return '/profesional/inicio';

    }


    if (
      this.rol() === 'EMPRESA'
    ) {

      return '/empresa/inicio';

    }


    return '/login';

  }


  /* ==========================================
     HEADERS AUTORIZADOS
  ========================================== */

  headersAutorizados():
    Record<string, string> {


    const token =
      this.tokenSignal();


    if (!token) {

      return {};

    }


    return {

      Authorization:
        `Bearer ${token}`

    };

  }


  /* ==========================================
     LEER USUARIO
  ========================================== */

  private obtenerUsuarioGuardado():
    UsuarioSesion | null {


    try {

      const usuario =
        localStorage.getItem(
          'itsa_usuario'
        );


      if (!usuario) {

        return null;

      }


      return JSON.parse(
        usuario
      );

    }

    catch {

      return null;

    }

  }

}
