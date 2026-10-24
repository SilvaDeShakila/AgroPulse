import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../../types';
import { serverDb } from '../db/database';

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    if (req.user.role === 'super_admin') {
      return next(); // Super admin has full platform governance
    }

    if (!allowedRoles.includes(req.user.role)) {
      await serverDb.logAudit(
        'PERMISSION_VIOLATION',
        'ROUTE',
        req.path,
        req.user.id,
        req.user.role,
        `Attempted unauthorized action requiring [${allowedRoles.join(', ')}]`
      );

      return res.status(403).json({
        error: 'Forbidden',
        message: `Action requires one of the following permissions: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
      });
    }

    next();
  };
}

export function requireFarmOwnership(paramKey = 'farmId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    if (req.user.role === 'super_admin' || req.user.role === 'support_staff') {
      return next();
    }

    const farmId = req.params[paramKey] || req.body[paramKey] || (req.query[paramKey] as string);
    if (!farmId) {
      return next();
    }

    const farm = await serverDb.getFarmById(farmId);
    if (!farm) {
      return res.status(404).json({ error: 'NotFound', message: `Farm '${farmId}' not found.` });
    }

    const isOwner = farm.ownerId === req.user.id;
    const isAssigned = farm.assignedWorkers && farm.assignedWorkers.includes(req.user.id);

    if (!isOwner && !isAssigned) {
      await serverDb.logAudit(
        'PERMISSION_VIOLATION',
        'FARM',
        farmId,
        req.user.id,
        req.user.role,
        `Unauthorized access attempt to farm '${farm.name}' (${farm.id})`
      );

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not authorized to view or modify operations on this agricultural estate.',
      });
    }

    next();
  };
}
