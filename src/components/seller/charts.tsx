import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const goldStroke = "oklch(0.82 0.13 82)";
const goldFill = "oklch(0.82 0.13 82 / 0.18)";
const axis = { stroke: "oklch(0.4 0.01 250)", fontSize: 11 };

const tooltipStyle = {
  background: "oklch(0.18 0.013 250)",
  border: "1px solid oklch(0.3 0.014 250)",
  borderRadius: 10,
  fontSize: 12,
};

export function RevenueArea({ data }: { data: { d: string; v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gold-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={goldStroke} stopOpacity={0.6} />
            <stop offset="100%" stopColor={goldStroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(0.28 0.014 250 / 0.4)" vertical={false} />
        <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axis} />
        <YAxis tickLine={false} axisLine={false} tick={axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: goldStroke, strokeOpacity: 0.3 }} />
        <Area type="monotone" dataKey="v" stroke={goldStroke} strokeWidth={2} fill="url(#gold-area)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBar({ data }: { data: { d: string; v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke="oklch(0.28 0.014 250 / 0.4)" vertical={false} />
        <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axis} />
        <YAxis tickLine={false} axisLine={false} tick={axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: goldFill }} />
        <Bar dataKey="v" fill={goldStroke} radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionLine({ data }: { data: { d: string; v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke="oklch(0.28 0.014 250 / 0.4)" vertical={false} />
        <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axis} />
        <YAxis tickLine={false} axisLine={false} tick={axis} unit="%" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="v" stroke={goldStroke} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const pieColors = [
  "oklch(0.82 0.13 82)",
  "oklch(0.6 0.18 250)",
  "oklch(0.7 0.16 300)",
  "oklch(0.65 0.16 160)",
];

export function CategoryPie({ data }: { data: { name: string; v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Pie data={data} dataKey="v" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
