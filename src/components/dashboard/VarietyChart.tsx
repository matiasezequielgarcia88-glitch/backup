import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface VarietyChartProps {
  data: Record<string, number>;
}

const COLORS = [
  'hsl(152, 45%, 35%)',
  'hsl(200, 80%, 45%)',
  'hsl(280, 60%, 45%)',
  'hsl(25, 70%, 50%)',
  'hsl(320, 70%, 50%)',
  'hsl(45, 90%, 50%)',
];

export function VarietyChart({ data }: VarietyChartProps) {
  const chartData = Object.entries(data).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="card-elevated">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Distribución por Variedad</h3>
        <p className="text-sm text-muted-foreground">Stock actual por genotipo</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
