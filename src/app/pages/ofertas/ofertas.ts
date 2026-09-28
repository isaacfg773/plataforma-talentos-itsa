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

}


interface Oferta {

  id: number;

  empresaId: number;

  empresaNombre?: string;

  cargo: string;

  descripcion: string;

  requisitos: string;

  competencias: string;

  experienciaRequerida: string;

  fechaPublicacion: string;

  fechaCierre: string;

  estado: string;

  fechaRegistro?: string;

}


@Component({

  selector: 'app-ofertas',

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './ofertas.html',

  styleUrl: './ofertas.css'

})


export class Ofertas implements OnInit {


  /* ============================================
     APIs
  ============================================ */

  private API_OFERTAS =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/ofertas';

  private API_EMPRESAS =
    'https://plataforma-talentos-itsa-production.up.railway.app/api/empresas';


  /* ============================================
     VARIABLES
  ============================================ */

  ofertas: Oferta[] = [];

  empresas: Empresa[] = [];

  ofertaActual: Oferta =
    this.nuevaOferta();

  mostrarFormulario = false;

  editando = false;

  busqueda = '';

  cargando = false;


  constructor(
    private cdr: ChangeDetectorRef
  ) {}


  /* ============================================
     AL INICIAR
  ============================================ */

  ngOnInit(): void {

    this.cargarEmpresas();

    this.cargarOfertas();

  }


  /* ============================================
     OBJETO VACÃO
  ============================================ */

  nuevaOferta(): Oferta {

    return {

      id: 0,

      empresaId: 0,

      cargo: '',

      descripcion: '',

      requisitos: '',

      competencias: '',

      experienciaRequerida: '',

      fechaPublicacion:
        this.fechaHoy(),

      fechaCierre: '',

      estado: 'Activa'

    };

  }


  /* ============================================
     FECHA DE HOY
  ============================================ */

  fechaHoy(): string {

    const hoy =
      new Date();

    const year =
      hoy.getFullYear();

    const month =
      String(
        hoy.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        hoy.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;

  }


  /* ============================================
     CARGAR EMPRESAS
  ============================================ */

  async cargarEmpresas():
    Promise<void> {

    try {

      const respuesta =
        await fetch(
          this.API_EMPRESAS,
          {
            cache: 'no-store'
          }
        );


      if (!respuesta.ok) {

        throw new Error(
          'No se pudieron cargar las empresas.'
        );

      }


      const datos =
        await respuesta.json();


      this.empresas =
        Array.isArray(datos)
          ? [...datos]
          : [];


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error cargando empresas:',
        error
      );

    }

  }


  /* ============================================
     CARGAR OFERTAS
  ============================================ */

  async cargarOfertas():
    Promise<void> {

    try {

      this.cargando = true;


      const respuesta =
        await fetch(
          this.API_OFERTAS,
          {
            method: 'GET',
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
        'OFERTAS RECIBIDAS:',
        datos
      );


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


      this.ofertas = [];


      this.cdr.detectChanges();


      alert(
        'No se pudieron cargar las ofertas laborales.'
      );

    }

    finally {

      this.cargando = false;

      this.cdr.detectChanges();

    }

  }


  /* ============================================
     NUEVA OFERTA
  ============================================ */

  abrirNuevo(): void {

    if (
      this.empresas.length === 0
    ) {

      alert(
        'Primero debe registrar al menos una empresa.'
      );

      return;

    }


    this.editando = false;

    this.ofertaActual =
      this.nuevaOferta();

    this.mostrarFormulario = true;

  }


  /* ============================================
     EDITAR
  ============================================ */

  editar(
    oferta: Oferta
  ): void {

    this.editando = true;


    this.ofertaActual = {

      ...oferta

    };


    this.mostrarFormulario = true;

  }


  /* ============================================
     GUARDAR
  ============================================ */

  async guardar():
    Promise<void> {


    /* VALIDACIONES */

    if (
      !this.ofertaActual.empresaId
    ) {

      alert(
        'Seleccione una empresa.'
      );

      return;

    }


    if (
      !this.ofertaActual.cargo.trim()
    ) {

      alert(
        'Ingrese el cargo requerido.'
      );

      return;

    }


    if (
      !this.ofertaActual.fechaPublicacion
    ) {

      alert(
        'Ingrese la fecha de publicaciÃ³n.'
      );

      return;

    }


    if (
      !this.ofertaActual.fechaCierre
    ) {

      alert(
        'Ingrese la fecha de cierre.'
      );

      return;

    }


    if (
      this.ofertaActual.fechaCierre <
      this.ofertaActual.fechaPublicacion
    ) {

      alert(
        'La fecha de cierre no puede ser anterior a la fecha de publicaciÃ³n.'
      );

      return;

    }


    try {

      this.cargando = true;


      const datos = {

        empresaId:
          Number(
            this.ofertaActual.empresaId
          ),

        cargo:
          this.ofertaActual.cargo.trim(),

        descripcion:
          this.ofertaActual.descripcion,

        requisitos:
          this.ofertaActual.requisitos,

        competencias:
          this.ofertaActual.competencias,

        experienciaRequerida:
          this.ofertaActual.experienciaRequerida,

        fechaPublicacion:
          this.ofertaActual.fechaPublicacion,

        fechaCierre:
          this.ofertaActual.fechaCierre,

        estado:
          this.ofertaActual.estado

      };


      let respuesta:
        Response;


      /* EDITAR */

      if (
        this.editando
      ) {

        respuesta =
          await fetch(

            `${this.API_OFERTAS}/${this.ofertaActual.id}`,

            {

              method:
                'PUT',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify(
                  datos
                )

            }

          );

      }


      /* NUEVA */

      else {

        respuesta =
          await fetch(

            this.API_OFERTAS,

            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify(
                  datos
                )

            }

          );

      }


      const resultado =
        await respuesta.json();


      if (
        !respuesta.ok
      ) {

        alert(

          resultado.mensaje ||

          'No se pudo guardar la oferta.'

        );

        return;

      }


      if (
        this.editando
      ) {

        alert(
          'Oferta actualizada correctamente.'
        );

      }

      else {

        alert(
          'Oferta laboral registrada correctamente.'
        );

      }


      this.cancelar();


      await this.cargarOfertas();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error guardando oferta:',
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
        'Â¿EstÃ¡ seguro de eliminar esta oferta laboral?'
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

          `${this.API_OFERTAS}/${id}`,

          {
            method:
              'DELETE'
          }

        );


      const resultado =
        await respuesta.json();


      if (
        !respuesta.ok
      ) {

        alert(

          resultado.mensaje ||

          'No se pudo eliminar la oferta.'

        );

        return;

      }


      alert(
        'Oferta eliminada correctamente.'
      );


      await this.cargarOfertas();


      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Error eliminando oferta:',
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

    this.ofertaActual =
      this.nuevaOferta();

  }


  /* ============================================
     BUSCADOR
  ============================================ */

  get ofertasFiltradas():
    Oferta[] {

    const texto =
      this.busqueda
        .toLowerCase()
        .trim();


    if (
      !texto
    ) {

      return this.ofertas;

    }


    return this.ofertas.filter(

      oferta => {


        const contenido =

          `
          ${oferta.cargo}
          ${oferta.empresaNombre}
          ${oferta.requisitos}
          ${oferta.competencias}
          ${oferta.experienciaRequerida}
          ${oferta.estado}
          `

            .toLowerCase();


        return contenido.includes(
          texto
        );

      }

    );

  }

}
