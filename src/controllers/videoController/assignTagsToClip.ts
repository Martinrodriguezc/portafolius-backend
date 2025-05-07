import { Request, Response } from "express";
import logger from "../../config/logger";
import { pool } from "../../config/db";

export const assignTagsToClip = async (
    req: Request,
    res: Response
): Promise<void> => {
    const clipId = Number(req.params.clipId);
    const { tagIds, userId } = req.body;

    if (isNaN(clipId)) {
        res.status(400).json({ msg: "clipId inválido" });
        return;
    }
    if (!Array.isArray(tagIds)) {
        res.status(400).json({ msg: "Debe enviar un array de tagIds" });
        return;
    }

    try {
        const queries = tagIds.map((tagId: number) =>
            pool.query(
                `INSERT INTO clip_tag (clip_id, tag_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
                [clipId, tagId, userId]
            )
        );
        await Promise.all(queries);

        logger.info(`Etiquetas [${tagIds.join(",")}] asignadas al clip ${clipId}`);
        res.status(200).json({ msg: "Etiquetas asignadas correctamente" });
        return;
    } catch (err) {
        logger.error("Error al asignar etiquetas al clip:", err);
        res.status(500).json({ msg: "Error al asignar etiquetas al clip" });
        return;
    }
};
