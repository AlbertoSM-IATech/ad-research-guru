import { useState, useMemo } from 'react';
import { Target, AlertTriangle, ExternalLink, BarChart3, TrendingUp, Shield, Sword, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { type TargetASIN, type Keyword } from '@/types/advertising';

interface CompetitiveAnalysisPanelProps {
  asins: TargetASIN[];
  keywords: Keyword[];
  bookTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const getThreatColor = (score: number): string => {
  if (score >= 70) return 'hsl(0, 84%, 60%)'; // Red
  if (score >= 40) return 'hsl(38, 92%, 50%)'; // Yellow
  return 'hsl(142, 76%, 36%)'; // Green
};

const getThreatLabel = (score: number): string => {
  if (score >= 70) return 'Alta';
  if (score >= 40) return 'Media';
  return 'Baja';
};

export const CompetitiveAnalysisPanel = ({
  asins,
  keywords,
  bookTitle,
  isOpen,
  onClose,
}: CompetitiveAnalysisPanelProps) => {
  const [selectedASIN, setSelectedASIN] = useState<TargetASIN | null>(null);

  // Sort ASINs by threat score
  const sortedASINs = useMemo(() => {
    return [...asins].sort((a, b) => (b.threatScore || 0) - (a.threatScore || 0));
  }, [asins]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return sortedASINs.slice(0, 10).map(asin => ({
      name: asin.asin.slice(0, 6) + '...',
      fullName: asin.asin,
      title: asin.title || 'Sin título',
      threatScore: asin.threatScore || 0,
      sharedKeywords: asin.sharedKeywords || 0,
      bsr: asin.bsr || 0,
    }));
  }, [sortedASINs]);

  // Calculate average metrics
  const avgThreatScore = useMemo(() => {
    const scores = asins.filter(a => a.threatScore).map(a => a.threatScore!);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [asins]);

  const totalSharedKeywords = useMemo(() => {
    return asins.reduce((sum, a) => sum + (a.sharedKeywords || 0), 0);
  }, [asins]);

  const highThreatCount = asins.filter(a => (a.threatScore || 0) >= 70).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Target className="w-5 h-5" />
            Análisis Competitivo de ASINs
            <Badge variant="outline" className="ml-2">
              Libro: {bookTitle}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Competidores</span>
                </div>
                <p className="text-2xl font-bold">{asins.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Amenaza Media</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: getThreatColor(avgThreatScore) }}>
                  {avgThreatScore}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sword className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Alta Amenaza</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{highThreatCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Keywords Compart.</span>
                </div>
                <p className="text-2xl font-bold">{totalSharedKeywords}</p>
              </CardContent>
            </Card>
          </div>

          {/* Threat Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Puntuación de Amenaza por ASIN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 11 }} 
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value}%`,
                        'Amenaza'
                      ]}
                      labelFormatter={(label, payload) => payload[0]?.payload?.title || label}
                    />
                    <Bar dataKey="threatScore" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getThreatColor(entry.threatScore)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Comparison Table */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Comparativa: Tu libro vs Competidores
            </h4>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {sortedASINs.map(asin => (
                  <Card 
                    key={asin.id}
                    className={`cursor-pointer transition-colors ${
                      selectedASIN?.id === asin.id ? 'border-primary' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedASIN(selectedASIN?.id === asin.id ? null : asin)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        {/* Threat Score Badge */}
                        <div 
                          className="flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white"
                          style={{ backgroundColor: getThreatColor(asin.threatScore || 0) }}
                        >
                          <span className="text-xl font-bold">{asin.threatScore || 0}</span>
                          <span className="text-xs opacity-80">Amenaza</span>
                        </div>

                        {/* ASIN Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="font-mono text-sm">{asin.asin}</code>
                            {asin.amazonUrl && (
                              <a 
                                href={asin.amazonUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="font-medium text-sm truncate mb-2">
                            {asin.title || 'Sin título'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              BSR: {asin.bsr?.toLocaleString() || '—'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {asin.sharedKeywords || 0} keywords compartidas
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: getThreatColor(asin.threatScore || 0),
                                color: getThreatColor(asin.threatScore || 0),
                              }}
                            >
                              {getThreatLabel(asin.threatScore || 0)} amenaza
                            </Badge>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex-shrink-0 text-right">
                          <Progress 
                            value={asin.threatScore || 0} 
                            className="w-20 h-2"
                          />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedASIN?.id === asin.id && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Factores de amenaza</p>
                              <ul className="text-sm space-y-1">
                                <li className="flex items-center gap-2">
                                  <span className={asin.bsr && asin.bsr < 5000 ? 'text-red-500' : 'text-green-500'}>●</span>
                                  BSR: {asin.bsr && asin.bsr < 5000 ? 'Muy competitivo' : 'Moderado'}
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className={(asin.sharedKeywords || 0) > 5 ? 'text-red-500' : 'text-green-500'}>●</span>
                                  Solapamiento: {(asin.sharedKeywords || 0) > 5 ? 'Alto' : 'Bajo'}
                                </li>
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Notas</p>
                              <p className="text-sm">{asin.notes || 'Sin notas'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
