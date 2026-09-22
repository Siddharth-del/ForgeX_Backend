import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import { Notice } from '../../components/common/States';

export default function UsersAdminPage() {
  useDocumentTitle('Admin users');
  return (
    <div>
      <PageHeader title="Users" />
      <div className="mt-6 max-w-2xl">
        <Notice title="User management is not available yet">
          The backend does not expose endpoints for listing or managing customer accounts, so this screen has nothing to show.
          Once admin user endpoints are added to the API, they can be connected here.
        </Notice>
      </div>
    </div>
  );
}
