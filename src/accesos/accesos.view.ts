import { Usuario } from '@users/entities/usuario.entity';

/** Vista pública de un acceso: nunca incluye el hash ni la clave. */
export class AccesoVista {
  id: string;
  correo: string;
  nombre: string;
  rol: string;
  perfil: string | null;
  estado: string;
  creadoEn: Date;
}

export function toAccesoVista(u: Usuario): AccesoVista {
  return { id: u.id, correo: u.correo, nombre: u.nombre, rol: u.rol, perfil: u.perfil, estado: u.estado, creadoEn: u.creadoEn };
}
