import { useLanguage } from '../hooks/useLanguage';

// Canonical destinations from the supplied signature's existing implementation.
const CONTACTS = [
  { key: 'email', href: 'mailto:vasyaward@gmail.com', position: 0 },
  { key: 'whatsapp', href: 'https://wa.me/972544742520', position: 1 },
  { key: 'github', href: 'https://github.com/ward3107', position: 4 },
  { key: 'linkedin', href: 'https://www.linkedin.com/in/waseem-abu-akel-334486374/', position: 5 },
] as const;

export default function CreatorSignature() {
  const { t } = useLanguage();
  return <div className="creator-signature" dir="ltr">
    <img src="/brand/vasia-dev-signature-light.png" width={1505} height={1045} alt="vasia dev." loading="lazy" />
    <a className="creator-website" href="https://www.vasia.dev/" target="_blank" rel="noopener noreferrer" aria-label={t('creator.website')} title={t('creator.website')} />
    {CONTACTS.map(({ key, href, position }) => <a key={key} className="creator-contact" style={{ left: `${position * 100 / 6}%` }} href={href} target={key === 'email' ? undefined : '_blank'} rel={key === 'email' ? undefined : 'noopener noreferrer'} aria-label={t(`creator.${key}`)} title={t(`creator.${key}`)} />)}
  </div>;
}
