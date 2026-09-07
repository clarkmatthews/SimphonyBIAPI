import type { Request, Response } from 'express';
import { ENDPOINTS } from '../../lib/bi/catalog';
import { dailyTotals, definitionPayload, latestBusDt, quarterHourTotals } from './store';

function endpointByOperation(operation: string) {
  return ENDPOINTS.find((item) => item.operation === operation || item.id === operation);
}

export async function handleBi(req: Request, res: Response) {
  const operation = String(req.params.operation || '');
  const endpoint = endpointByOperation(operation);
  if (!endpoint) {
    res.status(404).json({ error: 'unknown_operation', message: `Unsupported operation ${operation}` });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const locRef = body.locRef ? String(body.locRef) : undefined;
  const busDt = body.busDt ? String(body.busDt) : undefined;

  if (endpoint.kind === 'latestBusDt') {
    if (!locRef) {
      res.status(400).json({ error: 'missing_locRef', message: 'locRef is required.' });
      return;
    }
    res.json(await latestBusDt(locRef));
    return;
  }

  if (endpoint.kind === 'definition') {
    res.json(await definitionPayload(endpoint, locRef));
    return;
  }

  if (!locRef || !busDt) {
    res.status(400).json({ error: 'missing_params', message: 'locRef and busDt are required for totals.' });
    return;
  }

  if (endpoint.category === 'quarterHour') {
    res.json(await quarterHourTotals(endpoint, locRef, busDt));
    return;
  }

  res.json(await dailyTotals(endpoint, locRef, busDt));
}
