import { Badge } from '@/components/ui';
import type { StockLevel } from '@/server/services/stock';

export function LevelBadge({ level }: { level: StockLevel }) {
  if (level === 'OUT') return <Badge tone="red">🔴 OUT OF STOCK</Badge>;
  if (level === 'LOW') return <Badge tone="yellow">⚠️ LOW STOCK</Badge>;
  return <Badge tone="green">В наличии</Badge>;
}
