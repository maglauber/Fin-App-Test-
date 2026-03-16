
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line, ReferenceLine,
  AreaChart, Area, ComposedChart, Sankey, Layer, Rectangle, Text
} from 'recharts';
import { Transaction, BudgetSettings, MonthSummary } from '../types.js';
import { getCategoryColor } from '../constants.js';
import { 
  ChartBarIcon, 
  ShoppingBagIcon,
  CalculatorIcon,
  PresentationChartLineIcon,
  SparklesIcon,
  CalendarIcon,
  FireIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import BudgetBreakdown from './BudgetBreakdown.js';

interface Props {
  transactions: Transaction[];
  settings: BudgetSettings;
  summary: MonthSummary;
  currentDate: Date;
}

const AnalyticsView: React.FC<Props> = ({ transactions, settings, summary, currentDate }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const clean = val.replace(/[$,\s]/g, '');
      const num = parseFloat(clean);
      return isFinite(num) ? num : 0;
    }
    return 0;
  };

  const formatCurrency = (val: any) => {
    const num = parseAmount(val);
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(num);
  };

  const heatmapData = useMemo(() => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const dailySpend: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) dailySpend[i] = 0;

    transactions.forEach(t => {
      const amount = parseAmount(t.amount);
      if (t.type === 'expense') {
        const d = new Date(t.date).getDate();
        dailySpend[d] = (dailySpend[d] || 0) + amount;
      }
    });

    const maxSpend = Math.max(...Object.values(dailySpend), 1);
    
    return {
      days: Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        amount: dailySpend[i + 1],
        intensity: dailySpend[i + 1] / maxSpend
      })),
      firstDayOffset: firstDayOfMonth,
      maxSpend
    };
  }, [transactions, currentDate]);

  const forecastData = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Daily spend by day AND account
    const dailyAccountSpend: Record<number, Record<string, number>> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyAccountSpend[i] = {};
      settings.accounts.forEach(acc => dailyAccountSpend[i][acc] = 0);
    }

    transactions.forEach(t => {
      const amount = parseAmount(t.amount);
      if (t.type === 'expense') {
        const day = new Date(t.date).getDate();
        if (dailyAccountSpend[day]) {
          dailyAccountSpend[day][t.account] = (dailyAccountSpend[day][t.account] || 0) + amount;
        }
      }
    });

    const accountCumulative: Record<string, number> = {};
    settings.accounts.forEach(acc => accountCumulative[acc] = 0);
    
    let totalCumulative = 0;
    const data = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayData: any = { day: i };
      let dayTotal = 0;
      
      settings.accounts.forEach(acc => {
        const amt = dailyAccountSpend[i][acc] || 0;
        accountCumulative[acc] += amt;
        dayTotal += amt;
        if (i <= currentDay) {
          dayData[acc] = accountCumulative[acc];
        }
      });
      
      totalCumulative += dayTotal;
      dayData.actualTotal = i <= currentDay ? totalCumulative : null;
      dayData.projected = null;
      
      data.push(dayData);
    }

    if (currentDay > 0) {
      const dailyVelocity = totalCumulative / currentDay;
      let projectedCumulative = totalCumulative;
      for (let i = currentDay; i < daysInMonth; i++) {
        projectedCumulative += dailyVelocity;
        data[i].projected = Math.round(projectedCumulative);
      }
      if (data[currentDay - 1]) data[currentDay - 1].projected = totalCumulative;
    }

    const totalBudget = (() => {
      const hierarchy: Record<string, { main: number | null, subs: number }> = {};
      
      Object.entries(settings.budgets).forEach(([key, val]) => {
        const amount = parseAmount(val);
        if (key.includes(':')) {
          const [main, sub] = key.split(':');
          if (!hierarchy[main]) hierarchy[main] = { main: null, subs: 0 };
          hierarchy[main].subs += amount;
        } else {
          if (!hierarchy[key]) hierarchy[key] = { main: null, subs: 0 };
          hierarchy[key].main = amount;
        }
      });
      
      return Object.values(hierarchy).reduce((sum, item) => {
        if (item.main !== null) return sum + item.main;
        return sum + item.subs;
      }, 0);
    })();

    return { data, totalBudget, accounts: settings.accounts };
  }, [transactions, settings.budgets, settings.accounts, currentDate]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(tx => {
      const amount = parseAmount(tx.amount);
      if (tx.type === 'expense') {
        data[tx.category] = (data[tx.category] || 0) + amount;
      } else if (tx.type === 'return') {
        data[tx.category] = (data[tx.category] || 0) - amount;
      }
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Math.max(0, value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const sankeyData = useMemo(() => {
    // 1. Income Sources & 4. Expense Categories
    const expenseCategoryNames = new Set(settings.expenseCategories.map(c => c.name));
    const rawIncomeSources: Record<string, number> = {};
    const rawExpenseCategories: Record<string, Record<string, number>> = {};

    transactions.forEach(t => {
      const amount = parseAmount(t.amount);
      if (amount <= 0) return;

      const isIncome = t.type === 'income';
      const isExpenseCategory = expenseCategoryNames.has(t.category);
      
      if (isIncome && !isExpenseCategory) {
        rawIncomeSources[t.category] = (rawIncomeSources[t.category] || 0) + amount;
      } else if (t.type === 'expense' || (isIncome && isExpenseCategory)) {
        if (!rawExpenseCategories[t.category]) rawExpenseCategories[t.category] = {};
        const subName = t.subCategory || 'Uncategorized';
        if (isIncome) {
          rawExpenseCategories[t.category][subName] = (rawExpenseCategories[t.category][subName] || 0) - amount;
        } else {
          rawExpenseCategories[t.category][subName] = (rawExpenseCategories[t.category][subName] || 0) + amount;
        }
      } else if (t.type === 'return') {
        if (!rawExpenseCategories[t.category]) rawExpenseCategories[t.category] = {};
        const subName = t.subCategory || 'Uncategorized';
        rawExpenseCategories[t.category][subName] = (rawExpenseCategories[t.category][subName] || 0) - amount;
      }
    });

    // Clamp values and recalculate totals to ensure Sankey flow conservation
    let totalIncome = 0;
    const incomeSources: Record<string, number> = {};
    Object.entries(rawIncomeSources).forEach(([cat, amount]) => {
      if (amount > 0) {
        incomeSources[cat] = amount;
        totalIncome += amount;
      }
    });

    let totalExpenses = 0;
    const expenseCategories: Record<string, { total: number, subs: Record<string, number> }> = {};
    Object.entries(rawExpenseCategories).forEach(([cat, subs]) => {
      let catTotal = 0;
      const clampedSubs: Record<string, number> = {};
      Object.entries(subs).forEach(([sub, amount]) => {
        if (amount > 0) {
          clampedSubs[sub] = amount;
          catTotal += amount;
        }
      });
      if (catTotal > 0) {
        expenseCategories[cat] = { total: catTotal, subs: clampedSubs };
        totalExpenses += catTotal;
      }
    });

    const savings = totalIncome - totalExpenses;
    const actualTotalFlow = Math.max(totalIncome, totalExpenses);

    if (totalIncome === 0 && totalExpenses === 0) return { nodes: [], links: [], actualTotalFlow: 0, containerHeight: 600 };

    const nodes: { name: string; color?: string; id?: string; actualValue?: number; align?: 'left' | 'right' }[] = [];
    const links: { source: number; target: number; value: number; actualValue?: number }[] = [];
    
    const getNodeIndex = (id: string, name: string, actualValue: number, color?: string, align: 'left' | 'right' = 'right') => {
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) {
        nodes[idx].actualValue = actualValue;
        return idx;
      }
      nodes.push({ name, color, id, align, actualValue });
      return nodes.length - 1;
    };

    // Minimum visual value is 1.5% of the total flow to ensure small nodes are always visible
    const minVisualValue = actualTotalFlow * 0.015;

    const incomeTotalIdx = getNodeIndex('income_total', 'Income', actualTotalFlow, '#0ea5e9', 'right');

    let hasIncomeSources = false;
    const incColors = ['#7dd3fc', '#bae6fd', '#e0f2fe', '#38bdf8', '#0284c7'];
    Object.entries(incomeSources).forEach(([cat, amount], idx) => {
      hasIncomeSources = true;
      const catIdx = getNodeIndex(`inc_${cat}`, cat, amount, incColors[idx % incColors.length], 'right');
      const visualValue = Math.max(amount, minVisualValue);
      links.push({ source: catIdx, target: incomeTotalIdx, value: visualValue, actualValue: amount });
    });

    if (!hasIncomeSources && totalIncome > 0) {
      const fallbackIncIdx = getNodeIndex('inc_fallback', 'Income Sources', totalIncome, '#7dd3fc', 'right');
      const visualValue = Math.max(totalIncome, minVisualValue);
      links.push({ source: fallbackIncIdx, target: incomeTotalIdx, value: visualValue, actualValue: totalIncome });
    }

    // 2. Overspending (if expenses > income)
    if (savings < 0) {
      const deficitAmount = Math.abs(savings);
      const deficitIdx = getNodeIndex('deficit', 'Overspending', deficitAmount, '#ef4444', 'right');
      const visualValue = Math.max(deficitAmount, minVisualValue);
      links.push({ source: deficitIdx, target: incomeTotalIdx, value: visualValue, actualValue: deficitAmount });
    }

    // 3. Savings
    if (savings > 0) {
      const savingsIdx = getNodeIndex('savings', 'Savings', savings, '#22c55e', 'left');
      const visualValue = Math.max(savings, minVisualValue);
      links.push({ source: incomeTotalIdx, target: savingsIdx, value: visualValue, actualValue: savings });
    }

    // 4. Expense Categories & Sub-categories
    const expColors = ['#fca5a5', '#c084fc', '#fde047', '#93c5fd', '#f9a8d4', '#6ee7b7', '#fcd34d', '#a78bfa'];
    
    Object.entries(expenseCategories).forEach(([cat, data], idx) => {
      const color = expColors[idx % expColors.length];
      const catIdx = getNodeIndex(`exp_${cat}`, cat, data.total, color, 'left');
      
      let catVisualTotal = 0;

      // Sub-categories
      Object.entries(data.subs).forEach(([sub, amount]) => {
        const subIdx = getNodeIndex(`sub_${cat}_${sub}`, sub, amount, color, 'right');
        const visualValue = Math.max(amount, minVisualValue);
        catVisualTotal += visualValue;
        links.push({ source: catIdx, target: subIdx, value: visualValue, actualValue: amount });
      });

      links.push({ source: incomeTotalIdx, target: catIdx, value: catVisualTotal, actualValue: data.total });
    });

    let maxNodesInColumn = 1;
    const col1Nodes = Object.keys(incomeSources).length + (savings < 0 ? 1 : 0) || 1;
    const col3Nodes = Object.keys(expenseCategories).length + (savings > 0 ? 1 : 0);
    const col4Nodes = Object.values(expenseCategories).reduce((acc, cat) => acc + Object.keys(cat.subs).length, 0);
    
    maxNodesInColumn = Math.max(col1Nodes, col3Nodes, col4Nodes, 1);
    
    const dynamicPadding = 24;
    // Because we inflate small values, the chart doesn't need to be massively tall anymore.
    // A more reasonable height based on the number of nodes works perfectly.
    const dynamicHeight = Math.max(600, maxNodesInColumn * 55);

    return { nodes, links, actualTotalFlow, nodePadding: dynamicPadding, containerHeight: dynamicHeight };
  }, [transactions, settings.expenseCategories]);

  const CustomSankeyLink = (props: any) => {
    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth, index, source, target } = props;
    
    if (
      sourceX === undefined || sourceY === undefined || 
      targetX === undefined || targetY === undefined ||
      linkWidth === undefined ||
      isNaN(sourceX) || isNaN(targetX)
    ) return null;

    const gradientId = `linkGradient-${index}`;
    const startColor = source?.payload?.color || source?.color || '#6366f1';
    const endColor = target?.payload?.color || target?.color || '#ef4444';
    
    const halfWidth = Math.max(0, linkWidth / 2);
    const syTop = sourceY - halfWidth;
    const syBottom = sourceY + halfWidth;
    const tyTop = targetY - halfWidth;
    const tyBottom = targetY + halfWidth;
    
    const scX = sourceControlX !== undefined ? sourceControlX : (sourceX + targetX) / 2;
    const tcX = targetControlX !== undefined ? targetControlX : (sourceX + targetX) / 2;

    const sourceId = source?.payload?.id || source?.id;
    const targetId = target?.payload?.id || target?.id;
    const isHighlighted = activeNode === null || sourceId === activeNode || targetId === activeNode;
    const linkOpacity = isHighlighted ? 0.45 : 0.1;

    return (
      <Layer key={`link-${index}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} stopOpacity={linkOpacity} />
            <stop offset="100%" stopColor={endColor} stopOpacity={linkOpacity} />
          </linearGradient>
        </defs>
        <path 
          d={`M ${sourceX}, ${syTop} C ${scX}, ${syTop} ${tcX}, ${tyTop} ${targetX}, ${tyTop} L ${targetX}, ${tyBottom} C ${tcX}, ${tyBottom} ${scX}, ${syBottom} ${sourceX}, ${syBottom} Z`} 
          fill={`url(#${gradientId})`} 
          strokeWidth={0} 
        />
      </Layer>
    );
  };

  const CustomSankeyNode = (props: any) => {
    const { x, y, width, height, index, payload, value } = props;
    
    if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return null;

    const align = payload.align || 'right';
    const textX = align === 'left' ? x - 8 : x + width + 8;
    const textAnchor = align === 'left' ? 'end' : 'start';
    
    // Use actualValue if available, otherwise fallback to value
    const nodeValue = payload.actualValue !== undefined ? payload.actualValue : ((value !== undefined && !isNaN(value)) ? value : (payload.value || 0));
    const percentage = sankeyData.actualTotalFlow ? ((nodeValue / sankeyData.actualTotalFlow) * 100).toFixed(1) : '0';
    const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(nodeValue);
    
    let isHighlighted = activeNode === null || payload.id === activeNode;
    
    if (activeNode !== null && !isHighlighted) {
      const activeIdx = sankeyData.nodes.findIndex(n => n.id === activeNode);
      const thisIdx = sankeyData.nodes.findIndex(n => n.id === payload.id);
      if (activeIdx !== -1 && thisIdx !== -1) {
        isHighlighted = sankeyData.links.some(l => 
          (l.source === activeIdx && l.target === thisIdx) ||
          (l.target === activeIdx && l.source === thisIdx)
        );
      }
    }

    const nodeOpacity = isHighlighted ? 1 : 0.3;

    // Always render the text so small categories remain visible and identifiable
    return (
      <Layer key={`node-${index}`}>
        <Rectangle 
          x={x} y={y} width={width} height={Math.max(2, height)} // Ensure at least 2px height for visibility
          fill={payload.color || '#64748b'} 
          fillOpacity={nodeOpacity}
          onClick={() => setActiveNode(payload.id === activeNode ? null : payload.id)}
          style={{ cursor: 'pointer' }}
        />
        <Text 
          x={textX} 
          y={y + height / 2 - 8} 
          textAnchor={textAnchor} 
          verticalAnchor="middle" 
          fontSize={11} 
          fill="#1e293b" 
          fillOpacity={isHighlighted ? 1 : 0.4}
        >
          {payload.name}
        </Text>
        <Text 
          x={textX} 
          y={y + height / 2 + 8} 
          textAnchor={textAnchor} 
          verticalAnchor="middle" 
          fontSize={11} 
          fill="#475569"
          fillOpacity={isHighlighted ? 1 : 0.4}
        >
          {formattedValue} ({percentage}%)
        </Text>
      </Layer>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
              Spending Intensity Heatmap
            </h3>
            <p className="text-sm text-slate-400 mt-1">Identification of behavioral spending cycles and peak expenditure days</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-slate-50 border border-slate-100" /> None</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-indigo-600" /> Peak</div>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest pb-2">{d}</div>
          ))}
          {Array.from({ length: heatmapData.firstDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="aspect-square rounded-lg sm:rounded-xl bg-transparent" />
          ))}
          {heatmapData.days.map(d => (
            <div 
              key={d.day}
              className="group relative aspect-square rounded-lg sm:rounded-xl border border-slate-50 transition-all duration-300 hover:scale-105 cursor-help overflow-hidden"
              style={{ 
                backgroundColor: d.amount > 0 ? `rgba(79, 70, 229, ${Math.max(0.08, d.intensity)})` : '#f8fafc' 
              }}
            >
              <span className={`absolute top-1 left-1 sm:top-2 sm:left-2 text-[9px] sm:text-[10px] font-bold ${d.intensity > 0.6 ? 'text-white' : 'text-slate-400'}`}>
                {d.day}
              </span>
              {d.intensity > 0.8 && <FireIcon className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/40" />}
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-indigo-900/80 backdrop-blur-sm transition-all p-1 sm:p-2 text-center">
                <p className="text-[9px] sm:text-[10px] font-black text-white leading-tight">
                  {new Date(currentDate.getFullYear(), currentDate.getMonth(), d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  <br />
                  <span className="text-xs">{formatCurrency(d.amount)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PresentationChartLineIcon className="h-6 w-6 text-indigo-600" />
              Proactive Spending Forecast
            </h3>
            <p className="text-sm text-slate-400 mt-1">Projected end-of-month totals with account breakdown</p>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-indigo-100 w-fit">
            <SparklesIcon className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Est: {formatCurrency(forecastData.data[forecastData.data.length - 1].projected || summary.expenses)}
            </span>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
              />
              <Legend verticalAlign="top" height={36}/>
              
              <ReferenceLine y={forecastData.totalBudget} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: 'Budget Limit', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
              
              {/* Account Breakdown as Stacked Areas */}
              {forecastData.accounts.map((acc, i) => (
                <Area 
                  key={acc} 
                  type="monotone" 
                  dataKey={acc} 
                  stackId="1" 
                  stroke={getCategoryColor(acc)} 
                  fill={getCategoryColor(acc)} 
                  fillOpacity={0.6} 
                  strokeWidth={0}
                />
              ))}

              {/* Total Projected Line */}
              <Line 
                type="monotone" 
                dataKey="projected" 
                name="Projected Total"
                stroke="#6366f1" 
                strokeWidth={3} 
                strokeDasharray="8 4" 
                dot={false} 
              />
              
              {/* Actual Total Line for better visibility */}
              <Line 
                type="monotone" 
                dataKey="actualTotal" 
                name="Actual Total"
                stroke="#1e293b" 
                strokeWidth={2} 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
            <ShoppingBagIcon className="h-6 w-6 text-indigo-600" />
            Spending Distribution
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-indigo-600" />
            Spending Volume
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <ArrowsRightLeftIcon className="h-6 w-6 text-indigo-600" />
          Financial Flow Architecture
        </h3>
        <div className="w-full overflow-x-auto overflow-y-auto max-h-[800px] rounded-xl border border-slate-100">
          <div 
            className="w-full relative transition-all duration-300 min-w-[800px]" 
            style={{
              height: `${sankeyData.containerHeight || 600}px`,
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(45deg, #f8fafc 25%, transparent 25%, transparent 75%, #f8fafc 75%, #f8fafc), linear-gradient(45deg, #f8fafc 25%, transparent 25%, transparent 75%, #f8fafc 75%, #f8fafc)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px'
            }}
          >
            {sankeyData.links.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <Sankey 
                data={{
                  nodes: sankeyData.nodes.map(n => ({ ...n })),
                  links: sankeyData.links.map(l => ({ ...l }))
                }} 
                nodePadding={sankeyData.nodePadding || 40} 
                nodeWidth={12} 
                node={<CustomSankeyNode />} 
                link={<CustomSankeyLink />} 
                margin={{ top: 20, left: 20, right: 160, bottom: 20 }} 
                iterations={64}
              >
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <CalculatorIcon className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Insufficient data for flow analysis</p>
            </div>
          )}
          </div>
        </div>
      </div>

      <BudgetBreakdown transactions={transactions} settings={settings} title="Budget Performance" gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-2" />
    </div>
  );
};

export default AnalyticsView;
