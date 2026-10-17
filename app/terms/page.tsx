import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { TERMS_OF_SERVICE } from "@/lib/legal/legalDocuments";

export const metadata: Metadata = { title: "이용약관 · 곁에" };

export default function Page() {
  return <LegalDocumentView content={TERMS_OF_SERVICE} path="/terms" />;
}
