import { Usuario } from '@users/entities/usuario.entity';

export class UsuarioVista {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  perfil: string | null;
}

export class SesionVista {
  accessToken: string;
  usuario: UsuarioVista;
}

export function toSesionVista(accessToken: string, u: Usuario): SesionVista {
  return { accessToken, usuario: { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, perfil: u.perfil } };
}
