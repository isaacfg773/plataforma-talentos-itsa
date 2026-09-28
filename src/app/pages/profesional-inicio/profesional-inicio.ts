import {
  Component
} from '@angular/core';

import {
  AuthService
} from '../../services/auth.service';


@Component({

  selector:
    'app-profesional-inicio',

  imports: [],

  templateUrl:
    './profesional-inicio.html',

  styleUrl:
    './profesional-inicio.css'

})

export class ProfesionalInicio {


  constructor(
    public auth:
      AuthService
  ) {}


}