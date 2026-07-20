import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCustomer = {
  id: "cust-001",
  legalName: "ООО Пример",
  inn: "7701234567",
  contactName: null,
  contactEmail: "test@example.com",
  contactPhone: null,
  notes: null,
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z"
};

vi.mock("../src/modules/customers/customersRepository.js", () => ({
  findCustomerById: vi.fn(async (id: string) =>
    id === mockCustomer.id ? mockCustomer : null
  )
}));

vi.mock("../src/modules/pilot/pilotEligibilityRepository.js", () => ({
  findCustomerIdsByInn: vi.fn(async () => ["cust-001"]),
  findCustomerIdsByEmail: vi.fn(async () => ["cust-001"]),
  countPilotCodesForCustomerIds: vi.fn(async () => 0),
  countActivePilotCodesForCustomerIds: vi.fn(async () => 0)
}));

describe("pilot eligibility", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const repo = await import("../src/modules/pilot/pilotEligibilityRepository.js");
    vi.mocked(repo.findCustomerIdsByInn).mockResolvedValue(["cust-001"]);
    vi.mocked(repo.countPilotCodesForCustomerIds).mockResolvedValue(0);
    vi.mocked(repo.countActivePilotCodesForCustomerIds).mockResolvedValue(0);
  });

  it("returns eligible when no pilot history", async () => {
    const { checkPilotEligibility } = await import("../src/modules/pilot/pilotEligibility.js");
    const result = await checkPilotEligibility("cust-001");

    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.policy.pilotDurationDays).toBe(30);
  });

  it("blocks when INN already used for pilot", async () => {
    const repo = await import("../src/modules/pilot/pilotEligibilityRepository.js");
    vi.mocked(repo.countPilotCodesForCustomerIds).mockResolvedValueOnce(1);

    const { checkPilotEligibility } = await import("../src/modules/pilot/pilotEligibility.js");
    const result = await checkPilotEligibility("cust-001");

    expect(result!.eligible).toBe(false);
    expect(result!.reasons).toContain("INN_ALREADY_USED");
  });

  it("blocks when active pilot exists", async () => {
    const repo = await import("../src/modules/pilot/pilotEligibilityRepository.js");
    vi.mocked(repo.countActivePilotCodesForCustomerIds).mockResolvedValueOnce(1);

    const { checkPilotEligibility } = await import("../src/modules/pilot/pilotEligibility.js");
    const result = await checkPilotEligibility("cust-001");

    expect(result!.eligible).toBe(false);
    expect(result!.reasons).toContain("ACTIVE_PILOT_EXISTS");
  });

  it("returns null for unknown customer", async () => {
    const { checkPilotEligibility } = await import("../src/modules/pilot/pilotEligibility.js");
    const result = await checkPilotEligibility("missing");
    expect(result).toBeNull();
  });
});
