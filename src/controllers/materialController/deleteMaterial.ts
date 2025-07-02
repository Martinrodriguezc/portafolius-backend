import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import logger from "../../config/logger";

/**
 * Elimina un material del sistema
 */
export async function deleteMaterial(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const materialId = parseInt(req.params.id);

    // Verificar que el material existe
    const materialCheck = await pool.query(
      "SELECT * FROM material WHERE id = $1",
      [materialId]
    );

    if (materialCheck.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "El material especificado no existe"
      });
      return;
    }

    // Eliminar el material
    await pool.query(
      "DELETE FROM material WHERE id = $1",
      [materialId]
    );
    
    res.status(200).json({
      success: true,
      message: "Material eliminado exitosamente"
    });
  } catch (error) {
    logger.error('Error al eliminar material', { error });
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el material',
      error: (error as Error).message
    });
  }
} 