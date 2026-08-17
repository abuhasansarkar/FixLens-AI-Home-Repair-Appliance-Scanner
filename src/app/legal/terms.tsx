import { LegalScreen } from "@/components/legal/legal-screen";
import { env } from "@/config/env";

export default function TermsScreen() {
  return <LegalScreen title="Terms of Service" version="draft-1" canonicalUrl={env.termsUrl} updated="August 17, 2026" sections={[
    { heading: "Use of FixLens", body: "FixLens provides informational assistance for household maintenance and repair. You remain responsible for deciding whether to perform a task and for following product manuals, local codes, and professional guidance." },
    { heading: "Safety", body: "Stop immediately when FixLens identifies a serious hazard or recommends a qualified professional. Never use FixLens as emergency, electrical, gas, fire, structural, medical, or other professional advice." },
    { heading: "Subscriptions", body: "Subscriptions renew through your App Store or Google Play account until canceled. Deleting a FixLens account does not cancel an active store subscription." },
    { heading: "Contact", body: "Questions about these terms can be sent through the Help and Contact screens in the application." },
  ]} />;
}
