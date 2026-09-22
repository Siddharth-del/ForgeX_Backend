import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Input } from '../../components/common/Field';
import Button from '../../components/common/Button';
import { AuthShell } from '../Login/LoginPage';
import { rules } from '../../utils/validation';
import { parseApiError } from '../../utils/errors';

// Mirrors SignupRequest: username 3–20, email ≤ 50, password 6–40.
const schema = {
  username: [rules.required('Choose a username'), rules.minLength(3), rules.maxLength(20),
    rules.pattern(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores')],
  email: [rules.required('Enter your email'), rules.email(), rules.maxLength(50)],
  password: [rules.required('Choose a password'), rules.minLength(6), rules.maxLength(40)],
  confirm: [rules.required('Re-enter your password'), rules.matches('password', 'Passwords do not match')],
};

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({ username: '', email: '', password: '', confirm: '' }, schema);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      await register(form.values);
      try {
        await login({ email: form.values.email, password: form.values.password });
        toast.success('Account created. Welcome to ForgeX.');
        navigate(location.state?.from || '/', { replace: true });
      } catch {
        toast.success('Account created. Please sign in.');
        navigate('/login', { replace: true, state: { email: form.values.email, from: location.state?.from } });
      }
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err, 'Could not create your account.');
      if (/email/i.test(message)) fieldErrors.email = message;
      else if (/username/i.test(message)) fieldErrors.username = message;
      form.setErrors(fieldErrors);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Save addresses, check out faster and track your orders."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="link text-ink">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <p role="alert" className="border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{error}</p>}
        <Input label="Username" autoComplete="username" required hint="3 to 20 characters" {...form.bind('username')} />
        <Input label="Email" type="email" autoComplete="email" required {...form.bind('email')} />
        <Input label="Password" type="password" autoComplete="new-password" required hint="At least 6 characters" {...form.bind('password')} />
        <Input label="Confirm password" type="password" autoComplete="new-password" required {...form.bind('confirm')} />
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  );
}
