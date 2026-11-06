import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Observation } from '../types';
import { Thermometer, Droplets, Sun, CloudRain } from 'lucide-react';

interface EnvironmentalChartProps {
  observations: Observation[];
}

export const EnvironmentalChart: React.FC<EnvironmentalChartProps> = ({ observations }) => {
  const [activeMetrics, setActiveMetrics] = useState({
    temperature: true,
    soilMoisture: true,
    humidity: false,
    sunlight: false,
  });

  if (!observations || observations.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <Thermometer className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">No environmental observations recorded yet.</p>
        <p className="text-xs text-slate-400 mt-1">Record environmental observations alongside plant photographs to visualize trends.</p>
      </div>
    );
  }

  // Format observations chronologically for chart
  const chartData = observations.map((obs) => {
    const d = new Date(obs.observation_date);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`;
    return {
      date: dateLabel,
      fullDate: d.toLocaleString(),
      stage: obs.effective_stage,
      temperature: obs.temperature ?? null,
      soilMoisture: obs.soil_moisture ?? null,
      humidity: obs.humidity ?? null,
      sunlight: obs.sunlight_hours ?? null,
      rainfall: obs.rainfall ?? null,
    };
  });

  const toggleMetric = (key: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Longitudinal Environmental Telemetry</h3>
          <p className="text-xs text-slate-500">Historical microclimate and soil moisture trends across observations</p>
        </div>

        {/* Metric Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => toggleMetric('temperature')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              activeMetrics.temperature
                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
            }`}
          >
            <Thermometer className="w-3 h-3 text-rose-500" />
            <span>Temp (°C)</span>
          </button>

          <button
            onClick={() => toggleMetric('soilMoisture')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              activeMetrics.soilMoisture
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
            }`}
          >
            <Droplets className="w-3 h-3 text-blue-500" />
            <span>Soil Moisture (%)</span>
          </button>

          <button
            onClick={() => toggleMetric('humidity')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              activeMetrics.humidity
                ? 'bg-teal-50 text-teal-700 border-teal-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
            }`}
          >
            <Droplets className="w-3 h-3 text-teal-500" />
            <span>Humidity (%)</span>
          </button>

          <button
            onClick={() => toggleMetric('sunlight')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              activeMetrics.sunlight
                ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-500" />
            <span>Sunlight (hrs)</span>
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-lg space-y-1">
                      <p className="font-bold border-b border-slate-700 pb-1">{dataPoint.fullDate}</p>
                      <p className="text-emerald-300 font-semibold">Stage: {dataPoint.stage}</p>
                      {dataPoint.temperature !== null && (
                        <p className="text-rose-300">Temp: {dataPoint.temperature} °C</p>
                      )}
                      {dataPoint.soilMoisture !== null && (
                        <p className="text-blue-300">Soil Moisture: {dataPoint.soilMoisture} %</p>
                      )}
                      {dataPoint.humidity !== null && (
                        <p className="text-teal-300">Humidity: {dataPoint.humidity} %</p>
                      )}
                      {dataPoint.sunlight !== null && (
                        <p className="text-amber-300">Sunlight: {dataPoint.sunlight} hrs</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {activeMetrics.temperature && (
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#e11d48"
                strokeWidth={2.2}
                dot={{ r: 4, fill: '#e11d48' }}
                activeDot={{ r: 6 }}
              />
            )}
            {activeMetrics.soilMoisture && (
              <Line
                type="monotone"
                dataKey="soilMoisture"
                name="Soil Moisture (%)"
                stroke="#2563eb"
                strokeWidth={2.2}
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            )}
            {activeMetrics.humidity && (
              <Line
                type="monotone"
                dataKey="humidity"
                name="Humidity (%)"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0d9488' }}
              />
            )}
            {activeMetrics.sunlight && (
              <Line
                type="monotone"
                dataKey="sunlight"
                name="Sunlight (hrs)"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: 3, fill: '#d97706' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
