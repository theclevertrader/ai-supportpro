import { api, del, post, put } from "./client";
import type {
  AIToolsDTO, AnalyticsDTO, ConversationDTO, CustomerDTO, DashboardDTO, KBArticle, KBDTO,
  NotificationDTO, RangeKey, SecurityDTO, TicketDTO,
} from "./types";

export const dashboardApi = { get: () => api<DashboardDTO>("/api/dashboard") };
export const conversationsApi = { list: () => api<ConversationDTO[]>("/api/conversations") };
export const ticketsApi = { list: () => api<TicketDTO[]>("/api/tickets") };
export const customersApi = { list: () => api<CustomerDTO[]>("/api/customers") };
export const analyticsApi = { get: (range: RangeKey) => api<AnalyticsDTO>(`/api/analytics?range=${range}`) };
export const securityApi = { get: () => api<SecurityDTO>("/api/security") };
export const notificationsApi = { list: () => api<NotificationDTO[]>("/api/notifications") };
export const aiApi = { tools: () => api<AIToolsDTO>("/api/ai/tools") };
export const kbApi = {
  get: () => api<KBDTO>("/api/knowledge-base"),
  create: (a: Partial<KBArticle>) => post<{ ok: boolean; id: string }>("/api/knowledge-base", a),
  update: (a: Partial<KBArticle> & { id: string }) => put<{ ok: boolean }>(`/api/knowledge-base/${a.id}`, a),
  remove: (id: string) => del<{ ok: boolean }>(`/api/knowledge-base/${id}`),
};
