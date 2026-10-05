import { toast } from "sonner";

export async function shareContent(title: string, text: string, url: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast.success("Link copied to clipboard! / Link kopiran!");
  } catch {
    toast.error("Failed to share / Deljenje nije uspelo");
  }
}
