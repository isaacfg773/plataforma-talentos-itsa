import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


interface Profesional {

  id: number;

  nombres: string;

  apellidos: string;

  ci: string;

  telefono: string;

  correo: string;

  especialidad: string;

  nivelIngles: string;

  quechua: string;

  experiencia: string;

  cv: string;

  cvUrl: string;

  fechaRegistro?: string;

}


@Component({

  selector: 'app-profesionales',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './profesionales.html',

  styleUrl: './profesionales.css'

})


export class Profesionales implements OnInit {


  /* =====================================================
     API
  ===================================================== */

  private API =
    'http://localhost:3000/api/profesionales';


  /* =====================================================
     VARIABLES
  ===================================================== */

  mostrarFormulario = false;

  editando = false;

  busqueda = '';

  cargando = false;

  archivoCV: File | null = null;


  profesionales: Profesional[] = [];


  profesionalActual: Profesional =
    this.nuevoProfesional();


  /* =====================================================
     CONSTRUCTOR
  ===================================================== */

  constructor(
    private cdr: ChangeDetectorRef
  ) {}


  /* =====================================================
     INICIAR COMPONENTE
  ===================================================== */

  ngOnInit(): void {

    console.log(
      'Iniciando módulo profesionales...'
    );

    this.cargarProfesionales();

  }


  /* =====================================================
     PROFESIONAL VACÍO
  ===================================================== */

  nuevoProfesional(): Profesional {

    return {

      id: 0,

      nombres: '',

      apellidos: '',

      ci: '',

      telefono: '',

      correo: '',

      especialidad: '',

      nivelIngles: '',

      quechua: '',

      experiencia: '',

      cv: '',

      cvUrl: ''

    };

  }


  /* =====================================================
     CARGAR PROFESIONALES DESDE SQLITE
  ===================================================== */

  async cargarProfesionales(): Promise<void> {

    try {

      this.cargando = true;


      console.log(
        'Consultando profesionales...'
      );


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
        'DATOS RECIBIDOS:',
        datos
      );


      if (
        Array.isArray(datos)
      ) {

        this.profesionales =
          [...datos];

      }

      else {

        this.profesionales = [];

      }


      /*
       IMPORTANTE:
       Forzar actualización de la pantalla
      */

      this.cdr.detectChanges();


      console.log(
        'Cantidad profesionales:',
        this.profesionales.length
      );


    }

    catch (error) {

      console.error(
        'ERROR CARGANDO PROFESIONALES:',
        error
      );


      this.profesionales = [];


      this.cdr.detectChanges();


      alert(
        'No se pudieron cargar los profesionales desde el servidor.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* =====================================================
     ABRIR NUEVO PROFESIONAL
  ===================================================== */

  abrirNuevo(): void {

    this.editando = false;

    this.archivoCV = null;

    this.profesionalActual =
      this.nuevoProfesional();

    this.mostrarFormulario = true;

  }


  /* =====================================================
     EDITAR PROFESIONAL
  ===================================================== */

  editar(
    profesional: Profesional
  ): void {

    this.editando = true;

    this.archivoCV = null;


    this.profesionalActual = {

      ...profesional

    };


    this.mostrarFormulario = true;

  }


  /* =====================================================
     SELECCIONAR CURRÍCULUM
  ===================================================== */

  seleccionarCV(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }


    const archivo =
      input.files[0];


    /* SOLO PDF */

    if (
      archivo.type !==
      'application/pdf'
    ) {

      alert(
        'El currículum debe estar en formato PDF.'
      );

      input.value = '';

      return;

    }


    /* MÁXIMO 5 MB */

    if (
      archivo.size >
      5 * 1024 * 1024
    ) {

      alert(
        'El currículum no puede superar los 5 MB.'
      );

      input.value = '';

      return;

    }


    this.archivoCV =
      archivo;


    this.profesionalActual.cv =
      archivo.name;

  }


  /* =====================================================
     VER CURRÍCULUM
  ===================================================== */

  verCV(
    profesional: Profesional
  ): void {

    if (
      !profesional.cvUrl
    ) {

      alert(
        'Este profesional no tiene un currículum disponible.'
      );

      return;

    }


    window.open(

      profesional.cvUrl,

      '_blank'

    );

  }


  /* =====================================================
     GUARDAR PROFESIONAL
  ===================================================== */

  async guardar(): Promise<void> {


    /* VALIDACIÓN */

    if (

      !this.profesionalActual.nombres.trim() ||

      !this.profesionalActual.apellidos.trim() ||

      !this.profesionalActual.ci.trim()

    ) {

      alert(
        'Complete nombres, apellidos y CI.'
      );

      return;

    }


    try {

      this.cargando = true;


      /* ==========================================
         FORMDATA
      ========================================== */

      const datos =
        new FormData();


      datos.append(

        'nombres',

        this.profesionalActual.nombres.trim()

      );


      datos.append(

        'apellidos',

        this.profesionalActual.apellidos.trim()

      );


      datos.append(

        'ci',

        this.profesionalActual.ci.trim()

      );


      datos.append(

        'telefono',

        this.profesionalActual.telefono || ''

      );


      datos.append(

        'correo',

        this.profesionalActual.correo || ''

      );


      datos.append(

        'especialidad',

        this.profesionalActual.especialidad || ''

      );


      datos.append(

        'nivelIngles',

        this.profesionalActual.nivelIngles || ''

      );


      datos.append(

        'quechua',

        this.profesionalActual.quechua || ''

      );


      datos.append(

        'experiencia',

        this.profesionalActual.experiencia || ''

      );


      /* ==========================================
         CURRÍCULUM
      ========================================== */

      if (
        this.archivoCV
      ) {

        datos.append(

          'cv',

          this.archivoCV

        );

      }


      let respuesta: Response;


      /* ==========================================
         EDITAR
      ========================================== */

      if (
        this.editando
      ) {

        respuesta =
          await fetch(

            `${this.API}/${this.profesionalActual.id}`,

            {

              method: 'PUT',

              body: datos

            }

          );

      }


      /* ==========================================
         NUEVO
      ========================================== */

      else {

        respuesta =
          await fetch(

            this.API,

            {

              method: 'POST',

              body: datos

            }

          );

      }


      const resultado =
        await respuesta.json();


      /* ==========================================
         ERROR SERVIDOR
      ========================================== */

      if (
        !respuesta.ok
      ) {

        alert(

          resultado.mensaje ||

          'Ocurrió un error al guardar.'

        );

        return;

      }


      /* ==========================================
         MENSAJE
      ========================================== */

      if (
        this.editando
      ) {

        alert(
          'Profesional actualizado correctamente.'
        );

      }

      else {

        alert(
          'Profesional registrado correctamente.'
        );

      }


      /* CERRAR FORMULARIO */

      this.cancelar();


      /*
       VOLVER A CONSULTAR SQLITE
      */

      await this.cargarProfesionales();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'ERROR GUARDANDO PROFESIONAL:',
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


  /* =====================================================
     ELIMINAR PROFESIONAL
  ===================================================== */

  async eliminar(
    id: number
  ): Promise<void> {


    const confirmar =
      confirm(

        '¿Está seguro de eliminar este profesional?'

      );


    if (
      !confirmar
    ) {

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


      if (
        !respuesta.ok
      ) {

        alert(

          resultado.mensaje ||

          'No se pudo eliminar el profesional.'

        );

        return;

      }


      alert(
        'Profesional eliminado correctamente.'
      );


      /*
       RECARGAMOS DESDE SQLITE
      */

      await this.cargarProfesionales();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'ERROR ELIMINANDO PROFESIONAL:',
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


  /* =====================================================
     CANCELAR
  ===================================================== */

  cancelar(): void {

    this.mostrarFormulario = false;

    this.editando = false;

    this.archivoCV = null;

    this.profesionalActual =
      this.nuevoProfesional();

  }


  /* =====================================================
     BUSCADOR
  ===================================================== */

  get profesionalesFiltrados():
    Profesional[] {


    const texto =

      this.busqueda

        .toLowerCase()

        .trim();


    if (
      !texto
    ) {

      return this.profesionales;

    }


    return this.profesionales.filter(

      profesional => {


        const contenido =

          `

          ${profesional.nombres}

          ${profesional.apellidos}

          ${profesional.ci}

          ${profesional.especialidad}

          ${profesional.telefono}

          ${profesional.correo}

          `

            .toLowerCase();


        return contenido.includes(
          texto
        );

      }

    );

  }

}