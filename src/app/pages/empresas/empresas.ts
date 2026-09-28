import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


interface Empresa {

  id: number;

  nombre: string;

  areaTrabajo: string;

  direccion: string;

  telefono: string;

  correo: string;

  personaContacto: string;

  fechaRegistro?: string;

}


@Component({

  selector: 'app-empresas',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './empresas.html',

  styleUrl: './empresas.css'

})


export class Empresas implements OnInit {


  /* ============================================
     API
  ============================================ */

  private API =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/empresas';


  /* ============================================
     VARIABLES
  ============================================ */

  empresas: Empresa[] = [];

  empresaActual: Empresa =
    this.nuevaEmpresa();

  mostrarFormulario = false;

  editando = false;

  busqueda = '';

  cargando = false;


  /* ============================================
     CONSTRUCTOR
  ============================================ */

  constructor(
    private cdr: ChangeDetectorRef
  ) {}


  /* ============================================
     INICIAR
  ============================================ */

  ngOnInit(): void {

    this.cargarEmpresas();

  }


  /* ============================================
     EMPRESA VACÃA
  ============================================ */

  nuevaEmpresa(): Empresa {

    return {

      id: 0,

      nombre: '',

      areaTrabajo: '',

      direccion: '',

      telefono: '',

      correo: '',

      personaContacto: ''

    };

  }


  /* ============================================
     CARGAR EMPRESAS
  ============================================ */

  async cargarEmpresas(): Promise<void> {

    try {

      this.cargando = true;


      const respuesta =
        await fetch(
          this.API,
          {
            method: 'GET',
            cache: 'no-store'
          }
        );


      if (!respuesta.ok) {

        throw new Error(
          `Error del servidor: ${respuesta.status}`
        );

      }


      const datos =
        await respuesta.json();


      console.log(
        'EMPRESAS RECIBIDAS:',
        datos
      );


      this.empresas =
        Array.isArray(datos)
          ? [...datos]
          : [];


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'ERROR CARGANDO EMPRESAS:',
        error
      );


      this.empresas = [];

      this.cdr.detectChanges();


      alert(
        'No se pudieron cargar las empresas.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* ============================================
     NUEVA EMPRESA
  ============================================ */

  abrirNuevo(): void {

    this.editando = false;

    this.empresaActual =
      this.nuevaEmpresa();

    this.mostrarFormulario = true;

  }


  /* ============================================
     EDITAR
  ============================================ */

  editar(
    empresa: Empresa
  ): void {

    this.editando = true;

    this.empresaActual = {

      ...empresa

    };

    this.mostrarFormulario = true;

  }


  /* ============================================
     GUARDAR
  ============================================ */

  async guardar(): Promise<void> {


    if (
      !this.empresaActual.nombre.trim()
    ) {

      alert(
        'Ingrese el nombre de la empresa o instituciÃ³n.'
      );

      return;

    }


    try {

      this.cargando = true;


      const datos = {

        nombre:
          this.empresaActual.nombre.trim(),

        areaTrabajo:
          this.empresaActual.areaTrabajo,

        direccion:
          this.empresaActual.direccion,

        telefono:
          this.empresaActual.telefono,

        correo:
          this.empresaActual.correo,

        personaContacto:
          this.empresaActual.personaContacto

      };


      let respuesta: Response;


      /* EDITAR */

      if (
        this.editando
      ) {

        respuesta =
          await fetch(

            `${this.API}/${this.empresaActual.id}`,

            {

              method: 'PUT',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify(datos)

            }

          );

      }


      /* NUEVO */

      else {

        respuesta =
          await fetch(

            this.API,

            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify(datos)

            }

          );

      }


      const resultado =
        await respuesta.json();


      if (!respuesta.ok) {

        alert(

          resultado.mensaje ||

          'OcurriÃ³ un error al guardar la empresa.'

        );

        return;

      }


      if (
        this.editando
      ) {

        alert(
          'Empresa actualizada correctamente.'
        );

      }

      else {

        alert(
          'Empresa registrada correctamente.'
        );

      }


      this.cancelar();


      await this.cargarEmpresas();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'ERROR GUARDANDO EMPRESA:',
        error
      );


      alert(
        'No se pudo conectar con el servidor.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* ============================================
     ELIMINAR
  ============================================ */

  async eliminar(
    id: number
  ): Promise<void> {

    const confirmar =
      confirm(
        'Â¿EstÃ¡ seguro de eliminar esta empresa?'
      );


    if (!confirmar) {

      return;

    }


    try {

      this.cargando = true;


      const respuesta =
        await fetch(

          `${this.API}/${id}`,

          {

            method: 'DELETE'

          }

        );


      const resultado =
        await respuesta.json();


      if (!respuesta.ok) {

        alert(

          resultado.mensaje ||

          'No se pudo eliminar la empresa.'

        );

        return;

      }


      alert(
        'Empresa eliminada correctamente.'
      );


      await this.cargarEmpresas();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'ERROR ELIMINANDO EMPRESA:',
        error
      );


      alert(
        'No se pudo conectar con el servidor.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* ============================================
     CANCELAR
  ============================================ */

  cancelar(): void {

    this.mostrarFormulario = false;

    this.editando = false;

    this.empresaActual =
      this.nuevaEmpresa();

  }


  /* ============================================
     BUSCADOR
  ============================================ */

  get empresasFiltradas():
    Empresa[] {


    const texto =

      this.busqueda

        .toLowerCase()

        .trim();


    if (!texto) {

      return this.empresas;

    }


    return this.empresas.filter(

      empresa => {


        const contenido =

          `
          ${empresa.nombre}
          ${empresa.areaTrabajo}
          ${empresa.direccion}
          ${empresa.telefono}
          ${empresa.correo}
          ${empresa.personaContacto}
          `

            .toLowerCase();


        return contenido.includes(
          texto
        );

      }

    );

  }

}
