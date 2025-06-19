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
    key: "adq",
    name: "Image Generation",
    order: 1,
    items: [
      { key: "PSL", label: "Parasternal Longitudinal", scale: "0-5", max: 5 },
      { key: "PSS", label: "Parasternal Short", scale: "0-5", max: 5 },
      { key: "A4C", label: "Apical 4C", scale: "0-5", max: 5 },
      { key: "SC", label: "Subcostal", scale: "0-5", max: 5 },
      { key: "IVC", label: "Inferior Vena Cava", scale: "0-5", max: 5 },
    ],
  },
  {
    key: "int",
    name: "Overall Quality",
    order: 2,
    items: [
      { key: "LV", label: "LV Function", scale: "binary", max: 1 },
      { key: "RV", label: "RV Function", scale: "binary", max: 1 },
      { key: "Volume", label: "Volume Status", scale: "binary", max: 1 },
      { key: "Peric", label: "Pericardium", scale: "binary", max: 1 },
    ],
  },
];

const PROTOCOLS: ProtocolDef[] = [
  { key: "cardiaco", name: "Cardíaco", sections: CARDIACO_SECTIONS },
  {
    key: "pulmon", name: "Pulmón", sections: [
      {
        key: "adq",
        name: "Image Generation",
        order: 1,
        items: Array.from({ length: 8 }).map((_, i) => ({
          key: `Z${i + 1}`,
          label: `Zona ${i + 1}`,
          scale: "0-5",
          max: 5,
        })),
      },
      {
        key: "int",
        name: "Image Interpretation",
        order: 2,
        items: [
          { key: "Neumotorax", label: "Neumotórax", scale: "binary", max: 1 },
          { key: "Derrame", label: "Derrame Pleural", scale: "binary", max: 1 },
          { key: "BLines", label: "B-Lines", scale: "binary", max: 1 },
          { key: "Consolid", label: "Consolidación", scale: "binary", max: 1 },
          { key: "Atelect", label: "Atelectasia", scale: "binary", max: 1 },
          { key: "Pleur", label: "Pleuritis", scale: "binary", max: 1 },
          { key: "Edema", label: "Edema Pulmonar", scale: "binary", max: 1 },
          { key: "Normal", label: "Normal", scale: "binary", max: 1 },
        ],
      },
    ]
  },
];

export const seedProtocols = async (): Promise<void> => {
  try {
    for (const p of PROTOCOLS) {
      // choca sobre key, que SÍ tiene UNIQUE
      const protRes = await pool.query<{ id: number }>(`
    INSERT INTO protocol(key, name)
    VALUES ($1, $2)
    ON CONFLICT (key) DO NOTHING
    RETURNING id;
  `, [p.key, p.name]);

      const protocolId = protRes.rows[0]?.id
        // si no vino en RETURNING, buscamos por key
        ?? (await pool.query<{ id: number }>(
          `SELECT id FROM protocol WHERE key = $1`,
          [p.key]
        )).rows[0].id;

      // Secciones
      for (const sec of p.sections) {
        const secRes = await pool.query<{ id: number }>(`
          INSERT INTO protocol_section(protocol_id, key, name, sort_order)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (protocol_id, key) DO NOTHING
          RETURNING id;
        `, [protocolId, sec.key, sec.name, sec.order]);

        const sectionId = secRes.rows[0]?.id
          ?? (await pool.query<{ id: number }>(
            `SELECT id FROM protocol_section WHERE protocol_id=$1 AND key=$2`,
            [protocolId, sec.key]
          )).rows[0].id;

        // Ítems
        for (const it of sec.items) {
          await pool.query(`
            INSERT INTO protocol_item(section_id, key, label, score_scale, max_score)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (section_id, key) DO NOTHING;
          `, [sectionId, it.key, it.label, it.scale, it.max]);
        }
      }
    }

    logger.info("Seeds de protocolos cargados correctamente");
  } catch (error) {
    logger.error("Error al cargar seeds de protocolos", { error });
    throw error;
  }
};