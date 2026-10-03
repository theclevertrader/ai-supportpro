import { api, del, post, put } from "./client";
import type {
  AIToolsDTO, AnalyticsDTO, ConversationDTO, CustomerDTO, DashboardDTO, KBArticle, KBDTO,
  NotificationDTO, RangeKey, SecurityDTO, TicketDTO, UserProfileDTO,
} from "./types";

export const dashboardApi = { get: () => api<DashboardDTO>("/api/dashboard") };
export const conversationsApi = { list: () => api<ConversationDTO[]>("/api/conversations") };
export const ticketsApi = {
  list: () => api<TicketDTO[]>("/api/tickets"),
  create: (t: Partial<TicketDTO>) => post<TicketDTO>("/api/tickets", t),
  update: (id: string, patch: Partial<TicketDTO>) => put<{ ok: boolean; id: string; status: string }>(`/api/tickets/${id}`, patch),
};
export const customersApi = { list: () => api<CustomerDTO[]>("/api/customers") };
export const analyticsApi = { get: (range: RangeKey) => api<AnalyticsDTO>(`/api/analytics?range=${range}`) };
export const securityApi = { get: () => api<SecurityDTO>("/api/security") };
export const notificationsApi = { list: () => api<NotificationDTO[]>("/api/notifications") };
export const aiApi = {
  tools: () => api<AIToolsDTO>("/api/ai/tools"),
  savePrompt: (p: { system: string; temperature: number }) => post<{ ok: boolean }>("/api/ai/prompt", p),
  addRule: (r: { name: string; description: string }) => post<{ ok: boolean; rule: AIToolsDTO["rules"][number] }>("/api/ai/rules", r),
  toggleRule: (id: string) => post<{ ok: boolean; enabled: boolean }>(`/api/ai/rules/${id}/toggle`, {}),
  addReply: (rep: { shortcut: string; title: string; body: string }) => post<{ ok: boolean; reply: AIToolsDTO["replies"][number] }>("/api/ai/replies", rep),
  generateReport: () => post<{ ok: boolean; report: AIToolsDTO["reports"][number] }>("/api/ai/reports", {}),
};
export const kbApi = {
  get: () => api<KBDTO>("/api/knowledge-base"),
  create: (a: Partial<KBArticle>) => post<{ ok: boolean; id: string }>("/api/knowledge-base", a),
  update: (a: Partial<KBArticle> & { id: string }) => put<{ ok: boolean }>(`/api/knowledge-base/${a.id}`, a),
  remove: (id: string) => del<{ ok: boolean }>(`/api/knowledge-base/${id}`),
};

export const userApi = {
  getProfile: () => api<UserProfileDTO>("/api/user/profile"),
  updateProfile: (p: Partial<UserProfileDTO>) => put<UserProfileDTO>("/api/user/profile", p),
  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    post<{ ok: boolean; message: string }>("/api/user/change-password", data),
};

export const authApi = {
  logout: () => post<{ ok: boolean; message: string }>("/api/auth/logout", {}),
  login: (email: string, password?: string) =>
    post<{ ok?: boolean; message?: string; access_token?: string; token_type?: string; user?: UserProfileDTO }>("/api/auth/login", { email, password }),
};

