import { diagnosisSystemPrompt } from "./prompts";
import { applianceExtractionJsonSchema, diagnosisJsonSchema } from "./schemas";

type InputImage = { mime: string; base64: string };
type ResponsePayload = { id: string; output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };

function outputText(response: ResponsePayload) {
  for (const item of response.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  throw new Error("OpenAI response did not contain output text");
}

async function send(body: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
  return response.json() as Promise<ResponsePayload>;
}

export async function requestDiagnosis(input: { description?: string; clarification?: string; diyLevel?: string; images: InputImage[]; model?: string }) {
  if (!input.images.length || input.images.length > 3) throw new Error("Diagnosis requires one to three images");
  const started = Date.now();
  const model = input.model ?? process.env.OPENAI_MODEL_DIAGNOSE ?? "gpt-5.6-terra";
  const payload = await send({
    model,
    store: false,
    input: [
      { role: "system", content: [{ type: "input_text", text: diagnosisSystemPrompt }] },
      { role: "user", content: [{ type: "input_text", text: `Problem description: ${input.description || "Not supplied"}\nClarification: ${input.clarification || "Not supplied"}\nUser DIY experience: ${input.diyLevel || "Not supplied"}. Adapt explanation detail and terminology to this level, but never relax safety limits or infer capability.` }, ...input.images.map((image) => ({ type: "input_image", detail: "auto", image_url: `data:${image.mime};base64,${image.base64}` }))] },
    ],
    text: { format: { type: "json_schema", name: "fixlens_diagnosis", strict: true, schema: diagnosisJsonSchema } },
  });
  const parsed = JSON.parse(outputText(payload));
  return { result: parsed, model, providerRequestId: payload.id, inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0, latencyMs: Date.now() - started };
}

export async function requestRepairChat(input: { result: unknown; currentStep?: unknown; question: string; image?: InputImage; model?: string }) {
  const started = Date.now();
  const model = input.model ?? process.env.OPENAI_MODEL_CHAT ?? "gpt-5.6-luna";
  const payload = await send({
    model,
    store: false,
    max_output_tokens: 350,
    input: [
      { role: "system", content: [{ type: "input_text", text: "You are the FixLens repair-step assistant. Answer only from the supplied assessment and current step. Be concise, state uncertainty, and never invent observations. For orange or red safety levels, provide only immediate safety and professional-help guidance; never provide troubleshooting or invasive instructions. Tell the user to stop for gas odor, smoke, fire, sparks, exposed wiring, flooding near electricity, structural movement, or any condition different from the assessment." }] },
      { role: "user", content: [{ type: "input_text", text: `Assessment: ${JSON.stringify(input.result)}\nCurrent step: ${JSON.stringify(input.currentStep ?? null)}\nQuestion: ${input.question}` }, ...(input.image ? [{ type: "input_image", detail: "auto", image_url: `data:${input.image.mime};base64,${input.image.base64}` }] : [])] },
    ],
  });
  const text = outputText(payload).trim();
  if (!text) throw new Error("OpenAI returned an empty assistant response");
  return { text: text.slice(0, 1600), model, providerRequestId: payload.id, inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0, latencyMs: Date.now() - started };
}

export async function requestApplianceExtraction(input: { image: InputImage; model?: string }) {
  const started = Date.now();
  const model = input.model ?? process.env.OPENAI_MODEL_EXTRACT ?? "gpt-5.6-luna";
  const payload = await send({
    model,
    store: false,
    max_output_tokens: 300,
    input: [
      { role: "system", content: [{ type: "input_text", text: "Extract only appliance identity visibly supported by the photo. Prefer exact label text. Use null for brand, model, or serial when unreadable. Never infer a serial number. Name must be a short editable appliance name and category must be a broad household-appliance category. Confidence covers the full extraction." }] },
      { role: "user", content: [{ type: "input_text", text: "Read this appliance or model-label photo. The user will verify every field before saving." }, { type: "input_image", detail: "high", image_url: `data:${input.image.mime};base64,${input.image.base64}` }] },
    ],
    text: { format: { type: "json_schema", name: "fixlens_appliance_identity", strict: true, schema: applianceExtractionJsonSchema } },
  });
  return { result: JSON.parse(outputText(payload)) as { category: string; name: string; brand: string | null; model: string | null; serial: string | null; confidence: number }, model, providerRequestId: payload.id, inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0, latencyMs: Date.now() - started };
}
