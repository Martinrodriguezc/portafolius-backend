import { pool } from "../config/db";
import logger from "../config/logger";

export const seedTagHierarchy = async (): Promise<void> => {
  try {
    // Primero, crear un usuario administrador si no existe
    await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       SELECT 
         'admin@example.com', 
         '$2b$10$X/QQRJkEL5K7vSHB8UCr3Ou3Lm1PlB9Upir.4MG6.hBuVpjwJ4G0e', -- contraseña: admin123
         'Admin', 
         'System', 
         'admin'
       WHERE NOT EXISTS (
         SELECT 1 FROM users WHERE email = 'admin@example.com'
       );`
    );

    // Obtener el ID del usuario administrador
    const { rows: adminRows } = await pool.query(
      `SELECT id FROM users WHERE email = 'admin@example.com'`
    );

    if (adminRows.length === 0) {
      throw new Error("No se pudo crear o encontrar el usuario administrador");
    }

    const adminId = adminRows[0].id;

    // Continuar con el resto del seed
    const organs = ["Hígado", "Riñón", "Vesícula biliar", "Bazo", "Páncreas"];
    for (const organ of organs) {
      await pool.query(
        `INSERT INTO organ (name)
         SELECT CAST($1 AS VARCHAR(100)) WHERE NOT EXISTS (
           SELECT 1 FROM organ WHERE name = CAST($1 AS VARCHAR(100))
         );`,
        [organ]
      );
    }

    const { rows: organRows } = await pool.query(`SELECT * FROM organ`);
    const organMap: Record<string, number> = {};
    organRows.forEach((o: any) => (organMap[o.name] = o.id));

    const structures = [
      // Hígado
      { name: "Lóbulo derecho", organ: "Hígado" },
      { name: "Lóbulo izquierdo", organ: "Hígado" },
      { name: "Vena porta", organ: "Hígado" },

      // Riñón
      { name: "Parénquima renal", organ: "Riñón" },
      { name: "Seno renal", organ: "Riñón" },

      // Vesícula biliar
      { name: "Pared", organ: "Vesícula biliar" },
      { name: "Lumen", organ: "Vesícula biliar" },

      // Bazo
      { name: "Parénquima esplénico", organ: "Bazo" },

      // Páncreas
      { name: "Cabeza", organ: "Páncreas" },
      { name: "Cuerpo", organ: "Páncreas" },
      { name: "Cola", organ: "Páncreas" },
    ];
    for (const s of structures) {
      await pool.query(
        `INSERT INTO structure (name, organ_id)
         SELECT CAST($1 AS VARCHAR(100)), $2 WHERE NOT EXISTS (
           SELECT 1 FROM structure WHERE name = CAST($1 AS VARCHAR(100)) AND organ_id = $2
         );`,
        [s.name, organMap[s.organ]]
      );
    }

    const { rows: structureRows } = await pool.query(`SELECT * FROM structure`);
    const structureMap: Record<string, number> = {};
    structureRows.forEach((s: any) => (structureMap[s.name] = s.id));

    const conditions = [
      // Hígado
      { name: "Quiste", structure: "Lóbulo derecho" },
      { name: "Esteatosis", structure: "Lóbulo derecho" },
      { name: "Hemangioma", structure: "Lóbulo izquierdo" },
      { name: "Nódulo focal", structure: "Lóbulo izquierdo" },
      { name: "Hepatomegalia", structure: "Lóbulo derecho" },
      { name: "Normal", structure: "Lóbulo derecho" },

      // Riñón
      { name: "Litiasis renal", structure: "Seno renal" },
      { name: "Hidronefrosis", structure: "Seno renal" },
      { name: "Quiste renal", structure: "Parénquima renal" },
      { name: "Atrofia cortical", structure: "Parénquima renal" },
      { name: "Normal", structure: "Parénquima renal" },

      // Vesícula biliar
      { name: "Colelitiasis", structure: "Lumen" },
      { name: "Colecistitis", structure: "Pared" },
      { name: "Pólipo vesicular", structure: "Lumen" },
      { name: "Normal", structure: "Pared" },

      // Bazo
      { name: "Esplenomegalia", structure: "Parénquima esplénico" },
      { name: "Quiste esplénico", structure: "Parénquima esplénico" },
      { name: "Normal", structure: "Parénquima esplénico" },

      // Páncreas
      { name: "Pancreatitis", structure: "Cabeza" },
      { name: "Páncreas normal", structure: "Cuerpo" },
      { name: "Quiste pancreático", structure: "Cola" },
    ];
    for (const c of conditions) {
      await pool.query(
        `INSERT INTO condition (name, structure_id)
         SELECT CAST($1 AS VARCHAR(100)), $2 WHERE NOT EXISTS (
           SELECT 1 FROM condition WHERE name = CAST($1 AS VARCHAR(100)) AND structure_id = $2
         );`,
        [c.name, structureMap[c.structure]]
      );
    }

    const { rows: conditionRows } = await pool.query(`SELECT * FROM condition`);
    const conditionMap: Record<string, number> = {};
    conditionRows.forEach(
      (c: any) => (conditionMap[`${c.name}-${c.structure_id}`] = c.id)
    );

    const tags = conditions.map((cond) => ({
      name: `${cond.name} (${cond.structure})`,
      condition: cond.name,
      structure: cond.structure,
    }));

    for (const t of tags) {
      const key = `${t.condition}-${structureMap[t.structure]}`;
      if (!conditionMap[key]) {
        logger.warn(`No se encontró condición para: ${key}`);
        continue;
      }

      await pool.query(
        `INSERT INTO tag (name, condition_id, created_by)
         SELECT CAST($1 AS VARCHAR(250)), $2, $3 WHERE NOT EXISTS (
           SELECT 1 FROM tag WHERE name = CAST($1 AS VARCHAR(250))
         );`,
        [t.name, conditionMap[key], adminId]
      );
    }

    logger.info("Seeds de tags jerárquicos cargados correctamente");
  } catch (error) {
    logger.error("Error al cargar seeds de tags", { error });
    throw error;
  }
};
