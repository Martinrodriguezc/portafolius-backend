import { Request, Response } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Obtener cantidad total de usuarios actuales
    const totalUsersResult = await pool.query(
      "SELECT COUNT(*) as total FROM users"
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].total);

    // 2. Obtener cantidad de usuarios creados en la última semana
    const usersLastWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    const usersLastWeek = parseInt(usersLastWeekResult.rows[0].count);

    // 3. Obtener cantidad de usuarios creados en la semana anterior a la última
    const usersPreviousWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
    `);
    const usersPreviousWeek = parseInt(usersPreviousWeekResult.rows[0].count);

    // 4. Calcular el porcentaje de crecimiento de usuarios
    let userGrowthPercentage = 0;
    if (usersPreviousWeek > 0) {
      userGrowthPercentage = ((usersLastWeek - usersPreviousWeek) / usersPreviousWeek) * 100;
    } else if (usersLastWeek > 0) {
      userGrowthPercentage = 100;
    }

    // 5. Obtener cantidad total de estudios
    const totalStudiesResult = await pool.query(
      "SELECT COUNT(*) as total FROM study"
    );
    const totalStudies = parseInt(totalStudiesResult.rows[0].total);

    // 6. Obtener cantidad de estudios creados en la última semana
    const studiesLastWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM study
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    const studiesLastWeek = parseInt(studiesLastWeekResult.rows[0].count);

    // 7. Obtener cantidad de estudios creados en la semana anterior a la última
    const studiesPreviousWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM study
      WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'
    `);
    const studiesPreviousWeek = parseInt(studiesPreviousWeekResult.rows[0].count);

    // 8. Calcular el porcentaje de crecimiento de estudios
    let studyGrowthPercentage = 0;
    if (studiesPreviousWeek > 0) {
      studyGrowthPercentage = ((studiesLastWeek - studiesPreviousWeek) / studiesPreviousWeek) * 100;
    } else if (studiesLastWeek > 0) {
      studyGrowthPercentage = 100;
    }

    // 9. Obtener distribución de estudios por estado
    const studyStatusDistributionResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM study
      GROUP BY status
    `);
    
    // 10. Obtener cantidad total de evaluaciones
    const totalEvaluationsResult = await pool.query(
      "SELECT COUNT(*) as total FROM evaluation_form"
    );
    const totalEvaluations = parseInt(totalEvaluationsResult.rows[0].total);

    // 11. Obtener cantidad de evaluaciones creadas en la última semana
    const evaluationsLastWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM evaluation_form
      WHERE submitted_at >= NOW() - INTERVAL '7 days'
    `);
    const evaluationsLastWeek = parseInt(evaluationsLastWeekResult.rows[0].count);

    // 12. Obtener cantidad de evaluaciones creadas en la semana anterior a la última
    const evaluationsPreviousWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM evaluation_form
      WHERE submitted_at >= NOW() - INTERVAL '14 days' AND submitted_at < NOW() - INTERVAL '7 days'
    `);
    const evaluationsPreviousWeek = parseInt(evaluationsPreviousWeekResult.rows[0].count);

    // 13. Calcular el porcentaje de crecimiento de evaluaciones
    let evaluationGrowthPercentage = 0;
    if (evaluationsPreviousWeek > 0) {
      evaluationGrowthPercentage = ((evaluationsLastWeek - evaluationsPreviousWeek) / evaluationsPreviousWeek) * 100;
    } else if (evaluationsLastWeek > 0) {
      evaluationGrowthPercentage = 100;
    }

    // 14. Obtener distribución de usuarios por rol
    const userRoleDistributionResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    // 15. Enviar la respuesta con todos los datos
    logger.info("Datos del dashboard obtenidos exitosamente");
    res.status(200).json({
      users: {
        total: totalUsers,
        newLastWeek: usersLastWeek,
        growthPercentage: userGrowthPercentage,
        roleDistribution: userRoleDistributionResult.rows
      },
      studies: {
        total: totalStudies,
        newLastWeek: studiesLastWeek,
        growthPercentage: studyGrowthPercentage,
        statusDistribution: studyStatusDistributionResult.rows
      },
      evaluations: {
        total: totalEvaluations,
        newLastWeek: evaluationsLastWeek,
        growthPercentage: evaluationGrowthPercentage
      }
    });
  } catch (error) {
    logger.error("Error al obtener datos del dashboard", { error });
    res.status(500).json({ msg: "Error al obtener datos del dashboard" });
  }
};
