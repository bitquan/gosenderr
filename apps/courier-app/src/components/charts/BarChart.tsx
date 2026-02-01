
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartDatum = Record<string, number | string>;

interface BarChartProps {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  className?: string;
}

export function BarChart({
  data,
  xKey,
  yKey,
  color = "#9D7FFF",
  height = 220,
  className,
}: BarChartProps) {
  return (
    <motion.div
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ReBarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
            />
            <Bar dataKey={yKey} fill={color} radius={[8, 8, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
