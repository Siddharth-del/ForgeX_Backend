import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EmptyState } from '../../components/common/States';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page py-20">
      <EmptyState title="This page doesn't exist" body="The link may be broken or the page may have moved." action="Go to the shop" actionTo="/products" />
    </div>
  );
}
