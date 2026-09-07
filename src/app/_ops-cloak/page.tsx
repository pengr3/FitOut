import { notFound } from "next/navigation";

/** One shared pre-stream denial target for every Host/path cell outside the ops partition. */
export default function OpsCloakPage() {
  notFound();
}
