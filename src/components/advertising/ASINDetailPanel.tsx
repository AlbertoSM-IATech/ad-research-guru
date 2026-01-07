import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, RotateCcw, Plus, X, ExternalLink, Target } from 'lucide-react';
import { InlineCampaignTypeSelect } from './InlineCampaignTypeSelect';
import { type TargetASIN, type CampaignType } from '@/types/advertising';

interface ASINDetailPanelProps {
  asin: TargetASIN | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (asinId: string, updates: Partial<TargetASIN>) => void;
  marketplaceId?: string;
}

export const ASINDetailPanel = ({
  asin,
  isOpen,
  onClose,
  onSave,
  marketplaceId = 'us',
}: ASINDetailPanelProps) => {
  const [asinCode, setAsinCode] = useState('');
  const [title, setTitle] = useState('');
  const [bsr, setBsr] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>(['SP']);
  const [amazonUrl, setAmazonUrl] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');

  // Load ASIN data when opening
  useEffect(() => {
    if (asin && isOpen) {
      setAsinCode(asin.asin || '');
      setTitle(asin.title || '');
      setBsr(asin.bsr);
      setNotes(asin.notes || '');
      setCampaignTypes(asin.campaignTypes || ['SP']);
      setAmazonUrl(asin.amazonUrl || '');
      setLinks(asin.links || []);
    }
  }, [asin, isOpen]);

  const handleSave = () => {
    if (!asin) return;

    const updates: Partial<TargetASIN> = {
      asin: asinCode.toUpperCase().trim(),
      title,
      bsr,
      notes,
      campaignTypes,
      amazonUrl,
      links,
    };
    onSave(asin.id, updates);
    onClose();
  };

  const handleReset = () => {
    if (!asin) return;
    setAsinCode(asin.asin || '');
    setTitle(asin.title || '');
    setBsr(asin.bsr);
    setNotes(asin.notes || '');
    setCampaignTypes(asin.campaignTypes || ['SP']);
    setAmazonUrl(asin.amazonUrl || '');
    setLinks(asin.links || []);
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    setLinks([...links, newLink.trim()]);
    setNewLink('');
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const getAmazonDomain = () => {
    const domains: Record<string, string> = {
      us: 'amazon.com',
      uk: 'amazon.co.uk',
      de: 'amazon.de',
      fr: 'amazon.fr',
      es: 'amazon.es',
      it: 'amazon.it',
      ca: 'amazon.ca',
      mx: 'amazon.com.mx',
      au: 'amazon.com.au',
      jp: 'amazon.co.jp',
      nl: 'amazon.nl',
      se: 'amazon.se',
    };
    return domains[marketplaceId] || 'amazon.com';
  };

  const amazonProductUrl = asinCode
    ? `https://www.${getAmazonDomain()}/dp/${asinCode}`
    : '';

  if (!asin) return null;

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {asinCode || 'ASIN'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* ASIN Code */}
          <div className="space-y-2">
            <Label htmlFor="asinCode">Código ASIN</Label>
            <Input
              id="asinCode"
              value={asinCode}
              onChange={(e) => setAsinCode(e.target.value.toUpperCase())}
              placeholder="B08N5WRWNW"
              maxLength={10}
              className="font-mono"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del producto</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del producto en Amazon..."
            />
          </div>

          {/* BSR */}
          <div className="space-y-2">
            <Label htmlFor="bsr">Best Seller Rank (BSR)</Label>
            <Input
              id="bsr"
              type="number"
              min={0}
              value={bsr ?? ''}
              onChange={(e) => setBsr(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Ej: 15000"
            />
          </div>

          {/* Campaign Types */}
          <div className="space-y-2">
            <Label>Tipos de Campaña</Label>
            <InlineCampaignTypeSelect
              value={campaignTypes}
              onChange={setCampaignTypes}
            />
          </div>

          <Separator />

          {/* Amazon URL */}
          <div className="space-y-2">
            <Label htmlFor="amazonUrl">URL de Amazon</Label>
            <div className="flex gap-2">
              <Input
                id="amazonUrl"
                value={amazonUrl}
                onChange={(e) => setAmazonUrl(e.target.value)}
                placeholder={amazonProductUrl || 'https://...'}
                className="flex-1"
              />
              {(amazonUrl || amazonProductUrl) && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a
                    href={amazonUrl || amazonProductUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <Label>Enlaces adicionales</Label>
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={handleAddLink} disabled={!newLink.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-2 mt-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-primary truncate hover:underline"
                    >
                      {link}
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveLink(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información sobre el producto, por qué lo seleccionaste..."
              rows={3}
            />
          </div>

          {/* Threat Score & Shared Keywords (read-only if available) */}
          {(asin.threatScore !== undefined || asin.sharedKeywords !== undefined) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {asin.threatScore !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Puntuación Amenaza</Label>
                    <Badge variant="outline" className="text-lg font-mono">
                      {asin.threatScore}%
                    </Badge>
                  </div>
                )}
                {asin.sharedKeywords !== undefined && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Keywords compartidas</Label>
                    <Badge variant="outline" className="text-lg font-mono">
                      {asin.sharedKeywords}
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Resetear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
