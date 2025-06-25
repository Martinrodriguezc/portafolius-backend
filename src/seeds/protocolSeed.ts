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

// ── 1) CARDÍACO ────────────────────────────────────────────
const CARDIACO_SECTIONS: ProtocolSectionDef[] = [
  {
    key: "adq",
    name: "Image Generation",
    order: 1,
    items: [
      { key: "PSL", label: "Parasternal Longitudinal", scale: "0-5", max: 5 },
      { key: "PSS", label: "Parasternal Short",       scale: "0-5", max: 5 },
      { key: "A4C", label: "Apical 4C",               scale: "0-5", max: 5 },
      { key: "SC",  label: "Subcostal",               scale: "0-5", max: 5 },
      { key: "IVC", label: "Inferior Vena Cava",      scale: "0-5", max: 5 },
    ],
  },
  {
    key: "int",
    name: "Overall Quality",
    order: 2,
    items: [
      { key: "LV",     label: "LV Function",   scale: "binary", max: 1 },
      { key: "RV",     label: "RV Function",   scale: "binary", max: 1 },
      { key: "Volume", label: "Volume Status", scale: "binary", max: 1 },
      { key: "Peric",  label: "Pericardium",   scale: "binary", max: 1 },
    ],
  },
];

// ── 2) PULMÓN ──────────────────────────────────────────────
const PULMON_SECTIONS: ProtocolSectionDef[] = [
  {
    key: "adq",
    name: "Image Generation",
    order: 1,
    items: [
      { key: "L1", label: "L1", scale: "0-5", max: 5 },
      { key: "L2", label: "L2", scale: "0-5", max: 5 },
      { key: "L3", label: "L3", scale: "0-5", max: 5 },
      { key: "L4", label: "L4", scale: "0-5", max: 5 },
      { key: "R1", label: "R1", scale: "0-5", max: 5 },
      { key: "R2", label: "R2", scale: "0-5", max: 5 },
      { key: "R3", label: "R3", scale: "0-5", max: 5 },
      { key: "R4", label: "R4", scale: "0-5", max: 5 },
    ],
  },
  {
    key: "int",
    name: "Image Interpretation",
    order: 2,
    items: [
      { key: "Neumotorax",            label: "Neumotórax",            scale: "binary", max: 1 },
      { key: "Síndrome Intersticial", label: "Síndrome Intersticial",  scale: "binary", max: 1 },
      { key: "Consolidación",         label: "Consolidación",         scale: "binary", max: 1 },
      { key: "Derrame Pleural",       label: "Derrame Pleural",       scale: "binary", max: 1 },
    ],
  },
];

// ── 3) E-FAST (Checklist) ─────────────────────────────────
const EFAST_SECTIONS: ProtocolSectionDef[] = [
  {
    key: "hepatorenal",
    name: "Hepatorenal Space",
    order: 1,
    items: [
      "Orients image with the liver to the left and kidney to the right",
      "Adjusts depth so the image ends just below the kidney",
      "Sets gain appropriately",
      "Visualizes the interface between the liver and kidney clearly",
      "Sweeps through the entire kidney",
      "Visualizes the caudal tip of the liver clearly",
    ].map<ProtocolItemDef>((label, i) => ({
      key: `hep_${i}`,
      label,
      scale: "binary",
      max: 1,
    })),
  },
  {
    key: "splenorenal",
    name: "Splenorenal Space",
    order: 2,
    items: [
      "Orients image with the spleen to the left and kidney to the right",
      "Adjusts depth so the image ends just below the kidney",
      "Sets gain appropriately",
      "Visualizes the interface between the spleen and kidney clearly",
      "Sweeps through the entire kidney",
      "Visualizes space between diaphragm and spleen",
    ].map<ProtocolItemDef>((label, i) => ({
      key: `spl_${i}`,
      label,
      scale: "binary",
      max: 1,
    })),
  },
  {
    key: "pelvis",
    name: "Pelvis",
    order: 3,
    items: [
      "Adjusts depth so the image ends 4-5 cm below the bladder",
      "Sets gain such that the urine in the bladder appears black",
      "Visualizes the bladder in longitudinal section",
      "Scrolls through the entire bladder (longitudinal)",
      "Visualizes the bladder in transverse section",
      "Sweeps through the entire bladder (transverse)",
    ].map<ProtocolItemDef>((label, i) => ({
      key: `pel_${i}`,
      label,
      scale: "binary",
      max: 1,
    })),
  },
  {
    key: "pericardium",
    name: "Pericardium",
    order: 4,
    items: [
      "Orients apex of ventricles towards right of image",
      "Adjusts depth past deepest layer of pericardium",
      "Sets gain such that blood appears black",
      "Optimizes view using adjuncts",
      "Visualizes anterior and posterior pericardium",
      "Sweeps through the entire heart",
    ].map<ProtocolItemDef>((label, i) => ({
      key: `per_${i}`,
      label,
      scale: "binary",
      max: 1,
    })),
  },
];

// ── 4) OTROS PROTOCOLOS: “Ventanas” 0–5 ───────────────────
const WINDOWS: Record<string,string[]> = {
  renal:            ["Riñón Derecho","Riñón Izquierdo","Vejiga"],
  vesicula:         ["Eje Largo","Eje Corto","Triada Portal"],
  aorta:            ["Aorta Torácica","Abdominal (Zona 1)","Abdominal (Zona 2)","Abdominal (Zona 3)"],
  tvp:              ["Safeno Femoral","VFS","VFC","Poplítea","Trifurcación"],
  ocular:           ["Ojo Derecho","Ojo Izquierdo"],
  "partes-blandas": ["Otra"],
  gastrointestinal: ["Obstrucción Intestinal","Ascitis","Neumoperitoneo"],
};
function makeVentanasSection(key: string, name: string, order = 1): ProtocolSectionDef {
  const items = (WINDOWS[key] || []).map<ProtocolItemDef>(w => ({
    key: w,
    label: w,
    scale: "0-5",
    max: 5,
  }));
  return { key: "ventanas", name, order, items };
}

// ── 5) Arreglo final de protocolos ────────────────────────
const PROTOCOLS: ProtocolDef[] = [
  { key: "cardiaco",        name: "Cardíaco",         sections: CARDIACO_SECTIONS },
  { key: "pulmon",          name: "Pulmón",           sections: PULMON_SECTIONS },
  { key: "e-fast",          name: "E-FAST",           sections: EFAST_SECTIONS },
  { key: "renal",           name: "Renal",            sections: [ makeVentanasSection("renal", "Ventanas") ] },
  { key: "vesicula",        name: "Vesícula",         sections: [ makeVentanasSection("vesicula", "Ventanas") ] },
  { key: "aorta",           name: "Aorta",            sections: [ makeVentanasSection("aorta", "Ventanas") ] },
  { key: "tvp",             name: "TVP",              sections: [ makeVentanasSection("tvp", "Ventanas") ] },
  { key: "ocular",          name: "Ocular",           sections: [ makeVentanasSection("ocular", "Ventanas") ] },
  { key: "partes-blandas",  name: "Partes Blandas",   sections: [ makeVentanasSection("partes-blandas", "Ventanas") ] },
  { key: "gastrointestinal",name: "Gastro Intestinal",sections: [ makeVentanasSection("gastrointestinal", "Ventanas") ] },
];

// ── 6) Función de seed ────────────────────────────────────
export const seedProtocols = async (): Promise<void> => {
  try {
    for (const p of PROTOCOLS) {
      const protRes = await pool.query<{ id: number }>(
        `INSERT INTO protocol(key, name)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING
         RETURNING id;`,
        [p.key, p.name]
      );
      const protocolId = protRes.rows[0]?.id
        ?? (await pool.query<{ id: number }>(
             `SELECT id FROM protocol WHERE key = $1`,
             [p.key]
           )).rows[0].id;

      for (const sec of p.sections) {
        const secRes = await pool.query<{ id: number }>(
          `INSERT INTO protocol_section(protocol_id, key, name, sort_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (protocol_id, key) DO NOTHING
           RETURNING id;`,
          [protocolId, sec.key, sec.name, sec.order]
        );
        const sectionId = secRes.rows[0]?.id
          ?? (await pool.query<{ id: number }>(
               `SELECT id FROM protocol_section
                WHERE protocol_id=$1 AND key=$2`,
               [protocolId, sec.key]
             )).rows[0].id;

        for (const it of sec.items) {
          await pool.query(
            `INSERT INTO protocol_item(section_id, key, label, score_scale, max_score)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (section_id, key) DO NOTHING;`,
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

