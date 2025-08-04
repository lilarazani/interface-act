import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from "recharts";
import { SensorDisplay } from "./SensorDisplay";
import { ChartControls } from "./ChartControls";
import { ChartTimer } from "./ChartTimer";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Simulated real-time data with timestamp in milliseconds
const generateRandomData = () => ({
  timestamp: Date.now(),
  time: new Date().toLocaleTimeString(),
  sensor1: Math.random() * 100 + 20,
  sensor2: Math.random() * 80 + 30,
  sensor3: Math.random() * 90 + 10,
});

export const EnhancedSensorChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]); // Store all data for overlay
  const [overlayDatasets, setOverlayDatasets] = useState<string[]>([]);
  const [visibleSensors, setVisibleSensors] = useState({
    sensor1: true,
    sensor2: true,
    sensor3: true,
  });
  const [selectedDataset, setSelectedDataset] = useState("current");
  const [isRealTime, setIsRealTime] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [thresholds, setThresholds] = useState({
    general: { warning: 50 },
  });
  const [windowSize, setWindowSize] = useState(30); // 30 seconds window
  const [isZoomed, setIsZoomed] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Historical datasets simulation
  const historicalDatasets = [
    { id: "current", label: "Données actuelles" },
    { id: "session1", label: "Session 1 - 15/01/2024" },
    { id: "session2", label: "Session 2 - 14/01/2024" },
    { id: "session3", label: "Session 3 - 13/01/2024" },
  ];

  const sensorConfigs = [
    { key: "sensor1", label: "Capteur 1", color: "hsl(var(--sensor-1))", bgColor: "bg-sensor-1" },
    { key: "sensor2", label: "Capteur 2", color: "hsl(var(--sensor-2))", bgColor: "bg-sensor-2" },
    { key: "sensor3", label: "Capteur 3", color: "hsl(var(--sensor-3))", bgColor: "bg-sensor-3" },
  ];

  // Generate initial data
  useEffect(() => {
    const initialData = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() - (29 - i) * 1000,
      time: new Date(Date.now() - (29 - i) * 1000).toLocaleTimeString(),
      sensor1: Math.random() * 100 + 20,
      sensor2: Math.random() * 80 + 30,
      sensor3: Math.random() * 90 + 10,
    }));
    setData(initialData);
    setAllData(initialData);
    setTimerRunning(true);
  }, []);

  // Real-time data update
  useEffect(() => {
    if (!isRealTime || selectedDataset !== "current" || isPaused) return;

    const interval = setInterval(() => {
      const newPoint = generateRandomData();
      setData(prev => {
        const newData = [...prev.slice(1), newPoint];
        return newData;
      });
      setAllData(prev => [...prev, newPoint]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealTime, selectedDataset, isPaused]);

  // Auto-scaling: keep only last 30 seconds of data visible
  useEffect(() => {
    if (data.length > windowSize) {
      setData(prev => prev.slice(-windowSize));
    }
  }, [data.length, windowSize]);

  const toggleSensorVisibility = (sensor: string) => {
    setVisibleSensors(prev => ({
      ...prev,
      [sensor]: !prev[sensor],
    }));
  };

  const loadHistoricalData = (datasetId: string) => {
    setSelectedDataset(datasetId);
    setIsRealTime(datasetId === "current");
    setTimerRunning(datasetId === "current");
    
    if (datasetId !== "current") {
      // Load simulated historical data
      const historicalData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() - (49 - i) * 2000,
        time: new Date(Date.now() - (49 - i) * 2000).toLocaleTimeString(),
        sensor1: Math.random() * 120 + 10,
        sensor2: Math.random() * 100 + 20,
        sensor3: Math.random() * 110 + 5,
      }));
      setData(historicalData);
    }
  };

  const exportData = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvContent = [
      ["Timestamp (ms)", "Temps", "Capteur 1", "Capteur 2", "Capteur 3"],
      ...data.map(row => [row.timestamp, row.time, row.sensor1, row.sensor2, row.sensor3])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fsr-data-${selectedDataset}-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export réussi",
      description: `Données exportées dans ${a.download}`,
    });
  };

  const handleReset = () => {
    setData([]);
    setAllData([]);
    setOverlayDatasets([]);
    setIsZoomed(false);
    setTimerRunning(false);
    
    toast({
      title: "Remise à zéro",
      description: "Toutes les données ont été effacées",
    });
  };

  const handleScreenshot = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current);
        const link = document.createElement('a');
        link.download = `chart-screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        toast({
          title: "Capture réussie",
          description: "Capture d'écran sauvegardée",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de prendre la capture",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportPDF = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF();
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        // Add metrics
        const stats = calculateMetrics();
        pdf.addPage();
        pdf.text('Métriques des capteurs:', 20, 30);
        pdf.text(`Capteur 1 - Moyenne: ${stats.sensor1.avg.toFixed(2)}N, Médiane: ${stats.sensor1.median.toFixed(2)}N`, 20, 50);
        pdf.text(`Capteur 2 - Moyenne: ${stats.sensor2.avg.toFixed(2)}N, Médiane: ${stats.sensor2.median.toFixed(2)}N`, 20, 70);
        pdf.text(`Capteur 3 - Moyenne: ${stats.sensor3.avg.toFixed(2)}N, Médiane: ${stats.sensor3.median.toFixed(2)}N`, 20, 90);
        
        pdf.save(`fsr-report-${Date.now()}.pdf`);
        
        toast({
          title: "PDF généré",
          description: "Rapport PDF avec métriques sauvegardé",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de générer le PDF",
          variant: "destructive",
        });
      }
    }
  };

  const calculateMetrics = () => {
    const sensors = ['sensor1', 'sensor2', 'sensor3'] as const;
    const stats = {} as Record<string, { avg: number; median: number }>;
    
    sensors.forEach(sensor => {
      const values = data.map(d => d[sensor]).filter(v => v !== undefined);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const sorted = values.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      stats[sensor] = { avg, median };
    });
    
    return stats;
  };

  const handleThresholdChange = (sensor: string, type: 'warning' | 'danger', value: number) => {
    setThresholds({
      general: { warning: value }
    });
  };

  const handleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="space-y-6">
      {/* Sensor Display */}
      <SensorDisplay data={data} sensorConfigs={sensorConfigs} />

      {/* Controls */}
      <ChartControls
        selectedDataset={selectedDataset}
        historicalDatasets={historicalDatasets}
        isRealTime={isRealTime}
        visibleSensors={visibleSensors}
        sensorConfigs={sensorConfigs}
        thresholds={thresholds}
        onDatasetChange={loadHistoricalData}
        onSensorToggle={toggleSensorVisibility}
        onExportData={exportData}
        onReset={handleReset}
        onScreenshot={handleScreenshot}
        onExportPDF={handleExportPDF}
        onThresholdChange={handleThresholdChange}
        onZoom={handleZoom}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
      />

      {/* Timer */}
      <div className="flex justify-center">
        <ChartTimer isRunning={timerRunning && !isPaused} />
      </div>

      {/* Chart */}
      <div ref={chartRef} className="h-96 w-full bg-card p-4 rounded-lg border">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Force (N)', angle: -90, position: 'insideLeft' }}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            
            {/* Single threshold line */}
            <ReferenceLine
              y={thresholds.general.warning}
              stroke="hsl(var(--threshold-warning))"
              strokeDasharray="5 5"
              label="Seuil d'alerte"
            />
            
            {visibleSensors.sensor1 && (
              <Line
                type="monotone"
                dataKey="sensor1"
                stroke={sensorConfigs[0].color}
                strokeWidth={2}
                dot={false}
                name={sensorConfigs[0].label}
              />
            )}
            {visibleSensors.sensor2 && (
              <Line
                type="monotone"
                dataKey="sensor2"
                stroke={sensorConfigs[1].color}
                strokeWidth={2}
                dot={false}
                name={sensorConfigs[1].label}
              />
            )}
            {visibleSensors.sensor3 && (
              <Line
                type="monotone"
                dataKey="sensor3"
                stroke={sensorConfigs[2].color}
                strokeWidth={2}
                dot={false}
                name={sensorConfigs[2].label}
              />
            )}
            
            {isZoomed && (
              <Brush dataKey="time" height={30} stroke="hsl(var(--primary))" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
