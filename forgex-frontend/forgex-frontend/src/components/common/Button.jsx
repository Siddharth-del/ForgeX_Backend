import Spinner from './Spinner';

const variants = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({ variant = 'primary', size, loading = false, disabled, children, className = '', type = 'button', ...props }) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`${variants[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
