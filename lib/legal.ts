/**
 * Who runs Grêdan, in law.
 *
 * German law (§ 5 DDG, formerly § 5 TMG) requires a commercial site to name
 * its operator, where they can be reached by post, and how to contact them
 * — reachable from every page in no more than two clicks. § 18 Abs. 2 MStV
 * adds a person responsible for editorial content.
 *
 * Nobody but the customer knows these, so they are empty here rather than
 * invented, and `imprintComplete()` is false until the required ones are
 * filled. The imprint page says so plainly instead of rendering a
 * convincing-looking blank, because an imprint that looks finished and is
 * not is worse than one that admits it.
 *
 * Fill this in, commit it, and redeploy. It is meant to be public — an
 * imprint is a legal requirement to publish exactly this.
 */
export type Operator = {
  /** The natural person or company that runs the site. Required. */
  name: string;
  /** "Einzelunternehmen", "GmbH", "e. V." — empty for a private person. */
  legalForm: string;
  /** A real postal address. A PO box does not satisfy § 5 DDG. Required. */
  street: string;
  postcode: string;
  city: string;
  country: string;
  /** Required: an address that is read and answered. */
  email: string;
  /** Not strictly required if email is answered promptly, but expected. */
  phone: string;
  /** For a company: who represents it (managing director). */
  represented: string;
  /** Handelsregister number, e.g. "HRB 12345". */
  register: string;
  /** The court holding that register, e.g. "Amtsgericht Berlin". */
  registerCourt: string;
  /** VAT identification number under § 27a UStG, if there is one. */
  vatId: string;
  /**
   * Responsible for editorial content under § 18 Abs. 2 MStV. Usually the
   * operator; name and address, which may be the same as above.
   */
  responsibleForContent: string;
};

export const OPERATOR: Operator = {
  name: "",
  legalForm: "",
  street: "",
  postcode: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  represented: "",
  register: "",
  registerCourt: "",
  vatId: "",
  responsibleForContent: "",
};

/** The fields without which the imprint does not do its job. */
const REQUIRED: Array<keyof Operator> = [
  "name",
  "street",
  "postcode",
  "city",
  "email",
];

export function missingOperatorFields(): Array<keyof Operator> {
  return REQUIRED.filter((f) => !OPERATOR[f]?.trim());
}

export function imprintComplete(): boolean {
  return missingOperatorFields().length === 0;
}

/**
 * When the terms last changed. Shown to readers, and the date a change
 * would be measured from if anyone ever had to be told about one.
 */
export const TERMS_UPDATED = "2026-10-21";

/**
 * The language the terms are binding in. Translations are a courtesy; a
 * clause that drifts in translation should not be the one that decides an
 * argument, and the operator is German.
 */
export const BINDING_LOCALE = "de";
