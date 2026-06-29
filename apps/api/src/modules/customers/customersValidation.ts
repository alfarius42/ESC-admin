export type CustomerInput = {
  legalName?: string;
  inn?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

export type ValidationResult =
  | { ok: true; data: Required<Pick<CustomerInput, "legalName">> & CustomerInput }
  | { ok: false; details: Record<string, string> };

const INN_PATTERN = /^\d{10}$|^\d{12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInn(inn: string | null | undefined): string | null {
  if (inn === undefined || inn === null || inn.trim() === "") {
    return null;
  }
  const trimmed = inn.trim();
  if (!INN_PATTERN.test(trimmed)) {
    return "inn must be 10 or 12 digits";
  }
  return null;
}

function validateEmail(email: string | null | undefined): string | null {
  if (email === undefined || email === null || email.trim() === "") {
    return null;
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "contactEmail must be a valid email";
  }
  return null;
}

export function validateCustomerCreate(input: CustomerInput): ValidationResult {
  const details: Record<string, string> = {};
  const legalName = input.legalName?.trim() ?? "";

  if (legalName.length < 2) {
    details.legalName = "legalName is required and must be at least 2 characters";
  }

  const innError = validateInn(input.inn);
  if (innError) {
    details.inn = innError;
  }

  const emailError = validateEmail(input.contactEmail);
  if (emailError) {
    details.contactEmail = emailError;
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    data: {
      legalName,
      inn: input.inn?.trim() || null,
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      notes: input.notes?.trim() || null
    }
  };
}

export function validateCustomerPatch(input: CustomerInput): ValidationResult {
  const details: Record<string, string> = {};

  if (input.legalName !== undefined) {
    const legalName = input.legalName.trim();
    if (legalName.length < 2) {
      details.legalName = "legalName must be at least 2 characters";
    }
  }

  if (input.inn !== undefined) {
    const innError = validateInn(input.inn);
    if (innError) {
      details.inn = innError;
    }
  }

  if (input.contactEmail !== undefined) {
    const emailError = validateEmail(input.contactEmail);
    if (emailError) {
      details.contactEmail = emailError;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: input as Required<Pick<CustomerInput, "legalName">> & CustomerInput };
}
