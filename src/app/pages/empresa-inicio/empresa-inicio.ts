import {
  Component
} from '@angular/core';

import {
  AuthService
} from '../../services/auth.service';


@Component({

  selector:
    'app-empresa-inicio',

  imports: [],

  templateUrl:
    './empresa-inicio.html',

  styleUrl:
    './empresa-inicio.css'

})

export class EmpresaInicio {


  constructor(
    public auth:
      AuthService
  ) {}


}
