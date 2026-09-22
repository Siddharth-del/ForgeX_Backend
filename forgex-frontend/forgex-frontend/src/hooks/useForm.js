import { useCallback, useState } from 'react';
import { validate } from '../utils/validation';

/** Minimal form state with field-level validation and server error merging. */
export function useForm(initialValues, schema = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const bind = (name) => ({
    name,
    id: name,
    value: values[name] ?? '',
    onChange: (e) => setField(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    onBlur: () => {
      setTouched((t) => ({ ...t, [name]: true }));
      if (schema[name]) {
        const err = validate({ [name]: schema[name] }, values)[name];
        setErrors((e) => ({ ...e, [name]: err }));
      }
    },
    error: errors[name],
  });

  const validateAll = () => {
    const errs = validate(schema, values);
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(schema).map((k) => [k, true])));
    return Object.keys(errs).length === 0;
  };

  return { values, setValues, setField, errors, setErrors, touched, bind, validateAll, reset: () => { setValues(initialValues); setErrors({}); } };
}
