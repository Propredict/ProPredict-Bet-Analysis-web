import { useState } from "react";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CorrectScoreCard } from "@/components/tickets/CorrectScoreCard";
import { useCorrectScoreTickets, type CSMatch, type CSTicket } from "@/hooks/useCorrectScoreTickets";

const emptyMatches = (): CSMatch[] =>
  Array.from({ length: 3 }, () => ({ home_team: "", away_team: "", scores: ["", "", ""] as [string, string, string] }));
const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
const SCORE_RE = /^\d{1,2}\s*-\s*\d{1,2}$/;

export default function ManageCorrectScore() {
  const { tickets, isLoading, save, remove } = useCorrectScoreTickets(true);
  const [editId, setEditId] = useState<string | undefined>();
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [date, setDate] = useState(todayStr());
  const [matches, setMatches] = useState<CSMatch[]>(emptyMatches());

  const setMatch = (i: number, patch: Partial<CSMatch>) =>
    setMatches((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const setScore = (i: number, j: number, v: string) =>
    setMatches((ms) =>
      ms.map((m, idx) => (idx === i ? { ...m, scores: m.scores.map((s, k) => (k === j ? v : s)) as any } : m)),
    );

  const reset = () => { setEditId(undefined); setMatches(emptyMatches()); setTier("free"); setStatus("published"); setDate(todayStr()); };

  const submit = async () => {
    for (const m of matches) {
      if (!m.home_team.trim() || !m.away_team.trim()) return toast.error("Upiši oba tima za svaku utakmicu");
      if (m.scores.some((s) => !SCORE_RE.test(s.trim()))) return toast.error("Rezultat mora biti u formatu 2-1");
    }
    try {
      await save.mutateAsync({
        id: editId,
        title: `Correct Score ${date}`,
        tier, status, ticket_date: date,
        matches: matches.map((m) => ({ ...m, scores: m.scores.map((s) => s.replace(/\s/g, "")) as any })),
      });
      toast.success("Tiket sačuvan");
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "Greška");
    }
  };

  const edit = (t: CSTicket) => {
    setEditId(t.id); setTier(t.tier); setStatus(t.status); setDate(t.ticket_date ?? todayStr());
    const ms = emptyMatches();
    t.matches.slice(0, 3).forEach((m, i) => (ms[i] = m));
    setMatches(ms);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const preview: CSTicket = { id: "p", title: "", tier, status, ticket_date: date, matches };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-extrabold">Correct Score Tickets</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold">Datum</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold">Nivo</label>
              <div className="flex gap-1">
                {(["free", "premium"] as const).map((t) => (
                  <Button key={t} type="button" size="sm" variant={tier === t ? "default" : "outline"} onClick={() => setTier(t)} className="flex-1 capitalize">{t}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Status</label>
              <div className="flex gap-1">
                {(["published", "draft"] as const).map((s) => (
                  <Button key={s} type="button" size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="flex-1 capitalize">{s === "published" ? "Objavi" : "Draft"}</Button>
                ))}
              </div>
            </div>
          </div>

          {matches.map((m, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-bold text-muted-foreground">Utakmica {i + 1}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Domaćin (npr. Iceland)" value={m.home_team} maxLength={40} onChange={(e) => setMatch(i, { home_team: e.target.value })} />
                <Input placeholder="Gost (npr. Azerbaijan)" value={m.away_team} maxLength={40} onChange={(e) => setMatch(i, { away_team: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {m.scores.map((s, j) => (
                  <Input key={j} placeholder={`Correct score ${j + 1}`} value={s} maxLength={5} onChange={(e) => setScore(i, j, e.target.value)} className="text-center font-bold" />
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={save.isPending} className="flex-1">
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? "Sačuvaj izmene" : "Kreiraj tiket"}
            </Button>
            {editId && <Button variant="outline" onClick={reset}>Otkaži</Button>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Pregled</p>
          <CorrectScoreCard ticket={preview} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold">Postojeći tiketi</h2>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema tiketa.</p>
        ) : tickets.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <p className="font-semibold">{t.ticket_date} · <span className="capitalize">{t.tier}</span> · {t.status}</p>
              <p className="truncate text-xs text-muted-foreground">{t.matches.map((m) => `${m.home_team}-${m.away_team}`).join(", ")}</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={() => edit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="destructive" onClick={() => confirm("Obriši tiket?") && remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
