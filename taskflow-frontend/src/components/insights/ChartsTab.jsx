import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { insightsService } from '../../services/insightsService'
import { Card, Loading, Empty } from './shared'
import { shortDay, CHART_COLORS } from './insightsLib'

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e8e6df',
  borderRadius: 8,
  fontSize: 12,
  color: '#141413',
}

function ChartsTab({ boardId, range }) {
  const { data: ts, isLoading: tsLoading } = useQuery({
    queryKey: ['insights-timeseries', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getTimeseries(boardId, range),
  })
  const { data: cfd, isLoading: cfdLoading } = useQuery({
    queryKey: ['insights-cfd', boardId, range?.from, range?.to],
    queryFn: () => insightsService.getCFD(boardId, range),
  })

  if (tsLoading || cfdLoading) return <Loading />

  const series = (ts?.series || []).map(s => ({ ...s, day: shortDay(s.day) }))
  const cfdSeries = (cfd?.series || []).map(s => ({ ...s, day: shortDay(s.day) }))

  return (
    <div className="space-y-6">
      <Card title="Поток задач — создано и закрыто">
        {series.length === 0 ? <Empty /> : (
          <div className="w-full h-72">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8a8779' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8779' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="created" name="Создано" stroke="#cc785c" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="closed" name="Закрыто" stroke="#5db8a6" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Динамика активных задач">
        {series.length === 0 ? <Empty /> : (
          <div className="w-full h-72">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cc785c" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#cc785c" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8a8779' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8779' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="active" name="Активных" stroke="#cc785c" strokeWidth={2} fill="url(#activeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Накопительная диаграмма по колонкам">
        {cfdSeries.length === 0 || !cfd?.columns?.length ? <Empty /> : (
          <div className="w-full h-80">
            <ResponsiveContainer>
              <AreaChart data={cfdSeries} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8a8779' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8779' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {cfd.columns.map((c, i) => (
                  <Area
                    key={c}
                    type="monotone"
                    dataKey={c}
                    stackId="1"
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

    </div>
  )
}

export default ChartsTab
