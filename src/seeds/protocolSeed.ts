// src/seeds/protocolSeed.ts
import { pool } from "../config/db";
import logger from "../config/logger";

interface ProtocolItemDef {
  key: string;
  label: string;
  scale: "0-5" | "binary";
  max: number;
}

interface ProtocolSectionDef {
  key: string;
  name: string;
  order: number;
  items: ProtocolItemDef[];
}

interface ProtocolDef {
  key: string;
  name: string;
  sections: ProtocolSectionDef[];
}

const CARDIACO_SECTIONS: ProtocolSectionDef[] = [
  {
    key: 'adq',
    name: 'Image Generation',
    order: 1,
    items: [
      { key: 'PSL',  label: 'Parasternal Longitudinal', scale: '0-5', max: 5 },
      { key: 'PSS',  label: 'Parasternal Short',        scale: '0-5', max: 5 },
      { key: 'A4C',  label: 'Apical 4C',                scale: '0-5', max: 5 },
      { key: 'SC',   label: 'Subcostal',                scale: '0-5', max: 5 },
      { key: 'IVC',  label: 'Inferior Vena Cava',       scale: '0-5', max: 5 },
    ],
  },
  {
    key: 'int',
    name: 'Overall Quality',
    order: 2,
    items: [
      { key: 'LV',     label: 'LV Function',    scale: 'binary', max: 1 },
      { key: 'RV',     label: 'RV Function',    scale: 'binary', max: 1 },
      { key: 'Volume', label: 'Volume Status',  scale: 'binary', max: 1 },
      { key: 'Peric',  label: 'Pericardium',    scale: 'binary', max: 1 },
    ],
  },
];

const PROTOCOLS: ProtocolDef[] = [
  { key: 'cardiaco', name: 'Cardíaco', sections: CARDIACO_SECTIONS },
  { key: 'pulmon',   name: 'Pulmón',   sections: [
      {
        key: 'adq',
        name: 'Image Generation',
        order: 1,
        items: Array.from({ length: 8 }).map((_, i) => ({
          key: `Z${i + 1}`,
          label: `Zona ${i + 1}`,
          scale: '0-5',
          max: 5,
        })),
      },
      {
        key: 'int',
        name: 'Image Interpretation',
        order: 2,
        items: [
          { key: 'Neumotorax', label: 'Neumotórax',      scale: 'binary', max: 1 },
          { key: 'Derrame',    label: 'Derrame Pleural',  scale: 'binary', max: 1 },
          { key: 'BLines',     label: 'B-Lines',          scale: 'binary', max: 1 },
          { key: 'Consolid',   label: 'Consolidación',    scale: 'binary', max: 1 },
          { key: 'Atelect',    label: 'Atelectasia',      scale: 'binary', max: 1 },
          { key: 'Pleur',      label: 'Pleuritis',        scale: 'binary', max: 1 },
          { key: 'Edema',      label: 'Edema Pulmonar',   scale: 'binary', max: 1 },
          { key: 'Normal',     label: 'Normal',           scale: 'binary', max: 1 },
        ],
      },
    ]
  },
  // Por ahora los demás heredan CARDIACO
  { key: 'fate',  name: 'FATE',  sections: CARDIACO_SECTIONS },
  { key: 'fast',  name: 'FAST',  sections: CARDIACO_SECTIONS },
  { key: 'rush',  name: 'RUSH',  sections: CARDIACO_SECTIONS },
  { key: 'blue',  name: 'BLUE',  sections: CARDIACO_SECTIONS },
  { key: 'focus', name: 'FOCUS', sections: CARDIACO_SECTIONS },
];

export const seedProtocols = async (): Promise<void> => {
  try {
    for (const p of PROTOCOLS) {
      // Insertar protocolo con CAST
      const protRes = await pool.query<{ id: number }>(
        `INSERT INTO protocol(key,name)
           SELECT CAST($1 AS VARCHAR(50)), CAST($2 AS VARCHAR(100))
            WHERE NOT EXISTS (SELECT 1 FROM protocol WHERE key = CAST($1 AS VARCHAR(50)))
         RETURNING id;`,
        [p.key, p.name]
      );
      const protocolId =
        protRes.rows[0]?.id ??
        (
          await pool.query<{ id: number }>(
            `SELECT id FROM protocol WHERE key = CAST($1 AS VARCHAR(50))`,
            [p.key]
          )
        ).rows[0].id;

      for (const sec of p.sections) {
        // Insertar sección con CAST
        const secRes = await pool.query<{ id: number }>(
          `INSERT INTO protocol_section(protocol_id,key,name,sort_order)
             SELECT $1, CAST($2 AS VARCHAR(50)), CAST($3 AS VARCHAR(100)), $4
              WHERE NOT EXISTS (
                SELECT 1 FROM protocol_section
                 WHERE protocol_id = $1 AND key = CAST($2 AS VARCHAR(50))
              )
           RETURNING id;`,
          [protocolId, sec.key, sec.name, sec.order]
        );
        const sectionId =
          secRes.rows[0]?.id ??
          (
            await pool.query<{ id: number }>(
              `SELECT id FROM protocol_section WHERE protocol_id=$1 AND key=CAST($2 AS VARCHAR(50))`,
              [protocolId, sec.key]
            )
          ).rows[0].id;

        for (const it of sec.items) {
          // Insertar ítems con CAST
          await pool.query(
            `INSERT INTO protocol_item(section_id,key,label,score_scale,max_score)
               SELECT $1,
                      CAST($2 AS VARCHAR(100)),
                      CAST($3 AS VARCHAR(255)),
                      CAST($4 AS VARCHAR(20)),
                      $5
                WHERE NOT EXISTS (
                  SELECT 1 FROM protocol_item
                   WHERE section_id=$1 AND key = CAST($2 AS VARCHAR(100))
                );`,
            [sectionId, it.key, it.label, it.scale, it.max]
          );
        }
      }
    }

    logger.info("Seeds de protocolos cargados correctamente");
  } catch (error) {
    logger.error("Error al cargar seeds de protocolos", { error });
    throw error;
  }
};

