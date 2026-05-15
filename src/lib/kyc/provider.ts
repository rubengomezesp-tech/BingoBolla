// KYC provider abstraction. Currently uses self-declared mode for MVP.
// To activate Persona: set KYC_PROVIDER=persona in .env and implement createInquiry below.

export type KycProvider = "self" | "persona";

export const KYC_PROVIDER: KycProvider = (process.env.KYC_PROVIDER as KycProvider) ?? "self";

export interface KycSubmission {
  date_of_birth: string;  // YYYY-MM-DD
  state: string;          // 2-letter
  country?: string;
}

export interface KycResult {
  status: "self_declared" | "pending" | "verified" | "rejected";
  provider: KycProvider;
  provider_id?: string;
  redirect_url?: string;  // for Persona hosted flow
  message?: string;
}

// --- Persona stub (wire up when Persona is contracted) ---
export async function createPersonaInquiry(userId: string): Promise<KycResult> {
  // const r = await fetch("https://withpersona.com/api/v1/inquiries", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.PERSONA_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     data: {
  //       attributes: {
  //         "inquiry-template-id": process.env.PERSONA_TEMPLATE_ID,
  //         "reference-id": userId,
  //       },
  //     },
  //   }),
  // });
  // const j = await r.json();
  // return {
  //   status: "pending",
  //   provider: "persona",
  //   provider_id: j.data.id,
  //   redirect_url: `https://withpersona.com/verify?inquiry-id=${j.data.id}`,
  // };
  throw new Error("Persona not wired yet. Set KYC_PROVIDER=self for MVP.");
}
