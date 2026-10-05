import {
  ExportRequestSchema,
  HealthSchema,
  type MonthlySummary,
  MonthlySummarySchema,
  ParseRequestSchema,
  ParseResponseSchema,
  type ParsedTransaction,
  SubscriptionSchema,
  type SubscriptionStatus,
  type Transaction,
  TransactionInputSchema,
  TransactionListSchema,
  TransactionSchema,
  TransactionUpdateSchema,
} from "./schemas";

export type ApiClient = {
  getHealth: () => Promise<import("./schemas").Health>;
  parseTransaction: (payload: { text: string; locale?: string }) => Promise<ParsedTransaction>;
  listTransactions: (month?: string) => Promise<Transaction[]>;
  createTransaction: (input: unknown) => Promise<Transaction>;
  updateTransaction: (id: string, input: unknown) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  getMonthlySummary: (month: string) => Promise<MonthlySummary>;
  getSubscription: () => Promise<SubscriptionStatus>;
  exportTransactions: (month: string, format?: "csv" | "xlsx" | "pdf") => Promise<Blob>;
  acceptConsent: (version: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export function createApiClient(options: {
  baseUrl: string;
  fetchFn?: typeof fetch;
}): ApiClient {
  const fetchFn = options.fetchFn ?? fetch;
  const resolvedBaseUrl =
    options.baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  async function request<T>(path: string, init?: RequestInit, parser?: (data: unknown) => T) {
    const url = new URL(path, resolvedBaseUrl);
    const response = await fetchFn(url.toString(), {
      credentials: "include",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `API error: ${response.status}`);
    }

    if (!parser) {
      return undefined as T;
    }

    const data = await response.json();
    return parser(data);
  }

  return {
    async getHealth() {
      const data = await request("/api/health", undefined, (data) => data);
      return HealthSchema.parse(data);
    },
    async parseTransaction(payload) {
      const body = ParseRequestSchema.parse(payload);
      return request(
        "/api/ai/parse-transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        (data) => ParseResponseSchema.parse(data),
      );
    },
    async listTransactions(month) {
      const params = month ? `?month=${encodeURIComponent(month)}` : "";
      const data = await request(`/api/transactions${params}`, undefined, (d) => d);
      return TransactionListSchema.parse(data).items;
    },
    async createTransaction(input) {
      const body = TransactionInputSchema.parse(input);
      return request(
        "/api/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        (data) => TransactionSchema.parse(data),
      );
    },
    async updateTransaction(id, input) {
      const body = TransactionUpdateSchema.parse(input);
      return request(
        `/api/transactions/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        (data) => TransactionSchema.parse(data),
      );
    },
    async deleteTransaction(id) {
      await request(`/api/transactions/${id}`, { method: "DELETE" });
    },
    async getMonthlySummary(month) {
      const data = await request(
        `/api/summary?month=${encodeURIComponent(month)}`,
        undefined,
        (d) => MonthlySummarySchema.parse(d),
      );
      return data;
    },
    async getSubscription() {
      return request("/api/subscription", undefined, (d) => SubscriptionSchema.parse(d));
    },
    async exportTransactions(month, format) {
      const body = ExportRequestSchema.parse({ month, format });
      const url = new URL("/api/export", resolvedBaseUrl);
      const response = await fetchFn(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API error: ${response.status}`);
      }

      return response.blob();
    },
    async acceptConsent(version) {
      await request("/api/account/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version }),
      });
    },
    async deleteAccount() {
      await request("/api/account/delete", { method: "POST" });
    },
  };
}
