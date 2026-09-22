import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Input } from '../../components/common/Field';
import Button from '../../components/common/Button';
import { rules } from '../../utils/validation';
import { parseApiError } from '../../utils/errors';

const schema = {
  email: [rules.required('Enter your email'), rules.email()],
  password: [rules.required('Enter your password')],
};

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-steel">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-[15px] text-steel">{footer}</div>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({ email: location.state?.email || '', password: '' }, schema);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      const user = await login(form.values);
      toast.success(`Signed in as ${user.email}.`);
      navigate(location.state?.from || (user.isAdmin ? '/admin' : '/'), { replace: true });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err, 'Could not sign in. Please try again.');
      form.setErrors(fieldErrors);
      setError(err?.response?.status === 401 ? 'Incorrect email or password.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Use the email and password for your ForgeX account."
      footer={<>New to ForgeX? <Link to="/register" state={location.state} className="link text-ink">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <p role="alert" className="border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{error}</p>}
        <Input label="Email" type="email" autoComplete="email" required {...form.bind('email')} />
        <Input label="Password" type="password" autoComplete="current-password" required {...form.bind('password')} />
        <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
      </form>
    </AuthShell>
  );
}
