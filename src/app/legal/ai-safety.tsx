import { LegalScreen } from "@/components/legal/legal-screen";

export default function AiSafetyScreen() {
  return <LegalScreen title="AI & Safety" version="safety-v1" draftWhenMissing={false} updated="August 17, 2026" sections={[
    { heading: "Assessments are not guarantees", body: "FixLens separates visible observations from assumptions and reports uncertainty. A photo cannot establish every hidden condition, model detail, or compatible part." },
    { heading: "Hazard controls", body: "Potential gas, mains electrical, fire, refrigerant, structural, flooding, asbestos, mold, or similar hazards receive stop-and-escalate guidance instead of invasive repair instructions." },
    { heading: "When to stop", body: "Stop if conditions differ from the assessment, damage worsens, instructions conflict with a manufacturer manual, or you are uncomfortable with any step." },
  ]} />;
}
