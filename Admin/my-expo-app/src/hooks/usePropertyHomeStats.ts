import { useEffect, useState, useCallback } from 'react';
import { ticketApi } from '../../utils/api';
import { MoveOutService } from '../../services/moveOutService';

/** Same property match as TicketsScreen so home count matches Open tab */
function filterTicketsByProperty(tickets: { propertyRef?: string | null }[], propertyMatchValues: string[]) {
  if (!propertyMatchValues.length) return tickets;
  return tickets.filter((t) => {
    const ref = (t.propertyRef || '').trim();
    if (!ref) return false;
    return propertyMatchValues.some(
      (v) => ref === v || ref.startsWith(v) || (v && (ref.includes(v) || v.includes(ref)))
    );
  });
}

/**
 * Fetches move-out request count and open ticket count for a single property.
 * Move-out count matches the "Requested" tab in Move Out Management (pending requests).
 * Open ticket count uses the same list + filter as TicketsScreen so the number matches what you see when you tap "Open Tickets".
 */
export function usePropertyHomeStats(propertyId: string | undefined, propertyName?: string, propertyUniqueId?: string) {
  const [moveOutCount, setMoveOutCount] = useState<number>(0);
  const [openTicketCount, setOpenTicketCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const propertyMatchValues = [propertyName, propertyUniqueId, propertyId].filter((x): x is string => typeof x === 'string' && x.length > 0);

      const requestedRes = await MoveOutService.getMoveOutRequests(undefined, 'pending');
      const allRequests = requestedRes.success && requestedRes.data?.requests ? requestedRes.data.requests : [];
      const tenantRequestedOnly = allRequests.filter((r: { type?: string }) => r.type !== 'admin_initiated');
      setMoveOutCount(tenantRequestedOnly.length);

      let openTicketsRes: { data?: { success?: boolean; tickets?: { propertyRef?: string | null }[] } } = { data: { success: true, tickets: [] } };
      if (propertyId || propertyName) {
        try {
          openTicketsRes = await ticketApi.get<{ success?: boolean; tickets?: { propertyRef?: string | null }[] }>('/api/tickets', { params: { tab: 'open' }, timeout: 10000 });
        } catch {
          openTicketsRes = { data: { success: true, tickets: [] } };
        }
      }
      const openList = openTicketsRes.data?.success && Array.isArray(openTicketsRes.data?.tickets) ? openTicketsRes.data.tickets : [];
      const filteredOpen = propertyMatchValues.length ? filterTicketsByProperty(openList, propertyMatchValues) : openList;
      setOpenTicketCount(filteredOpen.length);
    } catch {
      setMoveOutCount(0);
      setOpenTicketCount(0);
    } finally {
      setLoading(false);
    }
  }, [propertyId, propertyName, propertyUniqueId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { moveOutCount, openTicketCount, loading, refresh };
}
