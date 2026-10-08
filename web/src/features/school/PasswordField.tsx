import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function PasswordField({ label, name = 'password', autoComplete = 'current-password' }: { label: string; name?: string; autoComplete?: 'current-password' | 'new-password' }) {
  const { t } = useLanguage();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return <div className="space-y-2 text-sm font-semibold">
    <label htmlFor={id} className="block">{label}</label>
    <div className="relative">
      <input id={id} name={name} type={visible ? 'text' : 'password'} className="school-input !pr-12" required minLength={12} maxLength={128} autoComplete={autoComplete} dir="ltr" />
      <button type="button" className="school-password-toggle" aria-label={t(visible ? 'school.hidePassword' : 'school.showPassword')} aria-controls={id} aria-pressed={visible} onClick={() => setVisible(value => !value)}><Icon size={20} aria-hidden="true" /></button>
    </div>
  </div>;
}
