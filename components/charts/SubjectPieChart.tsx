"use client"

import { useMemo } from "react"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"
import { Pie } from "react-chartjs-2"
import { SubjectBreakdown } from "@/actions/dashboard-stats"

// Chart.jsの登録
ChartJS.register(ArcElement, Tooltip, Legend)

interface SubjectPieChartProps {
  data: SubjectBreakdown[]
}

// カラーパレット（科目用）
const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#84CC16', // lime-500
]

export default function SubjectPieChart({ data }: SubjectPieChartProps) {
  const chartData = useMemo(() => {
    // 0分の科目を除外してからソート
    const filteredData = data.filter(item => item.total_min > 0)
    const sortedData = [...filteredData].sort((a, b) => b.total_min - a.total_min)
    
    return {
      labels: sortedData.map(item => item.name),
      datasets: [
        {
          data: sortedData.map(item => item.total_min / 60), // 時間に変換
          backgroundColor: sortedData.map((_, index) => COLORS[index % COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }
  }, [data])

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels && data.datasets.length) {
              const dataset = data.datasets[0]
              const total = dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number
              
              return data.labels.map((label, i) => {
                const value = dataset.data[i] as number
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                
                const backgroundColor = Array.isArray(dataset.backgroundColor) 
                  ? dataset.backgroundColor[i] 
                  : dataset.backgroundColor
                
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: backgroundColor as string,
                  strokeStyle: dataset.borderColor as string,
                  lineWidth: dataset.borderWidth as number,
                  hidden: false,
                  index: i,
                }
              })
            }
            return []
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed
            const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
            return `${context.label}: ${value.toFixed(1)}時間 (${percentage}%)`
          },
        },
      },
    },
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">科目別の学習記録がありません</p>
      </div>
    )
  }

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  )
}