import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";

interface Point {
  day: string;
  label: string;
  value: number;
}

export function GenerationsChart() {
  const { t, lang } = useLang();
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Fetch all generate_recipes counters from the last 7 days
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 6);
      const sinceDate = since.toISOString().slice(0, 10);

      const { data: rows } = await supabase
        .from("usage_counters")
        .select("day, used_count")
        .eq("feature", "generate_recipes")
        .gte("day", sinceDate);

      if (!alive) return;

      // Aggregate per day
      const totals: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        totals[d.toISOString().slice(0, 10)] = 0;
      }
      (rows ?? []).forEach((r: { day: string; used_count: number }) => {
        if (totals[r.day] !== undefined) totals[r.day] += r.used_count ?? 0;
      });

      const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
        weekday: "short",
        day: "numeric",
      });

      const pts: Point[] = Object.entries(totals).map(([day, value]) => ({
        day,
        label: fmt.format(new Date(day + "T00:00:00Z")),
        value,
      }));

      setData(pts);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [lang]);

  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="rounded-3xl border-border/60 p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t.admin.chartTitle}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lang === "ar" ? "إجمالي" : "Total"}:{" "}
            <span className="font-bold text-foreground">{total}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <div className="grid h-48 place-items-center text-sm text-muted-foreground">
          {t.admin.chartEmpty}
        </div>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="genFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary, 24 95% 53%))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary, 24 95% 53%))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, Math.ceil(max * 1.2) || 1]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 700 }}
                formatter={(v) => [String(v), lang === "ar" ? "توليدات" : "generations"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                className="text-primary"
                strokeWidth={2.5}
                fill="url(#genFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
