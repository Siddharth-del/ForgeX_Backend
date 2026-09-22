import { Link } from 'react-router-dom';
import Button from './Button';

export function EmptyState({ title, body, action, actionTo, onAction }) {
  return (
    <div className="border border-dashed border-line px-6 py-14 text-center">
      <h2 className="text-2xl">{title}</h2>
      {body && <p className="mx-auto mt-2 max-w-md text-steel">{body}</p>}
      {action && (actionTo
        ? <Link to={actionTo} className="btn-primary mt-6">{action}</Link>
        : <Button className="mt-6" onClick={onAction}>{action}</Button>)}
    </div>
  );
}

export function ErrorState({ title = 'This page could not load', message, onRetry }) {
  return (
    <div role="alert" className="border border-line bg-paper px-6 py-12 text-center">
      <h2 className="text-2xl">{title}</h2>
      {message && <p className="mx-auto mt-2 max-w-md text-steel">{message}</p>}
      {onRetry && <Button variant="outline" className="mt-6" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** For features the backend does not provide yet. Says so plainly. */
export function Notice({ title, children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-paper',
    warn: 'border-warn/30 bg-warn-tint',
    danger: 'border-forge/30 bg-forge-tint',
  };
  return (
    <div className={`border px-4 py-3 ${tones[tone]}`} role={tone === 'danger' ? 'alert' : 'note'}>
      {title && <p className="font-medium">{title}</p>}
      <div className="text-[15px] text-steel">{children}</div>
    </div>
  );
}
