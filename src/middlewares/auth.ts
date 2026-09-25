import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";


export interface AuthenticatedRequest extends Request {
    organizationId?: string;
}


export function requireOrganization(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {

    try {

        const organizationId = req.header("X-Organizztion-Id");

        if (!organizationId) {
            return res.status(401).json({
                error: {

                    code: "MISSING_ORGANISATION",
                    message: "X-Organization-Id header is required",
                },
            });
        }

        const organization = await prisma.organization.findUnique({
            where: {
                id: organizationId,
            },
            select: {
                id: true,
            },
        });

        if (!organization) {
            return res.status(401).json({
                error: {
                    code: "INVALID_ORGANISATION",
                    message: "Organisation does not exist",

                },
            });
        }

        req.organizationId = organizationId;

        next();
    } catch (error) {
        next(error);
    }

}