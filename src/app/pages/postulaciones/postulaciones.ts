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
}


interface Oferta {
  id: number;
  cargo: string;
  empresaId: number;
  empresaNombre?: string;
  estado: string;
}


interface Postulacion {
  id: number;

  profesionalId: number;
  ofertaId: number;

  profesionalNombre?: string;
  profesionalCI?: string;

  ofertaCargo?: string;
  empresaNombre?: string;

  fechaPostulacion: string;

  estado: string;

  observaciones: string;

  fechaRegistro?: string;
}


@Component({
  selector: 'app-postulaciones',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './postulaciones.html',
  styleUrl: './postulaciones.css'
})

export class Postulaciones implements OnInit {

  private API_POSTULACIONES =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/postulaciones';

  private API_PROFESIONALES =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/profesionales';

  private API_OFERTAS =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/ofertas';


  postulaciones: Postulacion[] = [];

  profesionales: Profesional[] = [];

  ofertas: Oferta[] = [];


  postulacionActual: Postulacion =
    this.nuevaPostulacion();


  mostrarFormulario = false;

  editando = false;

  busqueda = '';

  cargando = false;


  constructor(
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.cargarDatosIniciales();

  }


  async cargarDatosIniciales(): Promise<void> {

    await Promise.all([
      this.cargarProfesionales(),
      this.cargarOfertas(),
      this.cargarPostulaciones()
    ]);

  }


  nuevaPostulacion(): Postulacion {

    return {

      id: 0,

      profesionalId: 0,

      ofertaId: 0,

      fechaPostulacion:
        this.fechaHoy(),

      estado: 'Postulada',

      observaciones: ''

    };

  }


  fechaHoy(): string {

    const hoy =
      new Date();

    const year =
      hoy.getFullYear();

    const month =
      String(
        hoy.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        hoy.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;

  }


  /* ==========================================
     CARGAR PROFESIONALES
  ========================================== */

  async cargarProfesionales(): Promise<void> {

    try {

      const respuesta =
        await fetch(
          this.API_PROFESIONALES,
          {
            cache: 'no-store'
          }
        );


      if (!respuesta.ok) {

        throw new Error(
          'No se pudieron cargar los profesionales.'
        );

      }


      const datos =
        await respuesta.json();


      this.profesionales =
        Array.isArray(datos)
          ? [...datos]
          : [];


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error cargando profesionales:',
        error
      );

    }

  }


  /* ==========================================
     CARGAR OFERTAS
  ========================================== */

  async cargarOfertas(): Promise<void> {

    try {

      const respuesta =
        await fetch(
          this.API_OFERTAS,
          {
            cache: 'no-store'
          }
        );


      if (!respuesta.ok) {

        throw new Error(
          'No se pudieron cargar las ofertas.'
        );

      }


      const datos =
        await respuesta.json();


      this.ofertas =
        Array.isArray(datos)
          ? [...datos]
          : [];


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error cargando ofertas:',
        error
      );

    }

  }


  /* ==========================================
     CARGAR POSTULACIONES
  ========================================== */

  async cargarPostulaciones(): Promise<void> {

    try {

      this.cargando = true;


      const respuesta =
        await fetch(
          this.API_POSTULACIONES,
          {
            cache: 'no-store'
          }
        );


      if (!respuesta.ok) {

        throw new Error(
          `Error servidor: ${respuesta.status}`
        );

      }


      const datos =
        await respuesta.json();


      console.log(
        'POSTULACIONES RECIBIDAS:',
        datos
      );


      this.postulaciones =
        Array.isArray(datos)
          ? [...datos]
          : [];


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error cargando postulaciones:',
        error
      );


      this.postulaciones = [];

      this.cdr.detectChanges();


      alert(
        'No se pudieron cargar las postulaciones.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* ==========================================
     NUEVA
  ========================================== */

  abrirNuevo(): void {

    if (
      this.profesionales.length === 0
    ) {

      alert(
        'Primero debe registrar al menos un profesional.'
      );

      return;

    }


    if (
      this.ofertas.length === 0
    ) {

      alert(
        'Primero debe registrar al menos una oferta laboral.'
      );

      return;

    }


    this.editando = false;

    this.postulacionActual =
      this.nuevaPostulacion();

    this.mostrarFormulario = true;

  }


  /* ==========================================
     EDITAR
  ========================================== */

  editar(
    postulacion: Postulacion
  ): void {

    this.editando = true;


    this.postulacionActual = {
      ...postulacion
    };


    this.mostrarFormulario = true;

  }


  /* ==========================================
     GUARDAR
  ========================================== */

  async guardar(): Promise<void> {

    if (
      !this.postulacionActual.profesionalId
    ) {

      alert(
        'Seleccione un profesional.'
      );

      return;

    }


    if (
      !this.postulacionActual.ofertaId
    ) {

      alert(
        'Seleccione una oferta laboral.'
      );

      return;

    }


    if (
      !this.postulacionActual.fechaPostulacion
    ) {

      alert(
        'Ingrese la fecha de postulaciÃ³n.'
      );

      return;

    }


    try {

      this.cargando = true;


      const datos = {

        profesionalId:
          Number(
            this.postulacionActual.profesionalId
          ),

        ofertaId:
          Number(
            this.postulacionActual.ofertaId
          ),

        fechaPostulacion:
          this.postulacionActual.fechaPostulacion,

        estado:
          this.postulacionActual.estado,

        observaciones:
          this.postulacionActual.observaciones || ''

      };


      let respuesta: Response;


      if (
        this.editando
      ) {

        respuesta =
          await fetch(

            `${this.API_POSTULACIONES}/${this.postulacionActual.id}`,

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

      else {

        respuesta =
          await fetch(

            this.API_POSTULACIONES,

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
          'No se pudo guardar la postulaciÃ³n.'
        );

        return;

      }


      if (
        this.editando
      ) {

        alert(
          'PostulaciÃ³n actualizada correctamente.'
        );

      }

      else {

        alert(
          'PostulaciÃ³n registrada correctamente.'
        );

      }


      this.cancelar();


      await this.cargarPostulaciones();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error guardando postulaciÃ³n:',
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


  /* ==========================================
     ELIMINAR
  ========================================== */

  async eliminar(
    id: number
  ): Promise<void> {

    const confirmar =
      confirm(
        'Â¿EstÃ¡ seguro de eliminar esta postulaciÃ³n?'
      );


    if (!confirmar) {

      return;

    }


    try {

      this.cargando = true;


      const respuesta =
        await fetch(

          `${this.API_POSTULACIONES}/${id}`,

          {
            method: 'DELETE'
          }

        );


      const resultado =
        await respuesta.json();


      if (!respuesta.ok) {

        alert(
          resultado.mensaje ||
          'No se pudo eliminar la postulaciÃ³n.'
        );

        return;

      }


      alert(
        'PostulaciÃ³n eliminada correctamente.'
      );


      await this.cargarPostulaciones();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error eliminando postulaciÃ³n:',
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


  /* ==========================================
     CANCELAR
  ========================================== */

  cancelar(): void {

    this.mostrarFormulario = false;

    this.editando = false;

    this.postulacionActual =
      this.nuevaPostulacion();

  }


  /* ==========================================
     BUSCADOR
  ========================================== */

  get postulacionesFiltradas():
    Postulacion[] {

    const texto =
      this.busqueda
        .toLowerCase()
        .trim();


    if (!texto) {

      return this.postulaciones;

    }


    return this.postulaciones.filter(

      postulacion => {

        const contenido =

          `
          ${postulacion.profesionalNombre}
          ${postulacion.profesionalCI}
          ${postulacion.ofertaCargo}
          ${postulacion.empresaNombre}
          ${postulacion.estado}
          ${postulacion.observaciones}
          `

            .toLowerCase();


        return contenido.includes(
          texto
        );

      }

    );

  }

}
