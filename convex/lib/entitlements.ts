export const limits={freeLifetimeDiagnoses:3,proMonthlyDiagnoses:15,freeAppliances:1,proAssistantReplies:5,maxImages:3,maxClarificationRounds:3} as const;
function configuredLimit(name:string,fallback:number){const value=Number(process.env[name]??fallback);return Number.isInteger(value)&&value>0?value:fallback;}
export function utcPeriodKey(timestamp:number){const date=new Date(timestamp);return`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;}
export function nextUtcMonth(timestamp:number){const date=new Date(timestamp);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);}
export function diagnosisLimit(entitlement:"free"|"pro"){return entitlement==="pro"?configuredLimit("PRO_MONTHLY_DIAGNOSES",limits.proMonthlyDiagnoses):configuredLimit("FREE_LIFETIME_DIAGNOSES",limits.freeLifetimeDiagnoses);}
export function applianceLimit(entitlement:"free"|"pro"){return entitlement==="pro"?Number.POSITIVE_INFINITY:configuredLimit("FREE_APPLIANCE_LIMIT",limits.freeAppliances);}
export function assistantReplyLimit(){return configuredLimit("MAX_PRO_ASSISTANT_REPLIES",limits.proAssistantReplies);}
export function canUseDiagnosis(input:{entitlement:"free"|"pro";used:number}){return input.used<diagnosisLimit(input.entitlement);}
