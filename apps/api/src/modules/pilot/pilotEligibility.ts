import { findCustomerById } from "../customers/customersRepository.js";
import {
  countActivePilotCodesForCustomerIds,
  countPilotCodesForCustomerIds,
  findCustomerIdsByEmail,
  findCustomerIdsByInn
} from "./pilotEligibilityRepository.js";

export type PilotBlockReason =
  | "INN_ALREADY_USED"
  | "CUSTOMER_ALREADY_USED"
  | "ACTIVE_PILOT_EXISTS"
  | "EMAIL_ALREADY_USED";

export type PilotEligibilityResult = {
  eligible: boolean;
  reasons: PilotBlockReason[];
  details: Record<string, string>;
  policy: {
    pilotDurationDays: number;
    checks: string[];
  };
};

const PILOT_DURATION_DAYS = 30;

const POLICY_CHECKS = [
  "INN: один пилот на ИНН за всё время (неотозванные коды)",
  "CUSTOMER: один пилот на запись customer без ИНН",
  "ACTIVE: блок при активном pilot_until",
  "EMAIL: блок при том же contactEmail (нормализованный)"
];

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) {
    return null;
  }
  return email.trim().toLowerCase();
}

export async function checkPilotEligibility(
  customerId: string
): Promise<PilotEligibilityResult | null> {
  const customer = await findCustomerById(customerId);
  if (!customer) {
    return null;
  }

  const reasons: PilotBlockReason[] = [];
  const details: Record<string, string> = {};
  const checkedCustomerIds = new Set<string>([customerId]);

  if (customer.inn?.trim()) {
    const innMatches = await findCustomerIdsByInn(customer.inn.trim());
    for (const id of innMatches) {
      checkedCustomerIds.add(id);
    }

    const innPilotCount = await countPilotCodesForCustomerIds([...checkedCustomerIds]);
    if (innPilotCount > 0) {
      reasons.push("INN_ALREADY_USED");
      details.inn = customer.inn.trim();
      details.innPilotCount = String(innPilotCount);
    }
  } else {
    const customerPilotCount = await countPilotCodesForCustomerIds([customerId]);
    if (customerPilotCount > 0) {
      reasons.push("CUSTOMER_ALREADY_USED");
      details.customerId = customerId;
    }
  }

  const normalizedEmail = normalizeEmail(customer.contactEmail);
  if (normalizedEmail) {
    const emailCustomerIds = await findCustomerIdsByEmail(normalizedEmail);
    const otherEmailCustomers = emailCustomerIds.filter((id) => id !== customerId);
    if (otherEmailCustomers.length > 0) {
      const emailPilotCount = await countPilotCodesForCustomerIds(emailCustomerIds);
      if (emailPilotCount > 0) {
        reasons.push("EMAIL_ALREADY_USED");
        details.contactEmail = normalizedEmail;
      }
    }
  }

  const activePilotCount = await countActivePilotCodesForCustomerIds([
    ...checkedCustomerIds
  ]);
  if (activePilotCount > 0) {
    reasons.push("ACTIVE_PILOT_EXISTS");
    details.activePilotCount = String(activePilotCount);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    details,
    policy: {
      pilotDurationDays: PILOT_DURATION_DAYS,
      checks: POLICY_CHECKS
    }
  };
}
