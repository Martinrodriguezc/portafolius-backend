export { getDashboardData } from './getDashboardData';
export { assignTeacherToStudent } from './assignTeacherToStudent';
export { getAssignments } from './getAssignments'; 
export {
  getUsuariosPorRol,
  getUsuariosPorMes,
  getEstudiosPorMes,
  getTasaFinalizacionEstudios,
  getTopProfesoresEvaluaciones,
  getVideoClipsPorMes,
  getMaterialPorTipo,
  getUsuariosPorPromedio
} from './metricas'; 

export { createProtocol } from './protocol/createProtocol';
export { getProtocolById } from './getProtocolById';
export { updateProtocol } from './protocol/updateProtocol';
export { autorizarProfesor } from './autorizarProfesor';
export { getProfesoresPendientes } from './getProfesoresPendientes';
export { rechazarProfesor } from './rechazarProfesor'; 