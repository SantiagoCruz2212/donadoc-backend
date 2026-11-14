/** Usuario autenticado, tal como viene del JWT del personal (typ: staff). */
export interface AuthUser {
  userId: string;
  organizacionId: string | null;
  rol: string;
}

export type Rol = 'SUPER_ADMIN' | 'ADMIN_ORG' | 'OPERADOR';
