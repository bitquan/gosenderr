"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface DonutSlice {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  colors?: string[];
  height?: number;
  className?: string;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  colors = ["#6B4EFF", "#9D7FFF", "#F59E0B", "#10B981"],
  height = 220,
  className,
  showLegend = true,
}: DonutChartProps) {
  return (
    <motion.div
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell
                  key={`slice-${entry.name}-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                height={36}
                wrapperStyle={{ fontSize: 12 }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
