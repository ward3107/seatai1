import { LayoutGrid, BarChart3, UserRound, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

/** An explicitly labelled illustration, never a report about a real class. */
export default function ClassroomPreview() {
  const { t } = useLanguage();
  return <figure className="classroom-preview" aria-label={t('entry.illustration')}>
    <figcaption><span><LayoutGrid size={17} aria-hidden="true" />{t('entry.previewTitle')}</span><span className="preview-label">{t('entry.illustration')}</span></figcaption>
    <div className="preview-room">
      <div className="preview-board">{t('classroom.teacher_desk')}</div>
      <div className="preview-windows" aria-hidden="true"><i /><i /><i /></div>
      <div className="preview-desks" aria-hidden="true">
        {Array.from({ length: 8 }, (_, pair) => (
          <div className="preview-pair" key={pair}>
            {[0, 1].map(seat => (
              <div className={`preview-desk preview-seat-${pair % 4}`} key={seat}>
                <UserRound size={19} strokeWidth={1.7} />
                <span>{String(pair * 2 + seat + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="preview-room-note"><Check size={15} aria-hidden="true" />{t('entry.previewControl')}</div>
    </div>
    <div className="preview-report"><BarChart3 size={24} aria-hidden="true" /><div><strong>{t('entry.previewReport')}</strong><p>{t('entry.previewReportHint')}</p></div><div className="preview-bars" aria-hidden="true"><i /><i /><i /><i /></div></div>
  </figure>;
}
