import { pool } from "../config/db";
import logger from "../config/logger";

interface ProtocolConfig {
  key: string;
  name: string;
  windows: string[];
  possibleDiagnoses?: {
    key: string;
    subdiagnoses?: {
      key: string;
      subSub?: string[];
      thirdOrder?: {
        key: string;
        values: string[];
      }[];
    }[];
  }[];
}

// Configuration for all protocols
const protocols: ProtocolConfig[] = [
  { key: "pulmon", name: "Pulmón", windows: ["R1","R2","R3","R4","L1","L2","L3","L4"], possibleDiagnoses: [
    { key: "NTX" },
    { key: "Síndrome Intersticial" },
    { key: "Derrame Pleural" },
    { key: "Consolidación" },
    { key: "Otro" }
  ], },
  { key: "renal", name: "Renal", windows: ["Riñón Derecho","Riñón Izquierdo","Vejiga"], possibleDiagnoses: [
    { key: "HUN" },
    { key: "Quiste Renal" },
    { key: "Jet Ureteral" },
    { key: "Globo Vesical" },
    { key: "Otro" }
  ], },
  { key: "vesicula", name: "Vesícula", windows: ["Eje Largo","Eje Corto","Triada Portal"], possibleDiagnoses: [
    { key: "Pared > 3 mm" },
    { key: "Colelitiasis" },
    { key: "Barro Biliar" },
    { key: "Hidrops" },
    { key: "Líquido Libre Perivesical" },
    { key: "Dilatación CBC" }
  ], },
  { key: "e-fast", name: "E-FAST", windows: ["Hepatorrenal","Esplenorrenal","Subxifoídeo","Suprapúbica","Pulmonar"], possibleDiagnoses: [
    { key: "Líquido Libre" },
    { key: "NTX" },
    { key: "Hemotórax" },
    { key: "Otro" }
  ], },
  { key: "aorta", name: "Aorta", windows: ["Aorta Torácica","Abdominal (Zona 1)","Abdominal (Zona 2)","Abdominal (Zona 3)"], possibleDiagnoses: [
    { key: "AAA" },
    { key: "Disección" },
    { key: "Otro" }
  ], },
  { key: "tvp", name: "TVP", windows: ["Safeno Femoral","VFS","VFC","Poplítea","Trifurcación"], possibleDiagnoses: [
    { key: "Trombo" },
    { key: "Quiste de Baker" },
    { key: "Hematoma" },
    { key: "Otro" }
  ], },
  { key: "ocular", name: "Ocular", windows: ["Ojo Derecho","Ojo Izquierdo"], possibleDiagnoses: [
    { key: "Desprendimiento de Retina" },
    { key: "Hemo Vítreo" },
    { key: "Trauma" },
    { key: "Dilatación VNO" }
  ], },
  { key: "partes-blandas", name: "Partes Blandas", windows: ["Otra"], possibleDiagnoses: [
    { key: "Empedrado" },
    { key: "Absceso" },
    { key: "Celulitis" },
    { key: "Cuerpo Extraño" },
    { key: "Derrame Articular" }
  ], },
  { key: "gastrointestinal", name: "Gastro Intestinal", windows: ["Otra"], possibleDiagnoses: [
    { key: "Obstrucción Intestinal" },
    { key: "Ascitis" },
    { key: "Neumoperitoneo" }
  ], },
  {
    key: "cardiaco",
    name: "Cardíaco",
    windows: [
      "PSLAX","RV Inflow","RV Outflow","PSSAX (Grandes Vasos)",
      "PSSAX (M. papilar)","PSSAX (Apex)","Apex Verdadero",
      "A4C","A5C","A2C","A3C","Subcostal Eje Largo","Subcostal Eje Corto","VCI"
    ],
    possibleDiagnoses: [
      {
        key: "FEVI",
        subdiagnoses: [
          { key: "<40%" },
          { key: ">40%" },
          { key: "VTI" }
        ]
      },
      {
        key: "Relacion VD:VI",
        subdiagnoses: [
          { key: "<0.6" },
          { key: "0.6 - 1" },
          { key: ">1" }
        ]
      },
      {
        key: "Aplanamiento Septal",
        subdiagnoses: [
          { key: "Sístole" },
          { key: "Diástole" },
          { key: "Ambos" }
        ]
      },
      {
        key: "Alt. Motilidad Segmentaria",
        subdiagnoses: [
          {
            key: "Anterior",
            subSub: ["Hipokinesia","Akinesia","Diskinesia"]
          },
          {
            key: "Lateral",
            subSub: ["Hipokinesia","Akinesia","Diskinesia"]
          },
          {
            key: "Inferior",
            subSub: ["Hipokinesia","Akinesia","Diskinesia"]
          },
          {
            key: "Septal",
            subSub: ["Hipokinesia","Akinesia","Diskinesia"]
          },
          {
            key: "Difusa",
            subSub: ["Hipokinesia","Akinesia","Diskinesia"]
          }
        ]
      },
      {
        key: "Valvulopatía",
        subdiagnoses: [
          {
            key: "Mitral",
            subSub: ["Insuficiencia","Estenosis"],
            thirdOrder: [
              { key: "Insuficiencia", values: ["Leve","Moderado","Severo"] },
              { key: "Estenosis", values: ["Leve","Moderado","Severo"] }
            ]
          },
          {
            key: "Aórtica",
            subSub: ["Insuficiencia","Estenosis"],
            thirdOrder: [
              { key: "Insuficiencia", values: ["Leve","Moderado","Severo"] },
              { key: "Estenosis", values: ["Leve","Moderado","Severo"] }
            ]
          },
          {
            key: "Tricuspídea",
            subSub: ["Insuficiencia","Estenosis"],
            thirdOrder: [
              { key: "Insuficiencia", values: ["Leve","Moderado","Severo"] },
              { key: "Estenosis", values: ["Leve","Moderado","Severo"] }
            ]
          },
          {
            key: "Pulmonar",
            subSub: ["Insuficiencia","Estenosis"],
            thirdOrder: [
              { key: "Insuficiencia", values: ["Leve","Moderado","Severo"] },
              { key: "Estenosis", values: ["Leve","Moderado","Severo"] }
            ]
          }
        ]
      },
      {
        key: "Derrame Pericárdico",
        subdiagnoses: [
          {
            key: "Sí",
            subSub: ["Taponamiento (+)"],
            thirdOrder: [
              { key: "Taponamiento (+)", values: ["Colapso VD diastólico","Colapso AD sistólico","Variación Flujo TransMitro-TransTricusp","VCI pletórica"] }
            ]
          },
          { key: "No" }
        ]
      },
      {
        key: "Ventrículo Derecho",
        subdiagnoses: [
          { key: "TAPSE" },
          { key: "S'" },
          { key: "mPAP" },
          { key: "RVSP/PSAP" },
          { key: "Notch Protosistólico" },
          { key: "TAPSE/PSAP" }
        ]
      },
      {
        key: "Masas, Dispositivos, Artefactos",
        subdiagnoses: [
          { key: "Vegetación" },
          { key: "Trombo" },
          { key: "Dispositivo" }
        ]
      },
      {
        key: "Función Diastólica",
        subdiagnoses: [
          { key: "Alt. Relajación" },
          { key: "Pseudonormal" },
          { key: "Restrictivo" },
          { key: "Aumento Presión Llenado VI" }
        ]
      }
    ]
  }
];

export const seedProtocolHierarchy = async (): Promise<void> => {
  // Ensure each protocol exists in the protocol table
  for (const p of protocols) {
    await pool.query(
      `INSERT INTO protocol (key, name)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING;`,
      [p.key, p.name]
    );
  }

  try {
    // Seed image_quality
    const imageQualities = ["Buena","Mala"];
    for (const name of imageQualities) {
      await pool.query(
        `INSERT INTO image_quality (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
        [name]
      );
    }

    // Seed final_diagnosis
    const finalDiagnoses = ["Verdadero(+)","Verdadero(–)","Falso(+)","Falso(–)"];
    for (const name of finalDiagnoses) {
      await pool.query(
        `INSERT INTO final_diagnosis (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
        [name]
      );
    }

    // Seed protocol hierarchy
    for (const proto of protocols) {
      // fetch protocol id
      const res = await pool.query(
        `SELECT id FROM protocol WHERE key=$1;`,
        [proto.key]
      );
      if (res.rowCount === 0) continue;
      const protocolId = res.rows[0].id;

      // windows
      for (const win of proto.windows) {
        const w = await pool.query(
          `INSERT INTO protocol_window (protocol_id,key,name) VALUES ($1,$2,$3)
           ON CONFLICT (protocol_id,key) DO NOTHING
           RETURNING id;`,
          [protocolId, win, win]
        );
        const windowId = w.rows[0]?.id ?? (
          await pool.query(
            `SELECT id FROM protocol_window WHERE protocol_id=$1 AND key=$2;`,
            [protocolId, win]
          )
        ).rows[0].id;

        // findings (always Positivo/Negativo)
        for (const findingKey of ["Positivo","Negativo"]) {
          const f = await pool.query(
            `INSERT INTO finding (window_id,key,name) VALUES ($1,$2,$3)
             ON CONFLICT (window_id,key) DO NOTHING
             RETURNING id;`,
            [windowId, findingKey, findingKey]
          );
          const findingId = f.rows[0]?.id ?? (
            await pool.query(
              `SELECT id FROM finding WHERE window_id=$1 AND key=$2;`,
              [windowId, findingKey]
            )
          ).rows[0].id;

          // possible diagnoses
          const pdList = proto.possibleDiagnoses || [];
          for (const pd of pdList) {
            const pdRes = await pool.query(
              `INSERT INTO possible_diagnosis (finding_id,key,name) VALUES ($1,$2,$3)
               ON CONFLICT (finding_id,key) DO NOTHING
               RETURNING id;`,
              [findingId, pd.key, pd.key]
            );
            // No subdiagnosis insertion here
          }
        }
      }
      // Seed subdiagnoses and deeper levels only once per possible_diagnosis
      if (proto.possibleDiagnoses) {
        for (const pd of proto.possibleDiagnoses) {
          // fetch one possible_diagnosis id for this key under current protocol
          const pdRows = await pool.query(
            `SELECT pd.id FROM possible_diagnosis pd
             JOIN finding f ON f.id = pd.finding_id
             JOIN protocol_window w ON w.id = f.window_id
             WHERE pd.key = $1 AND w.protocol_id = $2
             LIMIT 1;`,
            [pd.key, protocolId]
          );
          if (pdRows.rowCount === 0) continue;
          const pdId = pdRows.rows[0].id;

          if (pd.subdiagnoses) {
            for (const sd of pd.subdiagnoses) {
              // insert subdiagnosis
              const sdRes = await pool.query(
                `INSERT INTO subdiagnosis (possible_diagnosis_id, key, name)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (possible_diagnosis_id, key) DO NOTHING
                 RETURNING id;`,
                [pdId, sd.key, sd.key]
              );
              const sdId = sdRes.rows[0]?.id ?? (
                await pool.query(
                  `SELECT id FROM subdiagnosis
                   WHERE possible_diagnosis_id = $1 AND key = $2;`,
                  [pdId, sd.key]
                )
              ).rows[0].id;

              if (sd.subSub) {
                for (const ssub of sd.subSub) {
                  const ssubRes = await pool.query(
                    `INSERT INTO sub_subdiagnosis (subdiagnosis_id, key, name)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (subdiagnosis_id, key) DO NOTHING
                     RETURNING id;`,
                    [sdId, ssub, ssub]
                  );
                  const ssubId = ssubRes.rows[0]?.id ?? (
                    await pool.query(
                      `SELECT id FROM sub_subdiagnosis
                       WHERE subdiagnosis_id = $1 AND key = $2;`,
                      [sdId, ssub]
                    )
                  ).rows[0].id;

                  if (sd.thirdOrder) {
                    for (const to of sd.thirdOrder.filter(t => t.key === ssub)) {
                      for (const val of to.values) {
                        await pool.query(
                          `INSERT INTO third_order_diagnosis (sub_subdiagnosis_id, key, name)
                           VALUES ($1, $2, $3)
                           ON CONFLICT (sub_subdiagnosis_id, key) DO NOTHING;`,
                          [ssubId, val, val]
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    logger.info("Seeds de protocolos y sus componentes cargados correctamente");
  } catch (error) {
    logger.error("Error al ejecutar seeds de protocolos", { error });
    throw error;
  }
};