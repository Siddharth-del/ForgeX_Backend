import Badge from '../common/Badge';
import { ORDER_STATUS } from '../../constants';

export default function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS[status] ?? { label: status ?? 'Unknown', tone: 'muted' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
