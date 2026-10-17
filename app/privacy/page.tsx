import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PRIVACY_POLICY } from "@/lib/legal/legalDocuments";

export const metadata: Metadata = { title: "개인정보 처리방침 · 곁에" };

export default function Page() {
  return <LegalDocumentView content={PRIVACY_POLICY} path="/privacy" />;
}
